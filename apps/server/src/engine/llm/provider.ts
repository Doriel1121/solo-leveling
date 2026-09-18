import type { GeneratedChoice } from "../types.js";

export interface GenerationRequest {
  systemPrompt: string;
  userPrompt: string;
  /** Deterministic runs (and the mock provider) key their randomness off this. */
  seed: number;
}

export interface LLMProvider {
  readonly name: string;
  /** Yields prose fragments as they arrive, so the client can type them out. */
  streamNarration(request: GenerationRequest): AsyncIterable<string>;
  /** Structured, schema-validated follow-up options. */
  generateChoices(request: GenerationRequest): Promise<GeneratedChoice[]>;
  /**
   * Optional. One original still at run end, when waiting is allowed.
   * Must never be called from the live turn path.
   */
  generateStill?(prompt: string): Promise<{ mime: string; bytes: Buffer } | null>;
}
