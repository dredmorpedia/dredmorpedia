import Link from "next/link";

import {
  CatalogueItemReferenceList,
  type CatalogueItemReference,
} from "@/components/catalogue-item-reference-list";
import { CatalogueToolMarker } from "@/components/catalogue-tool-marker";
import { CraftingSourceLevel } from "@/components/crafting-source-level";
import { EncrustmentSlotList } from "@/components/encrustment-slot-list";
import { StatPresentationLink } from "@/components/stat-presentation-link";
import type { EncrustmentSlotPresentation } from "@/lib/encrustment-slot-icons";
import type { SourceMarker } from "@/lib/source-markers";
import type { StatLinkPresentation } from "@/lib/stat-presentation-types";

export interface EncrustmentSummaryModifier {
  key: string;
  label: string;
  stat: StatLinkPresentation | null;
  value: string;
}

export interface EncrustmentSummaryPower {
  chanceLabel: string;
  key: string;
  name: string;
}

export interface EncrustmentSummaryData {
  description: string;
  hidden: boolean;
  id: string;
  inputs: CatalogueItemReference[];
  instability: string;
  modifiers: EncrustmentSummaryModifier[];
  name: string;
  powers: EncrustmentSummaryPower[];
  skillLevel: number;
  slots: EncrustmentSlotPresentation[];
  slug: string;
  sourceMarker: SourceMarker | null;
  sourceStats: StatLinkPresentation[];
  toolIconUrl: string | null;
  toolLabel: string;
}

export function EncrustmentSummaryCard({
  showTool = true,
  summary,
  variant = "full",
}: {
  showTool?: boolean;
  summary: EncrustmentSummaryData;
  variant?: "full" | "preview";
}) {
  const hasOutcomes = summary.modifiers.length > 0 || summary.powers.length > 0;

  return (
    <article
      aria-label={`${summary.name} summary`}
      className="recipe-summary-card encrustment-summary-card"
      data-variant={variant}
    >
      <header className="recipe-summary-header">
        <h3 className="recipe-summary-title">
          <Link className="entity-link" href={`/encrustments/${summary.slug}`}>
            {summary.name}
          </Link>
        </h3>
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

      <dl className="encrustment-summary-facts">
        <div>
          <dt>Required source level</dt>
          <dd>
            <CraftingSourceLevel
              level={summary.skillLevel}
              stats={summary.sourceStats}
            />
          </dd>
        </div>
        <div>
          <dt>Declared instability</dt>
          <dd>{summary.instability}</dd>
        </div>
      </dl>

      <div className="recipe-summary-flow">
        <section aria-label="Ingredients">
          <h4>Ingredients</h4>
          <CatalogueItemReferenceList
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
              relationLabel="Encrusting tool"
            />
          ) : null}
          {showTool ? (
            <span aria-hidden="true" className="recipe-summary-arrow">
              →
            </span>
          ) : null}
        </div>
        <section aria-label="Applicability and outcomes">
          <h4>Applies to</h4>
          {summary.slots.length > 0 ? (
            <EncrustmentSlotList slots={summary.slots} variant="compact" />
          ) : (
            <p className="encrustment-summary-empty">No declared slots</p>
          )}

          <h4 className="encrustment-summary-outcomes-heading">Outcomes</h4>
          {hasOutcomes ? (
            <ul className="encrustment-summary-outcomes">
              {summary.modifiers.map((modifier) => (
                <li key={modifier.key}>
                  <span>
                    {modifier.stat ? (
                      <StatPresentationLink
                        display="icon-label"
                        presentation={modifier.stat}
                      />
                    ) : (
                      modifier.label
                    )}
                  </span>
                  <strong>{modifier.value}</strong>
                </li>
              ))}
              {summary.powers.map((power) => (
                <li key={power.key}>
                  <span>{power.name}</span>
                  <strong>{power.chanceLabel}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="encrustment-summary-empty">
              No direct outcomes declared
            </p>
          )}
        </section>
      </div>

      <footer className="recipe-summary-footer">
        <Link
          className="entity-link font-semibold"
          href={`/encrustments/${summary.slug}`}
        >
          Full encrustment details →
        </Link>
      </footer>
    </article>
  );
}
