import {
  createCraftingPlanFromRequirements,
  type CraftingPlanItem,
  type CraftingPlanRecipe,
  type CraftingRequirementsPlan,
} from "./crafting-plan";
import { compareCodeUnits } from "./ordering";
import type { ItemReference } from "./types";

export interface EncrustmentPlanDefinition {
  id: string;
  canonicalKey: string;
  slug: string;
  name: string;
  inputs: ItemReference[];
}

export interface EncrustmentIngredientRequirement {
  item: CraftingPlanItem | null;
  itemKey: string;
  itemName: string;
  amountPerApplication: number;
  totalAmount: number;
}

export interface EncrustmentPlan extends CraftingRequirementsPlan {
  encrustment: EncrustmentPlanDefinition;
  applications: number;
  ingredientRequirements: EncrustmentIngredientRequirement[];
}

function compareIngredients(
  left: EncrustmentIngredientRequirement,
  right: EncrustmentIngredientRequirement,
): number {
  if (left.item && right.item) {
    return (
      compareCodeUnits(left.item.canonicalKey, right.item.canonicalKey) ||
      compareCodeUnits(left.item.id, right.item.id)
    );
  }
  if (left.item) {
    return -1;
  }
  if (right.item) {
    return 1;
  }
  return (
    compareCodeUnits(left.itemKey, right.itemKey) ||
    compareCodeUnits(left.itemName, right.itemName)
  );
}

export function createEncrustmentPlan(
  items: readonly CraftingPlanItem[],
  recipes: readonly CraftingPlanRecipe[],
  encrustment: EncrustmentPlanDefinition,
  applications: number,
  selections: ReadonlyMap<string, string> = new Map(),
): EncrustmentPlan {
  if (!Number.isInteger(applications) || applications < 1) {
    throw new Error("Encrustment applications must be a positive integer.");
  }

  const itemsById = new Map(items.map((item) => [item.id, item]));
  const ingredients = new Map<
    string,
    Omit<EncrustmentIngredientRequirement, "totalAmount">
  >();

  for (const input of encrustment.inputs) {
    const item = input.itemId ? (itemsById.get(input.itemId) ?? null) : null;
    const key = item
      ? `resolved:${item.id}`
      : `unresolved:${input.itemKey}\u001f${input.itemName}`;
    const existing = ingredients.get(key);
    if (existing) {
      existing.amountPerApplication += input.amount;
    } else {
      ingredients.set(key, {
        item,
        itemKey: input.itemKey,
        itemName: input.itemName,
        amountPerApplication: input.amount,
      });
    }
  }

  const ingredientRequirements = [...ingredients.values()]
    .map((ingredient) => ({
      ...ingredient,
      totalAmount: ingredient.amountPerApplication * applications,
    }))
    .sort(compareIngredients);
  const craftingPlan = createCraftingPlanFromRequirements(
    items,
    recipes,
    ingredientRequirements.flatMap((ingredient) =>
      ingredient.item
        ? [{ item: ingredient.item, amount: ingredient.totalAmount }]
        : [],
    ),
    selections,
  );
  const unresolved = new Map(
    craftingPlan.unresolvedRequirements.map((requirement) => [
      `${requirement.itemKey}\u001f${requirement.itemName}`,
      { ...requirement },
    ]),
  );
  for (const ingredient of ingredientRequirements) {
    if (ingredient.item) {
      continue;
    }
    const key = `${ingredient.itemKey}\u001f${ingredient.itemName}`;
    const existing = unresolved.get(key);
    if (existing) {
      existing.amount += ingredient.totalAmount;
    } else {
      unresolved.set(key, {
        itemKey: ingredient.itemKey,
        itemName: ingredient.itemName,
        amount: ingredient.totalAmount,
      });
    }
  }
  const unresolvedRequirements = [...unresolved.values()].sort(
    (left, right) =>
      compareCodeUnits(left.itemKey, right.itemKey) ||
      compareCodeUnits(left.itemName, right.itemName),
  );

  return {
    encrustment,
    applications,
    ...craftingPlan,
    complete: craftingPlan.complete && unresolvedRequirements.length === 0,
    unresolvedRequirements,
    ingredientRequirements,
  };
}
