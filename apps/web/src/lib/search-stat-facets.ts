import {
  statModifierKinds,
  statModifierSearchKey,
  type SearchDocument,
  type Stat,
  type StatModifierKind,
} from "@dredmorpedia/domain";

import { titleCase } from "./display-labels";

export interface SearchStatFilterOption {
  value: string;
  label: string;
  aliases: string[];
}

function fallbackFacetLabel(value: string): string {
  const [prefix, kind, ...sourceParts] = value.split(":");
  const sourceKey = sourceParts.join(":");
  if (
    prefix === "modifier" &&
    (statModifierKinds as readonly string[]).includes(kind ?? "") &&
    sourceKey.length > 0
  ) {
    switch (kind as StatModifierKind) {
      case "damage":
        return `${titleCase(sourceKey)} damage`;
      case "resistance":
        return `${titleCase(sourceKey)} resistance`;
      case "primary":
        return `Primary attribute ${sourceKey}`;
      case "secondary":
        return `Secondary stat ${sourceKey}`;
    }
  }
  return titleCase(value);
}

export function createSearchStatFilterOptions(
  stats: readonly Stat[],
  documents: readonly SearchDocument[],
): SearchStatFilterOption[] {
  const definitionByAlias = new Map<
    string,
    { preferredValue: string; label: string; aliases: string[] }
  >();

  for (const stat of stats) {
    const preferredValue = stat.canonicalKey;
    const aliases = [
      ...new Set([
        stat.id,
        stat.canonicalKey,
        ...(stat.modifier ? [statModifierSearchKey(stat.modifier)] : []),
      ]),
    ].sort((left, right) => left.localeCompare(right, "en"));
    const definition = { preferredValue, label: stat.name, aliases };
    for (const alias of aliases) {
      definitionByAlias.set(alias, definition);
    }
  }

  const options = new Map<string, SearchStatFilterOption>();
  for (const key of new Set(
    documents.flatMap((document) => document.statKeys),
  )) {
    const definition = definitionByAlias.get(key);
    const value = definition?.preferredValue ?? key;
    if (!options.has(value)) {
      options.set(value, {
        value,
        label: definition?.label ?? fallbackFacetLabel(key),
        aliases: definition?.aliases ?? [key],
      });
    }
  }

  return [...options.values()].sort(
    (left, right) =>
      left.label.localeCompare(right.label, "en") ||
      left.value.localeCompare(right.value, "en"),
  );
}
