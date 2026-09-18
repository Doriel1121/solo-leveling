import type { ChoiceRequirement } from "./stats.js";

export type PanelKind =
  | "narration"
  | "system"
  | "combat"
  | "red_gate"
  | "death"
  | "victory";

export type PanelSource = "static" | "ai" | "prefetch";

export type RiskLevel = "safe" | "moderate" | "deadly";

/** Biomes the art catalogue is keyed on. */
export type BiomeLocation =
  | "awakening"
  | "d_rank_gate"
  | "instant_dungeon"
  | "surface"
  | "red_gate"
  | "hospital"
  | "penalty_zone"
  | "shop";

/** Colour grade applied over the art plate. Independent of the plate itself, so
 * the same still can play as an assessment room or a bloodied one. */
export type PanelMood =
  | "fluorescent"
  | "night"
  | "ice"
  | "blood"
  | "gold"
  | "warm"
  | "void"
  | "aura";

/**
 * Frame size. This is the glow-up: early panels are cramped and busy, late ones
 * go wide and quiet. Death always gets `bleed` regardless of level — the frame
 * finally gives the player the space they never had.
 */
export type PanelShot = "cramped" | "standard" | "bleed";

/**
 * Effect recipes. Ids rather than adjectives so components never improvise.
 * The resolver stamps these; the model is never asked to pick them.
 */
export type FxId =
  | "confirm"
  | "safe_recover"
  | "strike"
  | "strike_heavy"
  | "fail_hit"
  | "fail_deadly"
  | "mp_spend"
  | "xp_tick"
  | "level_up"
  | "rank_up"
  | "system_open"
  | "shop_tempt"
  | "red_seal"
  | "collapse"
  | "rest"
  | "death"
  | "victory"
  | "lock_deny"
  | "anomaly_bed"
  | "item_acquire";

/** `level_up`, `death` and `victory` preempt everything else in the queue. */
export const PREEMPTIVE_FX: readonly FxId[] = [
  "level_up",
  "death",
  "victory",
] as const;

export interface PanelVisual {
  /** Key into the art catalogue; falls back to the mood gradient if absent. */
  artKey: string;
  mood: PanelMood;
  shot: PanelShot;
  /** Always visible on the art. The panel *is* this. Max 140 characters. */
  caption: string;
}

export const CAPTION_MAX = 140;

export interface Choice {
  id: string;
  label: string;
  /** Short flavour line shown under the label, e.g. the skill being spent. */
  detail?: string;
  requires: ChoiceRequirement;
  risk: RiskLevel;
  /** Resolved server-side against live stats so the client never guesses. */
  locked: boolean;
  lockReason?: string;
  /**
   * System catalogue key granted if this option is taken. Authored shop /
   * healer / job-change beats only — generated choices never invent loot.
   */
  grant?: string;
}

export interface Panel {
  id: string;
  kind: PanelKind;
  source: PanelSource;
  visual: PanelVisual;
  fx: FxId[];
  /** Optional body prose under the art. 20-45 words; empty is the late-game look. */
  text: string;
  /** Lines rendered inside the blue System window, overlaid on the art. */
  systemLines: string[];
  createdAt: string;
}

export function isTerminalPanel(kind: PanelKind): boolean {
  return kind === "death" || kind === "victory";
}

export function truncateCaption(value: string): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= CAPTION_MAX) return clean;
  // Cut on a word boundary rather than mid-word.
  const cut = clean.slice(0, CAPTION_MAX - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
