import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  entityRouteSlugs,
  matchesEntityRoute,
  type MonsterSpellTriggerKind,
} from "@dredmorpedia/domain";

import { ProvenanceCard } from "@/components/provenance-card";
import { loadArtifact, loadDiagnostics } from "@/lib/artifact";
import {
  signedStatModifierValue,
  statModifierLabel,
} from "@/lib/stat-modifiers";

function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("en") + part.slice(1))
    .join(" ");
}

function sourceFlagLabel(value: boolean | null): string {
  return value === null ? "Not supplied" : value ? "Enabled" : "Disabled";
}

function presentationReferenceLabel(value: object | null): string {
  if (value === null) {
    return "Not supplied";
  }
  const count = Object.values(value).filter(
    (reference) => typeof reference === "string",
  ).length;
  return count === 0
    ? "Declared without recognized references"
    : `${count} ${count === 1 ? "reference" : "references"} supplied`;
}

function soundEffectCoverageLabel(
  soundEffects: {
    attack: string | null;
    death: string | null;
    hit: string | null;
    spell: string | null;
    digIn: string | null;
    digOut: string | null;
  } | null,
): string {
  if (soundEffects === null) {
    return "Not supplied";
  }
  const labels = [
    ["attack", soundEffects.attack],
    ["death", soundEffects.death],
    ["hit", soundEffects.hit],
    ["spell", soundEffects.spell],
    ["dig in", soundEffects.digIn],
    ["dig out", soundEffects.digOut],
  ]
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(([label]) => label);
  return labels.length > 0
    ? labels.join(", ")
    : "Declared without recognized references";
}

const monsterTriggerLabels: Readonly<Record<MonsterSpellTriggerKind, string>> =
  {
    "on-hit": "When its attack hits",
    "cast-when-aware": "When aware of the player",
    "on-death": "When defeated",
    "dash-hit": "When a dash hits",
    "dash-miss": "When a dash misses",
    charge: "During a charge",
  };

export const dynamicParams = false;

