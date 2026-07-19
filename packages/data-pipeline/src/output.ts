import { mkdirSync, renameSync, writeFileSync } from "node:fs";
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
  const temporaryPath = `${targetPath}.tmp`;
  writeFileSync(temporaryPath, contents, "utf8");
  renameSync(temporaryPath, targetPath);
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
  const resolvedOutput = path.resolve(outputDirectory);
  for (const sourceRoot of result.sourceRoots) {
    if (isPathWithin(sourceRoot, resolvedOutput)) {
      throw new Error(
        `Refusing to write generated output inside source root: ${sourceRoot}`,
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
  writeAtomically(path.join(resolvedOutput, "manifest.json"), outputs.manifest);
  return outputs;
}
