import type { ContextEntry, PlayerStats, RunType } from "@system/shared";
import { xpForNextLevel } from "@system/shared";
import { lore } from "../lore.js";
import { plateLine } from "../plates.js";
import type { TurnOutcome } from "../types.js";

export interface PromptContext {
  stats: PlayerStats;
  inventory: string[];
  history: ContextEntry[];
  location: string;
  runType: RunType;
  /** Still already painted for this panel; the model must write to it. */
  artKey?: string;
  plate?: string;
  /** Shadow extraction is only in play after a Job Change. */
  jobChanged?: boolean;
}

const VOICE = `You are the narrator of an interactive webtoon-style dungeon RPG set in a modern world torn open by monster gates.
Write in second person, present tense. Terse, cinematic, grounded. Concrete sensory detail over adjectives.
All prose is original. Steal world physics and emotional pressure, never plot, names, or dialogue from any existing series.

A panel is a CAPTION and a BODY.
- CAPTION: at most 140 characters, one or two sentences. This sits on the artwork and carries the panel on its own.
- BODY: 20-45 words. Never exceed 60 words unless the scene is a temple of rules. It may be empty for a pure aura beat.

Prefer one image-able beat per panel ("mandibles open sideways") over three.
Prefer calculated risk — a joint, a timer, a clause, a commandment — over brute force.
Never restate numbers the System already displayed. Never explain why something was impressive.
Never write the player's next decision for them, and never ask them a question.
No headings, no bullet points, no meta commentary, no emoji.
Do not write a punchline of other hunters gasping at the player's power. Aura is silence, a kneel, smoke, a closed gate.`;

function statBlock(stats: PlayerStats): string {
  return [
    `HP ${stats.hp}/${stats.maxHp}`,
    `MP ${stats.mp}/${stats.maxMp}`,
    `Fatigue ${stats.fatigue}/100`,
    `Level ${stats.level} (${stats.xp}/${xpForNextLevel(stats.level)} XP)`,
    `Rank ${stats.rank}`,
    `STR ${stats.strength}`,
    `AGI ${stats.agility}`,
    `Divergence ${stats.canonDivergence}`,
  ].join(" | ");
}

function historyBlock(history: ContextEntry[]): string {
  if (!history.length) return "This is the opening panel of the run.";
  return history
    .map((entry) => `${entry.step}. ${entry.action} -> ${entry.outcome}`)
    .join("\n");
}

function openThreads(history: ContextEntry[]): string {
  if (!history.length) return "None yet. This is the first beat.";
  return history
    .slice(-4)
    .map((entry) => `${entry.action} (${entry.outcome})`)
    .join("; ");
}

type GlowPhase = "humiliation" | "secret" | "identity" | "public" | "monarch";

function glowPhase(ctx: PromptContext): GlowPhase {
  if (ctx.jobChanged && ctx.stats.level >= 8) return "monarch";
  if (ctx.jobChanged) return "identity";
  if (ctx.stats.level >= 5 || ctx.stats.rank !== "E") return "public";
  if (ctx.stats.level >= 3) return "secret";
  return "humiliation";
}

function phaseLine(ctx: PromptContext): string {
  switch (glowPhase(ctx)) {
    case "humiliation":
      return "PHASE: weakest hunter. Tight chest, hazard pay that will not cover a funeral, other hunters' contempt. Do not write competence you have not earned.";
    case "secret":
      return "PHASE: secret growth. The meter still says E. Hide the window. Lie with posture. Instant dungeons and dailies, not speeches.";
    case "identity":
      return "PHASE: Job Change. The class feels unclean. Extraction is power and a stain. Named shadows have personality; some corpses refuse.";
    case "public":
      return "PHASE: the lie is leaking. Guilds smell it. Association paperwork. Do not flatten named hunters into cheerleaders.";
    case "monarch":
      return "PHASE: quiet competence. Talk to the army. Other hunters may succeed off-screen. Arrival-fantasy is rare and costly.";
  }
}

/**
 * What this room is *for*. Stops the model defaulting every generated beat
 * to another corridor slash — the franchise's most-hated repetition.
 */
