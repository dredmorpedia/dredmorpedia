import {
  mkdtempSync,
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

    expect(result.artifact.entities.items).toHaveLength(3);
    expect(result.artifact.entities.recipes).toHaveLength(1);
    expect(result.artifact.entities.skills).toHaveLength(1);
    expect(result.artifact.entities.abilities).toHaveLength(1);
    expect(result.artifact.entities.spells).toHaveLength(2);
    expect(result.artifact.entities.monsters).toHaveLength(2);
    expect(result.artifact.entities.stats).toHaveLength(2);
    expect(result.artifact.entities.templates).toHaveLength(1);
    expect(result.artifact.searchDocuments).toHaveLength(13);
    expect(blade).toMatchObject({
      price: 155,
      provenance: { sourceId: "synthetic-expansion" },
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
    expect(diagnosticCodes).toEqual(
      expect.arrayContaining([
        "duplicate_entity",
        "invalid_xml",
        "dangling_reference",
        "missing_asset",
        "unknown_element",
      ]),
    );
    expect(
      result.diagnostics.find((diagnostic) => diagnostic.code === "invalid_xml")
        ?.source?.line,
    ).toBeGreaterThan(1);
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
    ) as { outputs: { artifact: { sha256: string; bytes: number } } };

    expect(artifactFile).toBe(outputs.artifact);
    expect(manifest.outputs.artifact.sha256).toBe(sha256(artifactFile));
    expect(manifest.outputs.artifact.bytes).toBe(
      Buffer.byteLength(artifactFile),
    );
    expect(
      readdirSync(outputDirectory).some((file) => file.endsWith(".tmp")),
    ).toBe(false);
  });
});
