import Link from "next/link";
import { Hammer } from "lucide-react";

import type { SourceMarker } from "@/lib/source-markers";

export interface RecipeSummaryReference {
  amount: number;
  iconUrl: string | null;
  itemName: string;
  itemSlug: string | null;
  key: string;
  skillLevel: number | null;
}

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

function ReferenceArt({
  iconUrl,
  itemName,
}: Pick<RecipeSummaryReference, "iconUrl" | "itemName">) {
  return iconUrl ? (
    // The adjacent visible item name is the accessible source of truth.
    // eslint-disable-next-line @next/next/no-img-element
    <img alt="" height={40} src={iconUrl} title={itemName} width={40} />
  ) : (
    <span aria-hidden="true" className="catalogue-art-placeholder">
      ?
    </span>
  );
}

function ReferenceList({
  limit,
  references,
  output,
}: {
  limit?: number | undefined;
  references: readonly RecipeSummaryReference[];
  output?: boolean;
}) {
  const visibleReferences = limit ? references.slice(0, limit) : references;
  const hiddenCount = references.length - visibleReferences.length;
  return (
    <ul className="recipe-summary-reference-list">
      {visibleReferences.map((reference, index) => (
        <li
          key={`${reference.key}:${reference.skillLevel ?? "input"}:${index}`}
        >
          <ReferenceArt
            iconUrl={reference.iconUrl}
            itemName={reference.itemName}
          />
          <span className="recipe-summary-reference-copy">
            <span>
              {output || reference.amount !== 1 ? (
                <>
                  <strong>{reference.amount} ×</strong>{" "}
                </>
              ) : null}
              {reference.itemSlug ? (
                <Link
                  className="entity-link"
                  href={`/items/${reference.itemSlug}`}
                >
                  {reference.itemName}
                </Link>
              ) : (
                reference.itemName
              )}
            </span>
            {output && reference.skillLevel !== null ? (
              <small>Source level {reference.skillLevel}</small>
            ) : null}
            {!reference.itemSlug ? <small>Unresolved item</small> : null}
          </span>
        </li>
      ))}
      {hiddenCount > 0 ? (
        <li className="recipe-summary-reference-overflow">
          +{hiddenCount} more {output ? "output tier" : "ingredient"}
          {hiddenCount === 1 ? "" : "s"} on the recipe page
        </li>
      ) : null}
    </ul>
  );
}

function RecipeTool({ summary }: { summary: RecipeSummaryData }) {
  return (
    <span
      aria-label={`Crafting tool: ${summary.toolLabel}`}
      className="recipe-summary-tool-marker"
      role="img"
      title={summary.toolLabel}
    >
      {summary.toolIconUrl ? (
        <>
          {/* The labelled wrapper names this decorative toolkit image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" height={40} src={summary.toolIconUrl} width={40} />
        </>
      ) : (
        <Hammer aria-hidden="true" size={22} strokeWidth={1.8} />
      )}
    </span>
  );
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
          <ReferenceList limit={referenceLimit} references={summary.inputs} />
        </section>
        <div className="recipe-summary-method">
          <span aria-hidden="true" className="recipe-summary-arrow">
            →
          </span>
          {showTool ? <RecipeTool summary={summary} /> : null}
          {showTool ? (
            <span aria-hidden="true" className="recipe-summary-arrow">
              →
            </span>
          ) : null}
        </div>
        <section aria-label="Outputs by source level">
          <h4>Outputs by source level</h4>
          <ReferenceList
            limit={referenceLimit}
            output
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
