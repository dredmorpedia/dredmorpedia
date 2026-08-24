import Link from "next/link";
import { notFound } from "next/navigation";
import { Coins, Star } from "lucide-react";

import {
  canonicalKey,
  itemEncrustmentRelationships,
  itemRecipeRelationships,
  type DatasetArtifact,
  type Item,
  type ItemReference,
  type Recipe,
  type SourceSummary,
} from "@dredmorpedia/domain";

import { EncrustmentPreview } from "@/components/encrustment-preview";
import { EncrustmentSlotIconStack } from "@/components/encrustment-slot-list";
import { ExpandableCatalogueList } from "@/components/expandable-catalogue-list";
import {
  ItemCatalogueControls,
  type ItemCatalogueNavigationEntry,
} from "@/components/item-catalogue-controls";
import { ItemArtifactFact } from "@/components/item-artifact-fact";
import { ItemArt } from "@/components/item-art";
import { RecipePreview } from "@/components/recipe-preview";
import { StatModifierLink } from "@/components/stat-modifier-link";
import { loadArtifact, loadArtifactSha256 } from "@/lib/artifact";
import {
  createItemCatalogueCategories,
  defaultItemCatalogueCategory,
  defaultItemCatalogueView,
  itemCatalogueCategoryForSegment,
  itemCatalogueCategoryPath,
  paginateItemCatalogue,
  type ItemCataloguePageSize,
  type ItemCatalogueSort,
} from "@/lib/item-catalogue";
import {
  createEncrustmentSummaryData,
  createEncrustmentSummaryToolMap,
  type EncrustmentSummaryTool,
} from "@/lib/encrustment-summary";
import { itemIconUrl, uiIconUrl } from "@/lib/presented-assets";
import {
  createRecipeSummaryData,
  createRecipeSummaryToolMap,
  type RecipeSummaryTool,
} from "@/lib/recipe-summary";
import { sourceMarker } from "@/lib/source-markers";
import { spellTriggerLabels } from "@/lib/spell-triggers";
import { signedStatModifierValue } from "@/lib/stat-modifiers";

interface ItemCataloguePageProps {
  categorySegment?: string;
  page: number;
  pageSize?: ItemCataloguePageSize;
  redirectToStoredView?: boolean;
  sort?: ItemCatalogueSort;
}

