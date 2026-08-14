import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { itemCategoryLabel } from "@dredmorpedia/domain";

import {
  ItemComparison,
  type ItemComparisonEntry,
} from "@/components/item-comparison";
import { loadArtifact, loadArtifactSha256 } from "@/lib/artifact";
import { itemIconUrl } from "@/lib/presented-assets";
import { titleCase } from "@/lib/display-labels";
import { statModifierLabel } from "@/lib/stat-modifiers";

export const metadata: Metadata = {
  title: "Item comparison",
  description:
    "Compare normalized Dungeons of Dredmor item facts and direct modifiers through a shareable URL.",
};

export default function ItemComparePage() {
  const artifact = loadArtifact();
  const artifactSha256 = loadArtifactSha256();
  const statsById = new Map(
    artifact.entities.stats.map((stat) => [stat.id, stat]),
  );
  const items: ItemComparisonEntry[] = artifact.entities.items
    .map((item) => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      description: item.description,
      categoryLabel: itemCategoryLabel(item.category),
      price: item.price,
      quality: item.quality,
      iconUrl: itemIconUrl(item.id, artifact, artifactSha256),
      armourSlots: item.armourDeclarations.flatMap((entry) =>
        entry.slot === null ? [] : [titleCase(entry.slot)],
      ),
      armourLevels: item.armourDeclarations.map((entry) => entry.level),
      lifeRecovery: item.recoveries
        .filter((entry) => entry.resource === "life")
        .map((entry) => entry.amount),
      manaRecovery: item.recoveries
        .filter((entry) => entry.resource === "mana")
        .map((entry) => entry.amount),
      chargeRanges: item.chargeRanges,
      trapLevels: item.traps.map((entry) => entry.level),
      floorTargeting: item.weaponDeclarations.map(
        (entry) => entry.canTargetFloor,
      ),
      namedStats: item.stats.map((entry) => {
        const definition = entry.statId
          ? statsById.get(entry.statId)
          : undefined;
        return {
          key: entry.statId ?? entry.statKey,
          label: definition?.name ?? entry.statName,
          amount: entry.amount,
          statSlug: definition?.slug ?? null,
        };
      }),
      modifiers: item.modifiers.map((entry) => {
        const definition = entry.statId
          ? statsById.get(entry.statId)
          : undefined;
        return {
          key: entry.statId ?? `${entry.kind}:${entry.sourceKey}`,
          label: statModifierLabel(entry, artifact.entities.stats),
          amount: entry.amount,
          statSlug: definition?.slug ?? null,
        };
      }),
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "en"));

  return (
    <article className="detail-page">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Item comparison</span>
      </nav>

      <header className="detail-header">
        <div>
          <p className="eyebrow">Differentiating tool</p>
          <h1 className="detail-title">Item comparison</h1>
          <p className="detail-copy">
            Put up to three items beside each other and compare their exact
            normalized facts, named stats, and direct modifiers.
          </p>
        </div>
        <dl className="recipe-facts">
          <div>
            <dt>Dataset</dt>
            <dd>{artifact.datasetVersion}</dd>
          </div>
          <div>
            <dt>Selection</dt>
            <dd>Shareable URL</dd>
          </div>
          <div>
            <dt>Inferred formulas</dt>
            <dd>None</dd>
          </div>
        </dl>
      </header>

      <Suspense
        fallback={
          <div className="empty-state" role="status">
            Loading comparison controls…
          </div>
        }
      >
        <ItemComparison items={items} />
      </Suspense>
    </article>
  );
}
