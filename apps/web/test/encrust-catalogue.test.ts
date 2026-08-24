import type {
  Encrustment,
  Item,
  ItemToolkitMetadata,
  SourceSummary,
} from "@dredmorpedia/domain";
import { describe, expect, it } from "vitest";

import {
  createEncrustCatalogueTools,
  defaultEncrustCatalogueTool,
  encrustCatalogueToolForSegment,
  encrustCatalogueToolPath,
  encrustmentsForCatalogueTool,
  paginateEncrustCatalogue,
} from "../src/lib/encrust-catalogue";
import { aggregateEncrustmentInputs } from "../src/lib/encrustment-inputs";
import { encrustmentSlotIconIds } from "../src/lib/encrustment-slot-icons";

const sources: SourceSummary[] = [
  { id: "base", label: "Base", kind: "base", version: "1", precedence: 0 },
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

function encrustment(
  id: string,
  tool: string,
  options: {
    instability?: number;
    line?: number;
    skillLevel?: number;
    sourceId?: string;
  } = {},
): Encrustment {
  return {
    kind: "encrustment",
    id,
    canonicalKey: id,
    slug: id,
    slugAliases: [],
    name: id,
    description: "",
    tool,
    hidden: false,
    skillLevel: options.skillLevel ?? 0,
    inputs: [],
    slots: [],
    instability: options.instability ?? 0,
    modifiers: [],
    powers: [],
    appearanceDescriptors: [],
    provenance: {
      sourceId: options.sourceId ?? "base",
      file: "encrustDB.xml",
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

describe("encrust catalogue", () => {
  it("maps every normalized official slot to its dedicated interface icon", () => {
    expect(encrustmentSlotIconIds).toEqual({
      neck: "encrust-slot-neck",
      chest: "encrust-slot-chest",
      waist: "encrust-slot-waist",
      feet: "encrust-slot-feet",
      ranged: "encrust-slot-ranged",
      hands: "encrust-slot-hands",
      head: "encrust-slot-head",
      legs: "encrust-slot-legs",
      ring: "encrust-slot-ring",
      shield: "encrust-slot-shield",
      weapon: "encrust-slot-weapon",
    });
  });

  it("uses familiar tool order and verified toolkit names", () => {
    const entries = [
      encrustment("smith", "smithing"),
      encrustment("lathe", "lathe"),
      encrustment("alchemy", "alchemy"),
      encrustment("odd", "odd tool"),
      encrustment("smith-two", "Smithing"),
    ];
    const tools = createEncrustCatalogueTools(entries, [
      toolkit("anvil", "My Little Anvil", "smithing"),
      toolkit("lathe-tool", "n-Dimensional Lathe", "lathe"),
    ]);

    expect(tools.map(({ tag }) => tag)).toEqual([
      "lathe",
      "alchemy",
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
      label: "Alchemy",
      representativeItemId: null,
    });
    expect(tools[2]).toMatchObject({ count: 2, label: "My Little Anvil" });
    expect(defaultEncrustCatalogueTool(tools)?.tag).toBe("lathe");
    expect(encrustCatalogueToolForSegment(tools, "smithing")?.tag).toBe(
      "smithing",
    );
    expect(encrustCatalogueToolPath(tools[2]!)).toBe("/encrusts/tool/smithing");
  });

  it("keeps game order and provides shareable alternate views", () => {
    const entries = [
      encrustment("expansion-first", "smithing", {
        line: 1,
        sourceId: "expansion",
      }),
      encrustment("zulu", "smithing", {
        instability: 10,
        line: 20,
        skillLevel: 4,
      }),
      encrustment("alpha", "smithing", {
        instability: -5,
        line: 10,
        skillLevel: 2,
      }),
    ];
    const [tool] = createEncrustCatalogueTools(entries, []);

    expect(
      encrustmentsForCatalogueTool(entries, tool!, sources).map(({ id }) => id),
    ).toEqual(["alpha", "zulu", "expansion-first"]);
    expect(
      encrustmentsForCatalogueTool(entries, tool!, sources, "name").map(
        ({ id }) => id,
      ),
    ).toEqual(["alpha", "expansion-first", "zulu"]);
    expect(
      encrustmentsForCatalogueTool(entries, tool!, sources, "skill")[0]?.id,
    ).toBe("expansion-first");
    expect(
      encrustmentsForCatalogueTool(entries, tool!, sources, "instability")[0]
        ?.id,
    ).toBe("alpha");
    expect(
      encrustCatalogueToolPath(tool!, 1, { sort: "name", pageSize: 12 }),
    ).toBe("/encrusts/tool/smithing/view/name/12/1");
  });

  it("shows all by default while retaining optional bounded pagination", () => {
    const entries = Array.from({ length: 14 }, (_, index) =>
      encrustment(`entry-${index}`, "smithing", { line: index + 1 }),
    );
    const [tool] = createEncrustCatalogueTools(entries, []);

    expect(tool).toMatchObject({ count: 14, pageCount: 1 });
    expect(
      paginateEncrustCatalogue(entries, tool!, 1)?.encrustments,
    ).toHaveLength(14);
    expect(
      paginateEncrustCatalogue(entries, tool!, 2, { pageSize: 12 }),
    ).toMatchObject({ page: 2, pageCount: 2, total: 14 });
    expect(
      paginateEncrustCatalogue(entries, tool!, 2, { pageSize: 12 })
        ?.encrustments,
    ).toHaveLength(2);
    expect(paginateEncrustCatalogue(entries, tool!, 0)).toBeUndefined();
    expect(
      paginateEncrustCatalogue(entries, tool!, 3, { pageSize: 12 }),
    ).toBeUndefined();
  });

  it("aggregates repeated ingredient declarations for catalogue display", () => {
    expect(
      aggregateEncrustmentInputs([
        { itemKey: "pearl", itemName: "Black Pearl", amount: 1 },
        { itemKey: "chalk", itemName: "Chalk", amount: 1 },
        { itemKey: "pearl", itemName: "Black Pearl", amount: 2 },
      ]),
    ).toEqual([
      { itemKey: "pearl", itemName: "Black Pearl", amount: 3 },
      { itemKey: "chalk", itemName: "Chalk", amount: 1 },
    ]);
  });

  it("rejects encrusting tools whose static segments collide", () => {
    expect(() =>
      createEncrustCatalogueTools(
        [encrustment("one", "odd:tool"), encrustment("two", "odd-tool")],
        [],
      ),
    ).toThrow("Multiple encrusting tools resolve to the static route odd-tool");
  });
});
