import {
  type DatasetArtifact,
  type Encrustment,
  type Item,
  type ItemReference,
  type SourceSummary,
} from "@dredmorpedia/domain";

import type { CatalogueItemReference } from "@/components/catalogue-item-reference-list";
import type { EncrustmentSummaryData } from "@/components/encrustment-summary-card";
import { createEncrustCatalogueTools } from "./encrust-catalogue";
import { aggregateEncrustmentInputs } from "./encrustment-inputs";
import { encrustmentSlotPresentation } from "./encrustment-slot-icons";
import { itemIconUrl } from "./presented-assets";
import {
  signedStatModifierValue,
  statDefinitionForModifier,
  statModifierLabel,
} from "./stat-modifiers";
import { sourceMarker } from "./source-markers";

export interface EncrustmentSummaryTool {
  iconUrl: string | null;
  label: string;
}

export function createEncrustmentSummaryToolMap({
  artifact,
  artifactSha256,
  itemsById,
}: {
  artifact: DatasetArtifact;
  artifactSha256: string;
  itemsById: ReadonlyMap<string, Item>;
}): ReadonlyMap<string, EncrustmentSummaryTool> {
  return new Map(
    createEncrustCatalogueTools(
      artifact.entities.encrustments,
      artifact.entities.items,
    ).map((tool) => {
      const toolkit = tool.representativeItemId
        ? itemsById.get(tool.representativeItemId)
        : undefined;
      return [
        tool.tag,
        {
          iconUrl: toolkit
            ? itemIconUrl(toolkit.id, artifact, artifactSha256)
            : null,
          label: tool.label,
        },
      ];
    }),
  );
}

function summaryReference(
  reference: ItemReference,
  itemsById: ReadonlyMap<string, Item>,
  artifact: DatasetArtifact,
  artifactSha256: string,
): CatalogueItemReference {
  const item = reference.itemId ? itemsById.get(reference.itemId) : undefined;
  return {
    amount: reference.amount,
    iconUrl: item ? itemIconUrl(item.id, artifact, artifactSha256) : null,
    itemName: item?.name ?? reference.itemName,
    itemSlug: item?.slug ?? null,
    key: reference.itemKey,
    skillLevel: null,
  };
}

function powerFrequency(chance: number | null): string {
  return chance === null
    ? "Chance not specified"
    : new Intl.NumberFormat("en", {
        style: "percent",
        maximumFractionDigits: 2,
      }).format(chance);
}

export function createEncrustmentSummaryData({
  artifact,
  artifactSha256,
  encrustment,
  itemsById,
  source,
  toolIconUrl,
  toolLabel,
}: {
  artifact: DatasetArtifact;
  artifactSha256: string;
  encrustment: Encrustment;
  itemsById: ReadonlyMap<string, Item>;
  source: SourceSummary | undefined;
  toolIconUrl: string | null;
  toolLabel: string;
}): EncrustmentSummaryData {
  return {
    description: encrustment.description,
    hidden: encrustment.hidden,
    id: encrustment.id,
    inputs: aggregateEncrustmentInputs(encrustment.inputs).map((reference) =>
      summaryReference(reference, itemsById, artifact, artifactSha256),
    ),
    instability: signedStatModifierValue(encrustment.instability),
    modifiers: encrustment.modifiers.map((modifier, index) => {
      const definition = statDefinitionForModifier(
        modifier,
        artifact.entities.stats,
      );
      return {
        key: `${modifier.kind}:${modifier.sourceKey}:${index}`,
        label: statModifierLabel(modifier, artifact.entities.stats),
        slug: definition?.slug ?? null,
        value: signedStatModifierValue(modifier.amount),
      };
    }),
    name: encrustment.name,
    powers: encrustment.powers.map((power, index) => ({
      chanceLabel: powerFrequency(power.chance),
      key: `${power.name}:${index}`,
      name: power.name,
    })),
    skillLevel:
      encrustment.skillLevel > 0
        ? String(encrustment.skillLevel)
        : "No requirement",
    slots: encrustment.slots.map((slot) =>
      encrustmentSlotPresentation(slot, artifact, artifactSha256),
    ),
    slug: encrustment.slug,
    sourceMarker: sourceMarker(source),
    toolIconUrl,
    toolLabel,
  };
}
