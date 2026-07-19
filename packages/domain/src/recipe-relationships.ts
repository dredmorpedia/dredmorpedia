import type { Recipe } from "./types";

export interface ItemRecipeRelationship {
  recipe: Recipe;
  inputAmount: number;
  outputAmount: number;
}

function referencedAmount(
  references: readonly Recipe["inputs"][number][],
  itemId: string,
): number {
  return references.reduce(
    (total, reference) =>
      reference.itemId === itemId ? total + reference.amount : total,
    0,
  );
}

export function itemRecipeRelationships(
  recipes: readonly Recipe[],
  itemId: string,
): ItemRecipeRelationship[] {
  return recipes
    .map((recipe) => ({
      recipe,
      inputAmount: referencedAmount(recipe.inputs, itemId),
      outputAmount: referencedAmount(recipe.outputs, itemId),
    }))
    .filter(
      (relationship) =>
        relationship.inputAmount > 0 || relationship.outputAmount > 0,
    )
    .sort(
      (left, right) =>
        left.recipe.canonicalKey.localeCompare(
          right.recipe.canonicalKey,
          "en",
        ) || left.recipe.id.localeCompare(right.recipe.id, "en"),
    );
}
