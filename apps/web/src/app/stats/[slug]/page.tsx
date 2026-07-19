import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { entityRouteSlugs, matchesEntityRoute } from "@dredmorpedia/domain";

import { ProvenanceCard } from "@/components/provenance-card";
import { loadArtifact } from "@/lib/artifact";

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
  const stat = loadArtifact().entities.stats.find((entry) =>
    matchesEntityRoute(entry, slug),
  );
  if (!stat && slug === unavailableSlug) {
    return {
      title: "Stat definitions unavailable",
      description: "This dataset does not contain standalone stat definitions.",
    };
  }
  return stat
    ? {
        title: stat.name,
        description: stat.description,
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
          <Link href="/search?kind=stat">Stats</Link>
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
            cannot be generated without an approved definition source.
          </p>
        </section>
      </article>
    );
  }
  if (!stat) {
    notFound();
  }

  const items = artifact.entities.items.filter((item) =>
    item.stats.some((value) => value.statId === stat.id),
  );
  const spells = artifact.entities.spells.filter((spell) =>
    spell.effects.some((effect) => effect.statId === stat.id),
  );
  const referenceCount = items.length + spells.length;
  const isAlias = slug !== stat.slug;

  return (
    <article className="detail-page">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/search?kind=stat">Stats</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{stat.name}</span>
      </nav>

      {isAlias ? (
        <aside className="alias-note" aria-labelledby="alias-heading">
          <div>
            <p className="eyebrow">Alias route</p>
            <h2 id="alias-heading" className="font-semibold">
              This source-ID URL resolves to {stat.name}
            </h2>
          </div>
          <Link className="entity-link" href={`/stats/${stat.slug}`}>
            Open canonical URL
          </Link>
        </aside>
      ) : null}

      <header className="detail-header">
        <div>
          <p className="eyebrow">{stat.group} stat</p>
          <h1 className="detail-title">{stat.name}</h1>
          <p className="detail-copy">{stat.description}</p>
        </div>
        <dl className="price-block">
          <dt>Referenced by</dt>
          <dd>
            {referenceCount === 1 ? "1 record" : `${referenceCount} records`}
          </dd>
        </dl>
      </header>

      <div className="detail-grid">
        <section className="detail-card" aria-labelledby="stat-items-heading">
          <h2 id="stat-items-heading" className="section-title-sm">
            Items with this stat
          </h2>
          {items.length > 0 ? (
            <ul className="relation-list">
              {items.map((item) => {
                const value = item.stats.find(
                  (entry) => entry.statId === stat.id,
                );
                return (
                  <li key={item.id}>
                    <Link className="entity-link" href={`/items/${item.slug}`}>
                      {item.name}
                    </Link>
                    <span>
                      {value && value.amount > 0 ? "+" : ""}
                      {value?.amount ?? "Unknown"}
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
                  <strong>{spell.name}</strong>
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

        <ProvenanceCard
          artifact={artifact}
          entity={stat}
          headingId="stat-source-heading"
        />
      </div>
    </article>
  );
}
