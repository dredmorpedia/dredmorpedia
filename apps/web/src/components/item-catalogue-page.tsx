import Link from "next/link";
import { notFound } from "next/navigation";

import {
  itemEncrustmentRelationships,
  itemRecipeRelationships,
  type DatasetArtifact,
  type Item,
  type ItemReference,
} from "@dredmorpedia/domain";

import { StatModifierLink } from "@/components/stat-modifier-link";
import { loadArtifact, loadArtifactSha256 } from "@/lib/artifact";
import {
  createItemCatalogueCategories,
  defaultItemCatalogueCategory,
  itemCatalogueCategoryForSegment,
  itemCatalogueCategoryPath,
  itemCatalogueGroupOrder,
  itemCataloguePageSize,
  paginateItemCatalogue,
} from "@/lib/item-catalogue";
import { itemIconUrl } from "@/lib/presented-assets";
import { spellTriggerLabels } from "@/lib/spell-triggers";
import { signedStatModifierValue } from "@/lib/stat-modifiers";

interface ItemCataloguePageProps {
  categorySegment?: string;
  page: number;
}

function ItemArt({
  item,
  artifact,
  artifactSha256,
  size,
}: {
  item: Item;
  artifact: DatasetArtifact;
  artifactSha256: string;
  size: number;
}) {
  const url = itemIconUrl(item.id, artifact, artifactSha256);
  return url ? (
    // Entity names are supplied by adjacent visible text.
    // eslint-disable-next-line @next/next/no-img-element
    <img alt="" height={size} src={url} width={size} />
  ) : (
    <span aria-hidden="true" className="catalogue-art-placeholder">
      ?
    </span>
  );
}

function ItemReferenceRow({
  reference,
  itemById,
  artifact,
  artifactSha256,
}: {
  reference: ItemReference;
  itemById: ReadonlyMap<string, Item>;
  artifact: DatasetArtifact;
  artifactSha256: string;
}) {
  const referencedItem = reference.itemId
    ? itemById.get(reference.itemId)
    : undefined;
  return (
    <li className="catalogue-reference">
      {referencedItem ? (
        <ItemArt
          artifact={artifact}
          artifactSha256={artifactSha256}
          item={referencedItem}
          size={32}
        />
      ) : (
        <span aria-hidden="true" className="catalogue-art-placeholder">
          ?
        </span>
      )}
      <span>
        {reference.amount} ×{" "}
        {referencedItem ? (
          <Link className="entity-link" href={`/items/${referencedItem.slug}`}>
            {referencedItem.name}
          </Link>
        ) : (
          reference.itemName
        )}
      </span>
    </li>
  );
}

