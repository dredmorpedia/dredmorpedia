import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";

import {
  presentedAssetKinds,
  type DatasetArtifact,
  type PresentedAssetCatalog,
  type PresentedAssetDiagnostic,
  type PresentedAssetKind,
  type PresentedAssetManifest,
} from "@dredmorpedia/domain";
import { z } from "zod";

const nonnegativeInteger = z.number().int().nonnegative();
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const generatedAssetFileSchema = z.string().regex(/^files\/[a-f0-9]{64}\.png$/);
const checksumSchema = z
  .object({
    file: z.string(),
    sha256: sha256Schema,
    bytes: nonnegativeInteger,
  })
  .strict();
const assetRecordSchema = z
  .object({
    kind: z.enum(presentedAssetKinds),
    entityId: z.string().min(1),
    file: generatedAssetFileSchema,
    sha256: sha256Schema,
    bytes: nonnegativeInteger,
  })
  .strict();
const assetCatalogSchema = z
  .object({
    schemaVersion: z.literal(1),
    datasetId: z.string().min(1),
    datasetVersion: z.string().min(1),
    assets: z.array(assetRecordSchema),
  })
  .strict();
const assetDiagnosticSchema = z
  .object({
    id: z.string().min(1),
    severity: z.enum(["info", "warning", "error"]),
    code: z.string().min(1),
    message: z.string().min(1),
    kind: z.enum(presentedAssetKinds),
    entityId: z.string().min(1),
    sourceId: z.string().min(1),
  })
  .strict();
const assetManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    datasetId: z.string().min(1),
    datasetVersion: z.string().min(1),
    generator: z.string().min(1),
    diagnostics: z
      .object({
        info: nonnegativeInteger,
        warning: nonnegativeInteger,
        error: nonnegativeInteger,
      })
      .strict(),
    outputs: z
      .object({
        assets: checksumSchema.extend({ file: z.literal("assets.json") }),
        diagnostics: checksumSchema.extend({
          file: z.literal("diagnostics.json"),
        }),
      })
      .strict(),
  })
  .strict();

interface LoadedPresentedAssets {
  catalog: PresentedAssetCatalog;
  byAssetKey: Map<string, string>;
}

let loadedCache: LoadedPresentedAssets | null | undefined;

function assetKey(kind: PresentedAssetKind, entityId: string): string {
  return `${kind}:${entityId}`;
}

function parseJson(text: string, label: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new Error(`Generated ${label} is not valid JSON.`, { cause: error });
  }
}

function validationError(label: string, error: z.ZodError): Error {
  const issue = error.issues[0];
  const location = issue?.path.length ? ` at ${issue.path.join(".")}` : "";
  return new Error(
    `Generated ${label} does not satisfy its schema${location}: ${issue?.message ?? "validation failed"}. Regenerate the matching dataset and assets.`,
  );
}

function readAssetFile(directory: string, file: string): Buffer {
  const absolutePath = path.resolve(directory, ...file.split("/"));
  const relative = path.relative(directory, absolutePath);
  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error(
      `Generated asset path escapes its output directory: ${file}`,
    );
  }
  if (!existsSync(absolutePath)) {
    throw new Error(`Generated presented asset is missing: ${file}`);
  }
  const directoryRealPath = realpathSync(directory);
  const fileRealPath = realpathSync(absolutePath);
  const realRelative = path.relative(directoryRealPath, fileRealPath);
  if (
    realRelative === ".." ||
    realRelative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(realRelative)
  ) {
    throw new Error(
      `Generated asset path resolves outside its output directory: ${file}`,
    );
  }
  return readFileSync(fileRealPath);
}

function readVerifiedText(
  directory: string,
  expected: { file: string; sha256: string; bytes: number },
): string {
  const contents = readAssetFile(directory, expected.file);
  if (
    contents.length !== expected.bytes ||
    createHash("sha256").update(contents).digest("hex") !== expected.sha256
  ) {
    throw new Error(
      `Generated ${expected.file} does not match the presented asset manifest; regenerate the matching dataset and assets.`,
    );
  }
  return contents.toString("utf8");
}

