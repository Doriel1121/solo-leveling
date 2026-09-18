import { GoogleGenAI, Type } from "@google/genai";
import { env } from "../../env.js";
import type { GeneratedChoice } from "../types.js";
import { parseChoices } from "./choices.js";
import type { GenerationRequest, LLMProvider } from "./provider.js";

const choiceResponseSchema = {
  type: Type.OBJECT,
  properties: {
    choices: {
      type: Type.ARRAY,
      minItems: "3",
      maxItems: "4",
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          detail: { type: Type.STRING },
          risk: { type: Type.STRING, enum: ["safe", "moderate", "deadly"] },
          requires: {
            type: Type.OBJECT,
            properties: {
              mp: { type: Type.INTEGER },
              hp: { type: Type.INTEGER },
              level: { type: Type.INTEGER },
              strength: { type: Type.INTEGER },
              agility: { type: Type.INTEGER },
              item: { type: Type.STRING },
            },
          },
        },
        required: ["label", "risk"],
      },
    },
  },
  required: ["choices"],
};

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";
  private readonly client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async *streamNarration(request: GenerationRequest): AsyncIterable<string> {
    const stream = await this.client.models.generateContentStream({
      model: env.GEMINI_MODEL,
      contents: request.userPrompt,
      config: {
        systemInstruction: request.systemPrompt,
        temperature: 1.0,
        maxOutputTokens: 400,
        // Flash thinks by default; disabling it is what keeps a panel at ~1s.
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) yield text;
    }
  }

  async generateChoices(
    request: GenerationRequest,
  ): Promise<GeneratedChoice[]> {
    const response = await this.client.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: request.userPrompt,
      config: {
        systemInstruction: request.systemPrompt,
        temperature: 0.9,
        maxOutputTokens: 800,
        responseMimeType: "application/json",
        responseSchema: choiceResponseSchema,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const raw = response.text;
    if (!raw) throw new Error("Gemini returned no choice payload");
    return parseChoices(raw);
  }

  async generateStill(
    prompt: string,
  ): Promise<{ mime: string; bytes: Buffer } | null> {
    try {
      const response = await this.client.models.generateContent({
        model: env.GEMINI_IMAGE_MODEL,
        contents: prompt,
        config: {
          responseModalities: ["IMAGE", "TEXT"],
        },
      });
      const parts = response.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        const data = part.inlineData?.data;
        if (!data) continue;
        return {
          mime: part.inlineData?.mimeType || "image/png",
          bytes: Buffer.from(data, "base64"),
        };
      }
    } catch (error) {
      console.warn(`[llm] still generation failed: ${(error as Error).message}`);
    }
    return null;
  }
}
