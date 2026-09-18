import {
  HERO_STATE_FALLBACKS,
  splitStillKey,
  variantStillKey,
  type HeroState,
} from "./hero.js";

/**
 * Catalogue of original hunter stills. The engine paints one of these before
 * the first word; Gemini writes to the plate, it does not invent a new one
 * on the tap path.
 */
export const PLATE_COPY = {
  "awakening.office":
    "The same original E-rank hunter, looking up at a dead fluorescent office ceiling, one tube still buzzing.",
  "gate.carpark":
    "The hunter in an underground car park, three-quarter figure, facing a glowing blue oval gate.",
  "gate.break":
    "The hunter in a city street at dusk as a gate ruptures and insectile shapes spill onto wet asphalt.",
  "dungeon.pillar":
    "The hunter crouched in a dark stone dungeon beside a cracked pillar, a giant ant-thing just off-frame.",
  "dungeon.safe":
    "The hunter sitting against a dungeon wall, cheap sword across his knees, catching his breath.",
  "dungeon.collapse":
    "The hunter sprinting as a stone ceiling comes down behind him.",
  "dungeon.hunters":
    "The hunter in the foreground; a small raid party behind him looking at him with contempt.",
  "dungeon.mine":
    "The hunter among tired D-rank miners in a crystal mine, the real raid team watching who looks expendable.",
  "dungeon.core":
    "The hunter kneeling over a dead dungeon boss, pulling a pulsing blue mana core from its chest.",
  "dungeon.boss":
    "The hunter small in a vast boss chamber, facing a towering original monster under a single shaft of light.",
  "dungeon.instant":
    "The hunter alone before a private System gate nobody else can see, a blue oval in an ordinary alley.",
  "dungeon.double":
    "The hunter at a fork going deeper than the briefing, a second darker stair yawning under torchlight.",
  "dungeon.betray":
    "The hunter in a dungeon corridor; a smiling party leader counts heads and looks at him like arithmetic.",
  "dungeon.prisoner":
    "The hunter beside a shackled raid labourer in cheap cuffs, both of them holding broken weapons.",
  "dungeon.spare":
    "The hunter standing over a downed human hunter, cheap sword raised, deciding whether to finish it.",
  "dungeon.ally":
    "The hunter next to an eager well-dressed D-rank with too much gear and a hopeful grin, original characters.",
  "dungeon.strike":
    "The hunter mid-slash at a monster's joint, cheap wrapped sword catching a spark of mana.",
  "dungeon.hit":
    "The hunter taking a hit, body folding, cheap leather cracked, blood at the mouth, still on his feet.",
  "hospital.stairwell":
    "The hunter on a hospital stairwell landing, doing painful training in cheap clothes.",
  "hospital.sister":
    "The hunter frozen mid push-up on a hospital stair, a teenage girl in a school coat about to open the door.",
  "hospital.ward":
    "The hunter sitting beside a hospital bed where an older woman sleeps as if she will not wake, original family.",
  "hospital.call":
    "The hunter inside a dark dungeon answering a cracked phone, the cheap screen lighting his face.",
  "penalty.legs":
    "The hunter fighting a giant centipede in a dark sandy penalty desert.",
  "penalty.timer":
    "The hunter alone in black sand under a huge empty sky, a cold blue countdown hanging in the air.",
  "penalty.worse":
    "The hunter surrounded by even larger many-legged things in the penalty desert, the sand worse than last time.",
  "temple.commandments":
    "The hunter kneeling among colossal stone knight statues in a dark commandment temple.",
  "temple.altar":
    "The hunter before a black stone altar that wants a sacrifice, other hunters waiting behind him.",
  "temple.watchers":
    "The hunter walking a temple aisle, colossal statues turning their heads the moment he looks away.",
  "system.shop":
    "The hunter reaching toward floating System shop items in a void of wrong-blue light.",
  "system.window":
    "Close on the hunter's tired face as a sharp blue System window hangs in the air in front of him.",
  "surface.cafe":
    "The hunter at a cheap cafe table across from a sharp-dressed recruiter.",
  "surface.night":
    "The hunter on a night street beside a tired young woman in a healer's coat.",
  "surface.association":
    "The hunter in a Hunter Association office, a glowing mana meter pointed at his chest.",
  "surface.retest":
    "The hunter standing in a formal Association hall while a mana meter reads nothing and the room stares anyway.",
  "surface.inspector":
    "The hunter across a desk from a polite Association inspector who has noticed numbers that do not add up.",
  "surface.guildhall":
    "The hunter in a polished guild lobby, a professional fire-mage in a dark coat offering a contract folder.",
  "surface.tails":
    "The hunter glancing back down a night alley, guild scouts in civilian clothes following him toward a hidden gate.",
  "surface.cameras":
    "The hunter leaving a closed gate as news cameras and civilians crowd the street, trying not to be seen.",
  "redgate.snow":
    "The hunter standing in a frozen forest facing a sealed red gate, breath fogging.",
  "ice.interior":
    "The hunter inside a sealed red-gate forest, red light dying behind snow-heavy pines, no way back.",
  "ice.camp":
    "The hunter at a starving camp in deep snow, two hunter groups, one already turning away from the weak.",
  "ice.hunt":
    "The hunter hunting through a blizzard, ice-wolf silhouettes in the white, cheap coat frozen stiff.",
  "job.throne":
    "The hunter small in the foreground, looking up at a massive armored knight before an empty throne.",
  "job.survive":
    "The hunter backing across a dark arena while a System timer hangs overhead, scoring time lived, not kills.",
  "job.offer":
    "The hunter staring at a cold class-offer window in a void, the implied class feeling unclean.",
  "shadow.arise":
    "The hunter standing over a fresh corpse as a black-violet shadow peels up from it, reaching toward him.",
  "shadow.fail":
    "The hunter reaching toward a corpse that will not rise, shadow collapsing back into ordinary dead meat.",
  "shadow.knight":
    "The hunter facing a silent original armored knight-shadow kneeling after a kill, offering a discarded weapon.",
  "shadow.army":
    "The hunter walking forward with a small original shadow army at his back, late-game quiet competence, no smile.",
  "castle.stairs":
    "The hunter on a vast demonic castle stair climbing floor after floor, lava light below, original architecture.",
  "castle.crucible":
    "The hunter at a cursed crucible on a high castle floor, brewing a glowing draught meant for a family cure.",
  "hive.tunnel":
    "The hunter in a chitin hive tunnel, original ant-soldiers packed in the walls, torchlight on mandibles.",
  "healer.exit":
    "The hunter holding a mana crystal while a young healer walks away into ordinary night, leaving by choice.",
  "ending.death":
    "The hunter fallen on dungeon stone, eyes half-open, cheap sword out of reach.",
  "ending.victory":
    "The hunter walking toward us as a blue gate collapses behind him.",
} as const;

