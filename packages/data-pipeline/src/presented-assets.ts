import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import {
  compareCodeUnits,
  type DiagnosticCounts,
  type PresentedAssetCatalog,
  type PresentedAssetDiagnostic,
  type PresentedAssetManifest,
  type PresentedAssetRecord,
  type PresentedUiAssetId,
} from "@dredmorpedia/domain";

import type {
  ImportDatasetResult,
  PresentedAssetInput,
} from "./import-dataset";
import {
  decodeDredmorSpriteFirstFrame,
  tintIndexedMonsterPng,
  validatePng,
} from "./monster-art";
import { isPathWithin } from "./safe-path";
import { sha256, stableSerialize } from "./serialization";

const ownershipMarker = ".dredmorpedia-generated-assets";
const ownershipMarkerContents =
  "Managed by @dredmorpedia/data-pipeline. Do not add source files here.\n";
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function assetLabel(input: PresentedAssetInput): string {
  switch (input.kind) {
    case "ability-icon":
      return "ability icon";
    case "skill-icon":
      return "skill icon";
    case "item-icon":
      return "item icon";
    case "spell-icon":
      return "spell icon";
    case "monster-icon":
      return "monster icon";
    case "ui-icon":
      return "interface icon";
  }
}

export interface SerializedPresentedAssets {
  assets: string;
  diagnostics: string;
  manifest: string;
  files: ReadonlyMap<string, Buffer>;
}

function resolveRealTarget(targetPath: string): string {
  const missingSegments: string[] = [];
  let existingAncestor = path.resolve(targetPath);
  while (!existsSync(existingAncestor)) {
    const parent = path.dirname(existingAncestor);
    if (parent === existingAncestor) {
      break;
    }
    missingSegments.unshift(path.basename(existingAncestor));
    existingAncestor = parent;
  }

  return path.resolve(realpathSync(existingAncestor), ...missingSegments);
}

function assetDiagnostic(
  input: PresentedAssetInput,
  code: string,
  message: string,
): PresentedAssetDiagnostic {
  const value = {
    severity: "warning" as const,
    code,
    message,
    kind: input.kind,
    entityId: input.entityId,
    sourceId: input.sourceId,
  };
  return {
    id: `asset-diagnostic:${sha256(stableSerialize(value)).slice(0, 12)}`,
    ...value,
  };
}

function diagnosticCounts(
  diagnostics: readonly PresentedAssetDiagnostic[],
): DiagnosticCounts {
  const counts: DiagnosticCounts = { info: 0, warning: 0, error: 0 };
  for (const diagnostic of diagnostics) {
    counts[diagnostic.severity] += 1;
  }
  return counts;
}

function isPng(bytes: Buffer): boolean {
  return (
    bytes.length >= pngSignature.length &&
    bytes.subarray(0, pngSignature.length).equals(pngSignature)
  );
}

