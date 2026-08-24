import {
  canonicalKey,
  compareCodeUnits,
  slugify,
  toolkitItemsForTag,
  type Encrustment,
  type Item,
  type SourceSummary,
} from "@dredmorpedia/domain";

import { craftingToolOrder } from "./craft-catalogue";
import { titleCase } from "./display-labels";
import { createSourceOrderComparator } from "./source-order";

export const encrustCatalogueSorts = [
  "game",
  "name",
  "skill",
  "instability",
] as const;
export const encrustCataloguePageSizes = [12, 24, "all"] as const;

export type EncrustCatalogueSort = (typeof encrustCatalogueSorts)[number];
export type EncrustCataloguePageSize =
  (typeof encrustCataloguePageSizes)[number];

export interface EncrustCatalogueView {
  sort: EncrustCatalogueSort;
  pageSize: EncrustCataloguePageSize;
}

export const defaultEncrustCatalogueView = {
  sort: "game",
  pageSize: "all",
} as const satisfies EncrustCatalogueView;

const craftingToolOrderIndex = new Map<string, number>(
  craftingToolOrder.map((tool, index) => [tool, index]),
);

export interface EncrustCatalogueTool {
  count: number;
  label: string;
  pageCount: number;
  representativeItemId: string | null;
  segment: string;
  tag: string;
}

export interface EncrustCataloguePage {
  encrustments: Encrustment[];
  page: number;
  pageCount: number;
  pageSize: EncrustCataloguePageSize;
  total: number;
}

function compareEncrustingTools(
  left: Pick<EncrustCatalogueTool, "label" | "tag">,
  right: Pick<EncrustCatalogueTool, "label" | "tag">,
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

export function createEncrustCatalogueTools(
  encrustments: readonly Encrustment[],
  items: readonly Item[],
): EncrustCatalogueTool[] {
  const countByTool = new Map<string, number>();
  for (const encrustment of encrustments) {
    const tag = canonicalKey(encrustment.tool);
    countByTool.set(tag, (countByTool.get(tag) ?? 0) + 1);
  }

  const segments = new Set<string>();
  const tools = [...countByTool].map(([tag, count]) => {
    const segment = slugify(tag);
    if (!segment || segments.has(segment)) {
      throw new Error(
        `Multiple encrusting tools resolve to the static route ${segment || "(empty)"}.`,
      );
    }
    segments.add(segment);
    const toolkit = toolkitItemsForTag(items, tag)[0]?.item;
    return {
      count,
      label: toolkit?.name ?? titleCase(tag),
      pageCount: encrustCataloguePageCount(
        count,
        defaultEncrustCatalogueView.pageSize,
      ),
      representativeItemId: toolkit?.id ?? null,
      segment,
      tag,
    } satisfies EncrustCatalogueTool;
  });

  return tools.sort(compareEncrustingTools);
}

export function defaultEncrustCatalogueTool(
  tools: readonly EncrustCatalogueTool[],
): EncrustCatalogueTool | undefined {
  return tools[0];
}

export function encrustCatalogueToolForSegment(
  tools: readonly EncrustCatalogueTool[],
  segment: string,
): EncrustCatalogueTool | undefined {
  return tools.find((tool) => tool.segment === segment);
}

export function encrustCatalogueToolPath(
  tool: Pick<EncrustCatalogueTool, "segment">,
  page = 1,
  view: EncrustCatalogueView = defaultEncrustCatalogueView,
): string {
  const base = `/encrusts/tool/${tool.segment}`;
  if (
    view.sort === defaultEncrustCatalogueView.sort &&
    view.pageSize === defaultEncrustCatalogueView.pageSize
  ) {
    return page === 1
      ? base
      : `${base}/view/${view.sort}/${view.pageSize}/${page}`;
  }
  return `${base}/view/${view.sort}/${view.pageSize}/${page}`;
}

export function encrustCatalogueToolPathForTag(tag: string): string {
  return encrustCatalogueToolPath({ segment: slugify(canonicalKey(tag)) });
}

export function isEncrustCatalogueSort(
  value: string,
): value is EncrustCatalogueSort {
  return encrustCatalogueSorts.some((sort) => sort === value);
}

export function parseEncrustCataloguePageSize(
  value: string,
): EncrustCataloguePageSize | undefined {
  if (value === "all") {
    return value;
  }
  const parsed = Number(value);
  return encrustCataloguePageSizes.some((pageSize) => pageSize === parsed)
    ? (parsed as EncrustCataloguePageSize)
    : undefined;
}

export function encrustCataloguePageCount(
  count: number,
  pageSize: EncrustCataloguePageSize,
): number {
  return pageSize === "all" ? 1 : Math.max(1, Math.ceil(count / pageSize));
}

export function sortEncrustCatalogueEntries(
  encrustments: readonly Encrustment[],
  sources: readonly Pick<SourceSummary, "id" | "precedence">[],
  sort: EncrustCatalogueSort,
): Encrustment[] {
  const gameOrder = createSourceOrderComparator<Encrustment>(sources);
  return [...encrustments].sort((left, right) => {
    switch (sort) {
      case "name":
        return (
          compareCodeUnits(left.name.toLowerCase(), right.name.toLowerCase()) ||
          compareCodeUnits(left.name, right.name) ||
          gameOrder(left, right)
        );
      case "skill":
        return left.skillLevel - right.skillLevel || gameOrder(left, right);
      case "instability":
        return left.instability - right.instability || gameOrder(left, right);
      case "game":
        return gameOrder(left, right);
    }
  });
}

export function encrustmentsForCatalogueTool(
  encrustments: readonly Encrustment[],
  tool: Pick<EncrustCatalogueTool, "tag">,
  sources: readonly Pick<SourceSummary, "id" | "precedence">[],
  sort: EncrustCatalogueSort = defaultEncrustCatalogueView.sort,
): Encrustment[] {
  return sortEncrustCatalogueEntries(
    encrustments.filter(
      (encrustment) => canonicalKey(encrustment.tool) === tool.tag,
    ),
    sources,
    sort,
  );
}

export function paginateEncrustCatalogue(
  encrustments: readonly Encrustment[],
  tool: Pick<EncrustCatalogueTool, "tag">,
  page: number,
  options: {
    pageSize?: EncrustCataloguePageSize;
    sort?: EncrustCatalogueSort;
    sources?: readonly Pick<SourceSummary, "id" | "precedence">[];
  } = {},
): EncrustCataloguePage | undefined {
  if (!Number.isSafeInteger(page) || page < 1) {
    return undefined;
  }
  const pageSize = options.pageSize ?? defaultEncrustCatalogueView.pageSize;
  const matching = encrustmentsForCatalogueTool(
    encrustments,
    tool,
    options.sources ?? [],
    options.sort,
  );
  const pageCount = encrustCataloguePageCount(matching.length, pageSize);
  if (page > pageCount) {
    return undefined;
  }
  const start = pageSize === "all" ? 0 : (page - 1) * pageSize;
  const end = pageSize === "all" ? matching.length : start + pageSize;
  return {
    encrustments: matching.slice(start, end),
    page,
    pageCount,
    pageSize,
    total: matching.length,
  };
}
