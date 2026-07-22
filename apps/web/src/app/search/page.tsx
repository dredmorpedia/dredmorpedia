import type { Metadata } from "next";
import { Suspense } from "react";

import { SearchExplorer } from "@/components/search-explorer";
import { loadArtifact, loadSearchArtifact } from "@/lib/artifact";

export const metadata: Metadata = {
  title: "Search",
  description:
    "Search Dredmorpedia items, stats, and targeting templates with structured filters.",
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
  const statLabels = new Map<string, string>();
  for (const stat of artifact.entities.stats) {
    statLabels.set(stat.canonicalKey, stat.name);
  }
  for (const item of artifact.entities.items) {
    for (const stat of item.stats) {
      statLabels.set(stat.statKey, stat.statName);
    }
  }
  const stats = [...statLabels]
    .sort((left, right) => left[1].localeCompare(right[1], "en"))
    .map(([value, label]) => ({ value, label }));
  const documents = search.documents.filter(
    (document) =>
      document.kind === "item" ||
      document.kind === "stat" ||
      document.kind === "template",
  );

  return (
    <Suspense
      fallback={
        <div className="empty-state" role="status">
          Loading search controls…
        </div>
      }
    >
      <SearchExplorer documents={documents} sources={sources} stats={stats} />
    </Suspense>
  );
}
