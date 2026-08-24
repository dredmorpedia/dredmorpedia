import Link from "next/link";

import {
  CatalogueItemReferenceList,
  type CatalogueItemReference,
} from "@/components/catalogue-item-reference-list";
import { CatalogueToolMarker } from "@/components/catalogue-tool-marker";
import type { SourceMarker } from "@/lib/source-markers";

export type RecipeSummaryReference = CatalogueItemReference;

export interface RecipeSummaryData {
  description: string;
  hidden: boolean;
  id: string;
  inputs: RecipeSummaryReference[];
  name: string;
  outputs: RecipeSummaryReference[];
  slug: string;
  sourceMarker: SourceMarker | null;
  toolIconUrl: string | null;
  toolLabel: string;
}

export function RecipeSummaryCard({
  showTool = true,
  summary,
  variant = "full",
}: {
  showTool?: boolean;
  summary: RecipeSummaryData;
  variant?: "full" | "preview";
}) {
  const referenceLimit = variant === "preview" ? 4 : undefined;
  return (
    <article
      aria-label={`${summary.name} summary`}
      className="recipe-summary-card"
      data-variant={variant}
    >
      <header className="recipe-summary-header">
        <div>
          <h3 className="recipe-summary-title">
            <Link className="entity-link" href={`/recipes/${summary.slug}`}>
              {summary.name}
            </Link>
          </h3>
        </div>
        <div className="recipe-summary-badges">
          {summary.hidden ? (
            <span className="recipe-visibility-badge">Hidden</span>
          ) : null}
          {summary.sourceMarker ? (
            <span
              aria-label={`Source: ${summary.sourceMarker.fullLabel}`}
              className="item-source-marker"
              title={summary.sourceMarker.fullLabel}
            >
              {summary.sourceMarker.shortLabel}
            </span>
          ) : null}
        </div>
      </header>

      {summary.description ? (
        <p className="recipe-summary-description">{summary.description}</p>
      ) : null}

      <div className="recipe-summary-flow">
        <section aria-label="Ingredients">
          <h4>Ingredients</h4>
          <CatalogueItemReferenceList
            limit={referenceLimit}
            overflowNoun="ingredient"
            references={summary.inputs}
          />
        </section>
        <div className="recipe-summary-method">
          <span aria-hidden="true" className="recipe-summary-arrow">
            →
          </span>
          {showTool ? (
            <CatalogueToolMarker
              iconUrl={summary.toolIconUrl}
              label={summary.toolLabel}
              relationLabel="Crafting tool"
            />
          ) : null}
          {showTool ? (
            <span aria-hidden="true" className="recipe-summary-arrow">
              →
            </span>
          ) : null}
        </div>
        <section aria-label="Outputs by source level">
          <h4>Outputs by source level</h4>
          <CatalogueItemReferenceList
            limit={referenceLimit}
            output
            overflowNoun="output tier"
            references={summary.outputs}
          />
        </section>
      </div>

      <footer className="recipe-summary-footer">
        <Link
          className="entity-link font-semibold"
          href={`/recipes/${summary.slug}`}
        >
          Full recipe details →
        </Link>
      </footer>
    </article>
  );
}
