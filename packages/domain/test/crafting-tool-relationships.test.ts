import { describe, expect, it } from "vitest";

import {
  itemToolkitEncrustmentRelationships,
  itemToolkitRecipeRelationships,
  toolkitItemsForTag,
  type Encrustment,
  type Item,
  type ItemToolkitMetadata,
  type Recipe,
} from "../src/index";

const toolkitDeclaration = (tag: string | null): ItemToolkitMetadata => ({
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
});

const item = (name: string, declarations: ItemToolkitMetadata[]): Item => ({
  id: `item:${name.toLocaleLowerCase("en")}`,
  kind: "item",
  canonicalKey: name.toLocaleLowerCase("en"),
  slug: name.toLocaleLowerCase("en").replaceAll(" ", "-"),
  slugAliases: [],
  name,
  description: "",
  provenance: {
    sourceId: "test",
    file: "itemDB.xml",
    line: 1,
    column: 1,
    originalName: name,
  },
  variants: [],
  appliedOverrides: [],
  appliedPatches: [],
  diagnosticIds: [],
  category: "toolkit",
  price: null,
  quality: 0,
  artifacts: [],
  armourDeclarations: [],
  weaponDeclarations: [],
  macguffinDeclarations: [],
  toolkitDeclarations: declarations,
  recoveries: [],
  chargeRanges: [],
  traps: [],
  iconPath: null,
  stats: [],
  modifiers: [],
  triggers: [],
});

const recipe = (name: string, tool: string): Recipe => ({
  id: `recipe:${name.toLocaleLowerCase("en")}`,
  kind: "recipe",
  canonicalKey: name.toLocaleLowerCase("en"),
  slug: name.toLocaleLowerCase("en").replaceAll(" ", "-"),
  slugAliases: [],
  name,
  description: "",
  provenance: {
    sourceId: "test",
    file: "craftDB.xml",
    line: 1,
    column: 1,
    originalName: name,
  },
  variants: [],
  appliedOverrides: [],
  appliedPatches: [],
  diagnosticIds: [],
  tool,
  hidden: false,
  skillLevel: 0,
  inputs: [],
  outputs: [],
});

const encrustment = (name: string, tool: string): Encrustment => ({
  id: `encrustment:${name.toLocaleLowerCase("en")}`,
  kind: "encrustment",
  canonicalKey: name.toLocaleLowerCase("en"),
  slug: name.toLocaleLowerCase("en").replaceAll(" ", "-"),
  slugAliases: [],
  name,
  description: "",
  provenance: {
    sourceId: "test",
    file: "encrustDB.xml",
    line: 1,
    column: 1,
    originalName: name,
  },
  variants: [],
  appliedOverrides: [],
  appliedPatches: [],
  diagnosticIds: [],
  tool,
  hidden: false,
  skillLevel: 0,
  instability: 0,
  slots: [],
  inputs: [],
  modifiers: [],
  powers: [],
  appearanceDescriptors: [],
});

describe("crafting toolkit relationships", () => {
  it("matches recipe and encrustment tool tags without case sensitivity", () => {
    const smithingKit = item("Smithing Kit", [
      toolkitDeclaration(" Smithing "),
    ]);

    expect(
      itemToolkitRecipeRelationships(
        [
          recipe("Later recipe", "smithing"),
          recipe("Alchemy recipe", "alchemy"),
          recipe("Earlier recipe", "SMITHING"),
        ],
        smithingKit,
      ).map((entry) => entry.name),
    ).toEqual(["Earlier recipe", "Later recipe"]);
    expect(
      itemToolkitEncrustmentRelationships(
        [
          encrustment("Smithing polish", "smithing"),
          encrustment("Alchemy polish", "alchemy"),
        ],
        smithingKit,
      ).map((entry) => entry.name),
    ).toEqual(["Smithing polish"]);
  });

  it("returns each matching item once and ignores unavailable tags", () => {
    const items = [
      item("Later Kit", [
        toolkitDeclaration(null),
        toolkitDeclaration("smithing"),
        toolkitDeclaration("SMITHING"),
      ]),
      item("Earlier Kit", [toolkitDeclaration("SMITHING")]),
      item("Other Kit", [toolkitDeclaration("alchemy")]),
    ];

    expect(
      toolkitItemsForTag(items, "smithing").map(
        ({ item: relatedItem, declarationIndex }) =>
          `${relatedItem.name}:${declarationIndex}`,
      ),
    ).toEqual(["Earlier Kit:0", "Later Kit:1"]);
  });
});
