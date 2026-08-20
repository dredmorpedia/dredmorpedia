import {
  canonicalKey,
  compareCodeUnits,
  slugify,
  toolkitItemsForTag,
  type Item,
  type Recipe,
  type SourceSummary,
} from "@dredmorpedia/domain";

import { titleCase } from "./display-labels";
import { createSourceOrderComparator } from "./source-order";

export const craftingToolOrder = [
  "lathe",
  "grinder",
  "alchemy",
  "still",
  "ingot",
  "smithing",
  "tinkerer",
] as const;

export const craftCataloguePageSize = 36;
export const craftCatalogueSorts = ["game", "name", "skill"] as const;
export const craftCataloguePageSizes = [
  24,
  craftCataloguePageSize,
  "all",
] as const;

export type CraftCatalogueSort = (typeof craftCatalogueSorts)[number];
export type CraftCataloguePageSize = (typeof craftCataloguePageSizes)[number];

export interface CraftCatalogueView {
  sort: CraftCatalogueSort;
  pageSize: CraftCataloguePageSize;
}

export const defaultCraftCatalogueView = {
  sort: "game",
  pageSize: craftCataloguePageSize,
} as const satisfies CraftCatalogueView;

const craftingToolOrderIndex = new Map<string, number>(
  craftingToolOrder.map((tool, index) => [tool, index]),
);

export interface CraftCatalogueTool {
  count: number;
  label: string;
  pageCount: number;
  representativeItemId: string | null;
  segment: string;
  tag: string;
}

export interface CraftCataloguePage {
  page: number;
  pageCount: number;
  pageSize: CraftCataloguePageSize;
  recipes: Recipe[];
  total: number;
}

function compareCraftingTools(
  left: Pick<CraftCatalogueTool, "label" | "tag">,
  right: Pick<CraftCatalogueTool, "label" | "tag">,
): number {
  const leftOrder = craftingToolOrderIndex.get(left.tag);
  const rightOrder = craftingToolOrderIndex.get(right.tag);
  if (leftOrder !== undefined || rightOrder !== undefined) {
    return (
      (leftOrder ?? Number.MAX_SAFE_INTEGER) -
      (rightOrder ?? Number.MAX_SAFE_INTEGER)
    );
  }
  return (
    compareCodeUnits(left.label, right.label) ||
    compareCodeUnits(left.tag, right.tag)
  );
}

export function createCraftCatalogueTools(
  recipes: readonly Recipe[],
  items: readonly Item[],
): CraftCatalogueTool[] {
  const recipeCountByTool = new Map<string, number>();
  for (const recipe of recipes) {
    const tag = canonicalKey(recipe.tool);
    recipeCountByTool.set(tag, (recipeCountByTool.get(tag) ?? 0) + 1);
  }

  const segments = new Set<string>();
  const tools = [...recipeCountByTool].map(([tag, count]) => {
    const segment = slugify(tag);
    if (!segment || segments.has(segment)) {
      throw new Error(
        `Multiple crafting tools resolve to the static route ${segment || "(empty)"}.`,
      );
    }
    segments.add(segment);
    const toolkit = toolkitItemsForTag(items, tag)[0]?.item;
    return {
      count,
      label: toolkit?.name ?? titleCase(tag),
      pageCount: craftCataloguePageCount(
        count,
        defaultCraftCatalogueView.pageSize,
      ),
      representativeItemId: toolkit?.id ?? null,
      segment,
      tag,
    } satisfies CraftCatalogueTool;
  });

  return tools.sort(compareCraftingTools);
}

export function defaultCraftCatalogueTool(
  tools: readonly CraftCatalogueTool[],
): CraftCatalogueTool | undefined {
  return tools[0];
}

export function craftCatalogueToolForSegment(
  tools: readonly CraftCatalogueTool[],
  segment: string,
): CraftCatalogueTool | undefined {
  return tools.find((tool) => tool.segment === segment);
}