function PriceDisplay({
  price,
  iconUrl,
  unavailableLabel = "Unknown",
}: {
  price: number | null;
  iconUrl: string | null;
  unavailableLabel?: string;
}) {
  return (
    <span className="item-icon-fact">
      <span aria-hidden="true" className="item-price-icon">
        {iconUrl ? (
          <>
            {/* The larger canvas is clipped around the small centered game sprite. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" height={36} src={iconUrl} title="Zorkmids" width={36} />
          </>
        ) : (
          <Coins size={18} />
        )}
      </span>
      <span>
        {price === null
          ? unavailableLabel
          : new Intl.NumberFormat("en").format(price)}
      </span>
    </span>
  );
}

function QualityDisplay({
  quality,
  emptyIconUrl,
  fullIconUrl,
}: {
  quality: number | null;
  emptyIconUrl: string | null;
  fullIconUrl: string | null;
}) {
  if (quality === null) {
    return <span>Not declared</span>;
  }
  if (quality <= 0) {
    return <span>0</span>;
  }
  return (
    <span
      aria-label={`Quality ${quality} out of 10`}
      className="item-quality-stars"
      role="img"
      title={`Quality ${quality} out of 10`}
    >
      {Array.from({ length: 10 }, (_, index) => {
        const filled = index < quality;
        const iconUrl = filled ? fullIconUrl : emptyIconUrl;
        return iconUrl ? (
          // The parent supplies one concise accessible label for the full scale.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            aria-hidden="true"
            height={14}
            key={index}
            src={iconUrl}
            width={14}
          />
        ) : (
          <Star
            aria-hidden="true"
            fill={filled ? "currentColor" : "none"}
            key={index}
            size={13}
          />
        );
      })}
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
        {reference.amount !== 1 ? `${reference.amount} × ` : ""}
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
  source,
  itemById,
  goldIconUrl,
  qualityEmptyIconUrl,
  qualityFullIconUrl,
  recipeSummaryTools,
  encrustmentSummaryTools,
  sourcesById,
}: {
  item: Item;
  artifact: DatasetArtifact;
  artifactSha256: string;
  source: SourceSummary | undefined;
  itemById: ReadonlyMap<string, Item>;
  goldIconUrl: string | null;
  qualityEmptyIconUrl: string | null;
  qualityFullIconUrl: string | null;
  recipeSummaryTools: ReadonlyMap<string, RecipeSummaryTool>;
  encrustmentSummaryTools: ReadonlyMap<string, EncrustmentSummaryTool>;
  sourcesById: ReadonlyMap<string, SourceSummary>;
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
  const usedToCraftItems = new Map<string, { item: Item; recipe: Recipe }>();
  for (const { recipe } of usedToCraft) {
    for (const output of recipe.outputs) {
      if (output.itemId && output.itemId !== item.id) {
        const outputItem = itemById.get(output.itemId);
        if (outputItem && !usedToCraftItems.has(outputItem.id)) {
          usedToCraftItems.set(outputItem.id, { item: outputItem, recipe });
        }
      }
    }
  }
  const encrustments = itemEncrustmentRelationships(
    artifact.entities.encrustments,
    item.id,
  );
  const stats = item.stats.slice(0, 4);
  const modifiers = item.modifiers.slice(0, Math.max(0, 6 - stats.length));
  const craftedItems = [...usedToCraftItems.values()];
  const statsById = new Map(
    artifact.entities.stats.map((stat) => [stat.id, stat]),
  );
  const spellsById = new Map(
    artifact.entities.spells.map((spell) => [spell.id, spell]),
  );
  const marker = sourceMarker(source);
  const isEngineReference = source?.kind === "reference";

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
          <div className="item-summary-heading">
            <h3 className="item-summary-title">
              <Link className="entity-link" href={`/items/${item.slug}`}>
                {item.name}
              </Link>
            </h3>
            {marker ? (
              <span
                aria-label={`Source: ${marker.fullLabel}`}
                className="item-source-marker"
                title={marker.fullLabel}
              >
                {marker.shortLabel}
              </span>
            ) : null}
            {isEngineReference ? (
              <span
                className="item-reference-marker"
                title="Project-authored reference for an engine item absent from the active item database"
              >
                Engine reference
              </span>
            ) : null}
          </div>
          <p className="item-summary-description">
            {item.description || "No description is supplied by this dataset."}
          </p>
        </div>

        <dl className="item-summary-facts">
          <div>
            <dt>Value</dt>
            <dd>
              <PriceDisplay
                iconUrl={goldIconUrl}
                price={item.price}
                unavailableLabel={
                  isEngineReference ? "Not declared" : "Unknown"
                }
              />
            </dd>
          </div>
          <div>
            <dt>Quality</dt>
            <dd>
              <QualityDisplay
                emptyIconUrl={qualityEmptyIconUrl}
                fullIconUrl={qualityFullIconUrl}
                quality={isEngineReference ? null : item.quality}
              />
            </dd>
          </div>
          <ItemArtifactFact artifacts={item.artifacts} />
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

        {craftedBy.length > 0 ? (
          <section className="item-summary-relationship">
            <h4>Crafted from</h4>
            <div className="crafted-from-options">
              {craftedBy.map(({ recipe }) => {
                const tool = recipeSummaryTools.get(recipe.tool);
                return (
                  <RecipePreview
                    key={recipe.id}
                    summary={createRecipeSummaryData({
                      artifact,
                      artifactSha256,
                      itemsById: itemById,
                      recipe,
                      source: sourcesById.get(recipe.provenance.sourceId),
                      toolIconUrl: tool?.iconUrl ?? null,
                      toolLabel: tool?.label ?? recipe.tool,
                    })}
                  >
                    <ul className="catalogue-reference-list">
                      {recipe.inputs.map((reference, index) => (
                        <ItemReferenceRow
                          key={`${reference.itemKey}:${index}`}
                          artifact={artifact}
                          artifactSha256={artifactSha256}
                          itemById={itemById}
                          reference={reference}
                        />
                      ))}
                    </ul>
                  </RecipePreview>
                );
              })}
            </div>
          </section>
        ) : null}

        {craftedItems.length > 0 ? (
          <section className="item-summary-relationship">
            <h4>Used to craft</h4>
            <ExpandableCatalogueList
              className="catalogue-chip-list"
              initialCount={4}
              items={craftedItems.map(({ item: craftedItem, recipe }) => {
                const tool = recipeSummaryTools.get(recipe.tool);
                const relationship = (
                  <>
                    <ItemArt
                      artifact={artifact}
                      artifactSha256={artifactSha256}
                      item={craftedItem}
                      size={32}
                    />
                    <Link
                      className="entity-link"
                      href={`/items/${craftedItem.slug}`}
                    >
                      {craftedItem.name}
                    </Link>
                  </>
                );
                return (
                  <li key={craftedItem.id}>
                    <RecipePreview
                      summary={createRecipeSummaryData({
                        artifact,
                        artifactSha256,
                        itemsById: itemById,
                        recipe,
                        source: sourcesById.get(recipe.provenance.sourceId),
                        toolIconUrl: tool?.iconUrl ?? null,
                        toolLabel: tool?.label ?? recipe.tool,
                      })}
                    >
                      {relationship}
                    </RecipePreview>
                  </li>
                );
              })}
              noun="crafted item"
            />
          </section>
        ) : null}

        {encrustments.length > 0 ? (
          <section className="item-summary-relationship">
            <h4>Used to encrust</h4>
            <ExpandableCatalogueList
              className="catalogue-chip-list"
              initialCount={3}
              items={encrustments.map(({ encrustment }) => {
                const tool = encrustmentSummaryTools.get(
                  canonicalKey(encrustment.tool),
                );
                const summary = createEncrustmentSummaryData({
                  artifact,
                  artifactSha256,
                  encrustment,
                  itemsById: itemById,
                  source: sourcesById.get(encrustment.provenance.sourceId),
                  toolIconUrl: tool?.iconUrl ?? null,
                  toolLabel: tool?.label ?? encrustment.tool,
                });
                const relationship = (
                  <>
                    <EncrustmentSlotIconStack slots={summary.slots} />
                    <Link
                      className="entity-link"
                      href={`/encrustments/${encrustment.slug}`}
                    >
                      {encrustment.name}
                    </Link>
                  </>
                );
                return (
                  <li key={encrustment.id}>
                    <EncrustmentPreview summary={summary}>
                      {relationship}
                    </EncrustmentPreview>
                  </li>
                );
              })}
              noun="encrustment"
            />
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
  pageSize = defaultItemCatalogueView.pageSize,
  redirectToStoredView = false,
  sort = defaultItemCatalogueView.sort,
}: ItemCataloguePageProps) {
  const artifact = loadArtifact();
  const artifactSha256 = loadArtifactSha256();
  const view = { sort, pageSize };
  const categories = createItemCatalogueCategories(
    artifact.entities.items,
    artifact.sources,
  );
  const category = categorySegment
    ? itemCatalogueCategoryForSegment(categories, categorySegment)
    : defaultItemCatalogueCategory(categories);
  if (!category) {
    notFound();
  }
  const result = paginateItemCatalogue(
    artifact.entities.items,
    category,
    page,
    {
      sources: artifact.sources,
      sort,
      pageSize,
    },
  );
  if (!result) {
    notFound();
  }
  const itemById = new Map(
    artifact.entities.items.map((item) => [item.id, item]),
  );
  const sourcesById = new Map(
    artifact.sources.map((source) => [source.id, source]),
  );
  const recipeSummaryTools = createRecipeSummaryToolMap({
    artifact,
    artifactSha256,
    itemsById: itemById,
  });
  const encrustmentSummaryTools = createEncrustmentSummaryToolMap({
    artifact,
    artifactSha256,
    itemsById: itemById,
  });
  const goldIconUrl = uiIconUrl("gold", artifact, artifactSha256);
  const qualityEmptyIconUrl = uiIconUrl(
    "quality-empty",
    artifact,
    artifactSha256,
  );
  const qualityFullIconUrl = uiIconUrl(
    "quality-full",
    artifact,
    artifactSha256,
  );
  const navigationEntries: ItemCatalogueNavigationEntry[] = categories.map(
    (candidate) => {
      const representative = itemById.get(candidate.representativeItemId);
      return {
        ...candidate,
        href: itemCatalogueCategoryPath(candidate, 1, view),
        iconUrl: representative
          ? itemIconUrl(representative.id, artifact, artifactSha256)
          : null,
        representativeName: representative?.name ?? candidate.label,
      };
    },
  );
  const firstRecord =
    result.total === 0 || result.pageSize === "all"
      ? result.total === 0
        ? 0
        : 1
      : (result.page - 1) * result.pageSize + 1;
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

      <ItemCatalogueControls
        activeCategory={category}
        activeView={view}
        categories={navigationEntries}
        redirectToStoredView={redirectToStoredView}
      />

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
              encrustmentSummaryTools={encrustmentSummaryTools}
              goldIconUrl={goldIconUrl}
              qualityEmptyIconUrl={qualityEmptyIconUrl}
              qualityFullIconUrl={qualityFullIconUrl}
              recipeSummaryTools={recipeSummaryTools}
              source={sourcesById.get(item.provenance.sourceId)}
              sourcesById={sourcesById}
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
                      href={itemCatalogueCategoryPath(
                        category,
                        pageNumber,
                        view,
                      )}
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
