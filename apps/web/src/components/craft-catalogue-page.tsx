import Link from "next/link";
import { notFound } from "next/navigation";

import { type Item } from "@dredmorpedia/domain";

import {
  CraftCatalogueControls,
  type CraftCatalogueNavigationEntry,
} from "@/components/craft-catalogue-controls";
import { CatalogueContextBar } from "@/components/catalogue-context-bar";
import { RecipeSummaryCard } from "@/components/recipe-summary-card";
import { loadArtifact, loadArtifactSha256 } from "@/lib/artifact";
import {
  craftCatalogueToolForSegment,
  craftCatalogueToolPath,
  createCraftCatalogueTools,
  defaultCraftCatalogueView,
  defaultCraftCatalogueTool,
  paginateCraftCatalogue,
  type CraftCataloguePageSize,
  type CraftCatalogueSort,
} from "@/lib/craft-catalogue";
import { itemIconUrl } from "@/lib/presented-assets";
import { createRecipeSummaryData } from "@/lib/recipe-summary";

export function CraftCataloguePage({
  toolSegment,
  page = 1,
  pageSize = defaultCraftCatalogueView.pageSize,
  redirectToStoredView = false,
  sort = defaultCraftCatalogueView.sort,
}: {
  toolSegment?: string;
  page?: number;
  pageSize?: CraftCataloguePageSize;
  redirectToStoredView?: boolean;
  sort?: CraftCatalogueSort;
}) {
  const artifact = loadArtifact();
  const artifactSha256 = loadArtifactSha256();
  const view = { pageSize, sort };
  const tools = createCraftCatalogueTools(
    artifact.entities.recipes,
    artifact.entities.items,
  );
  const activeTool = toolSegment
    ? craftCatalogueToolForSegment(tools, toolSegment)
    : defaultCraftCatalogueTool(tools);

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
    ? paginateCraftCatalogue(artifact.entities.recipes, activeTool, page, {
        pageSize,
        sort,
        sources: artifact.sources,
      })
    : undefined;
  if (activeTool && !result) {
    notFound();
  }
  const navigationEntries: CraftCatalogueNavigationEntry[] = tools.map(
    (candidate) => {
      const toolkit = candidate.representativeItemId
        ? itemsById.get(candidate.representativeItemId)
        : undefined;
      return {
        ...candidate,
        href: craftCatalogueToolPath(candidate, 1, view),
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
  const lastRecord = result ? firstRecord + result.recipes.length - 1 : 0;

  return (
    <div className="detail-page craft-catalogue-page">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Crafts</span>
      </nav>

      <header className="browse-header">
        <div>
          <p className="eyebrow">Encyclopedia</p>
          <h1 className="section-title">Crafts</h1>
          <p className="hero-copy">
            Browse complete recipes by their familiar crafting tool, with
            ingredients, output art, source skill tiers, and hidden-recipe
            status visible together.
          </p>
        </div>
        {activeTool && result ? (
          <p className="result-count" aria-live="polite">
            Showing {firstRecord}–{lastRecord} of {result.total}{" "}
            {result.total === 1 ? "recipe" : "recipes"} for {activeTool.label}
          </p>
        ) : null}
      </header>

      {activeTool && tools.length > 0 ? (
        <CraftCatalogueControls
          activeTool={activeTool}
          activeView={view}
          redirectToStoredView={redirectToStoredView}
          tools={navigationEntries}
        />
      ) : null}

      {activeTool && result ? (
        <section aria-labelledby="craft-tool-heading">
          <CatalogueContextBar
            headingId="craft-tool-heading"
            iconTitle={activeTool.label}
            iconUrl={activeToolIconUrl ?? null}
            kindLabel="Selected tool"
            label={activeTool.label}
          />
          <div className="catalogue-context-actions">
            <Link
              className="entity-link"
              href={`/search/?kind=recipe&category=${activeTool.tag}`}
            >
              Refine in advanced search
            </Link>
            <Link className="entity-link" href="/tools/crafting-graph/">
              Plan a crafted item
            </Link>
          </div>

          <div className="recipe-summary-grid">
            {result.recipes.map((recipe) => (
              <RecipeSummaryCard
                key={recipe.id}
                showTool={false}
                summary={createRecipeSummaryData({
                  artifact,
                  artifactSha256,
                  itemsById,
                  recipe,
                  source: sourcesById.get(recipe.provenance.sourceId),
                  toolIconUrl: activeToolIconUrl ?? null,
                  toolLabel: activeTool.label,
                })}
              />
            ))}
          </div>
        </section>
      ) : (
        <div className="empty-state" role="status">
          <h2 className="font-semibold">No crafts in this dataset</h2>
          <p>
            Choose another generated dataset and rebuild the application, or use
            another encyclopedia section.
          </p>
        </div>
      )}

      {activeTool && result && result.pageCount > 1 ? (
        <nav
          aria-label={`${activeTool.label} craft pages`}
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
                      href={craftCatalogueToolPath(
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
