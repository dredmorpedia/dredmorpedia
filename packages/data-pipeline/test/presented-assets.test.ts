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
  serializeOutputs,
  sha256,
  writePresentedAssets,
} from "../src/index";
import {
  decodeDredmorSpriteFirstFrame,
  tintIndexedMonsterPng,
} from "../src/monster-art";

const temporaryDirectories: string[] = [];
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function spriteFixture(): Buffer {
  const bytes = Buffer.alloc(8 + 2 + 768 + 2 + 1);
  bytes.write("SPR", 0, "ascii");
  bytes[3] = 1;
  bytes.writeUInt16BE(2, 4);
  bytes.writeUInt16BE(1, 6);
  bytes.writeUInt16BE(70, 8);
  bytes[13] = 255;
  bytes[778] = 0;
  bytes[779] = 1;
  return bytes;
}

function pngChunkData(bytes: Buffer, type: string): Buffer {
  let offset = pngSignature.length;
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const chunkType = bytes.toString("ascii", offset + 4, offset + 8);
    if (chunkType === type) {
      return bytes.subarray(offset + 8, offset + 8 + length);
    }
    offset += 12 + length;
  }
  throw new Error(`Missing ${type} chunk.`);
}

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
  const iconBytes = decodeDredmorSpriteFirstFrame(spriteFixture(), null);
  const iconPath = path.join(assetsRoot, "icon.png");
  writeFileSync(iconPath, iconBytes);
  writeFileSync(path.join(assetsRoot, "fixture.svg"), "<svg />");
  writeFileSync(path.join(assetsRoot, "invalid.png"), "not a png");
  writeFileSync(
    path.join(assetsRoot, "corrupt.png"),
    Buffer.concat([pngSignature, Buffer.from("truncated")]),
  );
  const monsterSprite = spriteFixture();
  writeFileSync(path.join(assetsRoot, "monster.spr"), monsterSprite);
  const monsterPalette = Buffer.alloc(768);
  monsterPalette[4] = 255;
  writeFileSync(path.join(assetsRoot, "monster.pal"), monsterPalette);
  writeFileSync(
    path.join(sourceRoot, "itemDB.xml"),
    `
<items>
  <item name="Copied Icon" iconFile="assets/icon.png" />
  <item name="Shared Icon" iconFile="assets/icon.png" />
  <item name="Missing Icon" iconFile="assets/missing.png" />
  <item name="Unsupported Icon" iconFile="assets/fixture.svg" />
  <item name="Invalid Icon" iconFile="assets/invalid.png" />
  <item name="Corrupt Icon" iconFile="assets/corrupt.png" />
</items>`,
  );
  writeFileSync(
    path.join(sourceRoot, "skillDB.xml"),
    `
<skills>
  <skill name="Copied Skill"><art icon="assets/icon.png" /></skill>
  <ability name="Copied Ability" skill="Copied Skill" icon="assets/icon.png" />
</skills>`,
  );
  writeFileSync(
    path.join(sourceRoot, "spellDB.xml"),
    `
<spells>
  <spell name="Copied Spell" type="self" icon="assets/icon.png" />
</spells>`,
  );
  writeFileSync(
    path.join(sourceRoot, "monDB.xml"),
    `
<monsters>
  <monster name="Copied Monster" taxa="Construct" level="0">
    <idleSprite down="assets/monster.spr" />
    <palette name="assets/monster.pal" />
  </monster>
</monsters>`,
  );
  const manifestPath = path.join(repositoryRoot, "manifest.json");
  writeFileSync(
    manifestPath,
    JSON.stringify({
      schemaVersion: 2,
      datasetId: "presented-assets-test",
      datasetVersion: "1",
      sources: [
        {
          id: "fixture",
          label: "Fixture",
          kind: "fixture",
          version: "1",
          precedence: 0,
          root: "source",
          presentedAssets: [{ id: "gold", path: "assets/icon.png" }],
          files: [
            { kind: "items", path: "itemDB.xml" },
            { kind: "skills", path: "skillDB.xml" },
            { kind: "spells", path: "spellDB.xml" },
            { kind: "monsters", path: "monDB.xml" },
          ],
        },
      ],
      patches: [],
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
    expect(first.files.size).toBe(2);
    expect(
      JSON.parse(first.manifest) as {
        schemaVersion: number;
        artifactSha256: string;
        uiAssetIds: string[];
      },
    ).toMatchObject({
      schemaVersion: 3,
      artifactSha256: sha256(serializeOutputs(result).artifact),
      uiAssetIds: ["gold"],
    });
    const catalog = JSON.parse(first.assets) as {
      schemaVersion: number;
      assets: { kind: string; entityId: string; file: string }[];
    };
    expect(catalog.schemaVersion).toBe(2);
    expect(
      catalog.assets.map(({ kind, entityId }) => [kind, entityId]),
    ).toEqual([
      ["ability-icon", "ability:copied ability"],
      ["item-icon", "item:copied icon"],
      ["item-icon", "item:shared icon"],
      ["monster-icon", "monster:copied monster"],
      ["skill-icon", "skill:copied skill"],
      ["spell-icon", "spell:copied spell"],
      ["ui-icon", "gold"],
    ]);
    expect(new Set(catalog.assets.map((asset) => asset.file)).size).toBe(2);
    expect(
      (JSON.parse(first.diagnostics) as { code: string }[])
        .map((diagnostic) => diagnostic.code)
        .sort(),
    ).toEqual([
      "invalid_presented_asset_png",
      "invalid_presented_asset_signature",
      "missing_presented_asset",
      "unsupported_presented_asset_format",
    ]);

    writeFileSync(iconPath, tintIndexedMonsterPng(iconBytes, 120));
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

  it("uses inherited appearance provenance and named palettes for XML-backed frames", () => {
    const repositoryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-inherited-monster-art-"),
    );
    temporaryDirectories.push(repositoryRoot);
    const baseRoot = path.join(repositoryRoot, "base");
    const overrideRoot = path.join(repositoryRoot, "override");
    const overrideAssets = path.join(overrideRoot, "assets");
    mkdirSync(baseRoot, { recursive: true });
    mkdirSync(overrideAssets, { recursive: true });
    writeFileSync(
      path.join(baseRoot, "monDB.xml"),
      `<monsters>
  <monster name="Parent" taxa="Construct" level="0">
    <monster name="Child" level="1" />
  </monster>
</monsters>`,
    );
    writeFileSync(
      path.join(overrideRoot, "monDB.xml"),
      `<monsters>
  <monster name="Parent" taxa="Construct" level="0">
    <idleSprite down="assets/wrapper.xml" />
    <palette name="assets/replacement.pal" />
  </monster>
</monsters>`,
    );
    writeFileSync(
      path.join(overrideAssets, "wrapper.xml"),
      '<sprite><frame delay="10">frame.png</frame></sprite>',
    );
    writeFileSync(
      path.join(overrideAssets, "frame.png"),
      decodeDredmorSpriteFirstFrame(spriteFixture(), null),
    );
    const replacementPalette = Buffer.alloc(768);
    replacementPalette[4] = 255;
    writeFileSync(
      path.join(overrideAssets, "replacement.pal"),
      replacementPalette,
    );
    const manifestPath = path.join(repositoryRoot, "manifest.json");
    writeFileSync(
      manifestPath,
      JSON.stringify({
        schemaVersion: 1,
        datasetId: "inherited-monster-art-test",
        sources: [
          {
            id: "base",
            label: "Base",
            kind: "fixture",
            precedence: 0,
            root: "base",
            files: [{ kind: "monsters", path: "monDB.xml" }],
          },
          {
            id: "override",
            label: "Override",
            kind: "fixture",
            precedence: 1,
            root: "override",
            files: [{ kind: "monsters", path: "monDB.xml" }],
          },
        ],
      }),
    );

    const result = importDataset({ manifestPath, repositoryRoot });
    const childInput = result.presentedAssetInputs.find(
      (input) => input.entityId === "monster:child",
    );
    expect(childInput).toMatchObject({
      sourceId: "override",
      sourcePath: "assets/frame.png",
    });
    expect(childInput?.paletteSnapshot).toBeDefined();

    const serialized = serializePresentedAssets(result);
    const catalog = JSON.parse(serialized.assets) as {
      assets: { entityId: string; file: string }[];
    };
    const childFile = catalog.assets.find(
      (asset) => asset.entityId === "monster:child",
    )?.file;
    expect(childFile).toBeDefined();
    const childBytes = serialized.files.get(childFile ?? "");
    expect(childBytes).toBeDefined();
    expect([
      ...pngChunkData(childBytes as Buffer, "PLTE").subarray(3, 6),
    ]).toEqual([0, 255, 0]);
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
