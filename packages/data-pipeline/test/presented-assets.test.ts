import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  importDataset,
  serializePresentedAssets,
  writePresentedAssets,
} from "../src/index";

const temporaryDirectories: string[] = [];
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function fixtureRepository(): {
  repositoryRoot: string;
  manifestPath: string;
  iconPath: string;
  iconBytes: Buffer;
} {
  const repositoryRoot = mkdtempSync(
    path.join(tmpdir(), "dredmorpedia-presented-assets-"),
  );
  temporaryDirectories.push(repositoryRoot);
  const sourceRoot = path.join(repositoryRoot, "source");
  const assetsRoot = path.join(sourceRoot, "assets");
  mkdirSync(assetsRoot, { recursive: true });
  const iconBytes = Buffer.concat([pngSignature, Buffer.from("fixture-icon")]);
  const iconPath = path.join(assetsRoot, "icon.png");
  writeFileSync(iconPath, iconBytes);
  writeFileSync(path.join(assetsRoot, "fixture.svg"), "<svg />");
  writeFileSync(path.join(assetsRoot, "invalid.png"), "not a png");
  writeFileSync(
    path.join(sourceRoot, "itemDB.xml"),
    `
<items>
  <item name="Copied Icon" iconFile="assets/icon.png" />
  <item name="Shared Icon" iconFile="assets/icon.png" />
  <item name="Missing Icon" iconFile="assets/missing.png" />
  <item name="Unsupported Icon" iconFile="assets/fixture.svg" />
  <item name="Invalid Icon" iconFile="assets/invalid.png" />
</items>`,
  );
  writeFileSync(
    path.join(sourceRoot, "skillDB.xml"),
    `
<skills>
  <skill name="Copied Skill"><art icon="assets/icon.png" /></skill>
</skills>`,
  );
  const manifestPath = path.join(repositoryRoot, "manifest.json");
  writeFileSync(
    manifestPath,
    JSON.stringify({
      schemaVersion: 1,
      datasetId: "presented-assets-test",
      sources: [
        {
          id: "fixture",
          label: "Fixture",
          kind: "fixture",
          precedence: 0,
          root: "source",
          files: [
            { kind: "items", path: "itemDB.xml" },
            { kind: "skills", path: "skillDB.xml" },
          ],
        },
      ],
    }),
  );
  return { repositoryRoot, manifestPath, iconPath, iconBytes };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("presented asset import", () => {
  it("copies only supported entity icons from their first registered bytes", () => {
    const { repositoryRoot, manifestPath, iconPath, iconBytes } =
      fixtureRepository();
    const result = importDataset({ manifestPath, repositoryRoot });
    const first = serializePresentedAssets(result);
    const second = serializePresentedAssets(result);

    expect(first.assets).toBe(second.assets);
    expect(first.diagnostics).toBe(second.diagnostics);
    expect(first.manifest).toBe(second.manifest);
    expect(first.files.size).toBe(1);
    const catalog = JSON.parse(first.assets) as {
      assets: { kind: string; entityId: string; file: string }[];
    };
    expect(
      catalog.assets.map(({ kind, entityId }) => [kind, entityId]),
    ).toEqual([
      ["item-icon", "item:copied icon"],
      ["item-icon", "item:shared icon"],
      ["skill-icon", "skill:copied skill"],
    ]);
    expect(new Set(catalog.assets.map((asset) => asset.file)).size).toBe(1);
    expect(
      (JSON.parse(first.diagnostics) as { code: string }[])
        .map((diagnostic) => diagnostic.code)
        .sort(),
    ).toEqual([
      "invalid_presented_asset_signature",
      "missing_presented_asset",
      "unsupported_presented_asset_format",
    ]);

    writeFileSync(iconPath, Buffer.concat([pngSignature, Buffer.from("new")]));
    const outputDirectory = path.join(
      repositoryRoot,
      "generated-assets",
      "current",
    );
    writePresentedAssets(result, outputDirectory, repositoryRoot);
    const copiedFile = catalog.assets[0]?.file;
    expect(copiedFile).toBeDefined();
    expect(
      readFileSync(
        path.join(outputDirectory, ...(copiedFile ?? "").split("/")),
      ),
    ).toEqual(iconBytes);
  });

  it("refuses source overlap and replacement of an unmanaged directory", () => {
    const { repositoryRoot, manifestPath } = fixtureRepository();
    const result = importDataset({ manifestPath, repositoryRoot });
    expect(() =>
      writePresentedAssets(
        result,
        path.join(repositoryRoot, "source", "generated-assets"),
        repositoryRoot,
      ),
    ).toThrow(/overlap source root/);

    const unmanaged = path.join(repositoryRoot, "unmanaged");
    mkdirSync(unmanaged);
    writeFileSync(path.join(unmanaged, "keep.txt"), "keep");
    expect(() =>
      writePresentedAssets(result, unmanaged, repositoryRoot),
    ).toThrow(/not owned by the importer/);
    expect(readFileSync(path.join(unmanaged, "keep.txt"), "utf8")).toBe("keep");
  });
});
