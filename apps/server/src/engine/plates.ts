/**
 * The stills already on disk, described so Gemini can write *to* them.
 *
 * Pictures paint before the first word. The model never generates a plate on
 * the turn path; it is told which original hunter still is already on screen
 * and must caption that frame.
 */
import { HERO_LOOK, PLATE_COPY, stillHeroState, stillScene, type ArtKey } from "@system/shared";

export { PLATE_COPY, PLATE_KEYS } from "@system/shared";
export type { ArtKey } from "@system/shared";

/**
 * Extra staging for the still generator. Narration uses `PLATE_COPY`; this is
 * only the camera note so a batch of PNGs stays on-model.
 */
export const PLATE_SCENES: Record<ArtKey, string> = {
  "awakening.office":
    "Low angle. Hunter on his back on an assessment-room floor looking up at a dead fluorescent ceiling grid, one tube buzzing. Clipboard light. Cramped.",
  "gate.carpark":
    "Three-quarter figure in an underground supermarket car park at night, facing a glowing blue oval gate two metres up. Cheap wrapped sword.",
  "gate.break":
    "City street at dusk, wet asphalt. A gate ruptures. Original insectile monsters spilling out. Hunter in the foreground, civilians running.",
  "dungeon.pillar":
    "Crouched beside a cracked wet-stone pillar. A giant original ant-monster just off-frame. Torchlight. Tight corridor.",
  "dungeon.safe":
    "Sitting against a dungeon wall in a clean side-chamber, one source of water-light, cheap sword across his knees. Catching his breath.",
  "dungeon.collapse":
    "Sprinting toward camera as a stone ceiling comes down behind him. Dust sheets, gravel, two mouths of corridor.",
  "dungeon.hunters":
    "Hunter in the foreground; a small original raid party behind him looking at him with contempt. Dungeon torchlight.",
  "dungeon.mine":
    "Crystal mine interior. Tired miners in cheap helmets. Hunter among them. A better-geared raid team watching who looks expendable.",
  "dungeon.core":
    "Kneeling over a huge original monster corpse, pulling a pulsing blue mana core from its chest. Cinematic, unsentimental.",
  "dungeon.boss":
    "Vast boss chamber. Hunter small. Towering original monster under a single shaft of light. Cheap sword too small.",
  "dungeon.instant":
    "Ordinary night alley. A private blue oval gate only he can see. Nobody else on the street notices it.",
  "dungeon.double":
    "A fork going deeper than the briefing. Second darker stair yawning under torchlight. Hunter hesitating at the lip.",
  "dungeon.betray":
    "Dungeon corridor. A smiling original party leader counts heads on his fingers and looks at the hunter like arithmetic.",
  "dungeon.prisoner":
    "Beside a shackled original raid labourer in cheap cuffs, both holding broken weapons. Association policy made visible.",
  "dungeon.spare":
    "Standing over a downed original human hunter, cheap sword raised, deciding whether to finish it. No gore gallery.",
  "dungeon.ally":
    "Next to an eager well-dressed original D-rank with too much new gear and a hopeful grin. Comic loyalty, not a traitor.",
  "dungeon.strike":
    "Mid-slash at a monster joint. Cheap wrapped sword catching a spark of mana. Dynamic webtoon action still.",
  "dungeon.hit":
    "Taking a hit. Body folding, cheap leather cracked, blood at the mouth, still on his feet. Cost, not a joke.",
  "hospital.stairwell":
    "Hospital stairwell landing. Painful push-ups in cheap clothes. Fluorescent cold. Family building, not a dungeon.",
  "hospital.sister":
    "Frozen mid push-up on a hospital stair. A teenage girl in a school coat, original, about to open the landing door.",
  "hospital.ward":
    "Sitting beside a hospital bed. An older original woman sleeps as if she will not wake. Warm lamp. Quiet.",
  "hospital.call":
    "Inside a dark dungeon answering a cracked phone. Glow on his face. No readable letters on the screen.",
  "penalty.legs":
    "Fighting a giant original centipede in a dark sandy penalty desert. Night sky with no stars.",
  "penalty.timer":
    "Alone in black sand under a huge empty sky. A cold blue geometric countdown hangs in the air — shapes, not digits.",
  "penalty.worse":
    "Surrounded by even larger original many-legged things. The sand is worse than last time. He looks smaller.",
  "temple.commandments":
    "Kneeling among colossal original stone knight statues in a dark commandment temple. Scale humiliation.",
  "temple.altar":
    "Before a black stone altar that wants a sacrifice. Other original hunters waiting behind him. Sadistic architecture.",
  "temple.watchers":
    "Walking a temple aisle. Colossal statues turning their heads the moment he looks away. Uncanny.",
  "system.shop":
    "Reaching toward floating original shop silhouettes in a void of wrong-blue light. Temptation.",
  "system.window":
    "Close on tired face. A sharp blue geometric System window hangs in the air. Brackets and panels, no readable text.",
  "surface.cafe":
    "Cheap cafe table. Across from a sharp-dressed original recruiter. Daylight. Contract face-down. Coffee going cold.",
  "surface.night":
    "Night street. Beside a tired original young woman in a healer's coat. Ordinary city, not a raid.",
  "surface.association":
    "Hunter Association office. A glowing mana meter pointed at his chest. Fluorescent. Paperwork stacks.",
  "surface.retest":
    "Formal Association hall. Mana meter reads nothing interesting. The room stares anyway. Social explosion about to happen.",
  "surface.inspector":
    "Across a desk from a polite original Association inspector who has noticed numbers that do not add up.",
  "surface.guildhall":
    "Polished guild lobby. A professional original fire-mage in a dark coat offering a contract folder. Status as a weapon.",
  "surface.tails":
    "Night alley. Glancing back. Original guild scouts in civilian clothes following him toward a hidden gate.",
  "surface.cameras":
    "Leaving a closed gate. News cameras and civilians crowding the street. He is trying not to be seen.",
  "redgate.snow":
    "Frozen forest. Facing a sealed red oval gate. Breath fogging. No door.",
  "ice.interior":
    "Inside a sealed red-gate forest. Red light dying behind snow-heavy pines. No way back.",
  "ice.camp":
    "Starving camp in deep snow. Two original hunter groups. One already turning away from the weak.",
  "ice.hunt":
    "Hunting through a blizzard. Original ice-wolf silhouettes in the white. Cheap coat frozen stiff.",
  "job.throne":
    "Small in the foreground. Looking up at a massive original armored knight before an empty throne.",
  "job.survive":
    "Backing across a dark arena. A geometric System timer hangs overhead. Scoring time lived, not kills.",
  "job.offer":
    "Staring at a cold class-offer window in a void. The implied class feels unclean. No readable text.",
  "shadow.arise":
    "Standing over a fresh original corpse as a black-violet shadow peels up from it, reaching toward him.",
  "shadow.fail":
    "Reaching toward a corpse that will not rise. Shadow collapsing back into ordinary dead meat.",
  "shadow.knight":
    "Facing a silent original armored knight-shadow kneeling after a kill, offering a discarded weapon.",
  "shadow.army":
    "Walking forward with a small original shadow army at his back. Late-game quiet competence. No smile.",
  "castle.stairs":
    "Vast original demonic castle stair. Climbing floor after floor. Lava light below.",
  "castle.crucible":
    "A cursed crucible on a high castle floor. Brewing a glowing draught meant for a family cure. Personal, not national.",
  "hive.tunnel":
    "Chitin hive tunnel. Original ant-soldiers packed in the walls. Torchlight on mandibles.",
  "healer.exit":
    "Holding a mana crystal. A young original healer walks away into ordinary night, leaving by choice.",
  "ending.death":
    "Fallen on dungeon stone, eyes half-open, cheap sword out of reach. Unsentimental.",
  "ending.victory":
    "Walking toward us as a blue gate collapses behind him. Quiet competence. No confetti, no smile.",
};

