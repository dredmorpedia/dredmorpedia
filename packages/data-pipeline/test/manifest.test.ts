import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { presentedUiAssetIds } from "@dredmorpedia/domain";

import {
  migrateSourceManifestV1,
  parseSourceManifestV2,
} from "../src/manifest";
import {
  migrateOfficialSourceManifest,
  officialDatasetVersion,
  officialEngineItemReferenceVersion,
  officialStatReferenceVersion,
  parseCurrentOfficialSourceManifest,
  upgradeCurrentOfficialSourceManifest,
} from "../src/official-manifest";

const legacyManifest = {
  schemaVersion: 1 as const,
  datasetId: "migration-fixture",
  sources: [
    {
      id: "fixture-base",
      label: "Fixture Base",
      kind: "fixture" as const,
      precedence: 0,
      root: "synthetic/external-root",
      files: [{ kind: "items" as const, path: "itemDB.xml" }],
    },
  ],
};

const commonOfficialFiles = [
  { kind: "items" as const, path: "game/itemDB.xml" },
  { kind: "recipes" as const, path: "game/craftDB.xml" },
  { kind: "skills" as const, path: "game/skillDB.xml" },
  { kind: "spells" as const, path: "game/spellDB.xml" },
  { kind: "monsters" as const, path: "game/monDB.xml" },
];

const legacyOfficialManifest = {
  schemaVersion: 1 as const,
  datasetId: "dredmor-1.1.5-public-beta-steam-build-22934623",
  sources: [
    {
      id: "official-base",
      label: "Official Base",
      kind: "base" as const,
      precedence: 0,
      root: "synthetic/base",
      files: [
        ...commonOfficialFiles,
        { kind: "templates" as const, path: "game/manTemplateDB.xml" },
      ],
    },
    ...[1, 2].map((expansion) => ({
      id: `official-expansion-${expansion}`,
      label: `Official Expansion ${expansion}`,
      kind: "expansion" as const,
      precedence: expansion * 10,
      root: `synthetic/expansion-${expansion}`,
      files: commonOfficialFiles,
    })),
    {
      id: "official-expansion-3",
      label: "Official Expansion 3",
      kind: "expansion" as const,
      precedence: 30,
      root: "synthetic/expansion-3",
      files: [
        ...commonOfficialFiles,
        { kind: "encrustments" as const, path: "game/encrustDB.xml" },
      ],
    },
  ],
};

