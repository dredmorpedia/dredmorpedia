import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { DatasetArtifact } from "@dredmorpedia/domain";
import { afterEach, describe, expect, it, vi } from "vitest";

const temporaryDirectories: string[] = [];
const originalAssetDirectory = process.env.DREDMORPEDIA_ASSET_DIRECTORY;
const originalAssetBasePath = process.env.DREDMORPEDIA_ASSET_BASE_PATH;
const originalNextBasePath = process.env.NEXT_PUBLIC_BASE_PATH;

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function artifact(datasetVersion = "1.0.0"): DatasetArtifact {
  return {
    datasetId: "asset-loader-test",
    datasetVersion,
    sources: [{ id: "fixture" }],
    entities: {
      items: [{ id: "item:test", iconPath: "assets/test.png" }],
      skills: [{ id: "skill:test", iconPath: "skills/test.png" }],
      abilities: [{ id: "ability:test", iconPath: "skills/ability.png" }],
      spells: [{ id: "spell:test", iconPath: "spells/test.png" }],
    },
  } as unknown as DatasetArtifact;
}

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

function writeAssetSet(options: { tamperAsset?: boolean } = {}): string {
  const directory = mkdtempSync(
    path.join(tmpdir(), "dredmorpedia-web-assets-"),
  );
  temporaryDirectories.push(directory);
  const bytes = Buffer.from("presented png bytes");
  const digest = sha256(bytes);
  const file = `files/${digest}.png`;
  mkdirSync(path.join(directory, "files"));
  writeFileSync(
    path.join(directory, "files", `${digest}.png`),
    options.tamperAsset ? Buffer.from("tampered") : bytes,
  );
  const assets = `${JSON.stringify(
    {
      schemaVersion: 1,
      datasetId: "asset-loader-test",
      datasetVersion: "1.0.0",
      assets: [
        {
          kind: "item-icon",
          entityId: "item:test",
          file,
          sha256: digest,
          bytes: bytes.length,
        },
        {
          kind: "skill-icon",
          entityId: "skill:test",
          file,
          sha256: digest,
          bytes: bytes.length,
        },
        {
          kind: "ability-icon",
          entityId: "ability:test",
          file,
          sha256: digest,
          bytes: bytes.length,
        },
        {
          kind: "spell-icon",
          entityId: "spell:test",
          file,
          sha256: digest,
          bytes: bytes.length,
        },
      ],
    },
    null,
    2,
  )}\n`;
  const diagnostics = "[]\n";
  writeFileSync(path.join(directory, "assets.json"), assets);
  writeFileSync(path.join(directory, "diagnostics.json"), diagnostics);
  writeFileSync(
    path.join(directory, "manifest.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        datasetId: "asset-loader-test",
        datasetVersion: "1.0.0",
        generator: "test",
        diagnostics: { info: 0, warning: 0, error: 0 },
        outputs: {
          assets: {
            file: "assets.json",
            sha256: sha256(assets),
            bytes: Buffer.byteLength(assets),
          },
          diagnostics: {
            file: "diagnostics.json",
            sha256: sha256(diagnostics),
            bytes: Buffer.byteLength(diagnostics),
          },
        },
      },
      null,
      2,
    )}\n`,
  );
  return directory;
}

afterEach(() => {
  vi.resetModules();
  restoreEnvironment("DREDMORPEDIA_ASSET_DIRECTORY", originalAssetDirectory);
  restoreEnvironment("DREDMORPEDIA_ASSET_BASE_PATH", originalAssetBasePath);
  restoreEnvironment("NEXT_PUBLIC_BASE_PATH", originalNextBasePath);
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("presented asset consumer", () => {
  it("verifies a generated set and returns a base-path-aware item icon URL", async () => {
    process.env.DREDMORPEDIA_ASSET_DIRECTORY = writeAssetSet();
    process.env.DREDMORPEDIA_ASSET_BASE_PATH = "/generated-assets/current";
    process.env.NEXT_PUBLIC_BASE_PATH = "/dredmorpedia";
    const { abilityIconUrl, itemIconUrl, skillIconUrl, spellIconUrl } =
      await import("../src/lib/presented-assets");

    expect(itemIconUrl("item:test", artifact())).toMatch(
      /^\/dredmorpedia\/generated-assets\/current\/files\/[a-f0-9]{64}\.png$/,
    );
    expect(itemIconUrl("item:missing", artifact())).toBeNull();
    expect(skillIconUrl("skill:test", artifact())).toMatch(
      /^\/dredmorpedia\/generated-assets\/current\/files\/[a-f0-9]{64}\.png$/,
    );
    expect(skillIconUrl("skill:missing", artifact())).toBeNull();
    expect(abilityIconUrl("ability:test", artifact())).toMatch(
      /^\/dredmorpedia\/generated-assets\/current\/files\/[a-f0-9]{64}\.png$/,
    );
    expect(abilityIconUrl("ability:missing", artifact())).toBeNull();
    expect(spellIconUrl("spell:test", artifact())).toMatch(
      /^\/dredmorpedia\/generated-assets\/current\/files\/[a-f0-9]{64}\.png$/,
    );
    expect(spellIconUrl("spell:missing", artifact())).toBeNull();
  });

  it("rejects a catalog from a different dataset version", async () => {
    process.env.DREDMORPEDIA_ASSET_DIRECTORY = writeAssetSet();
    process.env.DREDMORPEDIA_ASSET_BASE_PATH = "/generated-assets/current";
    const { itemIconUrl } = await import("../src/lib/presented-assets");

    expect(() => itemIconUrl("item:test", artifact("2.0.0"))).toThrow(
      /do not match the active dataset/,
    );
  });

  it("rejects a copied file that no longer matches its catalog checksum", async () => {
    process.env.DREDMORPEDIA_ASSET_DIRECTORY = writeAssetSet({
      tamperAsset: true,
    });
    process.env.DREDMORPEDIA_ASSET_BASE_PATH = "/generated-assets/current";
    const { itemIconUrl } = await import("../src/lib/presented-assets");

    expect(() => itemIconUrl("item:test", artifact())).toThrow(
      /does not match assets.json/,
    );
  });

  it("uses the accessible page fallback when no asset set is configured", async () => {
    delete process.env.DREDMORPEDIA_ASSET_DIRECTORY;
    delete process.env.DREDMORPEDIA_ASSET_BASE_PATH;
    const { itemIconUrl } = await import("../src/lib/presented-assets");

    expect(itemIconUrl("item:test", artifact())).toBeNull();
  });
});
