import type { GeneratedChoice } from "../types.js";
import { hashString, mulberry32, pick } from "../rng.js";
import type { GenerationRequest, LLMProvider } from "./provider.js";
import { newChoiceId } from "./ids.js";

/**
 * Offline stand-in for Gemini. It exists so the whole stack — streaming,
 * prefetch, locking, collision routing — can be run and load-tested without an
 * API key or spend. Latency is simulated on purpose: without it the
 * speculative-generation win is invisible in development.
 */
const FIRST_TOKEN_MS = 450;
const CHUNK_MS = 18;
const CHOICE_LATENCY_MS = 900;

const CAPTIONS = [
  "The air changes before anything else does.",
  "You move before you have finished deciding to.",
  "Somewhere below, the floor answers your weight.",
  "It happens faster than the briefing said it would.",
  "The cold arrives first, then the sound.",
  "Something in the dark revises its estimate of you.",
];

const BODIES = [
  "Dust hangs in the torchbeam, every mote of it drifting the wrong way. Your grip slips once on the wrap of the hilt, and you hate how loud that small sound is.",
  "The corridor narrows by a hand's width every ten paces, which is not how corridors work. You keep walking anyway, counting.",
  "A window opens at the edge of your vision and closes before you can read it. Then it is quiet, and quiet is worse.",
  "You are still standing. That is the whole of the good news, and you take it.",
  "Your hands have stopped shaking. You do not trust that either. Ahead, the dark goes on being dark.",
];

const CHOICE_POOL: Omit<GeneratedChoice, "id">[] = [
  { label: "Advance along the left wall", detail: "Keep one flank solid", requires: {}, risk: "safe" },
  { label: "Hold position and listen", detail: "Let it move first", requires: {}, risk: "safe" },
  { label: "Strike at the nearest joint", detail: "Commit to the opening", requires: {}, risk: "moderate" },
  { label: "Retreat to the last junction", detail: "Trade ground for time", requires: {}, risk: "safe" },
  { label: "Channel mana into your grip", detail: "Costs mana you may not have", requires: {}, risk: "moderate" },
  { label: "Douse the torch and wait", detail: "Give up sight for surprise", requires: {}, risk: "deadly" },
  { label: "Call out into the dark", detail: "Whatever answers, answers", requires: {}, risk: "deadly" },
  { label: "Search the bodies", detail: "Someone came here better equipped", requires: {}, risk: "moderate" },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Parses the live stats the prompt builder already embedded, so locked options land just out of reach. */
function readStat(prompt: string, pattern: RegExp, fallback: number): number {
  const match = prompt.match(pattern);
  return match?.[1] ? Number(match[1]) : fallback;
}

export class MockProvider implements LLMProvider {
  readonly name = "mock";

  async *streamNarration(request: GenerationRequest): AsyncIterable<string> {
    const rng = mulberry32(request.seed ^ hashString(request.userPrompt));
    // Same CAPTION/BODY contract the real prompt asks for, so the stream
    // splitter is exercised offline too.
    const prose = `CAPTION: ${pick(rng, CAPTIONS)}\nBODY: ${pick(rng, BODIES)}`;

    await sleep(FIRST_TOKEN_MS);
    for (let i = 0; i < prose.length; i += 6) {
      yield prose.slice(i, i + 6);
      await sleep(CHUNK_MS);
    }
  }

  async generateChoices(
    request: GenerationRequest,
  ): Promise<GeneratedChoice[]> {
    await sleep(CHOICE_LATENCY_MS);

    const rng = mulberry32(request.seed ^ hashString(request.userPrompt));
    const mp = readStat(request.systemPrompt, /MP (\d+)\//, 30);
    const strength = readStat(request.systemPrompt, /STR (\d+)/, 10);

    const shuffled = [...CHOICE_POOL].sort(() => rng() - 0.5).slice(0, 4);
    return shuffled.map((choice, index) => ({
      ...choice,
      id: newChoiceId(),
      // Mirror the real prompt's contract: exactly one option is unaffordable.
      requires:
        index === 3
          ? rng() > 0.5
            ? { mp: mp + 10 }
            : { strength: strength + 4 }
          : choice.requires,
    }));
  }
}
