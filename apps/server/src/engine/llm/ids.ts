import { randomUUID } from "node:crypto";

/**
 * Choice ids must be unique per panel, not just per option, because the
 * speculative cache is keyed on them and a collision would serve a player the
 * narration for a choice they did not make.
 */
export function newChoiceId(): string {
  return `c_${randomUUID().slice(0, 12)}`;
}

export function newPanelId(): string {
  return `p_${randomUUID().slice(0, 12)}`;
}
