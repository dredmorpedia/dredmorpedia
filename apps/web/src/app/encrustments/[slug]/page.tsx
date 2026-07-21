import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  entityRouteSlugs,
  matchesEntityRoute,
  type Item,
  type ItemReference,
} from "@dredmorpedia/domain";

import { ProvenanceCard } from "@/components/provenance-card";
import { loadArtifact, loadDiagnostics } from "@/lib/artifact";
import {
  signedStatModifierValue,
  statModifierLabel,
} from "@/lib/stat-modifiers";

export const dynamicParams = false;

function titleCase(value: string): string {
  return value
    .split(/[-_ ]+/)
    .map(
      (part) => `${part.slice(0, 1).toLocaleUpperCase("en")}${part.slice(1)}`,
    )
    .join(" ");
}

function powerFrequency(chance: number | null): string {
  return chance === null
    ? "No chance specified"
    : `${new Intl.NumberFormat("en", {
        style: "percent",
        maximumFractionDigits: 2,
      }).format(chance)} chance`;
}

function EncrustmentIngredients({
  references,
  itemsById,
}: {
  references: ItemReference[];
  itemsById: ReadonlyMap<string, Item>;
}) {
  if (references.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No normalized ingredients.
      </p>
    );
  }

  return (
    <ul className="relation-list recipe-reference-list">
      {references.map((reference, index) => {
        const item = reference.itemId
          ? itemsById.get(reference.itemId)
          : undefined;
        return (
          <li key={`${reference.itemKey}:${index}`}>
            <span className="recipe-reference-name">
              {item ? (
                <Link className="entity-link" href={`/items/${item.slug}`}>
                  {reference.itemName}
                </Link>
              ) : (
                <span>{reference.itemName}</span>
              )}
              {!item ? <small>Unresolved item</small> : null}
            </span>
            <strong>Uses {reference.amount}</strong>
          </li>
        );
      })}
    </ul>
  );
}

