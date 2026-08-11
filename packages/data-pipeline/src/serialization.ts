import { createHash } from "node:crypto";

import { compareCodeUnits } from "@dredmorpedia/domain";

function sortForSerialization(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortForSerialization);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => compareCodeUnits(left, right))
        .map(([key, entry]) => [key, sortForSerialization(entry)]),
    );
  }

  return value;
}

export interface StableSerializeOptions {
  format?: "compact" | "pretty";
}

export function stableSerialize(
  value: unknown,
  options: StableSerializeOptions = {},
): string {
  const indentation = options.format === "compact" ? undefined : 2;
  return `${JSON.stringify(sortForSerialization(value), null, indentation)}\n`;
}

export function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}
