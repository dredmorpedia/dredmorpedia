import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

import { resolveExistingWithin, toPosixPath } from "./safe-path";

export const databaseKinds = [
  "items",
  "recipes",
  "skills",
  "spells",
  "monsters",
  "templates",
  "stats",
] as const;

const databaseFileSchema = z.object({
  kind: z.enum(databaseKinds),
  path: z.string().min(1),
});

const sourceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(["base", "expansion", "mod", "fixture"]),
  precedence: z.number().int(),
  root: z.string().min(1),
  files: z.array(databaseFileSchema).min(1),
});

const manifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    datasetId: z.string().min(1),
    sources: z.array(sourceSchema).min(1),
  })
  .superRefine((manifest, context) => {
    const sourceIds = new Set<string>();
    for (const source of manifest.sources) {
      if (sourceIds.has(source.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate source id: ${source.id}`,
          path: ["sources"],
        });
      }
      sourceIds.add(source.id);
    }
  });

export type DatabaseKind = (typeof databaseKinds)[number];
export type SourceDefinition = z.infer<typeof sourceSchema>;
export type SourceManifest = z.infer<typeof manifestSchema>;

export interface LoadedManifest {
  manifest: SourceManifest;
  manifestPath: string;
  manifestDirectory: string;
  manifestDisplayPath: string;
}

export function loadManifest(
  manifestPath: string,
  repositoryRoot: string,
): LoadedManifest {
  const absoluteManifestPath = realpathSync(path.resolve(manifestPath));
  const parsed = JSON.parse(
    readFileSync(absoluteManifestPath, "utf8"),
  ) as unknown;
  const manifest = manifestSchema.parse(parsed);

  for (const source of manifest.sources) {
    resolveExistingWithin(path.dirname(absoluteManifestPath), source.root);
    for (const file of source.files) {
      resolveExistingWithin(
        resolveExistingWithin(path.dirname(absoluteManifestPath), source.root),
        file.path,
      );
    }
  }

  return {
    manifest,
    manifestPath: absoluteManifestPath,
    manifestDirectory: path.dirname(absoluteManifestPath),
    manifestDisplayPath: toPosixPath(
      path.relative(repositoryRoot, absoluteManifestPath),
    ),
  };
}
