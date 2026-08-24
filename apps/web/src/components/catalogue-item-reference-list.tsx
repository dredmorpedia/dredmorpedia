import Link from "next/link";

import { CraftingSourceLevel } from "@/components/crafting-source-level";
import type { StatLinkPresentation } from "@/lib/stat-presentation-types";

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
  sourceStats = [],
}: {
  limit?: number | undefined;
  output?: boolean;
  overflowNoun: string;
  references: readonly CatalogueItemReference[];
  sourceStats?: readonly StatLinkPresentation[];
}) {
  const visibleReferences = limit ? references.slice(0, limit) : references;
  const hiddenCount = references.length - visibleReferences.length;
  return (
    <ul className="recipe-summary-reference-list">
      {visibleReferences.map((reference, index) => (
        <li
          className={
            output && reference.skillLevel !== null && reference.skillLevel > 0
              ? "recipe-summary-output-reference"
              : undefined
          }
          key={`${reference.key}:${reference.skillLevel ?? "input"}:${index}`}
        >
          {output &&
          reference.skillLevel !== null &&
          reference.skillLevel > 0 ? (
            <CraftingSourceLevel
              level={reference.skillLevel}
              stats={sourceStats}
            />
          ) : null}
          <span className="recipe-summary-reference-item">
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
              {!reference.itemSlug ? <small>Unresolved item</small> : null}
            </span>
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
