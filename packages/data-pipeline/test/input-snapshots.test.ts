import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { InputSnapshots } from "../src/input-snapshots";
import { sha256 } from "../src/serialization";

const temporaryDirectories: string[] = [];

function temporaryFile(contents: string): string {
  const directory = mkdtempSync(path.join(tmpdir(), "dredmorpedia-input-"));
  temporaryDirectories.push(directory);
  const file = path.join(directory, "input.xml");
  writeFileSync(file, contents);
  return file;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("input snapshots", () => {
  it("retains the digest of the exact text bytes supplied to parsing", () => {
    const file = temporaryFile('<items><item name="Before"/></items>');
    const snapshots = new InputSnapshots();

    const parsedText = snapshots.readUtf8(file, "sources/base/itemDB.xml");
    writeFileSync(file, '<items><item name="After"/></items>');

    expect(snapshots.readUtf8(file, "sources/base/itemDB.xml")).toBe(
      parsedText,
    );
    expect(snapshots.list()).toEqual([
      {
        file: "sources/base/itemDB.xml",
        sha256: sha256(Buffer.from(parsedText)),
      },
    ]);
  });

  it("captures referenced assets when they are first registered", () => {
    const file = temporaryFile("first asset bytes");
    const snapshots = new InputSnapshots();

    snapshots.register(file, "sources/base/items/example.png");
    writeFileSync(file, "changed asset bytes");
    snapshots.register(file, "sources/base/items/example.png");

    expect(snapshots.list()).toEqual([
      {
        file: "sources/base/items/example.png",
        sha256: sha256(Buffer.from("first asset bytes")),
      },
    ]);
  });

  it("rejects changed bytes before consuming a registered input as text", () => {
    const file = temporaryFile("registered bytes");
    const snapshots = new InputSnapshots();

    snapshots.register(file, "sources/base/shared-input.xml");
    writeFileSync(file, "different bytes");

    expect(() =>
      snapshots.readUtf8(file, "sources/base/shared-input.xml"),
    ).toThrow(/changed after it was registered/);
  });

  it("rejects one display path resolving to multiple inputs", () => {
    const first = temporaryFile("first");
    const second = temporaryFile("second");
    const snapshots = new InputSnapshots();

    snapshots.register(first, "sources/base/shared.xml");

    expect(() => snapshots.register(second, "sources/base/shared.xml")).toThrow(
      /display path has multiple sources/,
    );
  });
});
