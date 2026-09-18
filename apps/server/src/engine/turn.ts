import type { FxId, Panel, PanelVisual, ServerEvent } from "@system/shared";
import { resolveStillKey, truncateCaption } from "@system/shared";
import { markRunType, finishRun } from "../db/repositories/runs.js";
import { promoteHighestRank } from "../db/repositories/users.js";
import {
  addItems,
  dropPrefetches,
  getChoices,
  getContext,
  getInventory,
  getMeta,
  getStats,
  markNodeSeen,
  pushContext,
  pushPanel,
  saveChoices,
  saveMeta,
  saveStats,
  takePrefetch,
  touchSession,
} from "../state/sessionStore.js";
import { collisionDetector, stepSignature } from "./collision.js";
import {
  chunkText,
  generateChoices,
  streamPanelProse,
  withFreshIds,
} from "./generation.js";
import { newPanelId } from "./llm/ids.js";
import {
  buildChoicesPrompt,
  buildNarrationPrompt,
  buildSystemPrompt,
  retrievalQuery,
  type PromptContext,
} from "./llm/prompts.js";
import { lockChoices } from "./locking.js";
import { cancelPrefetch, schedulePrefetch } from "./prefetch.js";
import { jobQueue } from "./queue.js";
import { withTimeout } from "./llm/timeout.js";
import { hashString } from "./rng.js";
import { prepareTurn } from "./turnCore.js";
import type { GeneratedChoice } from "./types.js";
import { captionFallback, visualFor } from "./visuals.js";
import { plateLine } from "./plates.js";

/** Steps a diverted run spends inside the anomaly before its clear condition is met. */
const RED_GATE_DEPTH = 6;

/**
 * Plays one turn and yields the SSE event stream for it.
 *
 * Ordering is the product. `stats`, resolve-`fx`, and `resolve` land first so
 * the tap answers on the current still; `panel_start` is the next room, and
 * scene `system` / scene `fx` belong to it. Follow-up options are sent as soon
 * as they exist. Speculation for the next turn is scheduled only after run
 * state is committed.
 */