describe("source manifest migration", () => {
  it("adds reviewed version metadata without changing source declarations", () => {
    const migrated = migrateSourceManifestV1(legacyManifest, {
      datasetVersion: "fixture-build-2",
      sourceVersion: "fixture-source-2",
    });

    expect(migrated).toEqual({
      schemaVersion: 2,
      datasetId: "migration-fixture",
      datasetVersion: "fixture-build-2",
      sources: [
        {
          id: "fixture-base",
          label: "Fixture Base",
          kind: "fixture",
          version: "fixture-source-2",
          precedence: 0,
          root: "synthetic/external-root",
          files: [{ kind: "items", path: "itemDB.xml" }],
        },
      ],
      patches: [],
    });
    expect(legacyManifest).not.toHaveProperty("datasetVersion");
    expect(legacyManifest.sources[0]).not.toHaveProperty("version");
  });

  it("rejects empty migration versions and schema-2 input", () => {
    expect(() =>
      migrateSourceManifestV1(legacyManifest, {
        datasetVersion: "",
        sourceVersion: "",
      }),
    ).toThrow(ZodError);
    expect(() =>
      migrateSourceManifestV1(
        parseSourceManifestV2({
          schemaVersion: 2,
          datasetId: "already-current",
          datasetVersion: "1.0.0",
          sources: [
            {
              id: "fixture",
              label: "Fixture",
              kind: "fixture",
              version: "1.0.0",
              precedence: 0,
              root: "fixture",
              files: [{ kind: "items", path: "itemDB.xml" }],
            },
          ],
          patches: [],
        }),
        { datasetVersion: "2.0.0", sourceVersion: "2.0.0" },
      ),
    ).toThrow(ZodError);
  });

  it("requires distinct current and previous route-registry files", () => {
    const base = {
      schemaVersion: 2,
      datasetId: "route-lineage",
      datasetVersion: "2.0.0",
      sources: [
        {
          id: "fixture",
          label: "Fixture",
          kind: "fixture",
          version: "2.0.0",
          precedence: 0,
          root: "fixture",
          files: [{ kind: "items", path: "itemDB.xml" }],
        },
      ],
      patches: [],
    };

    expect(() =>
      parseSourceManifestV2({
        ...base,
        previousRouteRegistry: "routes-1.json",
      }),
    ).toThrow(/requires a current route registry/);
    expect(() =>
      parseSourceManifestV2({
        ...base,
        routeRegistry: "routes.json",
        previousRouteRegistry: "routes.json",
      }),
    ).toThrow(/must be different files/);
  });

  it("accepts only unique project-defined presented UI asset IDs", () => {
    const base = {
      schemaVersion: 2,
      datasetId: "asset-scope",
      datasetVersion: "1.0.0",
      sources: [
        {
          id: "fixture",
          label: "Fixture",
          kind: "fixture",
          version: "1.0.0",
          precedence: 0,
          root: "fixture",
          files: [{ kind: "items", path: "itemDB.xml" }],
        },
      ],
      patches: [],
    };

    expect(() =>
      parseSourceManifestV2({
        ...base,
        sources: [
          {
            ...base.sources[0],
            presentedAssets: [{ id: "unreviewed-icon", path: "icon.png" }],
          },
        ],
      }),
    ).toThrow(ZodError);
    expect(() =>
      parseSourceManifestV2({
        ...base,
        sources: [
          {
            ...base.sources[0],
            presentedAssets: [
              { id: "gold", path: "gold.png" },
              { id: "gold", path: "duplicate.png" },
            ],
          },
        ],
      }),
    ).toThrow(/Duplicate presented asset id/);
  });

  it("migrates only the exact reviewed official source scope", () => {
    const migrated = migrateOfficialSourceManifest(legacyOfficialManifest);

    expect(migrated.datasetVersion).toBe(officialDatasetVersion);
    expect(migrated.sources).toHaveLength(6);
    expect(
      migrated.sources
        .filter((source) => source.kind !== "reference")
        .every((source) => source.version === officialDatasetVersion),
    ).toBe(true);
    expect(
      migrated.sources.find(
        (source) => source.id === "dredmorpedia-stat-reference",
      ),
    ).toMatchObject({
      id: "dredmorpedia-stat-reference",
      version: officialStatReferenceVersion,
      precedence: -10,
      rootBase: "repository",
      root: "reference-data/dredmor-1.1.5-public-beta",
      files: [{ kind: "stats", path: "statDB.xml" }],
    });
    expect(
      migrated.sources.find(
        (source) => source.id === "dredmorpedia-engine-item-reference",
      ),
    ).toMatchObject({
      id: "dredmorpedia-engine-item-reference",
      version: officialEngineItemReferenceVersion,
      precedence: 40,
      rootBase: "repository",
      root: "reference-data/dredmor-1.1.5-public-beta",
      files: [{ kind: "items", path: "itemDB.xml" }],
    });
    const presentedAssets = migrated.sources.find(
      (source) => source.id === "official-base",
    )?.presentedAssets;
    expect(presentedAssets?.map(({ id }) => id)).toEqual(presentedUiAssetIds);
    expect(presentedAssets).toEqual(
      expect.arrayContaining([
        { id: "gold", path: "items/cash1.png" },
        {
          id: "encrust-slot-weapon",
          path: "expansion3/ui/encrusting/encrust_weapon.png",
        },
        {
          id: "encrust-instability",
          path: "expansion3/ui/encrusting/encrustment_instability.png",
        },
        {
          id: "stat-damage-asphyxiative",
          path: "ui/icons/dmg_aphyxiative.png",
        },
        {
          id: "stat-resistance-necromantic",
          path: "ui/icons/dmg_necromatic_resist.png",
        },
        {
          id: "stat-primary-4",
          path: "ui/icons/stat_stubborness.png",
        },
        {
          id: "stat-secondary-15",
          path: "ui/icons/stat_wandburn.png",
        },
        {
          id: "stat-secondary-23",
          path: "ui/icons/stat_wandburn.png",
        },
      ]),
    );
    expect(parseCurrentOfficialSourceManifest(migrated)).toEqual(migrated);

    const currentWithPriorInterfaceAssets = {
      ...migrated,
      sources: migrated.sources.map((source) =>
        source.id === "official-base"
          ? { ...source, presentedAssets: source.presentedAssets?.slice(0, 3) }
          : source,
      ),
    };
    expect(
      upgradeCurrentOfficialSourceManifest(currentWithPriorInterfaceAssets),
    ).toEqual(migrated);

    const currentWithPriorStatReference = {
      ...migrated,
      sources: migrated.sources.map((source) =>
        source.id === "dredmorpedia-stat-reference"
          ? { ...source, version: "1.0.0" }
          : source,
      ),
    };
    expect(
      upgradeCurrentOfficialSourceManifest(currentWithPriorStatReference),
    ).toEqual(migrated);

    const currentWithUnexpectedInterfaceAsset = {
      ...currentWithPriorInterfaceAssets,
      sources: currentWithPriorInterfaceAssets.sources.map((source) =>
        source.id === "official-base"
          ? {
              ...source,
              presentedAssets: [
                ...(source.presentedAssets ?? []),
                {
                  id: "encrust-slot-neck",
                  path: "ui/unexpected.png",
                },
              ],
            }
          : source,
      ),
    };
    expect(() =>
      upgradeCurrentOfficialSourceManifest(currentWithUnexpectedInterfaceAsset),
    ).toThrow(/missing or unexpected interface presentation assets/);

    const currentWithoutReference = {
      ...migrated,
      sources: migrated.sources.filter((source) => source.kind !== "reference"),
    };
    expect(
      upgradeCurrentOfficialSourceManifest(currentWithoutReference),
    ).toEqual(migrated);
    expect(() =>
      parseCurrentOfficialSourceManifest(currentWithoutReference),
    ).toThrow(/stat-reference metadata/);

    const currentWithoutEngineItemReference = {
      ...migrated,
      sources: migrated.sources.filter(
        (source) => source.id !== "dredmorpedia-engine-item-reference",
      ),
    };
    expect(
      upgradeCurrentOfficialSourceManifest(currentWithoutEngineItemReference),
    ).toEqual(migrated);
    expect(() =>
      parseCurrentOfficialSourceManifest(currentWithoutEngineItemReference),
    ).toThrow(/engine-item-reference metadata/);

    expect(() =>
      migrateOfficialSourceManifest({
        ...legacyOfficialManifest,
        sources: legacyOfficialManifest.sources.slice(0, 3),
      }),
    ).toThrow(/3 game sources instead of 4/);
    expect(() =>
      parseCurrentOfficialSourceManifest({
        ...migrated,
        datasetVersion: "different-build",
      }),
    ).toThrow(/differs from the reviewed canonical baseline/);
  });
});
