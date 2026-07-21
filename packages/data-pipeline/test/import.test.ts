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
      ]),
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
    const inheritedMonster = result.artifact.entities.monsters.find(
      (monster) => monster.name === "Armored Training Diggle",
    );
    const diagnosticCodes = result.diagnostics.map(
      (diagnostic) => diagnostic.code,
    );

    expect(result.artifact.entities.items).toHaveLength(7);
    expect(result.artifact.entities.recipes).toHaveLength(1);
    expect(result.artifact.entities.encrustments).toHaveLength(1);
    expect(result.artifact.entities.skills).toHaveLength(1);
    expect(result.artifact.entities.abilities).toHaveLength(1);
    expect(result.artifact.entities.spells).toHaveLength(2);
    expect(result.artifact.entities.monsters).toHaveLength(2);
    expect(result.artifact.entities.stats).toHaveLength(2);
    expect(result.artifact.entities.templates).toHaveLength(1);
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
    expect(result.search.documents).toHaveLength(18);
    expect(result.search).toMatchObject({
      schemaVersion: 1,
      datasetSchemaVersion: 3,
      datasetId: "synthetic-architecture-spike",
    });
    expect(
      result.search.documents.find(
        (document) => document.id === "item:clockwork blade",
      )?.statKeys,
    ).toEqual(["melee power"]);
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
      },
    ]);
    expect(itemByName.get("Training Cuirass")?.quality).toBe(4);
    expect(itemByName.get("Training Trap")?.quality).toBe(5);
    expect(itemByName.get("Clarity Tonic")?.quality).toBe(0);
    expect(itemByName.get("Clarity Tonic")?.triggers).toEqual([
      expect.objectContaining({
        kind: "quaffed",
        spellId: "spell:clockwork spark",
      }),
    ]);
    expect(itemByName.get("Training Cuirass")?.triggers).toEqual([
      expect.objectContaining({
        kind: "melee-target",
        spellId: "spell:clockwork echo",
        chance: 25,
        monsterTaxonomy: "Animal",
      }),
      expect.objectContaining({
        kind: "trigger-repeat",
        spellId: "spell:clockwork spark",
        chance: 50,
        duration: 3,
        unresistable: true,
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
    expect(encrustment?.inputs[1]?.itemId).toBeUndefined();
    expect(recipe?.outputs[0]?.itemId).toBe(blade?.id);
    expect(
      recipe?.inputs.find((input) => input.itemName === "Missing Cog")?.itemId,
    ).toBe(undefined);
    expect(inheritedMonster).toMatchObject({
      taxonomy: "Animal",
      iconPath: "assets/synthetic.svg",
      inheritsId: "monster:training diggle",
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
        "unsupported_encrustment_effects",
        "slug_collision",
        "patch_applied",
        "route_registry_applied",
      ]),
    );
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
        entityId: "item:training trap",
        details: expect.objectContaining({
          targetKind: "spell",
          reference: "Synthetic Spark",
        }),
      }),
    );
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "partially_supported_element",
        entityId: "item:training trap",
        details: { element: "trap" },
      }),
    );
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
        code: "unsupported_encrustment_effects",
        details: { count: 1 },
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
