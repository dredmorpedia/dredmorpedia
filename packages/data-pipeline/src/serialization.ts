import { createHash } from "node:crypto";

function sortForSerialization(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortForSerialization);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right, "en"))
        .map(([key, entry]) => [key, sortForSerialization(entry)]),
    );
  }

  return value;
}

export function stableSerialize(value: unknown): string {
  return `${JSON.stringify(sortForSerialization(value), null, 2)}\n`;
}

export function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}
