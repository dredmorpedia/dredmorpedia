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

export const dynamicParams = false;

export function generateStaticParams() {
  return loadArtifact().entities.recipes.flatMap((recipe) =>
    entityRouteSlugs(recipe).map((slug) => ({ slug })),
  );
}

function titleCase(value: string): string {
  return value
    .split(/[-_ ]+/)
    .map(
      (part) => `${part.slice(0, 1).toLocaleUpperCase("en")}${part.slice(1)}`,
    )
    .join(" ");
}

function RecipeReferences({
  references,
  itemsById,
  amountLabel,
}: {
  references: ItemReference[];
  itemsById: ReadonlyMap<string, Item>;
  amountLabel: string;
}) {
  if (references.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No normalized item references.
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
            <strong>
              {amountLabel} {reference.amount}
            </strong>
          </li>
        );
      })}
    </ul>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const recipe = loadArtifact().entities.recipes.find((entry) =>
    matchesEntityRoute(entry, slug),
  );
  return recipe
    ? {
        title: recipe.name,
        description:
          recipe.description ||
          `${titleCase(recipe.tool)} recipe with normalized inputs and outputs.`,
        ...(slug === recipe.slug
          ? {}
          : { robots: { index: false, follow: true } }),
      }
    : { title: "Recipe not found" };
}

export default async function RecipePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artifact = loadArtifact();
  const recipe = artifact.entities.recipes.find((entry) =>
    matchesEntityRoute(entry, slug),
  );
  if (!recipe) {
    notFound();
  }

  const diagnostics = loadDiagnostics().filter((entry) =>
    recipe.diagnosticIds.includes(entry.id),
  );
  const itemsById = new Map(
    artifact.entities.items.map((item) => [item.id, item]),
  );
  const isAlias = slug !== recipe.slug;
  const tool = titleCase(recipe.tool);

  return (
    <article className="detail-page">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/">Items</Link>
        <span aria-hidden="true">/</span>
        <span>Recipes</span>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{recipe.name}</span>
      </nav>

      {isAlias ? (
        <aside className="alias-note" aria-labelledby="alias-heading">
          <div>
            <p className="eyebrow">Alias route</p>
            <h2 id="alias-heading" className="font-semibold">
              This alternate URL resolves to {recipe.name}
            </h2>
          </div>
          <Link className="entity-link" href={`/recipes/${recipe.slug}`}>
            Open canonical URL
          </Link>
        </aside>
      ) : null}

      <header className="detail-header">
        <div>
          <p className="eyebrow">{tool} recipe</p>
          <h1 className="detail-title">{recipe.name}</h1>
          <p className="detail-copy">
            {recipe.description ||
              `Normalized crafting requirements from ${tool.toLocaleLowerCase("en")} data.`}
          </p>
        </div>
        <dl className="recipe-facts">
          <div>
            <dt>Required skill</dt>
            <dd>
              {recipe.skillLevel > 0 ? recipe.skillLevel : "No requirement"}
            </dd>
          </div>
          <div>
            <dt>Discovery</dt>
            <dd>{recipe.hidden ? "Hidden recipe" : "Visible recipe"}</dd>
          </div>
        </dl>
      </header>

      <div className="detail-grid">
        <section className="detail-card" aria-labelledby="ingredients-heading">
          <h2 id="ingredients-heading" className="section-title-sm">
            Ingredients
          </h2>
          <RecipeReferences
            references={recipe.inputs}
            itemsById={itemsById}
            amountLabel="Uses"
          />
        </section>

        <section className="detail-card" aria-labelledby="outputs-heading">
          <h2 id="outputs-heading" className="section-title-sm">
            Outputs
          </h2>
          <RecipeReferences
            references={recipe.outputs}
            itemsById={itemsById}
            amountLabel="Produces"
          />
        </section>

        <ProvenanceCard
          artifact={artifact}
          entity={recipe}
          headingId="recipe-provenance-heading"
        />

        <section
          className="detail-card"
          aria-labelledby="recipe-diagnostics-heading"
        >
          <h2 id="recipe-diagnostics-heading" className="section-title-sm">
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
              No diagnostics are attached to the active recipe.
            </p>
          )}
        </section>
      </div>
    </article>
  );
}