function sceneJob(ctx: PromptContext): string {
  const hay = `${ctx.location} ${ctx.artKey ?? ""} ${ctx.plate ?? ""}`.toLowerCase();
  if (/hospital|stairwell|ward|sister|push-?up|daily/.test(hay)) {
    return "SCENE JOB: family / daily quest. Humiliating training vs hide it from family vs eat the Penalty Zone. Not a dungeon slash.";
  }
  if (/penalty|centipede|too many legs/.test(hay)) {
    return "SCENE JOB: Penalty Zone. Survive a sealed timer among too many legs. Farming it makes the next visit worse. Status recovery is skipped.";
  }
  if (/temple|commandment|altar|statue|watcher|prove faith/.test(hay)) {
    return "SCENE JOB: rule-temple. Lethal misreads of commandments. Stay-behind vs flee. Statues move when unwatched. This is a puzzle, not a boss.";
  }
  if (/job|throne|survive|class offer|unclean/.test(hay)) {
    return "SCENE JOB: Job Change. Scored on time survived, not kills. Shop, potions, and level-heal are off. The offered class should feel unclean.";
  }
  if (/shadow|arise|extract|corpse|kneeling knight/.test(hay)) {
    return "SCENE JOB: extraction. Spare, kill, or raise. Some targets fail. Elites become companions, not loot.";
  }
  if (/redgate|red gate|ice|snow|blizzard|sealed/.test(hay) || ctx.runType === "anomaly") {
    return "SCENE JOB: Red Gate. Sealed. Weather, starvation, leadership vs solo. Other hunters may go feral. Exit only by clear, death, or break.";
  }
  if (/cafe|recruiter|contract|page four|guild/.test(hay)) {
    return "SCENE JOB: hunter industry. Contracts, loot clauses, being treated as a weapon. Coffee is a trap.";
  }
  if (/association|meter|retest|inspector/.test(hay)) {
    return "SCENE JOB: mana-meter politics. The Association can still read E. NPCs comment on smell, posture, a gate that closed too fast — never on a 'level'.";
  }
  if (/betray|counts heads|prisoner|shackle|spare|downed hunter/.test(hay)) {
    return "SCENE JOB: humans are the encounter. Party betrayal, expendable miners, prisoner labour. Mercy vs finishing it. An urgent System quest may demand a kill.";
  }
  if (/instant|private|alley/.test(hay)) {
    return "SCENE JOB: secret instance. Only the Player sees the door. Hide the growth.";
  }
  if (/castle|crucible|cure|floors?/.test(hay)) {
    return "SCENE JOB: personal vertical raid. Family cure vs a national crisis waiting outside.";
  }
  if (/hive|ant|chitin/.test(hay)) {
    return "SCENE JOB: hierarchy hunt. Coordinated monsters. Arrival-fantasy only if the player earned the late entrance; do not overuse it.";
  }
  if (/healer/.test(hay)) {
    return "SCENE JOB: healer with agency. They can refuse a gate, retire, hand back a stone. Do not forget them after one panel.";
  }
  if (/ally|d-rank/.test(hay)) {
    return "SCENE JOB: loyal weak ally. Optimistic, good at money, bad at killing. Never secretly evil.";
  }
  return "SCENE JOB: keep this room's rule. Change the rule of the next beat (timer, hostage, weather, clause), not only the monster.";
}

function lockedFantasy(ctx: PromptContext): string {
  const hay = `${ctx.location} ${ctx.artKey ?? ""}`.toLowerCase();
  if (/hospital|daily/.test(hay)) {
    return "Locked FOMO: Penalty Zone transfer, or finishing the daily before the landing door opens — not a stronger slash.";
  }
  if (/temple|altar/.test(hay)) {
    return "Locked FOMO: stay on the altar / prove faith — a lethal stylish read of the commandment.";
  }
  if (/job|throne/.test(hay)) {
    return "Locked FOMO: survive longer for a higher class, or accept the unclean job.";
  }
  if (ctx.jobChanged && /corpse|shadow|spare|boss|core/.test(hay)) {
    return "Locked FOMO: extract the shadow. It can fail if the target is stronger or the mana is wrong.";
  }
  if (/association|meter|retest/.test(hay)) {
    return "Locked FOMO: walk into a formal retest while the meter still says E.";
  }
  if (/redgate|ice|anomaly/.test(hay) || ctx.runType === "anomaly") {
    return "Locked FOMO: hunt the sealed-gate boss alone while the weak group waits.";
  }
  if (!ctx.jobChanged && ctx.stats.level >= 3) {
    return "Locked FOMO: a Job Change survive-timer, not a random STR gate.";
  }
  return "Locked FOMO: the next power of THIS arc (daily, altar, job, extract, retest), never 'slash harder'.";
}

