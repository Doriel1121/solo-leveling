import { z } from "zod";
import type { GeneratedChoice } from "../types.js";
import { newChoiceId } from "./ids.js";

// The model occasionally emits 0 for "no requirement"; strip those rather than
// letting a 0-cost requirement render as a real gate.
const requirementSchema = z
  .object({
    mp: z.number().int().positive().optional(),
    hp: z.number().int().positive().optional(),
    level: z.number().int().positive().optional(),
    strength: z.number().int().positive().optional(),
    agility: z.number().int().positive().optional(),
    item: z.string().min(1).optional(),
  })
  .partial()
  .default({});

export const choicesSchema = z.object({
  choices: z
    .array(
      z.object({
        label: z.string().min(1).max(80),
        detail: z.string().max(120).optional(),
        risk: z.enum(["safe", "moderate", "deadly"]),
        requires: requirementSchema,
      }),
    )
    .min(1)
    .max(4),
});

/** Shared JSON contract so Gemini and Cohere emit the same choice shape. */
export const CHOICE_JSON_HINT = [
  "Reply with JSON only, no markdown, in exactly this shape:",
  '{"choices":[{"label":"...","detail":"...","risk":"safe|moderate|deadly","requires":{}}]}',
].join(" ");

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("No JSON object in choice payload");
  }
}

export function parseChoices(raw: string): GeneratedChoice[] {
  const parsed = choicesSchema.parse(extractJsonObject(raw));
  return parsed.choices.map((choice) => ({
    id: newChoiceId(),
    label: choice.label,
    detail: choice.detail,
    requires: choice.requires ?? {},
    risk: choice.risk,
  }));
}
