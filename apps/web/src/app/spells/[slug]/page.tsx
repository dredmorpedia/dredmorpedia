import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  entityRouteSlugs,
  matchesEntityRoute,
  spellEffectBacklinks,
  spellEffectChain,
  type MonsterSpellTriggerKind,
} from "@dredmorpedia/domain";

import { ProvenanceCard } from "@/components/provenance-card";
import { loadArtifact, loadDiagnostics } from "@/lib/artifact";
import { sourceFlagLabel, sourceFlagValue } from "@/lib/source-flags";
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

function signedValue(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

const sourceNumber = new Intl.NumberFormat("en", {
  maximumFractionDigits: 4,
});

function manaCostFormula({
  base,
  savvyReduction,
  minimum,
}: {
  base: number | null;
  savvyReduction: number | null;
  minimum: number | null;
}): string {
  if (base === null) {
    return "Base cost unavailable";
  }
  return `${sourceNumber.format(base)}${savvyReduction === null ? "" : ` − (${sourceNumber.format(savvyReduction)} × Savvy)`}${minimum === null ? "" : `, minimum ${sourceNumber.format(minimum)}`}`;
}

const monsterBacklinkLabels: Readonly<Record<MonsterSpellTriggerKind, string>> =
  {
    "on-hit": "On-hit spell",
    "cast-when-aware": "Aware-casting spell",
    "on-death": "On-defeat spell",
    "dash-hit": "Dash-hit spell",
    "dash-miss": "Dash-miss spell",
    charge: "Charge spell",
  };

export function generateStaticParams() {
  return loadArtifact().entities.spells.flatMap((spell) =>
    entityRouteSlugs(spell).map((slug) => ({ slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const spell = loadArtifact().entities.spells.find((entry) =>
    matchesEntityRoute(entry, slug),
  );
  return spell
    ? {
        title: spell.name,
        description:
          spell.description ||
          `${titleCase(spell.spellType)} spell with normalized effects and relationships.`,
        ...(slug === spell.slug
          ? {}
          : { robots: { index: false, follow: true } }),
      }
    : { title: "Spell not found" };
}

export default async function SpellPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artifact = loadArtifact();
  const spell = artifact.entities.spells.find((entry) =>
    matchesEntityRoute(entry, slug),
  );
  if (!spell) {
    notFound();
  }

  const diagnostics = loadDiagnostics().filter((entry) =>
    spell.diagnosticIds.includes(entry.id),
  );
  const spellsById = new Map(
    artifact.entities.spells.map((entry) => [entry.id, entry]),
  );
  const statsById = new Map(
    artifact.entities.stats.map((stat) => [stat.id, stat]),
  );
  const chain = spellEffectChain(artifact.entities.spells, spell.id);
  const spellBacklinks = spellEffectBacklinks(
    artifact.entities.spells,
    spell.id,
  );
  const itemBacklinks = artifact.entities.items.flatMap((item) =>
    item.triggers.flatMap((trigger, triggerIndex) =>
      trigger.spellId === spell.id ? [{ item, trigger, triggerIndex }] : [],
    ),
  );
  const instabilityBacklinks = artifact.encrustmentInstabilityEffects.filter(
    (effect) => effect.spellId === spell.id,
  );
  const abilityBacklinks = artifact.entities.abilities.filter((ability) =>
    ability.spellIds.includes(spell.id),
  );
  const monsterBacklinks = artifact.entities.monsters.flatMap((monster) =>
    monster.triggers.flatMap((trigger, triggerIndex) =>
      trigger.spellId === spell.id ? [{ monster, trigger, triggerIndex }] : [],
    ),
  );
  const backlinkCount =
    spellBacklinks.length +
    itemBacklinks.length +
    instabilityBacklinks.length +
    abilityBacklinks.length +
    monsterBacklinks.length;
  const isAlias = slug !== spell.slug;

  return (
    <article className="detail-page">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/">Items</Link>
        <span aria-hidden="true">/</span>
        <span>Spells</span>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{spell.name}</span>
      </nav>

      {isAlias ? (
        <aside className="alias-note" aria-labelledby="alias-heading">
          <div>
            <p className="eyebrow">Alias route</p>
            <h2 id="alias-heading" className="font-semibold">
              This alternate URL resolves to {spell.name}
            </h2>
          </div>
          <Link className="entity-link" href={`/spells/${spell.slug}`}>
            Open canonical URL
          </Link>
        </aside>
      ) : null}

      <header className="detail-header">
        <div>
          <p className="eyebrow">{titleCase(spell.spellType)} spell</p>
          <h1 className="detail-title">{spell.name}</h1>
          <p className="detail-copy">
            {spell.description || "No normalized spell description."}
          </p>
        </div>
        <dl className="price-block">
          <div>
            <dt>Mana declarations</dt>
            <dd>{spell.manaCosts.length}</dd>
          </div>
          <div>
            <dt>Direct effects</dt>
            <dd>{spell.effects.length}</dd>
          </div>
          <div>
            <dt>Buff declarations</dt>
            <dd>{spell.buffs.length}</dd>
          </div>
        </dl>
      </header>

      <div className="detail-grid">
        <section className="detail-card" aria-labelledby="mana-cost-heading">
          <h2 id="mana-cost-heading" className="section-title-sm">
            Mana cost
          </h2>
          {spell.manaCosts.length > 0 ? (
            <>
              <ul className="trigger-list">
                {spell.manaCosts.map((manaCost, manaCostIndex) => (
                  <li key={manaCostIndex}>
                    <div className="trigger-summary">
                      <span className="relationship-title">Source formula</span>
                      <strong>{manaCostFormula(manaCost)}</strong>
                      <small className="trigger-resolution">
                        Base cost minus the declared Savvy scaling, bounded by
                        the declared minimum when present.
                      </small>
                    </div>
                    <dl className="trigger-facts">
                      <div>
                        <dt>Base</dt>
                        <dd>
                          {manaCost.base === null
                            ? "Unavailable"
                            : sourceNumber.format(manaCost.base)}
                        </dd>
                      </div>
                      <div>
                        <dt>Savvy reduction</dt>
                        <dd>
                          {manaCost.savvyReduction === null
                            ? "Not specified"
                            : `${sourceNumber.format(manaCost.savvyReduction)} × Savvy`}
                        </dd>
                      </div>
                      <div>
                        <dt>Minimum</dt>
                        <dd>
                          {manaCost.minimum === null
                            ? "Not specified"
                            : sourceNumber.format(manaCost.minimum)}
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                These are source parameters. Final in-game rounding is not
                inferred.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized mana requirement.
            </p>
          )}
        </section>

        <section className="detail-card" aria-labelledby="buffs-heading">
          <h2 id="buffs-heading" className="section-title-sm">
            Buffs
          </h2>
          {spell.buffs.length > 0 ? (
            <ul className="trigger-list">
              {spell.buffs.map((buff, buffIndex) => (
                <li key={buffIndex}>
                  <div className="trigger-summary">
                    <span className="relationship-title">
                      Buff declaration {buffIndex + 1}
                    </span>
                    <strong>
                      {buff.duration === null
                        ? "No duration parameter"
                        : `${buff.duration} turn duration`}
                    </strong>
                    <small className="trigger-resolution">
                      Source parameters are preserved without inferring stacking
                      or trigger behavior.
                    </small>
                  </div>
                  <dl className="trigger-facts">
                    {buff.timerMode !== null ? (
                      <div>
                        <dt>Timer mode</dt>
                        <dd>{buff.timerMode}</dd>
                      </div>
                    ) : null}
                    {buff.duration !== null ? (
                      <div>
                        <dt>Duration</dt>
                        <dd>{buff.duration} turns</dd>
                      </div>
                    ) : null}
                    {buff.manaUpkeep !== null ? (
                      <div>
                        <dt>Mana upkeep</dt>
                        <dd>1 mana every {buff.manaUpkeep} turns</dd>
                      </div>
                    ) : null}
                    {buff.currencyUpkeep !== null ? (
                      <div>
                        <dt>Zorkmid upkeep</dt>
                        <dd>{buff.currencyUpkeep} (source parameter)</dd>
                      </div>
                    ) : null}
                    {buff.hitLimit !== null ? (
                      <div>
                        <dt>Hit limit</dt>
                        <dd>{buff.hitLimit} hits</dd>
                      </div>
                    ) : null}
                    {buff.attackLimit !== null ? (
                      <div>
                        <dt>Attack limit</dt>
                        <dd>{buff.attackLimit} attacks</dd>
                      </div>
                    ) : null}
                    {buff.removable !== null ? (
                      <div>
                        <dt>Removable</dt>
                        <dd>{yesNo(buff.removable)}</dd>
                      </div>
                    ) : null}
                    {buff.affectsSelf !== null ? (
                      <div>
                        <dt>Affects self</dt>
                        <dd>{yesNo(buff.affectsSelf)}</dd>
                      </div>
                    ) : null}
                    {buff.resistable !== null ? (
                      <div>
                        <dt>Resistable</dt>
                        <dd>{yesNo(buff.resistable)}</dd>
                      </div>
                    ) : null}
                    {buff.detrimental !== null ? (
                      <div>
                        <dt>Detrimental</dt>
                        <dd>{yesNo(buff.detrimental)}</dd>
                      </div>
                    ) : null}
                    {buff.stackable !== null ? (
                      <div>
                        <dt>Stackable</dt>
                        <dd>{yesNo(buff.stackable)}</dd>
                      </div>
                    ) : null}
                    {buff.allowStacking !== null ? (
                      <div>
                        <dt>Allow stacking</dt>
                        <dd>{yesNo(buff.allowStacking)}</dd>
                      </div>
                    ) : null}
                    {buff.stackLimit !== null ? (
                      <div>
                        <dt>Stack limit</dt>
                        <dd>{buff.stackLimit}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {buff.modifiers.length > 0 ? (
                    <section
                      className="mt-4"
                      aria-labelledby={`buff-${buffIndex}-modifiers-heading`}
                    >
                      <h3
                        id={`buff-${buffIndex}-modifiers-heading`}
                        className="relationship-title"
                      >
                        Direct modifiers
                      </h3>
                      <dl className="stat-list">
                        {buff.modifiers.map((modifier, modifierIndex) => (
                          <div
                            key={`${modifier.kind}:${modifier.sourceKey}:${modifierIndex}`}
                          >
                            <dt>{statModifierLabel(modifier)}</dt>
                            <dd>{signedStatModifierValue(modifier.amount)}</dd>
                          </div>
                        ))}
                      </dl>
                      {buff.modifiers.some(
                        (modifier) =>
                          modifier.kind === "primary" ||
                          modifier.kind === "secondary",
                      ) ? (
                        <p className="mt-3 text-xs leading-5 text-muted-foreground">
                          Primary and secondary modifiers retain their numeric
                          game stat IDs until an approved standalone
                          stat-definition source is selected.
                        </p>
                      ) : null}
                    </section>
                  ) : null}
                  {buff.sourceFlags.length > 0 ? (
                    <section
                      className="mt-4"
                      aria-labelledby={`buff-${buffIndex}-metadata-heading`}
                    >
                      <h3
                        id={`buff-${buffIndex}-metadata-heading`}
                        className="relationship-title"
                      >
                        Additional source metadata
                      </h3>
                      <dl className="stat-list">
                        {buff.sourceFlags.map((flag) => (
                          <div key={`${flag.sourceKey}:${flag.value}`}>
                            <dt>{sourceFlagLabel(flag)}</dt>
                            <dd>{sourceFlagValue(flag)}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized buff declaration.
            </p>
          )}
        </section>

        <section className="detail-card" aria-labelledby="effects-heading">
          <h2 id="effects-heading" className="section-title-sm">
            Effects
          </h2>
          {spell.effects.length > 0 ? (
            <ul className="trigger-list">
              {spell.effects.map((effect, effectIndex) => {
                const targetSpell = effect.spellId
                  ? spellsById.get(effect.spellId)
                  : undefined;
                const targetStat = effect.statId
                  ? statsById.get(effect.statId)
                  : undefined;
                const unresolved =
                  (effect.spellKey && !targetSpell) ||
                  (effect.statKey && !targetStat);
                return (
                  <li key={`${effect.type}:${effectIndex}`}>
                    <div className="trigger-summary">
                      <span className="relationship-title">
                        {titleCase(effect.type)} effect
                      </span>
                      {targetSpell ? (
                        <Link
                          className="entity-link font-semibold"
                          href={`/spells/${targetSpell.slug}`}
                        >
                          {targetSpell.name}
                        </Link>
                      ) : effect.spellKey ? (
                        <strong>{effect.spellName ?? effect.spellKey}</strong>
                      ) : targetStat ? (
                        <Link
                          className="entity-link font-semibold"
                          href={`/stats/${targetStat.slug}`}
                        >
                          {targetStat.name}
                        </Link>
                      ) : effect.statKey ? (
                        <strong>{effect.statName ?? effect.statKey}</strong>
                      ) : (
                        <strong>{titleCase(effect.type)}</strong>
                      )}
                      <small
                        className={
                          unresolved
                            ? "trigger-resolution trigger-resolution-unresolved"
                            : "trigger-resolution"
                        }
                      >
                        {targetSpell
                          ? `Resolved ${targetSpell.spellType} spell target`
                          : effect.spellKey
                            ? "Unresolved spell target"
                            : targetStat
                              ? "Resolved stat target"
                              : effect.statKey
                                ? "Unresolved stat target"
                                : "No entity target"}
                      </small>
                    </div>
                    <dl className="trigger-facts">
                      <div>
                        <dt>Type</dt>
                        <dd>{titleCase(effect.type)}</dd>
                      </div>
                      {effect.amount !== undefined ? (
                        <div>
                          <dt>Amount</dt>
                          <dd>{signedValue(effect.amount)}</dd>
                        </div>
                      ) : null}
                    </dl>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized direct effects.
            </p>
          )}
        </section>

        <section className="detail-card" aria-labelledby="chain-heading">
          <h2 id="chain-heading" className="section-title-sm">
            Effect chain
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Resolved spell targets are expanded once. Cycle and repeated-branch
            markers show where traversal stops.
          </p>
          {chain.length > 0 ? (
            <ul className="trigger-list spell-chain-list">
              {chain.map((step) => {
                const status = step.cycle
                  ? "Cycle detected"
                  : step.alreadyExpanded
                    ? "Already expanded"
                    : step.targetSpell
                      ? `Depth ${step.depth}`
                      : "Unresolved target";
                return (
                  <li
                    key={`${step.sourceSpell.id}:${step.effectIndex}:${step.depth}`}
                  >
                    <div className="trigger-summary">
                      <span className="relationship-title">
                        {titleCase(step.effect.type)} effect
                      </span>
                      <span className="spell-chain-route">
                        <Link
                          className="entity-link font-semibold"
                          href={`/spells/${step.sourceSpell.slug}`}
                        >
                          {step.sourceSpell.name}
                        </Link>
                        <span aria-hidden="true">→</span>
                        {step.targetSpell ? (
                          <Link
                            className="entity-link font-semibold"
                            href={`/spells/${step.targetSpell.slug}`}
                          >
                            {step.targetSpell.name}
                          </Link>
                        ) : (
                          <strong>
                            {step.effect.spellName ?? step.effect.spellKey}
                          </strong>
                        )}
                      </span>
                    </div>
                    <strong
                      className={
                        step.cycle || !step.targetSpell
                          ? "spell-chain-status spell-chain-status-stop"
                          : "spell-chain-status"
                      }
                    >
                      {status}
                    </strong>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No spell-to-spell effects to expand.
            </p>
          )}
        </section>

        <section className="detail-card" aria-labelledby="backlinks-heading">
          <h2 id="backlinks-heading" className="section-title-sm">
            Referenced by
          </h2>
          {backlinkCount > 0 ? (
            <div className="relationship-groups">
              {spellBacklinks.length > 0 ? (
                <section aria-labelledby="spell-backlinks-heading">
                  <h3
                    id="spell-backlinks-heading"
                    className="relationship-title"
                  >
                    Spell effects
                  </h3>
                  <ul className="relation-list">
                    {spellBacklinks.map((backlink) => (
                      <li key={`${backlink.spell.id}:${backlink.effectIndex}`}>
                        <Link
                          className="entity-link font-semibold"
                          href={`/spells/${backlink.spell.slug}`}
                        >
                          {backlink.spell.name}
                        </Link>
                        <span>{titleCase(backlink.effect.type)} effect</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {itemBacklinks.length > 0 ? (
                <section aria-labelledby="item-backlinks-heading">
                  <h3
                    id="item-backlinks-heading"
                    className="relationship-title"
                  >
                    Item triggers
                  </h3>
                  <ul className="relation-list">
                    {itemBacklinks.map(({ item, trigger, triggerIndex }) => (
                      <li key={`${item.id}:${triggerIndex}`}>
                        <Link
                          className="entity-link font-semibold"
                          href={`/items/${item.slug}`}
                        >
                          {item.name}
                        </Link>
                        <span>{titleCase(trigger.kind)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {instabilityBacklinks.length > 0 ? (
                <section aria-labelledby="instability-backlinks-heading">
                  <h3
                    id="instability-backlinks-heading"
                    className="relationship-title"
                  >
                    Instability effects
                  </h3>
                  <ul className="relation-list">
                    {instabilityBacklinks.map((effect) => (
                      <li
                        key={`${effect.name}:${effect.provenance.sourceId}:${effect.provenance.line}`}
                      >
                        <strong>{effect.name}</strong>
                        <span>Shared effect pool</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {abilityBacklinks.length > 0 ? (
                <section aria-labelledby="ability-backlinks-heading">
                  <h3
                    id="ability-backlinks-heading"
                    className="relationship-title"
                  >
                    Abilities
                  </h3>
                  <ul className="relation-list">
                    {abilityBacklinks.map((ability) => (
                      <li key={ability.id}>
                        <Link
                          className="entity-link font-semibold"
                          href={`/abilities/${ability.slug}`}
                        >
                          {ability.name}
                        </Link>
                        <span>Ability spell hook</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {monsterBacklinks.length > 0 ? (
                <section aria-labelledby="monster-backlinks-heading">
                  <h3
                    id="monster-backlinks-heading"
                    className="relationship-title"
                  >
                    Monsters
                  </h3>
                  <ul className="relation-list">
                    {monsterBacklinks.map(
                      ({ monster, trigger, triggerIndex }) => (
                        <li key={`${monster.id}:${triggerIndex}`}>
                          <Link
                            className="entity-link font-semibold"
                            href={`/monsters/${monster.slug}`}
                          >
                            {monster.name}
                          </Link>
                          <span>{monsterBacklinkLabels[trigger.kind]}</span>
                        </li>
                      ),
                    )}
                  </ul>
                </section>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized records reference this spell.
            </p>
          )}
        </section>

        <ProvenanceCard
          artifact={artifact}
          entity={spell}
          headingId="spell-provenance-heading"
        />

        <section
          className="detail-card"
          aria-labelledby="spell-diagnostics-heading"
        >
          <h2 id="spell-diagnostics-heading" className="section-title-sm">
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
              No diagnostics are attached to the active spell.
            </p>
          )}
        </section>
      </div>
    </article>
  );
}
