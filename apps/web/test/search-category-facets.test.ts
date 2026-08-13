import type { EntityKind, SearchDocument } from "@dredmorpedia/domain";
import { describe, expect, it } from "vitest";

import {
  createSearchCategoryGroups,
  searchCategoryLabel,
  searchCategoryValues,
} from "../src/lib/search-category-facets";

function document(kind: EntityKind, category: string | null) {
  return { kind, category } satisfies Pick<SearchDocument, "kind" | "category">;
}

describe("search category facets", () => {
  const documents = [
    document("stat", "secondary"),
    document("item", "weapon:sword"),
    document("monster", "Undead"),
    document("recipe", "smithing"),
    document("item", "armour:neck"),
    document("skill", "wizard"),
    document("encrustment", "alchemy"),
    document("recipe", "alchemy"),
    document("spell", null),
  ];

  it("groups mixed facets and sorts each group by its displayed labels", () => {
    expect(createSearchCategoryGroups(documents, "all")).toEqual([
      {
        id: "crafting-tools",
        label: "Crafting tools",
        options: [
          { value: "alchemy", label: "Alchemy" },
          { value: "smithing", label: "Smithing" },
        ],
      },
      {
        id: "item-categories",
        label: "Item categories",
        options: [
          { value: "armour:neck", label: "Amulet" },
          { value: "weapon:sword", label: "Sword weapon" },
        ],
      },
      {
        id: "monster-taxonomies",
        label: "Monster taxonomies",
        options: [{ value: "Undead", label: "Undead" }],
      },
      {
        id: "skill-archetypes",
        label: "Skill archetypes",
        options: [{ value: "wizard", label: "Wizard" }],
      },
      {
        id: "stat-groups",
        label: "Stat groups",
        options: [{ value: "secondary", label: "Secondary" }],
      },
    ]);
  });

  it("offers only categories compatible with the selected entity kind", () => {
    const recipeGroups = createSearchCategoryGroups(documents, "recipe");

    expect(recipeGroups).toEqual([
      {
        id: "crafting-tools",
        label: "Crafting tools",
        options: [
          { value: "alchemy", label: "Alchemy" },
          { value: "smithing", label: "Smithing" },
        ],
      },
    ]);
    expect(searchCategoryValues(recipeGroups)).toEqual(
      new Set(["alchemy", "smithing"]),
    );
    expect(createSearchCategoryGroups(documents, "spell")).toEqual([]);
  });

  it("uses entity-aware labels for filters and result metadata", () => {
    expect(searchCategoryLabel("item", "armour:neck")).toBe("Amulet");
    expect(searchCategoryLabel("monster", "Diggle Prince")).toBe(
      "Diggle Prince",
    );
    expect(searchCategoryLabel("stat", "secondary")).toBe("Secondary");
  });
});