export type ArtKey = keyof typeof PLATE_COPY;

export const PLATE_KEYS = Object.keys(PLATE_COPY) as ArtKey[];

/** Keys that actually have a PNG in `apps/web/public/art`. Worn = unsuffixed. */
export const PAINTED_HERO_VARIANTS: readonly string[] = [
  "dungeon.boss.armed",
  "dungeon.boss.aura",
  "dungeon.boss.shadow",
  "dungeon.collapse.armed",
  "dungeon.collapse.aura",
  "dungeon.collapse.shadow",
  "dungeon.core.armed",
  "dungeon.core.aura",
  "dungeon.core.shadow",
  "dungeon.hunters.armed",
  "dungeon.hunters.aura",
  "dungeon.hunters.shadow",
  "dungeon.pillar.armed",
  "dungeon.pillar.aura",
  "dungeon.pillar.shadow",
  "dungeon.safe.armed",
  "dungeon.safe.aura",
  "dungeon.safe.shadow",
  "dungeon.spare.armed",
  "dungeon.spare.aura",
  "dungeon.spare.shadow",
  "dungeon.strike.armed",
  "dungeon.strike.aura",
  "dungeon.strike.shadow",
  "ending.death.armed",
  "ending.death.aura",
  "ending.death.shadow",
  "ending.victory.armed",
  "ending.victory.aura",
  "ending.victory.shadow",
  "gate.break.armed",
  "gate.break.aura",
  "gate.break.shadow",
  "gate.carpark.armed",
  "gate.carpark.aura",
  "gate.carpark.shadow",
  "hospital.stairwell.armed",
  "hospital.stairwell.aura",
  "hospital.stairwell.shadow",
  "ice.camp.armed",
  "ice.camp.aura",
  "ice.camp.shadow",
  "job.survive.armed",
  "job.survive.aura",
  "job.survive.shadow",
  "job.throne.armed",
  "job.throne.aura",
  "job.throne.shadow",
  "penalty.legs.armed",
  "penalty.legs.aura",
  "penalty.legs.shadow",
  "redgate.snow.armed",
  "redgate.snow.aura",
  "redgate.snow.shadow",
  "shadow.arise.armed",
  "shadow.arise.aura",
  "shadow.arise.shadow",
  "surface.association.armed",
  "surface.association.aura",
  "surface.association.shadow",
  "surface.cafe.armed",
  "surface.cafe.aura",
  "surface.cafe.shadow",
  "surface.retest.armed",
  "surface.retest.aura",
  "surface.retest.shadow",
  "temple.altar.armed",
  "temple.altar.aura",
  "temple.altar.shadow",
  "temple.commandments.armed",
  "temple.commandments.aura",
  "temple.commandments.shadow",
];