function ItemSummaryCard({
  item,
  artifact,
  artifactSha256,
  sourceLabel,
  itemById,
}: {
  item: Item;
  artifact: DatasetArtifact;
  artifactSha256: string;
  sourceLabel: string;
  itemById: ReadonlyMap<string, Item>;
}) {
  const recipeRelationships = itemRecipeRelationships(
    artifact.entities.recipes,
    item.id,
  );
  const craftedBy = recipeRelationships.filter(
    (relationship) => relationship.outputs.length > 0,
  );
  const usedToCraft = recipeRelationships.filter(
    (relationship) => relationship.inputAmount > 0,
  );
  const usedToCraftItems = new Map<string, Item>();
  for (const { recipe } of usedToCraft) {
    for (const output of recipe.outputs) {
      if (output.itemId && output.itemId !== item.id) {
        const outputItem = itemById.get(output.itemId);
        if (outputItem) {
          usedToCraftItems.set(outputItem.id, outputItem);
        }
      }
    }
  }
  const encrustments = itemEncrustmentRelationships(
    artifact.entities.encrustments,
    item.id,
  );
  const primaryRecipe = craftedBy[0];
  const stats = item.stats.slice(0, 4);
  const modifiers = item.modifiers.slice(0, Math.max(0, 6 - stats.length));
  const visibleCraftedItems = [...usedToCraftItems.values()].slice(0, 4);
  const statsById = new Map(
    artifact.entities.stats.map((stat) => [stat.id, stat]),
  );
  const spellsById = new Map(
    artifact.entities.spells.map((spell) => [spell.id, spell]),
  );

  return (
    <li className="item-summary-card">
      <div className="item-summary-art">
        <ItemArt
          artifact={artifact}
          artifactSha256={artifactSha256}
          item={item}
          size={80}
        />
      </div>
      <div className="item-summary-main">
        <div>
          <p className="eyebrow">{sourceLabel}</p>
          <h3 className="item-summary-title">
            <Link className="entity-link" href={`/items/${item.slug}`}>
              {item.name}
            </Link>
          </h3>
          <p className="item-summary-description">
            {item.description || "No description is supplied by this dataset."}
          </p>
        </div>

        <dl className="item-summary-facts">
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
          {item.recoveries.map((recovery, index) => (
            <div key={`${recovery.resource}:${index}`}>
              <dt>{recovery.resource === "life" ? "Health" : "Mana"}</dt>
              <dd>
                {recovery.amount === null
                  ? "Declared"
                  : signedStatModifierValue(recovery.amount)}
              </dd>
            </div>
          ))}
        </dl>

        {stats.length > 0 || modifiers.length > 0 ? (
          <dl className="item-summary-modifiers" aria-label="Item modifiers">
            {stats.map((stat, index) => {
              const definition = stat.statId
                ? statsById.get(stat.statId)
                : undefined;
              return (
                <div key={`${stat.statKey}:${index}`}>
                  <dt>
                    {definition ? (
                      <Link
                        className="entity-link"
                        href={`/stats/${definition.slug}`}
                      >
                        {definition.name}
                      </Link>
                    ) : (
                      stat.statName
                    )}
                  </dt>
                  <dd>{signedStatModifierValue(stat.amount)}</dd>
                </div>
              );
            })}
            {modifiers.map((modifier, index) => (
              <div key={`${modifier.kind}:${modifier.sourceKey}:${index}`}>
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
        ) : null}

        {primaryRecipe ? (
          <section className="item-summary-relationship">
            <h4>Crafted from</h4>
            <ul className="catalogue-reference-list">
              {primaryRecipe.recipe.inputs
                .slice(0, 4)
                .map((reference, index) => (
                  <ItemReferenceRow
                    key={`${reference.itemKey}:${index}`}
                    artifact={artifact}
                    artifactSha256={artifactSha256}
                    itemById={itemById}
                    reference={reference}
                  />
                ))}
            </ul>
            <p className="supporting-note">
              <Link
                className="entity-link"
                href={`/recipes/${primaryRecipe.recipe.slug}`}
              >
                {primaryRecipe.recipe.name}
              </Link>
              {craftedBy.length > 1
                ? ` · ${craftedBy.length - 1} more recipe option${craftedBy.length === 2 ? "" : "s"}`
                : ""}
            </p>
          </section>
        ) : null}

        {visibleCraftedItems.length > 0 ? (
          <section className="item-summary-relationship">
            <h4>Used to craft</h4>
            <ul className="catalogue-chip-list">
              {visibleCraftedItems.map((craftedItem) => (
                <li key={craftedItem.id}>
                  <ItemArt
                    artifact={artifact}
                    artifactSha256={artifactSha256}
                    item={craftedItem}
                    size={28}
                  />
                  <Link
                    className="entity-link"
                    href={`/items/${craftedItem.slug}`}
                  >
                    {craftedItem.name}
                  </Link>
                </li>
              ))}
            </ul>
            {usedToCraftItems.size > visibleCraftedItems.length ? (
              <p className="supporting-note">
                +{usedToCraftItems.size - visibleCraftedItems.length} more on
                the detail page
              </p>
            ) : null}
          </section>
        ) : null}

        {encrustments.length > 0 ? (
          <section className="item-summary-relationship">
            <h4>Used to encrust</h4>
            <ul className="catalogue-text-links">
              {encrustments.slice(0, 3).map(({ encrustment }) => (
                <li key={encrustment.id}>
                  <Link
                    className="entity-link"
                    href={`/encrustments/${encrustment.slug}`}
                  >
                    {encrustment.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {item.triggers.length > 0 ? (
          <section className="item-summary-relationship">
            <h4>Effects</h4>
            <ul className="catalogue-text-links">
              {item.triggers.slice(0, 2).map((trigger, index) => {
                const spell = trigger.spellId
                  ? spellsById.get(trigger.spellId)
                  : undefined;
                return (
                  <li key={`${trigger.kind}:${trigger.spellKey}:${index}`}>
                    <span>{spellTriggerLabels[trigger.kind]}: </span>
                    {spell ? (
                      <Link
                        className="entity-link"
                        href={`/spells/${spell.slug}`}
                      >
                        {spell.name}
                      </Link>
                    ) : (
                      trigger.spellName
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <p className="item-summary-more">
          <Link
            className="entity-link font-semibold"
            href={`/items/${item.slug}`}
          >
            Full details →
          </Link>
        </p>
      </div>
    </li>
  );
}

export function ItemCataloguePage({
  categorySegment,
  page,
}: ItemCataloguePageProps) {
  const artifact = loadArtifact();
  const artifactSha256 = loadArtifactSha256();
  const categories = createItemCatalogueCategories(artifact.entities.items);
  const category = categorySegment
    ? itemCatalogueCategoryForSegment(categories, categorySegment)
    : defaultItemCatalogueCategory(categories);
  if (!category) {
    notFound();
  }
  const result = paginateItemCatalogue(artifact.entities.items, category, page);
  if (!result) {
    notFound();
  }
  const itemById = new Map(
    artifact.entities.items.map((item) => [item.id, item]),
  );
  const sourceLabels = new Map(
    artifact.sources.map((source) => [source.id, source.label]),
  );
  const firstRecord =
    result.total === 0 ? 0 : (result.page - 1) * itemCataloguePageSize + 1;
  const lastRecord = firstRecord + result.items.length - 1;

  return (
    <div className="detail-page item-catalogue-page">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Items</span>
      </nav>

      <header className="browse-header">
        <div>
          <p className="eyebrow">Encyclopedia</p>
          <h1 className="section-title">Items</h1>
          <p className="hero-copy">
            Browse by familiar item type, then follow the visible crafting,
            encrusting, effect, and stat relationships.
          </p>
        </div>
        <p className="result-count" aria-live="polite">
          Showing {firstRecord}–{lastRecord} of {result.total}{" "}
          {result.total === 1 ? "item" : "items"} in {category.label}
        </p>
      </header>

      <nav aria-label="Item categories" className="item-category-nav">
        {itemCatalogueGroupOrder.map((group) => {
          const groupCategories = categories.filter(
            (candidate) => candidate.group === group,
          );
          return groupCategories.length > 0 ? (
            <section key={group} className="item-category-group">
              <h2>{group}</h2>
              <ul>
                {groupCategories.map((candidate) => {
                  const representative = itemById.get(
                    candidate.representativeItemId,
                  );
                  return (
                    <li key={candidate.key}>
                      <Link
                        aria-current={
                          candidate.key === category.key ? "page" : undefined
                        }
                        href={itemCatalogueCategoryPath(candidate)}
                      >
                        {representative ? (
                          <ItemArt
                            artifact={artifact}
                            artifactSha256={artifactSha256}
                            item={representative}
                            size={40}
                          />
                        ) : null}
                        <span>{candidate.label}</span>
                        <small>{candidate.count}</small>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null;
        })}
      </nav>

      <section aria-labelledby="item-category-heading">
        <div className="item-category-heading">
          <div>
            <p className="eyebrow">Selected category</p>
            <h2 id="item-category-heading" className="section-title">
              {category.label}
            </h2>
          </div>
          <Link
            className="entity-link"
            href={`/search/?category=${category.key}`}
          >
            Refine in advanced search
          </Link>
        </div>
        <ul className="item-summary-list">
          {result.items.map((item) => (
            <ItemSummaryCard
              key={item.id}
              artifact={artifact}
              artifactSha256={artifactSha256}
              item={item}
              itemById={itemById}
              sourceLabel={
                sourceLabels.get(item.provenance.sourceId) ??
                item.provenance.sourceId
              }
            />
          ))}
        </ul>
      </section>

      {result.pageCount > 1 ? (
        <nav
          aria-label={`${category.label} catalogue pages`}
          className="browse-pagination"
        >
          <p>
            Page {result.page} of {result.pageCount}
          </p>
          <ol className="browse-page-links">
            {Array.from({ length: result.pageCount }, (_, index) => {
              const pageNumber = index + 1;
              return (
                <li key={pageNumber}>
                  {pageNumber === result.page ? (
                    <span aria-current="page">{pageNumber}</span>
                  ) : (
                    <Link
                      aria-label={`${category.label}, page ${pageNumber}`}
                      className="entity-link"
                      href={itemCatalogueCategoryPath(category, pageNumber)}
                    >
                      {pageNumber}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}
    </div>
  );
}
