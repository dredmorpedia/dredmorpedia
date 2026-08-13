import { deflateSync, inflateSync } from "node:zlib";
import path from "node:path";

import { assertSafeRelativePath } from "./safe-path";
import { isXmlRecord, parseXml, xmlChildren } from "./xml-adapter";

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const maximumSpritePixels = 16_777_216;
const maximumPngPixels = 16_777_216;
const maximumInflatedPngBytes = 67_108_864;

interface PngChunk {
  type: string;
  data: Buffer;
  raw: Buffer;
}

interface ParsedPng {
  width: number;
  height: number;
  bitDepth: number;
  colorType: number;
  interlace: number;
  chunks: PngChunk[];
}

export type MonsterFramePathResult =
  { ok: true; path: string } | { ok: false; message: string };

function xmlText(record: Record<string, unknown>): string | null {
  const value = record["#text"];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export function firstMonsterFramePath(
  bytes: Buffer,
  spritePath: string,
): MonsterFramePathResult {
  const parsed = parseXml({
    xml: bytes.toString("utf8"),
    sourceId: "monster-art",
    file: spritePath,
  });
  if (!parsed.ok) {
    return {
      ok: false,
      message: "The monster sprite wrapper is not valid XML.",
    };
  }

  const sprite = parsed.value.document.sprite;
  if (!isXmlRecord(sprite)) {
    return {
      ok: false,
      message: "The monster sprite wrapper has no <sprite> root.",
    };
  }
  const firstFrame = xmlChildren(sprite, "frame")[0];
  const frameName = firstFrame ? xmlText(firstFrame) : null;
  if (!frameName) {
    return {
      ok: false,
      message: "The monster sprite wrapper has no nonblank <frame> path.",
    };
  }

  const normalizedFrame = frameName.replaceAll("\\", "/");
  try {
    assertSafeRelativePath(normalizedFrame);
    const resolved = path.posix.normalize(
      path.posix.join(path.posix.dirname(spritePath), normalizedFrame),
    );
    assertSafeRelativePath(resolved);
    return { ok: true, path: resolved };
  } catch {
    return {
      ok: false,
      message: "The monster sprite wrapper contains an unsafe frame path.",
    };
  }
}

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, checksum]);
}

function pngPassSize(size: number, start: number, step: number): number {
  return size <= start ? 0 : Math.ceil((size - start) / step);
}

function pngPasses(
  width: number,
  height: number,
  interlace: number,
): { width: number; height: number }[] {
  if (interlace === 0) {
    return [{ width, height }];
  }
  return [
    [0, 0, 8, 8],
    [4, 0, 8, 8],
    [0, 4, 4, 8],
    [2, 0, 4, 4],
    [0, 2, 2, 4],
    [1, 0, 2, 2],
    [0, 1, 1, 2],
  ].map(([startX, startY, stepX, stepY]) => ({
    width: pngPassSize(width, startX as number, stepX as number),
    height: pngPassSize(height, startY as number, stepY as number),
  }));
}

function validatePngImageData(
  compressed: readonly Buffer[],
  width: number,
  height: number,
  bitsPerPixel: number,
  interlace: number,
): void {
  const passes = pngPasses(width, height, interlace).filter(
    (pass) => pass.width > 0 && pass.height > 0,
  );
  let expectedBytes = 0;
  for (const pass of passes) {
    const rowBytes = Math.ceil((pass.width * bitsPerPixel) / 8);
    expectedBytes += pass.height * (rowBytes + 1);
  }
  if (
    !Number.isSafeInteger(expectedBytes) ||
    expectedBytes <= 0 ||
    expectedBytes > maximumInflatedPngBytes
  ) {
    throw new Error("The PNG has unsafe decoded dimensions.");
  }

  let inflated: Buffer;
  try {
    inflated = inflateSync(Buffer.concat(compressed), {
      maxOutputLength: expectedBytes,
    });
  } catch (error) {
    throw new Error("The PNG contains invalid compressed image data.", {
      cause: error,
    });
  }
  if (inflated.length !== expectedBytes) {
    throw new Error("The PNG image data has an invalid decoded byte length.");
  }

  let offset = 0;
  for (const pass of passes) {
    const rowBytes = Math.ceil((pass.width * bitsPerPixel) / 8);
    for (let row = 0; row < pass.height; row += 1) {
      const filter = inflated[offset];
      if (filter === undefined || filter > 4) {
        throw new Error("The PNG contains an invalid scanline filter.");
      }
      offset += rowBytes + 1;
    }
  }
}