export function generateStaticParams() {
  return loadArtifact().entities.encrustments.flatMap((encrustment) =>
    entityRouteSlugs(encrustment).map((slug) => ({ slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const encrustment = loadArtifact().entities.encrustments.find((entry) =>
    matchesEntityRoute(entry, slug),
  );
  return encrustment
    ? {
        title: encrustment.name,
        description:
          encrustment.description ||
          `${titleCase(encrustment.tool)} encrustment with normalized ingredients and applicability.`,
        ...(slug === encrustment.slug
          ? {}
          : { robots: { index: false, follow: true } }),
      }
    : { title: "Encrustment not found" };
}

export default async function EncrustmentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artifact = loadArtifact();
  const encrustment = artifact.entities.encrustments.find((entry) =>
    matchesEntityRoute(entry, slug),
  );
  if (!encrustment) {
    notFound();
  }

  const diagnostics = loadDiagnostics().filter((entry) =>
    encrustment.diagnosticIds.includes(entry.id),
  );
  const itemsById = new Map(
    artifact.entities.items.map((item) => [item.id, item]),
  );
  const spellsById = new Map(
    artifact.entities.spells.map((spell) => [spell.id, spell]),
  );
  const sourceLabels = new Map(
    artifact.sources.map((source) => [source.id, source.label]),
  );
  const isAlias = slug !== encrustment.slug;
  const tool = titleCase(encrustment.tool);

  return (
    <article className="detail-page">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/">Items</Link>
        <span aria-hidden="true">/</span>
        <span>Encrustments</span>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{encrustment.name}</span>
      </nav>

      {isAlias ? (
        <aside className="alias-note" aria-labelledby="alias-heading">
          <div>
            <p className="eyebrow">Alias route</p>
            <h2 id="alias-heading" className="font-semibold">
              This alternate URL resolves to {encrustment.name}
            </h2>
          </div>
          <Link
            className="entity-link"
            href={`/encrustments/${encrustment.slug}`}
          >
            Open canonical URL
          </Link>
        </aside>
      ) : null}

      <header className="detail-header">
        <div>
          <p className="eyebrow">{tool} encrustment</p>
          <h1 className="detail-title">{encrustment.name}</h1>
          <p className="detail-copy">
            {encrustment.description ||
              `Normalized encrusting requirements from ${tool.toLocaleLowerCase("en")} data.`}
          </p>
        </div>
        <dl className="recipe-facts">
          <div>
            <dt>Required skill</dt>
            <dd>
              {encrustment.skillLevel > 0
                ? encrustment.skillLevel
                : "No requirement"}
            </dd>
          </div>
          <div>
            <dt>Discovery</dt>
            <dd>
              {encrustment.hidden
                ? "Hidden encrustment"
                : "Visible encrustment"}
            </dd>
          </div>
          <div>
            <dt>Instability</dt>
            <dd>
              {encrustment.instability > 0
                ? `+${encrustment.instability}`
                : encrustment.instability}
            </dd>
          </div>
        </dl>
      </header>

      <div className="detail-grid">
        <section className="detail-card" aria-labelledby="ingredients-heading">
          <h2 id="ingredients-heading" className="section-title-sm">
            Ingredients
          </h2>
          <EncrustmentIngredients
            references={encrustment.inputs}
            itemsById={itemsById}
          />
        </section>

        <section className="detail-card" aria-labelledby="slots-heading">
          <h2 id="slots-heading" className="section-title-sm">
            Applies to
          </h2>
          {encrustment.slots.length > 0 ? (
            <ul className="encrustment-slot-list">
              {encrustment.slots.map((slot) => (
                <li key={slot} className="category-chip">
                  {titleCase(slot)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized equipment slots.
            </p>
          )}
        </section>

        <section className="detail-card" aria-labelledby="outcomes-heading">
          <h2 id="outcomes-heading" className="section-title-sm">
            Outcomes
          </h2>
          {encrustment.modifiers.length > 0 ||
          encrustment.powers.length > 0 ||
          encrustment.appearanceDescriptors.length > 0 ? (
            <div className="relationship-groups">
              {encrustment.modifiers.length > 0 ? (
                <section aria-labelledby="modifiers-heading">
                  <h3 id="modifiers-heading" className="relationship-title">
                    Modifiers
                  </h3>
                  <dl className="stat-list">
                    {encrustment.modifiers.map((modifier, index) => (
                      <div
                        key={`${modifier.kind}:${modifier.sourceKey}:${index}`}
                      >
                        <dt>{statModifierLabel(modifier)}</dt>
                        <dd>{signedStatModifierValue(modifier.amount)}</dd>
                      </div>
                    ))}
                  </dl>
                  {encrustment.modifiers.some(
                    (modifier) =>
                      modifier.kind === "primary" ||
                      modifier.kind === "secondary",
                  ) ? (
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      Primary and secondary modifiers retain their numeric game
                      stat IDs until an approved standalone stat-definition
                      source is selected.
                    </p>
                  ) : null}
                </section>
              ) : null}
              {encrustment.powers.length > 0 ? (
                <section aria-labelledby="powers-heading">
                  <h3 id="powers-heading" className="relationship-title">
                    Power hooks
                  </h3>
                  <ul className="relation-list">
                    {encrustment.powers.map((power, index) => (
                      <li key={`${power.name}:${index}`}>
                        <strong>{power.name}</strong>
                        <span>{powerFrequency(power.chance)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {encrustment.appearanceDescriptors.length > 0 ? (
                <section aria-labelledby="appearance-heading">
                  <h3 id="appearance-heading" className="relationship-title">
                    Appearance descriptors
                  </h3>
                  <ul className="encrustment-descriptor-list">
                    {encrustment.appearanceDescriptors.map(
                      (descriptor, index) => (
                        <li
                          key={`${descriptor}:${index}`}
                          className="category-chip"
                        >
                          {descriptor}
                        </li>
                      ),
                    )}
                  </ul>
                </section>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized direct outcomes.
            </p>
          )}
        </section>

        <section
          className="detail-card"
          aria-labelledby="instability-effects-heading"
        >
          <h2 id="instability-effects-heading" className="section-title-sm">
            Shared instability pool
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            These definitions are stored outside individual encrustments. The
            source provides names and spell references, but no effect weights,
            per-encrustment assignments, or complete risk formula.
          </p>
          {artifact.encrustmentInstabilityEffects.length > 0 ? (
            <details className="instability-pool-details">
              <summary>
                Show {artifact.encrustmentInstabilityEffects.length} effect
                definitions
              </summary>
              <ul className="relation-list instability-effect-list">
                {artifact.encrustmentInstabilityEffects.map((effect) => {
                  const spell = effect.spellId
                    ? spellsById.get(effect.spellId)
                    : undefined;
                  return (
                    <li
                      key={`${effect.name}:${effect.spellKey}:${effect.provenance.sourceId}:${effect.provenance.line}`}
                    >
                      <span className="instability-effect-name">
                        <strong>{effect.name}</strong>
                        <small
                          className={
                            spell
                              ? "trigger-resolution"
                              : "trigger-resolution trigger-resolution-unresolved"
                          }
                        >
                          {spell
                            ? `Resolved ${spell.spellType} spell`
                            : "Unresolved spell reference"}
                          {" · "}
                          {sourceLabels.get(effect.provenance.sourceId) ??
                            effect.provenance.sourceId}
                        </small>
                      </span>
                      {spell ? (
                        <Link
                          className="entity-link font-semibold"
                          href={`/spells/${spell.slug}`}
                        >
                          {spell.name}
                        </Link>
                      ) : (
                        <strong>{effect.spellName}</strong>
                      )}
                    </li>
                  );
                })}
              </ul>
            </details>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No shared instability effects are defined for this dataset.
            </p>
          )}
        </section>

        <ProvenanceCard
          artifact={artifact}
          entity={encrustment}
          headingId="encrustment-provenance-heading"
        />

        <section
          className="detail-card"
          aria-labelledby="encrustment-diagnostics-heading"
        >
          <h2 id="encrustment-diagnostics-heading" className="section-title-sm">
            Diagnostics
          </h2>
          {diagnostics.length > 0 ? (
            <ul className="diagnostic-list">
              {diagnostics.map((diagnostic) => (
                <li key={diagnostic.id}>
                  <span className={`severity severity-${diagnostic.severity}`}>
                    {diagnostic.severity}
                  </span>
                  <span>{diagnostic.message}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No diagnostics are attached to the active encrustment.
            </p>
          )}
        </section>
      </div>
    </article>
  );
}
