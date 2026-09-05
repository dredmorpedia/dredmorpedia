import type { EncrustmentSummaryData } from "@/components/encrustment-summary-card";
import type { RecipeSummaryData } from "@/components/recipe-summary-card";

interface CataloguePreviewPayload {
  encrustments: Record<string, EncrustmentSummaryData>;
  recipes: Record<string, RecipeSummaryData>;
  schemaVersion: 1;
}

let payloadPromise: Promise<CataloguePreviewPayload> | null = null;

async function fetchCataloguePreviewPayload(): Promise<CataloguePreviewPayload> {
  const response = await fetch("/catalogue-previews.json");
  if (!response.ok) {
    throw new Error(`Catalogue previews returned HTTP ${response.status}.`);
  }
  const payload: unknown = await response.json();
  // Keep runtime validation off the initial catalogue hydration path.
  const { cataloguePreviewPayloadSchema } =
    await import("./catalogue-preview-schema");
  const parsed = cataloguePreviewPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Catalogue previews returned an invalid payload.");
  }
  return parsed.data;
}

function loadCataloguePreviewPayload(): Promise<CataloguePreviewPayload> {
  payloadPromise ??= fetchCataloguePreviewPayload().catch((error: unknown) => {
    payloadPromise = null;
    throw error;
  });
  return payloadPromise;
}

export async function loadRecipePreview(
  recipeId: string,
): Promise<RecipeSummaryData> {
  const payload = await loadCataloguePreviewPayload();
  const summary = payload.recipes[recipeId];
  if (!Object.hasOwn(payload.recipes, recipeId) || !summary) {
    throw new Error(`Recipe preview ${recipeId} is not available.`);
  }
  return summary;
}

export async function loadEncrustmentPreview(
  encrustmentId: string,
): Promise<EncrustmentSummaryData> {
  const payload = await loadCataloguePreviewPayload();
  const summary = payload.encrustments[encrustmentId];
  if (!Object.hasOwn(payload.encrustments, encrustmentId) || !summary) {
    throw new Error(`Encrustment preview ${encrustmentId} is not available.`);
  }
  return summary;
}
