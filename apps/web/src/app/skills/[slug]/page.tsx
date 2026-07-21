import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  entityRouteSlugs,
  matchesEntityRoute,
  skillAbilityRelationships,
} from "@dredmorpedia/domain";

import { ProvenanceCard } from "@/components/provenance-card";
import { loadArtifact, loadDiagnostics } from "@/lib/artifact";
import { sourceFlagLabel, sourceFlagValue } from "@/lib/source-flags";

export const dynamicParams = false;

function titleCase(value: string): string {
  return value
    .split(/[-_ ]+/)
    .map(
      (part) => `${part.slice(0, 1).toLocaleUpperCase("en")}${part.slice(1)}`,
    )
    .join(" ");
}

export function generateStaticParams() {
  return loadArtifact().entities.skills.flatMap((skill) =>
    entityRouteSlugs(skill).map((slug) => ({ slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const skill = loadArtifact().entities.skills.find((entry) =>
    matchesEntityRoute(entry, slug),
  );
  return skill
    ? {
        title: skill.name,
        description:
          skill.description ||
          `${titleCase(skill.archetype)} skill with normalized abilities and starting loadouts.`,
        ...(slug === skill.slug
          ? {}
          : { robots: { index: false, follow: true } }),
      }
    : { title: "Skill not found" };
}

export default async function SkillPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artifact = loadArtifact();
  const skill = artifact.entities.skills.find((entry) =>
    matchesEntityRoute(entry, slug),
  );
  if (!skill) {
    notFound();
  }

  const diagnostics = loadDiagnostics().filter((entry) =>
    skill.diagnosticIds.includes(entry.id),
  );
  const abilityRelationships = skillAbilityRelationships(
    artifact.entities.abilities,
    skill.id,
  );
  const itemsById = new Map(
    artifact.entities.items.map((item) => [item.id, item]),
  );
  const isAlias = slug !== skill.slug;

  return (
    <article className="detail-page">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/">Items</Link>
        <span aria-hidden="true">/</span>
        <span>Skills</span>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{skill.name}</span>
      </nav>

      {isAlias ? (
        <aside className="alias-note" aria-labelledby="alias-heading">
          <div>
            <p className="eyebrow">Alias route</p>
            <h2 id="alias-heading" className="font-semibold">
              This alternate URL resolves to {skill.name}
            </h2>
          </div>
          <Link className="entity-link" href={`/skills/${skill.slug}`}>
            Open canonical URL
          </Link>
        </aside>
      ) : null}

      <header className="detail-header">
        <div>
          <p className="eyebrow">{titleCase(skill.archetype)} skill</p>
          <h1 className="detail-title">{skill.name}</h1>
          <p className="detail-copy">
            {skill.description || "No normalized skill description."}
          </p>
        </div>
        <dl className="price-block">
          <div>
            <dt>Abilities</dt>
            <dd>{abilityRelationships.length}</dd>
          </div>
          <div>
            <dt>Loadout entries</dt>
            <dd>{skill.loadouts.length}</dd>
          </div>
        </dl>
      </header>

      <div className="detail-grid">
        <section className="detail-card" aria-labelledby="loadout-heading">
          <h2 id="loadout-heading" className="section-title-sm">
            Starting loadout
          </h2>
          {skill.loadouts.length > 0 ? (
            <ul className="relation-list recipe-reference-list">
              {skill.loadouts.map((loadout, loadoutIndex) => {
                const item = loadout.itemId
                  ? itemsById.get(loadout.itemId)
                  : undefined;
                const itemLabel = loadout.itemName
                  ? loadout.itemName
                  : `Random ${titleCase(loadout.itemType ?? "item")}`;
                return (
                  <li
                    key={`${loadout.itemKey ?? loadout.itemType ?? "item"}:${loadoutIndex}`}
                  >
                    <span className="skill-loadout-name">
                      {item ? (
                        <Link
                          className="entity-link font-semibold"
                          href={`/items/${item.slug}`}
                        >
                          {item.name}
                        </Link>
                      ) : (
                        <strong>{itemLabel}</strong>
                      )}
                      {loadout.itemKey && !item ? (
                        <small className="trigger-resolution-unresolved">
                          Unresolved item
                        </small>
                      ) : null}
                      <small>
                        {loadout.always
                          ? "Always included"
                          : "Possible starting option"}
                      </small>
                    </span>
                    <strong>{loadout.amount} ×</strong>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized starting loadout entries.
            </p>
          )}
        </section>

        <section className="detail-card" aria-labelledby="abilities-heading">
          <h2 id="abilities-heading" className="section-title-sm">
            Abilities
          </h2>
          {abilityRelationships.length > 0 ? (
            <ul className="relation-list">
              {abilityRelationships.map(({ ability }) => (
                <li key={ability.id}>
                  <Link
                    className="entity-link font-semibold"
                    href={`/abilities/${ability.slug}`}
                  >
                    {ability.name}
                  </Link>
                  <span>
                    {ability.startSkill
                      ? "Starting ability"
                      : `Level ${ability.level}`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized abilities reference this skill.
            </p>
          )}
        </section>

        <section
          className="detail-card"
          aria-labelledby="skill-metadata-heading"
        >
          <h2 id="skill-metadata-heading" className="section-title-sm">
            Progression metadata
          </h2>
          {skill.progressionTags.length > 0 || skill.sourceFlags.length > 0 ? (
            <div className="relationship-groups">
              {skill.progressionTags.length > 0 ? (
                <section aria-labelledby="skill-tags-heading">
                  <h3 id="skill-tags-heading" className="relationship-title">
                    Progression tags
                  </h3>
                  <ul className="relation-list">
                    {skill.progressionTags.map((tag, index) => (
                      <li key={`${tag.level}:${tag.name}:${index}`}>
                        <strong>{tag.name}</strong>
                        <span>Level {tag.level}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {skill.sourceFlags.length > 0 ? (
                <section aria-labelledby="skill-flags-heading">
                  <h3 id="skill-flags-heading" className="relationship-title">
                    Source flags
                  </h3>
                  <dl className="stat-list">
                    {skill.sourceFlags.map((flag, index) => (
                      <div key={`${flag.sourceKey}:${flag.value}:${index}`}>
                        <dt>{sourceFlagLabel(flag)}</dt>
                        <dd>{sourceFlagValue(flag)}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ) : null}
              <p className="text-xs leading-5 text-muted-foreground">
                These values preserve source metadata without inferring
                undocumented gameplay behavior.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized progression metadata.
            </p>
          )}
        </section>

        <ProvenanceCard
          artifact={artifact}
          entity={skill}
          headingId="skill-provenance-heading"
        />

        <section
          className="detail-card"
          aria-labelledby="skill-diagnostics-heading"
        >
          <h2 id="skill-diagnostics-heading" className="section-title-sm">
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
              No diagnostics are attached to the active skill.
            </p>
          )}
        </section>
      </div>
    </article>
  );
}
