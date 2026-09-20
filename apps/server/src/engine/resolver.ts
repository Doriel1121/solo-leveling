import type {
  FxId,
  MutableStat,
  PanelKind,
  PlayerStats,
  RiskLevel,
  StatDelta,
} from "@system/shared";
import { STAT_BOUNDS, rankForLevel, xpForNextLevel } from "@system/shared";
import { hashString, mulberry32, rollD100 } from "./rng.js";
import type { GeneratedChoice, TurnOutcome } from "./types.js";
import { rewardFor } from "./catalogue.js";

/**
 * Level at which the run is considered cleared. Sized so a competent run is
 * roughly 25 panels — one sitting — and finishes at C-rank. Long-term
 * progression is the `highest_rank` on the account across many runs, not a
 * single marathon.
 */
export const VICTORY_LEVEL = 5;

const DIFFICULTY: Record<RiskLevel, number> = {
  safe: 25,
  moderate: 55,
  deadly: 80,
};

const XP_REWARD: Record<RiskLevel, number> = {
  safe: 16,
  moderate: 40,
  deadly: 80,
};

/**
 * XP decay per level for actions beneath the player's competence. Without this,
 * repeating safe actions is a free sustain loop that wins every run — a B-rank
 * hunter has nothing left to learn from scouting a corridor carefully. The
 * effect is that progression forces escalating risk.
 */
const XP_DECAY_PER_LEVEL: Record<RiskLevel, number> = {
  safe: 2,
  moderate: 1,
  deadly: 0,
};

const MIN_XP = 2;

const FAILURE_DAMAGE: Record<RiskLevel, number> = {
  safe: 3,
  moderate: 12,
  deadly: 26,
};

/**
 * A successful cautious action buys back a little health and breathing room.
 * Without this there is no sustain in the system at all: every path trends to
 * zero HP and the victory condition is unreachable, which makes the safe/deadly
 * choice meaningless.
 */
/**
 * Proportional rather than flat: a flat heal is meaningful at 100 HP and
 * irrelevant at 184, which is what produced an unwinnable grind at higher
 * levels.
 */
const SAFE_RECOVERY_HP_RATIO = 0.08;
const SAFE_RECOVERY_FATIGUE = -9;

const FATIGUE_COST: Record<RiskLevel, number> = {
  safe: 2,
  moderate: 5,
  deadly: 10,
};

/**
 * Divisor on the fatigue roll penalty. Tighter than this and accumulated
 * fatigue becomes an unrecoverable death spiral well before the victory
 * condition is in reach.
 */
const FATIGUE_PENALTY_DIVISOR = 10;

const DIVERGENCE: Record<RiskLevel, number> = {
  safe: 0.5,
  moderate: 1.5,
  deadly: 3.5,
};

/** Passive mana trickle so a run cannot dead-end on an empty pool. */
const MP_REGEN = 3;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface ResolvedTurn {
  outcome: TurnOutcome;
  stats: PlayerStats;
}

/**
 * Applies a delta list to a stats object, respecting caps and cascading level
 * ups. Returns a new object; callers never mutate stats in place.
 */
export function applyDeltas(
  stats: PlayerStats,
  deltas: StatDelta[],
): { stats: PlayerStats; systemLines: string[] } {
  const next: PlayerStats = { ...stats };
  const systemLines: string[] = [];

  for (const delta of deltas) {
    const bounds = STAT_BOUNDS[delta.stat];
    const ceiling =
      delta.stat === "hp"
        ? next.maxHp
        : delta.stat === "mp"
          ? next.maxMp
          : bounds.max;
    next[delta.stat] = clamp(next[delta.stat] + delta.value, bounds.min, ceiling);
  }

  while (next.xp >= xpForNextLevel(next.level)) {
    next.xp -= xpForNextLevel(next.level);
    next.level += 1;
    next.maxHp += 12;
    next.maxMp += 6;
    next.strength += 2;
    next.agility += 2;
    next.hp = Math.min(next.maxHp, next.hp + 15);
    systemLines.push(`[ Level up. You are now level ${next.level}. ]`);

    const promoted = rankForLevel(next.level);
    if (promoted !== next.rank) {
      next.rank = promoted;
      systemLines.push(`[ Rank re-evaluated: ${promoted}-rank. ]`);
    }
  }

  return { stats: next, systemLines };
}

/**
 * The authoritative dice. Fatigue drags the roll down, attributes and level push
 * it up, and the result is compared against the risk band's difficulty. Nothing
 * here consults the model, which is why prefetched turns stay consistent.
 */
const SOCIAL_LOCATIONS = new Set([
  "awakening",
  "hospital",
  "surface",
  "shop",
]);

