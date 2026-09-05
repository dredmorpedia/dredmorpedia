import type {
  Encrustment,
  Item,
  ItemReference,
  Recipe,
  RecipeOutput,
} from "@dredmorpedia/domain";

import { catalogueReferenceAccessibleLabel } from "./catalogue-reference-labels";
import { titleCase } from "./display-labels";
import { aggregateEncrustmentInputs } from "./encrustment-inputs";

function resolvedItemName(
  reference: ItemReference | RecipeOutput,
  itemsById: ReadonlyMap<string, Item>,
): string {
  return (
    (reference.itemId ? itemsById.get(reference.itemId)?.name : null) ??
    reference.itemName
  );
}

function recipeReferenceAccessibleLabel(
  reference: ItemReference | RecipeOutput,
  itemsById: ReadonlyMap<string, Item>,
): string {
  const item = catalogueReferenceAccessibleLabel({
    amount: reference.amount,
    itemName: resolvedItemName(reference, itemsById),
  });
  const level =
    "skillLevel" in reference && reference.skillLevel > 0
      ? ` at source level ${reference.skillLevel}`
      : "";
  return `${item}${level}`;
}

export function recipePreviewAccessibleName(
  recipe: Recipe,
  itemsById: ReadonlyMap<string, Item>,
): string {
  const inputs = recipe.inputs
    .map((reference) => recipeReferenceAccessibleLabel(reference, itemsById))
    .join(", ");
  const outputs = recipe.outputs
    .map((reference) => recipeReferenceAccessibleLabel(reference, itemsById))
    .join(", ");
  return `${recipe.name}: ${inputs || "no declared ingredients"} to ${outputs || "no declared outputs"}`;
}

export function encrustmentPreviewAccessibleName(
  encrustment: Encrustment,
  itemsById: ReadonlyMap<string, Item>,
): string {
  const inputs = aggregateEncrustmentInputs(encrustment.inputs)
    .map((reference) =>
      catalogueReferenceAccessibleLabel({
        amount: reference.amount,
        itemName: resolvedItemName(reference, itemsById),
      }),
    )
    .join(", ");
  const slots = encrustment.slots.map(titleCase).join(", ");
  return `${encrustment.name}: ${inputs || "no declared ingredients"}; applies to ${slots || "no declared slots"}`;
}
