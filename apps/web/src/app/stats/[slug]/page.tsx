import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  allSpellEffects,
  entityRouteSlugs,
  matchesEntityRoute,
} from "@dredmorpedia/domain";

import { ProvenanceCard } from "@/components/provenance-card";
import { StatIcon } from "@/components/stat-modifier-link";
import { loadArtifact, loadArtifactSha256 } from "@/lib/artifact";

export const dynamicParams = false;
const unavailableSlug = "unavailable";

export function generateStaticParams() {
  const stats = loadArtifact().entities.stats;
  return stats.length > 0
    ? stats.flatMap((stat) => entityRouteSlugs(stat).map((slug) => ({ slug })))
    : [{ slug: unavailableSlug }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const artifact = loadArtifact();
  const stat = artifact.entities.stats.find((entry) =>
    matchesEntityRoute(entry, slug),
  );
  if (!stat && slug === unavailableSlug) {
    return {
      title: "Stat definitions unavailable",
      description: "This dataset does not contain standalone stat definitions.",
    };
  }
  const isProjectReference = artifact.sources.some(
    (source) =>
      source.id === stat?.provenance.sourceId && source.kind === "reference",
  );
  return stat
    ? {
        title: stat.name,
        description:
          stat.description ||
          (stat.modifier
            ? `${isProjectReference ? "Dredmorpedia" : "Source"} reference for ${stat.modifier.kind}:${stat.modifier.sourceKey}.`
            : "Dredmorpedia stat definition."),
        ...(slug === stat.slug
          ? {}
          : { robots: { index: false, follow: true } }),
      }
    : { title: "Stat not found" };
}

export default async function StatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artifact = loadArtifact();
  const artifactSha256 = loadArtifactSha256();
  const stat = artifact.entities.stats.find((entry) =>
    matchesEntityRoute(entry, slug),
  );
  if (
    !stat &&
    slug === unavailableSlug &&
    artifact.entities.stats.length === 0
  ) {
    return (
      <article className="detail-page">
        <nav aria-label="Breadcrumb" className="breadcrumb">
          <Link href="/browse/">Browse</Link>
          <span aria-hidden="true">/</span>
          <Link href="/browse/stats/1/">Stats</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Unavailable</span>
        </nav>
        <section className="empty-state" aria-labelledby="stat-empty-heading">
          <p className="eyebrow">Dataset limitation</p>
          <h1 id="stat-empty-heading" className="section-title-sm">
            Standalone stat definitions are unavailable
          </h1>
          <p>
            This source build does not provide a stat database. Item stat values
            remain searchable, but dedicated stat descriptions and backlinks
            cannot be generated without a configured definition source.
          </p>
        </section>
      </article>
    );
  }
  if (!stat) {
    notFound();
  }

  const items = artifact.entities.items.filter(
    (item) =>
      item.stats.some((value) => value.statId === stat.id) ||
      item.modifiers.some((modifier) => modifier.statId === stat.id),
  );
  const spells = artifact.entities.spells.filter(
    (spell) =>
      allSpellEffects(spell).some((effect) => effect.statId === stat.id) ||
      spell.buffs.some((buff) =>
        buff.modifiers.some((modifier) => modifier.statId === stat.id),
      ),
  );
  const abilities = artifact.entities.abilities.filter((ability) =>
    ability.modifiers.some((modifier) => modifier.statId === stat.id),
  );
  const encrustments = artifact.entities.encrustments.filter((encrustment) =>
    encrustment.modifiers.some((modifier) => modifier.statId === stat.id),
  );
  const monsters = artifact.entities.monsters.filter((monster) =>
    monster.modifiers.some((modifier) => modifier.statId === stat.id),
  );
  const referenceCount =
    items.length +
    spells.length +
    abilities.length +
    encrustments.length +
    monsters.length;
  const isAlias = slug !== stat.slug;
  const isProjectReference = artifact.sources.some(
    (source) =>
      source.id === stat.provenance.sourceId && source.kind === "reference",
  );

  return (
    <article className="detail-page">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/browse/">Browse</Link>
        <span aria-hidden="true">/</span>
        <Link href="/browse/stats/1/">Stats</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{stat.name}</span>
      </nav>

      <header className="detail-header">
        <div className="stat-detail-heading">
          <StatIcon
            artifact={artifact}
            artifactSha256={artifactSha256}
            stat={stat}
          />
          <div>
            <p className="eyebrow">{stat.group} stat</p>
            <h1 className="detail-title">{stat.name}</h1>
            <p className="detail-copy">
              {stat.description
                ? stat.description
                : stat.modifier
                  ? `${isProjectReference ? "Project" : "Source"} reference mapping for source selector ${stat.modifier.kind}:${stat.modifier.sourceKey}.`
                  : "No standalone description is available for this definition."}
            </p>
          </div>
        </div>
        <dl className="price-block">
          <dt>Referenced by</dt>
          <dd>
            {referenceCount === 1 ? "1 record" : `${referenceCount} records`}
          </dd>
        </dl>
      </header>

      {isAlias ? (
        <aside className="alias-note" aria-labelledby="alias-heading">
          <div>
            <p className="eyebrow">Alias route</p>
            <h2 id="alias-heading" className="font-semibold">
              This alternate URL resolves to {stat.name}
            </h2>
          </div>
          <Link className="entity-link" href={`/stats/${stat.slug}`}>
            Open canonical URL
          </Link>
        </aside>
      ) : null}

      <div className="detail-grid">
        <section className="detail-card" aria-labelledby="stat-items-heading">
          <h2 id="stat-items-heading" className="section-title-sm">
            Items with this stat
          </h2>
          {items.length > 0 ? (
            <ul className="relation-list">
              {items.map((item) => {
                const values = [
                  ...item.stats
                    .filter((entry) => entry.statId === stat.id)
                    .map((entry) => entry.amount),
                  ...item.modifiers
                    .filter((modifier) => modifier.statId === stat.id)
                    .map((modifier) => modifier.amount),
                ];
                return (
                  <li key={item.id}>
                    <Link className="entity-link" href={`/items/${item.slug}`}>
                      {item.name}
                    </Link>
                    <span>
                      {values
                        .map((value) => (value > 0 ? `+${value}` : value))
                        .join(", ") || "Unknown"}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized items reference this stat.
            </p>
          )}
        </section>

        <section className="detail-card" aria-labelledby="stat-spells-heading">
          <h2 id="stat-spells-heading" className="section-title-sm">
            Spell effects
          </h2>
          {spells.length > 0 ? (
            <ul className="relation-list">
              {spells.map((spell) => (
                <li key={spell.id}>
                  <Link
                    className="entity-link font-semibold"
                    href={`/spells/${spell.slug}`}
                  >
                    {spell.name}
                  </Link>
                  <span>Modifies this stat</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized spell effects reference this stat.
            </p>
          )}
        </section>

        <section
          className="detail-card"
          aria-labelledby="stat-abilities-heading"
        >
          <h2 id="stat-abilities-heading" className="section-title-sm">
            Abilities
          </h2>
          {abilities.length > 0 ? (
            <ul className="relation-list">
              {abilities.map((ability) => (
                <li key={ability.id}>
                  <Link
                    className="entity-link"
                    href={`/abilities/${ability.slug}`}
                  >
                    {ability.name}
                  </Link>
                  <span>Modifies this stat</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized abilities reference this stat.
            </p>
          )}
        </section>

        <section
          className="detail-card"
          aria-labelledby="stat-encrustments-heading"
        >
          <h2 id="stat-encrustments-heading" className="section-title-sm">
            Encrustments
          </h2>
          {encrustments.length > 0 ? (
            <ul className="relation-list">
              {encrustments.map((encrustment) => (
                <li key={encrustment.id}>
                  <Link
                    className="entity-link"
                    href={`/encrustments/${encrustment.slug}`}
                  >
                    {encrustment.name}
                  </Link>
                  <span>Modifies this stat</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized encrustments reference this stat.
            </p>
          )}
        </section>

        <section
          className="detail-card"
          aria-labelledby="stat-monsters-heading"
        >
          <h2 id="stat-monsters-heading" className="section-title-sm">
            Monsters
          </h2>
          {monsters.length > 0 ? (
            <ul className="relation-list">
              {monsters.map((monster) => (
                <li key={monster.id}>
                  <Link
                    className="entity-link"
                    href={`/monsters/${monster.slug}`}
                  >
                    {monster.name}
                  </Link>
                  <span>Modifies this stat</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized monsters reference this stat.
            </p>
          )}
        </section>

        {stat.modifier ? (
          <section
            className="detail-card"
            aria-labelledby="stat-reference-heading"
          >
            <h2 id="stat-reference-heading" className="section-title-sm">
              Reference mapping
            </h2>
            <dl className="provenance-list">
              <div>
                <dt>Modifier kind</dt>
                <dd>{stat.modifier.kind}</dd>
              </div>
              <div>
                <dt>Source key</dt>
                <dd>{stat.modifier.sourceKey}</dd>
              </div>
            </dl>
            <p className="text-sm text-muted-foreground">
              This {isProjectReference ? "project-authored" : "source"}
              mapping supplies a name and category. It does not define a
              gameplay formula.
            </p>
          </section>
        ) : null}

        <ProvenanceCard
          artifact={artifact}
          entity={stat}
          headingId="stat-source-heading"
        />
      </div>
    </article>
  );
}