export function serializePresentedAssets(
  result: ImportDatasetResult,
): SerializedPresentedAssets {
  const diagnostics: PresentedAssetDiagnostic[] = [];
  const records: PresentedAssetRecord[] = [];
  const files = new Map<string, Buffer>();

  for (const input of result.presentedAssetInputs) {
    if (input.issue) {
      diagnostics.push(
        assetDiagnostic(input, input.issue.code, input.issue.message),
      );
      continue;
    }
    if (!input.snapshot) {
      diagnostics.push(
        assetDiagnostic(
          input,
          "missing_presented_asset",
          `The referenced ${assetLabel(input)} is unavailable in the approved source roots.`,
        ),
      );
      continue;
    }

    const extension = path.posix.extname(input.sourcePath).toLowerCase();
    if (
      extension !== ".png" &&
      !(input.kind === "monster-icon" && extension === ".spr")
    ) {
      diagnostics.push(
        assetDiagnostic(
          input,
          "unsupported_presented_asset_format",
          `The referenced ${assetLabel(input)} is not a supported presentation asset.`,
        ),
      );
      continue;
    }

    if (extension === ".png" && !isPng(input.snapshot.bytes)) {
      diagnostics.push(
        assetDiagnostic(
          input,
          "invalid_presented_asset_signature",
          `The referenced ${assetLabel(input)} does not have a valid PNG signature.`,
        ),
      );
      continue;
    }

    let outputBytes: Buffer;
    try {
      outputBytes =
        extension === ".spr"
          ? decodeDredmorSpriteFirstFrame(
              input.snapshot.bytes,
              input.paletteTint ?? null,
              input.paletteSnapshot?.bytes ?? null,
            )
          : input.kind === "monster-icon"
            ? tintIndexedMonsterPng(
                input.snapshot.bytes,
                input.paletteTint ?? 0,
                input.paletteSnapshot?.bytes ?? null,
              )
            : (() => {
                validatePng(input.snapshot.bytes);
                return Buffer.from(input.snapshot.bytes);
              })();
    } catch (error) {
      diagnostics.push(
        assetDiagnostic(
          input,
          input.kind === "monster-icon"
            ? "invalid_monster_presentation_asset"
            : "invalid_presented_asset_png",
          error instanceof Error
            ? error.message
            : `The referenced ${assetLabel(input)} could not be decoded.`,
        ),
      );
      continue;
    }

    const outputChecksum = sha256(outputBytes);
    const file = `files/${outputChecksum}.png`;
    const existing = files.get(file);
    if (existing && !existing.equals(outputBytes)) {
      throw new Error(`Conflicting bytes share presented asset path ${file}.`);
    }
    files.set(file, outputBytes);
    records.push({
      kind: input.kind,
      entityId: input.entityId,
      file,
      sha256: outputChecksum,
      bytes: outputBytes.length,
    });
  }

  records.sort(
    (left, right) =>
      compareCodeUnits(left.kind, right.kind) ||
      compareCodeUnits(left.entityId, right.entityId),
  );
  diagnostics.sort((left, right) => compareCodeUnits(left.id, right.id));
  if (
    new Set(diagnostics.map((diagnostic) => diagnostic.id)).size !==
    diagnostics.length
  ) {
    throw new Error("Presented asset diagnostic IDs are not unique.");
  }
  const catalog: PresentedAssetCatalog = {
    schemaVersion: 2,
    datasetId: result.artifact.datasetId,
    datasetVersion: result.artifact.datasetVersion,
    assets: records,
  };
  const assets = stableSerialize(catalog);
  const serializedDiagnostics = stableSerialize(diagnostics);
  const manifest: PresentedAssetManifest = {
    schemaVersion: 3,
    datasetId: result.artifact.datasetId,
    datasetVersion: result.artifact.datasetVersion,
    artifactSha256: sha256(stableSerialize(result.artifact)),
    generator: "@dredmorpedia/data-pipeline@0.0.0",
    uiAssetIds: result.presentedAssetInputs
      .filter((input) => input.kind === "ui-icon")
      .map((input) => input.entityId as PresentedUiAssetId),
    diagnostics: diagnosticCounts(diagnostics),
    outputs: {
      assets: {
        file: "assets.json",
        sha256: sha256(assets),
        bytes: Buffer.byteLength(assets),
      },
      diagnostics: {
        file: "diagnostics.json",
        sha256: sha256(serializedDiagnostics),
        bytes: Buffer.byteLength(serializedDiagnostics),
      },
    },
  };

  return {
    assets,
    diagnostics: serializedDiagnostics,
    manifest: stableSerialize(manifest),
    files: new Map(
      [...files].sort(([left], [right]) => compareCodeUnits(left, right)),
    ),
  };
}

function assertOwnedOutput(outputDirectory: string): void {
  if (!existsSync(outputDirectory)) {
    return;
  }
  const markerPath = path.join(outputDirectory, ownershipMarker);
  if (
    !existsSync(markerPath) ||
    readFileSync(markerPath, "utf8") !== ownershipMarkerContents
  ) {
    throw new Error(
      `Refusing to replace an asset output not owned by the importer: ${outputDirectory}`,
    );
  }
}