export function craftCatalogueToolPath(
  tool: Pick<CraftCatalogueTool, "segment">,
  page = 1,
  view: CraftCatalogueView = defaultCraftCatalogueView,
): string {
  const base = `/crafts/tool/${tool.segment}`;
  if (
    view.sort === defaultCraftCatalogueView.sort &&
    view.pageSize === defaultCraftCatalogueView.pageSize
  ) {
    return page === 1
      ? base
      : `${base}/view/${view.sort}/${view.pageSize}/${page}`;
  }
  return `${base}/view/${view.sort}/${view.pageSize}/${page}`;
}

export function craftCatalogueToolPathForTag(tag: string): string {
  return craftCatalogueToolPath({ segment: slugify(canonicalKey(tag)) });
}

export function isCraftCatalogueSort(
  value: string,
): value is CraftCatalogueSort {
  return craftCatalogueSorts.some((sort) => sort === value);
}

export function parseCraftCataloguePageSize(
  value: string,
): CraftCataloguePageSize | undefined {
  if (value === "all") {
    return value;
  }
  const parsed = Number(value);
  return craftCataloguePageSizes.some((pageSize) => pageSize === parsed)
    ? (parsed as CraftCataloguePageSize)
    : undefined;
}

export function craftCataloguePageCount(
  recipeCount: number,
  pageSize: CraftCataloguePageSize,
): number {
  return pageSize === "all"
    ? 1
    : Math.max(1, Math.ceil(recipeCount / pageSize));
}

export function lowestRecipeSourceLevel(recipe: Recipe): number {
  return recipe.outputs.length === 0
    ? Number.MAX_SAFE_INTEGER
    : Math.min(...recipe.outputs.map((output) => output.skillLevel));
}

export function sortCraftCatalogueRecipes(
  recipes: readonly Recipe[],
  sources: readonly Pick<SourceSummary, "id" | "precedence">[],
  sort: CraftCatalogueSort,
): Recipe[] {
  const gameOrder = createSourceOrderComparator<Recipe>(sources);
  return [...recipes].sort((left, right) => {
    switch (sort) {
      case "name":
        return (
          compareCodeUnits(left.name.toLowerCase(), right.name.toLowerCase()) ||
          compareCodeUnits(left.name, right.name) ||
          gameOrder(left, right)
        );
      case "skill":
        return (
          lowestRecipeSourceLevel(left) - lowestRecipeSourceLevel(right) ||
          gameOrder(left, right)
        );
      case "game":
        return gameOrder(left, right);
    }
  });
}

export function recipesForCraftCatalogueTool(
  recipes: readonly Recipe[],
  tool: Pick<CraftCatalogueTool, "tag">,
  sources: readonly Pick<SourceSummary, "id" | "precedence">[],
  sort: CraftCatalogueSort = defaultCraftCatalogueView.sort,
): Recipe[] {
  return sortCraftCatalogueRecipes(
    recipes.filter((recipe) => canonicalKey(recipe.tool) === tool.tag),
    sources,
    sort,
  );
}

export function paginateCraftCatalogue(
  recipes: readonly Recipe[],
  tool: Pick<CraftCatalogueTool, "tag">,
  page: number,
  options: {
    pageSize?: CraftCataloguePageSize;
    sort?: CraftCatalogueSort;
    sources?: readonly Pick<SourceSummary, "id" | "precedence">[];
  } = {},
): CraftCataloguePage | undefined {
  if (!Number.isSafeInteger(page) || page < 1) {
    return undefined;
  }
  const pageSize = options.pageSize ?? defaultCraftCatalogueView.pageSize;
  const matchingRecipes = recipesForCraftCatalogueTool(
    recipes,
    tool,
    options.sources ?? [],
    options.sort,
  );
  const pageCount = craftCataloguePageCount(matchingRecipes.length, pageSize);
  if (page > pageCount) {
    return undefined;
  }
  const start = pageSize === "all" ? 0 : (page - 1) * pageSize;
  const end = pageSize === "all" ? matchingRecipes.length : start + pageSize;
  return {
    page,
    pageCount,
    pageSize,
    recipes: matchingRecipes.slice(start, end),
    total: matchingRecipes.length,
  };
}
