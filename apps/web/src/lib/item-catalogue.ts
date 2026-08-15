import {
  compareCodeUnits,
  itemCategoryLabel,
  type Item,
} from "@dredmorpedia/domain";

export const itemCataloguePageSize = 36;

const preferredCategoryOrder = [
  "weapon:sword",
  "weapon:axe",
  "weapon:mace",
  "weapon:staff",
  "weapon:crossbow",
  "weapon:thrown",
  "weapon:ammunition",
  "weapon:dagger",
  "weapon:polearm",
  "weapon",
  "armour:head",
  "armour:chest",
  "armour:legs",
  "armour:hands",
  "armour:feet",
  "armour:waist",
  "armour:shield",
  "armour:ring",
  "armour:neck",
  "armour:sleeve",
  "armour",
  "orb",
  "tome",
  "food",
  "booze",
  "potion",
  "mushroom",
  "trap",
  "wand",
  "toolkit",
  "gem",
  "reagent",
  "material",
  "item",
] as const;

const preferredOrderByCategory = new Map<string, number>(
  preferredCategoryOrder.map((category, index) => [category, index]),
);

export const itemCatalogueGroupOrder = [
  "Weapons",
  "Armour & equipment",
  "Food & drink",
  "Tools & devices",
  "Crafting materials",
  "Other",
] as const;

export type ItemCatalogueGroup = (typeof itemCatalogueGroupOrder)[number];

export interface ItemCatalogueCategory {
  key: string;
  segment: string;
  label: string;
  group: ItemCatalogueGroup;
  count: number;
  pageCount: number;
  representativeItemId: string;
}

export interface ItemCataloguePage {
  items: Item[];
  page: number;
  pageCount: number;
  total: number;
}

function categoryGroup(category: string): ItemCatalogueGroup {
  if (category === "weapon" || category.startsWith("weapon:")) {
    return "Weapons";
  }
  if (
    category === "armour" ||
    category.startsWith("armour:") ||
    category === "orb" ||
    category === "tome"
  ) {
    return "Armour & equipment";
  }
  if (["food", "booze", "potion", "mushroom"].includes(category)) {
    return "Food & drink";
  }
  if (["trap", "wand", "toolkit"].includes(category)) {
    return "Tools & devices";
  }
  if (["gem", "reagent", "material"].includes(category)) {
    return "Crafting materials";
  }
  return "Other";
}

function categorySegment(category: string): string {
  if (!/^[a-z0-9]+(?:[-:][a-z0-9]+)*$/.test(category)) {
    throw new Error(
      `Item category cannot be used in a static route: ${category}`,
    );
  }
  return category.replaceAll(":", "-");
}

function compareCategories(
  left: Pick<ItemCatalogueCategory, "key" | "label" | "group">,
  right: Pick<ItemCatalogueCategory, "key" | "label" | "group">,
): number {
  const groupDifference =
    itemCatalogueGroupOrder.indexOf(left.group) -
    itemCatalogueGroupOrder.indexOf(right.group);
  if (groupDifference !== 0) {
    return groupDifference;
  }
  const leftPreferred = preferredOrderByCategory.get(left.key);
  const rightPreferred = preferredOrderByCategory.get(right.key);
  if (leftPreferred !== undefined || rightPreferred !== undefined) {
    return (
      (leftPreferred ?? Number.MAX_SAFE_INTEGER) -
      (rightPreferred ?? Number.MAX_SAFE_INTEGER)
    );
  }
  return (
    compareCodeUnits(left.label, right.label) ||
    compareCodeUnits(left.key, right.key)
  );
}

export function createItemCatalogueCategories(
  items: readonly Item[],
): ItemCatalogueCategory[] {
  const itemsByCategory = new Map<string, Item[]>();
  for (const item of items) {
    const categoryItems = itemsByCategory.get(item.category) ?? [];
    categoryItems.push(item);
    itemsByCategory.set(item.category, categoryItems);
  }

  const segments = new Set<string>();
  const categories = [...itemsByCategory].map(([key, categoryItems]) => {
    const segment = categorySegment(key);
    if (segments.has(segment)) {
      throw new Error(`Multiple item categories resolve to route ${segment}.`);
    }
    segments.add(segment);
    const sortedItems = [...categoryItems].sort(
      (left, right) =>
        compareCodeUnits(left.name, right.name) ||
        compareCodeUnits(left.id, right.id),
    );
    return {
      key,
      segment,
      label: itemCategoryLabel(key),
      group: categoryGroup(key),
      count: sortedItems.length,
      pageCount: Math.max(
        1,
        Math.ceil(sortedItems.length / itemCataloguePageSize),
      ),
      representativeItemId: sortedItems[0]!.id,
    } satisfies ItemCatalogueCategory;
  });

  return categories.sort(compareCategories);
}

export function defaultItemCatalogueCategory(
  categories: readonly ItemCatalogueCategory[],
): ItemCatalogueCategory | undefined {
  return (
    categories.find((category) => category.key === "weapon:sword") ??
    categories[0]
  );
}

export function itemCatalogueCategoryForSegment(
  categories: readonly ItemCatalogueCategory[],
  segment: string,
): ItemCatalogueCategory | undefined {
  return categories.find((category) => category.segment === segment);
}

export function itemCatalogueCategoryPath(
  category: Pick<ItemCatalogueCategory, "segment">,
  page = 1,
): string {
  return `/items/category/${category.segment}/${page}`;
}

export function paginateItemCatalogue(
  items: readonly Item[],
  category: Pick<ItemCatalogueCategory, "key">,
  page: number,
): ItemCataloguePage | undefined {
  if (!Number.isSafeInteger(page) || page < 1) {
    return undefined;
  }
  const matchingItems = items
    .filter((item) => item.category === category.key)
    .sort(
      (left, right) =>
        compareCodeUnits(left.name, right.name) ||
        compareCodeUnits(left.id, right.id),
    );
  const pageCount = Math.max(
    1,
    Math.ceil(matchingItems.length / itemCataloguePageSize),
  );
  if (page > pageCount) {
    return undefined;
  }
  const start = (page - 1) * itemCataloguePageSize;
  return {
    items: matchingItems.slice(start, start + itemCataloguePageSize),
    page,
    pageCount,
    total: matchingItems.length,
  };
}
