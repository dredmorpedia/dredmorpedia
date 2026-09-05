import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ItemCataloguePage } from "@/components/item-catalogue-page";
import { loadArtifact } from "@/lib/artifact";
import {
  createItemCatalogueCategories,
  defaultItemCatalogueView,
  isItemCatalogueSort,
  itemCatalogueCategoryForSegment,
  itemCataloguePageCount,
  itemCataloguePageSizes,
  itemCatalogueSorts,
  paginateItemCatalogue,
  parseItemCataloguePageSize,
} from "@/lib/item-catalogue";

interface ItemCatalogueViewRouteProps {
  params: Promise<{
    category: string;
    page: string;
    size: string;
    sort: string;
  }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  const artifact = loadArtifact();
  const categories = createItemCatalogueCategories(
    artifact.entities.items,
    artifact.sources,
  );
  return categories.flatMap((category) =>
    itemCatalogueSorts.flatMap((sort) =>
      itemCataloguePageSizes.flatMap((pageSize) => {
        if (
          sort === defaultItemCatalogueView.sort &&
          pageSize === defaultItemCatalogueView.pageSize
        ) {
          return [];
        }
        return Array.from(
          { length: itemCataloguePageCount(category.count, pageSize) },
          (_, index) => ({
            category: category.segment,
            sort,
            size: String(pageSize),
            page: String(index + 1),
          }),
        );
      }),
    ),
  );
}

function readView(params: { page: string; size: string; sort: string }) {
  const page = Number(params.page);
  const pageSize = parseItemCataloguePageSize(params.size);
  if (
    !Number.isSafeInteger(page) ||
    !pageSize ||
    !isItemCatalogueSort(params.sort)
  ) {
    return null;
  }
  if (
    params.sort === defaultItemCatalogueView.sort &&
    pageSize === defaultItemCatalogueView.pageSize
  ) {
    return null;
  }
  return { page, pageSize, sort: params.sort };
}

export async function generateMetadata({
  params,
}: ItemCatalogueViewRouteProps): Promise<Metadata> {
  const route = await params;
  const view = readView(route);
  if (!view) {
    return {};
  }
  const artifact = loadArtifact();
  const category = itemCatalogueCategoryForSegment(
    createItemCatalogueCategories(artifact.entities.items, artifact.sources),
    route.category,
  );
  if (
    !category ||
    !paginateItemCatalogue(artifact.entities.items, category, view.page, {
      sources: artifact.sources,
      sort: view.sort,
      pageSize: view.pageSize,
    })
  ) {
    return {};
  }
  return {
    title: `${category.label} items – ${view.sort} order, page ${view.page}`,
    description: `Browse ${category.label.toLocaleLowerCase("en")} items using the selected local catalogue view.`,
  };
}

export default async function ItemCatalogueViewRoute({
  params,
}: ItemCatalogueViewRouteProps) {
  const route = await params;
  const view = readView(route);
  if (!view) {
    notFound();
  }
  return (
    <ItemCataloguePage
      categorySegment={route.category}
      page={view.page}
      pageSize={view.pageSize}
      sort={view.sort}
    />
  );
}
