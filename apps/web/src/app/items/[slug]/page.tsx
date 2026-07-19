import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  entityRouteSlugs,
  itemRecipeRelationships,
  matchesEntityRoute,
} from "@dredmorpedia/domain";

import { ProvenanceCard } from "@/components/provenance-card";
import { loadArtifact, loadDiagnostics } from "@/lib/artifact";

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
  const statsById = new Map(
    artifact.entities.stats.map((stat) => [stat.id, stat]),
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
          <p className="eyebrow">{item.category}</p>
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
        </dl>
      </header>

      <div className="detail-grid">
        <section className="detail-card" aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="section-title-sm">
            Stats
          </h2>
          {item.stats.length > 0 ? (
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
                  <dd>{stat.amount > 0 ? `+${stat.amount}` : stat.amount}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized stat values.
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
