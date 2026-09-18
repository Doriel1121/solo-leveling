import type { Choice, FxId } from "@system/shared";
import { PAINTED_STILLS, resolveStillKey, stillScene } from "@system/shared";

/**
 * Effects that take over the screen. They preempt whatever is queued rather
 * than waiting their turn, so death never arrives behind a slash animation.
 */
const PREEMPTIVE = new Set<FxId>(["level_up", "death", "victory"]);

export function isPreemptive(fx: FxId): boolean {
  return PREEMPTIVE.has(fx);
}

/**
 * Optimistic effects fired on `pointerdown`, before the request is even sent.
 *
 * Only what the client can honestly know at tap time: that a tap happened, and
 * that the option costs mana. Success, damage, and level-ups belong to the
 * resolver and arrive on the `fx` event a moment later, which upgrades this.
 */
export function predictFx(choice: Choice): FxId[] {
  const fx: FxId[] = ["confirm"];
  if (choice.requires.mp) fx.push("mp_spend");
  return fx;
}

/** Effects that live inside the panel frame rather than over the whole page. */
const PANEL_LOCAL = new Set<FxId>([
  "strike",
  "strike_heavy",
  "fail_hit",
  "fail_deadly",
  "safe_recover",
  "red_seal",
  "collapse",
  "rest",
  "shop_tempt",
  "anomaly_bed",
]);

export function isPanelLocal(fx: FxId): boolean {
  return PANEL_LOCAL.has(fx);
}

/**
 * Painted plates that actually exist on disk. Missing catalogue keys resolve
 * to a neighbour still so the stage is never an empty CSS wash.
 */
const ART_EXT = "png";

/** Prefix → CSS biome used when a key has no dedicated plate class. */
const BIOME_PLATE: Record<string, string> = {
  awakening: "plate-awakening-office",
  gate: "plate-gate-carpark",
  dungeon: "plate-dungeon-pillar",
  hospital: "plate-hospital-stairwell",
  penalty: "plate-penalty-legs",
  temple: "plate-temple-commandments",
  system: "plate-system-shop",
  surface: "plate-surface-cafe",
  redgate: "plate-redgate-snow",
  ice: "plate-redgate-snow",
  job: "plate-job-throne",
  ending: "plate-ending-death",
  shadow: "plate-shadow-void",
  castle: "plate-castle-stair",
  hive: "plate-hive-tunnel",
  healer: "plate-surface-night",
};

export function artSrc(artKey: string): string {
  return `/art/${artKey}.${ART_EXT}`;
}

export function hasPaintedPlate(artKey: string): boolean {
  return PAINTED_STILLS.has(resolveStillKey(artKey));
}

/** `dungeon.pillar` -> specific class plus a biome fallback. */
export function plateClass(artKey: string): string {
  const scene = stillScene(artKey);
  const specific = `plate-${scene.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  const prefix = scene.split(".")[0] ?? "";
  const biome = BIOME_PLATE[prefix] ?? "plate-dungeon-pillar";
  return specific === biome ? specific : `${specific} ${biome}`;
}
