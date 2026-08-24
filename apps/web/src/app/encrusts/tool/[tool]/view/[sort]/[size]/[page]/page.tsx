import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EncrustCataloguePage } from "@/components/encrust-catalogue-page";
import { loadArtifact } from "@/lib/artifact";
import {
  createEncrustCatalogueTools,
  defaultEncrustCatalogueView,
  encrustCataloguePageCount,
  encrustCataloguePageSizes,
  encrustCatalogueSorts,
  encrustCatalogueToolForSegment,
  isEncrustCatalogueSort,
  paginateEncrustCatalogue,
  parseEncrustCataloguePageSize,
} from "@/lib/encrust-catalogue";

interface EncrustCatalogueViewRouteProps {
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
  const tools = createEncrustCatalogueTools(
    artifact.entities.encrustments,
    artifact.entities.items,
  );
  return tools.flatMap((tool) =>
    encrustCatalogueSorts.flatMap((sort) =>
      encrustCataloguePageSizes.flatMap((pageSize) => {
        const pageCount = encrustCataloguePageCount(tool.count, pageSize);
        const isDefaultView =
          sort === defaultEncrustCatalogueView.sort &&
          pageSize === defaultEncrustCatalogueView.pageSize;
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
  const pageSize = parseEncrustCataloguePageSize(params.size);
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !pageSize ||
    !isEncrustCatalogueSort(params.sort)
  ) {
    return null;
  }
  if (
    params.sort === defaultEncrustCatalogueView.sort &&
    pageSize === defaultEncrustCatalogueView.pageSize &&
    page === 1
  ) {
    return null;
  }
  return { page, pageSize, sort: params.sort };
}

export async function generateMetadata({
  params,
}: EncrustCatalogueViewRouteProps): Promise<Metadata> {
  const route = await params;
  const view = readView(route);
  if (!view) {
    return {};
  }
  const artifact = loadArtifact();
  const tool = encrustCatalogueToolForSegment(
    createEncrustCatalogueTools(
      artifact.entities.encrustments,
      artifact.entities.items,
    ),
    route.tool,
  );
  if (
    !tool ||
    !paginateEncrustCatalogue(artifact.entities.encrustments, tool, view.page, {
      pageSize: view.pageSize,
      sort: view.sort,
      sources: artifact.sources,
    })
  ) {
    return {};
  }
  return {
    title: `${tool.label} encrusts – ${view.sort} order, page ${view.page}`,
    description: `Browse ${tool.label} encrustments using the selected local catalogue view.`,
  };
}

export default async function EncrustCatalogueViewRoute({
  params,
}: EncrustCatalogueViewRouteProps) {
  const route = await params;
  const view = readView(route);
  if (!view) {
    notFound();
  }
  return (
    <EncrustCataloguePage
      page={view.page}
      pageSize={view.pageSize}
      sort={view.sort}
      toolSegment={route.tool}
    />
  );
}
