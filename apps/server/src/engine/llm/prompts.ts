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
}

const VOICE = `You are the narrator of an interactive webtoon-style dungeon RPG set in a modern world torn open by monster gates.
Write in second person, present tense. Terse, cinematic, grounded. Concrete sensory detail over adjectives.

A panel is a CAPTION and a BODY.
- CAPTION: at most 140 characters, one or two sentences. This sits on the artwork and carries the panel on its own.
- BODY: 20-45 words. Never exceed 60 words unless the scene is a temple of rules. It may be empty for a pure aura beat.

Prefer one image-able beat per panel ("mandibles open sideways") over three.
Never restate numbers the System already displayed. Never explain why something was impressive.
Never write the player's next decision for them, and never ask them a question.
No headings, no bullet points, no meta commentary, no emoji.`;

function statBlock(stats: PlayerStats): string {
  return [
    `HP ${stats.hp}/${stats.maxHp}`,
    `MP ${stats.mp}/${stats.maxMp}`,
    `Fatigue ${stats.fatigue}/100`,
    `Level ${stats.level} (${stats.xp}/${xpForNextLevel(stats.level)} XP)`,
    `Rank ${stats.rank}`,
    `STR ${stats.strength}`,
    `AGI ${stats.agility}`,
  ].join(" | ");
}

function historyBlock(history: ContextEntry[]): string {
  if (!history.length) return "This is the opening panel of the run.";
  return history
    .map((entry) => `${entry.step}. ${entry.action} -> ${entry.outcome}`)
    .join("\n");
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
    `On-screen still (${ctx.artKey ?? "unknown"}): ${ctx.plate ?? plateLine(ctx.artKey ?? "")}`,
    `Inventory: ${ctx.inventory.length ? ctx.inventory.join(", ") : "empty"}`,
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

  const register = [
    ctx.stats.level >= 4
      ? "The player has outgrown their fear. Write colder and shorter than you would have at level 1."
      : "",
    ctx.location === "hospital"
      ? "This is a family beat. One uncool sentence is allowed."
      : "",
    ctx.runType === "anomaly"
      ? "This run has been diverted off the well-trodden path. Do not fall back to a generic corridor."
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
    `${terminal}${register}`,
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
  return [
    "The situation the player is now in:",
    `"""${situation}"""`,
    ctx.plate
      ? `They are still looking at this still: ${ctx.plate} Next options must belong in that room.`
      : "",
    "",
    "Generate exactly 4 distinct actions the player could take next.",
    "Rules:",
    "- Each label is an imperative phrase of at most 8 words, with a concrete noun (knee joint, altar, page four), not 'use diplomacy'.",
    "- Each detail is at most 10 words of flavour, or the resource being spent.",
    "- Vary the risk levels; at least one must be 'safe' and at least one 'deadly'. The deadly option should look stylish. Aura can kill them.",
    "- Cover at least two of these axes: solo vs party; obey the System vs test it; hide the power vs leak it; mercy vs extraction; stylish-deadly vs boring-safe; family/debt vs the raid.",
    "- Requirements must be reachable in principle for a level " +
      `${ctx.stats.level} rank ${ctx.stats.rank} hunter.`,
    `- Exactly one option must require slightly more than the player currently has (MP above ${ctx.stats.mp}, or STR above ${ctx.stats.strength}, or AGI above ${ctx.stats.agility}). It will render as locked.`,
    "- The other three must be fully affordable right now.",
    "- Only reference items from this inventory: " +
      `${ctx.inventory.length ? ctx.inventory.join(", ") : "(empty — do not require any item)"}.`,
    ctx.stats.canonDivergence < 30
      ? "- Low divergence: favour solo, secrecy, family-first. Do not have the player volunteer the System to a guild."
      : "- High divergence: the player has already leaked or refused the usual path. Guilds, witnesses, and staying human are in play.",
  ].join("\n");
}

/** Feeds the keyword retriever; cheap to build, never shown to the player. */
export function retrievalQuery(ctx: PromptContext, action: string): string {
  return `${ctx.location} ${ctx.runType} ${action} rank ${ctx.stats.rank}`;
}