function registerLines(ctx: PromptContext): string[] {
  const lines = [phaseLine(ctx), sceneJob(ctx)];
  if (ctx.location === "hospital" || (ctx.artKey ?? "").startsWith("hospital.")) {
    lines.push("This is a family beat. One uncool sentence is allowed.");
  }
  if (ctx.runType === "anomaly") {
    lines.push("Diverted off the well-trodden path. Do not fall back to a generic corridor.");
  }
  if (!ctx.jobChanged) {
    lines.push("Job Change has not happened. Do not write Arise, extraction, or a shadow army.");
  }
  return lines;
}

/**
 * The mechanical "now" handed to choice generation, which runs in parallel
 * with prose and cannot wait for the caption.
 */
export function describeSituation(
  ctx: PromptContext,
  beat?: { action: string; summary: string },
): string {
  const lines = [
    `NOW: ${ctx.location} | ${ctx.plate ?? plateLine(ctx.artKey ?? "")}`,
    phaseLine(ctx),
    sceneJob(ctx),
    `OPEN THREADS: ${openThreads(ctx.history)}`,
  ];
  if (beat) {
    lines.unshift(`JUST HAPPENED: "${beat.action}" -> ${beat.summary}`);
  }
  if (ctx.jobChanged) {
    lines.push("Job Change is done. Extraction, named shadows, and unclean-class identity are in play.");
  }
  return lines.join("\n");
}

/**
 * The system instruction carries the retrieved lore and the live stats, so the
 * model physically cannot offer an option the character could not attempt.
 */
export function buildSystemPrompt(
  ctx: PromptContext,
  retrievalQuery: string,
): string {
  const chunks = lore.retrieve(retrievalQuery, 4);
  return [
    VOICE,
    "",
    "## World rules (authoritative — never contradict these)",
    ...chunks.map((chunk) => `### ${chunk.topic}\n${chunk.text}`),
    "",
    "## Hard constraints",
    ...lore.invariants().map((rule) => `- ${rule}`),
    "",
    "## Player state (authoritative — never contradict these numbers)",
    statBlock(ctx.stats),
    `Location: ${ctx.location}`,
    `Run type: ${ctx.runType}`,
    `Job Change: ${ctx.jobChanged ? "complete — extraction is available and can fail" : "not yet"}`,
    `On-screen still (${ctx.artKey ?? "unknown"}): ${ctx.plate ?? plateLine(ctx.artKey ?? "")}`,
    `Inventory: ${ctx.inventory.length ? ctx.inventory.join(", ") : "empty"}`,
    "",
    "## Live scene",
    ...registerLines(ctx),
    "",
    "## Recent events (oldest first)",
    historyBlock(ctx.history),
  ].join("\n");
}

/**
 * The engine has already decided what happened. The model only dramatises it,
 * which is why the mechanical summary is marked as non-negotiable.
 */
export function buildNarrationPrompt(
  action: string,
  outcome: TurnOutcome,
  ctx: PromptContext,
): string {
  const deltas = outcome.deltas.length
    ? outcome.deltas
        .map((d) => `${d.stat} ${d.value >= 0 ? "+" : ""}${d.value}`)
        .join(", ")
    : "no stat change";

  const terminal =
    outcome.terminal === "death"
      ? "\nThis panel ends with the player's death. Make it final and unsentimental. Do not offer hope."
      : outcome.terminal === "victory"
        ? "\nThis panel is the run's victory. Let it land quietly rather than triumphantly."
        : "";

  const extra = [
    outcome.success
      ? "If this was stylish, let the room flinch. Do not explain the cool."
      : "The stylish read failed or cost blood. Do not rescue it with a last-second win.",
    outcome.leveledUp
      ? "Power just spiked. Write colder and shorter. Warmth is spent until a family/loyalty beat buys it back."
      : "",
    outcome.jobChanged
      ? "The class offer or extraction just landed. It should feel unclean, not celebratory."
      : "",
  ]
    .filter(Boolean)
    .map((line) => `\n${line}`)
    .join("");

  return [
    `The player chose: "${action}"`,
    "",
    "What happened (ground truth — your prose must match this exactly):",
    `- ${outcome.summary}`,
    `- Outcome: ${outcome.success ? "success" : "failure"} (roll ${outcome.roll} vs difficulty ${outcome.difficulty})`,
    `- Stat changes already applied: ${deltas} (do not mention these numbers)`,
    `${terminal}${extra}`,
    "",
    ...registerLines(ctx).map((line) => line),
    "",
    "The still is already on screen. Write the CAPTION and BODY as if they are shot against this picture — same hunter, same room. Do not teleport the scene:",
    ctx.plate ?? plateLine(ctx.artKey ?? ""),
    "",
    "Reply in exactly this format, with no other text:",
    "CAPTION: <at most 140 characters>",
    "BODY: <20-45 words>",
  ].join("\n");
}

