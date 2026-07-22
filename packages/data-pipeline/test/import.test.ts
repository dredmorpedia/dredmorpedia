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
    <impact sprite="C:\\outside" frames="-2" framerate="2.5" firstframe="bad" centerEffect="maybe" sync="2" futureImpact="retained"><futureImpactChild /></impact>
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
          details: { assetPath: "C:/outside" },
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
    ).toHaveLength(7);
    expect(
      result.diagnostics.filter(
        (diagnostic) => diagnostic.code === "invalid_boolean",
      ),
    ).toHaveLength(6);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
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
          details: { element: "futureChild" },
        }),
      ]),
    );
    expect(
      result.diagnostics.some(
        (diagnostic) =>
          diagnostic.details?.element === "sightbuff" &&
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
        "partially_supported_element",
      ]),
    );
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

    expect(result.artifact.entities.items).toHaveLength(7);
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
    expect(result.search.documents).toHaveLength(19);
    expect(result.search).toMatchObject({
      schemaVersion: 1,
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
    expect(itemByName.get("Training Trap")?.quality).toBe(5);
    expect(itemByName.get("Clarity Tonic")?.quality).toBe(0);
    expect(blade?.category).toBe("weapon:sword");
    expect(blade?.artifacts).toEqual([{ quality: 8 }]);
    expect(itemByName.get("Brass Ingot")?.category).toBe("material");
    expect(itemByName.get("Clarity Tonic")?.category).toBe("potion");
    expect(itemByName.get("Training Cuirass")?.category).toBe("armour:chest");
    expect(itemByName.get("Training Trap")?.category).toBe("trap");
    expect(itemByName.get("Training Wand +1")?.category).toBe("wand");
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