export function resolveTurn(params: {
  stats: PlayerStats;
  choice: GeneratedChoice;
  inventory: string[];
  seed: number;
  step: number;
  isRedGate: boolean;
  location?: string;
}): ResolvedTurn {
  const { stats, choice, seed, step, isRedGate } = params;
  const social = SOCIAL_LOCATIONS.has(params.location ?? "");
  const risk = choice.risk;

  const rng = mulberry32(seed ^ hashString(`${step}:${choice.id}`));
  const raw = rollD100(rng);

  const attributeBonus = Math.floor(
    (stats.strength + stats.agility - 20) / 2 + stats.level * 1.5,
  );
  const fatiguePenalty = Math.floor(stats.fatigue / FATIGUE_PENALTY_DIVISOR);
  // Red gates break the usual rank scaling; that is their whole character.
  const gatePenalty = isRedGate ? 12 : 0;
  const roll = raw + attributeBonus - fatiguePenalty - gatePenalty;
  const difficulty = DIFFICULTY[risk];
  const success = roll >= difficulty;

  const deltas: StatDelta[] = [];
  const systemLines: string[] = [];

  // Declared costs are always paid, win or lose.
  if (choice.requires.mp) {
    deltas.push({ stat: "mp", value: -choice.requires.mp });
    systemLines.push(`[ MP -${choice.requires.mp} ]`);
  } else {
    deltas.push({ stat: "mp", value: MP_REGEN });
  }
  if (choice.requires.hp) {
    deltas.push({ stat: "hp", value: -choice.requires.hp });
  }

  deltas.push({ stat: "fatigue", value: FATIGUE_COST[risk] });
  deltas.push({
    stat: "canonDivergence",
    value: DIVERGENCE[risk] * (isRedGate ? 2.5 : 1),
  });

  let summary: string;
  if (success) {
    const margin = roll - difficulty;
    const xp = Math.max(
      MIN_XP,
      XP_REWARD[risk] +
        Math.floor(margin / 4) -
        XP_DECAY_PER_LEVEL[risk] * (stats.level - 1),
    );
    deltas.push({ stat: "xp", value: xp });
    systemLines.push(`[ EXP +${xp} ]`);
    summary = `The player succeeded at a ${risk} action and gained ${xp} experience.`;

    if (risk === "safe" && !social) {
      deltas.push({
        stat: "hp",
        value: Math.ceil(stats.maxHp * SAFE_RECOVERY_HP_RATIO),
      });
      deltas.push({ stat: "fatigue", value: SAFE_RECOVERY_FATIGUE });
    }
  } else if (social) {
    deltas.push({ stat: "fatigue", value: 3 });
    summary = `The player failed a ${risk} action. Nothing struck them. The moment just went wrong.`;
  } else {
    const shortfall = difficulty - roll;
    const damage = FAILURE_DAMAGE[risk] + Math.floor(shortfall / 3);
    deltas.push({ stat: "hp", value: -damage });
    systemLines.push(`[ HP -${damage} ]`);
    summary = `The player failed a ${risk} action and took ${damage} damage.`;
  }

  const reward = rewardFor(choice.grant, success);
  const granted: string[] = [];
  let jobChanged = false;
  if (reward) {
    deltas.push(...reward.deltas);
    systemLines.push(reward.line);
    summary += ` ${reward.summary}`;
    if (reward.name && !params.inventory.includes(reward.name)) {
      granted.push(reward.name);
    }
    jobChanged = reward.jobChange;
  }

  const applied = applyDeltas(stats, deltas);
  const nextStats = applied.stats;
  systemLines.push(...applied.systemLines);

  const leveledUp = nextStats.level > stats.level;
  const rankChanged = nextStats.rank !== stats.rank;

  let kind: PanelKind = risk === "safe" ? "narration" : "combat";
  if (social) kind = params.location === "awakening" ? "system" : "narration";
  if (isRedGate) kind = "red_gate";

  let terminal: TurnOutcome["terminal"] = null;
  if (nextStats.hp <= 0) {
    terminal = "death";
    kind = "death";
    systemLines.push("[ You have died. ]");
    summary += " The damage was fatal.";
  } else if (nextStats.level >= VICTORY_LEVEL) {
    terminal = "victory";
    kind = "victory";
    systemLines.push(`[ Gate cleared. Final rank: ${nextStats.rank}. ]`);
    summary += " This cleared the gate.";
  }

  return {
    stats: nextStats,
    outcome: {
      kind,
      deltas,
      systemLines,
      summary,
      fx: stampFx({
        risk,
        success,
        terminal,
        leveledUp,
        rankChanged,
        spentMp: Boolean(choice.requires.mp),
        acquired: granted.length > 0 || Boolean(reward),
        social,
      }),
      terminal,
      roll,
      difficulty,
      success,
      leveledUp,
      rankChanged,
      granted,
      jobChanged,
    },
  };
}

/**
 * Translates a resolved outcome into effect ids. A terminal panel replaces the
 * queue outright rather than stacking, so death never arrives behind a slash
 * animation.
 */
function stampFx(params: {
  risk: RiskLevel;
  success: boolean;
  terminal: "death" | "victory" | null;
  leveledUp: boolean;
  rankChanged: boolean;
  spentMp: boolean;
  acquired: boolean;
  social?: boolean;
}): FxId[] {
  if (params.terminal === "death") return ["death"];
  if (params.terminal === "victory") return ["victory"];

  const fx: FxId[] = [];
  if (params.spentMp) fx.push("mp_spend");

  if (params.social) {
    fx.push(params.success ? "system_open" : "lock_deny");
    if (params.success) fx.push("xp_tick");
  } else if (params.success) {
    if (params.risk === "safe") fx.push("safe_recover");
    else if (params.risk === "deadly") fx.push("strike_heavy");
    else fx.push("strike");
    fx.push("xp_tick");
  } else {
    fx.push(params.risk === "deadly" ? "fail_deadly" : "fail_hit");
  }

  if (params.acquired) fx.push("item_acquire");
  if (params.leveledUp) fx.push("level_up");
  if (params.rankChanged) fx.push("rank_up");
  return fx;
}

/** Rebuilds the stat deltas for the debug overlay without re-rolling. */
export function summariseDeltas(deltas: StatDelta[]): Record<MutableStat, number> {
  const totals = {} as Record<MutableStat, number>;
  for (const delta of deltas) {
    totals[delta.stat] = (totals[delta.stat] ?? 0) + delta.value;
  }
  return totals;
}
