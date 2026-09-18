import type { Choice, PlayerStats } from "@system/shared";
import { env } from "../env.js";
import { getContext, savePrefetch } from "../state/sessionStore.js";
import { collectPanelProse, generateChoices } from "./generation.js";
import {
  buildChoicesPrompt,
  buildNarrationPrompt,
  buildSystemPrompt,
  describeSituation,
  retrievalQuery,
  type PromptContext,
} from "./llm/prompts.js";
import { hashString } from "./rng.js";
import { prepareTurn } from "./turnCore.js";
import type { GeneratedChoice, SessionMeta } from "./types.js";
import { captionFallback, visualFor } from "./visuals.js";
import { plateLine } from "./plates.js";

export interface PrefetchParams {
  /** Session metadata *after* the turn that just finished, already persisted. */
  meta: SessionMeta;
  stats: PlayerStats;
  inventory: string[];
  choices: Choice[];
}

const inflight = new Map<string, AbortController>();

/** A live turn cancels leftover speculation so it does not starve the tap. */
export function cancelPrefetch(sessionId: string): void {
  const controller = inflight.get(sessionId);
  if (!controller) return;
  controller.abort();
  inflight.delete(sessionId);
}

/**
 * Speculative generation, second stage.
 *
 * Stage one (in the turn handler) hides the choice-generation latency behind
 * narration streaming. This stage hides the *next* turn entirely: while the
 * player spends five to eight seconds reading the panel, we resolve and narrate
 * the most likely branches in advance. When they tap, the panel is already in
 * Redis and the stream begins with no model call at all.
 *
 * Fire-and-forget by design — nothing in the request path waits on it, and a
 * failure just means the next turn pays full latency.
 */
export function schedulePrefetch(params: PrefetchParams): void {
  if (env.PREFETCH_FANOUT === 0) return;
  cancelPrefetch(params.meta.sessionId);
  const controller = new AbortController();
  inflight.set(params.meta.sessionId, controller);
  void prefetchBranches(params, controller.signal)
    .catch((error) => {
      if ((error as Error).name === "AbortError") return;
      console.warn(`[prefetch] aborted: ${(error as Error).message}`);
    })
    .finally(() => {
      if (inflight.get(params.meta.sessionId) === controller) {
        inflight.delete(params.meta.sessionId);
      }
    });
}

async function prefetchBranches(
  params: PrefetchParams,
  signal: AbortSignal,
): Promise<void> {
  // Locked options cannot be taken, so speculating on them is pure waste.
  const candidates = params.choices
    .filter((choice) => !choice.locked)
    .slice(0, env.PREFETCH_FANOUT);
  if (!candidates.length) return;

  const history = await getContext(params.meta.sessionId);
  if (signal.aborted) return;
  await Promise.all(
    candidates.map((choice) => prefetchBranch(params, choice, history, signal)),
  );
}

async function prefetchBranch(
  params: PrefetchParams,
  choice: Choice,
  history: Awaited<ReturnType<typeof getContext>>,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted) return;
  const { meta, stats, inventory } = params;

  const candidate: GeneratedChoice = {
    id: choice.id,
    label: choice.label,
    detail: choice.detail,
    requires: choice.requires,
    risk: choice.risk,
    grant: choice.grant,
  };

  const prepared = await prepareTurn({ meta, stats, inventory, choice: candidate });

  // A static panel is a single indexed Postgres read; speculating buys nothing.
  if (prepared.route.source === "static") return;

  const inventoryNow = prepared.outcome.granted.length
    ? [...new Set([...inventory, ...prepared.outcome.granted])]
    : inventory;

  const frame = visualFor({
    location: prepared.route.location,
    kind: prepared.outcome.kind,
    level: prepared.nextStats.level,
    success: prepared.outcome.success,
    action: `${choice.label} ${prepared.outcome.summary}`,
    rank: prepared.nextStats.rank,
    strength: prepared.nextStats.strength,
    inventory: inventoryNow,
    jobChanged: Boolean(meta.jobChanged),
    leveledUp: prepared.outcome.leveledUp,
    rankChanged: prepared.outcome.rankChanged,
    scene: prepared.route.node?.visual.artKey,
  });

  const promptCtx: PromptContext = {
    stats: prepared.nextStats,
    inventory: inventoryNow,
    history,
    location: prepared.route.location,
    runType: meta.runType,
    artKey: frame.artKey,
    plate: plateLine(frame.artKey),
    jobChanged: Boolean(meta.jobChanged),
  };
  const systemPrompt = buildSystemPrompt(
    promptCtx,
    retrievalQuery(promptCtx, choice.label),
  );
  const seed = meta.seed ^ hashString(`${meta.step}:${choice.id}`);
  if (signal.aborted) return;

  const [prose, nextChoices] = await Promise.all([
    collectPanelProse(
      {
        systemPrompt,
        userPrompt: buildNarrationPrompt(choice.label, prepared.outcome, promptCtx),
        seed,
      },
      captionFallback(prepared.outcome.kind, prepared.outcome.success),
    ),
    prepared.outcome.terminal
      ? Promise.resolve([])
      : generateChoices({
          systemPrompt,
          userPrompt: buildChoicesPrompt(
            describeSituation(promptCtx, {
              action: choice.label,
              summary: prepared.outcome.summary,
            }),
            promptCtx,
          ),
          seed,
        }),
  ]);

  if (signal.aborted) return;
  await savePrefetch(meta.sessionId, {
    choiceId: choice.id,
    caption: prose.caption,
    narration: prose.text,
    choices: nextChoices,
    assumedStep: meta.step,
    assumedRedGate: prepared.isRedGate,
    createdAt: Date.now(),
  });
}
