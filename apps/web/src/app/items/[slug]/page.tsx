import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  entityRouteSlugs,
  itemCategoryLabel,
  itemEncrustmentRelationships,
  itemMonsterDropRelationships,
  itemRecipeRelationships,
  itemSkillLoadoutRelationships,
  matchesEntityRoute,
} from "@dredmorpedia/domain";

import { ProvenanceCard } from "@/components/provenance-card";
import { loadArtifact, loadDiagnostics } from "@/lib/artifact";
import { spellTriggerLabels } from "@/lib/spell-triggers";
import {
  signedStatModifierValue,
  statModifierLabel,
} from "@/lib/stat-modifiers";

export const dynamicParams = false;

export function generateStaticParams() {
  return loadArtifact().entities.items.flatMap((item) =>
    entityRouteSlugs(item).map((slug) => ({ slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = loadArtifact().entities.items.find((entry) =>
    matchesEntityRoute(entry, slug),
  );
  return item
    ? {
        title: item.name,
        description: item.description,
        ...(slug === item.slug
          ? {}
          : { robots: { index: false, follow: true } }),
      }
    : { title: "Item not found" };
}

export default async function ItemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artifact = loadArtifact();
  const item = artifact.entities.items.find((entry) =>
    matchesEntityRoute(entry, slug),
  );
  if (!item) {
    notFound();
  }

  const diagnostics = loadDiagnostics().filter((entry) =>
    item.diagnosticIds.includes(entry.id),
  );
  const recipeRelationships = itemRecipeRelationships(
    artifact.entities.recipes,
    item.id,
  );
  const craftedBy = recipeRelationships.filter(
    (relationship) => relationship.outputAmount > 0,
  );
  const usedToCraft = recipeRelationships.filter(
    (relationship) => relationship.inputAmount > 0,
  );
  const encrustmentRelationships = itemEncrustmentRelationships(
    artifact.entities.encrustments,
    item.id,
  );
  const skillLoadoutRelationships = itemSkillLoadoutRelationships(
    artifact.entities.skills,
    item.id,
  );
  const monsterDropRelationships = itemMonsterDropRelationships(
    artifact.entities.monsters,
    item.id,
  );
  const statsById = new Map(
    artifact.entities.stats.map((stat) => [stat.id, stat]),
  );
  const spellsById = new Map(
    artifact.entities.spells.map((spell) => [spell.id, spell]),
  );
  const isAlias = slug !== item.slug;

  return (
    <article className="detail-page">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/">Items</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{item.name}</span>
      </nav>

      {isAlias ? (
        <aside className="alias-note" aria-labelledby="alias-heading">
          <div>
            <p className="eyebrow">Alias route</p>
            <h2 id="alias-heading" className="font-semibold">
              This alternate URL resolves to {item.name}
            </h2>
          </div>
          <Link className="entity-link" href={`/items/${item.slug}`}>
            Open canonical URL
          </Link>
        </aside>
      ) : null}

      <header className="detail-header">
        <div>
          <p className="eyebrow">{itemCategoryLabel(item.category)}</p>
          <h1 className="detail-title">{item.name}</h1>
          <p className="detail-copy">{item.description}</p>
        </div>
        <dl className="price-block">
          <div>
            <dt>Value</dt>
            <dd>
              {item.price === null
                ? "Unknown"
                : `${new Intl.NumberFormat("en").format(item.price)} zorkmids`}
            </dd>
          </div>
          <div>
            <dt>Quality</dt>
            <dd>{item.quality}</dd>
          </div>
          {item.artifacts.length > 0 ? (
            <div>
              <dt>Artifact quality</dt>
              <dd>
                {item.artifacts
                  .map((artifact) => artifact.quality ?? "Unavailable")
                  .join(", ")}
              </dd>
            </div>
          ) : null}
        </dl>
      </header>

      <div className="detail-grid">
        <section className="detail-card" aria-labelledby="item-use-heading">
          <h2 id="item-use-heading" className="section-title-sm">
            Use metadata
          </h2>
          {item.recoveries.length > 0 || item.chargeRanges.length > 0 ? (
            <div className="relationship-groups">
              {item.recoveries.length > 0 ? (
                <section aria-labelledby="item-recovery-heading">
                  <h3 id="item-recovery-heading" className="relationship-title">
                    Recovery
                  </h3>
                  <dl className="stat-list">
                    {item.recoveries.flatMap((recovery, recoveryIndex) => [
                      <div key={`${recovery.resource}:${recoveryIndex}`}>
                        <dt>
                          {recovery.resource === "life" ? "Life" : "Mana"}
                        </dt>
                        <dd>{recovery.amount ?? "Unavailable"}</dd>
                      </div>,
                      ...recovery.sourceFlags.map((flag, flagIndex) => (
                        <div
                          key={`${recovery.resource}:${recoveryIndex}:${flag.sourceKey}:${flagIndex}`}
                        >
                          <dt>Source flag</dt>
                          <dd>
                            <code>
                              {flag.sourceKey}={flag.value}
                            </code>
                          </dd>
                        </div>
                      )),
                    ])}
                  </dl>
                </section>
              ) : null}
              {item.chargeRanges.length > 0 ? (
                <section aria-labelledby="item-charges-heading">
                  <h3 id="item-charges-heading" className="relationship-title">
                    Wand charges
                  </h3>
                  <div className="relationship-groups">
                    {item.chargeRanges.map((range, index) => (
                      <dl className="stat-list" key={index}>
                        <div>
                          <dt>Minimum</dt>
                          <dd>{range.minimum ?? "Unavailable"}</dd>
                        </div>
                        <div>
                          <dt>Maximum</dt>
                          <dd>{range.maximum ?? "Unavailable"}</dd>
                        </div>
                      </dl>
                    ))}
                  </div>
                </section>
              ) : null}
              <p className="supporting-note">
                These are direct source values; recovery timing and charge-use
                behavior are not inferred.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized recovery or charge metadata.
            </p>
          )}
        </section>

        <section className="detail-card" aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="section-title-sm">
            Stats
          </h2>
          {item.stats.length > 0 || item.modifiers.length > 0 ? (
            <div className="relationship-groups">
              {item.stats.length > 0 ? (
                <section aria-labelledby="named-stats-heading">
                  <h3 id="named-stats-heading" className="relationship-title">
                    Named stats
                  </h3>
                  <dl className="stat-list">
                    {item.stats.map((stat) => (
                      <div key={stat.statKey}>
                        <dt>
                          {stat.statId && statsById.get(stat.statId) ? (
                            <Link
                              className="entity-link"
                              href={`/stats/${statsById.get(stat.statId)?.slug}`}
                            >
                              {stat.statName}
                            </Link>
                          ) : (
                            stat.statName
                          )}
                        </dt>
                        <dd>
                          {stat.amount > 0 ? `+${stat.amount}` : stat.amount}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ) : null}
              {item.modifiers.length > 0 ? (
                <section aria-labelledby="item-modifiers-heading">
                  <h3
                    id="item-modifiers-heading"
                    className="relationship-title"
                  >
                    Direct modifiers
                  </h3>
                  <dl className="stat-list">
                    {item.modifiers.map((modifier, index) => (
                      <div
                        key={`${modifier.kind}:${modifier.sourceKey}:${index}`}
                      >
                        <dt>{statModifierLabel(modifier)}</dt>
                        <dd>{signedStatModifierValue(modifier.amount)}</dd>
                      </div>
                    ))}
                  </dl>
                  {item.modifiers.some(
                    (modifier) =>
                      modifier.kind === "primary" ||
                      modifier.kind === "secondary",
                  ) ? (
                    <p className="supporting-note">
                      Primary and secondary modifiers retain their numeric game
                      stat IDs because this dataset has no approved standalone
                      definitions for them.
                    </p>
                  ) : null}
                </section>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized stat values or direct modifiers.
            </p>
          )}
        </section>

        <section className="detail-card" aria-labelledby="triggers-heading">
          <h2 id="triggers-heading" className="section-title-sm">
            Triggers
          </h2>
          {item.triggers.length > 0 ? (
            <ul className="trigger-list">
              {item.triggers.map((trigger, index) => {
                const spell = trigger.spellId
                  ? spellsById.get(trigger.spellId)
                  : undefined;
                return (
                  <li key={`${trigger.kind}:${trigger.spellKey}:${index}`}>
                    <div className="trigger-summary">
                      <span className="relationship-title">
                        {spellTriggerLabels[trigger.kind]}
                      </span>
                      {spell ? (
                        <Link
                          className="entity-link font-semibold"
                          href={`/spells/${spell.slug}`}
                        >
                          {spell.name}
                        </Link>
                      ) : (
                        <strong>{trigger.spellName}</strong>
                      )}
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
                      </small>
                    </div>
                    <dl className="trigger-facts">
                      <div>
                        <dt>Chance</dt>
                        <dd>
                          {trigger.chance === null
                            ? "Always"
                            : `${trigger.chance}%`}
                        </dd>
                      </div>
                      {trigger.delay > 0 ? (
                        <div>
                          <dt>Delay</dt>
                          <dd>{trigger.delay} turns</dd>
                        </div>
                      ) : null}
                      {trigger.duration > 0 ? (
                        <div>
                          <dt>Duration</dt>
                          <dd>{trigger.duration} turns</dd>
                        </div>
                      ) : null}
                      {trigger.monsterTaxonomy ? (
                        <div>
                          <dt>Taxonomy</dt>
                          <dd>{trigger.monsterTaxonomy}</dd>
                        </div>
                      ) : null}
                      {trigger.unresistable ? (
                        <div>
                          <dt>Resistance</dt>
                          <dd>Unresistable</dd>
                        </div>
                      ) : null}
                      {trigger.sourceFlags.map((flag, flagIndex) => (
                        <div key={`${flag.sourceKey}:${flagIndex}`}>
                          <dt>Source flag</dt>
                          <dd>
                            <code>
                              {flag.sourceKey}={flag.value}
                            </code>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized item triggers.
            </p>
          )}
        </section>

        <ProvenanceCard
          artifact={artifact}
          entity={item}
          headingId="provenance-heading"
        />

        <section className="detail-card" aria-labelledby="relations-heading">
          <h2 id="relations-heading" className="section-title-sm">
            Crafting relationships
          </h2>
          {recipeRelationships.length > 0 ? (
            <div className="relationship-groups">
              {craftedBy.length > 0 ? (
                <section aria-labelledby="crafted-by-heading">
                  <h3 id="crafted-by-heading" className="relationship-title">
                    Crafted by
                  </h3>
                  <ul className="relation-list">
                    {craftedBy.map(({ recipe, outputAmount }) => (
                      <li key={recipe.id}>
                        <Link
                          className="entity-link font-semibold"
                          href={`/recipes/${recipe.slug}`}
                        >
                          {recipe.name}
                        </Link>
                        <span>Produces {outputAmount}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {usedToCraft.length > 0 ? (
                <section aria-labelledby="used-to-craft-heading">
                  <h3 id="used-to-craft-heading" className="relationship-title">
                    Used to craft
                  </h3>
                  <ul className="relation-list">
                    {usedToCraft.map(({ recipe, inputAmount }) => (
                      <li key={recipe.id}>
                        <Link
                          className="entity-link font-semibold"
                          href={`/recipes/${recipe.slug}`}
                        >
                          {recipe.name}
                        </Link>
                        <span>Uses {inputAmount}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No linked recipes.</p>
          )}
        </section>

        <section
          className="detail-card"
          aria-labelledby="monster-drop-relations-heading"
        >
          <h2 id="monster-drop-relations-heading" className="section-title-sm">
            Monster drop relationships
          </h2>
          {monsterDropRelationships.length > 0 ? (
            <ul className="relation-list">
              {monsterDropRelationships.map(({ monster, drop, dropIndex }) => (
                <li key={`${monster.id}:${dropIndex}`}>
                  <Link
                    className="entity-link font-semibold"
                    href={`/monsters/${monster.slug}`}
                  >
                    {monster.name}
                  </Link>
                  <span>
                    {drop.chance === 100
                      ? "Always on defeat (100%)"
                      : `${drop.chance}% on defeat`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No monster drops reference this item.
            </p>
          )}
        </section>

        <section
          className="detail-card"
          aria-labelledby="encrustment-relations-heading"
        >
          <h2 id="encrustment-relations-heading" className="section-title-sm">
            Encrusting relationships
          </h2>
          {encrustmentRelationships.length > 0 ? (
            <section aria-labelledby="used-to-encrust-heading">
              <h3 id="used-to-encrust-heading" className="relationship-title">
                Used to encrust
              </h3>
              <ul className="relation-list">
                {encrustmentRelationships.map(
                  ({ encrustment, inputAmount }) => (
                    <li key={encrustment.id}>
                      <Link
                        className="entity-link font-semibold"
                        href={`/encrustments/${encrustment.slug}`}
                      >
                        {encrustment.name}
                      </Link>
                      <span>Uses {inputAmount}</span>
                    </li>
                  ),
                )}
              </ul>
            </section>
          ) : (
            <p className="text-sm text-muted-foreground">
              No linked encrustments.
            </p>
          )}
        </section>

        <section
          className="detail-card"
          aria-labelledby="skill-loadout-relations-heading"
        >
          <h2 id="skill-loadout-relations-heading" className="section-title-sm">
            Starting loadout relationships
          </h2>
          {skillLoadoutRelationships.length > 0 ? (
            <ul className="relation-list">
              {skillLoadoutRelationships.map(
                ({ skill, loadout, loadoutIndex }) => (
                  <li key={`${skill.id}:${loadoutIndex}`}>
                    <Link
                      className="entity-link font-semibold"
                      href={`/skills/${skill.slug}`}
                    >
                      {skill.name}
                    </Link>
                    <span>
                      {loadout.amount} ×{" "}
                      {loadout.always ? "always included" : "possible option"}
                    </span>
                  </li>
                ),
              )}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No skill loadouts reference this item.
            </p>
          )}
        </section>

        <section
          className="detail-card"
          aria-labelledby="item-diagnostics-heading"
        >
          <h2 id="item-diagnostics-heading" className="section-title-sm">
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
              No diagnostics are attached to the active entity.
            </p>
          )}
        </section>
      </div>
    </article>
  );
}