function parsePng(bytes: Buffer): ParsedPng {
  if (
    bytes.length < pngSignature.length ||
    !bytes.subarray(0, pngSignature.length).equals(pngSignature)
  ) {
    throw new Error("The image does not have a valid PNG signature.");
  }

  const chunks: PngChunk[] = [];
  const imageData: Buffer[] = [];
  let offset = pngSignature.length;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  let interlace = -1;
  let headerFound = false;
  let paletteFound = false;
  let imageDataFound = false;
  let imageDataEnded = false;
  let endFound = false;

  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) {
      throw new Error("The PNG contains a truncated chunk header.");
    }
    const length = bytes.readUInt32BE(offset);
    const chunkEnd = offset + 12 + length;
    if (chunkEnd > bytes.length) {
      throw new Error("The PNG contains a truncated chunk.");
    }
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    if (!/^[A-Za-z]{4}$/.test(type)) {
      throw new Error("The PNG contains an invalid chunk type.");
    }
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    const expectedCrc = bytes.readUInt32BE(offset + 8 + length);
    if (
      crc32(Buffer.concat([Buffer.from(type, "ascii"), data])) !== expectedCrc
    ) {
      throw new Error(`The PNG ${type} chunk has an invalid checksum.`);
    }
    if (chunks.length === 0 && type !== "IHDR") {
      throw new Error("The PNG does not begin with an IHDR chunk.");
    }
    if (imageDataFound && type !== "IDAT") {
      imageDataEnded = true;
    }

    if (type === "IHDR") {
      if (headerFound || chunks.length !== 0 || length !== 13) {
        throw new Error("The PNG has an invalid IHDR chunk.");
      }
      headerFound = true;
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8] as number;
      colorType = data[9] as number;
      const compression = data[10] as number;
      const filter = data[11] as number;
      interlace = data[12] as number;
      const allowedBitDepths: Readonly<Record<number, readonly number[]>> = {
        0: [1, 2, 4, 8, 16],
        2: [8, 16],
        3: [1, 2, 4, 8],
        4: [8, 16],
        6: [8, 16],
      };
      const pixels = width * height;
      if (
        width === 0 ||
        height === 0 ||
        !Number.isSafeInteger(pixels) ||
        pixels > maximumPngPixels ||
        !allowedBitDepths[colorType]?.includes(bitDepth) ||
        compression !== 0 ||
        filter !== 0 ||
        (interlace !== 0 && interlace !== 1)
      ) {
        throw new Error("The PNG has an unsupported or unsafe image header.");
      }
    } else if (type === "PLTE") {
      if (!headerFound || paletteFound || imageDataFound) {
        throw new Error("The PNG contains a misplaced or duplicate palette.");
      }
      if (data.length === 0 || data.length > 768 || data.length % 3 !== 0) {
        throw new Error("The PNG palette has an invalid byte length.");
      }
      paletteFound = true;
    } else if (type === "IDAT") {
      if (!headerFound || imageDataEnded) {
        throw new Error("The PNG contains non-consecutive image-data chunks.");
      }
      imageDataFound = true;
      imageData.push(Buffer.from(data));
    } else if (type === "IEND") {
      if (!headerFound || !imageDataFound || length !== 0) {
        throw new Error("The PNG has an invalid IEND chunk.");
      }
      endFound = true;
    } else if (/^[A-Z]/.test(type)) {
      throw new Error(`The PNG contains unsupported critical chunk ${type}.`);
    }

    chunks.push({
      type,
      data: Buffer.from(data),
      raw: Buffer.from(bytes.subarray(offset, chunkEnd)),
    });
    offset = chunkEnd;
    if (endFound) {
      break;
    }
  }

  if (!headerFound || !imageDataFound || !endFound || offset !== bytes.length) {
    throw new Error("The PNG is not a complete image.");
  }
  if (colorType === 3) {
    const palette = chunks.find((chunk) => chunk.type === "PLTE")?.data;
    if (!palette || palette.length / 3 > 2 ** bitDepth) {
      throw new Error("The indexed PNG has an invalid palette.");
    }
  } else if ((colorType === 0 || colorType === 4) && paletteFound) {
    throw new Error("The PNG color type does not permit a palette.");
  }

  const channelsByColorType: Readonly<Record<number, number>> = {
    0: 1,
    2: 3,
    3: 1,
    4: 2,
    6: 4,
  };
  validatePngImageData(
    imageData,
    width,
    height,
    bitDepth * (channelsByColorType[colorType] as number),
    interlace,
  );
  return { width, height, bitDepth, colorType, interlace, chunks };
}

export function validatePng(bytes: Buffer): void {
  parsePng(bytes);
}

function hueShiftChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value * 255)));
}

