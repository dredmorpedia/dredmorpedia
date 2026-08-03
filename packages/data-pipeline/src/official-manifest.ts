import type { DatabaseKind, SourceManifest } from "./manifest";
import { migrateSourceManifestV1, parseSourceManifestV2 } from "./manifest";

export const officialDatasetVersion =
  "1.1.5 public_beta (Steam build 22934623)";

const officialDatasetId = "dredmor-1.1.5-public-beta-steam-build-22934623";

interface ExpectedOfficialSource {
  id: string;
  kind: "base" | "expansion";
  precedence: number;
  files: readonly { kind: DatabaseKind; path: string }[];
}

const commonExpansionFiles = [
  { kind: "items", path: "game/itemDB.xml" },
  { kind: "recipes", path: "game/craftDB.xml" },
  { kind: "skills", path: "game/skillDB.xml" },
  { kind: "spells", path: "game/spellDB.xml" },
  { kind: "monsters", path: "game/monDB.xml" },
] as const;

const expectedOfficialSources: readonly ExpectedOfficialSource[] = [
  {
    id: "official-base",
    kind: "base",
    precedence: 0,
    files: [
      ...commonExpansionFiles,
      { kind: "templates", path: "game/manTemplateDB.xml" },
    ],
  },
  {
    id: "official-expansion-1",
    kind: "expansion",
    precedence: 10,
    files: commonExpansionFiles,
  },
  {
    id: "official-expansion-2",
    kind: "expansion",
    precedence: 20,
    files: commonExpansionFiles,
  },
  {
    id: "official-expansion-3",
    kind: "expansion",
    precedence: 30,
    files: [
      ...commonExpansionFiles,
      { kind: "encrustments", path: "game/encrustDB.xml" },
    ],
  },
];

function fileKey(file: { kind: DatabaseKind; path: string }): string {
  return `${file.kind}:${file.path}`;
}

function assertOfficialScope(manifest: SourceManifest): void {
  if (manifest.datasetId !== officialDatasetId) {
    throw new Error(
      `Refusing to label unexpected dataset ${manifest.datasetId} as the canonical official build.`,
    );
  }
  if (manifest.sources.length !== expectedOfficialSources.length) {
    throw new Error(
      `Refusing to migrate an official manifest with ${manifest.sources.length} sources instead of ${expectedOfficialSources.length}.`,
    );
  }

  for (const expected of expectedOfficialSources) {
    const source = manifest.sources.find(({ id }) => id === expected.id);
    const expectedFiles = new Set(expected.files.map(fileKey));
    if (
      source === undefined ||
      source.kind !== expected.kind ||
      source.precedence !== expected.precedence ||
      source.files.length !== expectedFiles.size ||
      source.files.some((file) => !expectedFiles.has(fileKey(file)))
    ) {
      throw new Error(
        `Refusing to migrate unexpected source metadata for ${expected.id}.`,
      );
    }
  }
}

export function migrateOfficialSourceManifest(input: unknown): SourceManifest {
  const manifest = migrateSourceManifestV1(input, {
    datasetVersion: officialDatasetVersion,
    sourceVersion: officialDatasetVersion,
  });
  assertOfficialScope(manifest);
  return manifest;
}

export function parseCurrentOfficialSourceManifest(
  input: unknown,
): SourceManifest {
  const manifest = parseSourceManifestV2(input);
  assertOfficialScope(manifest);
  if (
    manifest.datasetVersion !== officialDatasetVersion ||
    manifest.sources.some((source) => source.version !== officialDatasetVersion)
  ) {
    throw new Error(
      "The schema-2 official manifest has version metadata that differs from the reviewed canonical baseline; update it intentionally instead of overwriting it through migration.",
    );
  }
  return manifest;
}
