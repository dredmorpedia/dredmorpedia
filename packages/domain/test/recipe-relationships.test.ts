import { describe, expect, it } from "vitest";

import {
  canonicalKey,
  entityId,
  itemRecipeRelationships,
  slugify,
  type Recipe,
} from "../src/index";

function recipe(
  name: string,
  inputs: Recipe["inputs"],
  outputs: Recipe["outputs"],
): Recipe {
  const provenance = {
    sourceId: "synthetic-recipes",
    file: "synthetic/craftDB.xml",
    line: 2,
    column: 3,
    originalName: name,
  };
  return {
    id: entityId("recipe", name),
    kind: "recipe",
    canonicalKey: canonicalKey(name),
    slug: slugify(name),
    slugAliases: [],
    name,
    description: "",
    provenance,
    variants: [provenance],
    appliedOverrides: [],
    appliedPatches: [],
    diagnosticIds: [],
    tool: "smithing",
    hidden: false,
    skillLevel: 2,
    inputs,
    outputs,
  };
}

describe("item recipe relationships", () => {
  it("separates and sums input/output roles in stable recipe order", () => {
    const itemId = "item:clockwork blade";
    const later = recipe(
      "Later Recipe",
      [
        { itemKey: "blade", itemName: "Blade", amount: 2, itemId },
        { itemKey: "blade", itemName: "Blade", amount: 1, itemId },
      ],
      [{ itemKey: "blade", itemName: "Blade", amount: 4, itemId }],
    );
    const earlier = recipe(
      "Earlier Recipe",
      [],
      [{ itemKey: "blade", itemName: "Blade", amount: 1, itemId }],
    );

    expect(itemRecipeRelationships([later, earlier], itemId)).toEqual([
      { recipe: earlier, inputAmount: 0, outputAmount: 1 },
      { recipe: later, inputAmount: 3, outputAmount: 4 },
    ]);
  });

  it("ignores unresolved and unrelated item references", () => {
    const unrelated = recipe(
      "Unrelated Recipe",
      [{ itemKey: "missing", itemName: "Missing", amount: 1 }],
      [
        {
          itemKey: "other",
          itemName: "Other",
          amount: 1,
          itemId: "item:other",
        },
      ],
    );

    expect(
      itemRecipeRelationships([unrelated], "item:clockwork blade"),
    ).toEqual([]);
  });
});
