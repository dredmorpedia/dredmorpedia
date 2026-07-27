import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EntityBrowsePage } from "@/components/entity-browse-page";
import { loadSearchArtifact } from "@/lib/artifact";
import {
  browseKindForSegment,
  browseKinds,
  paginateBrowseDocuments,
} from "@/lib/browse";

interface BrowseRouteProps {
  params: Promise<{ kind: string; page: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  const documents = loadSearchArtifact().documents;
  return browseKinds.flatMap((definition) => {
    const firstPage = paginateBrowseDocuments(documents, definition.kind, 1);
    if (!firstPage) {
      throw new Error(
        `Could not allocate the first browse page for ${definition.kind}.`,
      );
    }
    return Array.from({ length: firstPage.pageCount }, (_, index) => ({
      kind: definition.segment,
      page: String(index + 1),
    }));
  });
}

export async function generateMetadata({
  params,
}: BrowseRouteProps): Promise<Metadata> {
  const { kind: segment, page: pageParam } = await params;
  const definition = browseKindForSegment(segment);
  const page = Number(pageParam);
  if (
    !definition ||
    !paginateBrowseDocuments(
      loadSearchArtifact().documents,
      definition.kind,
      page,
    )
  ) {
    return {};
  }

  return {
    title: page === 1 ? definition.label : `${definition.label} – Page ${page}`,
    description: `Browse ${definition.label.toLocaleLowerCase("en")} in the active Dredmorpedia dataset.`,
  };
}

export default async function BrowseKindPage({ params }: BrowseRouteProps) {
  const { kind: segment, page: pageParam } = await params;
  const definition = browseKindForSegment(segment);
  const page = Number(pageParam);
  if (!definition || !Number.isSafeInteger(page)) {
    notFound();
  }

  return <EntityBrowsePage kind={definition.kind} page={page} />;
}
