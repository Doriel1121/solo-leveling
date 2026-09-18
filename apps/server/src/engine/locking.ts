import type { Choice, ChoiceRequirement, PlayerStats } from "@system/shared";
import { rankIndex } from "@system/shared";
import type { GeneratedChoice } from "./types.js";

/**
 * Locking is resolved server-side and shipped as a boolean plus a reason. The
 * client never evaluates requirements itself, so it cannot be coaxed into
 * submitting an option the player cannot afford.
 */
function lockReason(
  requires: ChoiceRequirement,
  stats: PlayerStats,
  inventory: Set<string>,
): string | null {
  if (requires.mp && stats.mp < requires.mp) {
    return `Requires ${requires.mp} MP — you have ${stats.mp}`;
  }
  if (requires.hp && stats.hp <= requires.hp) {
    return `Requires ${requires.hp} HP — too costly at ${stats.hp}`;
  }
  if (requires.level && stats.level < requires.level) {
    return `Requires level ${requires.level}`;
  }
  if (requires.strength && stats.strength < requires.strength) {
    return `Requires ${requires.strength} STR — you have ${stats.strength}`;
  }
  if (requires.agility && stats.agility < requires.agility) {
    return `Requires ${requires.agility} AGI — you have ${stats.agility}`;
  }
  if (requires.rank && rankIndex(stats.rank) < rankIndex(requires.rank)) {
    return `Requires ${requires.rank}-rank clearance`;
  }
  if (requires.item && !inventory.has(requires.item)) {
    return `Requires ${requires.item}`;
  }
  return null;
}

export function lockChoices(
  choices: GeneratedChoice[],
  stats: PlayerStats,
  inventory: string[],
): Choice[] {
  const owned = new Set(inventory);
  return choices.map((choice) => {
    const reason = lockReason(choice.requires, stats, owned);
    return {
      id: choice.id,
      label: choice.label,
      detail: choice.detail,
      requires: choice.requires,
      risk: choice.risk,
      locked: reason !== null,
      lockReason: reason ?? undefined,
      grant: choice.grant,
    };
  });
}

export function isAffordable(
  choice: GeneratedChoice,
  stats: PlayerStats,
  inventory: string[],
): boolean {
  return lockReason(choice.requires, stats, new Set(inventory)) === null;
}
