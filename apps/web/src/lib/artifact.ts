import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type {
  DatasetArtifact,
  Diagnostic,
  SearchArtifact,
} from "@dredmorpedia/domain";

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
let searchCache: SearchArtifact | undefined;

function hasValidItemQualities(value: unknown): boolean {
  if (value === null || typeof value !== "object" || !("items" in value)) {
    return false;
  }
  if (!Array.isArray(value.items)) {
    return false;
  }
  return value.items.every(
    (item) =>
      item !== null &&
      typeof item === "object" &&
      "quality" in item &&
      typeof item.quality === "number" &&
      Number.isInteger(item.quality) &&
      item.quality >= 0,
  );
}

export function loadArtifact(): DatasetArtifact {
  if (artifactCache) {
    return artifactCache;
  }
  const parsed = readJson("artifact.json");
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    !("schemaVersion" in parsed) ||
    parsed.schemaVersion !== 3 ||
    !("datasetVersion" in parsed) ||
    typeof parsed.datasetVersion !== "string" ||
    !("entities" in parsed) ||
    !hasValidItemQualities(parsed.entities)
  ) {
    throw new Error(
      "Generated artifact does not satisfy schema version 3; regenerate it with the current pipeline.",
    );
  }
  artifactCache = parsed as DatasetArtifact;
  return artifactCache;
}

export function loadSearchArtifact(): SearchArtifact {
  if (searchCache) {
    return searchCache;
  }
  const parsed = readJson("search.json");
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    !("schemaVersion" in parsed) ||
    parsed.schemaVersion !== 1 ||
    !("datasetSchemaVersion" in parsed) ||
    parsed.datasetSchemaVersion !== 3 ||
    !("documents" in parsed) ||
    !Array.isArray(parsed.documents)
  ) {
    throw new Error(
      "Generated search artifact does not satisfy schema version 1.",
    );
  }
  searchCache = parsed as SearchArtifact;
  return searchCache;
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
