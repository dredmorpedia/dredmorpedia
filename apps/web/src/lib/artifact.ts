import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { DatasetArtifact, Diagnostic } from "@dredmorpedia/domain";

function generatedFile(name: string): string {
  const explicitRoot = process.env.DREDMORPEDIA_ARTIFACT_DIRECTORY;
  const candidates = [
    ...(explicitRoot ? [path.resolve(explicitRoot, name)] : []),
    path.resolve(process.cwd(), "../../data/generated/spike", name),
    path.resolve(process.cwd(), "data/generated/spike", name),
  ];
  const match = candidates.find(existsSync);
  if (!match) {
    throw new Error(
      `Generated ${name} is missing. Run \"pnpm generate\" from the repository root.`,
    );
  }
  return match;
}

function readJson(name: string): unknown {
  return JSON.parse(readFileSync(generatedFile(name), "utf8")) as unknown;
}

let artifactCache: DatasetArtifact | undefined;
let diagnosticsCache: Diagnostic[] | undefined;

export function loadArtifact(): DatasetArtifact {
  if (artifactCache) {
    return artifactCache;
  }
  const parsed = readJson("artifact.json");
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    !("schemaVersion" in parsed) ||
    parsed.schemaVersion !== 1 ||
    !("entities" in parsed)
  ) {
    throw new Error("Generated artifact does not satisfy schema version 1.");
  }
  artifactCache = parsed as DatasetArtifact;
  return artifactCache;
}

export function loadDiagnostics(): Diagnostic[] {
  if (diagnosticsCache) {
    return diagnosticsCache;
  }
  const parsed = readJson("diagnostics.json");
  if (!Array.isArray(parsed)) {
    throw new Error("Generated diagnostics must be an array.");
  }
  diagnosticsCache = parsed as Diagnostic[];
  return diagnosticsCache;
}