function shiftRgbHue(
  redByte: number,
  greenByte: number,
  blueByte: number,
  tint: number,
): [number, number, number] {
  const red = redByte / 255;
  const green = greenByte / 255;
  const blue = blueByte / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  const saturation = maximum === 0 ? 0 : delta / maximum;
  let hue = 0;

  if (maximum !== minimum) {
    if (maximum === red) {
      hue = (green - blue) / delta + (green < blue ? 6 : 0);
    } else if (maximum === green) {
      hue = (blue - red) / delta + 2;
    } else {
      hue = (red - green) / delta + 4;
    }
    hue /= 6;
  }

  const legacyDegrees = tint < 0 ? tint + 360 : tint;
  const normalizedTint = Math.abs(legacyDegrees) % 360;
  hue = (hue + normalizedTint / 360) % 1;
  const sector = Math.floor(hue * 6);
  const fraction = hue * 6 - sector;
  const low = maximum * (1 - saturation);
  const falling = maximum * (1 - fraction * saturation);
  const rising = maximum * (1 - (1 - fraction) * saturation);

  switch (sector % 6) {
    case 0:
      return [
        hueShiftChannel(maximum),
        hueShiftChannel(rising),
        hueShiftChannel(low),
      ];
    case 1:
      return [
        hueShiftChannel(falling),
        hueShiftChannel(maximum),
        hueShiftChannel(low),
      ];
    case 2:
      return [
        hueShiftChannel(low),
        hueShiftChannel(maximum),
        hueShiftChannel(rising),
      ];
    case 3:
      return [
        hueShiftChannel(low),
        hueShiftChannel(falling),
        hueShiftChannel(maximum),
      ];
    case 4:
      return [
        hueShiftChannel(rising),
        hueShiftChannel(low),
        hueShiftChannel(maximum),
      ];
    default:
      return [
        hueShiftChannel(maximum),
        hueShiftChannel(low),
        hueShiftChannel(falling),
      ];
  }
}

function shiftPalette(palette: Buffer, tint: number): Buffer {
  if (
    palette.length === 0 ||
    palette.length > 768 ||
    palette.length % 3 !== 0
  ) {
    throw new Error("The monster palette has an invalid byte length.");
  }
  const shifted = Buffer.alloc(palette.length);
  for (let offset = 0; offset < palette.length; offset += 3) {
    const [red, green, blue] = shiftRgbHue(
      palette[offset] as number,
      palette[offset + 1] as number,
      palette[offset + 2] as number,
      tint,
    );
    shifted[offset] = red;
    shifted[offset + 1] = green;
    shifted[offset + 2] = blue;
  }
  return shifted;
}

export function tintIndexedMonsterPng(
  bytes: Buffer,
  tint: number,
  replacementPalette: Buffer | null = null,
): Buffer {
  const parsed = parsePng(bytes);
  if (
    parsed.bitDepth !== 8 ||
    parsed.colorType !== 3 ||
    parsed.interlace !== 0
  ) {
    throw new Error(
      "The monster frame is not a complete non-interlaced 8-bit indexed PNG.",
    );
  }
  if (replacementPalette !== null && replacementPalette.length !== 768) {
    throw new Error("The named monster palette must contain 256 RGB colors.");
  }
  return Buffer.concat([
    pngSignature,
    ...parsed.chunks.map((chunk) =>
      chunk.type === "PLTE"
        ? pngChunk(
            chunk.type,
            shiftPalette(replacementPalette ?? chunk.data, tint),
          )
        : chunk.raw,
    ),
  ]);
}

export function decodeDredmorSpriteFirstFrame(
  bytes: Buffer,
  tint: number | null,
  replacementPalette: Buffer | null = null,
): Buffer {
  if (bytes.length < 9 || bytes.toString("ascii", 0, 3) !== "SPR") {
    throw new Error("The monster sprite does not have a valid SPR signature.");
  }
  const frameCount = bytes[3] as number;
  const width = bytes.readUInt16BE(4);
  const height = bytes.readUInt16BE(6);
  const pixels = width * height;
  if (
    frameCount === 0 ||
    width === 0 ||
    height === 0 ||
    !Number.isSafeInteger(pixels) ||
    pixels > maximumSpritePixels
  ) {
    throw new Error("The monster sprite has unsafe frame dimensions.");
  }

  const frameBytes = 2 + 768 + pixels;
  const expectedLength = 8 + frameCount * frameBytes + 1;
  if (bytes.length !== expectedLength || bytes.at(-1) !== 0) {
    throw new Error("The monster sprite has an invalid frame layout.");
  }

  const paletteStart = 10;
  const pixelStart = paletteStart + 768;
  if (replacementPalette !== null && replacementPalette.length !== 768) {
    throw new Error("The named monster palette must contain 256 RGB colors.");
  }
  const sourcePalette =
    replacementPalette ?? bytes.subarray(paletteStart, pixelStart);
  const palette =
    tint === null
      ? Buffer.from(sourcePalette)
      : shiftPalette(sourcePalette, tint);
  const scanlines = Buffer.alloc(height * (width + 1));
  for (let row = 0; row < height; row += 1) {
    const outputStart = row * (width + 1);
    scanlines[outputStart] = 0;
    bytes.copy(
      scanlines,
      outputStart + 1,
      pixelStart + row * width,
      pixelStart + (row + 1) * width,
    );
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 3;
  const transparency = Buffer.from([0]);

  return Buffer.concat([
    pngSignature,
    pngChunk("IHDR", header),
    pngChunk("PLTE", palette),
    pngChunk("tRNS", transparency),
    pngChunk("IDAT", deflateSync(scanlines, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}