function loadConfiguredAssets(
  artifact: DatasetArtifact,
): LoadedPresentedAssets | null {
  if (loadedCache !== undefined) {
    if (
      loadedCache &&
      (loadedCache.catalog.datasetId !== artifact.datasetId ||
        loadedCache.catalog.datasetVersion !== artifact.datasetVersion)
    ) {
      throw new Error(
        "Generated presented assets do not match the active dataset.",
      );
    }
    return loadedCache;
  }

  const configuredDirectory = process.env.DREDMORPEDIA_ASSET_DIRECTORY;
  if (!configuredDirectory) {
    loadedCache = null;
    return null;
  }
  const directory = path.resolve(configuredDirectory);
  const manifestPath = path.join(directory, "manifest.json");
  if (!existsSync(manifestPath)) {
    throw new Error(
      "Generated presented asset manifest is missing; run the matching generate command.",
    );
  }
  const manifestResult = assetManifestSchema.safeParse(
    parseJson(
      readAssetFile(directory, "manifest.json").toString("utf8"),
      "asset manifest.json",
    ),
  );
  if (!manifestResult.success) {
    throw validationError("asset manifest.json", manifestResult.error);
  }
  const manifest = manifestResult.data as PresentedAssetManifest;
  if (
    manifest.datasetId !== artifact.datasetId ||
    manifest.datasetVersion !== artifact.datasetVersion
  ) {
    throw new Error(
      "Generated presented assets do not match the active dataset.",
    );
  }

  const catalogResult = assetCatalogSchema.safeParse(
    parseJson(
      readVerifiedText(directory, manifest.outputs.assets),
      "assets.json",
    ),
  );
  if (!catalogResult.success) {
    throw validationError("assets.json", catalogResult.error);
  }
  const catalog = catalogResult.data as PresentedAssetCatalog;
  if (
    catalog.datasetId !== manifest.datasetId ||
    catalog.datasetVersion !== manifest.datasetVersion
  ) {
    throw new Error(
      "Generated assets.json and manifest.json identify different datasets.",
    );
  }

  const diagnosticResult = z
    .array(assetDiagnosticSchema)
    .safeParse(
      parseJson(
        readVerifiedText(directory, manifest.outputs.diagnostics),
        "asset diagnostics.json",
      ),
    );
  if (!diagnosticResult.success) {
    throw validationError("asset diagnostics.json", diagnosticResult.error);
  }
  const diagnostics = diagnosticResult.data as PresentedAssetDiagnostic[];
  const counts = { info: 0, warning: 0, error: 0 };
  const diagnosticIds = new Set<string>();
  const outcomeAssetKeys = new Set<string>();
  const expectedAssetKeys = new Set([
    ...artifact.entities.items
      .filter((item) => item.iconPath !== null)
      .map((item) => assetKey("item-icon", item.id)),
    ...artifact.entities.skills
      .filter((skill) => skill.iconPath !== null)
      .map((skill) => assetKey("skill-icon", skill.id)),
  ]);
  const sourceIds = new Set(artifact.sources.map((source) => source.id));
  for (const diagnostic of diagnostics) {
    if (diagnosticIds.has(diagnostic.id)) {
      throw new Error(
        `Generated presented assets contain duplicate diagnostic ${diagnostic.id}.`,
      );
    }
    diagnosticIds.add(diagnostic.id);
    const key = assetKey(diagnostic.kind, diagnostic.entityId);
    if (!expectedAssetKeys.has(key) || !sourceIds.has(diagnostic.sourceId)) {
      throw new Error(
        `Generated presented asset diagnostic ${diagnostic.id} does not belong to the active dataset.`,
      );
    }
    if (outcomeAssetKeys.has(key)) {
      throw new Error(
        `Generated presented assets contain multiple outcomes for ${diagnostic.kind} ${diagnostic.entityId}.`,
      );
    }
    outcomeAssetKeys.add(key);
    counts[diagnostic.severity] += 1;
  }
  if (
    counts.info !== manifest.diagnostics.info ||
    counts.warning !== manifest.diagnostics.warning ||
    counts.error !== manifest.diagnostics.error
  ) {
    throw new Error(
      "Generated presented asset diagnostic counts do not match manifest.json.",
    );
  }

  const byAssetKey = new Map<string, string>();
  for (const asset of catalog.assets) {
    const key = assetKey(asset.kind, asset.entityId);
    if (!expectedAssetKeys.has(key) || outcomeAssetKeys.has(key)) {
      throw new Error(
        `Generated presented assets contain an invalid or duplicate entity mapping ${asset.kind} ${asset.entityId}.`,
      );
    }
    if (asset.file !== `files/${asset.sha256}.png`) {
      throw new Error(
        `Generated presented asset filename does not match its checksum: ${asset.file}`,
      );
    }
    const contents = readAssetFile(directory, asset.file);
    if (
      contents.length !== asset.bytes ||
      createHash("sha256").update(contents).digest("hex") !== asset.sha256
    ) {
      throw new Error(
        `Generated presented asset does not match assets.json: ${asset.file}`,
      );
    }
    byAssetKey.set(key, asset.file);
    outcomeAssetKeys.add(key);
  }
  if (
    outcomeAssetKeys.size !== expectedAssetKeys.size ||
    [...expectedAssetKeys].some((key) => !outcomeAssetKeys.has(key))
  ) {
    throw new Error(
      "Generated presented assets do not account for every active presented icon reference.",
    );
  }

  loadedCache = { catalog, byAssetKey };
  return loadedCache;
}

function normalizedBasePath(value: string | undefined): string {
  if (!value || value === "/") {
    return "";
  }
  return `/${value.replace(/^\/+|\/+$/g, "")}`;
}

function presentedAssetUrl(
  kind: PresentedAssetKind,
  entityId: string,
  artifact: DatasetArtifact,
): string | null {
  const loaded = loadConfiguredAssets(artifact);
  if (!loaded) {
    return null;
  }
  const file = loaded.byAssetKey.get(assetKey(kind, entityId));
  if (!file) {
    return null;
  }
  const configuredBasePath = process.env.DREDMORPEDIA_ASSET_BASE_PATH;
  if (
    !configuredBasePath ||
    !/^\/[A-Za-z0-9/_-]+$/.test(configuredBasePath) ||
    configuredBasePath.split("/").some((segment) => segment === "..")
  ) {
    throw new Error(
      "DREDMORPEDIA_ASSET_BASE_PATH must be a safe absolute URL path.",
    );
  }
  return `${normalizedBasePath(process.env.NEXT_PUBLIC_BASE_PATH)}${normalizedBasePath(configuredBasePath)}/${file}`;
}

export function itemIconUrl(
  itemId: string,
  artifact: DatasetArtifact,
): string | null {
  return presentedAssetUrl("item-icon", itemId, artifact);
}

export function skillIconUrl(
  skillId: string,
  artifact: DatasetArtifact,
): string | null {
  return presentedAssetUrl("skill-icon", skillId, artifact);
}
