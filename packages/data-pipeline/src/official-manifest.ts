import type {
  PresentedStatIconId,
  PresentedUiAssetId,
} from "@dredmorpedia/domain";

import type { DatabaseKind, SourceManifest } from "./manifest";
import { migrateSourceManifestV1, parseSourceManifestV2 } from "./manifest";

export const officialDatasetVersion =
  "1.1.5 public_beta (Steam build 22934623)";
export const officialStatReferenceVersion = "1.1.0";
export const officialEngineItemReferenceVersion = "1.0.0";
const previousOfficialStatReferenceVersion = "1.0.0";

const officialDatasetId = "dredmor-1.1.5-public-beta-steam-build-22934623";

const officialCorePresentedAssets = [
  { id: "gold", path: "items/cash1.png" },
  { id: "quality-empty", path: "ui/quality_star_empty.png" },
  { id: "quality-full", path: "ui/quality_star_full.png" },
  {
    id: "encrust-slot-neck",
    path: "expansion3/ui/encrusting/encrust_amulet.png",
  },
  {
    id: "encrust-slot-chest",
    path: "expansion3/ui/encrusting/encrust_armour.png",
  },
  {
    id: "encrust-slot-waist",
    path: "expansion3/ui/encrusting/encrust_belt.png",
  },
  {
    id: "encrust-slot-feet",
    path: "expansion3/ui/encrusting/encrust_boots.png",
  },
  {
    id: "encrust-slot-ranged",
    path: "expansion3/ui/encrusting/encrust_crossbow.png",
  },
  {
    id: "encrust-slot-hands",
    path: "expansion3/ui/encrusting/encrust_gauntlets.png",
  },
  {
    id: "encrust-slot-head",
    path: "expansion3/ui/encrusting/encrust_helm.png",
  },
  {
    id: "encrust-slot-legs",
    path: "expansion3/ui/encrusting/encrust_pants.png",
  },
  {
    id: "encrust-slot-ring",
    path: "expansion3/ui/encrusting/encrust_ring.png",
  },
  {
    id: "encrust-slot-shield",
    path: "expansion3/ui/encrusting/encrust_shield.png",
  },
  {
    id: "encrust-slot-weapon",
    path: "expansion3/ui/encrusting/encrust_weapon.png",
  },
] as const;

const officialDamageIconFiles = [
  ["acidic", "dmg_acidic"],
  ["aethereal", "dmg_aethereal"],
  ["asphyxiative", "dmg_aphyxiative"],
  ["blasting", "dmg_blast"],
  ["conflagratory", "dmg_conflagratory"],
  ["crushing", "dmg_crushing"],
  ["existential", "dmg_existential"],
  ["hyperborean", "dmg_hyperborean"],
  ["necromantic", "dmg_necromatic"],
  ["piercing", "dmg_piercing"],
  ["putrefying", "dmg_putrefying"],
  ["righteous", "dmg_righteous"],
  ["slashing", "dmg_slashing"],
  ["toxic", "dmg_toxic"],
  ["transmutative", "dmg_transmutative"],
  ["voltaic", "dmg_voltaic"],
] as const;

const officialPrimaryIconFiles = [
  "stat_burliness",
  "stat_sagacity",
  "stat_nimbleness",
  "stat_caddishness",
  "stat_stubborness",
  "stat_savvy",
] as const;

const officialSecondaryIconFiles = [
  "stat_life",
  "stat_mana",
  "stat_meleepower",
  "stat_magicpower",
  "stat_crit",
  "stat_haywire",
  "stat_dodge",
  "stat_block",
  "stat_counter",
  "stat_edr",
  "stat_armourabsorption",
  "stat_magicresistance",
  "stat_sneakiness",
  "stat_liferegen",
  "stat_manaregen",
  "stat_wandburn",
  "stat_traplevel",
  "stat_trapsense",
  "stat_sight",
  "stat_smithing",
  "stat_tinkerer",
  "stat_alchemy",
  "stat_reflection",
  "stat_wandburn",
] as const;

function statPresentedAsset(
  id: PresentedStatIconId,
  file: string,
): { id: PresentedUiAssetId; path: string } {
  return { id, path: `ui/icons/${file}.png` };
}

