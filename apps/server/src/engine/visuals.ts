import type { PanelKind, PanelMood, PanelShot } from "@system/shared";
import { resolveStillKey } from "@system/shared";
import { artKeyFromAction } from "./plates.js";

/**
 * Picks the art plate, colour grade, and frame size for a panel.
 *
 * Deliberately deterministic and server-side: the client must be able to paint
 * the frame from `panel_start` alone, before a single narration token arrives.
 * Art is never generated per turn — that would put a loading state back into
 * the one path the engine exists to keep instant.
 */

const ART_BY_LOCATION: Record<string, string> = {
  awakening: "awakening.office",
  d_rank_gate: "gate.carpark",
  instant_dungeon: "dungeon.pillar",
  surface: "surface.cafe",
  red_gate: "redgate.snow",
  hospital: "hospital.stairwell",
  penalty_zone: "penalty.legs",
  shop: "system.shop",
  job_change: "job.throne",
};

const ART_BY_KIND: Partial<Record<PanelKind, string>> = {
  death: "ending.death",
  victory: "ending.victory",
  combat: "dungeon.strike",
  red_gate: "ice.camp",
};

export function artKeyFor(location: string, kind: PanelKind): string {
  return (
    ART_BY_KIND[kind] ?? ART_BY_LOCATION[location] ?? "dungeon.pillar"
  );
}

export function moodFor(params: {
  location: string;
  kind: PanelKind;
  success: boolean;
}): PanelMood {
  const { location, kind, success } = params;

  if (kind === "death") return "void";
  if (kind === "victory") return "aura";
  if (kind === "red_gate" || location === "red_gate") return "ice";
  // A failed roll regrades whatever biome the player is standing in.
  if (!success) return "blood";
  if (kind === "combat") return "night";
  if (location === "awakening") return "fluorescent";
  if (location === "penalty_zone") return "void";
  if (location === "hospital") return "warm";
  if (location === "shop") return "gold";
  if (location === "surface") return "gold";
  if (location === "job_change") return "aura";
  return "night";
}

/** The glow-up, expressed as frame size rather than prose. */
export function shotFor(level: number, kind: PanelKind): PanelShot {
  if (kind === "death" || kind === "victory" || kind === "red_gate") {
    return "bleed";
  }
  if (level >= 5) return "bleed";
  if (level >= 3) return "standard";
  return "cramped";
}

export interface VisualFrame {
  artKey: string;
  mood: PanelMood;
  shot: PanelShot;
}

export function visualFor(params: {
  location: string;
  kind: PanelKind;
  level: number;
  success: boolean;
  action?: string;
}): VisualFrame {
  const base = artKeyFor(params.location, params.kind);
  const artKey = resolveStillKey(
    params.kind === "death" || params.kind === "victory"
      ? base
      : artKeyFromAction(params.action ?? "", base),
  );
  return {
    artKey,
    mood: moodFor(params),
    shot: shotFor(params.level, params.kind),
  };
}

/** Fallback caption when neither a static node nor the model supplied one. */
export function captionFallback(kind: PanelKind, success: boolean): string {
  if (kind === "death") return "The floor is very close, and very cold.";
  if (kind === "victory") return "The gate folds inward behind you.";
  if (!success) return "It lands before you finish moving.";
  return "The dark rearranges itself around you.";
}