/**
 * Most specific first. A generated corridor must not keep the office plate
 * just because the run started there.
 */
const HINTS: readonly [RegExp, ArtKey][] = [
  [/\b(shop|vial|shortblade|unscheduled window|buy|purchase)\b/i, "system.shop"],
  [/\b(system window|blue window|status window)\b/i, "system.window"],
  [/\b(sister|school coat|landing door)\b/i, "hospital.sister"],
  [/\b(ward|hospital bed|mother|sleeps? as if|eternal)\b/i, "hospital.ward"],
  [/\b(phone|call her|sister's call)\b/i, "hospital.call"],
  [/\b(hospital|stairwell|push-?ups|daily quest|training)\b/i, "hospital.stairwell"],
  [/\b(worse|farming this|next visit)\b/i, "penalty.worse"],
  [/\b(countdown|penalty timer|transfer in)\b/i, "penalty.timer"],
  [/\b(centipede|penalty|too many legs)\b/i, "penalty.legs"],
  [/\b(altar|sacrifice)\b/i, "temple.altar"],
  [/\b(watcher|statues? turn|unwatched)\b/i, "temple.watchers"],
  [/\b(commandment|statue|temple|prove faith|bow)\b/i, "temple.commandments"],
  [/\b(survive|survival time|class points|timer hangs)\b/i, "job.survive"],
  [/\b(class offer|necromanc|unclean class)\b/i, "job.offer"],
  [/\b(throne|job change|empty throne)\b/i, "job.throne"],
  [/\b(extraction failed|will not rise|incompatible)\b/i, "shadow.fail"],
  [/\b(arise|extract|shadow peels|raise the (dead|corpse))\b/i, "shadow.arise"],
  [/\b(knight-shadow|kneeling knight|discarded weapon)\b/i, "shadow.knight"],
  [/\b(shadow army|monarch's domain|army at (his|your) back)\b/i, "shadow.army"],
  [/\b(healer walks|handing you a (mana )?crystal|ordinary night)\b/i, "healer.exit"],
  [/\b(healer|mana crystal)\b/i, "surface.night"],
  [/\b(recruiter|cafe|coffee|contract|page four)\b/i, "surface.cafe"],
  [/\b(retest|meter reads|double awakening)\b/i, "surface.retest"],
  [/\b(inspector|numbers that do not)\b/i, "surface.inspector"],
  [/\b(guild hall|guild lobby|fire-?mage|exclusive loot)\b/i, "surface.guildhall"],
  [/\b(tails|followed|scouts)\b/i, "surface.tails"],
  [/\b(camera|news|crowd|leak|filmed)\b/i, "surface.cameras"],
  [/\b(association|mana meter)\b/i, "surface.association"],
  [/\b(blizzard|ice-wolf|hunt through)\b/i, "ice.hunt"],
  [/\b(starving|snow camp|abandoning the weak)\b/i, "ice.camp"],
  [/\b(sealed|no way back|red light dying)\b/i, "ice.interior"],
  [/\b(red gate|snow|anomaly)\b/i, "redgate.snow"],
  [/\b(crucible|family cure|draught)\b/i, "castle.crucible"],
  [/\b(castle|floors?|lava stair|demon)\b/i, "castle.stairs"],
  [/\b(hive|nest|colony|chitin wall)\b/i, "hive.tunnel"],
  [/\b(mine|miners?|expendable|crystal vein)\b/i, "dungeon.mine"],
  [/\b(mana core|extract the core)\b/i, "dungeon.core"],
  [/\b(boss chamber|boss room|towering)\b/i, "dungeon.boss"],
  [/\b(private (gate|instance)|instant dungeon|nobody else can see)\b/i, "dungeon.instant"],
  [/\b(deeper|second stair|double dungeon|go deeper)\b/i, "dungeon.double"],
  [/\b(betray|counts heads|feed you to|arithmetic)\b/i, "dungeon.betray"],
  [/\b(prisoner|shackle|reduced sentence)\b/i, "dungeon.prisoner"],
  [/\b(spare|downed hunter|finish him|mercy)\b/i, "dungeon.spare"],
  [/\b(d-rank (friend|ally)|too much gear|be my tank)\b/i, "dungeon.ally"],
  [/\b(party|raid team|contempt)\b/i, "dungeon.hunters"],
  [/\b(collapse|ceiling|gravel|dust sheet)\b/i, "dungeon.collapse"],
  [/\b(takes a hit|blood at the mouth|folding)\b/i, "dungeon.hit"],
  [/\b(slash|strike|joint|mandible)\b/i, "dungeon.strike"],
  [/\b(dungeon break|spilling into the (city|street))\b/i, "gate.break"],
  [/\b(gate|tear|car ?park|hazard pay|bruise-coloured)\b/i, "gate.carpark"],
  [/\b(rest|breath|safe chamber|water-light)\b/i, "dungeon.safe"],
  [/\b(ant|chitin|pillar|corridor|torch|dungeon)\b/i, "dungeon.pillar"],
];

/** Keyword pass over the chosen action so a generated corridor is not painted as the office. */
export function artKeyFromAction(action: string, fallback: string): string {
  for (const [pattern, key] of HINTS) {
    if (pattern.test(action) && PLATE_COPY[key]) return key;
  }
  return fallback;
}

export function plateLine(artKey: string): string {
  const scene = stillScene(artKey);
  const sceneLine =
    PLATE_COPY[scene as ArtKey] ??
    "The same original E-rank hunter in a dark interior.";
  return `${sceneLine} ${HERO_LOOK[stillHeroState(artKey)]}`;
}

export function plateScene(artKey: string): string {
  const scene = stillScene(artKey);
  const staging =
    PLATE_SCENES[scene as ArtKey] ?? plateLine(scene);
  return `${HERO_LOOK[stillHeroState(artKey)]} Scene: ${staging}`;
}
