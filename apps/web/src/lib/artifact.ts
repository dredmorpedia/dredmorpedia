import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  itemTriggerKinds,
  type DatasetArtifact,
  type Diagnostic,
  type SearchArtifact,
} from "@dredmorpedia/domain";

const itemTriggerKindSet: ReadonlySet<string> = new Set(itemTriggerKinds);

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

function hasValidItems(value: unknown): boolean {
  if (value === null || typeof value !== "object" || !("items" in value)) {
    return false;
  }
  if (!Array.isArray(value.items)) {
    return false;
  }
  return value.items.every((item) => {
    if (
      item === null ||
      typeof item !== "object" ||
      !("quality" in item) ||
      typeof item.quality !== "number" ||
      !Number.isInteger(item.quality) ||
      item.quality < 0 ||
      !("triggers" in item) ||
      !Array.isArray(item.triggers)
    ) {
      return false;
    }
    return item.triggers.every(
      (trigger: unknown) =>
        trigger !== null &&
        typeof trigger === "object" &&
        "kind" in trigger &&
        typeof trigger.kind === "string" &&
        itemTriggerKindSet.has(trigger.kind) &&
        "spellKey" in trigger &&
        typeof trigger.spellKey === "string" &&
        "spellName" in trigger &&
        typeof trigger.spellName === "string" &&
        "chance" in trigger &&
        (trigger.chance === null ||
          (typeof trigger.chance === "number" &&
            Number.isInteger(trigger.chance) &&
            trigger.chance >= 0 &&
            trigger.chance <= 100)) &&
        "delay" in trigger &&
        typeof trigger.delay === "number" &&
        Number.isInteger(trigger.delay) &&
        trigger.delay >= 0 &&
        "duration" in trigger &&
        typeof trigger.duration === "number" &&
        Number.isInteger(trigger.duration) &&
        trigger.duration >= 0 &&
        "unresistable" in trigger &&
        typeof trigger.unresistable === "boolean" &&
        "monsterTaxonomy" in trigger &&
        (trigger.monsterTaxonomy === null ||
          typeof trigger.monsterTaxonomy === "string") &&
        (!("spellId" in trigger) || typeof trigger.spellId === "string"),
    );
  });
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
    !hasValidItems(parsed.entities)
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
