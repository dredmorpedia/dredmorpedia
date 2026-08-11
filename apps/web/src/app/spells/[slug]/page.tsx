import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  allSpellEffects,
  entityRouteSlugs,
  matchesEntityRoute,
  spellBuffEventHookBacklinks,
  spellEffectBacklinks,
  spellEffectChain,
  spellEffectConditionBacklinks,
  spellEffectOptionSpellBacklinks,
  spellEffectRemovedBuffBacklinks,
  type MonsterSpellTriggerKind,
  type SpellBuffEventHookKind,
} from "@dredmorpedia/domain";

import { ProvenanceCard } from "@/components/provenance-card";
import { StatModifierLink } from "@/components/stat-modifier-link";
import { loadArtifact, loadDiagnostics } from "@/lib/artifact";
import { titleCase } from "@/lib/display-labels";
import { sourceFlagLabel, sourceFlagValue } from "@/lib/source-flags";
import { signedStatModifierValue } from "@/lib/stat-modifiers";

export const dynamicParams = false;

function effectTypeLabel(value: string): string {
  if (value === "spawnitemfromlist") {
    return "Spawn item from list";
  }
  if (value === "spawnitematlocation") {
    return "Spawn item at location";
  }
  if (value === "triggerfromlist") {
    return "Trigger from list";
  }
  if (value === "bleed") {
    return "Starts bleeding";
  }
  if (value === "removebuffbyname") {
    return "Remove buff by name";
  }
  return titleCase(value);
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

const buffEventHookLabels: Readonly<Record<SpellBuffEventHookKind, string>> = {
  "target-hit": "When you hit in melee",
  "player-hit": "When you are hit in melee",
  dodge: "When you dodge",
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
  const itemsById = new Map(
    artifact.entities.items.map((entry) => [entry.id, entry]),
  );
  const monstersById = new Map(
    artifact.entities.monsters.map((entry) => [entry.id, entry]),
  );
  const statsById = new Map(
    artifact.entities.stats.map((stat) => [stat.id, stat]),
  );
  const targetingTemplate = spell.targetingTemplate.templateId
    ? artifact.entities.templates.find(
        (template) => template.id === spell.targetingTemplate.templateId,
      )
    : undefined;
  const chain = spellEffectChain(artifact.entities.spells, spell.id);
  const spellBacklinks = spellEffectBacklinks(
    artifact.entities.spells,
    spell.id,
  );
  const buffHookBacklinks = spellBuffEventHookBacklinks(
    artifact.entities.spells,
    spell.id,
  );
  const optionSpellBacklinks = spellEffectOptionSpellBacklinks(
    artifact.entities.spells,
    spell.id,
  );
  const conditionBacklinks = spellEffectConditionBacklinks(
    artifact.entities.spells,
    spell.id,
  );
  const removedBuffBacklinks = spellEffectRemovedBuffBacklinks(
    artifact.entities.spells,
    spell.id,
  );
  const normalizedEffects = allSpellEffects(spell);
  const buffTagEffectCount = normalizedEffects.filter(
    (effect) => effect.buffTag !== null,
  ).length;
  const listOptionEffects = normalizedEffects
    .map((effect, effectIndex) => ({ effect, effectIndex }))
    .filter(({ effect }) => effect.options.length > 0);
  const listOptionCount = listOptionEffects.reduce(
    (count, { effect }) => count + effect.options.length,
    0,
  );
  const itemBacklinks = artifact.entities.items.flatMap((item) =>
    item.triggers.flatMap((trigger, triggerIndex) =>
      trigger.spellId === spell.id ? [{ item, trigger, triggerIndex }] : [],
    ),
  );
  const macguffinBacklinks = artifact.entities.items.flatMap((item) =>
    item.macguffinDeclarations.flatMap((declaration, declarationIndex) =>
      declaration.spellId === spell.id
        ? [{ item, declaration, declarationIndex }]
        : [],
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
    buffHookBacklinks.length +
    optionSpellBacklinks.length +
    conditionBacklinks.length +
    removedBuffBacklinks.length +
    itemBacklinks.length +
    macguffinBacklinks.length +
    instabilityBacklinks.length +
    abilityBacklinks.length +
    monsterBacklinks.length;
  const isAlias = slug !== spell.slug;
  const presentationDeclarations = [
    ...spell.animations.map((metadata, index) => ({
      kind: "Animation",
      index,
      metadata,
    })),
    ...spell.impacts.map((metadata, index) => ({
      kind: "Impact",
      index,
      metadata,
    })),
  ] as const;
  const aiHintDeclarations = [
    ...spell.aiHints.map((metadata, index) => ({
      scope: "Spell",
      index,
      metadata,
    })),
    ...spell.buffs.flatMap((buff, buffIndex) =>
      buff.aiHints.map((metadata, index) => ({
        scope: `Buff ${buffIndex + 1}`,
        index,
        metadata,
      })),
    ),
  ];

  return (
    <article className="detail-page">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/browse/">Browse</Link>
        <span aria-hidden="true">/</span>
        <Link href="/browse/spells/1/">Spells</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{spell.name}</span>
      </nav>

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
            <dt>Zorkmid requirement declarations</dt>
            <dd>{spell.zorkmidRequirements.length}</dd>
          </div>
          <div>
            <dt>Booze requirement declarations</dt>
            <dd>{spell.boozeRequirements.length}</dd>
          </div>
          <div>
            <dt>Shield requirement declarations</dt>
            <dd>{spell.shieldRequirements.length}</dd>
          </div>
          <div>
            <dt>Weapon requirement declarations</dt>
            <dd>{spell.weaponRequirements.length}</dd>
          </div>
          <div>
            <dt>Animation declarations</dt>
            <dd>{spell.animations.length}</dd>
          </div>
          <div>
            <dt>Impact declarations</dt>
            <dd>{spell.impacts.length}</dd>
          </div>
          <div>
            <dt>Direct effects</dt>
            <dd>{spell.effects.length}</dd>
          </div>
          <div>
            <dt>Effect buff tags</dt>
            <dd>{buffTagEffectCount}</dd>
          </div>
          <div>
            <dt>List options</dt>
            <dd>{listOptionCount}</dd>
          </div>
          <div>
            <dt>Buff declarations</dt>
            <dd>{spell.buffs.length}</dd>
          </div>
          <div>
            <dt>Buff event hooks</dt>
            <dd>
              {spell.buffs.reduce(
                (count, buff) => count + buff.eventHooks.length,
                0,
              )}
            </dd>
          </div>
          <div>
            <dt>Buff halo declarations</dt>
            <dd>
              {spell.buffs.reduce(
                (count, buff) => count + buff.halos.length,
                0,
              )}
            </dd>
          </div>
          <div>
            <dt>Buff invisibility declarations</dt>
            <dd>
              {spell.buffs.reduce(
                (count, buff) => count + buff.invisibilityDeclarations.length,
                0,
              )}
            </dd>
          </div>
          <div>
            <dt>Buff casting-prevention declarations</dt>
            <dd>
              {spell.buffs.reduce(
                (count, buff) => count + buff.muteDeclarations.length,
                0,
              )}
            </dd>
          </div>
          <div>
            <dt>Buff wall-sensing declarations</dt>
            <dd>
              {spell.buffs.reduce(
                (count, buff) => count + buff.senseWallsDeclarations.length,
                0,
              )}
            </dd>
          </div>
          <div>
            <dt>Buff payback declarations</dt>
            <dd>
              {spell.buffs.reduce(
                (count, buff) => count + buff.paybackDeclarations.length,
                0,
              )}
            </dd>
          </div>
          <div>
            <dt>Buff zorkmid-absorption declarations</dt>
            <dd>
              {spell.buffs.reduce(
                (count, buff) =>
                  count + buff.zorkmidAbsorptionDeclarations.length,
                0,
              )}
            </dd>
          </div>
          <div>
            <dt>Buff polymorph declarations</dt>
            <dd>
              {spell.buffs.reduce(
                (count, buff) => count + buff.polymorphDeclarations.length,
                0,
              )}
            </dd>
          </div>
          <div>
            <dt>Buff-local effects</dt>
            <dd>
              {spell.buffs.reduce(
                (count, buff) => count + buff.effects.length,
                0,
              )}
            </dd>
          </div>
          <div>
            <dt>AI hint declarations</dt>
            <dd>{aiHintDeclarations.length}</dd>
          </div>
        </dl>
      </header>

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

      <div className="detail-grid">
        {spell.spellType === "template" ||
        spell.targetingTemplate.sourceTemplateId !== null ? (
          <section
            className="detail-card"
            aria-labelledby="targeting-template-heading"
          >
            <h2 id="targeting-template-heading" className="section-title-sm">
              Targeting pattern
            </h2>
            <dl className="provenance-list">
              <div>
                <dt>Source template ID</dt>
                <dd>
                  {spell.targetingTemplate.sourceTemplateId ?? "Not declared"}
                </dd>
              </div>
              <div>
                <dt>Anchor-player source flag</dt>
                <dd>
                  {spell.targetingTemplate.sourceAnchored === null
                    ? "Not declared"
                    : spell.targetingTemplate.sourceAnchored
                      ? "Yes"
                      : "No"}
                </dd>
              </div>
              <div>
                <dt>Resolved template</dt>
                <dd>
                  {targetingTemplate ? (
                    <Link
                      className="entity-link"
                      href={`/templates/${targetingTemplate.slug}`}
                    >
                      {targetingTemplate.name}
                    </Link>
                  ) : spell.targetingTemplate.sourceTemplateId ? (
                    `Unresolved template reference: ${spell.targetingTemplate.sourceTemplateId}`
                  ) : (
                    "No template reference declared"
                  )}
                </dd>
              </div>
            </dl>
            <p className="interpretation-note">
              These are source targeting declarations. They do not establish
              target selection, rotation, placement, obstruction rules, or
              runtime success.
            </p>
          </section>
        ) : null}

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
                      <div>
                        <dt>Requirement level source value</dt>
                        <dd>
                          {manaCost.sourceLevel === null
                            ? "Not specified"
                            : sourceNumber.format(manaCost.sourceLevel)}
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                These are source parameters. Final in-game rounding is not
                inferred. A declared level remains uninterpreted metadata; no
                actor, unlock, eligibility, or progression rule is inferred.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized mana requirement.
            </p>
          )}
        </section>

        <section
          className="detail-card"
          aria-labelledby="zorkmid-requirement-heading"
        >
          <h2 id="zorkmid-requirement-heading" className="section-title-sm">
            Zorkmid requirement
          </h2>
          {spell.zorkmidRequirements.length > 0 ? (
            <>
              <ul className="trigger-list">
                {spell.zorkmidRequirements.map(
                  (zorkmidRequirement, requirementIndex) => (
                    <li key={requirementIndex}>
                      <div className="trigger-summary">
                        <span className="relationship-title">
                          Declaration {requirementIndex + 1}
                        </span>
                        <strong>Direct source parameters</strong>
                        <small className="trigger-resolution">
                          Uninterpreted requirement source metadata
                        </small>
                      </div>
                      <dl className="trigger-facts">
                        <div>
                          <dt>Zorkmids source value</dt>
                          <dd>
                            {zorkmidRequirement.sourceZorkmids === null
                              ? "Unavailable"
                              : sourceNumber.format(
                                  zorkmidRequirement.sourceZorkmids,
                                )}
                          </dd>
                        </div>
                        <div>
                          <dt>zorkmidScaleF source value</dt>
                          <dd>
                            {zorkmidRequirement.sourceZorkmidScaleFactor ===
                            null
                              ? "Not specified"
                              : sourceNumber.format(
                                  zorkmidRequirement.sourceZorkmidScaleFactor,
                                )}
                          </dd>
                        </div>
                        <div>
                          <dt>savvyBonus source value</dt>
                          <dd>
                            {zorkmidRequirement.sourceSavvyBonus === null
                              ? "Not specified"
                              : sourceNumber.format(
                                  zorkmidRequirement.sourceSavvyBonus,
                                )}
                          </dd>
                        </div>
                      </dl>
                    </li>
                  ),
                )}
              </ul>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                These source fields do not establish a cost or Savvy formula,
                actor, available currency, payment, eligibility, timing, or
                runtime success.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized zorkmid requirement.
            </p>
          )}
        </section>

        <section
          className="detail-card"
          aria-labelledby="booze-requirement-heading"
        >
          <h2 id="booze-requirement-heading" className="section-title-sm">
            Booze requirement
          </h2>
          {spell.boozeRequirements.length > 0 ? (
            <>
              <ul className="trigger-list">
                {spell.boozeRequirements.map(
                  (boozeRequirement, requirementIndex) => (
                    <li key={requirementIndex}>
                      <div className="trigger-summary">
                        <span className="relationship-title">
                          Declaration {requirementIndex + 1}
                        </span>
                        <strong>
                          {boozeRequirement.sourceValue === null
                            ? "Source value unavailable"
                            : `Source value: ${sourceNumber.format(boozeRequirement.sourceValue)}`}
                        </strong>
                        <small className="trigger-resolution">
                          Direct requirement source metadata
                        </small>
                      </div>
                      <dl className="trigger-facts">
                        <div>
                          <dt>Booze source value</dt>
                          <dd>
                            {boozeRequirement.sourceValue === null
                              ? "Unavailable"
                              : sourceNumber.format(
                                  boozeRequirement.sourceValue,
                                )}
                          </dd>
                        </div>
                      </dl>
                    </li>
                  ),
                )}
              </ul>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                This preserves the source value without inferring an actor,
                inventory or consumption state, eligibility rule, timing, or
                runtime success.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized booze requirement.
            </p>
          )}
        </section>

        <section
          className="detail-card"
          aria-labelledby="shield-requirement-heading"
        >
          <h2 id="shield-requirement-heading" className="section-title-sm">
            Shield requirement
          </h2>
          {spell.shieldRequirements.length > 0 ? (
            <>
              <ul className="trigger-list">
                {spell.shieldRequirements.map(
                  (shieldRequirement, requirementIndex) => (
                    <li key={requirementIndex}>
                      <div className="trigger-summary">
                        <span className="relationship-title">
                          Declaration {requirementIndex + 1}
                        </span>
                        <strong>
                          {shieldRequirement.sourceValue === null
                            ? "Source flag unavailable"
                            : `Source flag: ${yesNo(shieldRequirement.sourceValue)}`}
                        </strong>
                        <small className="trigger-resolution">
                          Direct requirement source metadata
                        </small>
                      </div>
                      <dl className="trigger-facts">
                        <div>
                          <dt>Shield source flag</dt>
                          <dd>
                            {shieldRequirement.sourceValue === null
                              ? "Unavailable"
                              : yesNo(shieldRequirement.sourceValue)}
                          </dd>
                        </div>
                      </dl>
                    </li>
                  ),
                )}
              </ul>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                This preserves the source flag without inferring an actor,
                equipment state, eligibility rule, timing, or runtime success.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized shield requirement.
            </p>
          )}
        </section>

        <section
          className="detail-card"
          aria-labelledby="weapon-requirement-heading"
        >
          <h2 id="weapon-requirement-heading" className="section-title-sm">
            Weapon requirement
          </h2>
          {spell.weaponRequirements.length > 0 ? (
            <>
              <ul className="trigger-list">
                {spell.weaponRequirements.map(
                  (weaponRequirement, requirementIndex) => (
                    <li key={requirementIndex}>
                      <div className="trigger-summary">
                        <span className="relationship-title">
                          Declaration {requirementIndex + 1}
                        </span>
                        <strong>
                          {weaponRequirement.sourceValue === null
                            ? "Source flag unavailable"
                            : `Source flag: ${yesNo(weaponRequirement.sourceValue)}`}
                        </strong>
                        <small className="trigger-resolution">
                          Direct requirement source metadata
                        </small>
                      </div>
                      <dl className="trigger-facts">
                        <div>
                          <dt>Weapon source flag</dt>
                          <dd>
                            {weaponRequirement.sourceValue === null
                              ? "Unavailable"
                              : yesNo(weaponRequirement.sourceValue)}
                          </dd>
                        </div>
                      </dl>
                    </li>
                  ),
                )}
              </ul>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                This preserves the source flag without inferring an actor,
                equipped item state, weapon category, eligibility rule, timing,
                or runtime success.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized weapon requirement.
            </p>
          )}
        </section>

        <section className="detail-card" aria-labelledby="presentation-heading">
          <h2 id="presentation-heading" className="section-title-sm">
            Presentation
          </h2>
          {presentationDeclarations.length > 0 ? (
            <>
              <ul className="trigger-list">
                {presentationDeclarations.map(({ kind, index, metadata }) => (
                  <li key={`${kind}-${index}`}>
                    <div className="trigger-summary">
                      <span className="relationship-title">
                        {kind} declaration {index + 1}
                      </span>
                      <strong>
                        {metadata.frameCount === null
                          ? "Frame count not specified"
                          : `${metadata.frameCount} source frames`}
                      </strong>
                      <small className="trigger-resolution">
                        Local engine presentation metadata
                      </small>
                    </div>
                    <dl className="trigger-facts">
                      <div>
                        <dt>Sprite reference</dt>
                        <dd>
                          {metadata.spritePath === null
                            ? "Not supplied"
                            : "Supplied"}
                        </dd>
                      </div>
                      <div>
                        <dt>Sound cue</dt>
                        <dd>
                          {metadata.soundEffect === null
                            ? "Not supplied"
                            : "Supplied"}
                        </dd>
                      </div>
                      <div>
                        <dt>Source frame rate</dt>
                        <dd>
                          {metadata.frameRate === null
                            ? "Not specified"
                            : sourceNumber.format(metadata.frameRate)}
                        </dd>
                      </div>
                      <div>
                        <dt>First frame</dt>
                        <dd>
                          {metadata.firstFrame === null
                            ? "Not specified"
                            : sourceNumber.format(metadata.firstFrame)}
                        </dd>
                      </div>
                      <div>
                        <dt>Centered effect</dt>
                        <dd>
                          {metadata.centered === null
                            ? "Not specified"
                            : yesNo(metadata.centered)}
                        </dd>
                      </div>
                      <div>
                        <dt>Synchronized</dt>
                        <dd>
                          {metadata.synchronized === null
                            ? "Not specified"
                            : yesNo(metadata.synchronized)}
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Numeric and boolean values are source declarations, not timing
                formulas. Detailed sprite paths and sound cue IDs remain hidden
                while the asset publication boundary is unresolved.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized animation or impact declaration.
            </p>
          )}
        </section>

        <section className="detail-card" aria-labelledby="ai-hints-heading">
          <h2 id="ai-hints-heading" className="section-title-sm">
            Engine AI hints
          </h2>
          {aiHintDeclarations.length > 0 ? (
            <>
              <ul className="trigger-list">
                {aiHintDeclarations.map(({ scope, index, metadata }) => (
                  <li key={`${scope}-${index}`}>
                    <div className="trigger-summary">
                      <span className="relationship-title">
                        {scope} declaration {index + 1}
                      </span>
                      <strong>{metadata.hint ?? "Hint unavailable"}</strong>
                      <small className="trigger-resolution">
                        Exact source hint token
                      </small>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                These are uninterpreted engine guidance tokens. They do not
                establish targeting, eligibility, priorities, or runtime AI
                behavior.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized engine AI hint.
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
                  {buff.descriptions.length > 0 ? (
                    <section
                      className="mt-4"
                      aria-labelledby={`buff-${buffIndex}-descriptions-heading`}
                    >
                      <h3
                        id={`buff-${buffIndex}-descriptions-heading`}
                        className="relationship-title"
                      >
                        Buff description
                      </h3>
                      {buff.descriptions.map(
                        (description, descriptionIndex) => (
                          <p
                            className="mt-2 text-sm leading-6 text-muted-foreground"
                            key={descriptionIndex}
                          >
                            {description.text ??
                              "Description text unavailable."}
                          </p>
                        ),
                      )}
                    </section>
                  ) : null}
                  {buff.halos.length > 0 ? (
                    <section
                      className="mt-4"
                      aria-labelledby={`buff-${buffIndex}-halos-heading`}
                    >
                      <h3
                        id={`buff-${buffIndex}-halos-heading`}
                        className="relationship-title"
                      >
                        Halo presentation
                      </h3>
                      <ul className="trigger-list mt-2">
                        {buff.halos.map((halo, haloIndex) => (
                          <li key={haloIndex}>
                            <div className="trigger-summary">
                              <span className="relationship-title">
                                Halo declaration {haloIndex + 1}
                              </span>
                              <strong>
                                {halo.frameCount === null
                                  ? "Frame count not specified"
                                  : `${halo.frameCount} source frames`}
                              </strong>
                              <small className="trigger-resolution">
                                Local buff presentation metadata
                              </small>
                            </div>
                            <dl className="trigger-facts">
                              <div>
                                <dt>Sprite reference</dt>
                                <dd>
                                  {halo.spritePath === null
                                    ? "Not supplied"
                                    : "Supplied"}
                                </dd>
                              </div>
                              <div>
                                <dt>Source frame rate</dt>
                                <dd>
                                  {halo.frameRate === null
                                    ? "Not specified"
                                    : sourceNumber.format(halo.frameRate)}
                                </dd>
                              </div>
                              <div>
                                <dt>First frame</dt>
                                <dd>
                                  {halo.firstFrame === null
                                    ? "Not specified"
                                    : sourceNumber.format(halo.firstFrame)}
                                </dd>
                              </div>
                              <div>
                                <dt>Centered effect</dt>
                                <dd>
                                  {halo.centered === null
                                    ? "Not specified"
                                    : yesNo(halo.centered)}
                                </dd>
                              </div>
                            </dl>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-3 text-xs leading-5 text-muted-foreground">
                        These are engine presentation declarations, not
                        animation timing formulas. Detailed sprite references
                        remain hidden while the asset publication boundary is
                        unresolved.
                      </p>
                    </section>
                  ) : null}
                  {buff.invisibilityDeclarations.length > 0 ? (
                    <section
                      className="mt-4"
                      aria-labelledby={`buff-${buffIndex}-invisibility-heading`}
                    >
                      <h3
                        id={`buff-${buffIndex}-invisibility-heading`}
                        className="relationship-title"
                      >
                        Invisibility
                      </h3>
                      <dl className="stat-list">
                        {buff.invisibilityDeclarations.map(
                          (declaration, declarationIndex) => (
                            <div key={declarationIndex}>
                              <dt>
                                Declaration {declarationIndex + 1} source amount
                              </dt>
                              <dd>
                                {declaration.amount === null
                                  ? "Not specified or unavailable"
                                  : sourceNumber.format(declaration.amount)}
                              </dd>
                            </div>
                          ),
                        )}
                      </dl>
                      <p className="mt-3 text-xs leading-5 text-muted-foreground">
                        The preserved application identifies this marker as
                        invisibility. Its source amount is retained without
                        inferring visibility strength, detection, actor scope,
                        breaking conditions, stacking, duration, or runtime
                        behavior.
                      </p>
                    </section>
                  ) : null}
                  {buff.muteDeclarations.length > 0 ? (
                    <section
                      className="mt-4"
                      aria-labelledby={`buff-${buffIndex}-casting-prevention-heading`}
                    >
                      <h3
                        id={`buff-${buffIndex}-casting-prevention-heading`}
                        className="relationship-title"
                      >
                        Casting prevention
                      </h3>
                      <dl className="stat-list">
                        {buff.muteDeclarations.map(
                          (declaration, declarationIndex) => (
                            <div key={declarationIndex}>
                              <dt>
                                Declaration {declarationIndex + 1} source amount
                              </dt>
                              <dd>
                                {declaration.amount === null
                                  ? "Not specified or unavailable"
                                  : sourceNumber.format(declaration.amount)}
                              </dd>
                            </div>
                          ),
                        )}
                      </dl>
                      <p className="mt-3 text-xs leading-5 text-muted-foreground">
                        The preserved application labels this marker as
                        preventing casting. Its source amount is retained
                        without inferring affected actors or spell categories,
                        amount meaning, immunity, resistance, stacking,
                        duration, removal, or runtime success.
                      </p>
                    </section>
                  ) : null}
                  {buff.polymorphDeclarations.length > 0 ? (
                    <section
                      className="mt-4"
                      aria-labelledby={`buff-${buffIndex}-polymorph-heading`}
                    >
                      <h3
                        id={`buff-${buffIndex}-polymorph-heading`}
                        className="relationship-title"
                      >
                        Polymorph targets
                      </h3>
                      <ul className="relation-list">
                        {buff.polymorphDeclarations.map(
                          (declaration, declarationIndex) => {
                            const targetMonster = declaration.monsterId
                              ? monstersById.get(declaration.monsterId)
                              : undefined;
                            return (
                              <li key={declarationIndex}>
                                <span>
                                  {targetMonster ? (
                                    <Link
                                      className="entity-link font-semibold"
                                      href={`/monsters/${targetMonster.slug}`}
                                    >
                                      {targetMonster.name}
                                    </Link>
                                  ) : declaration.monsterName !== null ? (
                                    <strong>{declaration.monsterName}</strong>
                                  ) : (
                                    <strong>Target unavailable</strong>
                                  )}
                                </span>
                                <small
                                  className={
                                    declaration.monsterName && !targetMonster
                                      ? "trigger-resolution trigger-resolution-unresolved"
                                      : "trigger-resolution"
                                  }
                                >
                                  {targetMonster
                                    ? "Resolved monster target"
                                    : declaration.monsterName !== null
                                      ? "Unresolved monster target"
                                      : "No usable source target"}
                                </small>
                              </li>
                            );
                          },
                        )}
                      </ul>
                      <p className="mt-3 text-xs leading-5 text-muted-foreground">
                        The preserved application labels this declaration as
                        polymorphing into the named monster type. The
                        relationship does not establish duration, stat or
                        ability replacement, equipment behavior, targeting,
                        faction, reversibility, or runtime success.
                      </p>
                    </section>
                  ) : null}
                  {buff.effects.length > 0 ? (
                    <section
                      className="mt-4"
                      aria-labelledby={`buff-${buffIndex}-effects-heading`}
                    >
                      <h3
                        id={`buff-${buffIndex}-effects-heading`}
                        className="relationship-title"
                      >
                        Buff-local effects
                      </h3>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        These declarations execute from within this buff in the
                        source data. Their fields and relationships are
                        preserved without inferring scheduling, trigger order,
                        buff lifetime, or engine execution behavior.
                      </p>
                      <ul className="relation-list">
                        {buff.effects.map((effect, effectIndex) => {
                          const targetSpell = effect.spellId
                            ? spellsById.get(effect.spellId)
                            : undefined;
                          const removedBuff = effect.removedBuff.spellId
                            ? spellsById.get(effect.removedBuff.spellId)
                            : undefined;
                          const targetName =
                            targetSpell?.name ??
                            effect.spellName ??
                            removedBuff?.name ??
                            effect.removedBuff.spellName;
                          const targetSlug =
                            targetSpell?.slug ?? removedBuff?.slug;
                          return (
                            <li key={`${effect.type}:${effectIndex}`}>
                              <span>
                                {targetName && targetSlug ? (
                                  <Link
                                    className="entity-link font-semibold"
                                    href={`/spells/${targetSlug}`}
                                  >
                                    {targetName}
                                  </Link>
                                ) : (
                                  <strong>
                                    {targetName ??
                                      `${effectTypeLabel(effect.type)} effect`}
                                  </strong>
                                )}
                              </span>
                              <small className="trigger-resolution">
                                {effectTypeLabel(effect.type)} effect
                                {effect.presentation
                                  ? ` · ${
                                      effect.presentation.frameCount === null
                                        ? "Frame count not specified"
                                        : `${effect.presentation.frameCount} source frames`
                                    } · ${
                                      effect.presentation.iconPath !== null ||
                                      effect.presentation.smallIconPath !== null
                                        ? "Icon references supplied"
                                        : "No icon references"
                                    }`
                                  : ""}
                              </small>
                            </li>
                          );
                        })}
                      </ul>
                      <p className="mt-3 text-xs leading-5 text-muted-foreground">
                        Complete source fields also appear in the combined
                        Effects section below.
                      </p>
                    </section>
                  ) : null}
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
                            <dt>
                              <StatModifierLink
                                modifier={modifier}
                                stats={artifact.entities.stats}
                              />
                            </dt>
                            <dd>{signedStatModifierValue(modifier.amount)}</dd>
                          </div>
                        ))}
                      </dl>
                      {buff.modifiers.some(
                        (modifier) =>
                          (modifier.kind === "primary" ||
                            modifier.kind === "secondary") &&
                          modifier.statId === undefined,
                      ) ? (
                        <p className="mt-3 text-xs leading-5 text-muted-foreground">
                          Unmapped primary and secondary modifiers retain their
                          numeric game stat IDs.
                        </p>
                      ) : null}
                    </section>
                  ) : null}
                  {buff.senseWallsDeclarations.length > 0 ? (
                    <section
                      className="mt-4"
                      aria-labelledby={`buff-${buffIndex}-wall-sensing-heading`}
                    >
                      <h3
                        id={`buff-${buffIndex}-wall-sensing-heading`}
                        className="relationship-title"
                      >
                        Wall sensing
                      </h3>
                      <dl className="stat-list">
                        {buff.senseWallsDeclarations.map(
                          (declaration, declarationIndex) => (
                            <div key={declarationIndex}>
                              <dt>Declaration {declarationIndex + 1}</dt>
                              <dd>
                                {declaration.enabled === null
                                  ? "Unavailable"
                                  : yesNo(declaration.enabled)}
                              </dd>
                            </div>
                          ),
                        )}
                      </dl>
                      <p className="mt-3 text-xs leading-5 text-muted-foreground">
                        The source defines this as a game-boolean wall-sensing
                        marker. It is retained without inferring detection
                        range, revealed terrain, actor scope, interaction with
                        sight radius, stacking, duration, or runtime success.
                      </p>
                    </section>
                  ) : null}
                  {buff.paybackDeclarations.length > 0 ? (
                    <section
                      className="mt-4"
                      aria-labelledby={`buff-${buffIndex}-payback-heading`}
                    >
                      <h3
                        id={`buff-${buffIndex}-payback-heading`}
                        className="relationship-title"
                      >
                        Payback source parameters
                      </h3>
                      <dl className="stat-list">
                        {buff.paybackDeclarations.flatMap(
                          (declaration, declarationIndex) => [
                            <div key={`${declarationIndex}:secondary-scale`}>
                              <dt>
                                Declaration {declarationIndex + 1}{" "}
                                secondaryScale flag
                              </dt>
                              <dd>
                                {declaration.secondaryScale === null
                                  ? "Unavailable"
                                  : yesNo(declaration.secondaryScale)}
                              </dd>
                            </div>,
                            <div key={`${declarationIndex}:factor`}>
                              <dt>
                                Declaration {declarationIndex + 1} paybackF
                                factor
                              </dt>
                              <dd>
                                {declaration.factor === null
                                  ? "Unavailable"
                                  : declaration.factor}
                              </dd>
                            </div>,
                          ],
                        )}
                      </dl>
                      <p className="mt-3 text-xs leading-5 text-muted-foreground">
                        The source supplies a game-boolean secondaryScale flag
                        and decimal paybackF factor. These values are retained
                        without inferring a base amount or source stat, health
                        relationship, damage return, trigger or event timing,
                        caps, stacking, eligibility, or a final formula.
                      </p>
                    </section>
                  ) : null}
                  {buff.zorkmidAbsorptionDeclarations.length > 0 ? (
                    <section
                      className="mt-4"
                      aria-labelledby={`buff-${buffIndex}-zorkmid-absorption-heading`}
                    >
                      <h3
                        id={`buff-${buffIndex}-zorkmid-absorption-heading`}
                        className="relationship-title"
                      >
                        Zorkmid absorption source parameters
                      </h3>
                      <dl className="stat-list">
                        {buff.zorkmidAbsorptionDeclarations.flatMap(
                          (declaration, declarationIndex) => [
                            <div
                              key={`${declarationIndex}:zorkmids-per-damage`}
                            >
                              <dt>
                                Declaration {declarationIndex + 1}{" "}
                                zorkmidsPerDamage
                              </dt>
                              <dd>
                                {declaration.zorkmidsPerDamage === null
                                  ? "Unavailable"
                                  : sourceNumber.format(
                                      declaration.zorkmidsPerDamage,
                                    )}
                              </dd>
                            </div>,
                            <div key={`${declarationIndex}:damage-cap`}>
                              <dt>
                                Declaration {declarationIndex + 1} damageCap
                              </dt>
                              <dd>
                                {declaration.damageCap === null
                                  ? "Unavailable"
                                  : sourceNumber.format(declaration.damageCap)}
                              </dd>
                            </div>,
                            <div key={`${declarationIndex}:max-ratio`}>
                              <dt>
                                Declaration {declarationIndex + 1} maxRatio
                              </dt>
                              <dd>
                                {declaration.maxRatio === null
                                  ? "Unavailable"
                                  : sourceNumber.format(declaration.maxRatio)}
                              </dd>
                            </div>,
                          ],
                        )}
                      </dl>
                      <p className="mt-3 text-xs leading-5 text-muted-foreground">
                        The source supplies two signed-byte values and a decimal
                        ratio. They are retained without deriving a currency
                        cost or damage-mitigation formula, cap application,
                        target, timing, eligibility, stacking, duration, or
                        runtime success.
                      </p>
                    </section>
                  ) : null}
                  {buff.sightModifiers.length > 0 ? (
                    <section
                      className="mt-4"
                      aria-labelledby={`buff-${buffIndex}-sight-heading`}
                    >
                      <h3
                        id={`buff-${buffIndex}-sight-heading`}
                        className="relationship-title"
                      >
                        Sight modifiers
                      </h3>
                      <dl className="stat-list">
                        {buff.sightModifiers.map((modifier, modifierIndex) => (
                          <div key={modifierIndex}>
                            <dt>Sight radius</dt>
                            <dd>
                              {modifier.amount === null
                                ? "Unavailable"
                                : signedStatModifierValue(modifier.amount)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                      <p className="mt-3 text-xs leading-5 text-muted-foreground">
                        Signed source modifiers are preserved without deriving
                        final visibility or darkness behavior.
                      </p>
                    </section>
                  ) : null}
                  {buff.eventHooks.length > 0 ? (
                    <section
                      className="mt-4"
                      aria-labelledby={`buff-${buffIndex}-hooks-heading`}
                    >
                      <h3
                        id={`buff-${buffIndex}-hooks-heading`}
                        className="relationship-title"
                      >
                        Event hooks
                      </h3>
                      <dl className="stat-list">
                        {buff.eventHooks.map((hook, hookIndex) => {
                          const targetSpell = hook.spellId
                            ? spellsById.get(hook.spellId)
                            : undefined;
                          return (
                            <div
                              key={`${hook.kind}:${hook.spellKey}:${hookIndex}`}
                            >
                              <dt>
                                <span className="block">
                                  {buffEventHookLabels[hook.kind]}
                                </span>
                                {targetSpell ? (
                                  <Link
                                    className="entity-link font-semibold"
                                    href={`/spells/${targetSpell.slug}`}
                                  >
                                    {targetSpell.name}
                                  </Link>
                                ) : (
                                  <strong>{hook.spellName}</strong>
                                )}
                                <small
                                  className={
                                    targetSpell
                                      ? "trigger-resolution block"
                                      : "trigger-resolution trigger-resolution-unresolved block"
                                  }
                                >
                                  {targetSpell
                                    ? "Resolved spell target"
                                    : "Unresolved spell target"}
                                </small>
                              </dt>
                              <dd>
                                <span className="block">
                                  {hook.chance === null
                                    ? "Chance not specified"
                                    : `${hook.chance}% chance`}
                                </span>
                                {hook.sourceFlags.map((flag) => (
                                  <small
                                    className="trigger-resolution block"
                                    key={`${flag.sourceKey}:${flag.value}`}
                                  >
                                    {sourceFlagLabel(flag)}:{" "}
                                    {sourceFlagValue(flag)}
                                  </small>
                                ))}
                              </dd>
                            </div>
                          );
                        })}
                      </dl>
                      <p className="mt-3 text-xs leading-5 text-muted-foreground">
                        Conditions and percentages are source declarations. They
                        do not establish event eligibility, evaluation order,
                        timing, or runtime success. The additional after flag is
                        retained without inferring engine timing.
                      </p>
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
          <p className="text-sm leading-6 text-muted-foreground">
            Direct and buff-local damage amounts, factor coefficients, scaling
            selectors, item and summon-monster targets, named buff-removal
            targets, effect presentation, created-object sprite availability,
            graphics-regeneration flags, Midas flags, controls, and buff
            conditions, plus buff-tag source tokens, are shown without combining
            them into final damage, gold conversion or value, buff-tag matching
            or selection, targeting eligibility, buff-presence evaluation,
            removal eligibility, removal scope, stack handling, trigger timing,
            resistance, ignition, animation sequencing, terrain changes, redraw
            timing, created-object lifetime, random-item selection, inventory
            placement, summon allegiance, placement, lifetime, AI state, or
            runtime probability behavior. Detailed effect sprite paths and sound
            cue IDs remain hidden.
          </p>
          {normalizedEffects.length > 0 ? (
            <ul className="trigger-list mt-4">
              {normalizedEffects.map((effect, effectIndex) => {
                const targetSpell = effect.spellId
                  ? spellsById.get(effect.spellId)
                  : undefined;
                const targetStat = effect.statId
                  ? statsById.get(effect.statId)
                  : undefined;
                const targetItem = effect.itemTarget.itemId
                  ? itemsById.get(effect.itemTarget.itemId)
                  : undefined;
                const targetMonster = effect.monsterTarget.monsterId
                  ? monstersById.get(effect.monsterTarget.monsterId)
                  : undefined;
                const removedBuff = effect.removedBuff.spellId
                  ? spellsById.get(effect.removedBuff.spellId)
                  : undefined;
                const unresolved =
                  (effect.spellKey && !targetSpell) ||
                  (effect.statKey && !targetStat) ||
                  (effect.monsterTarget.monsterKey && !targetMonster) ||
                  (effect.removedBuff.spellKey && !removedBuff);
                const hasSourceControls =
                  effect.controls.durationTurns !== null ||
                  effect.controls.after !== null ||
                  effect.controls.chancePercent !== null ||
                  effect.controls.affectsCaster !== null ||
                  effect.controls.affectsSelf !== null ||
                  effect.controls.affectsCorpses !== null ||
                  effect.controls.resistable !== null ||
                  effect.controls.burnsTarget !== null ||
                  effect.controls.bleedsTarget !== null ||
                  effect.controls.midas !== null ||
                  effect.controls.skipAnimation !== null ||
                  effect.controls.taxonomy !== null;
                const requiredBuff = effect.conditions.requiredBuff.spellId
                  ? spellsById.get(effect.conditions.requiredBuff.spellId)
                  : undefined;
                const forbiddenBuff = effect.conditions.forbiddenBuff.spellId
                  ? spellsById.get(effect.conditions.forbiddenBuff.spellId)
                  : undefined;
                const hasSourceConditions =
                  effect.conditions.requiresSourceBuff !== null ||
                  effect.conditions.requiredBuff.enabled !== null ||
                  effect.conditions.requiredBuff.spellName !== null ||
                  effect.conditions.forbiddenBuff.enabled !== null ||
                  effect.conditions.forbiddenBuff.spellName !== null;
                const hasSourceScaling =
                  effect.scaling.amountFactor !== null ||
                  effect.scaling.floorFactor !== null ||
                  effect.scaling.primaryStatId !== null ||
                  effect.scaling.secondaryStatId !== null;
                return (
                  <li key={`${effect.type}:${effectIndex}`}>
                    <div className="trigger-summary">
                      <span className="relationship-title">
                        {effectTypeLabel(effect.type)} effect
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
                      ) : targetItem ? (
                        <Link
                          className="entity-link font-semibold"
                          href={`/items/${targetItem.slug}`}
                        >
                          {targetItem.name}
                        </Link>
                      ) : effect.itemTarget.itemName !== null ? (
                        <strong>{effect.itemTarget.itemName}</strong>
                      ) : targetMonster ? (
                        <Link
                          className="entity-link font-semibold"
                          href={`/monsters/${targetMonster.slug}`}
                        >
                          {targetMonster.name}
                        </Link>
                      ) : effect.monsterTarget.monsterName !== null ? (
                        <strong>{effect.monsterTarget.monsterName}</strong>
                      ) : removedBuff ? (
                        <Link
                          className="entity-link font-semibold"
                          href={`/spells/${removedBuff.slug}`}
                        >
                          {removedBuff.name}
                        </Link>
                      ) : effect.removedBuff.spellName !== null ? (
                        <strong>{effect.removedBuff.spellName}</strong>
                      ) : (
                        <strong>{effectTypeLabel(effect.type)}</strong>
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
                                : targetItem
                                  ? "Resolved item target"
                                  : effect.itemTarget.itemName !== null
                                    ? "Source item target (no normalized item entity)"
                                    : targetMonster
                                      ? "Resolved summon monster target"
                                      : effect.monsterTarget.monsterName !==
                                          null
                                        ? "Unresolved summon monster target"
                                        : removedBuff
                                          ? "Resolved named buff target"
                                          : effect.removedBuff.spellName !==
                                              null
                                            ? "Unresolved named buff target"
                                            : "No entity target"}
                      </small>
                    </div>
                    <dl className="trigger-facts">
                      <div>
                        <dt>Type</dt>
                        <dd>{effectTypeLabel(effect.type)}</dd>
                      </div>
                      {effect.amount !== undefined ? (
                        <div>
                          <dt>Amount</dt>
                          <dd>{signedValue(effect.amount)}</dd>
                        </div>
                      ) : null}
                      {effect.damage.map((damage) => (
                        <div key={damage.sourceKey}>
                          <dt>{titleCase(damage.sourceKey)} damage</dt>
                          <dd>
                            {damage.amount === null
                              ? "Base not declared or unavailable"
                              : `${signedValue(damage.amount)} base`}
                            {" · "}
                            {damage.factor === null
                              ? "Factor not declared or unavailable"
                              : `${sourceNumber.format(damage.factor)} factor`}
                          </dd>
                        </div>
                      ))}
                      {effect.scaling.amountFactor !== null ? (
                        <div>
                          <dt>Amount factor</dt>
                          <dd>
                            {sourceNumber.format(effect.scaling.amountFactor)}
                          </dd>
                        </div>
                      ) : null}
                      {effect.scaling.floorFactor !== null ? (
                        <div>
                          <dt>Floor factor</dt>
                          <dd>
                            {sourceNumber.format(effect.scaling.floorFactor)}
                          </dd>
                        </div>
                      ) : null}
                      {effect.scaling.primaryStatId !== null ? (
                        <div>
                          <dt>Primary scaling source ID</dt>
                          <dd>{effect.scaling.primaryStatId}</dd>
                        </div>
                      ) : null}
                      {effect.scaling.secondaryStatId !== null ? (
                        <div>
                          <dt>Secondary scaling source ID</dt>
                          <dd>{effect.scaling.secondaryStatId}</dd>
                        </div>
                      ) : null}
                      {effect.damage.length === 0 && !hasSourceScaling ? (
                        <div>
                          <dt>Damage and scaling</dt>
                          <dd>None declared</dd>
                        </div>
                      ) : null}
                      {effect.presentation ? (
                        <>
                          <div>
                            <dt>Effect icon reference</dt>
                            <dd>
                              {effect.presentation.iconPath === null
                                ? "Not supplied"
                                : "Supplied"}
                            </dd>
                          </div>
                          <div>
                            <dt>Small effect icon reference</dt>
                            <dd>
                              {effect.presentation.smallIconPath === null
                                ? "Not supplied"
                                : "Supplied"}
                            </dd>
                          </div>
                          <div>
                            <dt>Effect sprite reference</dt>
                            <dd>
                              {effect.presentation.spritePath === null
                                ? "Not supplied"
                                : "Supplied"}
                            </dd>
                          </div>
                          <div>
                            <dt>Effect frame count</dt>
                            <dd>
                              {effect.presentation.frameCount === null
                                ? "Not specified"
                                : sourceNumber.format(
                                    effect.presentation.frameCount,
                                  )}
                            </dd>
                          </div>
                          <div>
                            <dt>Effect source frame rate</dt>
                            <dd>
                              {effect.presentation.frameRate === null
                                ? "Not specified"
                                : sourceNumber.format(
                                    effect.presentation.frameRate,
                                  )}
                            </dd>
                          </div>
                          <div>
                            <dt>Centered effect presentation</dt>
                            <dd>
                              {effect.presentation.centered === null
                                ? "Not specified"
                                : yesNo(effect.presentation.centered)}
                            </dd>
                          </div>
                          <div>
                            <dt>Effect sound cue</dt>
                            <dd>
                              {effect.presentation.soundEffect === null
                                ? "Not supplied"
                                : "Supplied"}
                            </dd>
                          </div>
                        </>
                      ) : null}
                      {effect.createdObjectSpritePath !== null ? (
                        <div>
                          <dt>Created object sprite reference</dt>
                          <dd>Supplied</dd>
                        </div>
                      ) : null}
                      {effect.regenerateGraphics !== null ? (
                        <div>
                          <dt>Regenerate graphics source flag</dt>
                          <dd>{yesNo(effect.regenerateGraphics)}</dd>
                        </div>
                      ) : null}
                      {effect.buffTag !== null ? (
                        <div>
                          <dt>Buff tag source token</dt>
                          <dd>{effect.buffTag}</dd>
                        </div>
                      ) : null}
                      {effect.controls.chancePercent !== null ? (
                        <div>
                          <dt>Source chance</dt>
                          <dd>{effect.controls.chancePercent}%</dd>
                        </div>
                      ) : null}
                      {effect.controls.durationTurns !== null ? (
                        <div>
                          <dt>Declared duration</dt>
                          <dd>
                            {effect.controls.durationTurns} source{" "}
                            {effect.controls.durationTurns === 1
                              ? "turn"
                              : "turns"}
                          </dd>
                        </div>
                      ) : null}
                      {effect.controls.after !== null ? (
                        <div>
                          <dt>After source flag</dt>
                          <dd>{yesNo(effect.controls.after)}</dd>
                        </div>
                      ) : null}
                      {effect.controls.affectsCaster !== null ? (
                        <div>
                          <dt>Affects caster</dt>
                          <dd>{yesNo(effect.controls.affectsCaster)}</dd>
                        </div>
                      ) : null}
                      {effect.controls.affectsSelf !== null ? (
                        <div>
                          <dt>Self flag</dt>
                          <dd>{yesNo(effect.controls.affectsSelf)}</dd>
                        </div>
                      ) : null}
                      {effect.controls.affectsCorpses !== null ? (
                        <div>
                          <dt>Affects corpses</dt>
                          <dd>{yesNo(effect.controls.affectsCorpses)}</dd>
                        </div>
                      ) : null}
                      {effect.controls.resistable !== null ? (
                        <div>
                          <dt>Resistable</dt>
                          <dd>{yesNo(effect.controls.resistable)}</dd>
                        </div>
                      ) : null}
                      {effect.controls.burnsTarget !== null ? (
                        <div>
                          <dt>Burn flag</dt>
                          <dd>{yesNo(effect.controls.burnsTarget)}</dd>
                        </div>
                      ) : null}
                      {effect.controls.bleedsTarget !== null ? (
                        <div>
                          <dt>Starts bleeding</dt>
                          <dd>{yesNo(effect.controls.bleedsTarget)}</dd>
                        </div>
                      ) : null}
                      {effect.controls.midas !== null ? (
                        <div>
                          <dt>Midas source flag</dt>
                          <dd>{yesNo(effect.controls.midas)}</dd>
                        </div>
                      ) : null}
                      {effect.controls.skipAnimation !== null ? (
                        <div>
                          <dt>Skip animation</dt>
                          <dd>{yesNo(effect.controls.skipAnimation)}</dd>
                        </div>
                      ) : null}
                      {effect.controls.taxonomy !== null ? (
                        <div>
                          <dt>Taxonomy</dt>
                          <dd>{effect.controls.taxonomy}</dd>
                        </div>
                      ) : null}
                      {!hasSourceControls ? (
                        <div>
                          <dt>Source controls</dt>
                          <dd>None declared</dd>
                        </div>
                      ) : null}
                      {effect.conditions.requiresSourceBuff !== null ? (
                        <div>
                          <dt>Requires source buff</dt>
                          <dd>{yesNo(effect.conditions.requiresSourceBuff)}</dd>
                        </div>
                      ) : null}
                      {effect.conditions.requiredBuff.enabled !== null ? (
                        <div>
                          <dt>Named buff required</dt>
                          <dd>
                            {yesNo(effect.conditions.requiredBuff.enabled)}
                          </dd>
                        </div>
                      ) : null}
                      {effect.conditions.requiredBuff.spellName !== null ? (
                        <div>
                          <dt>Required buff</dt>
                          <dd>
                            {requiredBuff ? (
                              <Link
                                className="entity-link font-semibold"
                                href={`/spells/${requiredBuff.slug}`}
                              >
                                {requiredBuff.name}
                              </Link>
                            ) : (
                              `${effect.conditions.requiredBuff.spellName} (unresolved)`
                            )}
                          </dd>
                        </div>
                      ) : null}
                      {effect.conditions.forbiddenBuff.enabled !== null ? (
                        <div>
                          <dt>Named buff forbidden</dt>
                          <dd>
                            {yesNo(effect.conditions.forbiddenBuff.enabled)}
                          </dd>
                        </div>
                      ) : null}
                      {effect.conditions.forbiddenBuff.spellName !== null ? (
                        <div>
                          <dt>Forbidden buff</dt>
                          <dd>
                            {forbiddenBuff ? (
                              <Link
                                className="entity-link font-semibold"
                                href={`/spells/${forbiddenBuff.slug}`}
                              >
                                {forbiddenBuff.name}
                              </Link>
                            ) : (
                              `${effect.conditions.forbiddenBuff.spellName} (unresolved)`
                            )}
                          </dd>
                        </div>
                      ) : null}
                      {!hasSourceConditions ? (
                        <div>
                          <dt>Source conditions</dt>
                          <dd>None declared</dd>
                        </div>
                      ) : null}
                    </dl>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized spell effects.
            </p>
          )}
        </section>

        <section
          className="detail-card"
          aria-labelledby="effect-list-options-heading"
        >
          <h2 id="effect-list-options-heading" className="section-title-sm">
            Effect list options
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Options preserve source order and direct item amounts. Selection
            weights, probabilities, eligibility, fallback behavior, and runtime
            execution are not inferred.
          </p>
          {listOptionEffects.length > 0 ? (
            <ul className="trigger-list mt-4">
              {listOptionEffects.map(({ effect, effectIndex }) => (
                <li key={`${effect.type}:${effectIndex}`}>
                  <h3 className="relationship-title">
                    {effectTypeLabel(effect.type)} effect
                  </h3>
                  <ol className="relation-list mt-3">
                    {effect.options.map((option, optionIndex) => {
                      const target =
                        option.kind === "item"
                          ? option.itemResolution?.status === "resolved"
                            ? itemsById.get(option.itemResolution.targetId)
                            : undefined
                          : option.spellId
                            ? spellsById.get(option.spellId)
                            : undefined;
                      const targetName =
                        option.kind === "item"
                          ? option.itemName
                          : option.spellName;
                      const reviewedCorrection =
                        option.kind === "item" &&
                        option.itemResolution?.status === "resolved" &&
                        option.itemResolution.resolutionMethod ===
                          "reviewed-correction"
                          ? option.itemResolution
                          : undefined;
                      return (
                        <li key={optionIndex}>
                          <span>
                            <span className="supporting-note">
                              Option {optionIndex + 1}
                            </span>
                            {target ? (
                              <Link
                                className="entity-link font-semibold"
                                href={
                                  option.kind === "item"
                                    ? `/items/${target.slug}`
                                    : `/spells/${target.slug}`
                                }
                              >
                                {target.name}
                              </Link>
                            ) : (
                              <strong>
                                {targetName ?? "Missing target name"}
                              </strong>
                            )}
                          </span>
                          <span>
                            {target
                              ? reviewedCorrection
                                ? `Reviewed correction from source label “${reviewedCorrection.sourceLabel}”`
                                : `Resolved ${option.kind} target`
                              : option.kind === "item" &&
                                  option.itemResolution?.status ===
                                    "source-only"
                                ? "Source-only item label"
                                : targetName
                                  ? `Unresolved ${option.kind} target`
                                  : "Target unavailable"}
                            {option.kind === "item"
                              ? ` · Source amount: ${option.amount ?? "not declared"}`
                              : ""}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No normalized effect list options.
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
                        <span>
                          {effectTypeLabel(backlink.effect.type)} effect
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {optionSpellBacklinks.length > 0 ? (
                <section aria-labelledby="spell-option-backlinks-heading">
                  <h3
                    id="spell-option-backlinks-heading"
                    className="relationship-title"
                  >
                    Spell list options
                  </h3>
                  <ul className="relation-list">
                    {optionSpellBacklinks.map((backlink) => (
                      <li
                        key={`${backlink.spell.id}:${backlink.effectIndex}:${backlink.optionIndex}`}
                      >
                        <Link
                          className="entity-link font-semibold"
                          href={`/spells/${backlink.spell.slug}`}
                        >
                          {backlink.spell.name}
                        </Link>
                        <span>
                          {effectTypeLabel(backlink.effect.type)} option{" "}
                          {backlink.optionIndex + 1}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {conditionBacklinks.length > 0 ? (
                <section aria-labelledby="condition-backlinks-heading">
                  <h3
                    id="condition-backlinks-heading"
                    className="relationship-title"
                  >
                    Conditional effect references
                  </h3>
                  <ul className="relation-list">
                    {conditionBacklinks.map((backlink) => (
                      <li
                        key={`${backlink.spell.id}:${backlink.effectIndex}:${backlink.kind}`}
                      >
                        <Link
                          className="entity-link font-semibold"
                          href={`/spells/${backlink.spell.slug}`}
                        >
                          {backlink.spell.name}
                        </Link>
                        <span>
                          {backlink.kind === "required-buff"
                            ? "Required named buff"
                            : "Forbidden named buff"}
                          {backlink.condition.enabled === null
                            ? " (flag unavailable)"
                            : backlink.condition.enabled
                              ? ""
                              : " (flag disabled)"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {removedBuffBacklinks.length > 0 ? (
                <section aria-labelledby="removed-buff-backlinks-heading">
                  <h3
                    id="removed-buff-backlinks-heading"
                    className="relationship-title"
                  >
                    Named buff removals
                  </h3>
                  <ul className="relation-list">
                    {removedBuffBacklinks.map((backlink) => (
                      <li key={`${backlink.spell.id}:${backlink.effectIndex}`}>
                        <Link
                          className="entity-link font-semibold"
                          href={`/spells/${backlink.spell.slug}`}
                        >
                          {backlink.spell.name}
                        </Link>
                        <span>Remove buff by name effect</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {buffHookBacklinks.length > 0 ? (
                <section aria-labelledby="buff-hook-backlinks-heading">
                  <h3
                    id="buff-hook-backlinks-heading"
                    className="relationship-title"
                  >
                    Spell buff event hooks
                  </h3>
                  <ul className="relation-list">
                    {buffHookBacklinks.map((backlink) => (
                      <li
                        key={`${backlink.spell.id}:${backlink.buffIndex}:${backlink.hookIndex}`}
                      >
                        <Link
                          className="entity-link font-semibold"
                          href={`/spells/${backlink.spell.slug}`}
                        >
                          {backlink.spell.name}
                        </Link>
                        <span>{buffEventHookLabels[backlink.hook.kind]}</span>
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
              {macguffinBacklinks.length > 0 ? (
                <section aria-labelledby="macguffin-backlinks-heading">
                  <h3
                    id="macguffin-backlinks-heading"
                    className="relationship-title"
                  >
                    Item macguffins
                  </h3>
                  <ul className="relation-list">
                    {macguffinBacklinks.map(
                      ({ item, declaration, declarationIndex }) => (
                        <li key={`${item.id}:${declarationIndex}`}>
                          <Link
                            className="entity-link font-semibold"
                            href={`/items/${item.slug}`}
                          >
                            {item.name}
                          </Link>
                          <span>
                            {declaration.itemClassName ??
                              "Direct macguffin spell reference"}
                          </span>
                        </li>
                      ),
                    )}
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
