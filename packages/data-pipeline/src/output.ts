import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import type { ArtifactManifest } from "@dredmorpedia/domain";

import { isPathWithin } from "./safe-path";
import { sha256, stableSerialize } from "./serialization";
import type { ImportDatasetResult } from "./import-dataset";

export interface SerializedOutputs {
  artifact: string;
  search: string;
  diagnostics: string;
  manifest: string;
}

function writeAtomically(targetPath: string, contents: string): void {
  const temporaryPath = `${targetPath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporaryPath, contents, { encoding: "utf8", flag: "wx" });
    renameSync(temporaryPath, targetPath);
  } finally {
    if (existsSync(temporaryPath)) {
      unlinkSync(temporaryPath);
    }
  }
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

export function serializeOutputs(
  result: ImportDatasetResult,
): SerializedOutputs {
  const artifact = stableSerialize(result.artifact);
  const search = stableSerialize(result.search);
  const diagnostics = stableSerialize(result.diagnostics);
  const manifestValue: ArtifactManifest = {
    schemaVersion: 2,
    datasetId: result.artifact.datasetId,
    generator: "@dredmorpedia/data-pipeline@0.0.0",
    sourceManifest: result.sourceManifest,
    inputs: result.inputs,
    outputs: {
      artifact: {
        file: "artifact.json",
        sha256: sha256(artifact),
        bytes: Buffer.byteLength(artifact),
      },
      search: {
        file: "search.json",
        sha256: sha256(search),
        bytes: Buffer.byteLength(search),
      },
      diagnostics: {
        file: "diagnostics.json",
        sha256: sha256(diagnostics),
        bytes: Buffer.byteLength(diagnostics),
      },
    },
  };

  return {
    artifact,
    search,
    diagnostics,
    manifest: stableSerialize(manifestValue),
  };
}

export function writeOutputs(
  result: ImportDatasetResult,
  outputDirectory: string,
): SerializedOutputs {
  const resolvedOutput = resolveRealTarget(outputDirectory);
  for (const sourceRoot of result.sourceRoots) {
    const resolvedSourceRoot = resolveRealTarget(sourceRoot);
    if (
      isPathWithin(resolvedSourceRoot, resolvedOutput) ||
      isPathWithin(resolvedOutput, resolvedSourceRoot)
    ) {
      throw new Error(
        `Refusing to write generated output where it overlaps source root: ${sourceRoot}`,
      );
    }
  }

  const outputs = serializeOutputs(result);
  mkdirSync(resolvedOutput, { recursive: true });
  writeAtomically(path.join(resolvedOutput, "artifact.json"), outputs.artifact);
  writeAtomically(path.join(resolvedOutput, "search.json"), outputs.search);
  writeAtomically(
    path.join(resolvedOutput, "diagnostics.json"),
    outputs.diagnostics,
  );
  // The manifest is the commit marker. Consumers verify its checksums, so an
  // interrupted publication is rejected instead of being read as a mixed set.
  writeAtomically(path.join(resolvedOutput, "manifest.json"), outputs.manifest);

  for (const [file, contents] of [
    ["artifact.json", outputs.artifact],
    ["search.json", outputs.search],
    ["diagnostics.json", outputs.diagnostics],
    ["manifest.json", outputs.manifest],
  ] as const) {
    if (readFileSync(path.join(resolvedOutput, file), "utf8") !== contents) {
      throw new Error(`Generated output changed during publication: ${file}`);
    }
  }
  return outputs;
}
