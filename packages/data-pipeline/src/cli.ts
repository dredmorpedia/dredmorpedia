import path from "node:path";
import { fileURLToPath } from "node:url";

import { importDataset } from "./import-dataset";
import { serializeOutputs, writeOutputs } from "./output";

function argumentValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const manifestPath = path.resolve(
  repositoryRoot,
  argumentValue("--manifest") ?? "fixtures/synthetic/manifest.json",
);
const outputDirectory = path.resolve(
  repositoryRoot,
  argumentValue("--output") ?? "data/generated/spike",
);
const verifyDeterminism = process.argv.includes("--check");

const first = importDataset({ manifestPath, repositoryRoot });
const firstOutputs = serializeOutputs(first);

if (verifyDeterminism) {
  const second = importDataset({ manifestPath, repositoryRoot });
  const secondOutputs = serializeOutputs(second);
  if (
    firstOutputs.artifact !== secondOutputs.artifact ||
    firstOutputs.diagnostics !== secondOutputs.diagnostics ||
    firstOutputs.manifest !== secondOutputs.manifest
  ) {
    throw new Error(
      "Determinism check failed: identical imports produced different bytes.",
    );
  }
}

const outputs = writeOutputs(first, outputDirectory);
const counts = first.artifact.diagnostics;
process.stdout.write(
  [
    `Generated ${first.artifact.entities.items.length} items and ${first.artifact.searchDocuments.length} search documents.`,
    `Diagnostics: ${counts.error} errors, ${counts.warning} warnings, ${counts.info} info.`,
    `Artifact bytes: ${Buffer.byteLength(outputs.artifact)}.`,
    verifyDeterminism ? "Determinism check: byte-identical." : "",
  ]
    .filter(Boolean)
    .join("\n") + "\n",
);
