import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CraftCataloguePage } from "@/components/craft-catalogue-page";
import { loadArtifact } from "@/lib/artifact";
import {
  craftCataloguePageCount,
  craftCataloguePageSizes,
  craftCatalogueSorts,
  craftCatalogueToolForSegment,
  createCraftCatalogueTools,
  defaultCraftCatalogueView,
  isCraftCatalogueSort,
  paginateCraftCatalogue,
  parseCraftCataloguePageSize,
} from "@/lib/craft-catalogue";

interface CraftCatalogueViewRouteProps {
  params: Promise<{
    page: string;
    size: string;
    sort: string;
    tool: string;
  }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  const artifact = loadArtifact();
  const tools = createCraftCatalogueTools(
    artifact.entities.recipes,
    artifact.entities.items,
  );
  return tools.flatMap((tool) =>
    craftCatalogueSorts.flatMap((sort) =>
      craftCataloguePageSizes.flatMap((pageSize) => {
        const pageCount = craftCataloguePageCount(tool.count, pageSize);
        const isDefaultView =
          sort === defaultCraftCatalogueView.sort &&
          pageSize === defaultCraftCatalogueView.pageSize;
        const firstPage = isDefaultView ? 2 : 1;
        return Array.from(
          { length: Math.max(0, pageCount - firstPage + 1) },
          (_, index) => ({
            page: String(firstPage + index),
            size: String(pageSize),
            sort,
            tool: tool.segment,
          }),
        );
      }),
    ),
  );
}

function readView(params: { page: string; size: string; sort: string }) {
  const page = Number(params.page);
  const pageSize = parseCraftCataloguePageSize(params.size);
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !pageSize ||
    !isCraftCatalogueSort(params.sort)
  ) {
    return null;
  }
  if (
    params.sort === defaultCraftCatalogueView.sort &&
    pageSize === defaultCraftCatalogueView.pageSize &&
    page === 1
  ) {
    return null;
  }
  return { page, pageSize, sort: params.sort };
}

export async function generateMetadata({
  params,
}: CraftCatalogueViewRouteProps): Promise<Metadata> {
  const route = await params;
  const view = readView(route);
  if (!view) {
    return {};
  }
  const artifact = loadArtifact();
  const tool = craftCatalogueToolForSegment(
    createCraftCatalogueTools(
      artifact.entities.recipes,
      artifact.entities.items,
    ),
    route.tool,
  );
  if (
    !tool ||
    !paginateCraftCatalogue(artifact.entities.recipes, tool, view.page, {
      pageSize: view.pageSize,
      sort: view.sort,
      sources: artifact.sources,
    })
  ) {
    return {};
  }
  return {
    title: `${tool.label} crafts – ${view.sort} order, page ${view.page}`,
    description: `Browse ${tool.label} recipes using the selected local catalogue view.`,
  };
}

export default async function CraftCatalogueViewRoute({
  params,
}: CraftCatalogueViewRouteProps) {
  const route = await params;
  const view = readView(route);
  if (!view) {
    notFound();
  }
  return (
    <CraftCataloguePage
      page={view.page}
      pageSize={view.pageSize}
      sort={view.sort}
      toolSegment={route.tool}
    />
  );
}
