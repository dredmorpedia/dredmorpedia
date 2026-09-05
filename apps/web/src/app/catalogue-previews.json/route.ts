import { canonicalKey } from "@dredmorpedia/domain";

import { loadArtifact, loadArtifactSha256 } from "@/lib/artifact";
import {
  createEncrustmentSummaryData,
  createEncrustmentSummaryToolMap,
} from "@/lib/encrustment-summary";
import {
  createRecipeSummaryData,
  createRecipeSummaryToolMap,
} from "@/lib/recipe-summary";

export const dynamic = "force-static";

export function GET() {
  const artifact = loadArtifact();
  const artifactSha256 = loadArtifactSha256();
  const itemsById = new Map(
    artifact.entities.items.map((item) => [item.id, item]),
  );
  const sourcesById = new Map(
    artifact.sources.map((source) => [source.id, source]),
  );
  const recipeTools = createRecipeSummaryToolMap({
    artifact,
    artifactSha256,
    itemsById,
  });
  const encrustmentTools = createEncrustmentSummaryToolMap({
    artifact,
    artifactSha256,
    itemsById,
  });

  return Response.json(
    {
      encrustments: Object.fromEntries(
        artifact.entities.encrustments.map((encrustment) => {
          const tool = encrustmentTools.get(canonicalKey(encrustment.tool));
          return [
            encrustment.id,
            createEncrustmentSummaryData({
              artifact,
              artifactSha256,
              encrustment,
              itemsById,
              source: sourcesById.get(encrustment.provenance.sourceId),
              toolIconUrl: tool?.iconUrl ?? null,
              toolLabel: tool?.label ?? encrustment.tool,
            }),
          ];
        }),
      ),
      recipes: Object.fromEntries(
        artifact.entities.recipes.map((recipe) => {
          const tool = recipeTools.get(recipe.tool);
          return [
            recipe.id,
            createRecipeSummaryData({
              artifact,
              artifactSha256,
              itemsById,
              recipe,
              source: sourcesById.get(recipe.provenance.sourceId),
              toolIconUrl: tool?.iconUrl ?? null,
              toolLabel: tool?.label ?? recipe.tool,
            }),
          ];
        }),
      ),
      schemaVersion: 1,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    },
  );
}
