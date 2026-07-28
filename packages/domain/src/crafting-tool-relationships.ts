import { canonicalKey } from "./identity";
import type { Encrustment, Item, ItemToolkitMetadata, Recipe } from "./types";

export interface ToolkitItemRelationship {
  item: Item;
  declaration: ItemToolkitMetadata;
  declarationIndex: number;
}

function toolkitTagKeys(item: Item): Set<string> {
  return new Set(
    item.toolkitDeclarations.flatMap((declaration) =>
      declaration.tag === null ? [] : [canonicalKey(declaration.tag)],
    ),
  );
}

export function itemToolkitRecipeRelationships(
  recipes: readonly Recipe[],
  item: Item,
): Recipe[] {
  const tags = toolkitTagKeys(item);
  return recipes
    .filter((recipe) => tags.has(canonicalKey(recipe.tool)))
    .sort(
      (left, right) =>
        left.canonicalKey.localeCompare(right.canonicalKey, "en") ||
        left.id.localeCompare(right.id, "en"),
    );
}

export function itemToolkitEncrustmentRelationships(
  encrustments: readonly Encrustment[],
  item: Item,
): Encrustment[] {
  const tags = toolkitTagKeys(item);
  return encrustments
    .filter((encrustment) => tags.has(canonicalKey(encrustment.tool)))
    .sort(
      (left, right) =>
        left.canonicalKey.localeCompare(right.canonicalKey, "en") ||
        left.id.localeCompare(right.id, "en"),
    );
}

export function toolkitItemsForTag(
  items: readonly Item[],
  toolTag: string,
): ToolkitItemRelationship[] {
  const tagKey = canonicalKey(toolTag);
  return items
    .flatMap((item) => {
      const declarationIndex = item.toolkitDeclarations.findIndex(
        (declaration) =>
          declaration.tag !== null && canonicalKey(declaration.tag) === tagKey,
      );
      const declaration = item.toolkitDeclarations[declarationIndex];
      return declarationIndex < 0 || declaration === undefined
        ? []
        : [{ item, declaration, declarationIndex }];
    })
    .sort(
      (left, right) =>
        left.item.canonicalKey.localeCompare(right.item.canonicalKey, "en") ||
        left.item.id.localeCompare(right.item.id, "en") ||
        left.declarationIndex - right.declarationIndex,
    );
}