/**
 * Runs in parallel with narration streaming, so it is given the mechanical
 * situation rather than the prose — the prose does not exist yet. One option is
 * deliberately out of reach so the client can render it locked and hint at
 * unexplored depth.
 */
export function buildChoicesPrompt(
  situation: string,
  ctx: PromptContext,
): string {
  const nouns = ctx.plate ?? plateLine(ctx.artKey ?? "");
  return [
    "The situation the player is now in:",
    `"""${situation}"""`,
    `They are still looking at this still: ${nouns}`,
    "Next options must belong in that room. Pull concrete nouns from the still and from JUST HAPPENED (altar, meter, landing door, page four, timer, corpse, ice, recruiter). If a noun is not in this room, do not put it on a button.",
    "",
    "Generate exactly 4 distinct actions the player could take next.",
    "The four options are four different *uses of this room*, not four flavours of slash:",
    "1. Continue the immediate object in the still (the altar, the timer, the clause, the sister's door, the meter, the corpse).",
    "2. Social: solo vs party, hide vs leak, family vs raid — but only if those people are actually here.",
    "3. Test a rule of THIS place (obey the System vs poke it; misread a commandment; ignore a daily timer; lie to a meter).",
    `4. Stylish-deadly, OR the locked FOMO. ${lockedFantasy(ctx)}`,
    "",
    "Rules:",
    "- Each label is an imperative phrase of at most 8 words, with a concrete noun, not 'use diplomacy'.",
    "- Each detail is at most 10 words of flavour, or the resource being spent.",
    "- Vary the risk levels; at least one must be 'safe' and at least one 'deadly'. The deadly option should look stylish. Aura can kill them.",
    "- Cover at least two of these axes: solo vs party; obey the System vs test it; hide the power vs leak it; mercy vs extraction; stylish-deadly vs boring-safe; family/debt vs the raid.",
    "- Requirements must be reachable in principle for a level " +
      `${ctx.stats.level} rank ${ctx.stats.rank} hunter.`,
    `- Exactly one option must require slightly more than the player currently has (MP above ${ctx.stats.mp}, or STR above ${ctx.stats.strength}, or AGI above ${ctx.stats.agility}). It will render as locked.`,
    "- The other three must be fully affordable right now.",
    "- Only reference items from this inventory: " +
      `${ctx.inventory.length ? ctx.inventory.join(", ") : "(empty — do not require any item)"}.`,
    "- Banned labels: look around, keep walking, strike again, attack the monster, wait, rest, check stats, open inventory, continue, use diplomacy.",
    ctx.jobChanged
      ? "- Job Change is done. If a corpse or downed hunter is in this room, one option must be spare / finish / extract, and extraction may be the locked one."
      : "- Job Change has not happened. Do not offer Arise, extract, raise, or command shadows.",
    ctx.stats.canonDivergence < 30
      ? "- Low divergence: favour solo, secrecy, family-first. Do not have the player volunteer the System to a guild."
      : "- High divergence: the player has already leaked or refused the usual path. Guilds, witnesses, and staying human are in play. Let them refuse the monarch fantasy.",
  ].join("\n");
}

/** Feeds the keyword retriever; cheap to build, never shown to the player. */
export function retrievalQuery(ctx: PromptContext, action: string): string {
  const recent = ctx.history
    .slice(-3)
    .map((entry) => `${entry.action} ${entry.outcome}`)
    .join(" ");
  return [
    ctx.location,
    ctx.runType,
    ctx.artKey ?? "",
    action,
    recent,
    ctx.jobChanged ? "job change shadow extract" : "daily quest system window",
  ]
    .filter(Boolean)
    .join(" ");
}
