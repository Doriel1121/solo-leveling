import type { PlayerStats } from "@system/shared";
import { env } from "../env.js";
import { findEligibleNodes } from "../db/repositories/staticNodes.js";
import { getSeenNodes } from "../state/sessionStore.js";
import { hashString, mulberry32 } from "./rng.js";
import type { SessionMeta, StaticNodeRecord } from "./types.js";

export interface RouteDecision {
  source: "static" | "ai";
  node: StaticNodeRecord | null;
  redGate: boolean;
  location: string;
  reason: string;
}

/**
 * Coarse location progression. Static nodes are keyed on these, so advancing
 * location is also what rotates the pre-authored content pool.
 */
const PROGRESSION = [
  "awakening",
  "d_rank_gate",
  // Level 2 is the non-combat rung: the daily quest, the hospital, the family
  // reason to keep running. Skipping the training here is what the next rung is.
  "hospital",
  "penalty_zone",
  "instant_dungeon",
  "surface",
  "instant_dungeon",
  "job_change",
  "instant_dungeon",
] as const;

function nextLocation(
  meta: SessionMeta,
  stats: PlayerStats,
  redGate: boolean,
): string {
  if (redGate) return "red_gate";
  // The opening panel is already awakening. The first tap may still resolve
  // there; after that the run has to leave the assessment room.
  if (meta.step < 1) return "awakening";
  const byStep = Math.floor(meta.step / 2);
  const byLevel = Math.max(0, stats.level - 1);
  const index = Math.min(PROGRESSION.length - 1, Math.max(byStep, byLevel, 1));
  return PROGRESSION[index]!;
}

/**
 * Picks the source for the upcoming panel.
 *
 * Static nodes are preferred for a configurable share of eligible transitions
 * purely to bound API spend; a diverted (Red Gate) run always goes to the model
 * because the entire point of the diversion is content no other run has seen.
 * Terminal panels are always model-authored so the ending reflects the run.
 */
export async function decideRoute(params: {
  meta: SessionMeta;
  stats: PlayerStats;
  terminal: boolean;
}): Promise<RouteDecision> {
  const { meta, stats, terminal } = params;
  const redGate = meta.redGateDepth > 0;
  const location = nextLocation(meta, stats, redGate);

  if (terminal) {
    return {
      source: "ai",
      node: null,
      redGate,
      location,
      reason: "terminal panels are always generated",
    };
  }

  if (redGate) {
    return {
      source: "ai",
      node: null,
      redGate: true,
      location,
      reason: "red gate anomaly — unique storyline required",
    };
  }

  const rng = mulberry32(meta.seed ^ hashString(`route:${meta.step}`));
  if (rng() > env.STATIC_NODE_RATIO) {
    return {
      source: "ai",
      node: null,
      redGate: false,
      location,
      reason: "sampled into the generated branch",
    };
  }

  const seen = await getSeenNodes(meta.sessionId);
  const candidates = await findEligibleNodes({
    location,
    level: stats.level,
    rank: stats.rank,
    excludeIds: seen,
    limit: 8,
  });

  if (!candidates.length) {
    return {
      source: "ai",
      node: null,
      redGate: false,
      location,
      reason: "no unseen static node fits this state",
    };
  }

  const node = candidates[Math.floor(rng() * candidates.length)]!;
  return {
    source: "static",
    node,
    redGate: false,
    location: node.location === "any" ? location : node.location,
    reason: `static node ${node.id}`,
  };
}
