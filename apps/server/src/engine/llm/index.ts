import { env, liveProviderChain } from "../../env.js";
import { FailoverProvider } from "./chain.js";
import { CohereProvider } from "./cohere.js";
import { GeminiProvider } from "./gemini.js";
import { MockProvider } from "./mock.js";
import type { LLMProvider } from "./provider.js";

function createLive(): LLMProvider[] {
  return liveProviderChain().map((name) => {
    if (name === "gemini") return new GeminiProvider(env.GEMINI_API_KEY!);
    return new CohereProvider(env.COHERE_API_KEY!);
  });
}

function create(): LLMProvider {
  const live = createLive();
  if (live.length === 0) return new MockProvider();
  // FailoverProvider owns the hang budget even for a single live model.
  return new FailoverProvider(live);
}

export const llm: LLMProvider = create();

/**
 * A model call that fails must never take the run with it. Narration falls back
 * to the engine's own mechanical summary and choices fall back to the mock
 * provider, so a provider outage degrades quality rather than availability.
 */
export const fallback: LLMProvider = new MockProvider();

export type { LLMProvider, GenerationRequest } from "./provider.js";
