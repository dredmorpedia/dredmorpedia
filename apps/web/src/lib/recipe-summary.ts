import {
  type DatasetArtifact,
  type Item,
  type ItemReference,
  type Recipe,
  type RecipeOutput,
  type SourceSummary,
} from "@dredmorpedia/domain";

import type {
  RecipeSummaryData,
  RecipeSummaryReference,
} from "@/components/recipe-summary-card";
import { createCraftCatalogueTools } from "@/lib/craft-catalogue";
import { itemIconUrl } from "@/lib/presented-assets";
import { sourceMarker } from "@/lib/source-markers";

export interface RecipeSummaryTool {
  iconUrl: string | null;
  label: string;
}

export function createRecipeSummaryToolMap({
  artifact,
  artifactSha256,
  itemsById,
}: {
  artifact: DatasetArtifact;
  artifactSha256: string;
  itemsById: ReadonlyMap<string, Item>;
}): ReadonlyMap<string, RecipeSummaryTool> {
  return new Map(
    createCraftCatalogueTools(
      artifact.entities.recipes,
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
  reference: ItemReference | RecipeOutput,
  itemsById: ReadonlyMap<string, Item>,
  artifact: DatasetArtifact,
  artifactSha256: string,
): RecipeSummaryReference {
  const item = reference.itemId ? itemsById.get(reference.itemId) : undefined;
  return {
    amount: reference.amount,
    iconUrl: item ? itemIconUrl(item.id, artifact, artifactSha256) : null,
    itemName: item?.name ?? reference.itemName,
    itemSlug: item?.slug ?? null,
    key: reference.itemKey,
    skillLevel: "skillLevel" in reference ? reference.skillLevel : null,
  };
}

export function createRecipeSummaryData({
  recipe,
  toolIconUrl,
  toolLabel,
  itemsById,
  artifact,
  artifactSha256,
  source,
}: {
  recipe: Recipe;
  toolIconUrl: string | null;
  toolLabel: string;
  itemsById: ReadonlyMap<string, Item>;
  artifact: DatasetArtifact;
  artifactSha256: string;
  source: SourceSummary | undefined;
}): RecipeSummaryData {
  return {
    description: recipe.description,
    hidden: recipe.hidden,
    id: recipe.id,
    inputs: recipe.inputs.map((reference) =>
      summaryReference(reference, itemsById, artifact, artifactSha256),
    ),
    name: recipe.name,
    outputs: recipe.outputs.map((reference) =>
      summaryReference(reference, itemsById, artifact, artifactSha256),
    ),
    slug: recipe.slug,
    sourceMarker: sourceMarker(source),
    toolIconUrl,
    toolLabel,
  };
}
