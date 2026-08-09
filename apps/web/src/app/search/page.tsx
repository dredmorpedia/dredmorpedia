import type { Metadata } from "next";
import { Suspense } from "react";

import { SearchExplorer } from "@/components/search-explorer";
import { loadArtifact, loadSearchArtifact } from "@/lib/artifact";
import { createSearchStatFilterOptions } from "@/lib/search-stat-facets";

export const metadata: Metadata = {
  title: "Search",
  description:
    "Search every Dredmorpedia record type with shareable structured filters.",
};

export default function SearchPage() {
  const artifact = loadArtifact();
  const search = loadSearchArtifact();
  if (search.datasetId !== artifact.datasetId) {
    throw new Error(
      `Search artifact dataset ${search.datasetId} does not match ${artifact.datasetId}.`,
    );
  }

  const sourceIds = new Set(
    search.documents.map((document) => document.sourceId),
  );
  const sources = artifact.sources
    .filter((source) => sourceIds.has(source.id))
    .map((source) => ({ value: source.id, label: source.label }));
  const stats = createSearchStatFilterOptions(
    artifact.entities.stats,
    search.documents,
  );
  return (
    <Suspense
      fallback={
        <div className="empty-state" role="status">
          Loading search controls…
        </div>
      }
    >
      <SearchExplorer
        documents={search.documents}
        sources={sources}
        stats={stats}
      />
    </Suspense>
  );
}
