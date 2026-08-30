import { describe, expect, it } from "vitest";

import type {
  CraftingOutputOption,
  CraftingPlanItem,
  CraftingPlanRecipe,
} from "@dredmorpedia/domain";

import { craftingChoiceLabel } from "../src/lib/crafting-choice-label";

const target: CraftingPlanItem = {
  id: "item:aqua vitae",
  canonicalKey: "aqua vitae",
  slug: "aqua-vitae",
  name: "Aqua Vitae",
};

function option(recipeId: string, ingredient: string): CraftingOutputOption {
  const recipe: CraftingPlanRecipe = {
    id: recipeId,
    canonicalKey: recipeId.slice("recipe:".length),
    slug: recipeId.slice("recipe:".length).replaceAll(" ", "-"),
    name: "Aqua Vitae Recipe",
    tool: "still",
    inputs: [
      {
        itemKey: ingredient.toLocaleLowerCase("en"),
        itemName: ingredient,
        amount: 1,
      },
    ],
    outputs: [
      {
        itemId: target.id,
        itemKey: target.canonicalKey,
        itemName: target.name,
        amount: 1,
        skillLevel: 1,
      },
    ],
  };
  return {
    key: `${recipe.id}#0`,
    recipe,
    output: recipe.outputs[0]!,
    outputIndex: 0,
  };
}

describe("crafting source-choice labels", () => {
  it("adds ingredient context only when otherwise identical choices collide", () => {
    const brandy = option("recipe:aqua vitae recipe", "Brandy");
    const slivovitz = option("recipe:aqua vitae recipe~slivovitz", "Slivovitz");

    expect(craftingChoiceLabel(brandy, [brandy, slivovitz])).toBe(
      "1 per craft at source skill 1 — Aqua Vitae Recipe · from Brandy",
    );
    expect(craftingChoiceLabel(slivovitz, [brandy, slivovitz])).toBe(
      "1 per craft at source skill 1 — Aqua Vitae Recipe · from Slivovitz",
    );
    expect(craftingChoiceLabel(brandy, [brandy])).toBe(
      "1 per craft at source skill 1 — Aqua Vitae Recipe",
    );
  });
});
