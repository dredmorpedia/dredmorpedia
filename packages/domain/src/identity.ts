import type { EntityKind } from "./types";

export function canonicalKey(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en");
}

export function slugify(value: string): string {
  const asciiSlug = value
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (asciiSlug.length > 0) {
    return asciiSlug;
  }

  return Array.from(value.normalize("NFC"), (character) =>
    character.codePointAt(0)?.toString(16),
  )
    .filter((part): part is string => Boolean(part))
    .join("-");
}

export function entityId(kind: EntityKind, name: string): string {
  return `${kind}:${canonicalKey(name)}`;
}