export async function* playTurn(
  sessionId: string,
  choiceId: string,
): AsyncGenerator<ServerEvent> {
  const startedAt = Date.now();
  cancelPrefetch(sessionId);

  const meta = await getMeta(sessionId);
  if (!meta) {
    yield { type: "error", message: "This session has expired." };
    return;
  }
  if (meta.outcome !== "active") {
    yield { type: "error", message: "This run has already ended." };
    return;
  }

  const stats = await getStats(sessionId);
  if (!stats) {
    yield { type: "error", message: "Session state is incomplete." };
    return;
  }

  const offered = await getChoices(sessionId);
  const selected = offered.find((choice) => choice.id === choiceId);
  if (!selected) {
    yield { type: "error", message: "That option is no longer available." };
    return;
  }
  if (selected.locked) {
    yield {
      type: "error",
      message: selected.lockReason ?? "You cannot afford that yet.",
    };
    return;
  }

  const inventory = await getInventory(sessionId);
  const choice: GeneratedChoice = {
    id: selected.id,
    label: selected.label,
    detail: selected.detail,
    requires: selected.requires,
    risk: selected.risk,
    grant: selected.grant,
  };

  // Anti-collision runs before routing, because a divert has to be able to
  // override the static node this turn was otherwise going to serve.
  const verdict = await collisionDetector.step(
    sessionId,
    stepSignature(meta.location, choice.label),
  );
  const divertNow = verdict.divert && meta.redGateDepth === 0;
  if (divertNow) {
    meta.redGateDepth = RED_GATE_DEPTH;
    if (meta.runType !== "anomaly") {
      meta.runType = "anomaly";
      await markRunType(meta.runId, "anomaly");
    }
  }

  const playedStep = meta.step;
  const prepared = await prepareTurn({ meta, stats, inventory, choice });
  const { outcome, nextStats, route } = prepared;

  const resolveLines = [...outcome.systemLines];
  if (divertNow) {
    resolveLines.unshift(
      `[ ANOMALY. Path collision at ${Math.round(verdict.overlap * 100)}%. ]`,
      "[ Re-routing. A red gate has opened where the corridor was. ]",
    );
  }
  const sceneLines = route.node ? [...route.node.systemLines] : [];

  // One step of the red gate's clear condition is consumed by this panel.
  if (meta.redGateDepth > 0 && !outcome.terminal) {
    meta.redGateDepth -= 1;
    if (meta.redGateDepth === 0) {
      resolveLines.push("[ Clear condition met. The gate releases you. ]");
    }
  }
  if (!resolveLines.length) {
    resolveLines.push("[ Action registered. ]");
  }
  const systemLines = [...resolveLines, ...sceneLines];

  await saveStats(sessionId, nextStats);
  if (outcome.granted.length) {
    await addItems(sessionId, outcome.granted);
  }
  if (outcome.jobChanged) meta.jobChanged = true;
  const inventoryNow = outcome.granted.length
    ? [...new Set([...inventory, ...outcome.granted])]
    : inventory;

  // An authored node brings its own plate; otherwise derive one from the state.
  const frame = route.node
    ? {
        artKey: resolveStillKey(route.node.visual.artKey),
        mood: route.node.visual.mood,
        shot: route.node.visual.shot,
      }
    : visualFor({
        location: route.location,
        kind: outcome.kind,
        level: nextStats.level,
        success: outcome.success,
        action: `${choice.label} ${outcome.summary}`,
      });

  const resolveFx: FxId[] = [...outcome.fx];
  const sceneFx: FxId[] = [];
  if (divertNow) sceneFx.push("red_seal");
  if (frame.artKey.startsWith("system.shop") && !outcome.terminal) sceneFx.push("shop_tempt");
  if (frame.artKey === "dungeon.collapse") sceneFx.push("collapse");
  if (frame.artKey === "dungeon.safe" && outcome.success && choice.risk === "safe") {
    sceneFx.push("rest");
  }
  if (
    (frame.artKey.startsWith("system.") ||
      frame.artKey.startsWith("hospital.") ||
      frame.artKey.startsWith("job.") ||
      outcome.kind === "system") &&
    !outcome.terminal
  ) {
    sceneFx.push("system_open");
  }
  if (meta.runType === "anomaly" && !outcome.terminal) sceneFx.push("anomaly_bed");
  const fx: FxId[] = [...resolveFx, ...sceneFx];

  const panelId = newPanelId();

  // Juice on the still the player just acted in, before the next room exists.
  yield { type: "stats", stats: nextStats, deltas: outcome.deltas, inventory: inventoryNow };
  if (resolveFx.length) {
    yield { type: "fx", panelId, fx: resolveFx };
  }
  yield {
    type: "resolve",
    lines: resolveLines,
    anomaly: outcome.kind === "red_gate" || divertNow,
    assertive: outcome.kind === "death",
  };

  yield {
    type: "panel_start",
    panelId,
    kind: outcome.kind,
    source: route.source,
    step: playedStep,
    location: route.location,
    runType: meta.runType,
    artKey: frame.artKey,
    mood: frame.mood,
    shot: frame.shot,
    jobChanged: Boolean(meta.jobChanged),
  };

  if (sceneLines.length) {
    yield { type: "system", panelId, lines: sceneLines };
  }
  if (sceneFx.length) {
    yield { type: "fx", panelId, fx: sceneFx };
  }

  const history = await getContext(sessionId);
  const promptCtx: PromptContext = {
    stats: nextStats,
    inventory: inventoryNow,
    history,
    location: route.location,
    runType: meta.runType,
    artKey: frame.artKey,
    plate: plateLine(frame.artKey),
  };
  const systemPrompt = buildSystemPrompt(
    promptCtx,
    retrievalQuery(promptCtx, choice.label),
  );
  const seed = meta.seed ^ hashString(`${playedStep}:${choice.id}`);
  const fallbackCaption = captionFallback(outcome.kind, outcome.success);

  const cached = await takePrefetch(sessionId, choiceId);
  const cacheUsable =
    cached !== null &&
    cached.assumedStep === playedStep &&
    cached.assumedRedGate === prepared.isRedGate;

  let caption = "";
  let narration = "";
  let nextChoices: GeneratedChoice[] = [];
  const prefetchHit = cacheUsable;
  let choicesSent = false;

  /** Options belong to this panel — send them as soon as they exist, not after the last word. */
  async function* sendChoices(
    generated: GeneratedChoice[],
  ): AsyncGenerator<ServerEvent> {
    if (choicesSent) return;
    choicesSent = true;
    nextChoices = generated;
    const locked = outcome.terminal
      ? []
      : lockChoices(generated, nextStats, inventoryNow);
    if (!outcome.terminal) await saveChoices(sessionId, locked);
    yield { type: "choices", panelId, choices: locked };
  }

  if (cacheUsable && cached) {
    caption = cached.caption || fallbackCaption;
    narration = cached.narration;
    yield* sendChoices(cached.choices);
    yield { type: "caption", panelId, caption: truncateCaption(caption) };
    for (const delta of chunkText(narration)) {
      yield { type: "narration", panelId, delta };
    }
  } else if (route.source === "static" && route.node) {
    caption = route.node.visual.caption || fallbackCaption;
    narration = route.node.content;
    yield* sendChoices(withFreshIds(route.node.options));
    yield { type: "caption", panelId, caption: truncateCaption(caption) };
    for (const delta of chunkText(narration)) {
      yield { type: "narration", panelId, delta };
    }
  } else {
    type QueueItem =
      | { kind: "choices"; value: GeneratedChoice[] }
      | { kind: "chunk"; value: { kind: "caption" | "body"; value: string } }
      | { kind: "prose_end" };

    const queue: QueueItem[] = [];
    let wake: (() => void) | null = null;
    const push = (item: QueueItem) => {
      queue.push(item);
      wake?.();
    };

    const choicesPromise = outcome.terminal
      ? Promise.resolve<GeneratedChoice[]>([])
      : generateChoices({
          systemPrompt,
          userPrompt: buildChoicesPrompt(
            `${choice.label} -> ${outcome.summary}`,
            promptCtx,
          ),
          seed,
        });

    void choicesPromise.then(
      (value) => push({ kind: "choices", value }),
      () => push({ kind: "choices", value: [] }),
    );

    void (async () => {
      const pump = (async () => {
        for await (const chunk of streamPanelProse(
          {
            systemPrompt,
            userPrompt: buildNarrationPrompt(choice.label, outcome, promptCtx),
            seed,
          },
          fallbackCaption,
        )) {
          push({ kind: "chunk", value: chunk });
        }
      })();
      try {
        await withTimeout(pump, 6000, "narration stream");
      } catch (error) {
        console.warn(`[llm] ${(error as Error).message}`);
      }
      push({ kind: "prose_end" });
    })();

    let proseEnded = false;
    while (!proseEnded || !choicesSent) {
      if (!queue.length) {
        await new Promise<void>((resolve) => {
          wake = resolve;
        });
        wake = null;
      }
      const item = queue.shift();
      if (!item) continue;
      if (item.kind === "choices") {
        yield* sendChoices(item.value);
        continue;
      }
      if (item.kind === "prose_end") {
        proseEnded = true;
        continue;
      }
      if (item.value.kind === "caption") {
        caption = item.value.value;
        yield { type: "caption", panelId, caption: truncateCaption(caption) };
      } else {
        narration += item.value.value;
        yield { type: "narration", panelId, delta: item.value.value };
      }
    }
  }

  if (!choicesSent) {
    yield* sendChoices(nextChoices);
  }

  narration = narration.trim();
  const visual: PanelVisual = {
    ...frame,
    caption: truncateCaption(caption || fallbackCaption),
  };

  const locked = outcome.terminal
    ? []
    : lockChoices(nextChoices, nextStats, inventoryNow);

  const panel: Panel = {
    id: panelId,
    kind: outcome.kind,
    source: prefetchHit ? "prefetch" : route.source,
    visual,
    fx,
    text: narration,
    systemLines,
    createdAt: new Date().toISOString(),
  };

  meta.step = playedStep + 1;
  meta.location = route.location;

  await pushPanel(sessionId, panel);
  await pushContext(sessionId, {
    step: playedStep,
    action: choice.label,
    outcome: outcome.summary,
    nodeId: route.node?.id ?? panelId,
  });
  if (route.node) await markNodeSeen(sessionId, route.node.id);

  // Sibling speculations describe a branch the player abandoned.
  await dropPrefetches(
    sessionId,
    offered.filter((item) => item.id !== choiceId).map((item) => item.id),
  );

  if (outcome.terminal) {
    meta.outcome = outcome.terminal;
    await saveMeta(meta);
    await finishRun({
      runId: meta.runId,
      outcome: outcome.terminal,
      deathReason: outcome.terminal === "death" ? outcome.summary : null,
      steps: meta.step,
      finalLevel: nextStats.level,
      finalRank: nextStats.rank,
      canonDivergence: Number(nextStats.canonDivergence.toFixed(2)),
    });
    await promoteHighestRank(meta.userId, nextStats.rank);
    await jobQueue.publish({
      type: "epilogue_image",
      runId: meta.runId,
      userId: meta.userId,
      outcome: outcome.terminal,
      prompt: visual.caption,
    });
    const epilogueArtKey = jobQueue.artKeyFor(outcome.terminal);

    yield {
      type: "run_end",
      outcome: outcome.terminal,
      // The player reads a caption, not the engine's mechanical summary.
      reason: visual.caption,
      epilogueArtKey,
    };
  } else {
    await saveMeta(meta);
    await touchSession(sessionId);
    schedulePrefetch({
      meta,
      stats: nextStats,
      inventory: inventoryNow,
      choices: locked,
    });
  }

  yield {
    type: "done",
    panelId,
    latencyMs: Date.now() - startedAt,
    prefetchHit,
  };
}
