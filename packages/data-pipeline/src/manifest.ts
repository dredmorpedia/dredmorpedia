import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

import { presentedUiAssetIds } from "@dredmorpedia/domain";

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

const databaseFileSchema = z.strictObject({
  kind: z.enum(databaseKinds),
  path: z.string().min(1),
});

const presentedAssetSchema = z.strictObject({
  id: z.enum(presentedUiAssetIds),
  path: z.string().min(1),
});

const sourceV1Schema = z.strictObject({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(["base", "expansion", "mod", "fixture", "reference"]),
  precedence: z.number().int(),
  root: z.string().min(1),
  files: z.array(databaseFileSchema).min(1),
});

const sourceV2Schema = z.strictObject({
  ...sourceV1Schema.shape,
  version: z.string().min(1),
  rootBase: z.enum(["manifest", "repository"]).optional(),
  presentedAssets: z.array(presentedAssetSchema).optional(),
});

const patchReferenceSchema = z.strictObject({
  order: z.number().int(),
  path: z.string().min(1),
});

function validateUniqueEntries(
  manifest: {
    sources: {
      id: string;
      presentedAssets?: { id: string; path: string }[] | undefined;
    }[];
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

    const assetIds = new Set<string>();
    for (const [assetIndex, asset] of (
      source.presentedAssets ?? []
    ).entries()) {
      if (assetIds.has(asset.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate presented asset id in ${source.id}: ${asset.id}`,
          path: ["sources", index, "presentedAssets", assetIndex, "id"],
        });
      }
      assetIds.add(asset.id);
    }
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
  .strictObject({
    schemaVersion: z.literal(1),
    datasetId: z.string().min(1),
    sources: z.array(sourceV1Schema).min(1),
  })
  .superRefine(validateUniqueEntries);

const manifestV2Schema = z
  .strictObject({
    schemaVersion: z.literal(2),
    datasetId: z.string().min(1),
    datasetVersion: z.string().min(1),
    sources: z.array(sourceV2Schema).min(1),
    routeRegistry: z.string().min(1).optional(),
    previousRouteRegistry: z.string().min(1).optional(),
    patches: z.array(patchReferenceSchema),
  })
  .superRefine((manifest, context) => {
    validateUniqueEntries(manifest, context);
    if (manifest.previousRouteRegistry && !manifest.routeRegistry) {
      context.addIssue({
        code: "custom",
        message: "A previous route registry requires a current route registry.",
        path: ["previousRouteRegistry"],
      });
    }
    if (
      manifest.previousRouteRegistry &&
      manifest.previousRouteRegistry === manifest.routeRegistry
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Current and previous route registries must be different files.",
        path: ["previousRouteRegistry"],
      });
    }
  });

const manifestInputSchema = z.discriminatedUnion("schemaVersion", [
  manifestV1Schema,
  manifestV2Schema,
]);

export type DatabaseKind = (typeof databaseKinds)[number];
export type PatchReference = z.infer<typeof patchReferenceSchema>;
export type SourceDefinition = z.infer<typeof sourceV2Schema>;
export type SourceManifest = z.infer<typeof manifestV2Schema>;

export interface ManifestV1MigrationVersions {
  datasetVersion: string;
  sourceVersion: string;
}

export function parseSourceManifestV2(input: unknown): SourceManifest {
  return manifestV2Schema.parse(input);
}

export function migrateSourceManifestV1(
  input: unknown,
  versions: ManifestV1MigrationVersions,
): SourceManifest {
  const legacy = manifestV1Schema.parse(input);
  return parseSourceManifestV2({
    schemaVersion: 2,
    datasetId: legacy.datasetId,
    datasetVersion: versions.datasetVersion,
    sources: legacy.sources.map((source) => ({
      id: source.id,
      label: source.label,
      kind: source.kind,
      version: versions.sourceVersion,
      precedence: source.precedence,
      root: source.root,
      files: source.files,
    })),
    patches: [],
  });
}

export interface LoadedManifest {
  manifest: SourceManifest;
  manifestPath: string;
  manifestDirectory: string;
  manifestDisplayPath: string;
  repositoryRoot: string;
}

export function sourceRootBase(
  loaded: Pick<LoadedManifest, "manifestDirectory" | "repositoryRoot">,
  source: Pick<SourceDefinition, "rootBase">,
): string {
  return source.rootBase === "repository"
    ? loaded.repositoryRoot
    : loaded.manifestDirectory;
}

export type ManifestInputReader = (
  absolutePath: string,
  displayPath: string,
) => string;

export function resolveSourceRoot(
  manifestDirectory: string,
  sourceRoot: string,
): string {
  // The manifest is trusted operator configuration. Absolute roots
  // intentionally support read-only external game installations; every
  // declared source file is still contained with resolveExistingWithin.
  return path.isAbsolute(sourceRoot)
    ? realpathSync(sourceRoot)
    : resolveExistingWithin(manifestDirectory, sourceRoot);
}

export function loadManifest(
  manifestPath: string,
  repositoryRoot: string,
  readInput: ManifestInputReader = (absolutePath) =>
    readFileSync(absolutePath, "utf8"),
): LoadedManifest {
  const absoluteManifestPath = realpathSync(path.resolve(manifestPath));
  const resolvedRepositoryRoot = path.resolve(repositoryRoot);
  const manifestDisplayPath = isPathWithin(
    resolvedRepositoryRoot,
    absoluteManifestPath,
  )
    ? toPosixPath(path.relative(resolvedRepositoryRoot, absoluteManifestPath))
    : `manifests/${path.basename(absoluteManifestPath)}`;
  const parsed = JSON.parse(
    readInput(absoluteManifestPath, manifestDisplayPath),
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

  for (const source of manifest.sources) {
    const sourceRoot = resolveSourceRoot(
      source.rootBase === "repository"
        ? resolvedRepositoryRoot
        : path.dirname(absoluteManifestPath),
      source.root,
    );
    for (const file of source.files) {
      resolveExistingWithin(sourceRoot, file.path);
    }
    for (const asset of source.presentedAssets ?? []) {
      resolveExistingWithin(sourceRoot, asset.path);
    }
  }
  for (const patch of manifest.patches) {
    resolveExistingWithin(resolvedRepositoryRoot, patch.path);
  }
  const routeRegistryPath = manifest.routeRegistry
    ? resolveExistingWithin(resolvedRepositoryRoot, manifest.routeRegistry)
    : undefined;
  if (manifest.previousRouteRegistry) {
    const previousRouteRegistryPath = resolveExistingWithin(
      resolvedRepositoryRoot,
      manifest.previousRouteRegistry,
    );
    if (previousRouteRegistryPath === routeRegistryPath) {
      throw new Error(
        "Current and previous route registries must resolve to different files.",
      );
    }
  }

  return {
    manifest,
    manifestPath: absoluteManifestPath,
    manifestDirectory: path.dirname(absoluteManifestPath),
    manifestDisplayPath,
    repositoryRoot: resolvedRepositoryRoot,
  };
}