const officialStatPresentedAssets = [
  ...officialDamageIconFiles.map(([sourceKey, file]) =>
    statPresentedAsset(`stat-damage-${sourceKey}` as PresentedStatIconId, file),
  ),
  ...officialDamageIconFiles.map(([sourceKey, file]) =>
    statPresentedAsset(
      `stat-resistance-${sourceKey}` as PresentedStatIconId,
      `${file}_resist`,
    ),
  ),
  ...officialPrimaryIconFiles.map((file, sourceKey) =>
    statPresentedAsset(
      `stat-primary-${sourceKey}` as PresentedStatIconId,
      file,
    ),
  ),
  ...officialSecondaryIconFiles.map((file, sourceKey) =>
    statPresentedAsset(
      `stat-secondary-${sourceKey}` as PresentedStatIconId,
      file,
    ),
  ),
];

const officialPresentedAssets = [
  ...officialCorePresentedAssets,
  ...officialStatPresentedAssets,
];

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

const officialEngineItemReferenceSource = {
  id: "dredmorpedia-engine-item-reference",
  label: "Dredmorpedia engine item reference",
  kind: "reference" as const,
  version: officialEngineItemReferenceVersion,
  precedence: 40,
  rootBase: "repository" as const,
  root: "reference-data/dredmor-1.1.5-public-beta",
  files: [{ kind: "items" as const, path: "itemDB.xml" }],
};

