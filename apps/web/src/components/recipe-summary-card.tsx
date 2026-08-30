import Link from "next/link";

import {
  CatalogueItemReferenceList,
  type CatalogueItemReference,
} from "@/components/catalogue-item-reference-list";
import { CatalogueToolMarker } from "@/components/catalogue-tool-marker";
import type { SourceMarker } from "@/lib/source-markers";
import type { StatLinkPresentation } from "@/lib/stat-presentation-types";

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
  sourceStats: StatLinkPresentation[];
  toolIconUrl: string | null;
  toolLabel: string;
}

function recipeReferenceLabel(reference: RecipeSummaryReference): string {
  const amount = reference.amount === 1 ? "" : `${reference.amount} × `;
  const level =
    reference.skillLevel !== null && reference.skillLevel > 0
      ? ` at source level ${reference.skillLevel}`
      : "";
  return `${amount}${reference.itemName}${level}`;
}

export function recipeSummaryAccessibleName(
  summary: RecipeSummaryData,
): string {
  const inputs = summary.inputs.map(recipeReferenceLabel).join(", ");
  const outputs = summary.outputs.map(recipeReferenceLabel).join(", ");
  return `${summary.name}: ${inputs || "no declared ingredients"} to ${outputs || "no declared outputs"}`;
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
      aria-label={`${recipeSummaryAccessibleName(summary)} summary`}
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
        <div>
          <h4>Ingredients</h4>
          <CatalogueItemReferenceList
            limit={referenceLimit}
            overflowNoun="ingredient"
            references={summary.inputs}
          />
        </div>
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
        <div>
          <h4>Outputs by source level</h4>
          <CatalogueItemReferenceList
            limit={referenceLimit}
            output
            overflowNoun="output tier"
            references={summary.outputs}
            sourceStats={summary.sourceStats}
          />
        </div>
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