function removeManagedTree(target: string, repositoryRoot: string): void {
  if (
    target === repositoryRoot ||
    !isPathWithin(repositoryRoot, target) ||
    path.parse(target).root === target
  ) {
    throw new Error(`Refusing to remove unsafe generated path: ${target}`);
  }
  rmSync(target, { recursive: true, force: true });
}

export function writePresentedAssets(
  result: ImportDatasetResult,
  outputDirectory: string,
  repositoryRoot: string,
): SerializedPresentedAssets {
  const resolvedRepositoryRoot = realpathSync(path.resolve(repositoryRoot));
  const resolvedOutput = resolveRealTarget(outputDirectory);
  if (
    resolvedOutput === resolvedRepositoryRoot ||
    !isPathWithin(resolvedRepositoryRoot, resolvedOutput)
  ) {
    throw new Error(
      "Presented assets must be written to a dedicated directory inside the repository.",
    );
  }
  for (const sourceRoot of result.sourceRoots) {
    const resolvedSourceRoot = resolveRealTarget(sourceRoot);
    if (
      isPathWithin(resolvedSourceRoot, resolvedOutput) ||
      isPathWithin(resolvedOutput, resolvedSourceRoot)
    ) {
      throw new Error(
        `Refusing to write presented assets where they overlap source root: ${sourceRoot}`,
      );
    }
  }
  assertOwnedOutput(resolvedOutput);

  const serialized = serializePresentedAssets(result);
  const parent = path.dirname(resolvedOutput);
  const baseName = path.basename(resolvedOutput);
  const staging = path.join(parent, `.${baseName}.${randomUUID()}.tmp`);
  const backup = path.join(parent, `.${baseName}.${randomUUID()}.backup`);
  mkdirSync(parent, { recursive: true });

  try {
    mkdirSync(path.join(staging, "files"), { recursive: true });
    writeFileSync(
      path.join(staging, ownershipMarker),
      ownershipMarkerContents,
      {
        encoding: "utf8",
        flag: "wx",
      },
    );
    writeFileSync(path.join(staging, "assets.json"), serialized.assets, {
      encoding: "utf8",
      flag: "wx",
    });
    writeFileSync(
      path.join(staging, "diagnostics.json"),
      serialized.diagnostics,
      { encoding: "utf8", flag: "wx" },
    );
    for (const [file, bytes] of serialized.files) {
      writeFileSync(path.join(staging, ...file.split("/")), bytes, {
        flag: "wx",
      });
    }
    // Publish the manifest last so consumers never accept a partial set.
    writeFileSync(path.join(staging, "manifest.json"), serialized.manifest, {
      encoding: "utf8",
      flag: "wx",
    });

    for (const [file, contents] of [
      ["assets.json", serialized.assets],
      ["diagnostics.json", serialized.diagnostics],
      ["manifest.json", serialized.manifest],
    ] as const) {
      if (readFileSync(path.join(staging, file), "utf8") !== contents) {
        throw new Error(`Generated presented asset output changed: ${file}`);
      }
    }
    for (const [file, bytes] of serialized.files) {
      const written = readFileSync(path.join(staging, ...file.split("/")));
      if (
        written.length !== bytes.length ||
        sha256(written) !== sha256(bytes)
      ) {
        throw new Error(`Generated presented asset changed: ${file}`);
      }
    }

    if (existsSync(resolvedOutput)) {
      renameSync(resolvedOutput, backup);
    }
    try {
      renameSync(staging, resolvedOutput);
    } catch (error) {
      if (existsSync(backup)) {
        renameSync(backup, resolvedOutput);
      }
      throw error;
    }
    if (existsSync(backup)) {
      removeManagedTree(backup, resolvedRepositoryRoot);
    }
  } finally {
    if (existsSync(staging)) {
      removeManagedTree(staging, resolvedRepositoryRoot);
    }
  }

  return serialized;
}
