import { readFileSync } from "node:fs";

import {
  canonicalKey,
  entityKinds,
  type EntityPatchDefinition,
} from "@dredmorpedia/domain";
import { z } from "zod";

const patchValueSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null(),
  z.array(z.string()),
]);

const operationSchema = z.object({
  entityKind: z.enum(entityKinds),
  canonicalKey: z.string().min(1),
  field: z.string().min(1),
  expectedValue: patchValueSchema,
  value: patchValueSchema,
});

const patchFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase kebab-case ID."),
    reason: z.string().min(1),
    appliesTo: z.object({
      datasetId: z.string().min(1),
      datasetVersion: z.string().min(1),
      sourceId: z.string().min(1),
      sourceVersion: z.string().min(1),
    }),
    operations: z.array(operationSchema).min(1),
  })
  .superRefine((definition, context) => {
    const targets = new Set<string>();
    for (const [index, operation] of definition.operations.entries()) {
      if (canonicalKey(operation.canonicalKey) !== operation.canonicalKey) {
        context.addIssue({
          code: "custom",
          message:
            "Patch targets must use an already-normalized canonical key.",
          path: ["operations", index, "canonicalKey"],
        });
      }
      const target = `${operation.entityKind}:${operation.canonicalKey}:${operation.field}`;
      if (targets.has(target)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate patch operation: ${target}`,
          path: ["operations", index],
        });
      }
      targets.add(target);
    }
  });

export function parsePatchDefinition(
  json: string,
  displayPath: string,
): EntityPatchDefinition {
  const definition = patchFileSchema.parse(JSON.parse(json) as unknown);
  return { ...definition, file: displayPath };
}

export function loadPatchDefinition(
  absolutePath: string,
  displayPath: string,
): EntityPatchDefinition {
  return parsePatchDefinition(readFileSync(absolutePath, "utf8"), displayPath);
}
