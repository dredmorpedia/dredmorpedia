import { describe, expect, it } from "vitest";

import {
  decodeDredmorSpriteFirstFrame,
  firstMonsterFramePath,
  tintIndexedMonsterPng,
  validatePng,
} from "../src/monster-art";

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
  let offset = 8;
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

describe("monster art conversion", () => {
  it("resolves an XML wrapper's first frame relative to the wrapper", () => {
    expect(
      firstMonsterFramePath(
        Buffer.from(
          '<sprite><frame delay="10">canisterA0000.png</frame></sprite>',
        ),
        "sprites/monster/canisterA/canisterA.xml",
      ),
    ).toEqual({
      ok: true,
      path: "sprites/monster/canisterA/canisterA0000.png",
    });
    expect(
      firstMonsterFramePath(
        Buffer.from("<sprite><frame>../../outside.png</frame></sprite>"),
        "sprites/monster/canisterA/canisterA.xml",
      ),
    ).toMatchObject({ ok: false });
  });

  it("decodes the first indexed SPR frame and applies the legacy hue rotation", () => {
    const png = decodeDredmorSpriteFirstFrame(spriteFixture(), 120);
    const header = pngChunkData(png, "IHDR");
    const palette = pngChunkData(png, "PLTE");
    const transparency = pngChunkData(png, "tRNS");

    expect(header.readUInt32BE(0)).toBe(2);
    expect(header.readUInt32BE(4)).toBe(1);
    expect([header[8], header[9], header[12]]).toEqual([8, 3, 0]);
    expect([...palette.subarray(3, 6)]).toEqual([0, 255, 0]);
    expect([...transparency]).toEqual([0]);
  });

  it("retints an indexed PNG palette without changing its image payload", () => {
    const red = decodeDredmorSpriteFirstFrame(spriteFixture(), null);
    const blue = tintIndexedMonsterPng(red, -120);

    expect([...pngChunkData(blue, "PLTE").subarray(3, 6)]).toEqual([0, 0, 255]);
    expect(pngChunkData(blue, "IDAT")).toEqual(pngChunkData(red, "IDAT"));
  });

  it("applies an exact named palette to an indexed PNG frame", () => {
    const source = decodeDredmorSpriteFirstFrame(spriteFixture(), null);
    const replacement = Buffer.alloc(768);
    replacement[4] = 255;
    const green = tintIndexedMonsterPng(source, 0, replacement);

    expect([...pngChunkData(green, "PLTE").subarray(3, 6)]).toEqual([
      0, 255, 0,
    ]);
  });

  it("validates complete PNG structure and compressed scanlines", () => {
    expect(() =>
      validatePng(decodeDredmorSpriteFirstFrame(spriteFixture(), null)),
    ).not.toThrow();
    expect(() =>
      validatePng(
        Buffer.concat([
          Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
          Buffer.from("truncated"),
        ]),
      ),
    ).toThrow(/truncated chunk/);
  });

  it("uses an exact named 256-color palette when one is declared", () => {
    const replacement = Buffer.alloc(768);
    replacement[5] = 255;
    const png = decodeDredmorSpriteFirstFrame(
      spriteFixture(),
      null,
      replacement,
    );

    expect([...pngChunkData(png, "PLTE").subarray(3, 6)]).toEqual([0, 0, 255]);
    expect(() =>
      decodeDredmorSpriteFirstFrame(spriteFixture(), null, Buffer.alloc(3)),
    ).toThrow(/256 RGB colors/);
  });

  it("preserves the legacy single-wrap handling for extreme negative tints", () => {
    const png = decodeDredmorSpriteFirstFrame(spriteFixture(), -400);

    expect([...pngChunkData(png, "PLTE").subarray(3, 6)]).toEqual([
      255, 170, 0,
    ]);
  });

  it("rejects malformed SPR frame layouts", () => {
    expect(() =>
      decodeDredmorSpriteFirstFrame(spriteFixture().subarray(0, -1), null),
    ).toThrow(/invalid frame layout/);
  });
});
