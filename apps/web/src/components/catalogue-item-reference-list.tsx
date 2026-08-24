import Link from "next/link";

export interface CatalogueItemReference {
  amount: number;
  iconUrl: string | null;
  itemName: string;
  itemSlug: string | null;
  key: string;
  skillLevel: number | null;
}

function ReferenceArt({
  iconUrl,
  itemName,
}: Pick<CatalogueItemReference, "iconUrl" | "itemName">) {
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

export function CatalogueItemReferenceList({
  limit,
  output = false,
  overflowNoun,
  references,
}: {
  limit?: number | undefined;
  output?: boolean;
  overflowNoun: string;
  references: readonly CatalogueItemReference[];
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
          +{hiddenCount} more {overflowNoun}
          {hiddenCount === 1 ? "" : "s"} on the detail page
        </li>
      ) : null}
    </ul>
  );
}
