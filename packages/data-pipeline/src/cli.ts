import path from "node:path";
import { fileURLToPath } from "node:url";

import { importDataset } from "./import-dataset";
import { serializeOutputs, writeOutputs } from "./output";
import {
  serializePresentedAssets,
  writePresentedAssets,
  type SerializedPresentedAssets,
} from "./presented-assets";

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
const assetOutputArgument = argumentValue("--assets-output");
const assetOutputDirectory = assetOutputArgument
  ? path.resolve(repositoryRoot, assetOutputArgument)
  : undefined;
const verifyDeterminism = process.argv.includes("--check");
const failOnErrorDiagnostics = process.argv.includes("--fail-on-errors");
const requirePublishedRoutes = process.argv.includes("--publication-routes");

const first = importDataset({
  manifestPath,
  repositoryRoot,
  requirePublishedRoutes,
});
const firstOutputs = serializeOutputs(first);
const firstAssetOutputs = assetOutputDirectory
  ? serializePresentedAssets(first)
  : undefined;

function assetsAreEqual(
  left: SerializedPresentedAssets | undefined,
  right: SerializedPresentedAssets | undefined,
): boolean {
  if (!left || !right) {
    return left === right;
  }
  if (
    left.assets !== right.assets ||
    left.diagnostics !== right.diagnostics ||
    left.manifest !== right.manifest ||
    left.files.size !== right.files.size
  ) {
    return false;
  }
  for (const [file, bytes] of left.files) {
    if (!right.files.get(file)?.equals(bytes)) {
      return false;
    }
  }
  return true;
}

if (verifyDeterminism) {
  const second = importDataset({
    manifestPath,
    repositoryRoot,
    requirePublishedRoutes,
  });
  const secondOutputs = serializeOutputs(second);
  const secondAssetOutputs = assetOutputDirectory
    ? serializePresentedAssets(second)
    : undefined;
  if (
    firstOutputs.artifact !== secondOutputs.artifact ||
    firstOutputs.search !== secondOutputs.search ||
    firstOutputs.diagnostics !== secondOutputs.diagnostics ||
    firstOutputs.manifest !== secondOutputs.manifest ||
    !assetsAreEqual(firstAssetOutputs, secondAssetOutputs)
  ) {
    throw new Error(
      "Determinism check failed: identical imports produced different bytes.",
    );
  }
}

const outputs = writeOutputs(first, outputDirectory, {
  failOnErrorDiagnostics: failOnErrorDiagnostics || requirePublishedRoutes,
});
const assetOutputs = assetOutputDirectory
  ? writePresentedAssets(first, assetOutputDirectory, repositoryRoot)
  : undefined;
const counts = first.artifact.diagnostics;
const assetCatalog = assetOutputs
  ? (JSON.parse(assetOutputs.assets) as { assets: unknown[] })
  : undefined;
const assetDiagnostics = assetOutputs
  ? (JSON.parse(assetOutputs.diagnostics) as unknown[])
  : undefined;
process.stdout.write(
  [
    `Generated ${first.artifact.entities.items.length} items and ${first.search.documents.length} search documents.`,
    `Diagnostics: ${counts.error} errors, ${counts.warning} warnings, ${counts.info} info.`,
    `Artifact bytes: ${Buffer.byteLength(outputs.artifact)}.`,
    `Search bytes: ${Buffer.byteLength(outputs.search)}.`,
    assetCatalog && assetDiagnostics
      ? `Presented item icons: ${assetCatalog.assets.length} mapped to ${assetOutputs?.files.size ?? 0} copied files; ${assetDiagnostics.length} fallback diagnostics.`
      : "",
    verifyDeterminism ? "Determinism check: byte-identical." : "",
  ]
    .filter(Boolean)
    .join("\n") + "\n",
);
