import { randomUUID } from "node:crypto";
import {
  existsSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  migrateOfficialSourceManifest,
  officialDatasetVersion,
  parseCurrentOfficialSourceManifest,
  upgradeCurrentOfficialSourceManifest,
} from "./official-manifest";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const manifestPath = path.join(
  repositoryRoot,
  "data/raw/local-official-manifest.json",
);

function parseJson(contents: string): unknown {
  try {
    return JSON.parse(contents) as unknown;
  } catch (error) {
    throw new Error("The ignored official manifest is not valid JSON.", {
      cause: error,
    });
  }
}

function writeAtomically(contents: string): void {
  const temporaryPath = `${manifestPath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporaryPath, contents, { encoding: "utf8", flag: "wx" });
    renameSync(temporaryPath, manifestPath);
  } finally {
    if (existsSync(temporaryPath)) {
      unlinkSync(temporaryPath);
    }
  }
}

if (!existsSync(manifestPath)) {
  throw new Error(
    "The ignored official manifest is missing. This command migrates an existing local schema-1 manifest; configure new manifests directly as schema 2.",
  );
}

const input = parseJson(readFileSync(manifestPath, "utf8"));
const schemaVersion =
  typeof input === "object" && input !== null && "schemaVersion" in input
    ? input.schemaVersion
    : undefined;

if (schemaVersion === 2) {
  const manifest = upgradeCurrentOfficialSourceManifest(input);
  const currentContents = `${JSON.stringify(input, null, 2)}\n`;
  const upgradedContents = `${JSON.stringify(manifest, null, 2)}\n`;
  if (currentContents === upgradedContents) {
    parseCurrentOfficialSourceManifest(input);
    process.stdout.write(
      `Official manifest is current at ${officialDatasetVersion}; no changes made.\n`,
    );
  } else {
    writeAtomically(upgradedContents);
    process.stdout.write(
      `Added the versioned Dredmorpedia project references to the current official manifest at ${officialDatasetVersion}.\n`,
    );
  }
} else {
  const manifest = migrateOfficialSourceManifest(input);
  writeAtomically(`${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(
    `Migrated official manifest from schema 1 to schema 2 at ${officialDatasetVersion}; preserved four local game roots and added the versioned Dredmorpedia project references.\n`,
  );
}
