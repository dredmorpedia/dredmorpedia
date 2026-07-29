import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import {
  importDataset,
  serializeOutputs,
  sha256,
  writeOutputs,
} from "../src/index";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const manifestPath = path.join(
  repositoryRoot,
  "fixtures/synthetic/manifest.json",
);
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("synthetic dataset import", () => {
  it("supports an absolute read-only source root without exposing local paths", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-external-source-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "installed-game");
    mkdirSync(sourceRoot);
    writeFileSync(
      path.join(sourceRoot, "itemDB.xml"),
      '<?xml version="1.0"?><items><item name="External Fixture Item" type="material" /></items>',
    );
    const externalManifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      externalManifestPath,
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "external-source-test",
        sources: [
          {
            id: "external-base",
            label: "External Base",
            kind: "base",
            precedence: 0,
            root: sourceRoot,
            files: [{ kind: "items", path: "itemDB.xml" }],
          },
        ],
      }),
    );

    const result = importDataset({
      manifestPath: externalManifestPath,
      repositoryRoot,
    });
    const serialized = serializeOutputs(result);

    expect(result.artifact.entities.items[0]?.provenance.file).toBe(
      "sources/external-base/itemDB.xml",
    );
    expect(result.artifact.datasetVersion).toBe("unversioned");
    expect(result.artifact.sources[0]?.version).toBe("unversioned");
    expect(result.sourceManifest).toBe("manifests/manifest.json");
    expect(serialized.artifact).not.toContain(temporaryRoot);
    expect(serialized.search).not.toContain(temporaryRoot);
    expect(serialized.diagnostics).not.toContain(temporaryRoot);
    expect(serialized.manifest).not.toContain(temporaryRoot);
  });

  it("reports diagnostics at the declaring record and direct child", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-diagnostic-locations-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    mkdirSync(sourceRoot);
    writeFileSync(
      path.join(sourceRoot, "itemDB.xml"),
      [
        "<items>",
        '  <item name="First Item" type="material">',
        "    <mystery />",
        "  </item>",
        '  <item name="Second Item" type="material">',
        "    <wrapper>",
        "      <mystery />",
        "    </wrapper>",
        "    <mystery />",
        "  </item>",
        '  <item type="material" />',
        "</items>",
      ].join("\r\n"),
    );
    const locationManifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      locationManifestPath,
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "diagnostic-location-test",
        sources: [
          {
            id: "fixture",
            label: "Fixture",
            kind: "fixture",
            precedence: 0,
            root: "source",
            files: [{ kind: "items", path: "itemDB.xml" }],
          },
        ],
      }),
    );

    const result = importDataset({
      manifestPath: locationManifestPath,
      repositoryRoot: temporaryRoot,
    });

    expect(
      result.artifact.entities.items.map((item) => ({
        id: item.id,
        line: item.provenance.line,
        column: item.provenance.column,
      })),
    ).toEqual([
      { id: "item:first item", line: 2, column: 3 },
      { id: "item:second item", line: 5, column: 3 },
    ]);
    expect(
      result.diagnostics
        .filter(
          (diagnostic) =>
            diagnostic.code === "unknown_element" &&
            diagnostic.details?.element === "mystery",
        )
        .map((diagnostic) => ({
          entityId: diagnostic.entityId,
          line: diagnostic.source?.line,
          column: diagnostic.source?.column,
        })),
    ).toEqual([
      { entityId: "item:first item", line: 3, column: 5 },
      { entityId: "item:second item", line: 9, column: 5 },
    ]);
    expect(
      result.diagnostics.find(
        (diagnostic) => diagnostic.code === "missing_entity_name",
      )?.source,
    ).toMatchObject({ line: 11, column: 3 });
  });

  it("rejects a patch with stale dataset scope without partially changing data", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-stale-patch-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    const patchRoot = path.join(temporaryRoot, "patches");
    mkdirSync(sourceRoot);
    mkdirSync(patchRoot);
    writeFileSync(
      path.join(sourceRoot, "itemDB.xml"),
      '<?xml version="1.0"?><items><item name="Patch Guard Item" type="material"><price amount="42" /></item></items>',
    );
    writeFileSync(
      path.join(patchRoot, "stale.json"),
      JSON.stringify({
        schemaVersion: 1,
        id: "stale-dataset-scope",
        reason: "Exercise the dataset-version guard.",
        appliesTo: {
          datasetId: "patch-guard-test",
          datasetVersion: "0.9.0",
          sourceId: "patch-guard-source",
          sourceVersion: "1.0.0",
        },
        operations: [
          {
            entityKind: "item",
            canonicalKey: "patch guard item",
            field: "price",
            expectedValue: 42,
            value: 99,
          },
        ],
      }),
    );
    const guardedManifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      guardedManifestPath,
      JSON.stringify({
        schemaVersion: 2,
        datasetId: "patch-guard-test",
        datasetVersion: "1.0.0",
        sources: [
          {
            id: "patch-guard-source",
            label: "Patch Guard Source",
            kind: "fixture",
            version: "1.0.0",
            precedence: 0,
            root: "source",
            files: [{ kind: "items", path: "itemDB.xml" }],
          },
        ],
        patches: [{ order: 0, path: "patches/stale.json" }],
      }),
    );

    const result = importDataset({
      manifestPath: guardedManifestPath,
      repositoryRoot: temporaryRoot,
    });

    expect(result.artifact.entities.items[0]).toMatchObject({
      price: 42,
      appliedPatches: [],
    });
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        severity: "error",
        code: "patch_scope_mismatch",
      }),
    ]);

    writeFileSync(
      path.join(patchRoot, "duplicate.json"),
      readFileSync(path.join(patchRoot, "stale.json")),
    );
    writeFileSync(
      guardedManifestPath,
      JSON.stringify({
        schemaVersion: 2,
        datasetId: "patch-guard-test",
        datasetVersion: "1.0.0",
        sources: [
          {
            id: "patch-guard-source",
            label: "Patch Guard Source",
            kind: "fixture",
            version: "1.0.0",
            precedence: 0,
            root: "source",
            files: [{ kind: "items", path: "itemDB.xml" }],
          },
        ],
        patches: [
          { order: 0, path: "patches/stale.json" },
          { order: 1, path: "patches/duplicate.json" },
        ],
      }),
    );
    expect(() =>
      importDataset({
        manifestPath: guardedManifestPath,
        repositoryRoot: temporaryRoot,
      }),
    ).toThrow(/Duplicate patch id/);
  });

  it("rejects a schema-invalid patch value without publishing invalid data", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-invalid-patch-value-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    const patchRoot = path.join(temporaryRoot, "patches");
    mkdirSync(sourceRoot);
    mkdirSync(patchRoot);
    writeFileSync(
      path.join(sourceRoot, "itemDB.xml"),
      '<?xml version="1.0"?><items><item name="Patch Value Guard" type="material"><price amount="42" /></item></items>',
    );
    writeFileSync(
      path.join(patchRoot, "invalid-price.json"),
      JSON.stringify({
        schemaVersion: 1,
        id: "invalid-price",
        reason:
          "A negative item price violates the normalized artifact contract.",
        appliesTo: {
          datasetId: "patch-value-guard-test",
          datasetVersion: "1.0.0",
          sourceId: "patch-value-guard-source",
          sourceVersion: "1.0.0",
        },
        operations: [
          {
            entityKind: "item",
            canonicalKey: "patch value guard",
            field: "price",
            expectedValue: 42,
            value: -1,
          },
        ],
      }),
    );
    const guardedManifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      guardedManifestPath,
      JSON.stringify({
        schemaVersion: 2,
        datasetId: "patch-value-guard-test",
        datasetVersion: "1.0.0",
        sources: [
          {
            id: "patch-value-guard-source",
            label: "Patch Value Guard Source",
            kind: "fixture",
            version: "1.0.0",
            precedence: 0,
            root: "source",
            files: [{ kind: "items", path: "itemDB.xml" }],
          },
        ],
        patches: [{ order: 0, path: "patches/invalid-price.json" }],
      }),
    );

    const result = importDataset({
      manifestPath: guardedManifestPath,
      repositoryRoot: temporaryRoot,
    });

    expect(result.artifact.entities.items[0]).toMatchObject({
      price: 42,
      appliedPatches: [],
    });
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        severity: "error",
        code: "patch_value_invalid",
        entityId: "item:patch value guard",
      }),
    ]);
  });

  it("rejects a stale route registry atomically", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-stale-routes-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    mkdirSync(sourceRoot);
    writeFileSync(
      path.join(sourceRoot, "itemDB.xml"),
      '<?xml version="1.0"?><items><item id="route-guard" name="Route Guard Item" type="material" /></items>',
    );
    writeFileSync(
      path.join(temporaryRoot, "routes.json"),
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "route-guard-test",
        datasetVersion: "1.0.0",
        entries: [
          {
            entityKind: "item",
            target: {
              type: "source-id",
              sourceId: "route-guard-source",
              originalId: "route-guard",
            },
            canonicalSlug: "pinned-route",
            aliases: [],
          },
          {
            entityKind: "item",
            target: {
              type: "source-id",
              sourceId: "route-guard-source",
              originalId: "missing-item",
            },
            canonicalSlug: "missing-route",
            aliases: [],
          },
        ],
      }),
    );
    const guardedManifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      guardedManifestPath,
      JSON.stringify({
        schemaVersion: 2,
        datasetId: "route-guard-test",
        datasetVersion: "1.0.0",
        routeRegistry: "routes.json",
        sources: [
          {
            id: "route-guard-source",
            label: "Route Guard Source",
            kind: "fixture",
            version: "1.0.0",
            precedence: 0,
            root: "source",
            files: [{ kind: "items", path: "itemDB.xml" }],
          },
        ],
        patches: [],
      }),
    );

    const result = importDataset({
      manifestPath: guardedManifestPath,
      repositoryRoot: temporaryRoot,
    });

    expect(result.artifact.entities.items[0]).toMatchObject({
      slug: "route-guard-item",
      slugAliases: ["route-guard"],
    });
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        severity: "error",
        code: "route_registry_target_missing",
      }),
    ]);
  });

  it("normalizes item quality by source shape and rejects invalid values", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-item-quality-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    mkdirSync(sourceRoot);
    writeFileSync(
      path.join(sourceRoot, "itemDB.xml"),
      `<?xml version="1.0"?>
<items>
  <item name="Quality Weapon" level="3"><weapon /></item>
  <item name="Quality Armour"><armour level="4" /></item>
  <item name="Quality Trap"><trap level="5" /></item>
  <item name="Progression Potion" level="7"><potion spell="Test" /></item>
  <item name="Negative Quality"><armour level="-1" /></item>
  <item name="Fractional Quality"><trap level="2.5" /></item>
</items>`,
    );
    const qualityManifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      qualityManifestPath,
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "item-quality-test",
        sources: [
          {
            id: "quality-source",
            label: "Quality Source",
            kind: "fixture",
            precedence: 0,
            root: "source",
            files: [{ kind: "items", path: "itemDB.xml" }],
          },
        ],
      }),
    );

    const result = importDataset({
      manifestPath: qualityManifestPath,
      repositoryRoot: temporaryRoot,
    });
    const qualityByName = new Map(
      result.artifact.entities.items.map((item) => [item.name, item.quality]),
    );

    expect(qualityByName).toEqual(
      new Map([
        ["Fractional Quality", 0],
        ["Negative Quality", 0],
        ["Progression Potion", 0],
        ["Quality Armour", 4],
        ["Quality Trap", 5],
        ["Quality Weapon", 3],
      ]),
    );
    expect(
      result.diagnostics.filter(
        (diagnostic) => diagnostic.code === "invalid_number",
      ),
    ).toHaveLength(2);
  });

  it("normalizes loss-aware armour declarations and diagnoses malformed content", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-item-armour-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    mkdirSync(sourceRoot);
    writeFileSync(
      path.join(sourceRoot, "itemDB.xml"),
      `<?xml version="1.0"?>
<items>
  <item name="Complete Armour"><armour type="Chest" level="4" randoms="1" /></item>
  <item name="Missing Armour Fields"><armour /></item>
  <item name="Invalid Armour Values"><armour type=" ring " level="-1" randoms="half" /></item>
  <item name="Repeated Armour"><armour type="head" level="2" /><armour type="sleeve" level="3" randoms="0" /></item>
  <item name="Extended Armour"><armour type="shield" level="3" future="kept"><future /></armour></item>
  <item name="Text Armour"><armour>unexpected</armour></item>
</items>`,
    );
    const armourManifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      armourManifestPath,
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "item-armour-test",
        sources: [
          {
            id: "armour-source",
            label: "Armour Source",
            kind: "fixture",
            precedence: 0,
            root: "source",
            files: [{ kind: "items", path: "itemDB.xml" }],
          },
        ],
      }),
    );

    const result = importDataset({
      manifestPath: armourManifestPath,
      repositoryRoot: temporaryRoot,
    });
    const itemByName = new Map(
      result.artifact.entities.items.map((item) => [item.name, item]),
    );

    expect(itemByName.get("Complete Armour")).toMatchObject({
      quality: 4,
      armourDeclarations: [{ slot: "chest", level: 4, randoms: 1 }],
    });
    expect(itemByName.get("Missing Armour Fields")).toMatchObject({
      quality: 0,
      armourDeclarations: [{ slot: null, level: null, randoms: null }],
    });
    expect(itemByName.get("Invalid Armour Values")).toMatchObject({
      quality: 0,
      armourDeclarations: [{ slot: "ring", level: null, randoms: null }],
    });
    expect(itemByName.get("Repeated Armour")).toMatchObject({
      quality: 2,
      armourDeclarations: [
        { slot: "head", level: 2, randoms: null },
        { slot: "sleeve", level: 3, randoms: 0 },
      ],
    });
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing_item_armour_slot",
          entityId: "item:missing armour fields",
        }),
        expect.objectContaining({
          code: "missing_item_armour_level",
          entityId: "item:missing armour fields",
        }),
        expect.objectContaining({
          code: "unknown_attribute",
          entityId: "item:extended armour",
          details: {
            element: "armour",
            attribute: "future",
            value: "kept",
          },
        }),
        expect.objectContaining({
          code: "unknown_element",
          entityId: "item:extended armour",
          details: { element: "future" },
        }),
        expect.objectContaining({
          code: "unknown_element",
          entityId: "item:text armour",
          details: { element: "armour" },
        }),
      ]),
    );
    expect(
      result.diagnostics.filter(
        (diagnostic) =>
          diagnostic.code === "invalid_number" &&
          diagnostic.entityId === "item:invalid armour values",
      ),
    ).toHaveLength(2);
    expect(
      result.diagnostics.some(
        (diagnostic) =>
          diagnostic.code === "partially_supported_element" &&
          diagnostic.details?.element === "armour",
      ),
    ).toBe(false);
  });

  it("normalizes loss-aware weapon declarations and diagnoses malformed content", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-item-weapons-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    mkdirSync(sourceRoot);
    writeFileSync(
      path.join(sourceRoot, "itemDB.xml"),
      `<?xml version="1.0"?>
<items>
  <item name="Complete Weapon"><weapon slashing="2" thrown="assets/projectile.spr" canTargetFloor="1" /></item>
  <item name="Empty Weapon"><weapon /></item>
  <item name="Lowercase Weapon"><weapon cantargetfloor="true" /></item>
  <item name="False Weapon"><weapon canTargetFloor="0" /></item>
  <item name="Invalid Weapon"><weapon canTargetFloor="sometimes" /></item>
  <item name="Unsafe Weapon"><weapon thrown="../outside.spr" /></item>
  <item name="Repeated Weapon"><weapon /><weapon thrown="second.spr" /></item>
  <item name="Extended Weapon"><weapon crushingF="0.5" primaryScale="0" future="kept"><future /></weapon></item>
  <item name="Text Weapon"><weapon>unexpected</weapon></item>
</items>`,
    );
    const weaponManifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      weaponManifestPath,
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "item-weapon-test",
        sources: [
          {
            id: "weapon-source",
            label: "Weapon Source",
            kind: "fixture",
            precedence: 0,
            root: "source",
            files: [{ kind: "items", path: "itemDB.xml" }],
          },
        ],
      }),
    );

    const result = importDataset({
      manifestPath: weaponManifestPath,
      repositoryRoot: temporaryRoot,
    });
    const itemByName = new Map(
      result.artifact.entities.items.map((item) => [item.name, item]),
    );

    expect(itemByName.get("Complete Weapon")).toMatchObject({
      weaponDeclarations: [
        {
          canTargetFloor: true,
          thrownPath: "assets/projectile.spr",
        },
      ],
      modifiers: [{ kind: "damage", sourceKey: "slashing", amount: 2 }],
    });
    expect(itemByName.get("Empty Weapon")?.weaponDeclarations).toEqual([
      { canTargetFloor: null, thrownPath: null },
    ]);
    expect(itemByName.get("Lowercase Weapon")?.weaponDeclarations).toEqual([
      { canTargetFloor: true, thrownPath: null },
    ]);
    expect(itemByName.get("False Weapon")?.weaponDeclarations).toEqual([
      { canTargetFloor: false, thrownPath: null },
    ]);
    expect(itemByName.get("Invalid Weapon")?.weaponDeclarations).toEqual([
      { canTargetFloor: null, thrownPath: null },
    ]);
    expect(itemByName.get("Unsafe Weapon")?.weaponDeclarations).toEqual([
      { canTargetFloor: null, thrownPath: null },
    ]);
    expect(itemByName.get("Repeated Weapon")?.weaponDeclarations).toEqual([
      { canTargetFloor: null, thrownPath: null },
      { canTargetFloor: null, thrownPath: "second.spr" },
    ]);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid_boolean",
          entityId: "item:invalid weapon",
        }),
        expect.objectContaining({
          code: "unsafe_asset_path",
          entityId: "item:unsafe weapon",
        }),
        expect.objectContaining({
          code: "unknown_attribute",
          entityId: "item:extended weapon",
          details: {
            element: "weapon",
            attribute: "crushingF",
            value: "0.5",
          },
        }),
        expect.objectContaining({
          code: "unknown_attribute",
          entityId: "item:extended weapon",
          details: {
            element: "weapon",
            attribute: "primaryScale",
            value: "0",
          },
        }),
        expect.objectContaining({
          code: "unknown_element",
          entityId: "item:extended weapon",
          details: { element: "future" },
        }),
        expect.objectContaining({
          code: "unknown_element",
          entityId: "item:text weapon",
          details: { element: "weapon" },
        }),
      ]),
    );
    expect(
      result.diagnostics.some(
        (diagnostic) =>
          diagnostic.code === "partially_supported_element" &&
          diagnostic.details?.element === "weapon",
      ),
    ).toBe(false);
  });

  it("normalizes and links loss-aware macguffin declarations", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-item-macguffins-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    mkdirSync(sourceRoot);
    writeFileSync(
      path.join(sourceRoot, "itemDB.xml"),
      `<?xml version="1.0"?>
<items>
  <item name="Classified Macguffin"><macguffin spell="Known Macguffin Spell" item_class_name="Synthetic Curiosity" /></item>
  <item name="Reusable Macguffin"><macguffin spell="Known Macguffin Spell" consumable="0" /></item>
  <item name="Consumable Macguffin"><macguffin spell="Known Macguffin Spell" consumable="true" /></item>
  <item name="Missing Spell Macguffin"><macguffin item_class_name="Incomplete Curiosity" /></item>
  <item name="Unresolved Macguffin"><macguffin spell="Missing Macguffin Spell" /></item>
  <item name="Invalid Macguffin"><macguffin spell="Known Macguffin Spell" item_class_name="" consumable="sometimes" /></item>
  <item name="Repeated Macguffin"><macguffin spell="Known Macguffin Spell" /><macguffin spell="Missing Macguffin Spell" consumable="1" /></item>
  <item name="Extended Macguffin"><macguffin spell="Known Macguffin Spell" future="kept"><future /></macguffin></item>
  <item name="Text Macguffin"><macguffin>unexpected</macguffin></item>
</items>`,
    );
    writeFileSync(
      path.join(sourceRoot, "spellDB.xml"),
      `<?xml version="1.0"?>
<spells>
  <spell name="Known Macguffin Spell" type="self" />
</spells>`,
    );
    const macguffinManifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      macguffinManifestPath,
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "item-macguffin-test",
        sources: [
          {
            id: "macguffin-source",
            label: "Macguffin Source",
            kind: "fixture",
            precedence: 0,
            root: "source",
            files: [
              { kind: "items", path: "itemDB.xml" },
              { kind: "spells", path: "spellDB.xml" },
            ],
          },
        ],
      }),
    );

    const result = importDataset({
      manifestPath: macguffinManifestPath,
      repositoryRoot: temporaryRoot,
    });
    const itemByName = new Map(
      result.artifact.entities.items.map((item) => [item.name, item]),
    );

    expect(
      itemByName.get("Classified Macguffin")?.macguffinDeclarations,
    ).toEqual([
      {
        spellKey: "known macguffin spell",
        spellName: "Known Macguffin Spell",
        spellId: "spell:known macguffin spell",
        itemClassName: "Synthetic Curiosity",
        consumable: null,
      },
    ]);
    expect(itemByName.get("Reusable Macguffin")?.macguffinDeclarations).toEqual(
      [expect.objectContaining({ consumable: false })],
    );
    expect(
      itemByName.get("Consumable Macguffin")?.macguffinDeclarations,
    ).toEqual([expect.objectContaining({ consumable: true })]);
    expect(
      itemByName.get("Missing Spell Macguffin")?.macguffinDeclarations,
    ).toEqual([
      {
        spellKey: null,
        spellName: null,
        itemClassName: "Incomplete Curiosity",
        consumable: null,
      },
    ]);
    expect(
      itemByName.get("Unresolved Macguffin")?.macguffinDeclarations,
    ).toEqual([
      {
        spellKey: "missing macguffin spell",
        spellName: "Missing Macguffin Spell",
        itemClassName: null,
        consumable: null,
      },
    ]);
    expect(itemByName.get("Invalid Macguffin")?.macguffinDeclarations).toEqual([
      expect.objectContaining({
        itemClassName: null,
        consumable: null,
      }),
    ]);
    expect(
      itemByName.get("Repeated Macguffin")?.macguffinDeclarations,
    ).toHaveLength(2);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing_item_macguffin_spell",
          entityId: "item:missing spell macguffin",
        }),
        expect.objectContaining({
          code: "invalid_item_macguffin_class_name",
          entityId: "item:invalid macguffin",
        }),
        expect.objectContaining({
          code: "invalid_boolean",
          entityId: "item:invalid macguffin",
        }),
        expect.objectContaining({
          code: "dangling_reference",
          entityId: "item:unresolved macguffin",
          details: {
            targetKind: "spell",
            reference: "Missing Macguffin Spell",
          },
        }),
        expect.objectContaining({
          code: "unknown_attribute",
          entityId: "item:extended macguffin",
          details: {
            element: "macguffin",
            attribute: "future",
            value: "kept",
          },
        }),
        expect.objectContaining({
          code: "unknown_element",
          entityId: "item:extended macguffin",
          details: { element: "future" },
        }),
        expect.objectContaining({
          code: "unknown_element",
          entityId: "item:text macguffin",
          details: { element: "macguffin" },
        }),
      ]),
    );
    expect(
      result.diagnostics.some(
        (diagnostic) =>
          diagnostic.code === "unknown_element" &&
          diagnostic.entityId === "item:classified macguffin" &&
          diagnostic.details?.element === "macguffin",
      ),
    ).toBe(false);
  });

  it("normalizes complete toolkit declarations and diagnoses malformed interface metadata", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-item-toolkits-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    mkdirSync(sourceRoot);
    writeFileSync(
      path.join(sourceRoot, "itemDB.xml"),
      `<?xml version="1.0"?>
<items>
  <item name="Complete Toolkit" alchemical="1">
    <toolkit tag="smithing" numslots="2" sound="hammer"
      missing="ui/missing.png" present="ui/present.png" active="ui/active.png"
      slot1_x1="1" slot1_y1="2" slot1_x2="3" slot1_y2="4"
      slot2_x1="5" slot2_y1="6" slot2_x2="7" slot2_y2="8"
      output_x1="9" output_y1="10" output_x2="11" output_y2="12"
      craftbutton="ui/craft" craftbuttonposx="13" craftbuttonposy="14"
      recipebutton="ui/recipe" recipebuttonposx="15" recipebuttonposy="16"
      autofillbutton="ui/autofill" autofillbuttonposx="17" autofillbuttonposy="18"
      closex="19" closey="20" bg="ui/background.png" />
  </item>
  <item name="Empty Toolkit"><toolkit /></item>
  <item name="Invalid Toolkit"><toolkit tag="" numslots="-1" slot1_x1="left" bg="../outside.png" /></item>
  <item name="Partial Toolkit"><toolkit tag="smithing" numslots="1" missing="ui/missing.png" slot1_x1="1" craftbutton="ui/craft" closex="2" /></item>
  <item name="Overflow Toolkit"><toolkit tag="smithing" numslots="1" slot2_x1="1" slot2_y1="2" slot2_x2="3" slot2_y2="4" /></item>
  <item name="Repeated Toolkit"><toolkit tag="smithing" numslots="1" /><toolkit tag="alchemy" numslots="4" /></item>
  <item name="Extended Toolkit"><toolkit tag="smithing" numslots="1" future="kept"><future /></toolkit></item>
  <item name="Text Toolkit"><toolkit>unexpected</toolkit></item>
</items>`,
    );
    const toolkitManifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      toolkitManifestPath,
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "item-toolkit-test",
        sources: [
          {
            id: "toolkit-source",
            label: "Toolkit Source",
            kind: "fixture",
            precedence: 0,
            root: "source",
            files: [{ kind: "items", path: "itemDB.xml" }],
          },
        ],
      }),
    );

    const result = importDataset({
      manifestPath: toolkitManifestPath,
      repositoryRoot: temporaryRoot,
    });
    const itemByName = new Map(
      result.artifact.entities.items.map((item) => [item.name, item]),
    );

    expect(itemByName.get("Complete Toolkit")?.toolkitDeclarations).toEqual([
      {
        tag: "smithing",
        numSlots: 2,
        soundCue: "hammer",
        missingPath: "ui/missing.png",
        presentPath: "ui/present.png",
        activePath: "ui/active.png",
        slotBounds: [
          { slot: 1, x1: 1, y1: 2, x2: 3, y2: 4 },
          { slot: 2, x1: 5, y1: 6, x2: 7, y2: 8 },
        ],
        outputBounds: { x1: 9, y1: 10, x2: 11, y2: 12 },
        craftButton: {
          path: "ui/craft",
          positionX: 13,
          positionY: 14,
        },
        recipeButton: {
          path: "ui/recipe",
          positionX: 15,
          positionY: 16,
        },
        autofillButton: {
          path: "ui/autofill",
          positionX: 17,
          positionY: 18,
        },
        closePosition: { x: 19, y: 20 },
        backgroundPath: "ui/background.png",
      },
    ]);
    expect(itemByName.get("Empty Toolkit")?.toolkitDeclarations).toEqual([
      expect.objectContaining({ tag: null, numSlots: null }),
    ]);
    expect(itemByName.get("Invalid Toolkit")?.toolkitDeclarations).toEqual([
      expect.objectContaining({
        tag: null,
        numSlots: null,
        backgroundPath: null,
        slotBounds: [],
      }),
    ]);
    expect(
      itemByName.get("Repeated Toolkit")?.toolkitDeclarations,
    ).toHaveLength(2);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid_item_toolkit_text",
          entityId: "item:empty toolkit",
        }),
        expect.objectContaining({
          code: "missing_item_toolkit_slot_count",
          entityId: "item:empty toolkit",
        }),
        expect.objectContaining({
          code: "invalid_number",
          entityId: "item:invalid toolkit",
        }),
        expect.objectContaining({
          code: "unsafe_asset_path",
          entityId: "item:invalid toolkit",
        }),
        expect.objectContaining({
          code: "incomplete_item_toolkit_state_references",
          entityId: "item:partial toolkit",
        }),
        expect.objectContaining({
          code: "incomplete_item_toolkit_bounds",
          entityId: "item:partial toolkit",
        }),
        expect.objectContaining({
          code: "incomplete_item_toolkit_control",
          entityId: "item:partial toolkit",
        }),
        expect.objectContaining({
          code: "incomplete_item_toolkit_close_position",
          entityId: "item:partial toolkit",
        }),
        expect.objectContaining({
          code: "invalid_item_toolkit_slot_layout",
          entityId: "item:overflow toolkit",
        }),
        expect.objectContaining({
          code: "unknown_attribute",
          entityId: "item:extended toolkit",
          details: {
            element: "toolkit",
            attribute: "future",
            value: "kept",
          },
        }),
        expect.objectContaining({
          code: "unknown_element",
          entityId: "item:extended toolkit",
          details: { element: "future" },
        }),
        expect.objectContaining({
          code: "unknown_element",
          entityId: "item:text toolkit",
          details: { element: "toolkit" },
        }),
      ]),
    );
    expect(
      result.diagnostics.some(
        (diagnostic) =>
          diagnostic.code === "unknown_element" &&
          diagnostic.entityId === "item:complete toolkit" &&
          diagnostic.details?.element === "toolkit",
      ),
    ).toBe(false);
  });

  it("normalizes loss-aware item artifact declarations", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-item-artifacts-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    mkdirSync(sourceRoot);
    writeFileSync(
      path.join(sourceRoot, "itemDB.xml"),
      `<?xml version="1.0"?>
<items>
  <item name="Complete Artifact"><artifact quality="9" /></item>
  <item name="Missing Artifact Quality"><artifact /></item>
  <item name="Invalid Artifact Quality"><artifact quality="-1" /></item>
  <item name="Repeated Artifacts"><artifact quality="2" /><artifact quality="3" /></item>
  <item name="Unknown Artifact Content"><artifact quality="4" future="diagnosed"><future /></artifact></item>
  <item name="Ordinary Item" />
</items>`,
    );
    const artifactManifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      artifactManifestPath,
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "item-artifact-test",
        sources: [
          {
            id: "artifact-source",
            label: "Artifact Source",
            kind: "fixture",
            precedence: 0,
            root: "source",
            files: [{ kind: "items", path: "itemDB.xml" }],
          },
        ],
      }),
    );

    const result = importDataset({
      manifestPath: artifactManifestPath,
      repositoryRoot: temporaryRoot,
    });
    const artifactsByName = new Map(
      result.artifact.entities.items.map((item) => [item.name, item.artifacts]),
    );

    expect(artifactsByName).toEqual(
      new Map([
        ["Complete Artifact", [{ quality: 9 }]],
        ["Invalid Artifact Quality", [{ quality: null }]],
        ["Missing Artifact Quality", [{ quality: null }]],
        ["Ordinary Item", []],
        ["Repeated Artifacts", [{ quality: 2 }, { quality: 3 }]],
        ["Unknown Artifact Content", [{ quality: 4 }]],
      ]),
    );
    expect(
      result.diagnostics.filter(
        (diagnostic) => diagnostic.code === "invalid_number",
      ),
    ).toHaveLength(1);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "unknown_attribute",
          details: expect.objectContaining({
            element: "artifact",
            attribute: "future",
          }),
        }),
        expect.objectContaining({
          code: "unknown_element",
          details: { element: "future" },
        }),
      ]),
    );
    expect(
      result.diagnostics.find(
        (diagnostic) =>
          diagnostic.code === "unknown_element" &&
          diagnostic.details?.element === "artifact",
      ),
    ).toBeUndefined();
  });

  it("fully normalizes direct item spell triggers and casing aliases", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-item-direct-triggers-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    mkdirSync(sourceRoot);
    writeFileSync(
      path.join(sourceRoot, "itemDB.xml"),
      `<?xml version="1.0"?>
<items>
  <item name="Direct Trigger Item">
    <targetHitEffectBuff name="Upper Target" percentage="25" taxa="Animal" />
    <targethiteffectbuff name="Lower Target" percent="30" />
    <playerHitEffectBuff name="Upper Self" percentage="35" />
    <playerhiteffectbuff name="Lower Self" percentage="40" />
    <targetKillBuff name="Kill Target" percentage="45" after="1" />
    <crossbowShotBuff name="Bolt Target" percentage="50" />
    <thrownBuff name="Thrown Target" percentage="55" />
    <targetHitEffectBuff name="Invalid Resistance" percentage="60" resistable="maybe" future="diagnosed"><future /></targetHitEffectBuff>
  </item>
</items>`,
    );
    const triggerManifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      triggerManifestPath,
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "item-direct-trigger-test",
        sources: [
          {
            id: "trigger-source",
            label: "Trigger Source",
            kind: "fixture",
            precedence: 0,
            root: "source",
            files: [{ kind: "items", path: "itemDB.xml" }],
          },
        ],
      }),
    );

    const result = importDataset({
      manifestPath: triggerManifestPath,
      repositoryRoot: temporaryRoot,
    });
    const triggers = result.artifact.entities.items[0]?.triggers ?? [];
    const triggerBySpell = new Map(
      triggers.map((trigger) => [trigger.spellName, trigger]),
    );

    expect(triggers).toHaveLength(8);
    expect(triggerBySpell.get("Upper Target")).toMatchObject({
      kind: "melee-target",
      chance: 25,
      monsterTaxonomy: "Animal",
      sourceFlags: [],
    });
    expect(triggerBySpell.get("Lower Target")).toMatchObject({
      kind: "melee-target",
      chance: 30,
    });
    expect(triggerBySpell.get("Upper Self")?.kind).toBe("melee-self");
    expect(triggerBySpell.get("Lower Self")?.kind).toBe("melee-self");
    expect(triggerBySpell.get("Kill Target")).toMatchObject({
      kind: "kill-target",
      sourceFlags: [{ sourceKey: "after", value: "1" }],
    });
    expect(triggerBySpell.get("Invalid Resistance")?.unresistable).toBe(false);
    expect(
      result.diagnostics.filter(
        (diagnostic) => diagnostic.code === "invalid_boolean",
      ),
    ).toHaveLength(1);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "unknown_attribute",
          details: expect.objectContaining({
            element: "targetHitEffectBuff",
            attribute: "future",
          }),
        }),
        expect.objectContaining({
          code: "unknown_element",
          details: { element: "future" },
        }),
      ]),
    );
    const directElementNames = new Set([
      "crossbowShotBuff",
      "playerHitEffectBuff",
      "playerhiteffectbuff",
      "targetHitEffectBuff",
      "targethiteffectbuff",
      "targetKillBuff",
      "thrownBuff",
    ]);
    expect(
      result.diagnostics.filter(
        (diagnostic) =>
          (diagnostic.code === "unknown_element" ||
            diagnostic.code === "partially_supported_element") &&
          directElementNames.has(String(diagnostic.details?.element)),
      ),
    ).toEqual([]);
  });

  it("normalizes item recovery, wand charges, and consumable trigger leaves", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-item-use-metadata-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    mkdirSync(sourceRoot);
    writeFileSync(
      path.join(sourceRoot, "itemDB.xml"),
      `<?xml version="1.0"?>
<items>
  <item name="Training Food"><food hp="12" meat="1" effect="Food Effect" /></item>
  <item name="Training Booze"><food mp="8" /></item>
  <item name="Mixed Recovery"><food hp="3" mp="4" /></item>
  <item name="Invalid Recovery"><food hp="-1" future="diagnosed"><future /></food></item>
  <item name="Missing Recovery"><food meat="1" /></item>
  <item name="Training Wand"><wand mincharge="2" maxcharge="5" spell="Wand Effect" /></item>
  <item name="Incomplete Wand"><wand mincharge="bad" spell="Other Effect" /></item>
  <item name="Reversed Wand"><wand mincharge="7" maxcharge="3" spell="Reverse Effect" /></item>
  <item name="Training Potion"><potion spell="Potion Effect" /></item>
  <item name="Training Mushroom"><mushroom /><casts spell="Mushroom Effect" /></item>
  <item name="Empty Mushroom"><mushroom /></item>
  <item name="Unknown Potion Content"><potion spell="Future Effect" future="diagnosed"><future /></potion></item>
  <item name="Unknown Mushroom Content"><mushroom future="diagnosed"><future /></mushroom><casts spell="Cast Effect" future="diagnosed"><future /></casts></item>
  <item name="Unscoped Cast"><casts spell="Not A Mushroom Effect" /></item>
</items>`,
    );
    const manifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      manifestPath,
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "item-use-metadata-test",
        sources: [
          {
            id: "item-use-source",
            label: "Item Use Source",
            kind: "fixture",
            precedence: 0,
            root: "source",
            files: [{ kind: "items", path: "itemDB.xml" }],
          },
        ],
      }),
    );

    const result = importDataset({
      manifestPath,
      repositoryRoot: temporaryRoot,
    });
    const items = new Map(
      result.artifact.entities.items.map((item) => [item.name, item]),
    );

    expect(items.get("Training Food")?.recoveries).toEqual([
      {
        resource: "life",
        amount: 12,
        sourceFlags: [{ sourceKey: "meat", value: "1" }],
      },
    ]);
    expect(items.get("Training Booze")?.recoveries).toEqual([
      { resource: "mana", amount: 8, sourceFlags: [] },
    ]);
    expect(items.get("Mixed Recovery")?.recoveries).toEqual([
      { resource: "life", amount: 3, sourceFlags: [] },
      { resource: "mana", amount: 4, sourceFlags: [] },
    ]);
    expect(items.get("Invalid Recovery")?.recoveries).toEqual([
      { resource: "life", amount: null, sourceFlags: [] },
    ]);
    expect(items.get("Training Wand")?.chargeRanges).toEqual([
      { minimum: 2, maximum: 5 },
    ]);
    expect(items.get("Incomplete Wand")?.chargeRanges).toEqual([
      { minimum: null, maximum: null },
    ]);
    expect(items.get("Reversed Wand")?.chargeRanges).toEqual([
      { minimum: null, maximum: null },
    ]);
    expect(items.get("Training Potion")?.triggers).toEqual([
      expect.objectContaining({ kind: "quaffed", spellName: "Potion Effect" }),
    ]);
    expect(items.get("Training Mushroom")?.triggers).toEqual([
      expect.objectContaining({
        kind: "munched",
        spellName: "Mushroom Effect",
      }),
    ]);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "invalid_item_charge_range" }),
        expect.objectContaining({ code: "missing_item_recovery" }),
        expect.objectContaining({ code: "missing_mushroom_cast" }),
        expect.objectContaining({
          code: "unknown_attribute",
          details: expect.objectContaining({
            element: "food",
            attribute: "future",
          }),
        }),
        expect.objectContaining({
          code: "unknown_attribute",
          details: expect.objectContaining({
            element: "potion",
            attribute: "future",
          }),
        }),
        expect.objectContaining({
          code: "unknown_attribute",
          details: expect.objectContaining({
            element: "mushroom",
            attribute: "future",
          }),
        }),
        expect.objectContaining({
          code: "unknown_attribute",
          details: expect.objectContaining({
            element: "casts",
            attribute: "future",
          }),
        }),
        expect.objectContaining({
          code: "unknown_element",
          entityId: "item:unscoped cast",
          details: { element: "casts" },
        }),
      ]),
    );
    expect(
      result.diagnostics.filter(
        (diagnostic) =>
          diagnostic.code === "partially_supported_element" &&
          ["casts", "food", "mushroom", "potion", "wand"].includes(
            String(diagnostic.details?.element),
          ),
      ),
    ).toEqual([]);
  });

  it("normalizes loss-aware trap behavior and validates trap leaves", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-item-trap-metadata-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    mkdirSync(sourceRoot);
    mkdirSync(path.join(sourceRoot, "assets"));
    writeFileSync(path.join(sourceRoot, "assets", "trap.svg"), "<svg />");
    writeFileSync(
      path.join(sourceRoot, "itemDB.xml"),
      `<?xml version="1.0"?>
<items>
  <item name="Complete Trap"><trap trigger="once" casts="Trap Effect" level="5" targetIsCaster="1" origin="assets/trap.svg" originMount="wall" originFacing="south" /></item>
  <item name="Always Trap"><trap trigger="always" casts="Persistent Effect" level="2" /></item>
  <item name="Disabled Target Trap"><trap trigger="once" casts="Disabled Target Effect" level="1" targetIsCaster="0" /></item>
  <item name="Invalid Trap"><trap trigger="later" casts="Invalid Effect" level="-1" targetIsCaster="maybe" origin="../outside.svg" future="diagnosed"><future /></trap></item>
  <item name="Missing Cast"><trap trigger="once" level="3" /></item>
</items>`,
    );
    const manifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      manifestPath,
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "item-trap-metadata-test",
        sources: [
          {
            id: "item-trap-source",
            label: "Item Trap Source",
            kind: "fixture",
            precedence: 0,
            root: "source",
            files: [{ kind: "items", path: "itemDB.xml" }],
          },
        ],
      }),
    );

    const result = importDataset({
      manifestPath,
      repositoryRoot: temporaryRoot,
    });
    const items = new Map(
      result.artifact.entities.items.map((item) => [item.name, item]),
    );

    expect(items.get("Complete Trap")?.traps).toEqual([
      {
        activation: "once",
        level: 5,
        targetsCaster: true,
        originPath: "assets/trap.svg",
        originMount: "wall",
        originFacing: "south",
      },
    ]);
    expect(items.get("Complete Trap")?.quality).toBe(5);
    expect(items.get("Complete Trap")?.triggers).toEqual([
      expect.objectContaining({
        kind: "stepped-on",
        spellName: "Trap Effect",
      }),
    ]);
    expect(items.get("Always Trap")?.traps).toEqual([
      {
        activation: "always",
        level: 2,
        targetsCaster: null,
        originPath: null,
        originMount: null,
        originFacing: null,
      },
    ]);
    expect(items.get("Disabled Target Trap")?.traps[0]?.targetsCaster).toBe(
      false,
    );
    expect(items.get("Invalid Trap")?.traps).toEqual([
      {
        activation: null,
        level: null,
        targetsCaster: null,
        originPath: null,
        originMount: null,
        originFacing: null,
      },
    ]);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "invalid_item_trap_activation" }),
        expect.objectContaining({
          code: "invalid_number",
          details: expect.objectContaining({ field: "item trap level" }),
        }),
        expect.objectContaining({ code: "invalid_boolean" }),
        expect.objectContaining({ code: "unsafe_asset_path" }),
        expect.objectContaining({
          code: "unknown_attribute",
          details: expect.objectContaining({
            element: "trap",
            attribute: "future",
          }),
        }),
        expect.objectContaining({
          code: "unknown_element",
          details: { element: "future" },
        }),
        expect.objectContaining({
          code: "missing_trigger_spell",
          entityId: "item:missing cast",
        }),
      ]),
    );
    expect(
      result.diagnostics.filter(
        (diagnostic) =>
          diagnostic.code === "partially_supported_element" &&
          diagnostic.details?.element === "trap",
      ),
    ).toEqual([]);
  });

  it("derives semantic item categories from source shapes", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-item-categories-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    mkdirSync(sourceRoot);
    writeFileSync(
      path.join(sourceRoot, "itemDB.xml"),
      `<?xml version="1.0"?>
<items>
  <item name="Default Sword"><weapon /></item>
  <item name="Axe" type="1"><weapon /></item>
  <item name="Mace" type="2"><weapon /></item>
  <item name="Staff" type="3"><weapon /></item>
  <item name="Crossbow" type="4"><weapon /></item>
  <item name="Thrown" type="5"><weapon /></item>
  <item name="Ammunition" type="6"><weapon /></item>
  <item name="Dagger" type="7"><weapon /></item>
  <item name="Polearm" type="8"><weapon /></item>
  <item name="Future Weapon" type="9"><weapon /></item>
  <item name="Head"><armour type="head" /></item>
  <item name="Chest"><armour type="chest" /></item>
  <item name="Legs"><armour type="legs" /></item>
  <item name="Hands"><armour type="hands" /></item>
  <item name="Feet"><armour type="feet" /></item>
  <item name="Waist"><armour type="waist" /></item>
  <item name="Shield"><armour type="shield" /></item>
  <item name="Ring"><armour type="ring" /></item>
  <item name="Neck"><armour type="neck" /></item>
  <item name="Sleeve"><armour type="sleeve" /></item>
  <item name="Future Armour"><armour type="cape" /></item>
  <item name="Orb" overrideClassName="Orb"><armour type="shield" /></item>
  <item name="Tome" overrideClassName="Tome"><armour type="shield" /></item>
  <item name="Food"><food hp="3" /></item>
  <item name="Booze"><food mp="3" /></item>
  <item name="Mixed Food"><food hp="3" mp="3" /></item>
  <item name="Trap"><trap /></item>
  <item name="Wand"><wand /></item>
  <item name="Potion"><potion /></item>
  <item name="Mushroom"><mushroom /></item>
  <item name="Gem"><gem /></item>
  <item name="Malformed Gem"><gem future="kept"><future /></gem></item>
  <item name="Toolkit" alchemical="1"><toolkit /></item>
  <item name="Reagent" alchemical="1" />
  <item name="Custom" type="crafting_material" />
  <item name="Generic Numeric" type="42" />
</items>`,
    );
    const categoryManifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      categoryManifestPath,
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "item-category-test",
        sources: [
          {
            id: "category-source",
            label: "Category Source",
            kind: "fixture",
            precedence: 0,
            root: "source",
            files: [{ kind: "items", path: "itemDB.xml" }],
          },
        ],
      }),
    );

    const result = importDataset({
      manifestPath: categoryManifestPath,
      repositoryRoot: temporaryRoot,
    });
    const categoryByName = new Map(
      result.artifact.entities.items.map((item) => [item.name, item.category]),
    );

    expect(categoryByName).toEqual(
      new Map([
        ["Ammunition", "weapon:ammunition"],
        ["Axe", "weapon:axe"],
        ["Booze", "booze"],
        ["Chest", "armour:chest"],
        ["Crossbow", "weapon:crossbow"],
        ["Custom", "crafting_material"],
        ["Dagger", "weapon:dagger"],
        ["Default Sword", "weapon:sword"],
        ["Feet", "armour:feet"],
        ["Food", "food"],
        ["Future Armour", "armour"],
        ["Future Weapon", "weapon"],
        ["Gem", "gem"],
        ["Generic Numeric", "item"],
        ["Hands", "armour:hands"],
        ["Head", "armour:head"],
        ["Legs", "armour:legs"],
        ["Mace", "weapon:mace"],
        ["Malformed Gem", "gem"],
        ["Mixed Food", "food"],
        ["Mushroom", "mushroom"],
        ["Neck", "armour:neck"],
        ["Orb", "orb"],
        ["Polearm", "weapon:polearm"],
        ["Potion", "potion"],
        ["Reagent", "reagent"],
        ["Ring", "armour:ring"],
        ["Shield", "armour:shield"],
        ["Sleeve", "armour:sleeve"],
        ["Staff", "weapon:staff"],
        ["Thrown", "weapon:thrown"],
        ["Toolkit", "toolkit"],
        ["Tome", "tome"],
        ["Trap", "trap"],
        ["Waist", "armour:waist"],
        ["Wand", "wand"],
      ]),
    );
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "unknown_attribute",
          entityId: "item:malformed gem",
          details: {
            element: "gem",
            attribute: "future",
            value: "kept",
          },
        }),
        expect.objectContaining({
          code: "unknown_element",
          entityId: "item:malformed gem",
          details: { element: "future" },
        }),
      ]),
    );
    expect(
      result.diagnostics.filter(
        (diagnostic) =>
          diagnostic.code === "unknown_element" &&
          diagnostic.details?.element === "gem",
      ),
    ).toEqual([]);
  });

  it("normalizes loss-aware spell mana costs and diagnoses unsupported requirements", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-spell-mana-costs-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    mkdirSync(sourceRoot);
    writeFileSync(
      path.join(sourceRoot, "spellDB.xml"),
      `<?xml version="1.0"?>
<spellDB>
  <spell name="Complete Mana Cost" type="self">
    <requirements mp="12" savvyBonus="0.25" mincost="4" future="kept as a diagnostic">
      <futureChild />
    </requirements>
    <effect type="stat" stat="Savvy" amount="12junk" scaling="1.5">
      <futureEffectChild />
    </effect>
  </spell>
  <spell name="Invalid Mana Cost" type="self">
    <requirements mp="-1" savvyBonus="invalid" mincost="-2" />
  </spell>
  <spell name="Multiple Mana Costs" type="self">
    <requirements mp="8" />
    <requirements mp="6" savvybonus="0.1" mincost="3" />
  </spell>
  <spell name="Unsupported Requirement" type="self">
    <requirements shield="1" />
  </spell>
</spellDB>`,
    );
    const manaManifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      manaManifestPath,
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "spell-mana-cost-test",
        sources: [
          {
            id: "spell-mana-source",
            label: "Spell Mana Source",
            kind: "fixture",
            precedence: 0,
            root: "source",
            files: [{ kind: "spells", path: "spellDB.xml" }],
          },
        ],
      }),
    );

    const result = importDataset({
      manifestPath: manaManifestPath,
      repositoryRoot: temporaryRoot,
    });
    const spells = new Map(
      result.artifact.entities.spells.map((spell) => [spell.name, spell]),
    );

    expect(spells.get("Complete Mana Cost")?.manaCosts).toEqual([
      { base: 12, savvyReduction: 0.25, minimum: 4 },
    ]);
    expect(spells.get("Invalid Mana Cost")?.manaCosts).toEqual([
      { base: null, savvyReduction: null, minimum: null },
    ]);
    expect(spells.get("Multiple Mana Costs")?.manaCosts).toEqual([
      { base: 8, savvyReduction: null, minimum: null },
      { base: 6, savvyReduction: 0.1, minimum: 3 },
    ]);
    expect(spells.get("Unsupported Requirement")?.manaCosts).toEqual([]);
    expect(
      result.diagnostics.filter(
        (diagnostic) => diagnostic.code === "invalid_number",
      ),
    ).toHaveLength(4);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "unknown_attribute",
          entityId: "spell:complete mana cost",
          details: { element: "requirements", attribute: "future" },
        }),
        expect.objectContaining({
          code: "unknown_attribute",
          entityId: "spell:complete mana cost",
          details: {
            element: "effect",
            attribute: "scaling",
            value: "1.5",
          },
        }),
        expect.objectContaining({
          code: "unknown_element",
          entityId: "spell:complete mana cost",
          details: { element: "futureEffectChild" },
        }),
        expect.objectContaining({
          code: "unknown_element",
          entityId: "spell:complete mana cost",
          details: { element: "futureChild" },
        }),
        expect.objectContaining({
          code: "unsupported_spell_requirement",
          entityId: "spell:unsupported requirement",
          details: { element: "requirements" },
        }),
      ]),
    );
    expect(
      result.diagnostics.some(
        (diagnostic) =>
          diagnostic.code === "unknown_element" &&
          diagnostic.details?.element === "requirements",
      ),
    ).toBe(false);
  });

  it("normalizes spell animation and impact metadata and diagnoses malformed declarations", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-spell-animations-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    mkdirSync(sourceRoot);
    writeFileSync(
      path.join(sourceRoot, "spellDB.xml"),
      `<?xml version="1.0"?>
<spellDB>
  <spell name="Complete Animation" type="target">
    <anim sprite="sprites/sfx/complete/complete" frames="6" framerate="80" firstframe="1" centerEffect="1" sync="0" sfx="complete cue" />
    <anim sprite="sprites\\sfx\\alias\\alias" num="4" first="2" centereffect="0" />
    <impact sprite="sprites/sfx/impact/impact" frames="5" framerate="70" firstframe="0" centereffect="0" sync="1" sfx="impact cue" />
  </spell>
  <spell name="Invalid Animation" type="self">
    <anim sprite="../outside" frames="-1" framerate="1.5" firstframe="bad" centerEffect="maybe" sync="2" future="retained"><futureChild /></anim>
    <anim />
    <impact sprite="C:outside" frames="-2" framerate="2.5" firstframe="bad" centerEffect="maybe" sync="2" futureImpact="retained"><futureImpactChild /></impact>
    <impact />
  </spell>
</spellDB>`,
    );
    const animationManifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      animationManifestPath,
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "spell-animation-test",
        sources: [
          {
            id: "spell-animation-source",
            label: "Spell Animation Source",
            kind: "fixture",
            precedence: 0,
            root: "source",
            files: [{ kind: "spells", path: "spellDB.xml" }],
          },
        ],
      }),
    );

    const result = importDataset({
      manifestPath: animationManifestPath,
      repositoryRoot: temporaryRoot,
    });
    const spells = new Map(
      result.artifact.entities.spells.map((spell) => [spell.name, spell]),
    );

    expect(spells.get("Complete Animation")?.animations).toEqual([
      {
        spritePath: "sprites/sfx/complete/complete",
        frameCount: 6,
        frameRate: 80,
        firstFrame: 1,
        centered: true,
        synchronized: false,
        soundEffect: "complete cue",
      },
      {
        spritePath: "sprites/sfx/alias/alias",
        frameCount: 4,
        frameRate: null,
        firstFrame: 2,
        centered: false,
        synchronized: null,
        soundEffect: null,
      },
    ]);
    expect(spells.get("Invalid Animation")?.animations).toEqual([
      {
        spritePath: null,
        frameCount: null,
        frameRate: null,
        firstFrame: null,
        centered: null,
        synchronized: null,
        soundEffect: null,
      },
      {
        spritePath: null,
        frameCount: null,
        frameRate: null,
        firstFrame: null,
        centered: null,
        synchronized: null,
        soundEffect: null,
      },
    ]);
    expect(spells.get("Complete Animation")?.impacts).toEqual([
      {
        spritePath: "sprites/sfx/impact/impact",
        frameCount: 5,
        frameRate: 70,
        firstFrame: 0,
        centered: false,
        synchronized: true,
        soundEffect: "impact cue",
      },
    ]);
    expect(spells.get("Invalid Animation")?.impacts).toEqual([
      {
        spritePath: null,
        frameCount: null,
        frameRate: null,
        firstFrame: null,
        centered: null,
        synchronized: null,
        soundEffect: null,
      },
      {
        spritePath: null,
        frameCount: null,
        frameRate: null,
        firstFrame: null,
        centered: null,
        synchronized: null,
        soundEffect: null,
      },
    ]);
    expect(
      result.diagnostics.filter(
        (diagnostic) => diagnostic.code === "invalid_number",
      ),
    ).toHaveLength(6);
    expect(
      result.diagnostics.filter(
        (diagnostic) => diagnostic.code === "invalid_boolean",
      ),
    ).toHaveLength(4);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          code: "unsafe_asset_path",
          entityId: "spell:invalid animation",
          details: { assetPath: "../outside" },
        }),
        expect.objectContaining({
          severity: "error",
          code: "unsafe_asset_path",
          entityId: "spell:invalid animation",
          details: { assetPath: "C:outside" },
        }),
        expect.objectContaining({
          code: "missing_spell_animation_sprite",
          entityId: "spell:invalid animation",
          details: { animationIndex: 1 },
        }),
        expect.objectContaining({
          code: "missing_spell_impact_sprite",
          entityId: "spell:invalid animation",
          details: { impactIndex: 1 },
        }),
        expect.objectContaining({
          code: "unknown_attribute",
          entityId: "spell:invalid animation",
          details: {
            element: "anim",
            attribute: "future",
            value: "retained",
          },
        }),
        expect.objectContaining({
          code: "unknown_element",
          entityId: "spell:invalid animation",
          details: { element: "futureChild" },
        }),
        expect.objectContaining({
          code: "unknown_attribute",
          entityId: "spell:invalid animation",
          details: {
            element: "impact",
            attribute: "futureImpact",
            value: "retained",
          },
        }),
        expect.objectContaining({
          code: "unknown_element",
          entityId: "spell:invalid animation",
          details: { element: "futureImpactChild" },
        }),
      ]),
    );
    expect(
      result.diagnostics.some(
        (diagnostic) =>
          diagnostic.code === "unknown_element" &&
          (diagnostic.details?.element === "anim" ||
            diagnostic.details?.element === "impact"),
      ),
    ).toBe(false);
  });

  it("normalizes spell buff source parameters and signed modifiers", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-spell-buffs-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    mkdirSync(sourceRoot);
    writeFileSync(
      path.join(sourceRoot, "spellDB.xml"),
      `<?xml version="1.0"?>
<spellDB>
  <spell name="Complete Buff" type="self">
    <buff useTimer="2" time="12" manaUpkeep="3" zorkmidUpkeep="4" brittle="5" attacks="6" removable="1" self="0" resistable="0" bad="1" stackable="1" allowstacking="0" stacksize="7" affectsCorpses="0" tag="measured">
      <description text="First measured buff description." />
      <description text="Second measured buff description." />
      <halo name="sprites\\sfx\\measured-halo\\measured-halo" first="0" num="4" frameRate="120" centerEffect="1" />
      <halo name="sprites/sfx/lowercase-halo/lowercase-halo" num="2" framerate="60" centereffect="0" />
      <damageBuff crushing="1.5" />
      <resistBuff toxic="-2" />
      <primaryBuff id="2" amount="3" />
      <secondarybuff id="6" amount="-4" />
      <sightbuff amount="2.5" />
      <sightbuff amount="-3" />
      <targetHitEffectBuff percentage="75" name="Invalid Buff" after="1" />
      <playerHitEffectBuff percentage="25" name="Missing Hook Spell" />
    </buff>
    <buff usetimer="1" time="1" manaupkeep="2" allowStacking="1" />
  </spell>
  <spell name="Invalid Buff" type="self">
    <buff useTimer="-1" time="1.5" manaUpkeep="bad" removable="maybe" self="2" resistable="yes" bad="no" stackable="sometimes" allowstacking="perhaps" stacksize="-2" future="diagnosed">
      <description future="diagnosed"><futureDescriptionChild /></description>
      <halo name="../outside" first="-1" num="1.5" frameRate="bad" framerate="90" centerEffect="maybe" centereffect="0" future="diagnosed"><futureHaloChild /></halo>
      <halo />
      <damagebuff impossible="2"><futureChild /></damagebuff>
      <primarybuff amount="1" future="diagnosed" />
      <sightbuff amount="bad" future="diagnosed"><futureChild /></sightbuff>
      <sightbuff />
      <targetHitEffectBuff percentage="101" name="Complete Buff" future="diagnosed"><futureChild /></targetHitEffectBuff>
      <playerHitEffectBuff percentage="bad" future="diagnosed" />
    </buff>
  </spell>
</spellDB>`,
    );
    const buffManifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      buffManifestPath,
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "spell-buff-test",
        sources: [
          {
            id: "spell-buff-source",
            label: "Spell Buff Source",
            kind: "fixture",
            precedence: 0,
            root: "source",
            files: [{ kind: "spells", path: "spellDB.xml" }],
          },
        ],
      }),
    );

    const result = importDataset({
      manifestPath: buffManifestPath,
      repositoryRoot: temporaryRoot,
    });
    const spells = new Map(
      result.artifact.entities.spells.map((spell) => [spell.name, spell]),
    );

    expect(spells.get("Complete Buff")?.buffs).toEqual([
      {
        iconPath: null,
        smallIconPath: null,
        timerMode: 2,
        duration: 12,
        manaUpkeep: 3,
        currencyUpkeep: 4,
        hitLimit: 5,
        attackLimit: 6,
        removable: true,
        affectsSelf: false,
        resistable: false,
        detrimental: true,
        stackable: true,
        allowStacking: false,
        stackLimit: 7,
        descriptions: [
          { text: "First measured buff description." },
          { text: "Second measured buff description." },
        ],
        aiHints: [],
        halos: [
          {
            spritePath: "sprites/sfx/measured-halo/measured-halo",
            frameCount: 4,
            frameRate: 120,
            firstFrame: 0,
            centered: true,
          },
          {
            spritePath: "sprites/sfx/lowercase-halo/lowercase-halo",
            frameCount: 2,
            frameRate: 60,
            firstFrame: null,
            centered: false,
          },
        ],
        sourceFlags: [
          { sourceKey: "affectsCorpses", value: "0" },
          { sourceKey: "tag", value: "measured" },
        ],
        modifiers: [
          { kind: "damage", sourceKey: "crushing", amount: 1.5 },
          { kind: "resistance", sourceKey: "toxic", amount: -2 },
          { kind: "primary", sourceKey: "2", amount: 3 },
          { kind: "secondary", sourceKey: "6", amount: -4 },
        ],
        sightModifiers: [{ amount: 2.5 }, { amount: -3 }],
        eventHooks: [
          {
            kind: "target-hit",
            spellKey: "invalid buff",
            spellName: "Invalid Buff",
            spellId: "spell:invalid buff",
            chance: 75,
            sourceFlags: [{ sourceKey: "after", value: "1" }],
          },
          {
            kind: "player-hit",
            spellKey: "missing hook spell",
            spellName: "Missing Hook Spell",
            chance: 25,
            sourceFlags: [],
          },
        ],
      },
      expect.objectContaining({
        timerMode: 1,
        duration: 1,
        manaUpkeep: 2,
        allowStacking: true,
        modifiers: [],
        sightModifiers: [],
      }),
    ]);
    expect(spells.get("Invalid Buff")?.buffs).toEqual([
      expect.objectContaining({
        timerMode: null,
        duration: null,
        manaUpkeep: null,
        removable: null,
        affectsSelf: null,
        resistable: null,
        detrimental: null,
        stackable: null,
        allowStacking: null,
        stackLimit: null,
        descriptions: [{ text: null }],
        halos: [
          {
            spritePath: null,
            frameCount: null,
            frameRate: null,
            firstFrame: null,
            centered: null,
          },
          {
            spritePath: null,
            frameCount: null,
            frameRate: null,
            firstFrame: null,
            centered: null,
          },
        ],
        modifiers: [],
        sightModifiers: [{ amount: null }, { amount: null }],
        eventHooks: [
          {
            kind: "target-hit",
            spellKey: "complete buff",
            spellName: "Complete Buff",
            spellId: "spell:complete buff",
            chance: null,
            sourceFlags: [],
          },
        ],
      }),
    ]);
    expect(
      result.diagnostics.filter(
        (diagnostic) => diagnostic.code === "invalid_number",
      ),
    ).toHaveLength(10);
    expect(
      result.diagnostics.filter(
        (diagnostic) => diagnostic.code === "invalid_boolean",
      ),
    ).toHaveLength(7);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "unknown_attribute",
          entityId: "spell:invalid buff",
          details: { element: "description", attribute: "future" },
        }),
        expect.objectContaining({
          code: "missing_spell_buff_description_text",
          entityId: "spell:invalid buff",
          details: { buffIndex: 0, descriptionIndex: 0 },
        }),
        expect.objectContaining({
          severity: "error",
          code: "unsafe_asset_path",
          entityId: "spell:invalid buff",
          details: { assetPath: "../outside" },
        }),
        expect.objectContaining({
          code: "missing_spell_buff_halo_sprite",
          entityId: "spell:invalid buff",
          details: { buffIndex: 0, haloIndex: 1 },
        }),
        expect.objectContaining({
          code: "unknown_attribute",
          entityId: "spell:invalid buff",
          details: {
            element: "halo",
            attribute: "future",
            value: "diagnosed",
          },
        }),
        expect.objectContaining({
          code: "conflicting_spell_buff_halo_aliases",
          entityId: "spell:invalid buff",
          details: expect.objectContaining({
            buffIndex: 0,
            haloIndex: 0,
            field: "frame rate",
          }),
        }),
        expect.objectContaining({
          code: "conflicting_spell_buff_halo_aliases",
          entityId: "spell:invalid buff",
          details: expect.objectContaining({
            buffIndex: 0,
            haloIndex: 0,
            field: "centered flag",
          }),
        }),
        expect.objectContaining({
          code: "unknown_attribute",
          entityId: "spell:invalid buff",
          details: { element: "buff", attribute: "future" },
        }),
        expect.objectContaining({
          code: "unknown_spell_buff_modifier",
          entityId: "spell:invalid buff",
          details: { modifierKind: "damage", sourceKey: "impossible" },
        }),
        expect.objectContaining({
          code: "missing_spell_buff_modifier_key",
          entityId: "spell:invalid buff",
          details: { modifierKind: "primary" },
        }),
        expect.objectContaining({
          code: "unknown_attribute",
          entityId: "spell:invalid buff",
          details: { element: "sightbuff", attribute: "future" },
        }),
        expect.objectContaining({
          code: "missing_spell_buff_sight_amount",
          entityId: "spell:invalid buff",
          details: { buffIndex: 0, modifierIndex: 1 },
        }),
        expect.objectContaining({
          code: "unknown_attribute",
          entityId: "spell:invalid buff",
          details: {
            element: "targetHitEffectBuff",
            attribute: "future",
          },
        }),
        expect.objectContaining({
          code: "missing_spell_buff_hook_target",
          entityId: "spell:invalid buff",
          details: { buffIndex: 0, hookIndex: 0, hookKind: "player-hit" },
        }),
        expect.objectContaining({
          code: "dangling_reference",
          entityId: "spell:complete buff",
          details: { targetKind: "spell", reference: "Missing Hook Spell" },
        }),
        expect.objectContaining({
          code: "unknown_element",
          entityId: "spell:invalid buff",
          details: { element: "futureDescriptionChild" },
        }),
        expect.objectContaining({
          code: "unknown_element",
          entityId: "spell:invalid buff",
          details: { element: "futureHaloChild" },
        }),
        expect.objectContaining({
          code: "unknown_element",
          entityId: "spell:invalid buff",
          details: { element: "futureChild" },
        }),
      ]),
    );
    expect(
      result.diagnostics.some(
        (diagnostic) =>
          ["halo", "sightbuff"].includes(String(diagnostic.details?.element)) &&
          diagnostic.code === "unknown_element",
      ),
    ).toBe(false);
    expect(
      result.diagnostics.some(
        (diagnostic) =>
          diagnostic.entityId === "spell:complete buff" &&
          (diagnostic.code === "unknown_element" ||
            diagnostic.code === "partially_supported_element"),
      ),
    ).toBe(false);
  });

  it("normalizes ordered spell and buff AI hints without inferring behavior", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-spell-ai-hints-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    mkdirSync(sourceRoot);
    writeFileSync(
      path.join(sourceRoot, "spellDB.xml"),
      `<?xml version="1.0"?>
<spellDB>
  <spell name="Complete AI Hints" type="target">
    <ai hint="target" />
    <ai hint="buff" />
    <buff>
      <ai hint="self" />
    </buff>
  </spell>
  <spell name="Invalid AI Hints" type="self">
    <ai />
    <ai hint="  " />
    <ai hint="ally" future="diagnosed">
      <futureAiChild />
    </ai>
    <buff>
      <ai hint="mine" future="diagnosed">unexpected text</ai>
      <ai />
    </buff>
  </spell>
</spellDB>`,
    );
    const aiManifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      aiManifestPath,
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "spell-ai-hint-test",
        sources: [
          {
            id: "spell-ai-hint-source",
            label: "Spell AI Hint Source",
            kind: "fixture",
            precedence: 0,
            root: "source",
            files: [{ kind: "spells", path: "spellDB.xml" }],
          },
        ],
      }),
    );

    const result = importDataset({
      manifestPath: aiManifestPath,
      repositoryRoot: temporaryRoot,
    });
    const spells = new Map(
      result.artifact.entities.spells.map((spell) => [spell.name, spell]),
    );

    expect(spells.get("Complete AI Hints")).toMatchObject({
      aiHints: [{ hint: "target" }, { hint: "buff" }],
      buffs: [expect.objectContaining({ aiHints: [{ hint: "self" }] })],
    });
    expect(spells.get("Invalid AI Hints")).toMatchObject({
      aiHints: [{ hint: null }, { hint: null }, { hint: "ally" }],
      buffs: [
        expect.objectContaining({
          aiHints: [{ hint: "mine" }, { hint: null }],
        }),
      ],
    });
    expect(
      result.diagnostics.filter(
        (diagnostic) => diagnostic.code === "missing_spell_ai_hint",
      ),
    ).toHaveLength(3);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing_spell_ai_hint",
          entityId: "spell:invalid ai hints",
          details: { hintIndex: 0, scope: "spell" },
        }),
        expect.objectContaining({
          code: "missing_spell_ai_hint",
          entityId: "spell:invalid ai hints",
          details: { hintIndex: 1, scope: "buff", buffIndex: 0 },
        }),
        expect.objectContaining({
          code: "unknown_attribute",
          entityId: "spell:invalid ai hints",
          source: expect.objectContaining({ line: 13 }),
          details: {
            element: "ai",
            attribute: "future",
            value: "diagnosed",
          },
        }),
        expect.objectContaining({
          code: "unknown_attribute",
          entityId: "spell:invalid ai hints",
          source: expect.objectContaining({ line: 17 }),
          details: {
            element: "ai",
            attribute: "future",
            value: "diagnosed",
          },
        }),
        expect.objectContaining({
          code: "unknown_element",
          entityId: "spell:invalid ai hints",
          details: { element: "futureAiChild" },
        }),
        expect.objectContaining({
          code: "unknown_element",
          entityId: "spell:invalid ai hints",
          details: { element: "#text" },
        }),
      ]),
    );
    expect(
      result.diagnostics.some(
        (diagnostic) =>
          diagnostic.details?.element === "ai" &&
          (diagnostic.code === "unknown_element" ||
            diagnostic.code === "partially_supported_element"),
      ),
    ).toBe(false);
    expect(
      result.diagnostics.some(
        (diagnostic) =>
          diagnostic.entityId === "spell:complete ai hints" &&
          (diagnostic.code === "unknown_element" ||
            diagnostic.code === "unknown_attribute" ||
            diagnostic.code === "partially_supported_element"),
      ),
    ).toBe(false);
  });

  it("normalizes typed spell effect options and diagnoses malformed extensions", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-spell-effect-options-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    mkdirSync(sourceRoot);
    writeFileSync(
      path.join(sourceRoot, "itemDB.xml"),
      `<?xml version="1.0"?>
<items>
  <item name="Target Item" type="material" />
</items>`,
    );
    writeFileSync(
      path.join(sourceRoot, "spellDB.xml"),
      `<?xml version="1.0"?>
<spellDB>
  <spell name="Target Spell" type="self" />
  <spell name="Complete Lists" type="target">
    <effect type="spawnitemfromlist">
      <option name="Target Item" />
      <option name="Target Item" amount="2" />
    </effect>
    <effect type="triggerfromlist">
      <option name="Target Spell" />
      <option name="Target Spell" />
    </effect>
  </spell>
  <spell name="Invalid Lists" type="target">
    <effect type="spawnitemfromlist">
      <option />
      <option name="  " />
      <option name="Target Item" amount="0" future="diagnosed"><futureOption />unexpected text</option>
    </effect>
    <effect type="triggerfromlist">
      <option />
      <option name="Target Spell" amount="2" />
    </effect>
    <effect type="damage">
      <option name="Target Item" />
    </effect>
  </spell>
</spellDB>`,
    );
    const optionManifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      optionManifestPath,
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "spell-effect-option-test",
        sources: [
          {
            id: "spell-effect-option-source",
            label: "Spell Effect Option Source",
            kind: "fixture",
            precedence: 0,
            root: "source",
            files: [
              { kind: "items", path: "itemDB.xml" },
              { kind: "spells", path: "spellDB.xml" },
            ],
          },
        ],
      }),
    );

    const result = importDataset({
      manifestPath: optionManifestPath,
      repositoryRoot: temporaryRoot,
    });
    const spells = new Map(
      result.artifact.entities.spells.map((spell) => [spell.name, spell]),
    );
    const complete = spells.get("Complete Lists");
    const invalid = spells.get("Invalid Lists");
    const noControls = {
      durationTurns: null,
      after: null,
      chancePercent: null,
      affectsCaster: null,
      affectsSelf: null,
      affectsCorpses: null,
      resistable: null,
      burnsTarget: null,
      bleedsTarget: null,
      skipAnimation: null,
      taxonomy: null,
    };
    const noConditions = {
      requiresSourceBuff: null,
      requiredBuff: {
        enabled: null,
        spellKey: null,
        spellName: null,
      },
      forbiddenBuff: {
        enabled: null,
        spellKey: null,
        spellName: null,
      },
    };
    const noScaling = {
      amountFactor: null,
      floorFactor: null,
      primaryStatId: null,
      secondaryStatId: null,
    };
    const noItemTarget = {
      itemKey: null,
      itemName: null,
    };
    const noMonsterTarget = {
      monsterKey: null,
      monsterName: null,
    };
    const noRemovedBuff = {
      spellKey: null,
      spellName: null,
    };

    expect(complete?.effects).toEqual([
      {
        type: "spawnitemfromlist",
        itemTarget: noItemTarget,
        monsterTarget: noMonsterTarget,
        removedBuff: noRemovedBuff,
        damage: [],
        scaling: noScaling,
        presentation: null,
        controls: noControls,
        conditions: noConditions,
        options: [
          {
            kind: "item",
            itemKey: "target item",
            itemName: "Target Item",
            itemId: "item:target item",
            amount: null,
          },
          {
            kind: "item",
            itemKey: "target item",
            itemName: "Target Item",
            itemId: "item:target item",
            amount: 2,
          },
        ],
      },
      {
        type: "triggerfromlist",
        itemTarget: noItemTarget,
        monsterTarget: noMonsterTarget,
        removedBuff: noRemovedBuff,
        damage: [],
        scaling: noScaling,
        presentation: null,
        controls: noControls,
        conditions: noConditions,
        options: [
          {
            kind: "spell",
            spellKey: "target spell",
            spellName: "Target Spell",
            spellId: "spell:target spell",
          },
          {
            kind: "spell",
            spellKey: "target spell",
            spellName: "Target Spell",
            spellId: "spell:target spell",
          },
        ],
      },
    ]);
    expect(invalid?.effects).toMatchObject([
      { type: "damage", options: [] },
      {
        type: "spawnitemfromlist",
        options: [
          {
            kind: "item",
            itemKey: null,
            itemName: null,
            amount: null,
          },
          {
            kind: "item",
            itemKey: null,
            itemName: null,
            amount: null,
          },
          {
            kind: "item",
            itemKey: "target item",
            itemName: "Target Item",
            amount: null,
          },
        ],
      },
      {
        type: "triggerfromlist",
        options: [
          { kind: "spell", spellKey: null, spellName: null },
          {
            kind: "spell",
            spellKey: "target spell",
            spellName: "Target Spell",
          },
        ],
      },
    ]);
    expect(
      result.diagnostics.filter(
        (diagnostic) =>
          diagnostic.code === "missing_spell_effect_option_target",
      ),
    ).toHaveLength(3);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid_number",
          entityId: "spell:invalid lists",
          details: expect.objectContaining({ value: "0" }),
        }),
        expect.objectContaining({
          code: "unknown_attribute",
          entityId: "spell:invalid lists",
          details: {
            element: "option",
            attribute: "future",
            value: "diagnosed",
          },
        }),
        expect.objectContaining({
          code: "unknown_attribute",
          entityId: "spell:invalid lists",
          details: {
            element: "option",
            attribute: "amount",
            value: "2",
          },
        }),
        expect.objectContaining({
          code: "unknown_element",
          entityId: "spell:invalid lists",
          details: { element: "futureOption" },
        }),
        expect.objectContaining({
          code: "unknown_element",
          entityId: "spell:invalid lists",
          details: { element: "#text" },
        }),
        expect.objectContaining({
          code: "unknown_element",
          entityId: "spell:invalid lists",
          details: { element: "option" },
        }),
      ]),
    );
    expect(
      result.diagnostics.some(
        (diagnostic) =>
          diagnostic.entityId === "spell:complete lists" &&
          (diagnostic.code === "unknown_element" ||
            diagnostic.code === "unknown_attribute" ||
            diagnostic.code === "partially_supported_element"),
      ),
    ).toBe(false);
  });

  it("normalizes loss-aware spell effect controls and diagnoses malformed values and aliases", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-spell-effect-controls-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    mkdirSync(sourceRoot);
    writeFileSync(
      path.join(sourceRoot, "spellDB.xml"),
      `<?xml version="1.0"?>
<spellDB>
  <spell name="Complete Controls" type="target">
    <effect type="damage" turns="3" after="1" percent="35" affectsCaster="1" self="0" affectsCorpses="1" resistable="0" taxa="Construct" burn="1" bleed="1" skipanimation="1" />
    <effect type="trigger" turns="0" after="0" percentage="25" affectscaster="0" skipAnimation="0" />
  </spell>
  <spell name="Invalid Controls" type="target">
    <effect type="damage" turns="-1" after="maybe" percent="101" percentage="40" affectsCaster="maybe" affectscaster="1" self="-1" affectsCorpses="2" resistable="yes" taxa="  " burn="nope" bleed="maybe" skipAnimation="maybe" skipanimation="1" future="diagnosed" />
    <effect type="trigger" turns="1.5" percent="" />
  </spell>
</spellDB>`,
    );
    const controlManifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      controlManifestPath,
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "spell-effect-control-test",
        sources: [
          {
            id: "spell-effect-control-source",
            label: "Spell Effect Control Source",
            kind: "fixture",
            precedence: 0,
            root: "source",
            files: [{ kind: "spells", path: "spellDB.xml" }],
          },
        ],
      }),
    );

    const result = importDataset({
      manifestPath: controlManifestPath,
      repositoryRoot: temporaryRoot,
    });
    const spells = new Map(
      result.artifact.entities.spells.map((spell) => [spell.name, spell]),
    );

    expect(spells.get("Complete Controls")?.effects).toEqual([
      {
        type: "damage",
        itemTarget: { itemKey: null, itemName: null },
        monsterTarget: { monsterKey: null, monsterName: null },
        removedBuff: { spellKey: null, spellName: null },
        damage: [],
        scaling: {
          amountFactor: null,
          floorFactor: null,
          primaryStatId: null,
          secondaryStatId: null,
        },
        presentation: null,
        controls: {
          durationTurns: 3,
          after: true,
          chancePercent: 35,
          affectsCaster: true,
          affectsSelf: false,
          affectsCorpses: true,
          resistable: false,
          burnsTarget: true,
          bleedsTarget: true,
          skipAnimation: true,
          taxonomy: "Construct",
        },
        conditions: {
          requiresSourceBuff: null,
          requiredBuff: {
            enabled: null,
            spellKey: null,
            spellName: null,
          },
          forbiddenBuff: {
            enabled: null,
            spellKey: null,
            spellName: null,
          },
        },
        options: [],
      },
      {
        type: "trigger",
        itemTarget: { itemKey: null, itemName: null },
        monsterTarget: { monsterKey: null, monsterName: null },
        removedBuff: { spellKey: null, spellName: null },
        damage: [],
        scaling: {
          amountFactor: null,
          floorFactor: null,
          primaryStatId: null,
          secondaryStatId: null,
        },
        presentation: null,
        controls: {
          durationTurns: 0,
          after: false,
          chancePercent: 25,
          affectsCaster: false,
          affectsSelf: null,
          affectsCorpses: null,
          resistable: null,
          burnsTarget: null,
          bleedsTarget: null,
          skipAnimation: false,
          taxonomy: null,
        },
        conditions: {
          requiresSourceBuff: null,
          requiredBuff: {
            enabled: null,
            spellKey: null,
            spellName: null,
          },
          forbiddenBuff: {
            enabled: null,
            spellKey: null,
            spellName: null,
          },
        },
        options: [],
      },
    ]);
    expect(spells.get("Invalid Controls")?.effects).toEqual([
      {
        type: "damage",
        itemTarget: { itemKey: null, itemName: null },
        monsterTarget: { monsterKey: null, monsterName: null },
        removedBuff: { spellKey: null, spellName: null },
        damage: [],
        scaling: {
          amountFactor: null,
          floorFactor: null,
          primaryStatId: null,
          secondaryStatId: null,
        },
        presentation: null,
        controls: {
          durationTurns: null,
          after: null,
          chancePercent: null,
          affectsCaster: null,
          affectsSelf: null,
          affectsCorpses: null,
          resistable: null,
          burnsTarget: null,
          bleedsTarget: null,
          skipAnimation: null,
          taxonomy: null,
        },
        conditions: {
          requiresSourceBuff: null,
          requiredBuff: {
            enabled: null,
            spellKey: null,
            spellName: null,
          },
          forbiddenBuff: {
            enabled: null,
            spellKey: null,
            spellName: null,
          },
        },
        options: [],
      },
      {
        type: "trigger",
        itemTarget: { itemKey: null, itemName: null },
        monsterTarget: { monsterKey: null, monsterName: null },
        removedBuff: { spellKey: null, spellName: null },
        damage: [],
        scaling: {
          amountFactor: null,
          floorFactor: null,
          primaryStatId: null,
          secondaryStatId: null,
        },
        presentation: null,
        controls: {
          durationTurns: null,
          after: null,
          chancePercent: null,
          affectsCaster: null,
          affectsSelf: null,
          affectsCorpses: null,
          resistable: null,
          burnsTarget: null,
          bleedsTarget: null,
          skipAnimation: null,
          taxonomy: null,
        },
        conditions: {
          requiresSourceBuff: null,
          requiredBuff: {
            enabled: null,
            spellKey: null,
            spellName: null,
          },
          forbiddenBuff: {
            enabled: null,
            spellKey: null,
            spellName: null,
          },
        },
        options: [],
      },
    ]);
    expect(
      result.diagnostics.filter(
        (diagnostic) =>
          diagnostic.code === "conflicting_spell_effect_control_aliases",
      ),
    ).toHaveLength(3);
    expect(
      result.diagnostics.filter(
        (diagnostic) =>
          diagnostic.entityId === "spell:invalid controls" &&
          diagnostic.code === "invalid_number",
      ),
    ).toHaveLength(4);
    expect(
      result.diagnostics.filter(
        (diagnostic) =>
          diagnostic.entityId === "spell:invalid controls" &&
          diagnostic.code === "invalid_boolean",
      ),
    ).toHaveLength(8);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing_spell_effect_taxonomy",
          entityId: "spell:invalid controls",
          details: { effectIndex: 0 },
        }),
        expect.objectContaining({
          code: "unknown_attribute",
          entityId: "spell:invalid controls",
          details: {
            element: "effect",
            attribute: "future",
            value: "diagnosed",
          },
        }),
      ]),
    );
    expect(
      result.diagnostics.some(
        (diagnostic) =>
          diagnostic.entityId === "spell:complete controls" &&
          (diagnostic.code === "unknown_attribute" ||
            diagnostic.code === "conflicting_spell_effect_control_aliases"),
      ),
    ).toBe(false);
  });

  it("normalizes direct spell effect presentation metadata loss-aware", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-spell-effect-presentation-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    mkdirSync(sourceRoot);
    writeFileSync(
      path.join(sourceRoot, "spellDB.xml"),
      `<?xml version="1.0"?>
<spellDB>
  <spell name="Complete Effect Presentation" type="target">
    <effect type="confuse" sprite="sprites/sfx/complete/complete" frames="5" framerate="100" centerEffect="1" sfx="psionic cue" />
    <effect type="targetblink" sfx="teleport cue" />
    <effect type="heal" sprite="sprites\\sfx\\explicit-false\\explicit-false" frames="0" framerate="0" centerEffect="0" />
    <effect type="damage" />
  </spell>
  <spell name="Invalid Effect Presentation" type="target">
    <effect type="confuse" sprite="../outside" frames="-1" framerate="1.5" centerEffect="maybe" sfx="  " future="diagnosed" />
  </spell>
</spellDB>`,
    );
    const presentationManifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      presentationManifestPath,
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "spell-effect-presentation-test",
        sources: [
          {
            id: "spell-effect-presentation-source",
            label: "Spell Effect Presentation Source",
            kind: "fixture",
            precedence: 0,
            root: "source",
            files: [{ kind: "spells", path: "spellDB.xml" }],
          },
        ],
      }),
    );

    const result = importDataset({
      manifestPath: presentationManifestPath,
      repositoryRoot: temporaryRoot,
    });
    const spells = new Map(
      result.artifact.entities.spells.map((spell) => [spell.name, spell]),
    );

    expect(
      spells
        .get("Complete Effect Presentation")
        ?.effects.map((effect) => effect.presentation),
    ).toEqual([
      {
        spritePath: "sprites/sfx/complete/complete",
        frameCount: 5,
        frameRate: 100,
        centered: true,
        soundEffect: "psionic cue",
      },
      null,
      {
        spritePath: "sprites/sfx/explicit-false/explicit-false",
        frameCount: 0,
        frameRate: 0,
        centered: false,
        soundEffect: null,
      },
      {
        spritePath: null,
        frameCount: null,
        frameRate: null,
        centered: null,
        soundEffect: "teleport cue",
      },
    ]);
    expect(
      spells.get("Invalid Effect Presentation")?.effects[0]?.presentation,
    ).toEqual({
      spritePath: null,
      frameCount: null,
      frameRate: null,
      centered: null,
      soundEffect: null,
    });
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          code: "unsafe_asset_path",
          entityId: "spell:invalid effect presentation",
          details: { assetPath: "../outside" },
        }),
        expect.objectContaining({
          code: "missing_spell_effect_sound_cue",
          entityId: "spell:invalid effect presentation",
          details: { effectIndex: 0 },
        }),
        expect.objectContaining({
          code: "unknown_attribute",
          entityId: "spell:invalid effect presentation",
          details: {
            element: "effect",
            attribute: "future",
            value: "diagnosed",
          },
        }),
      ]),
    );
    expect(
      result.diagnostics.filter(
        (diagnostic) =>
          diagnostic.entityId === "spell:invalid effect presentation" &&
          diagnostic.code === "invalid_number",
      ),
    ).toHaveLength(2);
    expect(
      result.diagnostics.filter(
        (diagnostic) =>
          diagnostic.entityId === "spell:invalid effect presentation" &&
          diagnostic.code === "invalid_boolean",
      ),
    ).toHaveLength(1);
    expect(
      result.diagnostics.some(
        (diagnostic) =>
          diagnostic.entityId === "spell:complete effect presentation" &&
          diagnostic.code === "unknown_attribute",
      ),
    ).toBe(false);
  });

  it("normalizes direct spell effect item targets and links known items", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-spell-effect-item-target-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    mkdirSync(sourceRoot);
    writeFileSync(
      path.join(sourceRoot, "itemDB.xml"),
      `<?xml version="1.0"?>
<items>
  <item name="Known Spawn"><price amount="1" /></item>
</items>`,
    );
    writeFileSync(
      path.join(sourceRoot, "spellDB.xml"),
      `<?xml version="1.0"?>
<spellDB>
  <spell name="Direct Item Targets" type="target">
    <effect type="spawn" itemname="Known Spawn" amount="2" />
    <effect type="spawnitematlocation" itemName="randomring" amount="1" />
    <effect type="damage" />
  </spell>
  <spell name="Invalid Item Targets" type="target">
    <effect type="spawn" itemname="" />
    <effect type="spawn" itemname="Canonical Target" itemName="Alias Target" />
    <effect type="damage" itemname="Unsupported Here" />
  </spell>
</spellDB>`,
    );
    const itemTargetManifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      itemTargetManifestPath,
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "spell-effect-item-target-test",
        sources: [
          {
            id: "spell-effect-item-target-source",
            label: "Spell Effect Item Target Source",
            kind: "fixture",
            precedence: 0,
            root: "source",
            files: [
              { kind: "items", path: "itemDB.xml" },
              { kind: "spells", path: "spellDB.xml" },
            ],
          },
        ],
      }),
    );

    const result = importDataset({
      manifestPath: itemTargetManifestPath,
      repositoryRoot: temporaryRoot,
    });
    const spells = new Map(
      result.artifact.entities.spells.map((spell) => [spell.name, spell]),
    );

    expect(
      spells
        .get("Direct Item Targets")
        ?.effects.map((effect) => effect.itemTarget),
    ).toEqual([
      { itemKey: null, itemName: null },
      {
        itemKey: "known spawn",
        itemName: "Known Spawn",
        itemId: "item:known spawn",
      },
      { itemKey: "randomring", itemName: "randomring" },
    ]);
    expect(
      spells
        .get("Invalid Item Targets")
        ?.effects.map((effect) => effect.itemTarget),
    ).toEqual([
      { itemKey: null, itemName: null },
      { itemKey: null, itemName: null },
      { itemKey: "canonical target", itemName: "Canonical Target" },
    ]);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing_spell_effect_item_target",
          entityId: "spell:invalid item targets",
          details: { effectIndex: 0, effectType: "spawn" },
        }),
        expect.objectContaining({
          code: "conflicting_spell_effect_item_target_aliases",
          entityId: "spell:invalid item targets",
          details: expect.objectContaining({
            effectIndex: 1,
            canonicalValue: "Canonical Target",
            aliasValue: "Alias Target",
          }),
        }),
        expect.objectContaining({
          code: "unknown_attribute",
          entityId: "spell:invalid item targets",
          details: {
            element: "effect",
            attribute: "itemname",
            value: "Unsupported Here",
          },
        }),
      ]),
    );
    expect(
      result.diagnostics.some(
        (diagnostic) =>
          diagnostic.entityId === "spell:direct item targets" &&
          diagnostic.code === "dangling_reference",
      ),
    ).toBe(false);
  });

  it("normalizes summon monster targets and links known monsters", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-spell-effect-monster-target-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    mkdirSync(sourceRoot);
    writeFileSync(
      path.join(sourceRoot, "monDB.xml"),
      `<?xml version="1.0"?>
<monsters>
  <monster name="Training Diggle" taxa="Animal" level="0" />
</monsters>`,
    );
    writeFileSync(
      path.join(sourceRoot, "spellDB.xml"),
      `<?xml version="1.0"?>
<spellDB>
  <spell name="Known Summon" type="target">
    <effect type="summon" monsterType="Training Diggle" amount="2" />
    <effect type="summonhostile" monsterType="Training Diggle" />
  </spell>
  <spell name="Invalid Summons" type="target">
    <effect type="summon" monsterType="" />
    <effect type="summon" />
    <effect type="summon" monsterType="Missing Diggle" />
    <effect type="damage" monsterType="Unsupported Here" />
  </spell>
</spellDB>`,
    );
    const monsterTargetManifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      monsterTargetManifestPath,
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "spell-effect-monster-target-test",
        sources: [
          {
            id: "spell-effect-monster-target-source",
            label: "Spell Effect Monster Target Source",
            kind: "fixture",
            precedence: 0,
            root: "source",
            files: [
              { kind: "monsters", path: "monDB.xml" },
              { kind: "spells", path: "spellDB.xml" },
            ],
          },
        ],
      }),
    );

    const result = importDataset({
      manifestPath: monsterTargetManifestPath,
      repositoryRoot: temporaryRoot,
    });
    const spells = new Map(
      result.artifact.entities.spells.map((spell) => [spell.name, spell]),
    );
    expect(
      spells.get("Known Summon")?.effects.map((effect) => effect.monsterTarget),
    ).toEqual([
      {
        monsterKey: "training diggle",
        monsterName: "Training Diggle",
        monsterId: "monster:training diggle",
      },
      {
        monsterKey: "training diggle",
        monsterName: "Training Diggle",
        monsterId: "monster:training diggle",
      },
    ]);
    expect(
      spells
        .get("Invalid Summons")
        ?.effects.map((effect) => effect.monsterTarget),
    ).toEqual([
      { monsterKey: null, monsterName: null },
      { monsterKey: null, monsterName: null },
      { monsterKey: null, monsterName: null },
      { monsterKey: "missing diggle", monsterName: "Missing Diggle" },
    ]);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing_spell_effect_monster_target",
          entityId: "spell:invalid summons",
          details: { effectIndex: 0, effectType: "summon" },
        }),
        expect.objectContaining({
          code: "dangling_reference",
          entityId: "spell:invalid summons",
          details: { targetKind: "monster", reference: "Missing Diggle" },
        }),
        expect.objectContaining({
          code: "unknown_attribute",
          entityId: "spell:invalid summons",
          details: {
            element: "effect",
            attribute: "monsterType",
            value: "Unsupported Here",
          },
        }),
      ]),
    );
    expect(
      result.diagnostics.some(
        (diagnostic) =>
          diagnostic.entityId === "spell:known summon" &&
          diagnostic.code === "unknown_attribute",
      ),
    ).toBe(false);
    expect(
      result.diagnostics.filter(
        (diagnostic) =>
          diagnostic.entityId === "spell:invalid summons" &&
          diagnostic.code === "missing_spell_effect_monster_target",
      ),
    ).toHaveLength(1);
  });

  it("normalizes named buff-removal targets and links known buff spells", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-spell-effect-removed-buff-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    mkdirSync(sourceRoot);
    writeFileSync(
      path.join(sourceRoot, "spellDB.xml"),
      `<?xml version="1.0"?>
<spellDB>
  <spell name="Target Buff" type="self">
    <buff removable="1" />
  </spell>
  <spell name="Known Removal" type="self">
    <effect type="removebuffbyname" name="Target Buff" />
  </spell>
  <spell name="Invalid Removals" type="self">
    <effect type="removebuffbyname" name="" />
    <effect type="removebuffbyname" />
    <effect type="removebuffbyname" name="Missing Buff" />
    <effect type="damage" name="Unsupported Here" />
  </spell>
</spellDB>`,
    );
    const removedBuffManifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      removedBuffManifestPath,
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "spell-effect-removed-buff-test",
        sources: [
          {
            id: "spell-effect-removed-buff-source",
            label: "Spell Effect Removed Buff Source",
            kind: "fixture",
            precedence: 0,
            root: "source",
            files: [{ kind: "spells", path: "spellDB.xml" }],
          },
        ],
      }),
    );

    const result = importDataset({
      manifestPath: removedBuffManifestPath,
      repositoryRoot: temporaryRoot,
    });
    const spells = new Map(
      result.artifact.entities.spells.map((spell) => [spell.name, spell]),
    );
    expect(spells.get("Known Removal")?.effects[0]?.removedBuff).toEqual({
      spellKey: "target buff",
      spellName: "Target Buff",
      spellId: "spell:target buff",
    });
    expect(
      spells
        .get("Invalid Removals")
        ?.effects.map((effect) => effect.removedBuff),
    ).toEqual(
      expect.arrayContaining([
        { spellKey: null, spellName: null },
        { spellKey: "missing buff", spellName: "Missing Buff" },
      ]),
    );
    expect(
      result.diagnostics.filter(
        (diagnostic) =>
          diagnostic.entityId === "spell:invalid removals" &&
          diagnostic.code === "missing_spell_effect_removed_buff",
      ),
    ).toHaveLength(2);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "dangling_reference",
          entityId: "spell:invalid removals",
          details: { targetKind: "spell", reference: "Missing Buff" },
        }),
        expect.objectContaining({
          code: "unknown_attribute",
          entityId: "spell:invalid removals",
          details: {
            element: "effect",
            attribute: "name",
            value: "Unsupported Here",
          },
        }),
      ]),
    );
    expect(
      result.diagnostics.some(
        (diagnostic) =>
          diagnostic.entityId === "spell:known removal" &&
          diagnostic.code === "unknown_attribute",
      ),
    ).toBe(false);
  });

  it("normalizes direct spell effect damage and scaling metadata loss-aware", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-spell-effect-damage-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    mkdirSync(sourceRoot);
    writeFileSync(
      path.join(sourceRoot, "spellDB.xml"),
      `<?xml version="1.0"?>
<spellDB>
  <spell name="Complete Damage" type="target">
    <effect type="damage" blasting="3" blastingF="0.25" crushingF="0.5" primaryscale="2" />
    <effect type="drain" necromantic="4" necromanticF="0.2" secondaryScale="6" />
    <effect type="heal" amount="5" amountF="0.3" secondaryScale="4" />
    <effect type="spellpoints" amount="4" amountF="0.2" />
    <effect type="spawnitematlocation" floorScaleF="1.1" />
  </spell>
  <spell name="Invalid Damage" type="target">
    <effect type="damage" blasting="-1" blastingF="nope" primaryScale="2" primaryscale="3" secondaryScale="4" future="diagnosed" />
    <effect type="heal" amountF="" primaryScale="-1" />
    <effect type="spawnitematlocation" floorScaleF="bad" />
    <effect type="target" blasting="1" amountF="0.2" floorScaleF="1" />
  </spell>
</spellDB>`,
    );
    const damageManifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      damageManifestPath,
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "spell-effect-damage-test",
        sources: [
          {
            id: "spell-effect-damage-source",
            label: "Spell Effect Damage Source",
            kind: "fixture",
            precedence: 0,
            root: "source",
            files: [{ kind: "spells", path: "spellDB.xml" }],
          },
        ],
      }),
    );

    const result = importDataset({
      manifestPath: damageManifestPath,
      repositoryRoot: temporaryRoot,
    });
    const spells = new Map(
      result.artifact.entities.spells.map((spell) => [spell.name, spell]),
    );
    const complete = spells.get("Complete Damage");
    const invalid = spells.get("Invalid Damage");

    expect(
      complete?.effects.find((effect) => effect.type === "damage"),
    ).toMatchObject({
      damage: [
        { sourceKey: "blasting", amount: 3, factor: 0.25 },
        { sourceKey: "crushing", amount: null, factor: 0.5 },
      ],
      scaling: {
        amountFactor: null,
        floorFactor: null,
        primaryStatId: 2,
        secondaryStatId: null,
      },
    });
    expect(
      complete?.effects.find((effect) => effect.type === "drain"),
    ).toMatchObject({
      damage: [{ sourceKey: "necromantic", amount: 4, factor: 0.2 }],
      scaling: {
        amountFactor: null,
        floorFactor: null,
        primaryStatId: null,
        secondaryStatId: 6,
      },
    });
    expect(
      complete?.effects.find((effect) => effect.type === "heal")?.scaling,
    ).toEqual({
      amountFactor: 0.3,
      floorFactor: null,
      primaryStatId: null,
      secondaryStatId: 4,
    });
    expect(
      complete?.effects.find((effect) => effect.type === "spellpoints")
        ?.scaling,
    ).toEqual({
      amountFactor: 0.2,
      floorFactor: null,
      primaryStatId: null,
      secondaryStatId: null,
    });
    expect(
      complete?.effects.find((effect) => effect.type === "spawnitematlocation")
        ?.scaling,
    ).toEqual({
      amountFactor: null,
      floorFactor: 1.1,
      primaryStatId: null,
      secondaryStatId: null,
    });
    expect(
      invalid?.effects.find((effect) => effect.type === "damage"),
    ).toMatchObject({
      damage: [{ sourceKey: "blasting", amount: null, factor: null }],
      scaling: {
        primaryStatId: 2,
        secondaryStatId: 4,
      },
    });
    expect(
      invalid?.effects.find((effect) => effect.type === "heal")?.scaling,
    ).toEqual({
      amountFactor: null,
      floorFactor: null,
      primaryStatId: null,
      secondaryStatId: null,
    });
    expect(
      invalid?.effects.find((effect) => effect.type === "target"),
    ).toMatchObject({
      damage: [],
      scaling: {
        amountFactor: null,
        floorFactor: null,
        primaryStatId: null,
        secondaryStatId: null,
      },
    });
    expect(
      result.diagnostics.filter(
        (diagnostic) =>
          diagnostic.entityId === "spell:invalid damage" &&
          diagnostic.code === "invalid_number",
      ),
    ).toHaveLength(5);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "conflicting_spell_effect_scaling_aliases",
          entityId: "spell:invalid damage",
        }),
        expect.objectContaining({
          code: "conflicting_spell_effect_scaling_selectors",
          entityId: "spell:invalid damage",
        }),
        expect.objectContaining({
          code: "unknown_attribute",
          entityId: "spell:invalid damage",
          details: {
            element: "effect",
            attribute: "blasting",
            value: "1",
          },
        }),
        expect.objectContaining({
          code: "unknown_attribute",
          entityId: "spell:invalid damage",
          details: {
            element: "effect",
            attribute: "amountF",
            value: "0.2",
          },
        }),
        expect.objectContaining({
          code: "unknown_attribute",
          entityId: "spell:invalid damage",
          details: {
            element: "effect",
            attribute: "floorScaleF",
            value: "1",
          },
        }),
      ]),
    );
    expect(
      result.diagnostics.some(
        (diagnostic) =>
          diagnostic.entityId === "spell:complete damage" &&
          (diagnostic.code === "unknown_attribute" ||
            diagnostic.code === "conflicting_spell_effect_scaling_aliases" ||
            diagnostic.code === "conflicting_spell_effect_scaling_selectors"),
      ),
    ).toBe(false);
  });

  it("normalizes loss-aware spell effect buff conditions and diagnoses malformed pairs", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-spell-effect-conditions-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    mkdirSync(sourceRoot);
    writeFileSync(
      path.join(sourceRoot, "spellDB.xml"),
      `<?xml version="1.0"?>
<spellDB>
  <spell name="Required Buff" type="self" />
  <spell name="Forbidden Buff" type="self" />
  <spell name="Complete Conditions" type="target">
    <effect type="dot" spell="Required Buff" requirebuff="0" />
    <effect type="dot" spell="Required Buff" requireBuff="1" />
    <effect type="trigger" spell="Required Buff" requirebuffontrigger="1" requirebuffontriggername="Required Buff" />
    <effect type="trigger" spell="Required Buff" requirebuffonnottrigger="0" requirebuffonnottriggername="Forbidden Buff" />
  </spell>
  <spell name="Invalid Conditions" type="target">
    <effect type="trigger" requirebuff="maybe" requireBuff="1" requirebuffontrigger="1" requirebuffontriggername="  " />
    <effect type="trigger" requirebuffonnottrigger="1" />
    <effect type="trigger" requirebuffontriggername="Missing Buff" />
    <effect type="damage" requirebuff="1" />
  </spell>
</spellDB>`,
    );
    const conditionManifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      conditionManifestPath,
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "spell-effect-condition-test",
        sources: [
          {
            id: "spell-effect-condition-source",
            label: "Spell Effect Condition Source",
            kind: "fixture",
            precedence: 0,
            root: "source",
            files: [{ kind: "spells", path: "spellDB.xml" }],
          },
        ],
      }),
    );

    const result = importDataset({
      manifestPath: conditionManifestPath,
      repositoryRoot: temporaryRoot,
    });
    const spells = new Map(
      result.artifact.entities.spells.map((spell) => [spell.name, spell]),
    );
    const complete = spells.get("Complete Conditions");
    const invalid = spells.get("Invalid Conditions");

    expect(complete?.effects.map((effect) => effect.conditions)).toEqual([
      {
        requiresSourceBuff: false,
        requiredBuff: {
          enabled: null,
          spellKey: null,
          spellName: null,
        },
        forbiddenBuff: {
          enabled: null,
          spellKey: null,
          spellName: null,
        },
      },
      {
        requiresSourceBuff: true,
        requiredBuff: {
          enabled: null,
          spellKey: null,
          spellName: null,
        },
        forbiddenBuff: {
          enabled: null,
          spellKey: null,
          spellName: null,
        },
      },
      {
        requiresSourceBuff: null,
        requiredBuff: {
          enabled: true,
          spellKey: "required buff",
          spellName: "Required Buff",
          spellId: "spell:required buff",
        },
        forbiddenBuff: {
          enabled: null,
          spellKey: null,
          spellName: null,
        },
      },
      {
        requiresSourceBuff: null,
        requiredBuff: {
          enabled: null,
          spellKey: null,
          spellName: null,
        },
        forbiddenBuff: {
          enabled: false,
          spellKey: "forbidden buff",
          spellName: "Forbidden Buff",
          spellId: "spell:forbidden buff",
        },
      },
    ]);
    expect(invalid?.effects).toMatchObject([
      {
        type: "damage",
        conditions: {
          requiresSourceBuff: null,
        },
      },
      {
        type: "trigger",
        conditions: {
          requiresSourceBuff: null,
          requiredBuff: {
            enabled: true,
            spellKey: null,
            spellName: null,
          },
        },
      },
      {
        type: "trigger",
        conditions: {
          forbiddenBuff: {
            enabled: true,
            spellKey: null,
            spellName: null,
          },
        },
      },
      {
        type: "trigger",
        conditions: {
          requiredBuff: {
            enabled: null,
            spellKey: "missing buff",
            spellName: "Missing Buff",
          },
        },
      },
    ]);
    expect(
      result.diagnostics.filter(
        (diagnostic) =>
          diagnostic.code === "incomplete_spell_effect_buff_condition",
      ),
    ).toHaveLength(2);
    expect(
      result.diagnostics.filter(
        (diagnostic) =>
          diagnostic.code === "missing_spell_effect_buff_condition_target",
      ),
    ).toHaveLength(1);
    expect(
      result.diagnostics.filter(
        (diagnostic) =>
          diagnostic.code === "conflicting_spell_effect_condition_aliases",
      ),
    ).toHaveLength(1);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid_boolean",
          entityId: "spell:invalid conditions",
          details: expect.objectContaining({ value: "maybe" }),
        }),
        expect.objectContaining({
          code: "unknown_attribute",
          entityId: "spell:invalid conditions",
          details: {
            element: "effect",
            attribute: "requirebuff",
            value: "1",
          },
        }),
        expect.objectContaining({
          code: "dangling_reference",
          entityId: "spell:invalid conditions",
          details: expect.objectContaining({ reference: "Missing Buff" }),
        }),
      ]),
    );
    expect(
      result.diagnostics.some(
        (diagnostic) =>
          diagnostic.entityId === "spell:complete conditions" &&
          (diagnostic.code === "unknown_attribute" ||
            diagnostic.code === "incomplete_spell_effect_buff_condition" ||
            diagnostic.code === "dangling_reference"),
      ),
    ).toBe(false);
  });

  it("normalizes item modifiers and diagnoses invalid fields", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-item-modifiers-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    mkdirSync(sourceRoot);
    writeFileSync(
      path.join(sourceRoot, "itemDB.xml"),
      `<?xml version="1.0"?>
<items>
  <item name="Modifier Validation" type="weapon" level="2">
    <weapon crushing="2.5" voltaic="invalid" />
    <damageBuff slashing="-1" impossible="3" />
    <resistBuff toxic="3" />
    <primaryBuff amount="1" />
    <secondaryBuff id="6" amount="invalid" />
  </item>
</items>`,
    );
    const modifierManifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      modifierManifestPath,
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "item-modifier-test",
        sources: [
          {
            id: "modifier-source",
            label: "Modifier Source",
            kind: "fixture",
            precedence: 0,
            root: "source",
            files: [{ kind: "items", path: "itemDB.xml" }],
          },
        ],
      }),
    );

    const result = importDataset({
      manifestPath: modifierManifestPath,
      repositoryRoot: temporaryRoot,
    });

    expect(result.artifact.entities.items[0]).toMatchObject({
      modifiers: [
        { kind: "damage", sourceKey: "crushing", amount: 2.5 },
        { kind: "damage", sourceKey: "slashing", amount: -1 },
        { kind: "damage", sourceKey: "voltaic", amount: 0 },
        { kind: "resistance", sourceKey: "toxic", amount: 3 },
        { kind: "secondary", sourceKey: "6", amount: 0 },
      ],
    });
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "invalid_number",
        "unknown_item_modifier",
        "missing_item_modifier_key",
      ]),
    );
    expect(
      result.diagnostics.some(
        (diagnostic) =>
          diagnostic.code === "partially_supported_element" &&
          diagnostic.details?.element === "weapon",
      ),
    ).toBe(false);
    expect(
      result.diagnostics.some(
        (diagnostic) =>
          diagnostic.code === "unknown_element" &&
          ["damagebuff", "resistbuff", "primarybuff", "secondarybuff"].includes(
            String(diagnostic.details?.element).toLocaleLowerCase(),
          ),
      ),
    ).toBe(false);
  });

  it("normalizes encrustment outcomes and diagnoses invalid fields", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-encrustment-outcomes-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    mkdirSync(sourceRoot);
    writeFileSync(
      path.join(sourceRoot, "encrustDB.xml"),
      `<?xml version="1.0"?>
<encrustDB>
  <encrust name="Outcome Validation">
    <damagebuff crushing="1.5" impossible="3" />
    <primarybuff amount="1" />
    <power name="Invalid Chance" chance="2" />
  </encrust>
  <unstableEffect spell="Missing Name" />
  <unstableEffect name="Missing Spell" />
</encrustDB>`,
    );
    const outcomeManifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      outcomeManifestPath,
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "encrustment-outcome-test",
        sources: [
          {
            id: "outcome-source",
            label: "Outcome Source",
            kind: "fixture",
            precedence: 0,
            root: "source",
            files: [{ kind: "encrustments", path: "encrustDB.xml" }],
          },
        ],
      }),
    );

    const result = importDataset({
      manifestPath: outcomeManifestPath,
      repositoryRoot: temporaryRoot,
    });

    expect(result.artifact.entities.encrustments[0]).toMatchObject({
      modifiers: [{ kind: "damage", sourceKey: "crushing", amount: 1.5 }],
      powers: [{ name: "Invalid Chance", chance: 0 }],
    });
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "invalid_number",
        "unknown_encrustment_modifier",
        "missing_encrustment_modifier_key",
        "missing_instability_effect_name",
        "missing_instability_effect_spell",
      ]),
    );
  });

  it("normalizes ability metadata and diagnoses invalid fields", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-ability-modifiers-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    mkdirSync(sourceRoot);
    writeFileSync(
      path.join(sourceRoot, "skillDB.xml"),
      `<?xml version="1.0"?>
<skills>
  <skill id="modifier-skill" name="Modifier Skill" type="warrior">
    <tag level="1" />
  </skill>
  <ability name="Modifier Validation" skill="modifier-skill" startSkill="1">
    <damagebuff crushing="1.5" impossible="3" />
    <resistBuff toxic="-2" />
    <primaryBuff amount="1" />
    <secondaryBuff id="6" amount="invalid" />
    <flags trainingMode="1" />
    <recoverybuff note="missing amount" />
    <zorkmidbuff percent="invalid" />
    <triggerondodge percent="30" />
  </ability>
</skills>`,
    );
    const modifierManifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      modifierManifestPath,
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "ability-modifier-test",
        sources: [
          {
            id: "modifier-source",
            label: "Modifier Source",
            kind: "fixture",
            precedence: 0,
            root: "source",
            files: [{ kind: "skills", path: "skillDB.xml" }],
          },
        ],
      }),
    );

    const result = importDataset({
      manifestPath: modifierManifestPath,
      repositoryRoot: temporaryRoot,
    });

    expect(result.artifact.entities.abilities[0]).toMatchObject({
      modifiers: [
        { kind: "damage", sourceKey: "crushing", amount: 1.5 },
        { kind: "resistance", sourceKey: "toxic", amount: -2 },
        { kind: "secondary", sourceKey: "6", amount: 0 },
      ],
      sourceFlags: [{ sourceKey: "trainingMode", value: "1" }],
      recoveryBuffAmounts: [],
      currencyBuffPercents: [0],
      triggers: [],
    });
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "invalid_number",
        "unknown_ability_modifier",
        "missing_ability_modifier_key",
        "missing_ability_metadata_value",
        "missing_skill_tag_name",
        "missing_trigger_spell",
      ]),
    );
  });

  it("resolves duplicate monster modifiers before inheritance", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-monster-modifier-overrides-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    mkdirSync(sourceRoot);
    writeFileSync(
      path.join(sourceRoot, "monDB.xml"),
      `<?xml version="1.0"?>
<monsters>
  <monster name="Root Override">
    <stats numFig="1" numRog="0" numWiz="0" />
    <primarybuff id="2" amount="5" />
    <primarybuff id="2" amount="-1" />
  </monster>
  <monster name="Modifier Parent">
    <primarybuff id="2" amount="4" />
    <monster name="Modifier Child">
      <stats numFig="2" numRog="0" numWiz="0" />
      <primarybuff id="2" amount="7" />
      <primarybuff id="2" amount="1" />
    </monster>
  </monster>
</monsters>`,
    );
    const modifierManifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      modifierManifestPath,
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "monster-modifier-overrides-test",
        sources: [
          {
            id: "modifier-source",
            label: "Modifier source",
            kind: "fixture",
            precedence: 0,
            root: "source",
            files: [{ kind: "monsters", path: "monDB.xml" }],
          },
        ],
      }),
    );

    const result = importDataset({
      manifestPath: modifierManifestPath,
      repositoryRoot: temporaryRoot,
    });
    const monsters = new Map(
      result.artifact.entities.monsters.map((monster) => [
        monster.name,
        monster,
      ]),
    );

    expect(monsters.get("Root Override")?.modifiers).toEqual([
      { kind: "primary", sourceKey: "2", amount: -1 },
    ]);
    expect(monsters.get("Modifier Parent")?.modifiers).toEqual([
      { kind: "primary", sourceKey: "2", amount: 4 },
    ]);
    expect(monsters.get("Modifier Child")?.modifiers).toEqual([
      { kind: "primary", sourceKey: "2", amount: 1 },
    ]);
    expect(
      result.diagnostics.filter(
        (diagnostic) => diagnostic.code === "duplicate_monster_modifier",
      ),
    ).toEqual([
      expect.objectContaining({
        entityId: "monster:root override",
        details: {
          modifierKind: "primary",
          sourceKey: "2",
          overriddenAmount: 5,
          replacementAmount: -1,
        },
      }),
      expect.objectContaining({
        entityId: "monster:modifier child",
        details: {
          modifierKind: "primary",
          sourceKey: "2",
          overriddenAmount: 7,
          replacementAmount: 1,
        },
      }),
    ]);
  });

  it("preserves loss-aware monster AI and sight source metadata", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-monster-ai-metadata-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    mkdirSync(sourceRoot);
    writeFileSync(
      path.join(sourceRoot, "monDB.xml"),
      `<?xml version="1.0"?>
<monsters>
  <monster name="AI Not Supplied"><ai aggressiveness="1" span="4" futureflag="synthetic" /></monster>
  <monster name="AI Disabled"><ai invisible="0" chicken="0" cancharm="0" canparalyze="0" stealgold="0" stealpercentage="0" /><sight cone="270" modifier="1.25" futureSight="synthetic"><futureSightChild /></sight></monster>
  <monster name="AI Enabled"><ai invisible="1" chicken="1" cancharm="1" canparalyze="1" stealgold="1" stealPercentage="50" /><sight cone="-1" modifier="not-a-number" /></monster>
  <monster name="AI Invalid" special="yes"><ai invisible="invalid" chicken="yes" cancharm="2" canparalyze="TRUE" stealgold="" /></monster>
  <monster special="1" />
</monsters>`,
    );
    const aiManifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      aiManifestPath,
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "monster-ai-metadata-test",
        sources: [
          {
            id: "monster-ai-source",
            label: "Monster AI Source",
            kind: "fixture",
            precedence: 0,
            root: "source",
            files: [{ kind: "monsters", path: "monDB.xml" }],
          },
        ],
      }),
    );

    const result = importDataset({
      manifestPath: aiManifestPath,
      repositoryRoot: temporaryRoot,
    });

    expect(
      result.artifact.entities.monsters.map((monster) => [
        monster.name,
        { ai: monster.ai, sight: monster.sight },
      ]),
    ).toEqual([
      [
        "AI Disabled",
        {
          ai: {
            aggressiveness: null,
            span: null,
            invisible: false,
            chicken: false,
            canCharm: false,
            canParalyze: false,
            stealGold: false,
            stealPercentage: 0,
          },
          sight: { cone: 270, modifier: 1.25 },
        },
      ],
      [
        "AI Enabled",
        {
          ai: {
            aggressiveness: null,
            span: null,
            invisible: true,
            chicken: true,
            canCharm: true,
            canParalyze: true,
            stealGold: true,
            stealPercentage: 50,
          },
          sight: { cone: 0, modifier: 0 },
        },
      ],
      [
        "AI Invalid",
        {
          ai: {
            aggressiveness: null,
            span: null,
            invisible: null,
            chicken: null,
            canCharm: null,
            canParalyze: null,
            stealGold: null,
            stealPercentage: null,
          },
          sight: { cone: null, modifier: null },
        },
      ],
      [
        "AI Not Supplied",
        {
          ai: {
            aggressiveness: 1,
            span: 4,
            invisible: null,
            chicken: null,
            canCharm: null,
            canParalyze: null,
            stealGold: null,
            stealPercentage: null,
          },
          sight: { cone: null, modifier: null },
        },
      ],
    ]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "unknown_attribute",
        entityId: "monster:ai not supplied",
        details: { element: "ai", attribute: "futureflag" },
      }),
    );
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "unknown_attribute",
        entityId: "monster:ai disabled",
        details: { element: "sight", attribute: "futureSight" },
      }),
    );
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "unknown_element",
        entityId: "monster:ai disabled",
        details: { element: "futureSightChild" },
      }),
    );
    expect(
      result.diagnostics.filter(
        (diagnostic) =>
          diagnostic.code === "invalid_boolean" &&
          diagnostic.entityId === "monster:ai invalid",
      ),
    ).toHaveLength(6);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "missing_entity_name",
      }),
    );
    expect(
      result.diagnostics.filter(
        (diagnostic) =>
          diagnostic.code === "invalid_number" &&
          diagnostic.entityId === "monster:ai enabled",
      ),
    ).toHaveLength(2);
  });

  it("preserves local monster movement metadata and behavior spell hooks", () => {
    const temporaryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-monster-movement-metadata-"),
    );
    temporaryDirectories.push(temporaryRoot);
    const sourceRoot = path.join(temporaryRoot, "source");
    mkdirSync(sourceRoot);
    writeFileSync(
      path.join(sourceRoot, "monDB.xml"),
      `<?xml version="1.0"?>
<monsters>
  <monster name="Behavior Supplied">
    <dig percent="40" ambushpercent="25" blockedpercent="100" minturns="2" maxTurns="5" mindistance="3" futureDig="synthetic"><futureDigChild /></dig>
    <dash chance="75" speed="3" mindistance="2" interruptable="1" hitspell="Known Behavior Spell" missspell="Missing Behavior Spell" futureDash="synthetic"><futureDashChild /></dash>
    <charge chance="15" range="5" turns="3" interruptable="0" blockaction="1" targetself="0" spell="Known Behavior Spell" futureCharge="synthetic"><futureChargeChild /></charge>
    <ondeath percent="45" spell="Known Behavior Spell" futureDeath="synthetic"><futureDeathChild /></ondeath>
    <sfx attack="behavior_attack"><futurePresentationChild /></sfx>
  </monster>
  <monster name="Behavior Invalid">
    <dig percent="-1" ambushpercent="101" blockedpercent="-1" minturns="1.5" maxTurns="bad" mindistance="-3" />
    <dash chance="101" speed="-1" mindistance="bad" interruptable="invalid" hitspell="Known Behavior Spell" missspell="Known Behavior Spell" />
    <charge chance="-1" range="-1" turns="bad" interruptable="2" blockaction="yes" targetself="TRUE" spell="Known Behavior Spell" />
    <ondeath percent="101" spell="Known Behavior Spell" />
  </monster>
  <monster name="Behavior Absent" />
</monsters>`,
    );
    writeFileSync(
      path.join(sourceRoot, "spellDB.xml"),
      `<?xml version="1.0"?>
<spells><spell name="Known Behavior Spell" type="utility" /></spells>`,
    );
    const behaviorManifestPath = path.join(temporaryRoot, "manifest.json");
    writeFileSync(
      behaviorManifestPath,
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "monster-movement-metadata-test",
        sources: [
          {
            id: "monster-movement-source",
            label: "Monster Movement Source",
            kind: "fixture",
            precedence: 0,
            root: "source",
            files: [
              { kind: "monsters", path: "monDB.xml" },
              { kind: "spells", path: "spellDB.xml" },
            ],
          },
        ],
      }),
    );

    const result = importDataset({
      manifestPath: behaviorManifestPath,
      repositoryRoot: temporaryRoot,
    });
    const monsters = new Map(
      result.artifact.entities.monsters.map((monster) => [
        monster.name,
        monster,
      ]),
    );

    expect(monsters.get("Behavior Supplied")?.movement).toEqual({
      dig: {
        chance: 40,
        ambushChance: 25,
        blockedChance: 100,
        minimumTurns: 2,
        maximumTurns: 5,
        minimumDistance: 3,
      },
      dash: {
        chance: 75,
        speed: 3,
        minimumDistance: 2,
        interruptible: true,
      },
      charge: {
        chance: 15,
        range: 5,
        turns: 3,
        interruptible: false,
        blocksAction: true,
        targetsSelf: false,
      },
    });
    expect(monsters.get("Behavior Invalid")?.movement).toEqual({
      dig: {
        chance: 0,
        ambushChance: 0,
        blockedChance: 0,
        minimumTurns: 0,
        maximumTurns: 0,
        minimumDistance: 0,
      },
      dash: {
        chance: 0,
        speed: 0,
        minimumDistance: 0,
        interruptible: null,
      },
      charge: {
        chance: 0,
        range: 0,
        turns: 0,
        interruptible: null,
        blocksAction: null,
        targetsSelf: null,
      },
    });
    expect(monsters.get("Behavior Absent")?.movement).toEqual({
      dig: null,
      dash: null,
      charge: null,
    });
    expect(
      monsters.get("Behavior Supplied")?.presentation.soundEffects,
    ).toEqual({
      attack: "behavior_attack",
      death: null,
      hit: null,
      spell: null,
      digIn: null,
      digOut: null,
    });
    expect(monsters.get("Behavior Supplied")?.triggers).toMatchObject([
      {
        kind: "on-death",
        spellId: "spell:known behavior spell",
        chance: 45,
      },
      {
        kind: "dash-hit",
        spellId: "spell:known behavior spell",
        chance: 75,
      },
      {
        kind: "dash-miss",
        spellName: "Missing Behavior Spell",
        chance: 75,
      },
      {
        kind: "charge",
        spellId: "spell:known behavior spell",
        chance: 15,
      },
    ]);
    expect(
      result.diagnostics.filter(
        (diagnostic) =>
          diagnostic.code === "invalid_number" &&
          diagnostic.entityId === "monster:behavior invalid",
      ),
    ).toHaveLength(13);
    expect(
      result.diagnostics.filter(
        (diagnostic) =>
          diagnostic.code === "invalid_boolean" &&
          diagnostic.entityId === "monster:behavior invalid",
      ),
    ).toHaveLength(4);
    for (const [element, attribute] of [
      ["dig", "futureDig"],
      ["dash", "futureDash"],
      ["charge", "futureCharge"],
      ["ondeath", "futureDeath"],
    ]) {
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({
          code: "unknown_attribute",
          entityId: "monster:behavior supplied",
          details: { element, attribute },
        }),
      );
    }
    for (const element of [
      "futureDigChild",
      "futureDashChild",
      "futureChargeChild",
      "futureDeathChild",
      "futurePresentationChild",
    ]) {
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({
          code: "unknown_element",
          entityId: "monster:behavior supplied",
          details: { element },
        }),
      );
    }
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "dangling_reference",
        entityId: "monster:behavior supplied",
        details: expect.objectContaining({
          reference: "Missing Behavior Spell",
        }),
      }),
    );
  });

  it("produces byte-identical normalized artifacts and diagnostics", () => {
    const first = serializeOutputs(
      importDataset({ manifestPath, repositoryRoot }),
    );
    const second = serializeOutputs(
      importDataset({ manifestPath, repositoryRoot }),
    );

    expect(first).toEqual(second);
    expect(sha256(first.artifact)).toBe(sha256(second.artifact));
    expect(first.artifact).not.toContain(repositoryRoot);
    expect(first.diagnostics).not.toContain(repositoryRoot);
  });

  it("resolves precedence, relationships, inheritance, and expected failures", () => {
    const result = importDataset({ manifestPath, repositoryRoot });
    const blade = result.artifact.entities.items.find(
      (item) => item.name === "Clockwork Blade",
    );
    const itemByName = new Map(
      result.artifact.entities.items.map((item) => [item.name, item]),
    );
    const recipe = result.artifact.entities.recipes[0];
    const encrustment = result.artifact.entities.encrustments[0];
    const skill = result.artifact.entities.skills.find(
      (entry) => entry.name === "Clockwork Combat",
    );
    const measuredStrike = result.artifact.entities.abilities.find(
      (entry) => entry.name === "Measured Strike",
    );
    const followthrough = result.artifact.entities.abilities.find(
      (entry) => entry.name === "Clockwork Followthrough",
    );
    const inheritedMonster = result.artifact.entities.monsters.find(
      (monster) => monster.name === "Armored Training Diggle",
    );
    const parentMonster = result.artifact.entities.monsters.find(
      (monster) => monster.name === "Training Diggle",
    );
    const template = result.artifact.entities.templates[0];
    const clockworkSpark = result.artifact.entities.spells.find(
      (spell) => spell.name === "Clockwork Spark",
    );
    const clockworkEcho = result.artifact.entities.spells.find(
      (spell) => spell.name === "Clockwork Echo",
    );
    const diagnosticCodes = result.diagnostics.map(
      (diagnostic) => diagnostic.code,
    );

    expect(result.artifact.entities.items).toHaveLength(13);
    expect(result.artifact.entities.recipes).toHaveLength(1);
    expect(result.artifact.entities.encrustments).toHaveLength(1);
    expect(result.artifact.entities.skills).toHaveLength(1);
    expect(result.artifact.entities.abilities).toHaveLength(2);
    expect(result.artifact.entities.spells).toHaveLength(2);
    expect(result.artifact.entities.monsters).toHaveLength(2);
    expect(result.artifact.entities.stats).toHaveLength(2);
    expect(result.artifact.entities.templates).toHaveLength(1);
    expect(template).toMatchObject({
      name: "Small Cross",
      affectsPlayer: true,
      rows: [".@.", "@#@", ".@."],
      slug: "small-cross",
    });
    expect(clockworkSpark?.manaCosts).toEqual([
      { base: 12, savvyReduction: 0.25, minimum: 4 },
    ]);
    expect(clockworkSpark?.animations).toEqual([
      {
        spritePath: "sprites/sfx/synthetic/synthetic",
        frameCount: 6,
        frameRate: 80,
        firstFrame: 1,
        centered: true,
        synchronized: false,
        soundEffect: "clockwork_animation_audio_cue",
      },
    ]);
    expect(clockworkSpark?.impacts).toEqual([
      {
        spritePath: "sprites/sfx/synthetic-impact/synthetic-impact",
        frameCount: 5,
        frameRate: 70,
        firstFrame: 0,
        centered: false,
        synchronized: true,
        soundEffect: "clockwork_impact_audio_cue",
      },
    ]);
    expect(clockworkSpark?.buffs).toEqual([
      expect.objectContaining({
        timerMode: 1,
        duration: 8,
        manaUpkeep: 3,
        hitLimit: 2,
        attackLimit: 4,
        removable: true,
        affectsSelf: true,
        resistable: false,
        detrimental: false,
        stackable: true,
        allowStacking: true,
        stackLimit: 3,
        descriptions: [
          { text: "A measured clockwork ward surrounds the caster." },
        ],
        halos: [
          {
            spritePath: "sprites/sfx/clockwork-ward/clockwork-ward",
            frameCount: 4,
            frameRate: 120,
            firstFrame: 0,
            centered: true,
          },
        ],
        sourceFlags: [{ sourceKey: "tag", value: "clockwork" }],
        modifiers: [
          { kind: "damage", sourceKey: "crushing", amount: 2 },
          { kind: "damage", sourceKey: "voltaic", amount: -1 },
          { kind: "resistance", sourceKey: "toxic", amount: 3 },
          { kind: "primary", sourceKey: "2", amount: 1 },
          { kind: "secondary", sourceKey: "6", amount: 5 },
        ],
        sightModifiers: [{ amount: -2 }],
        eventHooks: [
          {
            kind: "target-hit",
            spellKey: "clockwork echo",
            spellName: "Clockwork Echo",
            spellId: "spell:clockwork echo",
            chance: 40,
            sourceFlags: [{ sourceKey: "after", value: "1" }],
          },
          {
            kind: "player-hit",
            spellKey: "missing buff echo",
            spellName: "Missing Buff Echo",
            chance: 25,
            sourceFlags: [],
          },
        ],
      }),
    ]);
    expect(clockworkEcho?.manaCosts).toEqual([]);
    expect(clockworkEcho?.animations).toEqual([]);
    expect(clockworkEcho?.impacts).toEqual([]);
    expect(clockworkEcho?.buffs).toEqual([]);
    expect(
      clockworkSpark?.effects.find((effect) => effect.type === "damage")
        ?.controls,
    ).toEqual({
      durationTurns: null,
      after: false,
      chancePercent: 40,
      affectsCaster: true,
      affectsSelf: false,
      affectsCorpses: true,
      resistable: false,
      burnsTarget: true,
      bleedsTarget: false,
      skipAnimation: null,
      taxonomy: "Construct",
    });
    expect(
      clockworkEcho?.effects.every((effect) =>
        Object.values(effect.controls).every((value) => value === null),
      ),
    ).toBe(true);
    expect(
      clockworkSpark?.effects.find(
        (effect) => effect.spellKey === "clockwork echo",
      )?.conditions,
    ).toEqual({
      requiresSourceBuff: null,
      requiredBuff: {
        enabled: true,
        spellKey: "clockwork spark",
        spellName: "Clockwork Spark",
        spellId: "spell:clockwork spark",
      },
      forbiddenBuff: {
        enabled: null,
        spellKey: null,
        spellName: null,
      },
    });
    expect(
      clockworkSpark?.effects.find(
        (effect) => effect.spellKey === "missing echo",
      )?.conditions.requiresSourceBuff,
    ).toBe(true);
    expect(
      clockworkEcho?.effects.find(
        (effect) => effect.spellKey === "clockwork spark",
      )?.conditions.forbiddenBuff,
    ).toEqual({
      enabled: true,
      spellKey: "clockwork spark",
      spellName: "Clockwork Spark",
      spellId: "spell:clockwork spark",
    });
    expect(blade?.modifiers).toEqual([
      { kind: "damage", sourceKey: "crushing", amount: 4 },
      { kind: "damage", sourceKey: "voltaic", amount: -1 },
      { kind: "resistance", sourceKey: "toxic", amount: 3 },
      { kind: "primary", sourceKey: "2", amount: 1 },
      { kind: "secondary", sourceKey: "6", amount: 5 },
    ]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "unsupported_spell_requirement",
        entityId: "spell:clockwork echo",
      }),
    );
    expect(result.artifact.schemaVersion).toBe(3);
    expect(result.artifact.datasetVersion).toBe("1.0.0");
    expect(result.artifact.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "synthetic-expansion",
          version: "1.0.0",
        }),
      ]),
    );
    expect(result.search.documents).toHaveLength(25);
    expect(result.search).toMatchObject({
      schemaVersion: 2,
      datasetSchemaVersion: 3,
      datasetId: "synthetic-architecture-spike",
    });
    expect(
      result.search.documents.find(
        (document) => document.id === "item:clockwork blade",
      )?.statKeys,
    ).toEqual([
      "melee power",
      "modifier:damage:crushing",
      "modifier:damage:voltaic",
      "modifier:primary:2",
      "modifier:resistance:toxic",
      "modifier:secondary:6",
    ]);
    expect(
      result.search.documents.find(
        (document) => document.id === "item:clockwork blade",
      )?.aliases,
    ).toEqual(["clockwork-blade-plus", "clockwork-sword"]);
    expect(
      result.search.documents.find(
        (document) => document.id === "monster:armored training diggle",
      ),
    ).toMatchObject({
      category: "Animal",
      url: "/monsters/armored-training-diggle",
    });
    expect(
      result.search.documents.find(
        (document) => document.id === "monster:armored training diggle",
      )?.text,
    ).toContain("clockwork echo");
    expect(
      result.search.documents.find(
        (document) => document.id === "monster:armored training diggle",
      )?.text,
    ).toContain("clockwork blade");
    expect(
      result.search.documents.find(
        (document) => document.id === "monster:training diggle",
      )?.text,
    ).toContain("artifact");
    expect(
      result.search.documents.find(
        (document) => document.id === "spell:clockwork spark",
      )?.text,
    ).toContain("a measured clockwork ward surrounds the caster");
    expect(
      result.search.documents.find(
        (document) => document.id === "template:small cross",
      ),
    ).toMatchObject({
      kind: "template",
      name: "Small Cross",
      url: "/templates/small-cross",
    });
    expect(blade).toMatchObject({
      price: 160,
      quality: 3,
      provenance: { sourceId: "synthetic-expansion" },
      slugAliases: ["clockwork-blade-plus", "clockwork-sword"],
      appliedPatches: [
        {
          id: "synthetic-clockwork-blade-value",
          file: "fixtures/synthetic/patches/clockwork-blade-value.json",
          sourceId: "synthetic-expansion",
          sourceVersion: "1.0.0",
          changes: [{ field: "price", previousValue: 155, value: 160 }],
        },
      ],
    });
    expect(blade?.variants.map((variant) => variant.sourceId)).toEqual([
      "synthetic-base",
      "synthetic-expansion",
    ]);
    expect(blade?.appliedOverrides[0]?.changedFields).toContain("quality");
    expect(blade?.appliedOverrides[0]?.changedFields).toContain("triggers");
    expect(blade?.appliedOverrides[0]?.changedFields).toContain(
      "weaponDeclarations",
    );
    expect(blade?.triggers).toEqual([
      {
        kind: "item-hit",
        spellKey: "clockwork spark",
        spellName: "Clockwork Spark",
        spellId: "spell:clockwork spark",
        chance: null,
        delay: 0,
        duration: 0,
        unresistable: false,
        monsterTaxonomy: null,
        sourceFlags: [],
      },
    ]);
    expect(itemByName.get("Training Cuirass")?.quality).toBe(4);
    expect(itemByName.get("Training Cuirass")?.armourDeclarations).toEqual([
      { slot: "chest", level: 4, randoms: 1 },
    ]);
    expect(itemByName.get("Training Trap")?.quality).toBe(5);
    expect(itemByName.get("Clarity Tonic")?.quality).toBe(0);
    expect(blade?.category).toBe("weapon:sword");
    expect(blade?.artifacts).toEqual([{ quality: 8 }]);
    expect(blade?.weaponDeclarations).toEqual([
      {
        canTargetFloor: true,
        thrownPath: "assets/clockwork-blade.svg",
      },
    ]);
    expect(itemByName.get("Brass Ingot")?.category).toBe("material");
    expect(itemByName.get("Clarity Tonic")?.category).toBe("potion");
    expect(itemByName.get("Training Cuirass")?.category).toBe("armour:chest");
    expect(itemByName.get("Training Gem")?.category).toBe("gem");
    expect(itemByName.get("Training Smithing Kit")?.category).toBe("toolkit");
    expect(itemByName.get("Training Trap")?.category).toBe("trap");
    expect(itemByName.get("Training Wand +1")?.category).toBe("wand");
    expect(itemByName.get("Training Ration")?.recoveries).toEqual([
      {
        resource: "life",
        amount: 10,
        sourceFlags: [{ sourceKey: "meat", value: "1" }],
      },
    ]);
    expect(itemByName.get("Training Grog")?.recoveries).toEqual([
      { resource: "mana", amount: 8, sourceFlags: [] },
    ]);
    expect(itemByName.get("Training Wand +1")?.chargeRanges).toEqual([
      { minimum: 2, maximum: 4 },
    ]);
    expect(itemByName.get("Training Trap")?.traps).toEqual([
      {
        activation: "once",
        level: 5,
        targetsCaster: true,
        originPath: "assets/synthetic.svg",
        originMount: "wall",
        originFacing: "south",
      },
    ]);
    expect(itemByName.get("Training Relic")?.macguffinDeclarations).toEqual([
      {
        spellKey: "clockwork echo",
        spellName: "Clockwork Echo",
        spellId: "spell:clockwork echo",
        itemClassName: "Training Curiosity",
        consumable: false,
      },
    ]);
    expect(
      itemByName.get("Training Smithing Kit")?.toolkitDeclarations,
    ).toEqual([
      {
        tag: "smithing",
        numSlots: 2,
        soundCue: "training_smithing",
        missingPath: "assets/synthetic.svg",
        presentPath: "assets/synthetic.svg",
        activePath: "assets/synthetic.svg",
        slotBounds: [
          { slot: 1, x1: 10, y1: 20, x2: 30, y2: 40 },
          { slot: 2, x1: 50, y1: 60, x2: 70, y2: 80 },
        ],
        outputBounds: { x1: 90, y1: 100, x2: 110, y2: 120 },
        craftButton: {
          path: "assets/synthetic.svg",
          positionX: 130,
          positionY: 140,
        },
        recipeButton: {
          path: "assets/synthetic.svg",
          positionX: 150,
          positionY: 160,
        },
        autofillButton: {
          path: "assets/synthetic.svg",
          positionX: 170,
          positionY: 180,
        },
        closePosition: { x: 190, y: 200 },
        backgroundPath: "assets/synthetic.svg",
      },
    ]);
    expect(
      result.search.documents.find(
        (document) => document.id === "item:training relic",
      )?.text,
    ).toContain("clockwork echo training curiosity");
    expect(
      result.search.documents.find(
        (document) => document.id === "item:training smithing kit",
      )?.text,
    ).toContain("smithing training_smithing");
    expect(itemByName.get("Clarity Tonic")?.triggers).toEqual([
      expect.objectContaining({
        kind: "quaffed",
        spellId: "spell:clockwork spark",
      }),
    ]);
    expect(itemByName.get("Training Mushroom")?.triggers).toEqual([
      expect.objectContaining({
        kind: "munched",
        spellId: "spell:clockwork echo",
      }),
    ]);
    expect(
      result.diagnostics.filter(
        (diagnostic) =>
          diagnostic.entityId === "item:training gem" &&
          diagnostic.details?.element === "gem",
      ),
    ).toEqual([]);
    expect(itemByName.get("Training Cuirass")?.triggers).toEqual([
      expect.objectContaining({
        kind: "melee-target",
        spellId: "spell:clockwork echo",
        chance: 25,
        monsterTaxonomy: "Animal",
        sourceFlags: [],
      }),
      expect.objectContaining({
        kind: "kill-target",
        spellId: "spell:clockwork spark",
        chance: 40,
        sourceFlags: [{ sourceKey: "after", value: "1" }],
      }),
      expect.objectContaining({
        kind: "melee-self",
        spellId: "spell:clockwork echo",
        chance: 30,
        sourceFlags: [],
      }),
      expect.objectContaining({
        kind: "trigger-repeat",
        spellId: "spell:clockwork spark",
        chance: 50,
        duration: 3,
        unresistable: true,
        sourceFlags: [],
      }),
    ]);
    expect(itemByName.get("Training Trap")?.triggers).toEqual([
      expect.objectContaining({
        kind: "stepped-on",
        spellName: "Synthetic Spark",
      }),
    ]);
    expect(itemByName.get("Training Trap")?.triggers[0]?.spellId).toBe(
      undefined,
    );
    expect(encrustment).toMatchObject({
      id: "encrustment:synthetic gear polish",
      slug: "synthetic-gear-polish",
      description: "A stable synthetic coating for training weapons.",
      tool: "smithing",
      hidden: false,
      skillLevel: 2,
      slots: ["ranged", "weapon"],
      instability: 5,
      modifiers: [
        { kind: "damage", sourceKey: "crushing", amount: 2 },
        { kind: "damage", sourceKey: "voltaic", amount: -1 },
        { kind: "resistance", sourceKey: "toxic", amount: 3 },
        { kind: "primary", sourceKey: "2", amount: 1 },
        { kind: "secondary", sourceKey: "6", amount: 1 },
      ],
      powers: [{ name: "Synthetic Pulse", chance: 0.25 }],
      appearanceDescriptors: ["polished brass"],
      inputs: [
        expect.objectContaining({
          itemName: "Brass Ingot",
          amount: 1,
          itemId: "item:brass ingot",
        }),
        expect.objectContaining({
          itemName: "Missing Polish",
          amount: 1,
        }),
      ],
    });
    expect(result.artifact.encrustmentInstabilityEffects).toEqual([
      expect.objectContaining({
        name: "Broken Mishap",
        spellKey: "missing instability spell",
        spellName: "Missing Instability Spell",
      }),
      expect.objectContaining({
        name: "Synthetic Mishap",
        spellKey: "clockwork spark",
        spellName: "Clockwork Spark",
        spellId: "spell:clockwork spark",
      }),
    ]);
    expect(skill).toMatchObject({
      archetype: "warrior",
      loadouts: [
        {
          itemKey: "brass ingot",
          itemName: "Brass Ingot",
          itemId: "item:brass ingot",
          amount: 1,
          always: true,
        },
        {
          itemKey: "missing kit",
          itemName: "Missing Kit",
          itemType: "weapon",
          amount: 2,
          always: false,
        },
        { itemType: "food", amount: 3, always: false },
      ],
      abilityIds: [
        "ability:measured strike",
        "ability:clockwork followthrough",
      ],
      sourceFlags: [
        { sourceKey: "friendlyTaxa", value: "Construct" },
        { sourceKey: "trainingMode", value: "1" },
      ],
      progressionTags: [
        { level: 0, name: "Clockwork Trainee" },
        { level: 1, name: "Clockwork Mechanist" },
      ],
    });
    expect(measuredStrike).toMatchObject({
      skillId: "skill:clockwork combat",
      level: 0,
      startSkill: true,
      modifiers: [
        { kind: "damage", sourceKey: "crushing", amount: 2 },
        { kind: "damage", sourceKey: "voltaic", amount: -1 },
        { kind: "resistance", sourceKey: "toxic", amount: 3 },
        { kind: "primary", sourceKey: "2", amount: 1 },
        { kind: "secondary", sourceKey: "6", amount: -2 },
      ],
      sourceFlags: [{ sourceKey: "trainingMode", value: "1" }],
      recoveryBuffAmounts: [5],
      currencyBuffPercents: [0.1],
      triggers: [
        {
          kind: "dodge",
          spellName: "Clockwork Echo",
          spellId: "spell:clockwork echo",
          chance: 30,
        },
        {
          kind: "activated",
          spellName: "Clockwork Spark",
          spellId: "spell:clockwork spark",
        },
        {
          kind: "activated",
          spellName: "Missing Ability Spell",
        },
      ],
      spellIds: ["spell:clockwork echo", "spell:clockwork spark"],
    });
    expect(followthrough).toMatchObject({
      skillId: "skill:clockwork combat",
      level: 1,
      startSkill: false,
      triggers: [
        {
          kind: "melee-target",
          spellName: "Clockwork Echo",
          spellId: "spell:clockwork echo",
          chance: 25,
        },
      ],
      spellIds: ["spell:clockwork echo"],
    });
    expect(encrustment?.inputs[1]?.itemId).toBeUndefined();
    expect(recipe?.outputs[0]?.itemId).toBe(blade?.id);
    expect(
      recipe?.inputs.find((input) => input.itemName === "Missing Cog")?.itemId,
    ).toBe(undefined);
    expect(inheritedMonster).toMatchObject({
      taxonomy: "Animal",
      depth: 2,
      special: false,
      iconPath: "assets/synthetic.svg",
      paletteName: "Synthetic brass",
      paletteTint: 45,
      archetypeLevels: { fighter: 2, rogue: 0, wizard: 0 },
      ai: {
        aggressiveness: 4,
        span: 10,
        invisible: true,
        chicken: true,
        canCharm: false,
        canParalyze: false,
        stealGold: true,
        stealPercentage: 20,
      },
      sight: { cone: 270, modifier: 1.25 },
      movement: {
        dig: {
          chance: 40,
          ambushChance: 25,
          blockedChance: 100,
          minimumTurns: 2,
          maximumTurns: 5,
          minimumDistance: 3,
        },
        dash: {
          chance: 75,
          speed: 3,
          minimumDistance: 2,
          interruptible: true,
        },
        charge: {
          chance: 15,
          range: 5,
          turns: 3,
          interruptible: false,
          blocksAction: true,
          targetsSelf: false,
        },
      },
      presentation: {
        soundEffects: {
          attack: "assets/synthetic.svg",
          death: "assets/synthetic.svg",
          hit: "assets/synthetic.svg",
          spell: "assets/synthetic.svg",
          digIn: "assets/synthetic.svg",
          digOut: "assets/synthetic.svg",
        },
        attack: {
          down: "assets/synthetic.svg",
          left: "assets/synthetic.svg",
          right: "assets/synthetic.svg",
          up: "assets/synthetic.svg",
        },
        hit: {
          down: "assets/synthetic.svg",
          left: "assets/synthetic.svg",
          right: "assets/synthetic.svg",
          up: "assets/synthetic.svg",
        },
        death: { name: "assets/synthetic.svg" },
        cast: { name: "assets/synthetic.svg" },
        beam: {
          down: "assets/synthetic.svg",
          left: "assets/synthetic.svg",
          right: "assets/synthetic.svg",
          up: "assets/synthetic.svg",
        },
        morph: {
          drink: "assets/synthetic.svg",
          eat: "assets/synthetic.svg",
          femaleLevelUp: "assets/synthetic.svg",
          maleLevelUp: "assets/synthetic.svg",
          longIdle: "assets/synthetic.svg",
          vanish: "assets/synthetic.svg",
        },
        dig: {
          down: "assets/synthetic.svg",
          up: "assets/synthetic.svg",
        },
      },
      experienceValue: 10,
      modifiers: [
        { kind: "damage", sourceKey: "crushing", amount: 3 },
        { kind: "damage", sourceKey: "voltaic", amount: -1 },
        { kind: "resistance", sourceKey: "toxic", amount: 2 },
        { kind: "primary", sourceKey: "2", amount: 1 },
        { kind: "secondary", sourceKey: "6", amount: 1 },
      ],
      spellChance: 20,
      triggers: [
        {
          kind: "on-hit",
          spellKey: "missing monster spell",
          spellName: "Missing Monster Spell",
          chance: 33,
          oneChanceIn: 3,
        },
        {
          kind: "cast-when-aware",
          spellKey: "clockwork echo",
          spellName: "Clockwork Echo",
          spellId: "spell:clockwork echo",
          chance: 20,
          oneChanceIn: null,
        },
        {
          kind: "on-death",
          spellId: "spell:clockwork spark",
          chance: 45,
          oneChanceIn: null,
        },
        {
          kind: "dash-hit",
          spellId: "spell:clockwork spark",
          chance: 75,
          oneChanceIn: null,
        },
        {
          kind: "dash-miss",
          spellName: "Missing Dash Spell",
          chance: 75,
          oneChanceIn: null,
        },
        {
          kind: "charge",
          spellId: "spell:clockwork echo",
          chance: 15,
          oneChanceIn: null,
        },
      ],
      drops: [
        {
          itemKey: "clockwork blade",
          itemName: "Clockwork Blade",
          itemId: "item:clockwork blade",
          chance: 40,
        },
        {
          itemKey: "missing monster loot",
          itemName: "Missing Monster Loot",
          chance: 10,
        },
      ],
      inheritsId: "monster:training diggle",
    });
    expect(parentMonster).toMatchObject({
      ai: {
        aggressiveness: 1,
        span: 8,
        invisible: null,
        chicken: null,
        canCharm: null,
        canParalyze: null,
        stealGold: null,
        stealPercentage: null,
      },
      sight: { cone: null, modifier: null },
      movement: { dig: null, dash: null, charge: null },
      presentation: {
        soundEffects: null,
        attack: null,
        hit: null,
        death: null,
        cast: null,
        beam: null,
        morph: null,
        dig: null,
      },
      spellChance: 20,
      triggers: [
        {
          kind: "on-hit",
          spellId: "spell:clockwork echo",
          chance: 25,
          oneChanceIn: 4,
        },
        {
          kind: "cast-when-aware",
          spellId: "spell:clockwork spark",
          chance: 20,
          oneChanceIn: null,
        },
      ],
      drops: [
        {
          itemKey: "brass ingot",
          itemName: "Brass Ingot",
          itemId: "item:brass ingot",
          chance: 75,
        },
        { dropType: "artifact", chance: 100 },
      ],
    });
    const trainingWands = result.artifact.entities.items.filter((item) =>
      item.name.startsWith("Training Wand"),
    );
    expect(trainingWands).toHaveLength(2);
    expect(new Set(trainingWands.map((item) => item.slug)).size).toBe(2);
    expect(trainingWands.some((item) => item.slug === "training-wand-1")).toBe(
      true,
    );
    expect(diagnosticCodes).toEqual(
      expect.arrayContaining([
        "duplicate_entity",
        "invalid_xml",
        "dangling_reference",
        "missing_asset",
        "unknown_element",
        "partially_supported_element",
        "slug_collision",
        "patch_applied",
        "route_registry_applied",
      ]),
    );
    expect(
      result.diagnostics.filter(
        (diagnostic) =>
          (diagnostic.entityId?.startsWith("skill:") ||
            diagnostic.entityId?.startsWith("ability:")) &&
          (diagnostic.code === "unknown_element" ||
            diagnostic.code === "partially_supported_element"),
      ),
    ).toEqual([]);
    expect(
      result.diagnostics.filter(
        (diagnostic) =>
          diagnostic.code === "partially_supported_element" &&
          ["casts", "food", "mushroom", "potion", "wand"].includes(
            String(diagnostic.details?.element),
          ),
      ),
    ).toEqual([]);
    expect(
      result.diagnostics.filter(
        (diagnostic) =>
          diagnostic.entityId?.startsWith("monster:") &&
          [
            "damage",
            "resistances",
            "primarybuff",
            "secondarybuff",
            "palette",
            "stats",
            "spell",
            "onhit",
            "onHit",
            "drop",
          ].includes(String(diagnostic.details?.element)),
      ),
    ).toEqual([]);
    expect(
      result.diagnostics.find(
        (diagnostic) =>
          diagnostic.entityId === "monster:armored training diggle" &&
          diagnostic.code === "dangling_reference" &&
          diagnostic.details?.reference === "Missing Monster Spell",
      ),
    ).toBeDefined();
    expect(
      result.diagnostics.find(
        (diagnostic) =>
          diagnostic.entityId === "monster:armored training diggle" &&
          diagnostic.code === "dangling_reference" &&
          diagnostic.details?.reference === "Missing Monster Loot",
      ),
    ).toBeDefined();
    expect(result.inputs.map((input) => input.file)).toContain(
      "fixtures/synthetic/patches/clockwork-blade-value.json",
    );
    expect(result.inputs.map((input) => input.file)).toContain(
      "fixtures/synthetic/routes.json",
    );
    expect(
      result.diagnostics.find((diagnostic) => diagnostic.code === "invalid_xml")
        ?.source?.line,
    ).toBeGreaterThan(1);
    expect(
      result.diagnostics.filter(
        (diagnostic) => diagnostic.code === "missing_asset",
      ),
    ).toHaveLength(1);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "dangling_reference",
        entityId: "spell:clockwork spark",
        details: { targetKind: "spell", reference: "Missing Buff Echo" },
      }),
    );
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "dangling_reference",
        entityId: "item:training trap",
        details: expect.objectContaining({
          targetKind: "spell",
          reference: "Synthetic Spark",
        }),
      }),
    );
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "dangling_reference",
        entityId: "skill:clockwork combat",
        details: { targetKind: "item", reference: "Missing Kit" },
      }),
    );
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "dangling_reference",
        entityId: "ability:measured strike",
        details: {
          targetKind: "spell",
          reference: "Missing Ability Spell",
        },
      }),
    );
    expect(
      result.diagnostics.find(
        (diagnostic) =>
          diagnostic.code === "partially_supported_element" &&
          diagnostic.entityId === "item:training trap" &&
          diagnostic.details?.element === "trap",
      ),
    ).toBeUndefined();
    expect(
      result.diagnostics.find(
        (diagnostic) =>
          diagnostic.code === "partially_supported_element" &&
          diagnostic.entityId === "item:clockwork blade" &&
          diagnostic.details?.element === "weapon",
      ),
    ).toBeUndefined();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "dangling_reference",
        entityId: "encrustment:synthetic gear polish",
        details: expect.objectContaining({
          targetKind: "item",
          reference: "Missing Polish",
        }),
      }),
    );
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "dangling_reference",
        details: {
          targetKind: "spell",
          reference: "Missing Instability Spell",
          instabilityEffectName: "Broken Mishap",
        },
      }),
    );
  });

  it("writes checksummed artifacts outside source roots", () => {
    const result = importDataset({ manifestPath, repositoryRoot });
    const outputDirectory = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-spike-"),
    );
    temporaryDirectories.push(outputDirectory);
    writeFileSync(path.join(outputDirectory, "artifact.json"), "{");
    const outputs = writeOutputs(result, outputDirectory);
    const artifactFile = readFileSync(
      path.join(outputDirectory, "artifact.json"),
      "utf8",
    );
    const manifest = JSON.parse(
      readFileSync(path.join(outputDirectory, "manifest.json"), "utf8"),
    ) as {
      schemaVersion: number;
      outputs: {
        artifact: { sha256: string; bytes: number };
        search: { sha256: string; bytes: number };
      };
    };
    const searchFile = readFileSync(
      path.join(outputDirectory, "search.json"),
      "utf8",
    );

    expect(manifest.schemaVersion).toBe(2);
    expect(artifactFile).toBe(outputs.artifact);
    expect(manifest.outputs.artifact.sha256).toBe(sha256(artifactFile));
    expect(manifest.outputs.artifact.bytes).toBe(
      Buffer.byteLength(artifactFile),
    );
    expect(searchFile).toBe(outputs.search);
    expect(manifest.outputs.search.sha256).toBe(sha256(searchFile));
    expect(manifest.outputs.search.bytes).toBe(Buffer.byteLength(searchFile));
    expect(
      readdirSync(outputDirectory).some((file) => file.endsWith(".tmp")),
    ).toBe(false);
  });
});
