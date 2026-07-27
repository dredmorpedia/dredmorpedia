import Link from "next/link";
import { notFound } from "next/navigation";

import type { EntityKind } from "@dredmorpedia/domain";

import { loadArtifact, loadSearchArtifact } from "@/lib/artifact";
import {
  browseKindFor,
  browsePageSize,
  browsePagePath,
  paginateBrowseDocuments,
} from "@/lib/browse";

interface EntityBrowsePageProps {
  kind: EntityKind;
  page: number;
}

export function EntityBrowsePage({ kind, page }: EntityBrowsePageProps) {
  const artifact = loadArtifact();
  const search = loadSearchArtifact();
  const definition = browseKindFor(kind);
  const result = paginateBrowseDocuments(search.documents, kind, page);
  if (!result) {
    notFound();
  }

  const sourceLabels = new Map(
    artifact.sources.map((source) => [source.id, source.label]),
  );
  const firstRecord =
    result.total === 0 ? 0 : (result.page - 1) * browsePageSize + 1;
  const lastRecord = firstRecord + result.documents.length - 1;

  return (
    <div className="detail-page">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/browse/">Browse</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{definition.label}</span>
      </nav>

      <header className="browse-header">
        <div>
          <p className="eyebrow">Static catalogue</p>
          <h1 className="section-title">{definition.label}</h1>
          <p className="hero-copy">{definition.description}</p>
        </div>
        <p className="result-count" aria-live="polite">
          {result.total === 0
            ? "No records in this dataset"
            : `Showing ${firstRecord}–${lastRecord} of ${result.total} records`}
        </p>
      </header>

      {result.documents.length > 0 ? (
        <ul className="browse-result-list">
          {result.documents.map((document) => (
            <li key={document.id} className="browse-result-card">
              <div>
                <p className="eyebrow">{definition.singularLabel}</p>
                <h2 className="mt-2 text-xl font-semibold">
                  <Link className="entity-link" href={document.url}>
                    {document.name}
                  </Link>
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {document.summary ||
                    "No summary is supplied by this dataset."}
                </p>
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                {sourceLabels.get(document.sourceId) ?? document.sourceId}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state" role="status">
          <h2 className="font-semibold">
            No {definition.label.toLocaleLowerCase("en")} in this dataset
          </h2>
          <p>
            Choose another generated dataset and rebuild the application, or
            browse a different record type.
          </p>
        </div>
      )}

      {result.pageCount > 1 ? (
        <nav
          aria-label={`${definition.label} catalogue pages`}
          className="browse-pagination"
        >
          <p>
            Page {result.page} of {result.pageCount}
          </p>
          <ol className="browse-page-links">
            {Array.from({ length: result.pageCount }, (_, index) => {
              const pageNumber = index + 1;
              return (
                <li key={pageNumber}>
                  {pageNumber === result.page ? (
                    <span aria-current="page">{pageNumber}</span>
                  ) : (
                    <Link
                      className="entity-link"
                      href={browsePagePath(kind, pageNumber)}
                      aria-label={`${definition.label}, page ${pageNumber}`}
                    >
                      {pageNumber}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}
    </div>
  );
}
