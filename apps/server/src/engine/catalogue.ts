import type { StatDelta } from "@system/shared";

/**
 * System shop / story grants. These are the only items that exist: the System
 * materialises them, they change the numbers, and they are not a backpack.
 *
 * Generated panels never invent loot. A grant is stamped on an authored choice.
 */

export interface ItemReward {
  /** Inventory name if it persists; omitted when the item is consumed. */
  name: string | null;
  jobChange: boolean;
  deltas: StatDelta[];
  line: string;
  summary: string;
}

interface Recipe {
  name: string | null;
  jobChange?: boolean;
  line: string;
  summary: string;
  deltas: StatDelta[] | ((success: boolean) => StatDelta[]);
  consumeOnFail?: boolean;
}

const RECIPES: Record<string, Recipe> = {
  "notched shortblade": {
    name: "notched shortblade",
    line: "[ You have acquired: Notched Shortblade. ]",
    summary: "The System put a notched shortblade in the player's hand.",
    deltas: [
      { stat: "strength", value: 4 },
      { stat: "agility", value: 1 },
    ],
  },
  "cloudy vial": {
    name: null,
    line: "[ The vial is consumed. ]",
    summary: "The player drank an unlabelled System vial.",
    deltas: (success) =>
      success
        ? [
            { stat: "hp", value: 32 },
            { stat: "fatigue", value: -14 },
          ]
        : [{ stat: "hp", value: -8 }],
  },
  "warm mana crystal": {
    name: "warm mana crystal",
    line: "[ You have acquired: Mana Crystal. ]",
    summary: "A healer pressed a mana crystal into the player's palm and left.",
    deltas: [
      { stat: "mp", value: 18 },
      { stat: "fatigue", value: -10 },
    ],
  },
  "knight's compact": {
    name: "knight's compact",
    jobChange: true,
    line: "[ Class acquired. The knight has acknowledged you. ]",
    summary: "The player matched the knight and accepted a class.",
    deltas: [{ stat: "strength", value: 2 }],
  },
  "survivor's mark": {
    name: "survivor's mark",
    jobChange: true,
    line: "[ Class acquired. Survival time converted. ]",
    summary: "The player waited out the Job Change timer.",
    deltas: [{ stat: "agility", value: 2 }],
  },
  "unclean class": {
    name: "unclean class",
    jobChange: true,
    line: "[ Hidden class acquired. Extraction rights unlocked. ]",
    summary: "The player sat the throne and accepted an unclean class.",
    deltas: [
      { stat: "strength", value: 3 },
      { stat: "canonDivergence", value: 6 },
    ],
  },
};

export function rewardFor(
  grant: string | undefined,
  success: boolean,
): ItemReward | null {
  if (!grant) return null;
  const recipe = RECIPES[grant];
  if (!recipe) return null;
  const deltas =
    typeof recipe.deltas === "function" ? recipe.deltas(success) : recipe.deltas;
  const line =
    grant === "cloudy vial"
      ? success
        ? "[ The vial is consumed. Recovery in progress. ]"
        : "[ The vial is consumed. Contents were not a potion. ]"
      : recipe.line;
  return {
    name: recipe.name,
    jobChange: Boolean(recipe.jobChange),
    deltas,
    line,
    summary: recipe.summary,
  };
}
