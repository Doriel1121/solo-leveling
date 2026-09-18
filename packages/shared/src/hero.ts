import type { PanelKind } from "./panels.js";
import { rankIndex, type HunterRank } from "./stats.js";

/**
 * How the same original hunter is painted. Scene keys stay `dungeon.strike`;
 * the third segment is this state (`dungeon.strike.aura`). `worn` has no
 * suffix so the existing PNGs remain the E-rank look.
 *
 * Visual language from the series, original character only:
 * - Pure mana is electric blue.
 * - Job Change is the black-coat glow-up; a violet rim comes later.
 */
export const HERO_STATES = ["worn", "armed", "aura", "shadow"] as const;
export type HeroState = (typeof HERO_STATES)[number];

export function isHeroState(value: string): value is HeroState {
  return (HERO_STATES as readonly string[]).includes(value);
}

export function splitStillKey(artKey: string): {
  scene: string;
  state: HeroState | null;
} {
  const parts = artKey.split(".");
  const last = parts.at(-1) ?? "";
  if (parts.length >= 3 && isHeroState(last)) {
    return { scene: parts.slice(0, -1).join("."), state: last };
  }
  return { scene: artKey, state: null };
}

export function stillScene(artKey: string): string {
  return splitStillKey(artKey).scene;
}

export function stillHeroState(artKey: string): HeroState {
  return splitStillKey(artKey).state ?? "worn";
}

export function variantStillKey(scene: string, state: HeroState): string {
  const base = splitStillKey(scene).scene;
  return state === "worn" ? base : `${base}.${state}`;
}

export function withHeroState(scene: string, state: HeroState): string {
  return variantStillKey(scene, state);
}

/** If the requested variant is not on disk, degrade toward the E-rank plate. */
export const HERO_STATE_FALLBACKS: Record<HeroState, readonly HeroState[]> = {
  worn: ["worn"],
  armed: ["armed", "worn"],
  aura: ["aura", "armed", "worn"],
  shadow: ["shadow", "aura", "armed", "worn"],
};

const WEAPON_ITEMS = ["notched shortblade"];
const JOB_ITEMS = ["knight's compact", "survivor's mark", "unclean class"];

export function heroStateFor(params: {
  rank: HunterRank;
  level: number;
  strength: number;
  inventory: readonly string[];
  jobChanged?: boolean;
  leveledUp?: boolean;
  rankChanged?: boolean;
  kind?: PanelKind;
}): HeroState {
  const jobbed =
    Boolean(params.jobChanged) ||
    params.inventory.some((item) => JOB_ITEMS.includes(item));
  const armed = params.inventory.some(
    (item) =>
      WEAPON_ITEMS.includes(item) || /blade|dagger|sword/i.test(item),
  );

  if (params.kind === "death") {
    if (jobbed) return "shadow";
    if (armed) return "armed";
    return "worn";
  }

  if (jobbed) return "shadow";
  if (params.kind === "victory") return "aura";

  const powerSpike = Boolean(params.leveledUp || params.rankChanged);
  const fightingStrong =
    params.kind === "combat" &&
    (powerSpike ||
      params.level >= 3 ||
      params.strength >= 14 ||
      rankIndex(params.rank) >= 1);

  if (powerSpike || fightingStrong) return "aura";
  if (armed) return "armed";
  return "worn";
}

/** Camera note for still generation and for the narrator writing to the plate. */
export const HERO_LOOK: Record<HeroState, string> = {
  worn: "Same original hunter: lean, exhausted, messy black hair, tired dark eyes, cheap cracked brown leather chestpiece over a navy hoodie, worn combat boots, a cheap wrapped shortsword. No mana glow. Small in the frame. He looks like hazard pay will not cover a funeral.",
  armed: "Same original hunter, same face. Slightly fitter. The cracked leather is still on. He holds a notched black shortblade instead of the wrapped sword. Hair a little neater. No full-body aura — only a faint cyan spark on the blade edge.",
  aura: "Same original hunter, same face. Electric BLUE mana aura wrapping his body like cold fire — cyan-white core, brighter at the eyes, throat, and weapon, dust lifting off the floor. Pure mana is blue, never purple, never gold. Stronger stance, shoulders set, unreadable. Not a licensed likeness.",
  shadow: "Same original hunter, same face, now composed. Darker neater hair, unreadable eyes, black high-collar hunter coat, dark clothes, a shortblade. Quiet competence, no smile. Thin black-violet rim around a BLUE-WHITE mana skin. The coat is the glow-up; the aura core stays blue.",
};

/**
 * Plates where the hunter is large enough that gear and aura must change.
 * Wide environment shots keep a single still.
 */
export const HERO_VARIANT_SCENES = [
  "gate.carpark",
  "gate.break",
  "dungeon.pillar",
  "dungeon.safe",
  "dungeon.collapse",
  "dungeon.hunters",
  "dungeon.core",
  "dungeon.boss",
  "dungeon.strike",
  "dungeon.spare",
  "hospital.stairwell",
  "penalty.legs",
  "temple.commandments",
  "temple.altar",
  "surface.cafe",
  "surface.retest",
  "surface.association",
  "redgate.snow",
  "ice.camp",
  "job.survive",
  "job.throne",
  "shadow.arise",
  "ending.victory",
  "ending.death",
] as const;
