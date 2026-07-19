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
    const recipe = result.artifact.entities.recipes[0];
    const inheritedMonster = result.artifact.entities.monsters.find(
      (monster) => monster.name === "Armored Training Diggle",
    );
    const diagnosticCodes = result.diagnostics.map(
      (diagnostic) => diagnostic.code,
    );

    expect(result.artifact.entities.items).toHaveLength(5);
    expect(result.artifact.entities.recipes).toHaveLength(1);
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
    expect(result.search.documents).toHaveLength(15);
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
      provenance: { sourceId: "synthetic-expansion" },
      slugAliases: ["clockwork-blade-plus"],
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
        "unsupported_database_kind",
        "slug_collision",
        "patch_applied",
      ]),
    );
    expect(result.inputs.map((input) => input.file)).toContain(
      "fixtures/synthetic/patches/clockwork-blade-value.json",
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
