import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { entityRouteSlugs, matchesEntityRoute } from "@dredmorpedia/domain";

import { ProvenanceCard } from "@/components/provenance-card";
import { loadArtifact, loadDiagnostics } from "@/lib/artifact";
import { spellTriggerLabels } from "@/lib/spell-triggers";
import {
  signedStatModifierValue,
  statModifierLabel,
} from "@/lib/stat-modifiers";

export const dynamicParams = false;

export function generateStaticParams() {
  return loadArtifact().entities.abilities.flatMap((ability) =>
    entityRouteSlugs(ability).map((slug) => ({ slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ability = loadArtifact().entities.abilities.find((entry) =>
    matchesEntityRoute(entry, slug),
  );
  return ability
    ? {
        title: ability.name,
        description:
          ability.description ||
          "Ability with normalized skill progression, modifiers, and spell triggers.",
        ...(slug === ability.slug
          ? {}
          : { robots: { index: false, follow: true } }),
      }
    : { title: "Ability not found" };
}

export default async function AbilityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artifact = loadArtifact();
  const ability = artifact.entities.abilities.find((entry) =>
    matchesEntityRoute(entry, slug),
  );
  if (!ability) {
    notFound();
  }

  const diagnostics = loadDiagnostics().filter((entry) =>
    ability.diagnosticIds.includes(entry.id),
  );
  const skill = ability.skillId
    ? artifact.entities.skills.find((entry) => entry.id === ability.skillId)
    : undefined;
  const spellsById = new Map(
    artifact.entities.spells.map((spell) => [spell.id, spell]),
  );
  const isAlias = slug !== ability.slug;

  return (
    <article className="detail-page">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/">Items</Link>
        <span aria-hidden="true">/</span>
        <span>Skills</span>
        <span aria-hidden="true">/</span>
        {skill ? (
          <Link href={`/skills/${skill.slug}`}>{skill.name}</Link>
        ) : (
          <span>Unknown skill</span>
        )}
        <span aria-hidden="true">/</span>
        <span aria-current="page">{ability.name}</span>
      </nav>

      {isAlias ? (
        <aside className="alias-note" aria-labelledby="alias-heading">
          <div>
            <p className="eyebrow">Alias route</p>
            <h2 id="alias-heading" className="font-semibold">
              This alternate URL resolves to {ability.name}
            </h2>
          </div>
          <Link className="entity-link" href={`/abilities/${ability.slug}`}>
            Open canonical URL
          </Link>
        </aside>
      ) : null}

      <header className="detail-header">
        <div>
          <p className="eyebrow">
            {ability.startSkill
              ? "Starting ability"
              : `Level ${ability.level} ability`}
          </p>
          <h1 className="detail-title">{ability.name}</h1>
          <p className="detail-copy">
            {ability.description || "No normalized ability description."}
          </p>
        </div>
        <dl className="price-block">
          <div>
            <dt>Spell triggers</dt>
            <dd>{ability.triggers.length}</dd>
          </div>
          <div>
            <dt>Modifiers</dt>
            <dd>{ability.modifiers.length}</dd>
          </div>
          <div>
            <dt>Skill</dt>
            <dd>{skill?.name ?? ability.skillKey}</dd>
          </div>
        </dl>
      </header>

      <div className="detail-grid">
        <section
          className="detail-card"
          aria-labelledby="ability-skill-heading"
        >
          <h2 id="ability-skill-heading" className="section-title-sm">
            Skill progression
          </h2>
          <ul className="relation-list">
            <li>
              {skill ? (
                <Link
                  className="entity-link font-semibold"
                  href={`/skills/${skill.slug}`}
                >
                  {skill.name}
                </Link>
              ) : (
                <strong>{ability.skillKey}</strong>
              )}
              <span>
                {skill
                  ? ability.startSkill
                    ? "Starting ability"
                    : `Level ${ability.level}`
                  : "Unresolved skill reference"}
              </span>
            </li>
          </ul>
        </section>

        <section
          className="detail-card"
          aria-labelledby="ability-modifiers-heading"
        >
          <h2 id="ability-modifiers-heading" className="section-title-sm">
            Direct modifiers
          </h2>
          {ability.modifiers.length > 0 ? (
            <>
              <dl className="stat-list">
                {ability.modifiers.map((modifier, index) => (
                  <div key={`${modifier.kind}:${modifier.sourceKey}:${index}`}>
                    <dt>{statModifierLabel(modifier)}</dt>
                    <dd>{signedStatModifierValue(modifier.amount)}</dd>
                  </div>
                ))}
              </dl>
              {ability.modifiers.some(
                (modifier) =>
                  modifier.kind === "primary" || modifier.kind === "secondary",
              ) ? (
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  Primary and secondary modifiers retain their numeric game stat
                  IDs until an approved standalone stat-definition source is
                  selected.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized direct modifiers.
            </p>
          )}
        </section>

        <section
          className="detail-card"
          aria-labelledby="ability-spells-heading"
        >
          <h2 id="ability-spells-heading" className="section-title-sm">
            Spell triggers
          </h2>
          {ability.triggers.length > 0 ? (
            <ul className="trigger-list">
              {ability.triggers.map((trigger, triggerIndex) => {
                const spell = trigger.spellId
                  ? spellsById.get(trigger.spellId)
                  : undefined;
                return (
                  <li
                    key={`${trigger.kind}:${trigger.spellKey}:${triggerIndex}`}
                  >
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
                    </dl>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized spell triggers.
            </p>
          )}
        </section>

        <ProvenanceCard
          artifact={artifact}
          entity={ability}
          headingId="ability-provenance-heading"
        />

        <section
          className="detail-card"
          aria-labelledby="ability-diagnostics-heading"
        >
          <h2 id="ability-diagnostics-heading" className="section-title-sm">
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
              No diagnostics are attached to the active ability.
            </p>
          )}
        </section>
      </div>
    </article>
  );
}
