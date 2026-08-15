import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ItemCataloguePage } from "@/components/item-catalogue-page";
import { loadArtifact } from "@/lib/artifact";
import {
  createItemCatalogueCategories,
  itemCatalogueCategoryForSegment,
  paginateItemCatalogue,
} from "@/lib/item-catalogue";

interface ItemCategoryRouteProps {
  params: Promise<{ category: string; page: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return createItemCatalogueCategories(loadArtifact().entities.items).flatMap(
    (category) =>
      Array.from({ length: category.pageCount }, (_, index) => ({
        category: category.segment,
        page: String(index + 1),
      })),
  );
}

export async function generateMetadata({
  params,
}: ItemCategoryRouteProps): Promise<Metadata> {
  const { category: segment, page: pageParam } = await params;
  const items = loadArtifact().entities.items;
  const category = itemCatalogueCategoryForSegment(
    createItemCatalogueCategories(items),
    segment,
  );
  const page = Number(pageParam);
  if (!category || !paginateItemCatalogue(items, category, page)) {
    return {};
  }
  return {
    title:
      page === 1
        ? `${category.label} items`
        : `${category.label} items – Page ${page}`,
    description: `Browse ${category.label.toLocaleLowerCase("en")} items in the active Dredmorpedia dataset.`,
  };
}

export default async function ItemCategoryRoute({
  params,
}: ItemCategoryRouteProps) {
  const { category, page: pageParam } = await params;
  const page = Number(pageParam);
  if (!Number.isSafeInteger(page)) {
    notFound();
  }
  return <ItemCataloguePage categorySegment={category} page={page} />;
}
