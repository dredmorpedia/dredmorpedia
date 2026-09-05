import { z } from "zod";

import type { EncrustmentSummaryData } from "@/components/encrustment-summary-card";
import type { RecipeSummaryData } from "@/components/recipe-summary-card";

const slug = z.string().regex(/^[a-z0-9-]+$/);
const iconUrl = z
  .string()
  .regex(/^\/(?:[A-Za-z0-9_-]+\/)+[a-f0-9]{64}\.png$/)
  .nullable();
const sourceStat = z.strictObject({
  iconUrl,
  label: z.string(),
  slug,
});
const itemReference = z.strictObject({
  amount: z.number().int().positive(),
  iconUrl,
  itemName: z.string(),
  itemSlug: slug.nullable(),
  key: z.string(),
  skillLevel: z.number().int().nonnegative().nullable(),
});
const summaryShape = {
  description: z.string(),
  hidden: z.boolean(),
  id: z.string().min(1),
  inputs: z.array(itemReference),
  name: z.string(),
  slug,
  sourceMarker: z
    .strictObject({ fullLabel: z.string(), shortLabel: z.string() })
    .nullable(),
  sourceStats: z.array(sourceStat),
  toolIconUrl: iconUrl,
  toolLabel: z.string(),
};
const recipeSummary = z.strictObject({
  ...summaryShape,
  outputs: z.array(itemReference),
}) satisfies z.ZodType<RecipeSummaryData>;
const encrustmentSummary = z.strictObject({
  ...summaryShape,
  instability: z.string(),
  instabilityIconUrl: iconUrl,
  modifiers: z.array(
    z.strictObject({
      key: z.string(),
      label: z.string(),
      stat: sourceStat.nullable(),
      value: z.string(),
    }),
  ),
  powers: z.array(
    z.strictObject({
      chanceLabel: z.string(),
      key: z.string(),
      name: z.string(),
    }),
  ),
  skillLevel: z.number().int().nonnegative(),
  slots: z.array(
    z.strictObject({ iconUrl, key: z.string(), label: z.string() }),
  ),
}) satisfies z.ZodType<EncrustmentSummaryData>;

export const cataloguePreviewPayloadSchema = z
  .strictObject({
    encrustments: z.record(z.string(), encrustmentSummary),
    recipes: z.record(z.string(), recipeSummary),
    schemaVersion: z.literal(1),
  })
  .refine(
    ({ encrustments, recipes }) =>
      [encrustments, recipes].every((summaries) =>
        Object.entries(summaries).every(([id, summary]) => id === summary.id),
      ),
    "Preview keys must match their summary identities.",
  );
