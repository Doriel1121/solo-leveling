import { fallback, llm } from "./llm/index.js";
import type { GenerationRequest } from "./llm/provider.js";
import { newChoiceId } from "./llm/ids.js";
import type { GeneratedChoice } from "./types.js";

/**
 * A provider failure must degrade quality, never availability. Choices fall back
 * to the offline generator; prose falls back to a caption-only panel, which is
 * also a legitimate late-game look rather than an obvious error state.
 */
export async function generateChoices(
  request: GenerationRequest,
): Promise<GeneratedChoice[]> {
  try {
    const choices = await llm.generateChoices(request);
    if (choices.length) return choices;
  } catch (error) {
    console.warn(`[llm] choice generation failed: ${(error as Error).message}`);
  }
  return fallback.generateChoices(request);
}

export type ProseChunk =
  | { kind: "caption"; value: string }
  | { kind: "body"; value: string };

const BODY_MARKER = /\bBODY\s*:\s*/i;
const CAPTION_MARKER = /^\s*CAPTION\s*:\s*/i;
/** How much prose to buffer before concluding the model ignored the format. */
const SNIFF_LIMIT = 280;

function firstSentence(value: string): { head: string; rest: string } {
  const match = /^(.+?[.!?])(\s+|$)/s.exec(value.trim());
  if (!match) return { head: value.trim(), rest: "" };
  return {
    head: match[1]!.trim(),
    rest: value.trim().slice(match[0]!.length).trim(),
  };
}

/**
 * Splits the model's `CAPTION: … BODY: …` reply into two streams while it is
 * still arriving, so the caption can be painted onto the art immediately and
 * the body types in underneath.
 *
 * The format is a soft contract — models drift. If no BODY marker shows up, the
 * first sentence is promoted to the caption and the rest becomes the body.
 */
async function* splitProse(
  source: AsyncIterable<string>,
  fallbackCaption: string,
): AsyncGenerator<ProseChunk> {
  let buffer = "";
  let captionSent = false;
  // A chunk boundary can fall immediately after `BODY:`, leaving the marker's
  // trailing whitespace in the *next* chunk. Swallow it once.
  let bodyStarted = false;

  for await (const chunk of source) {
    if (captionSent) {
      const value = bodyStarted ? chunk : chunk.replace(/^\s+/, "");
      if (value) {
        bodyStarted = true;
        yield { kind: "body", value };
      }
      continue;
    }

    buffer += chunk;
    const marker = BODY_MARKER.exec(buffer);

    if (marker) {
      const head = buffer
        .slice(0, marker.index)
        .replace(CAPTION_MARKER, "")
        .trim();
      yield { kind: "caption", value: head || fallbackCaption };
      captionSent = true;

      const rest = buffer.slice(marker.index + marker[0].length).replace(/^\s+/, "");
      buffer = "";
      if (rest) {
        bodyStarted = true;
        yield { kind: "body", value: rest };
      }
      continue;
    }

    if (buffer.length > SNIFF_LIMIT) {
      const { head, rest } = firstSentence(buffer.replace(CAPTION_MARKER, ""));
      yield { kind: "caption", value: head || fallbackCaption };
      captionSent = true;
      buffer = "";
      if (rest) {
        bodyStarted = true;
        yield { kind: "body", value: rest };
      }
    }
  }

  if (!captionSent) {
    const { head, rest } = firstSentence(buffer.replace(CAPTION_MARKER, ""));
    yield { kind: "caption", value: head || fallbackCaption };
    if (rest) yield { kind: "body", value: rest };
  }
}

export async function* streamPanelProse(
  request: GenerationRequest,
  fallbackCaption: string,
): AsyncGenerator<ProseChunk> {
  let produced = false;

  async function* guarded(): AsyncIterable<string> {
    try {
      for await (const chunk of llm.streamNarration(request)) {
        if (chunk) produced = true;
        yield chunk;
      }
    } catch (error) {
      console.warn(`[llm] narration failed: ${(error as Error).message}`);
    }
  }

  for await (const chunk of splitProse(guarded(), fallbackCaption)) {
    yield chunk;
  }

  // splitProse always emits a caption, so a silent provider still yields a
  // usable caption-only panel; nothing further is needed here.
  void produced;
}

export interface PanelProse {
  caption: string;
  text: string;
}

/** Buffered variant used by the speculative prefetcher, which has no client to stream to. */
export async function collectPanelProse(
  request: GenerationRequest,
  fallbackCaption: string,
): Promise<PanelProse> {
  let caption = "";
  let text = "";
  for await (const chunk of streamPanelProse(request, fallbackCaption)) {
    if (chunk.kind === "caption") caption = chunk.value;
    else text += chunk.value;
  }
  return { caption: caption || fallbackCaption, text: text.trim() };
}

/** Static node options are stored without ids so each visit gets fresh, unique ones. */
export function withFreshIds(choices: GeneratedChoice[]): GeneratedChoice[] {
  return choices.map((choice) => ({ ...choice, id: newChoiceId() }));
}

/**
 * Splits already-known text for delta emission. Chunks are large and sent with
 * no artificial delay — the client owns the typewriter pacing so that a
 * prefetched panel is genuinely instant on the wire and still types out.
 */
export function* chunkText(text: string, size = 120): Generator<string> {
  for (let i = 0; i < text.length; i += size) {
    yield text.slice(i, i + size);
  }
}
