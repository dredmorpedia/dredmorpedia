import {
  itemCategoryLabel,
  type EntityKind,
  type SearchDocument,
} from "@dredmorpedia/domain";

import { titleCase } from "./display-labels";

export interface SearchCategoryOption {
  value: string;
  label: string;
}

export interface SearchCategoryGroup {
  id: string;
  label: string;
  options: SearchCategoryOption[];
}

interface CategoryGroupDefinition {
  id: string;
  label: string;
  kinds: readonly EntityKind[];
}

const categoryGroupDefinitions: readonly CategoryGroupDefinition[] = [
  {
    id: "crafting-tools",
    label: "Crafting tools",
    kinds: ["recipe", "encrustment"],
  },
  { id: "item-categories", label: "Item categories", kinds: ["item"] },
  {
    id: "monster-taxonomies",
    label: "Monster taxonomies",
    kinds: ["monster"],
  },
  {
    id: "skill-archetypes",
    label: "Skill archetypes",
    kinds: ["skill"],
  },
  { id: "stat-groups", label: "Stat groups", kinds: ["stat"] },
];

function compareDisplayedLabels(
  left: SearchCategoryOption,
  right: SearchCategoryOption,
): number {
  return (
    left.label.localeCompare(right.label, "en", { sensitivity: "base" }) ||
    left.value.localeCompare(right.value, "en")
  );
}

export function searchCategoryLabel(kind: EntityKind, value: string): string {
  return kind === "item" ? itemCategoryLabel(value) : titleCase(value);
}

export function createSearchCategoryGroups(
  documents: readonly Pick<SearchDocument, "kind" | "category">[],
  kind: EntityKind | "all",
): SearchCategoryGroup[] {
  return categoryGroupDefinitions.flatMap((definition) => {
    if (kind !== "all" && !definition.kinds.includes(kind)) {
      return [];
    }

    const options = new Map<string, SearchCategoryOption>();
    for (const document of documents) {
      if (
        document.category === null ||
        !definition.kinds.includes(document.kind) ||
        (kind !== "all" && document.kind !== kind)
      ) {
        continue;
      }

      options.set(document.category, {
        value: document.category,
        label: searchCategoryLabel(document.kind, document.category),
      });
    }

    if (options.size === 0) {
      return [];
    }

    return [
      {
        id: definition.id,
        label: definition.label,
        options: [...options.values()].sort(compareDisplayedLabels),
      },
    ];
  });
}

export function searchCategoryValues(
  groups: readonly SearchCategoryGroup[],
): ReadonlySet<string> {
  return new Set(
    groups.flatMap((group) => group.options.map((option) => option.value)),
  );
}