export function generateStaticParams() {
  return loadArtifact().entities.monsters.flatMap((monster) =>
    entityRouteSlugs(monster).map((slug) => ({ slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const monster = loadArtifact().entities.monsters.find((entry) =>
    matchesEntityRoute(entry, slug),
  );
  return monster
    ? {
        title: monster.name,
        description:
          monster.description ||
          `${monster.taxonomy || "Unclassified"} monster profile and source provenance.`,
        ...(slug === monster.slug
          ? {}
          : { robots: { index: false, follow: true } }),
      }
    : { title: "Monster not found" };
}

export default async function MonsterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artifact = loadArtifact();
  const monster = artifact.entities.monsters.find((entry) =>
    matchesEntityRoute(entry, slug),
  );
  if (!monster) {
    notFound();
  }

  const parent = monster.inheritsId
    ? artifact.entities.monsters.find(
        (entry) => entry.id === monster.inheritsId,
      )
    : undefined;
  const variants = artifact.entities.monsters.filter(
    (entry) => entry.inheritsId === monster.id,
  );
  const spellsById = new Map(
    artifact.entities.spells.map((spell) => [spell.id, spell]),
  );
  const itemsById = new Map(
    artifact.entities.items.map((item) => [item.id, item]),
  );
  const diagnostics = loadDiagnostics().filter((entry) =>
    monster.diagnosticIds.includes(entry.id),
  );
  const isAlias = slug !== monster.slug;
  const encounterGroup = monster.special
    ? "Special monster"
    : monster.depth === null
      ? "Unknown dungeon depth"
      : `Dungeon level ${monster.depth}`;

  return (
    <article className="detail-page">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/">Items</Link>
        <span aria-hidden="true">/</span>
        <span>Monsters</span>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{monster.name}</span>
      </nav>

      {isAlias ? (
        <aside className="alias-note" aria-labelledby="alias-heading">
          <div>
            <p className="eyebrow">Alias route</p>
            <h2 id="alias-heading" className="font-semibold">
              This alternate URL resolves to {monster.name}
            </h2>
          </div>
          <Link className="entity-link" href={`/monsters/${monster.slug}`}>
            Open canonical URL
          </Link>
        </aside>
      ) : null}

      <header className="detail-header">
        <div>
          <p className="eyebrow">
            {monster.taxonomy || "Unclassified monster"}
          </p>
          <h1 className="detail-title">{monster.name}</h1>
          <p className="detail-copy">
            {monster.description || "No normalized monster description."}
          </p>
        </div>
        <dl className="price-block">
          <div>
            <dt>Encounter group</dt>
            <dd>{encounterGroup}</dd>
          </div>
          <div>
            <dt>Stat bonuses</dt>
            <dd>{monster.modifiers.length}</dd>
          </div>
        </dl>
      </header>

      <div className="detail-grid">
        <section className="detail-card" aria-labelledby="profile-heading">
          <h2 id="profile-heading" className="section-title-sm">
            Combat profile
          </h2>
          <dl className="stat-list">
            <div>
              <dt>Fighter level</dt>
              <dd>{monster.archetypeLevels.fighter}</dd>
            </div>
            <div>
              <dt>Rogue level</dt>
              <dd>{monster.archetypeLevels.rogue}</dd>
            </div>
            <div>
              <dt>Wizard level</dt>
              <dd>{monster.archetypeLevels.wizard}</dd>
            </div>
            <div>
              <dt>Experience value</dt>
              <dd>{monster.experienceValue ?? "Not supplied"}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            These are normalized source values. Derived combat totals are not
            calculated until their formulas are independently verified.
          </p>
        </section>

        <section className="detail-card" aria-labelledby="bonuses-heading">
          <h2 id="bonuses-heading" className="section-title-sm">
            Stat bonuses
          </h2>
          {monster.modifiers.length > 0 ? (
            <dl className="stat-list">
              {monster.modifiers.map((modifier) => (
                <div key={`${modifier.kind}:${modifier.sourceKey}`}>
                  <dt>{statModifierLabel(modifier)}</dt>
                  <dd>{signedStatModifierValue(modifier.amount)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized stat bonuses.
            </p>
          )}
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Bonuses inherited from a parent monster are included; matching
            values declared by this monster take precedence.
          </p>
        </section>

        <section className="detail-card" aria-labelledby="ai-heading">
          <h2 id="ai-heading" className="section-title-sm">
            AI source metadata
          </h2>
          <dl className="stat-list">
            <div>
              <dt>Aggressiveness</dt>
              <dd>{monster.ai.aggressiveness ?? "Not supplied"}</dd>
            </div>
            <div>
              <dt>Span</dt>
              <dd>{monster.ai.span ?? "Not supplied"}</dd>
            </div>
            <div>
              <dt>Invisible source flag</dt>
              <dd>{sourceFlagLabel(monster.ai.invisible)}</dd>
            </div>
            <div>
              <dt>Chicken source flag</dt>
              <dd>{sourceFlagLabel(monster.ai.chicken)}</dd>
            </div>
            <div>
              <dt>Can charm source flag</dt>
              <dd>{sourceFlagLabel(monster.ai.canCharm)}</dd>
            </div>
            <div>
              <dt>Can paralyze source flag</dt>
              <dd>{sourceFlagLabel(monster.ai.canParalyze)}</dd>
            </div>
            <div>
              <dt>Steal gold source flag</dt>
              <dd>{sourceFlagLabel(monster.ai.stealGold)}</dd>
            </div>
            <div>
              <dt>Steal percentage</dt>
              <dd>
                {monster.ai.stealPercentage === null
                  ? "Not supplied"
                  : `${monster.ai.stealPercentage}%`}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            These are source values. Their gameplay behavior is not inferred.
          </p>
        </section>

        <section className="detail-card" aria-labelledby="sight-heading">
          <h2 id="sight-heading" className="section-title-sm">
            Sight source metadata
          </h2>
          <dl className="stat-list">
            <div>
              <dt>Sight cone</dt>
              <dd>{monster.sight.cone ?? "Not supplied"}</dd>
            </div>
            <div>
              <dt>Sight modifier</dt>
              <dd>{monster.sight.modifier ?? "Not supplied"}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            These local source values are shown without inferring their gameplay
            behavior or inheriting values from a parent monster.
          </p>
        </section>

        <section className="detail-card" aria-labelledby="movement-heading">
          <h2 id="movement-heading" className="section-title-sm">
            Movement source metadata
          </h2>
          <div className="relationship-groups">
            <section aria-labelledby="dig-movement-heading">
              <h3 id="dig-movement-heading" className="relationship-title">
                Dig
              </h3>
              {monster.movement.dig ? (
                <dl className="stat-list">
                  <div>
                    <dt>Chance</dt>
                    <dd>
                      {monster.movement.dig.chance === null
                        ? "Not supplied"
                        : `${monster.movement.dig.chance}%`}
                    </dd>
                  </div>
                  <div>
                    <dt>Ambush chance</dt>
                    <dd>
                      {monster.movement.dig.ambushChance === null
                        ? "Not supplied"
                        : `${monster.movement.dig.ambushChance}%`}
                    </dd>
                  </div>
                  <div>
                    <dt>Blocked chance</dt>
                    <dd>
                      {monster.movement.dig.blockedChance === null
                        ? "Not supplied"
                        : `${monster.movement.dig.blockedChance}%`}
                    </dd>
                  </div>
                  <div>
                    <dt>Minimum turns</dt>
                    <dd>
                      {monster.movement.dig.minimumTurns ?? "Not supplied"}
                    </dd>
                  </div>
                  <div>
                    <dt>Maximum turns</dt>
                    <dd>
                      {monster.movement.dig.maximumTurns ?? "Not supplied"}
                    </dd>
                  </div>
                  <div>
                    <dt>Minimum distance</dt>
                    <dd>
                      {monster.movement.dig.minimumDistance ?? "Not supplied"}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">Not supplied</p>
              )}
            </section>
            <section aria-labelledby="dash-movement-heading">
              <h3 id="dash-movement-heading" className="relationship-title">
                Dash
              </h3>
              {monster.movement.dash ? (
                <dl className="stat-list">
                  <div>
                    <dt>Chance</dt>
                    <dd>
                      {monster.movement.dash.chance === null
                        ? "Not supplied"
                        : `${monster.movement.dash.chance}%`}
                    </dd>
                  </div>
                  <div>
                    <dt>Speed</dt>
                    <dd>{monster.movement.dash.speed ?? "Not supplied"}</dd>
                  </div>
                  <div>
                    <dt>Minimum distance</dt>
                    <dd>
                      {monster.movement.dash.minimumDistance ?? "Not supplied"}
                    </dd>
                  </div>
                  <div>
                    <dt>Interruptible source flag</dt>
                    <dd>
                      {sourceFlagLabel(monster.movement.dash.interruptible)}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">Not supplied</p>
              )}
            </section>
            <section aria-labelledby="charge-movement-heading">
              <h3 id="charge-movement-heading" className="relationship-title">
                Charge
              </h3>
              {monster.movement.charge ? (
                <dl className="stat-list">
                  <div>
                    <dt>Chance</dt>
                    <dd>
                      {monster.movement.charge.chance === null
                        ? "Not supplied"
                        : `${monster.movement.charge.chance}%`}
                    </dd>
                  </div>
                  <div>
                    <dt>Range</dt>
                    <dd>{monster.movement.charge.range ?? "Not supplied"}</dd>
                  </div>
                  <div>
                    <dt>Turns</dt>
                    <dd>{monster.movement.charge.turns ?? "Not supplied"}</dd>
                  </div>
                  <div>
                    <dt>Interruptible source flag</dt>
                    <dd>
                      {sourceFlagLabel(monster.movement.charge.interruptible)}
                    </dd>
                  </div>
                  <div>
                    <dt>Blocks action source flag</dt>
                    <dd>
                      {sourceFlagLabel(monster.movement.charge.blocksAction)}
                    </dd>
                  </div>
                  <div>
                    <dt>Targets self source flag</dt>
                    <dd>
                      {sourceFlagLabel(monster.movement.charge.targetsSelf)}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">Not supplied</p>
              )}
            </section>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            These local declarations are shown as source metadata. They do not
            inherit from a parent monster, and no complete movement behavior is
            inferred from them.
          </p>
        </section>

        <section className="detail-card" aria-labelledby="presentation-heading">
          <h2 id="presentation-heading" className="section-title-sm">
            Presentation source coverage
          </h2>
          <dl className="provenance-list">
            <div>
              <dt>Sound effects</dt>
              <dd>
                {soundEffectCoverageLabel(monster.presentation.soundEffects)}
              </dd>
            </div>
            <div>
              <dt>Attack animation</dt>
              <dd>{presentationReferenceLabel(monster.presentation.attack)}</dd>
            </div>
            <div>
              <dt>Hit animation</dt>
              <dd>{presentationReferenceLabel(monster.presentation.hit)}</dd>
            </div>
            <div>
              <dt>Death animation</dt>
              <dd>{presentationReferenceLabel(monster.presentation.death)}</dd>
            </div>
            <div>
              <dt>Spell-cast animation</dt>
              <dd>{presentationReferenceLabel(monster.presentation.cast)}</dd>
            </div>
            <div>
              <dt>Beam animation</dt>
              <dd>{presentationReferenceLabel(monster.presentation.beam)}</dd>
            </div>
            <div>
              <dt>Morph animations</dt>
              <dd>{presentationReferenceLabel(monster.presentation.morph)}</dd>
            </div>
            <div>
              <dt>Dig animations</dt>
              <dd>{presentationReferenceLabel(monster.presentation.dig)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            These local declarations do not inherit from a parent monster. Raw
            engine asset references are summarized rather than rendered while
            the asset publication policy remains unresolved.
          </p>
        </section>

        <section className="detail-card" aria-labelledby="spell-hooks-heading">
          <h2 id="spell-hooks-heading" className="section-title-sm">
            Spell hooks
          </h2>
          {monster.triggers.length > 0 ? (
            <ul className="trigger-list">
              {monster.triggers.map((trigger, index) => {
                const spell = trigger.spellId
                  ? spellsById.get(trigger.spellId)
                  : undefined;
                const eventLabel = monsterTriggerLabels[trigger.kind];
                const chanceLabel =
                  trigger.oneChanceIn !== null
                    ? trigger.oneChanceIn === 1
                      ? "Always (1 in 1)"
                      : `1 in ${trigger.oneChanceIn} (about ${trigger.chance}%)`
                    : trigger.chance === null
                      ? "Not supplied"
                      : `${trigger.chance}%`;
                return (
                  <li key={`${trigger.kind}:${trigger.spellKey}:${index}`}>
                    <div className="trigger-summary">
                      <span className="relationship-title">{eventLabel}</span>
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
                        <dd>{chanceLabel}</dd>
                      </div>
                    </dl>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized monster spell hooks.
            </p>
          )}
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            One-in odds remain exact. Approximate percentages are rounded only
            for display; an AI casting chance may inherit from the parent.
            Movement-hook percentages remain uninterpreted source values.
          </p>
        </section>

        <section className="detail-card" aria-labelledby="drops-heading">
          <h2 id="drops-heading" className="section-title-sm">
            Drops on defeat
          </h2>
          {monster.drops.length > 0 ? (
            <ul className="trigger-list">
              {monster.drops.map((drop, index) => {
                const item = drop.itemId
                  ? itemsById.get(drop.itemId)
                  : undefined;
                const dropLabel =
                  drop.itemName ?? titleCase(drop.dropType ?? "unknown");
                const resolution = drop.itemName
                  ? item
                    ? "Resolved item"
                    : "Unresolved item reference"
                  : "Game-defined drop type";
                return (
                  <li
                    key={`${drop.itemKey ?? `type:${drop.dropType}`}:${index}`}
                  >
                    <div className="trigger-summary">
                      <span className="relationship-title">On defeat</span>
                      {item ? (
                        <Link
                          className="entity-link font-semibold"
                          href={`/items/${item.slug}`}
                        >
                          {item.name}
                        </Link>
                      ) : (
                        <strong>{dropLabel}</strong>
                      )}
                      <small
                        className={
                          drop.itemName && !item
                            ? "trigger-resolution trigger-resolution-unresolved"
                            : "trigger-resolution"
                        }
                      >
                        {resolution}
                      </small>
                    </div>
                    <dl className="trigger-facts">
                      <div>
                        <dt>Chance</dt>
                        <dd>
                          {drop.chance === 100
                            ? "Always (100%)"
                            : `${drop.chance}%`}
                        </dd>
                      </div>
                    </dl>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized monster drops.
            </p>
          )}
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Drops are direct declarations for this monster and do not inherit
            from its parent. Type-driven drops remain visible without
            fabricating an item link.
          </p>
        </section>

        <section className="detail-card" aria-labelledby="family-heading">
          <h2 id="family-heading" className="section-title-sm">
            Monster family
          </h2>
          {parent || variants.length > 0 ? (
            <div className="relationship-groups">
              {parent ? (
                <section aria-labelledby="parent-heading">
                  <h3 id="parent-heading" className="relationship-title">
                    Inherits from
                  </h3>
                  <ul className="relation-list">
                    <li>
                      <Link
                        className="entity-link font-semibold"
                        href={`/monsters/${parent.slug}`}
                      >
                        {parent.name}
                      </Link>
                      <span>Resolved parent monster</span>
                    </li>
                  </ul>
                </section>
              ) : null}
              {variants.length > 0 ? (
                <section aria-labelledby="variants-heading">
                  <h3 id="variants-heading" className="relationship-title">
                    Direct variants
                  </h3>
                  <ul className="relation-list">
                    {variants.map((variant) => (
                      <li key={variant.id}>
                        <Link
                          className="entity-link font-semibold"
                          href={`/monsters/${variant.slug}`}
                        >
                          {variant.name}
                        </Link>
                        <span>{variant.taxonomy || "Unclassified"}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No resolved parent or direct variants.
            </p>
          )}
        </section>

        <section className="detail-card" aria-labelledby="appearance-heading">
          <h2 id="appearance-heading" className="section-title-sm">
            Source appearance
          </h2>
          <dl className="provenance-list">
            <div>
              <dt>Sprite reference</dt>
              <dd>{monster.iconPath ?? "Not supplied"}</dd>
            </div>
            <div>
              <dt>Palette</dt>
              <dd>{monster.paletteName ?? "Not supplied"}</dd>
            </div>
            <div>
              <dt>Palette tint</dt>
              <dd>{monster.paletteTint ?? "Not supplied"}</dd>
            </div>
          </dl>
        </section>

        <ProvenanceCard
          artifact={artifact}
          entity={monster}
          headingId="monster-provenance-heading"
        />

        <section
          className="detail-card"
          aria-labelledby="monster-diagnostics-heading"
        >
          <h2 id="monster-diagnostics-heading" className="section-title-sm">
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
              No diagnostics are attached to the active monster.
            </p>
          )}
        </section>
      </div>
    </article>
  );
}
