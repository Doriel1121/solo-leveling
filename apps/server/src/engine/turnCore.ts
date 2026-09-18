import type { PlayerStats } from "@system/shared";
import { resolveTurn } from "./resolver.js";
import { decideRoute, type RouteDecision } from "./router.js";
import type { GeneratedChoice, SessionMeta, TurnOutcome } from "./types.js";

export interface PreparedTurn {
  outcome: TurnOutcome;
  nextStats: PlayerStats;
  route: RouteDecision;
  isRedGate: boolean;
}

/**
 * Everything about a turn that is decided without the model: the dice, the stat
 * changes, and which source will supply the panel.
 *
 * Both the live turn and the speculative prefetcher call this. Because it is
 * seeded on (run seed, step, choice id) it returns byte-identical results for
 * the same inputs, which is the property that makes a prefetched panel safe to
 * redeem later.
 */
export async function prepareTurn(params: {
  meta: SessionMeta;
  stats: PlayerStats;
  inventory: string[];
  choice: GeneratedChoice;
}): Promise<PreparedTurn> {
  const isRedGate = params.meta.redGateDepth > 0;

  const { outcome, stats: nextStats } = resolveTurn({
    stats: params.stats,
    choice: params.choice,
    inventory: params.inventory,
    seed: params.meta.seed,
    step: params.meta.step,
    isRedGate,
  });

  const route = await decideRoute({
    meta: params.meta,
    stats: nextStats,
    terminal: outcome.terminal !== null,
  });

  return { outcome, nextStats, route, isRedGate };
}
