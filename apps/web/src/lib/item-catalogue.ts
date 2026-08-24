import {
  compareCodeUnits,
  itemCategoryLabel,
  type Item,
  type SourceSummary,
} from "@dredmorpedia/domain";

import { createSourceOrderComparator } from "./source-order";

export const itemCataloguePageSize = 36;
export const itemCatalogueSorts = ["game", "name", "quality", "price"] as const;
export const itemCataloguePageSizes = [
  24,
  itemCataloguePageSize,
  "all",
] as const;

export type ItemCatalogueSort = (typeof itemCatalogueSorts)[number];
export type ItemCataloguePageSize = (typeof itemCataloguePageSizes)[number];

export interface ItemCatalogueView {
  sort: ItemCatalogueSort;
  pageSize: ItemCataloguePageSize;
}

export const defaultItemCatalogueView = {
  sort: "game",
  pageSize: itemCataloguePageSize,
} as const satisfies ItemCatalogueView;

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
  "macguffin",
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
  pageSize: ItemCataloguePageSize;
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

export function sortItemCatalogueItems(
  items: readonly Item[],
  sources: readonly Pick<SourceSummary, "id" | "precedence">[],
  sort: ItemCatalogueSort,
): Item[] {
  const gameOrder = createSourceOrderComparator<Item>(sources);
  return [...items].sort((left, right) => {
    switch (sort) {
      case "name":
        return (
          compareCodeUnits(left.name.toLowerCase(), right.name.toLowerCase()) ||
          compareCodeUnits(left.name, right.name) ||
          gameOrder(left, right)
        );
      case "quality":
        return left.quality - right.quality || gameOrder(left, right);
      case "price":
        return (
          (left.price === null ? 1 : 0) - (right.price === null ? 1 : 0) ||
          (left.price ?? 0) - (right.price ?? 0) ||
          gameOrder(left, right)
        );
      case "game":
        return gameOrder(left, right);
    }
  });
}

export function itemCataloguePageCount(
  itemCount: number,
  pageSize: ItemCataloguePageSize,
): number {
  return pageSize === "all" ? 1 : Math.max(1, Math.ceil(itemCount / pageSize));
}

export function createItemCatalogueCategories(
  items: readonly Item[],
  sources: readonly Pick<SourceSummary, "id" | "precedence">[] = [],
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
    const sortedItems = sortItemCatalogueItems(categoryItems, sources, "game");
    return {
      key,
      segment,
      label: itemCategoryLabel(key),
      group: categoryGroup(key),
      count: sortedItems.length,
      pageCount: itemCataloguePageCount(
        sortedItems.length,
        defaultItemCatalogueView.pageSize,
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

export function isItemCatalogueSort(value: string): value is ItemCatalogueSort {
  return itemCatalogueSorts.some((sort) => sort === value);
}

export function parseItemCataloguePageSize(
  value: string,
): ItemCataloguePageSize | undefined {
  if (value === "all") {
    return value;
  }
  const parsed = Number(value);
  return itemCataloguePageSizes.some((pageSize) => pageSize === parsed)
    ? (parsed as ItemCataloguePageSize)
    : undefined;
}

export function itemCatalogueCategoryPath(
  category: Pick<ItemCatalogueCategory, "segment">,
  page = 1,
  view: ItemCatalogueView = defaultItemCatalogueView,
): string {
  if (
    view.sort === defaultItemCatalogueView.sort &&
    view.pageSize === defaultItemCatalogueView.pageSize
  ) {
    return `/items/category/${category.segment}/${page}`;
  }
  return `/items/category/${category.segment}/view/${view.sort}/${view.pageSize}/${page}`;
}

export function paginateItemCatalogue(
  items: readonly Item[],
  category: Pick<ItemCatalogueCategory, "key">,
  page: number,
  options: {
    sources?: readonly Pick<SourceSummary, "id" | "precedence">[];
    sort?: ItemCatalogueSort;
    pageSize?: ItemCataloguePageSize;
  } = {},
): ItemCataloguePage | undefined {
  if (!Number.isSafeInteger(page) || page < 1) {
    return undefined;
  }
  const sort = options.sort ?? defaultItemCatalogueView.sort;
  const pageSize = options.pageSize ?? defaultItemCatalogueView.pageSize;
  const matchingItems = sortItemCatalogueItems(
    items.filter((item) => item.category === category.key),
    options.sources ?? [],
    sort,
  );
  const pageCount = itemCataloguePageCount(matchingItems.length, pageSize);
  if (page > pageCount) {
    return undefined;
  }
  const start = pageSize === "all" ? 0 : (page - 1) * pageSize;
  const end = pageSize === "all" ? matchingItems.length : start + pageSize;
  return {
    items: matchingItems.slice(start, end),
    page,
    pageCount,
    pageSize,
    total: matchingItems.length,
  };
}
