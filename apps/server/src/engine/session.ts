import { randomInt, randomUUID } from "node:crypto";
import type { Panel, SessionSnapshot } from "@system/shared";
import { INITIAL_STATS } from "@system/shared";
import { createRun } from "../db/repositories/runs.js";
import { findEligibleNodes } from "../db/repositories/staticNodes.js";
import { findOrCreateUser, incrementRunCount } from "../db/repositories/users.js";
import {
  createSession,
  getChoices,
  getInventory,
  getMeta,
  getPanels,
  getStats,
  markNodeSeen,
  pushPanel,
  saveChoices,
} from "../state/sessionStore.js";
import { collectPanelProse, generateChoices, withFreshIds } from "./generation.js";
import { newPanelId } from "./llm/ids.js";
import {
  buildChoicesPrompt,
  buildSystemPrompt,
  describeSituation,
  type PromptContext,
} from "./llm/prompts.js";
import { lockChoices } from "./locking.js";
import { schedulePrefetch } from "./prefetch.js";
import type { GeneratedChoice, SessionMeta } from "./types.js";
import { ensurePanelCopy, visualFor } from "./visuals.js";

const STARTING_INVENTORY = ["hunter ID card", "notched utility knife"];
const OPENING_LOCATION = "awakening";

/**
 * Starts a run: registers the account, opens a row in `runs`, writes the live
 * state to Redis, and produces the first panel. The opening is served from a
 * static node whenever one exists — every run begins identically, so paying the
 * model for it would be waste.
 */
export async function startSession(
  username?: string,
): Promise<SessionSnapshot> {
  const handle = username?.trim() || `hunter_${randomUUID().slice(0, 6)}`;
  const user = await findOrCreateUser(handle);
  const run = await createRun(user.id, "canon");
  await incrementRunCount(user.id);

  const meta: SessionMeta = {
    sessionId: randomUUID(),
    runId: run.id,
    userId: user.id,
    step: 0,
    runType: "canon",
    outcome: "active",
    location: OPENING_LOCATION,
    redGateDepth: 0,
    seed: randomInt(1, 2 ** 31 - 1),
  };

  const stats = { ...INITIAL_STATS };
  await createSession(meta, stats, STARTING_INVENTORY);

  const opening = await buildOpeningPanel(meta, stats);
  const choices = lockChoices(opening.choices, stats, STARTING_INVENTORY);

  await pushPanel(meta.sessionId, opening.panel);
  await saveChoices(meta.sessionId, choices);
  if (opening.nodeId) await markNodeSeen(meta.sessionId, opening.nodeId);

  // Speculate on the first tap too, so even the opening choice feels instant.
  schedulePrefetch({
    meta,
    stats,
    inventory: STARTING_INVENTORY,
    choices,
  });

  return {
    sessionId: meta.sessionId,
    runId: meta.runId,
    userId: meta.userId,
    stats,
    inventory: STARTING_INVENTORY,
    step: meta.step,
    runType: meta.runType,
    outcome: meta.outcome,
    location: meta.location,
    jobChanged: false,
    panels: [opening.panel],
    choices,
  };
}

interface OpeningPanel {
  panel: Panel;
  choices: GeneratedChoice[];
  nodeId: string | null;
}

async function buildOpeningPanel(
  meta: SessionMeta,
  stats: typeof INITIAL_STATS,
): Promise<OpeningPanel> {
  const [node] = await findEligibleNodes({
    location: OPENING_LOCATION,
    level: stats.level,
    rank: stats.rank,
    excludeIds: [],
    limit: 1,
  });

  const now = new Date().toISOString();

  if (node) {
    const copy = ensurePanelCopy({
      caption: node.visual.caption,
      text: node.content,
      kind: node.kind,
      success: true,
    });
    return {
      panel: {
        id: newPanelId(),
        kind: node.kind,
        source: "static",
        visual: {
          ...node.visual,
          caption: copy.caption,
        },
        fx: ["system_open"],
        text: copy.text || node.content,
        systemLines: node.systemLines,
        createdAt: now,
      },
      choices: withFreshIds(node.options),
      nodeId: node.id,
    };
  }

  // No seeded content: generate the opening so an unseeded database still plays.
  const promptCtx: PromptContext = {
    stats,
    inventory: STARTING_INVENTORY,
    history: [],
    location: OPENING_LOCATION,
    runType: "canon",
    jobChanged: false,
  };
  const systemPrompt = buildSystemPrompt(promptCtx, "awakening system window player hospital daily");
  const situation = [
    describeSituation(promptCtx),
    "The player is an unranked E-rank hunter at a routine assessment when a System window opens that only they can see.",
  ].join("\n");

  const [prose, choices] = await Promise.all([
    collectPanelProse(
      {
        systemPrompt,
        userPrompt: `Narrate the opening panel of the run. ${situation}`,
        seed: meta.seed,
      },
      "A pane of cold blue light opens in the air, and nobody else looks up.",
    ),
    generateChoices({
      systemPrompt,
      userPrompt: buildChoicesPrompt(situation, promptCtx),
      seed: meta.seed,
    }),
  ]);

  const copy = ensurePanelCopy({
    caption: prose.caption,
    text: prose.text,
    kind: "system",
    success: true,
  });

  return {
    panel: {
      id: newPanelId(),
      kind: "system",
      source: "ai",
      visual: {
        ...visualFor({
          location: OPENING_LOCATION,
          kind: "system",
          level: stats.level,
          success: true,
          rank: stats.rank,
          strength: stats.strength,
          inventory: STARTING_INVENTORY,
          jobChanged: false,
        }),
        caption: copy.caption,
      },
      fx: ["system_open"],
      text: copy.text,
      systemLines: ["[ You have acquired the qualification to be a Player. ]"],
      createdAt: now,
    },
    choices,
    nodeId: null,
  };
}

/** Rehydrates a run from Redis so a page refresh does not lose the feed. */
export async function loadSession(
  sessionId: string,
): Promise<SessionSnapshot | null> {
  const meta = await getMeta(sessionId);
  if (!meta) return null;

  const [stats, inventory, panels, choices] = await Promise.all([
    getStats(sessionId),
    getInventory(sessionId),
    getPanels(sessionId),
    getChoices(sessionId),
  ]);
  if (!stats) return null;

  return {
    sessionId: meta.sessionId,
    runId: meta.runId,
    userId: meta.userId,
    stats,
    inventory,
    step: meta.step,
    runType: meta.runType,
    outcome: meta.outcome,
    location: meta.location,
    jobChanged: Boolean(meta.jobChanged),
    panels: panels.map((panel) => {
      const copy = ensurePanelCopy({
        caption: panel.visual.caption,
        text: panel.text,
        kind: panel.kind,
        success: panel.kind !== "death",
      });
      return {
        ...panel,
        visual: { ...panel.visual, caption: copy.caption },
        text: copy.text || panel.text,
      };
    }),
    choices,
  };
}
