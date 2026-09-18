/** Hunter ranks, weakest to strongest. Gates which content the router may offer. */
export const HUNTER_RANKS = ["E", "D", "C", "B", "A", "S"] as const;
export type HunterRank = (typeof HUNTER_RANKS)[number];

export interface PlayerStats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  /** 0-100. Rises with exertion; high fatigue degrades combat rolls. */
  fatigue: number;
  level: number;
  xp: number;
  strength: number;
  agility: number;
  rank: HunterRank;
  /** 0-100. How far this run has drifted from the canonical storyline. */
  canonDivergence: number;
}

/** Numeric stat fields a turn outcome is allowed to move. */
export type MutableStat =
  | "hp"
  | "mp"
  | "fatigue"
  | "xp"
  | "strength"
  | "agility"
  | "canonDivergence";

export interface StatDelta {
  stat: MutableStat;
  value: number;
}

export interface ChoiceRequirement {
  mp?: number;
  hp?: number;
  level?: number;
  strength?: number;
  agility?: number;
  rank?: HunterRank;
  item?: string;
}

export const INITIAL_STATS: PlayerStats = {
  hp: 100,
  maxHp: 100,
  mp: 30,
  maxMp: 30,
  fatigue: 0,
  level: 1,
  xp: 0,
  strength: 10,
  agility: 10,
  rank: "E",
  canonDivergence: 0,
};

export const STAT_BOUNDS: Record<MutableStat, { min: number; max: number }> = {
  hp: { min: 0, max: Number.POSITIVE_INFINITY },
  mp: { min: 0, max: Number.POSITIVE_INFINITY },
  fatigue: { min: 0, max: 100 },
  xp: { min: 0, max: Number.POSITIVE_INFINITY },
  strength: { min: 1, max: 999 },
  agility: { min: 1, max: 999 },
  canonDivergence: { min: 0, max: 100 },
};

/**
 * XP needed to reach the next level. Tuned so a competent run clears in roughly
 * 30 panels — long enough to feel like an arc, short enough for one sitting.
 */
export function xpForNextLevel(level: number): number {
  return 80 + (level - 1) * 35;
}

/** Rank ladder scaled to the same ~30-panel run, finishing around B-rank. */
export function rankForLevel(level: number): HunterRank {
  if (level >= 12) return "S";
  if (level >= 10) return "A";
  if (level >= 7) return "B";
  if (level >= 5) return "C";
  if (level >= 3) return "D";
  return "E";
}

export function rankIndex(rank: HunterRank): number {
  return HUNTER_RANKS.indexOf(rank);
}
