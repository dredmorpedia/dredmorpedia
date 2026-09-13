import Link from "next/link";

import { ItemTriggerEffect } from "@/components/item-trigger-effect";
import { StatPresentationLink } from "@/components/stat-presentation-link";
import type { ItemPreviewData } from "@/lib/item-preview-types";

const groups = {
  damage: "Damage modifiers",
  resistance: "Resistance modifiers",
  primary: "Primary stat modifiers",
  secondary: "Secondary stat modifiers",
  other: "Other item stats",
  random: "Random stats",
} as const;

export function ItemPreviewCard({ summary }: { summary: ItemPreviewData }) {
  return (
    <article
      aria-label={`${summary.name} item summary`}
      className="item-preview-card"
    >
      <header className="item-preview-heading">
        {summary.iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" height={56} src={summary.iconUrl} width={56} />
        ) : null}
        <div>
          <h3>
            <Link className="entity-link" href={`/items/${summary.slug}`}>
              {summary.name}
            </Link>
          </h3>
          <small>{summary.category}</small>
          {summary.engineReference ? (
            <span className="item-reference-marker">Engine reference</span>
          ) : null}
          {summary.sourceMarker ? (
            <span
              className="item-source-marker"
              title={summary.sourceMarker.fullLabel}
              aria-label={`Source: ${summary.sourceMarker.fullLabel}`}
            >
              {summary.sourceMarker.shortLabel}
            </span>
          ) : null}
        </div>
      </header>
      {summary.description ? (
        <p className="item-preview-description">{summary.description}</p>
      ) : null}
      <dl className="item-summary-facts">
        {summary.facts.map((fact, index) => (
          <div key={index}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>
      {summary.modifiers.length ? (
        <div className="item-summary-modifier-block">
          {Object.entries(groups).map(([group, label]) => {
            const modifiers = summary.modifiers.filter(
              (modifier) => modifier.group === group,
            );
            return modifiers.length ? (
              <dl
                aria-label={label}
                className="item-summary-modifiers"
                key={group}
              >
                {modifiers.map((modifier, index) => (
                  <div key={index}>
                    <dt>
                      {modifier.stat ? (
                        <StatPresentationLink
                          display="icon"
                          label={modifier.label}
                          presentation={modifier.stat}
                        />
                      ) : (
                        modifier.label
                      )}
                    </dt>
                    <dd>{modifier.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null;
          })}
        </div>
      ) : null}
      {summary.effects.length ? (
        <ul className="catalogue-text-links">
          {summary.effects.map((effect, index) => (
            <ItemTriggerEffect
              key={index}
              iconUrl={effect.iconUrl}
              spell={effect.spell ?? undefined}
              trigger={effect.trigger}
            />
          ))}
        </ul>
      ) : null}
      <Link
        className="entity-link font-semibold"
        href={`/items/${summary.slug}`}
      >
        Full item details →
        {summary.remainingEffects > 0
          ? ` (${summary.remainingEffects} more ${summary.remainingEffects === 1 ? "effect" : "effects"})`
          : ""}
      </Link>
    </article>
  );
}
