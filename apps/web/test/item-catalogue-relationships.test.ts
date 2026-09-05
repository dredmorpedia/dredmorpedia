import type { Encrustment, Item, Recipe } from "@dredmorpedia/domain";
import { describe, expect, it } from "vitest";

import {
  createItemCatalogueRelationshipIndex,
  usedToCraftCatalogueRelations,
} from "../src/lib/item-catalogue-relationships";

function recipe(id: string, inputId: string, outputId: string): Recipe {
  return {
    kind: "recipe",
    id,
    canonicalKey: id,
    slug: id,
    slugAliases: [],
    name: id,
    description: "",
    tool: "smithing",
    hidden: false,
    skillLevel: 0,
    inputs: [
      {
        amount: 1,
        itemId: inputId,
        itemKey: inputId,
        itemName: inputId,
      },
    ],
    outputs: [
      {
        amount: 1,
        itemId: outputId,
        itemKey: outputId,
        itemName: outputId,
        skillLevel: 0,
      },
    ],
    provenance: {
      sourceId: "base",
      file: "craftDB.xml",
      line: 1,
      column: 1,
      originalName: id,
    },
    variants: [],
    appliedOverrides: [],
    appliedPatches: [],
    diagnosticIds: [],
  };
}

function encrustment(id: string, inputId: string): Encrustment {
  return {
    kind: "encrustment",
    id,
    canonicalKey: id,
    slug: id,
    slugAliases: [],
    name: id,
    description: "",
    tool: "smithing",
    hidden: false,
    skillLevel: 0,
    inputs: [
      {
        amount: 2,
        itemId: inputId,
        itemKey: inputId,
        itemName: inputId,
      },
    ],
    slots: [],
    instability: 0,
    modifiers: [],
    powers: [],
    appearanceDescriptors: [],
    provenance: {
      sourceId: "base",
      file: "encrustDB.xml",
      line: 1,
      column: 1,
      originalName: id,
    },
    variants: [],
    appliedOverrides: [],
    appliedPatches: [],
    diagnosticIds: [],
  };
}

describe("item catalogue relationship index", () => {
  it("preserves distinct recipes that produce the same displayed item", () => {
    const first = recipe("recipe:first", "item:steel", "item:blue-steel");
    const second = recipe("recipe:second", "item:steel", "item:blue-steel");
    const index = createItemCatalogueRelationshipIndex({
      encrustments: [encrustment("encrustment:first", "item:steel")],
      recipes: [second, first],
    });
    const relationships = index.get("item:steel")!;
    const blueSteel = { id: "item:blue-steel" } as Item;

    expect(relationships.recipes.map(({ recipe }) => recipe.id)).toEqual([
      "recipe:first",
      "recipe:second",
    ]);
    expect(relationships.encrustments[0]).toMatchObject({ inputAmount: 2 });
    expect(
      usedToCraftCatalogueRelations({
        itemById: new Map([[blueSteel.id, blueSteel]]),
        itemId: "item:steel",
        relationships: relationships.recipes,
      }).map(({ key }) => key),
    ).toEqual([
      "recipe:first:item:blue-steel",
      "recipe:second:item:blue-steel",
    ]);
  });
});
