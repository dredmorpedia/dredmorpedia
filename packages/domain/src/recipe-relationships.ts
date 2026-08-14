import { compareCodeUnits } from "./ordering";
import type { Recipe, RecipeOutput } from "./types";

export interface ItemRecipeRelationship {
  recipe: Recipe;
  inputAmount: number;
  outputs: RecipeOutput[];
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
      outputs: recipe.outputs.filter((output) => output.itemId === itemId),
    }))
    .filter(
      (relationship) =>
        relationship.inputAmount > 0 || relationship.outputs.length > 0,
    )
    .sort(
      (left, right) =>
        compareCodeUnits(left.recipe.canonicalKey, right.recipe.canonicalKey) ||
        compareCodeUnits(left.recipe.id, right.recipe.id),
    );
}
