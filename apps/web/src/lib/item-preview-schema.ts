import { itemTriggerKinds } from "@dredmorpedia/domain";
import { z } from "zod";

import type { ItemPreviewData } from "./item-preview-types";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const iconUrl = z
  .string()
  .regex(/^\/(?:[A-Za-z0-9_-]+\/)+[a-f0-9]{64}\.png$/)
  .nullable();

const itemPreview = z.strictObject({
  category: z.string(),
  description: z.string().max(240),
  effects: z
    .array(
      z.strictObject({
        iconUrl,
        spell: z.strictObject({ name: z.string(), slug }).nullable(),
        trigger: z.strictObject({
          chance: z.number().min(0).max(100).nullable(),
          delay: z.number().int().nonnegative(),
          duration: z.number().int().nonnegative(),
          kind: z.enum(itemTriggerKinds),
          monsterTaxonomy: z.string().nullable(),
          spellName: z.string(),
          unresistable: z.boolean(),
        }),
      }),
    )
    .max(2),
  engineReference: z.boolean(),
  facts: z.array(z.strictObject({ label: z.string(), value: z.string() })),
  iconUrl,
  modifiers: z.array(
    z.strictObject({
      group: z.enum([
        "damage",
        "resistance",
        "primary",
        "secondary",
        "other",
        "random",
      ]),
      label: z.string(),
      stat: z.strictObject({ iconUrl, label: z.string(), slug }).nullable(),
      value: z.string(),
    }),
  ),
  name: z.string(),
  remainingEffects: z.number().int().nonnegative(),
  slug,
  sourceMarker: z
    .strictObject({ fullLabel: z.string(), shortLabel: z.string() })
    .nullable(),
}) satisfies z.ZodType<ItemPreviewData>;

export const itemPreviewPayloadSchema = z.strictObject({
  schemaVersion: z.literal(1),
  item: itemPreview,
});
