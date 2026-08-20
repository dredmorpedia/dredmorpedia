import Link from "next/link";

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
  references,
  output,
}: {
  references: readonly RecipeSummaryReference[];
  output?: boolean;
}) {
  return (
    <ul className="recipe-summary-reference-list">
      {references.map((reference, index) => (
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
    </ul>
  );
}

export function RecipeSummaryCard({
  showTool = true,
  summary,
}: {
  showTool?: boolean;
  summary: RecipeSummaryData;
}) {
  return (
    <article
      aria-label={`${summary.name} summary`}
      className="recipe-summary-card"
    >
      <header className="recipe-summary-header">
        <div>
          {showTool ? <p className="eyebrow">{summary.toolLabel}</p> : null}
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
          <ReferenceList references={summary.inputs} />
        </section>
        <span aria-hidden="true" className="recipe-summary-arrow">
          →
        </span>
        <section aria-label="Outputs by source level">
          <h4>Outputs by source level</h4>
          <ReferenceList output references={summary.outputs} />
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