const officialReferenceSources = [
  officialStatReferenceSource,
  officialEngineItemReferenceSource,
] as const;

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
  const unexpectedReference = manifest.sources.find(
    (source) =>
      source.kind === "reference" &&
      !officialReferenceSources.some(({ id }) => id === source.id),
  );
  if (unexpectedReference) {
    throw new Error(
      `Refusing to migrate unexpected reference source metadata for ${unexpectedReference.id}.`,
    );
  }
  const gameSources = manifest.sources.filter(
    (source) => source.kind !== "reference",
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

function matchesReferenceSource(
  source: SourceManifest["sources"][number] | undefined,
  expected: (typeof officialReferenceSources)[number],
): boolean {
  return (
    source !== undefined &&
    source.label === expected.label &&
    source.kind === expected.kind &&
    source.version === expected.version &&
    source.precedence === expected.precedence &&
    source.rootBase === expected.rootBase &&
    source.root === expected.root &&
    source.files.length === 1 &&
    fileKey(source.files[0]!) === fileKey(expected.files[0]!)
  );
}

function assertStatReferenceSource(manifest: SourceManifest): void {
  const source = manifest.sources.find(
    ({ id }) => id === officialStatReferenceSource.id,
  );
  if (!matchesReferenceSource(source, officialStatReferenceSource)) {
    throw new Error(
      "The canonical official manifest has missing or unexpected Dredmorpedia stat-reference metadata.",
    );
  }
}

function assertEngineItemReferenceSource(manifest: SourceManifest): void {
  const source = manifest.sources.find(
    ({ id }) => id === officialEngineItemReferenceSource.id,
  );
  if (!matchesReferenceSource(source, officialEngineItemReferenceSource)) {
    throw new Error(
      "The canonical official manifest has missing or unexpected Dredmorpedia engine-item-reference metadata.",
    );
  }
}

function presentedAssetKey(asset: { id: string; path: string }): string {
  return `${asset.id}:${asset.path}`;
}

function assertOfficialPresentedAssets(manifest: SourceManifest): void {
  const base = manifest.sources.find(({ id }) => id === "official-base");
  const expected = new Set(officialPresentedAssets.map(presentedAssetKey));
  if (
    !base ||
    base.presentedAssets?.length !== expected.size ||
    base.presentedAssets.some(
      (asset) => !expected.has(presentedAssetKey(asset)),
    )
  ) {
    throw new Error(
      "The canonical official manifest has missing or unexpected interface presentation assets.",
    );
  }
  if (
    manifest.sources.some(
      (source) =>
        source.id !== "official-base" &&
        (source.presentedAssets?.length ?? 0) > 0,
    )
  ) {
    throw new Error(
      "The canonical official manifest declares interface presentation assets outside the base-game source.",
    );
  }
}

function addOfficialPresentedAssets(manifest: SourceManifest): SourceManifest {
  const base = manifest.sources.find(({ id }) => id === "official-base");
  if (!base) {
    throw new Error(
      "The canonical official manifest is missing its base source.",
    );
  }
  const expected = new Set(officialPresentedAssets.map(presentedAssetKey));
  const existing = base.presentedAssets ?? [];
  if (
    existing.some((asset) => !expected.has(presentedAssetKey(asset))) ||
    manifest.sources.some(
      (source) =>
        source.id !== base.id && (source.presentedAssets?.length ?? 0) > 0,
    )
  ) {
    assertOfficialPresentedAssets(manifest);
  }
  if (existing.length === expected.size) {
    assertOfficialPresentedAssets(manifest);
    return manifest;
  }

  return parseSourceManifestV2({
    ...manifest,
    sources: manifest.sources.map((source) =>
      source.id === base.id
        ? { ...source, presentedAssets: officialPresentedAssets }
        : source,
    ),
  });
}

function addStatReferenceSource(manifest: SourceManifest): SourceManifest {
  const existing = manifest.sources.find(
    ({ id }) => id === officialStatReferenceSource.id,
  );
  if (existing) {
    if (
      existing.kind === officialStatReferenceSource.kind &&
      (existing.version === officialStatReferenceSource.version ||
        existing.version === previousOfficialStatReferenceVersion) &&
      existing.precedence === officialStatReferenceSource.precedence &&
      ((existing.rootBase === officialStatReferenceSource.rootBase &&
        existing.root === officialStatReferenceSource.root) ||
        (existing.rootBase === undefined &&
          existing.root ===
            "../../reference-data/dredmor-1.1.5-public-beta")) &&
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

function addEngineItemReferenceSource(
  manifest: SourceManifest,
): SourceManifest {
  const existing = manifest.sources.find(
    ({ id }) => id === officialEngineItemReferenceSource.id,
  );
  if (existing) {
    assertEngineItemReferenceSource(manifest);
    return manifest;
  }
  return parseSourceManifestV2({
    ...manifest,
    sources: [...manifest.sources, officialEngineItemReferenceSource],
  });
}

function addOfficialReferenceSources(manifest: SourceManifest): SourceManifest {
  return addEngineItemReferenceSource(addStatReferenceSource(manifest));
}

export function migrateOfficialSourceManifest(input: unknown): SourceManifest {
  const manifest = migrateSourceManifestV1(input, {
    datasetVersion: officialDatasetVersion,
    sourceVersion: officialDatasetVersion,
  });
  assertOfficialGameScope(manifest);
  return addOfficialReferenceSources(addOfficialPresentedAssets(manifest));
}

export function upgradeCurrentOfficialSourceManifest(
  input: unknown,
): SourceManifest {
  const manifest = parseSourceManifestV2(input);
  assertOfficialGameScope(manifest);
  if (
    manifest.datasetVersion !== officialDatasetVersion ||
    manifest.sources
      .filter((source) => source.kind !== "reference")
      .some((source) => source.version !== officialDatasetVersion)
  ) {
    throw new Error(
      "The schema-2 official manifest has version metadata that differs from the reviewed canonical baseline; update it intentionally instead of overwriting it through migration.",
    );
  }
  return addOfficialReferenceSources(addOfficialPresentedAssets(manifest));
}

export function parseCurrentOfficialSourceManifest(
  input: unknown,
): SourceManifest {
  const manifest = parseSourceManifestV2(input);
  assertOfficialGameScope(manifest);
  assertStatReferenceSource(manifest);
  assertEngineItemReferenceSource(manifest);
  assertOfficialPresentedAssets(manifest);
  if (
    manifest.datasetVersion !== officialDatasetVersion ||
    manifest.sources
      .filter((source) => source.kind !== "reference")
      .some((source) => source.version !== officialDatasetVersion)
  ) {
    throw new Error(
      "The schema-2 official manifest has version metadata that differs from the reviewed canonical baseline; update it intentionally instead of overwriting it through migration.",
    );
  }
  return manifest;
}
