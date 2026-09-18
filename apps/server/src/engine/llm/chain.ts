import type { GeneratedChoice } from "../types.js";
import type { GenerationRequest, LLMProvider } from "./provider.js";
import {
  LLM_BUDGET_MS,
  LLM_FIRST_BYTE_MS,
  withFirstByteTimeout,
  withTimeout,
} from "./timeout.js";

/**
 * Tries live providers in order. A silent, throwing, or hung call moves to the
 * next one; the mock is *not* in this list — generation.ts owns the last-resort
 * caption-only / mock-choice degradation.
 *
 * Mid-stream failure is not retried: the client already has partial prose.
 * The whole chain shares one wall-clock budget so a 45s hang cannot happen.
 */
export class FailoverProvider implements LLMProvider {
  readonly name: string;

  constructor(private readonly providers: LLMProvider[]) {
    if (!providers.length) {
      throw new Error("FailoverProvider needs at least one live provider");
    }
    this.name = providers.map((item) => item.name).join("+");
  }

  async *streamNarration(request: GenerationRequest): AsyncIterable<string> {
    const deadline = Date.now() + LLM_BUDGET_MS;
    for (let index = 0; index < this.providers.length; index += 1) {
      const remain = deadline - Date.now();
      if (remain < 400) break;
      const provider = this.providers[index]!;
      let produced = false;
      try {
        const firstByte = Math.min(LLM_FIRST_BYTE_MS, remain);
        for await (const chunk of withFirstByteTimeout(
          provider.streamNarration(request),
          firstByte,
          `${provider.name} narration`,
        )) {
          produced = true;
          yield chunk;
        }
        if (produced) return;
        console.warn(`[llm] ${provider.name} narration was empty`);
      } catch (error) {
        if (produced) throw error;
        console.warn(
          `[llm] ${provider.name} narration failed: ${(error as Error).message}`,
        );
      }
      const next = this.providers[index + 1];
      if (next) {
        console.info(`[llm] failing over narration to ${next.name}`);
      }
    }
  }

  async generateChoices(
    request: GenerationRequest,
  ): Promise<GeneratedChoice[]> {
    const deadline = Date.now() + LLM_BUDGET_MS;
    let lastError: unknown;
    for (let index = 0; index < this.providers.length; index += 1) {
      const remain = deadline - Date.now();
      if (remain < 400) break;
      const provider = this.providers[index]!;
      try {
        const choices = await withTimeout(
          provider.generateChoices(request),
          remain,
          `${provider.name} choices`,
        );
        if (choices.length) return choices;
        console.warn(`[llm] ${provider.name} returned no choices`);
      } catch (error) {
        lastError = error;
        console.warn(
          `[llm] ${provider.name} choices failed: ${(error as Error).message}`,
        );
      }
      const next = this.providers[index + 1];
      if (next) {
        console.info(`[llm] failing over choices to ${next.name}`);
      }
    }
    if (lastError) throw lastError;
    return [];
  }

  async generateStill(
    prompt: string,
  ): Promise<{ mime: string; bytes: Buffer } | null> {
    for (const provider of this.providers) {
      if (!provider.generateStill) continue;
      const still = await provider.generateStill(prompt);
      if (still) return still;
    }
    return null;
  }
}
