import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

import { isPathWithin, resolveExistingWithin, toPosixPath } from "./safe-path";

export const databaseKinds = [
  "items",
  "recipes",
  "encrustments",
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

const sourceV1Schema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(["base", "expansion", "mod", "fixture"]),
  precedence: z.number().int(),
  root: z.string().min(1),
  files: z.array(databaseFileSchema).min(1),
});

const sourceV2Schema = sourceV1Schema.extend({
  version: z.string().min(1),
});

const patchReferenceSchema = z.object({
  order: z.number().int(),
  path: z.string().min(1),
});

function validateUniqueEntries(
  manifest: {
    sources: { id: string }[];
    patches?: { path: string }[];
  },
  context: z.RefinementCtx,
): void {
  const sourceIds = new Set<string>();
  for (const [index, source] of manifest.sources.entries()) {
    if (sourceIds.has(source.id)) {
      context.addIssue({
        code: "custom",
        message: `Duplicate source id: ${source.id}`,
        path: ["sources", index, "id"],
      });
    }
    sourceIds.add(source.id);
  }

  const patchPaths = new Set<string>();
  for (const [index, patch] of (manifest.patches ?? []).entries()) {
    if (patchPaths.has(patch.path)) {
      context.addIssue({
        code: "custom",
        message: `Duplicate patch path: ${patch.path}`,
        path: ["patches", index, "path"],
      });
    }
    patchPaths.add(patch.path);
  }
}

const manifestV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    datasetId: z.string().min(1),
    sources: z.array(sourceV1Schema).min(1),
  })
  .superRefine(validateUniqueEntries);

const manifestV2Schema = z
  .object({
    schemaVersion: z.literal(2),
    datasetId: z.string().min(1),
    datasetVersion: z.string().min(1),
    sources: z.array(sourceV2Schema).min(1),
    routeRegistry: z.string().min(1).optional(),
    patches: z.array(patchReferenceSchema),
  })
  .superRefine(validateUniqueEntries);

const manifestInputSchema = z.union([manifestV1Schema, manifestV2Schema]);

export type DatabaseKind = (typeof databaseKinds)[number];
export type PatchReference = z.infer<typeof patchReferenceSchema>;
export type SourceDefinition = z.infer<typeof sourceV2Schema>;
export type SourceManifest = z.infer<typeof manifestV2Schema>;

export interface LoadedManifest {
  manifest: SourceManifest;
  manifestPath: string;
  manifestDirectory: string;
  manifestDisplayPath: string;
}

export function resolveSourceRoot(
  manifestDirectory: string,
  sourceRoot: string,
): string {
  return path.isAbsolute(sourceRoot)
    ? realpathSync(sourceRoot)
    : resolveExistingWithin(manifestDirectory, sourceRoot);
}

export function loadManifest(
  manifestPath: string,
  repositoryRoot: string,
): LoadedManifest {
  const absoluteManifestPath = realpathSync(path.resolve(manifestPath));
  const parsed = JSON.parse(
    readFileSync(absoluteManifestPath, "utf8"),
  ) as unknown;
  const inputManifest = manifestInputSchema.parse(parsed);
  const manifest: SourceManifest =
    inputManifest.schemaVersion === 2
      ? inputManifest
      : {
          schemaVersion: 2,
          datasetId: inputManifest.datasetId,
          datasetVersion: "unversioned",
          sources: inputManifest.sources.map((source) => ({
            ...source,
            version: "unversioned",
          })),
          patches: [],
        };

  const resolvedRepositoryRoot = path.resolve(repositoryRoot);

  for (const source of manifest.sources) {
    const sourceRoot = resolveSourceRoot(
      path.dirname(absoluteManifestPath),
      source.root,
    );
    for (const file of source.files) {
      resolveExistingWithin(sourceRoot, file.path);
    }
  }
  for (const patch of manifest.patches) {
    resolveExistingWithin(resolvedRepositoryRoot, patch.path);
  }
  if (manifest.routeRegistry) {
    resolveExistingWithin(resolvedRepositoryRoot, manifest.routeRegistry);
  }

  const manifestDisplayPath = isPathWithin(
    resolvedRepositoryRoot,
    absoluteManifestPath,
  )
    ? toPosixPath(path.relative(resolvedRepositoryRoot, absoluteManifestPath))
    : `manifests/${path.basename(absoluteManifestPath)}`;

  return {
    manifest,
    manifestPath: absoluteManifestPath,
    manifestDirectory: path.dirname(absoluteManifestPath),
    manifestDisplayPath,
  };
}