export const PAINTED_STILLS: ReadonlySet<string> = new Set<string>([
  "awakening.office",
  "gate.carpark",
  "gate.break",
  "dungeon.pillar",
  "dungeon.safe",
  "dungeon.collapse",
  "dungeon.hunters",
  "dungeon.mine",
  "dungeon.core",
  "dungeon.boss",
  "dungeon.instant",
  "dungeon.betray",
  "dungeon.spare",
  "dungeon.strike",
  "hospital.stairwell",
  "hospital.sister",
  "hospital.ward",
  "penalty.legs",
  "temple.commandments",
  "temple.altar",
  "system.shop",
  "surface.cafe",
  "surface.night",
  "surface.association",
  "surface.retest",
  "surface.inspector",
  "surface.guildhall",
  "redgate.snow",
  "ice.camp",
  "job.throne",
  "job.survive",
  "job.offer",
  "shadow.arise",
  "shadow.fail",
  "shadow.knight",
  "shadow.army",
  "castle.stairs",
  "hive.tunnel",
  "healer.exit",
  "ending.death",
  "ending.victory",
  ...PAINTED_HERO_VARIANTS,
]);

/** Unpainted catalogue keys → nearest still that exists on disk. */
const STILL_NEAREST: Record<string, string> = {
  "dungeon.double": "dungeon.pillar",
  "dungeon.prisoner": "dungeon.hunters",
  "dungeon.ally": "dungeon.hunters",
  "dungeon.hit": "dungeon.strike",
  "hospital.call": "hospital.stairwell",
  "penalty.timer": "penalty.legs",
  "penalty.worse": "penalty.legs",
  "temple.watchers": "temple.commandments",
  "system.window": "system.shop",
  "surface.tails": "surface.night",
  "surface.cameras": "surface.night",
  "ice.interior": "ice.camp",
  "ice.hunt": "ice.camp",
  "castle.crucible": "castle.stairs",
};

const STILL_BY_PREFIX: Record<string, string> = {
  awakening: "awakening.office",
  gate: "gate.carpark",
  dungeon: "dungeon.pillar",
  hospital: "hospital.stairwell",
  penalty: "penalty.legs",
  temple: "temple.commandments",
  system: "system.shop",
  surface: "surface.cafe",
  redgate: "redgate.snow",
  ice: "ice.camp",
  job: "job.throne",
  ending: "ending.death",
  shadow: "shadow.arise",
  castle: "castle.stairs",
  hive: "hive.tunnel",
  healer: "healer.exit",
};

/**
 * Every panel must resolve to a PNG. Hero-state suffixes fall back toward the
 * E-rank plate of the same scene; missing scenes borrow a neighbour.
 */
export function resolveStillKey(artKey: string): string {
  const { scene, state } = splitStillKey(artKey);
  const wanted: HeroState = state ?? "worn";
  for (const candidate of HERO_STATE_FALLBACKS[wanted]) {
    const key = variantStillKey(scene, candidate);
    if (PAINTED_STILLS.has(key)) return key;
  }
  const nearest = STILL_NEAREST[scene];
  if (nearest) {
    for (const candidate of HERO_STATE_FALLBACKS[wanted]) {
      const key = variantStillKey(nearest, candidate);
      if (PAINTED_STILLS.has(key)) return key;
    }
  }
  const prefix = scene.split(".")[0] ?? "";
  const fromPrefix = STILL_BY_PREFIX[prefix];
  if (fromPrefix && PAINTED_STILLS.has(fromPrefix)) return fromPrefix;
  return "dungeon.pillar";
}
