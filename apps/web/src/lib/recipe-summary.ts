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
import { itemIconUrl } from "@/lib/presented-assets";
import { sourceMarker } from "@/lib/source-markers";

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
  toolLabel,
  itemsById,
  artifact,
  artifactSha256,
  source,
}: {
  recipe: Recipe;
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
    toolLabel,
  };
}
