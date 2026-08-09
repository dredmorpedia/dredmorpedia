import type { DatabaseKind, SourceManifest } from "./manifest";
import { migrateSourceManifestV1, parseSourceManifestV2 } from "./manifest";

export const officialDatasetVersion =
  "1.1.5 public_beta (Steam build 22934623)";
export const officialStatReferenceVersion = "1.0.0";

const officialDatasetId = "dredmor-1.1.5-public-beta-steam-build-22934623";

interface ExpectedOfficialSource {
  id: string;
  kind: "base" | "expansion";
  precedence: number;
  files: readonly { kind: DatabaseKind; path: string }[];
}

const officialStatReferenceSource = {
  id: "dredmorpedia-stat-reference",
  label: "Dredmorpedia stat reference",
  kind: "reference" as const,
  version: officialStatReferenceVersion,
  precedence: -10,
  rootBase: "repository" as const,
  root: "reference-data/dredmor-1.1.5-public-beta",
  files: [{ kind: "stats" as const, path: "statDB.xml" }],
};

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

function assertOfficialGameScope(manifest: SourceManifest): void {
  if (manifest.datasetId !== officialDatasetId) {
    throw new Error(
      `Refusing to label unexpected dataset ${manifest.datasetId} as the canonical official build.`,
    );
  }
  const gameSources = manifest.sources.filter(
    (source) => source.id !== officialStatReferenceSource.id,
  );
  if (gameSources.length !== expectedOfficialSources.length) {
    throw new Error(
      `Refusing to migrate an official manifest with ${gameSources.length} game sources instead of ${expectedOfficialSources.length}.`,
    );
  }

  for (const expected of expectedOfficialSources) {
    const source = gameSources.find(({ id }) => id === expected.id);
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

  const unexpectedSources = gameSources.filter(
    (source) =>
      !expectedOfficialSources.some((expected) => expected.id === source.id),
  );
  if (unexpectedSources.length > 0) {
    throw new Error(
      `Refusing to migrate unexpected official source metadata for ${unexpectedSources[0]?.id}.`,
    );
  }
}

function assertStatReferenceSource(manifest: SourceManifest): void {
  const source = manifest.sources.find(
    ({ id }) => id === officialStatReferenceSource.id,
  );
  if (
    source === undefined ||
    source.label !== officialStatReferenceSource.label ||
    source.kind !== officialStatReferenceSource.kind ||
    source.version !== officialStatReferenceSource.version ||
    source.precedence !== officialStatReferenceSource.precedence ||
    source.rootBase !== officialStatReferenceSource.rootBase ||
    source.root !== officialStatReferenceSource.root ||
    source.files.length !== 1 ||
    fileKey(source.files[0]!) !== fileKey(officialStatReferenceSource.files[0]!)
  ) {
    throw new Error(
      "The canonical official manifest has missing or unexpected Dredmorpedia stat-reference metadata.",
    );
  }
}

function addStatReferenceSource(manifest: SourceManifest): SourceManifest {
  const existing = manifest.sources.find(
    ({ id }) => id === officialStatReferenceSource.id,
  );
  if (existing) {
    if (
      existing.kind === officialStatReferenceSource.kind &&
      existing.version === officialStatReferenceSource.version &&
      existing.precedence === officialStatReferenceSource.precedence &&
      existing.rootBase === undefined &&
      existing.root === "../../reference-data/dredmor-1.1.5-public-beta" &&
      existing.files.length === 1 &&
      fileKey(existing.files[0]!) ===
        fileKey(officialStatReferenceSource.files[0]!)
    ) {
      return parseSourceManifestV2({
        ...manifest,
        sources: manifest.sources.map((source) =>
          source.id === officialStatReferenceSource.id
            ? officialStatReferenceSource
            : source,
        ),
      });
    }
    assertStatReferenceSource(manifest);
    return manifest;
  }
  return parseSourceManifestV2({
    ...manifest,
    sources: [officialStatReferenceSource, ...manifest.sources],
  });
}

export function migrateOfficialSourceManifest(input: unknown): SourceManifest {
  const manifest = migrateSourceManifestV1(input, {
    datasetVersion: officialDatasetVersion,
    sourceVersion: officialDatasetVersion,
  });
  assertOfficialGameScope(manifest);
  return addStatReferenceSource(manifest);
}

export function upgradeCurrentOfficialSourceManifest(
  input: unknown,
): SourceManifest {
  const manifest = parseSourceManifestV2(input);
  assertOfficialGameScope(manifest);
  if (
    manifest.datasetVersion !== officialDatasetVersion ||
    manifest.sources
      .filter((source) => source.id !== officialStatReferenceSource.id)
      .some((source) => source.version !== officialDatasetVersion)
  ) {
    throw new Error(
      "The schema-2 official manifest has version metadata that differs from the reviewed canonical baseline; update it intentionally instead of overwriting it through migration.",
    );
  }
  return addStatReferenceSource(manifest);
}

export function parseCurrentOfficialSourceManifest(
  input: unknown,
): SourceManifest {
  const manifest = parseSourceManifestV2(input);
  assertOfficialGameScope(manifest);
  assertStatReferenceSource(manifest);
  if (
    manifest.datasetVersion !== officialDatasetVersion ||
    manifest.sources
      .filter((source) => source.id !== officialStatReferenceSource.id)
      .some((source) => source.version !== officialDatasetVersion)
  ) {
    throw new Error(
      "The schema-2 official manifest has version metadata that differs from the reviewed canonical baseline; update it intentionally instead of overwriting it through migration.",
    );
  }
  return manifest;
}
