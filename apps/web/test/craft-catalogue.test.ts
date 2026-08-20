import type {
  Item,
  ItemToolkitMetadata,
  Recipe,
  SourceSummary,
} from "@dredmorpedia/domain";
import { describe, expect, it } from "vitest";

import {
  craftCataloguePageSize,
  craftCatalogueToolForSegment,
  craftCatalogueToolPath,
  createCraftCatalogueTools,
  defaultCraftCatalogueTool,
  paginateCraftCatalogue,
  recipesForCraftCatalogueTool,
} from "../src/lib/craft-catalogue";

const sources: SourceSummary[] = [
  {
    id: "base",
    label: "Base",
    kind: "base",
    version: "1",
    precedence: 0,
  },
  {
    id: "expansion",
    label: "Expansion",
    kind: "expansion",
    version: "1",
    precedence: 10,
  },
];

function toolkitDeclaration(tag: string): ItemToolkitMetadata {
  return {
    tag,
    numSlots: 2,
    soundCue: null,
    missingPath: null,
    presentPath: null,
    activePath: null,
    slotBounds: [],
    outputBounds: { x1: null, y1: null, x2: null, y2: null },
    craftButton: { path: null, positionX: null, positionY: null },
    recipeButton: { path: null, positionX: null, positionY: null },
    autofillButton: { path: null, positionX: null, positionY: null },
    closePosition: { x: null, y: null },
    backgroundPath: null,
  };
}

function toolkit(id: string, name: string, tag: string): Item {
  return {
    kind: "item",
    id,
    canonicalKey: id,
    slug: id,
    slugAliases: [],
    name,
    description: "",
    category: "toolkit",
    price: null,
    quality: 0,
    artifacts: [],
    armourDeclarations: [],
    weaponDeclarations: [],
    macguffinDeclarations: [],
    toolkitDeclarations: [toolkitDeclaration(tag)],
    recoveries: [],
    chargeRanges: [],
    traps: [],
    iconPath: null,
    stats: [],
    modifiers: [],
    triggers: [],
    provenance: {
      sourceId: "base",
      file: "itemDB.xml",
      line: 1,
      column: 1,
      originalName: name,
    },
    variants: [],
    appliedOverrides: [],
    appliedPatches: [],
    diagnosticIds: [],
  };
}

function recipe(
  id: string,
  tool: string,
  options: { line?: number; skillLevel?: number; sourceId?: string } = {},
): Recipe {
  const skillLevel = options.skillLevel ?? 0;
  return {
    kind: "recipe",
    id,
    canonicalKey: id,
    slug: id,
    slugAliases: [],
    name: id,
    description: "",
    tool,
    hidden: false,
    skillLevel,
    inputs: [],
    outputs: [
      {
        amount: 1,
        itemKey: `${id}-output`,
        itemName: `${id} output`,
        skillLevel,
      },
    ],
    provenance: {
      sourceId: options.sourceId ?? "base",
      file: "craftDB.xml",
      line: options.line ?? 1,
      column: 1,
      originalName: id,
    },
    variants: [],
    appliedOverrides: [],
    appliedPatches: [],
    diagnosticIds: [],
  };
}

describe("craft catalogue", () => {
  it("uses familiar tool order and toolkit names before fallback tools", () => {
    const recipes = [
      recipe("smith", "smithing"),
      recipe("lathe", "lathe"),
      recipe("grind", "grinder"),
      recipe("odd", "odd tool"),
      recipe("smith-two", "Smithing"),
    ];
    const tools = createCraftCatalogueTools(recipes, [
      toolkit("anvil", "My Little Anvil", "smithing"),
      toolkit("lathe-tool", "n-Dimensional Lathe", "lathe"),
    ]);

    expect(tools.map(({ tag }) => tag)).toEqual([
      "lathe",
      "grinder",
      "smithing",
      "odd tool",
    ]);
    expect(tools[0]).toMatchObject({
      count: 1,
      label: "n-Dimensional Lathe",
      representativeItemId: "lathe-tool",
      segment: "lathe",
    });
    expect(tools[1]).toMatchObject({
      label: "Grinder",
      representativeItemId: null,
    });
    expect(tools[2]).toMatchObject({ count: 2, label: "My Little Anvil" });
    expect(defaultCraftCatalogueTool(tools)?.tag).toBe("lathe");
    expect(craftCatalogueToolForSegment(tools, "smithing")?.tag).toBe(
      "smithing",
    );
    expect(craftCatalogueToolPath(tools[2]!)).toBe("/crafts/tool/smithing");
  });

  it("keeps recipes in source precedence and XML order", () => {
    const recipes = [
      recipe("expansion-first", "smithing", {
        line: 1,
        sourceId: "expansion",
      }),
      recipe("base-second", "smithing", { line: 20 }),
      recipe("base-first", "smithing", { line: 10 }),
      recipe("other-tool", "ingot", { line: 1 }),
    ];
    const tool = createCraftCatalogueTools(recipes, []).find(
      ({ tag }) => tag === "smithing",
    );

    expect(
      recipesForCraftCatalogueTool(recipes, tool!, sources).map(({ id }) => id),
    ).toEqual(["base-first", "base-second", "expansion-first"]);
  });

  it("offers bounded, shareable game, name, skill, and all-recipe views", () => {
    const recipes = Array.from(
      { length: craftCataloguePageSize + 2 },
      (_, index) =>
        recipe(
          index === 0 ? "zulu" : `recipe-${String(index).padStart(2, "0")}`,
          "smithing",
          {
            line: index + 1,
            skillLevel: index === 0 ? 4 : index % 3,
          },
        ),
    );
    const [tool] = createCraftCatalogueTools(recipes, []);

    expect(tool).toMatchObject({
      count: craftCataloguePageSize + 2,
      pageCount: 2,
    });
    expect(craftCatalogueToolPath(tool!, 2)).toBe(
      "/crafts/tool/smithing/view/game/36/2",
    );
    expect(
      craftCatalogueToolPath(tool!, 1, { sort: "name", pageSize: "all" }),
    ).toBe("/crafts/tool/smithing/view/name/all/1");

    const secondPage = paginateCraftCatalogue(recipes, tool!, 2, {
      sources,
    });
    expect(secondPage).toMatchObject({
      page: 2,
      pageCount: 2,
      pageSize: craftCataloguePageSize,
      total: craftCataloguePageSize + 2,
    });
    expect(secondPage?.recipes).toHaveLength(2);
    expect(
      paginateCraftCatalogue(recipes, tool!, 1, {
        pageSize: "all",
        sort: "name",
        sources,
      })?.recipes[0]?.id,
    ).toBe("recipe-01");
    expect(
      paginateCraftCatalogue(recipes, tool!, 1, {
        pageSize: "all",
        sort: "skill",
        sources,
      })?.recipes[0]?.skillLevel,
    ).toBe(0);
    expect(paginateCraftCatalogue(recipes, tool!, 0)).toBeUndefined();
    expect(paginateCraftCatalogue(recipes, tool!, 3)).toBeUndefined();
  });

  it("rejects crafting tools whose static route segments collide", () => {
    expect(() =>
      createCraftCatalogueTools(
        [recipe("one", "odd:tool"), recipe("two", "odd-tool")],
        [],
      ),
    ).toThrow("Multiple crafting tools resolve to the static route odd-tool");
  });
});
