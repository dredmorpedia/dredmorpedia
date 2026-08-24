import Link from "next/link";
import { notFound } from "next/navigation";

import { type Item } from "@dredmorpedia/domain";

import {
  EncrustCatalogueControls,
  type EncrustCatalogueNavigationEntry,
} from "@/components/encrust-catalogue-controls";
import { EncrustmentSummaryCard } from "@/components/encrustment-summary-card";
import { loadArtifact, loadArtifactSha256 } from "@/lib/artifact";
import {
  createEncrustCatalogueTools,
  defaultEncrustCatalogueTool,
  defaultEncrustCatalogueView,
  encrustCatalogueToolForSegment,
  encrustCatalogueToolPath,
  paginateEncrustCatalogue,
  type EncrustCataloguePageSize,
  type EncrustCatalogueSort,
} from "@/lib/encrust-catalogue";
import { createEncrustmentSummaryData } from "@/lib/encrustment-summary";
import { itemIconUrl } from "@/lib/presented-assets";

export function EncrustCataloguePage({
  page = 1,
  pageSize = defaultEncrustCatalogueView.pageSize,
  redirectToStoredView = false,
  sort = defaultEncrustCatalogueView.sort,
  toolSegment,
}: {
  page?: number;
  pageSize?: EncrustCataloguePageSize;
  redirectToStoredView?: boolean;
  sort?: EncrustCatalogueSort;
  toolSegment?: string;
}) {
  const artifact = loadArtifact();
  const artifactSha256 = loadArtifactSha256();
  const view = { pageSize, sort };
  const tools = createEncrustCatalogueTools(
    artifact.entities.encrustments,
    artifact.entities.items,
  );
  const activeTool = toolSegment
    ? encrustCatalogueToolForSegment(tools, toolSegment)
    : defaultEncrustCatalogueTool(tools);

  if (toolSegment && !activeTool) {
    notFound();
  }

  const itemsById = new Map<string, Item>(
    artifact.entities.items.map((item) => [item.id, item]),
  );
  const sourcesById = new Map(
    artifact.sources.map((source) => [source.id, source]),
  );
  const result = activeTool
    ? paginateEncrustCatalogue(
        artifact.entities.encrustments,
        activeTool,
        page,
        { pageSize, sort, sources: artifact.sources },
      )
    : undefined;
  if (activeTool && !result) {
    notFound();
  }

  const navigationEntries: EncrustCatalogueNavigationEntry[] = tools.map(
    (candidate) => {
      const toolkit = candidate.representativeItemId
        ? itemsById.get(candidate.representativeItemId)
        : undefined;
      return {
        ...candidate,
        href: encrustCatalogueToolPath(candidate, 1, view),
        iconUrl: toolkit
          ? itemIconUrl(toolkit.id, artifact, artifactSha256)
          : null,
      };
    },
  );
  const activeToolIconUrl = navigationEntries.find(
    (candidate) => candidate.tag === activeTool?.tag,
  )?.iconUrl;
  const firstRecord =
    !result || result.total === 0 || result.pageSize === "all"
      ? result?.total === 0
        ? 0
        : 1
      : (result.page - 1) * result.pageSize + 1;
  const lastRecord = result ? firstRecord + result.encrustments.length - 1 : 0;

  return (
    <div className="detail-page craft-catalogue-page">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Encrusts</span>
      </nav>

      <header className="browse-header">
        <div>
          <p className="eyebrow">Encyclopedia</p>
          <h1 className="section-title">Encrusts</h1>
          <p className="hero-copy">
            Browse encrustments by their familiar toolkit, with ingredients,
            applicability, direct outcomes, and declared instability visible
            together. These source facts do not imply a complete risk formula.
          </p>
        </div>
        {activeTool && result ? (
          <p className="result-count" aria-live="polite">
            Showing {firstRecord}–{lastRecord} of {result.total}{" "}
            {result.total === 1 ? "encrustment" : "encrustments"} for{" "}
            {activeTool.label}
          </p>
        ) : null}
      </header>

      {activeTool && tools.length > 0 ? (
        <EncrustCatalogueControls
          activeTool={activeTool}
          activeView={view}
          redirectToStoredView={redirectToStoredView}
          tools={navigationEntries}
        />
      ) : null}

      {activeTool && result ? (
        <section aria-labelledby="encrust-tool-heading">
          <div className="craft-tool-heading">
            <div>
              <p className="eyebrow">Selected tool</p>
              <h2 id="encrust-tool-heading" className="section-title">
                {activeTool.label}
              </h2>
            </div>
            <div className="craft-tool-actions">
              <Link
                className="entity-link"
                href={`/search/?kind=encrustment&category=${activeTool.tag}`}
              >
                Refine in advanced search
              </Link>
              <Link className="entity-link" href="/tools/encrusting-plan/">
                Plan an encrustment
              </Link>
            </div>
          </div>

          <div className="recipe-summary-grid">
            {result.encrustments.map((encrustment) => (
              <EncrustmentSummaryCard
                key={encrustment.id}
                showTool={false}
                summary={createEncrustmentSummaryData({
                  artifact,
                  artifactSha256,
                  encrustment,
                  itemsById,
                  source: sourcesById.get(encrustment.provenance.sourceId),
                  toolIconUrl: activeToolIconUrl ?? null,
                  toolLabel: activeTool.label,
                })}
              />
            ))}
          </div>
        </section>
      ) : (
        <div className="empty-state" role="status">
          <h2 className="font-semibold">No encrustments in this dataset</h2>
          <p>
            Choose another generated dataset and rebuild the application, or use
            another encyclopedia section.
          </p>
        </div>
      )}

      {activeTool && result && result.pageCount > 1 ? (
        <nav
          aria-label={`${activeTool.label} encrustment pages`}
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
                      aria-label={`${activeTool.label}, page ${pageNumber}`}
                      className="entity-link"
                      href={encrustCatalogueToolPath(
                        activeTool,
                        pageNumber,
                        view,
                      )}
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
