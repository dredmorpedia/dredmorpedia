import {
  compareCodeUnits,
  type Encrustment,
  type Item,
  type ItemEncrustmentRelationship,
  type ItemRecipeRelationship,
  type Recipe,
} from "@dredmorpedia/domain";

export interface ItemCatalogueRelationships {
  encrustments: ItemEncrustmentRelationship[];
  recipes: ItemRecipeRelationship[];
}

export interface UsedToCraftCatalogueRelation {
  item: Item;
  key: string;
  recipe: Recipe;
}

interface MutableItemCatalogueRelationships {
  encrustments: ItemEncrustmentRelationship[];
  recipes: ItemRecipeRelationship[];
}

function relationshipBucket(
  index: Map<string, MutableItemCatalogueRelationships>,
  itemId: string,
): MutableItemCatalogueRelationships {
  const existing = index.get(itemId);
  if (existing) {
    return existing;
  }
  const created = { encrustments: [], recipes: [] };
  index.set(itemId, created);
  return created;
}

export function createItemCatalogueRelationshipIndex({
  encrustments,
  recipes,
}: {
  encrustments: readonly Encrustment[];
  recipes: readonly Recipe[];
}): ReadonlyMap<string, ItemCatalogueRelationships> {
  const index = new Map<string, MutableItemCatalogueRelationships>();

  for (const recipe of recipes) {
    const inputAmounts = new Map<string, number>();
    for (const input of recipe.inputs) {
      if (input.itemId) {
        inputAmounts.set(
          input.itemId,
          (inputAmounts.get(input.itemId) ?? 0) + input.amount,
        );
      }
    }

    const outputsByItemId = new Map<
      string,
      ItemRecipeRelationship["outputs"]
    >();
    for (const output of recipe.outputs) {
      if (output.itemId) {
        const outputs = outputsByItemId.get(output.itemId) ?? [];
        outputs.push(output);
        outputsByItemId.set(output.itemId, outputs);
      }
    }

    for (const itemId of new Set([
      ...inputAmounts.keys(),
      ...outputsByItemId.keys(),
    ])) {
      relationshipBucket(index, itemId).recipes.push({
        inputAmount: inputAmounts.get(itemId) ?? 0,
        outputs: outputsByItemId.get(itemId) ?? [],
        recipe,
      });
    }
  }

  for (const encrustment of encrustments) {
    const inputAmounts = new Map<string, number>();
    for (const input of encrustment.inputs) {
      if (input.itemId) {
        inputAmounts.set(
          input.itemId,
          (inputAmounts.get(input.itemId) ?? 0) + input.amount,
        );
      }
    }
    for (const [itemId, inputAmount] of inputAmounts) {
      relationshipBucket(index, itemId).encrustments.push({
        encrustment,
        inputAmount,
      });
    }
  }

  for (const relationships of index.values()) {
    relationships.recipes.sort(
      (left, right) =>
        compareCodeUnits(left.recipe.canonicalKey, right.recipe.canonicalKey) ||
        compareCodeUnits(left.recipe.id, right.recipe.id),
    );
    relationships.encrustments.sort(
      (left, right) =>
        compareCodeUnits(
          left.encrustment.canonicalKey,
          right.encrustment.canonicalKey,
        ) || compareCodeUnits(left.encrustment.id, right.encrustment.id),
    );
  }

  return index;
}

export function usedToCraftCatalogueRelations({
  itemById,
  itemId,
  relationships,
}: {
  itemById: ReadonlyMap<string, Item>;
  itemId: string;
  relationships: readonly ItemRecipeRelationship[];
}): UsedToCraftCatalogueRelation[] {
  const relations = new Map<string, UsedToCraftCatalogueRelation>();
  for (const { inputAmount, recipe } of relationships) {
    if (inputAmount <= 0) {
      continue;
    }
    for (const output of recipe.outputs) {
      if (!output.itemId || output.itemId === itemId) {
        continue;
      }
      const outputItem = itemById.get(output.itemId);
      const key = `${recipe.id}:${output.itemId}`;
      if (outputItem && !relations.has(key)) {
        relations.set(key, { item: outputItem, key, recipe });
      }
    }
  }
  return [...relations.values()];
}
