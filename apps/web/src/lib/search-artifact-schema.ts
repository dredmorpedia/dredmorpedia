import { entityKinds } from "@dredmorpedia/domain";
import { z } from "zod";

export const entitySlugSchema = z
  .string()
  .regex(
    /^[a-z0-9-]+$/,
    "must contain only lowercase ASCII letters, digits, and hyphens",
  );

export const entityUrlSchema = z
  .string()
  .regex(
    /^\/[a-z]+\/[a-z0-9-]+$/,
    "must be an absolute entity path with a lowercase route and slug",
  );

export const searchArtifactSchema = z
  .object({
    schemaVersion: z.literal(3),
    datasetSchemaVersion: z.literal(3),
    datasetId: z.string(),
    language: z.literal("en"),
    documents: z.array(
      z
        .object({
          id: z.string(),
          kind: z.enum(entityKinds),
          name: z.string(),
          aliases: z.array(entitySlugSchema),
          summary: z.string(),
          sourceId: z.string(),
          category: z.string().nullable(),
          statKeys: z.array(z.string()),
          craftingSkillLevel: z.number().int().nonnegative().nullable(),
          url: entityUrlSchema,
          text: z.string(),
        })
        .strict(),
    ),
  })
  .strict();
