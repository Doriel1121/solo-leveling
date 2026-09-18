import { CohereClientV2 } from "cohere-ai";
import { env } from "../../env.js";
import type { GeneratedChoice } from "../types.js";
import { CHOICE_JSON_HINT, parseChoices } from "./choices.js";
import type { GenerationRequest, LLMProvider } from "./provider.js";

function messages(request: GenerationRequest, extraUser?: string) {
  return [
    { role: "system" as const, content: request.systemPrompt },
    {
      role: "user" as const,
      content: extraUser ? `${request.userPrompt}\n\n${extraUser}` : request.userPrompt,
    },
  ];
}

function assistantText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && "text" in part) {
        return String((part as { text?: string }).text ?? "");
      }
      return "";
    })
    .join("");
}

/**
 * Command R family on a Cohere trial key. Story only — no stills.
 * Trial is free, ~20 chat req/min and 1,000 calls/month.
 */
export class CohereProvider implements LLMProvider {
  readonly name = "cohere";
  private readonly client: CohereClientV2;

  constructor(apiKey: string) {
    this.client = new CohereClientV2({ token: apiKey });
  }

  async *streamNarration(request: GenerationRequest): AsyncIterable<string> {
    const stream = await this.client.chatStream({
      model: env.COHERE_MODEL,
      messages: messages(request),
      temperature: 1,
      maxTokens: 400,
      safetyMode: "OFF",
    });

    for await (const event of stream) {
      if (event.type !== "content-delta") continue;
      const text = event.delta?.message?.content?.text;
      if (text) yield text;
    }
  }

  async generateChoices(
    request: GenerationRequest,
  ): Promise<GeneratedChoice[]> {
    const response = await this.client.chat({
      model: env.COHERE_MODEL,
      messages: messages(request, CHOICE_JSON_HINT),
      temperature: 0.9,
      maxTokens: 800,
      safetyMode: "OFF",
      responseFormat: { type: "json_object" },
    });

    const raw = assistantText(response.message?.content);
    if (!raw) throw new Error("Cohere returned no choice payload");
    return parseChoices(raw);
  }
}
