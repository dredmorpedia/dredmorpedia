import type { Item, SourceSummary } from "@dredmorpedia/domain";
import { describe, expect, it } from "vitest";

import {
  createItemCatalogueCategories,
  defaultItemCatalogueCategory,
  itemCatalogueCategoryForSegment,
  itemCatalogueCategoryPath,
  itemCataloguePageSize,
  paginateItemCatalogue,
  sortItemCatalogueItems,
} from "../src/lib/item-catalogue";
import { sourceMarker } from "../src/lib/source-markers";

const sources: SourceSummary[] = [
  {
    id: "synthetic",
    label: "Synthetic",
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

function item(
  id: string,
  name: string,
  category: string,
  options: {
    line?: number;
    price?: number | null;
    quality?: number;
    sourceId?: string;
  } = {},
): Item {
  return {
    kind: "item",
    id,
    canonicalKey: id,
    slug: id,
    slugAliases: [],
    name,
    description: "",
    category,
    price: options.price ?? null,
    quality: options.quality ?? 0,
    artifacts: [],
    armourDeclarations: [],
    weaponDeclarations: [],
    macguffinDeclarations: [],
    toolkitDeclarations: [],
    recoveries: [],
    chargeRanges: [],
    traps: [],
    iconPath: null,
    stats: [],
    modifiers: [],
    triggers: [],
    provenance: {
      sourceId: options.sourceId ?? "synthetic",
      file: "itemDB.xml",
      line: options.line ?? 1,
      column: 1,
      originalName: name,
      originalId: id,
    },
    variants: [],
    appliedOverrides: [],
    appliedPatches: [],
    diagnosticIds: [],
  };
}

describe("item catalogue", () => {
  it("groups and orders known and fallback categories deterministically", () => {
    const categories = createItemCatalogueCategories([
      item("misc", "Misc", "item"),
      item("ingot", "Ingot", "material"),
      item("axe", "Axe", "weapon:axe"),
      item("sword", "Sword", "weapon:sword"),
      item("odd", "Odd", "unusual:thing"),
    ]);

    expect(categories.map(({ key }) => key)).toEqual([
      "weapon:sword",
      "weapon:axe",
      "material",
      "item",
      "unusual:thing",
    ]);
    expect(categories[2]).toMatchObject({
      label: "Material",
      group: "Crafting materials",
      segment: "material",
    });
    expect(defaultItemCatalogueCategory(categories)?.key).toBe("weapon:sword");
    expect(
      itemCatalogueCategoryForSegment(categories, "unusual-thing")?.key,
    ).toBe("unusual:thing");
  });

  it("paginates one category in stable source and XML order by default", () => {
    const items = Array.from(
      { length: itemCataloguePageSize + 2 },
      (_, index) =>
        item(
          `item-${String(index).padStart(2, "0")}`,
          index === 0 ? "Zulu" : `Item ${String(index).padStart(2, "0")}`,
          "wand",
          { line: index + 1 },
        ),
    );
    const [category] = createItemCatalogueCategories(items, sources);

    expect(category).toMatchObject({ count: itemCataloguePageSize + 2 });
    expect(itemCatalogueCategoryPath(category!, 2)).toBe(
      "/items/category/wand/2",
    );
    const firstPage = paginateItemCatalogue(items, category!, 1, { sources });
    const secondPage = paginateItemCatalogue(items, category!, 2, { sources });
    expect(firstPage).toMatchObject({
      page: 1,
      pageCount: 2,
      total: itemCataloguePageSize + 2,
    });
    expect(firstPage?.items).toHaveLength(itemCataloguePageSize);
    expect(secondPage?.items.map(({ name }) => name)).toEqual([
      `Item ${String(itemCataloguePageSize).padStart(2, "0")}`,
      `Item ${String(itemCataloguePageSize + 1).padStart(2, "0")}`,
    ]);
    expect(paginateItemCatalogue(items, category!, 0)).toBeUndefined();
    expect(paginateItemCatalogue(items, category!, 3)).toBeUndefined();
  });

  it("offers deterministic name, quality, value, and all-item views", () => {
    const items = [
      item("late", "Alpha", "wand", {
        line: 1,
        price: null,
        quality: 8,
        sourceId: "expansion",
      }),
      item("first", "Zulu", "wand", { line: 2, price: 10, quality: 1 }),
      item("second", "Beta", "wand", { line: 3, price: 4, quality: 4 }),
    ];
    const [category] = createItemCatalogueCategories(items, sources);

    expect(category?.representativeItemId).toBe("first");
    expect(
      sortItemCatalogueItems(items, sources, "game").map(({ id }) => id),
    ).toEqual(["first", "second", "late"]);
    expect(
      sortItemCatalogueItems(items, sources, "name").map(({ id }) => id),
    ).toEqual(["late", "second", "first"]);
    expect(
      sortItemCatalogueItems(items, sources, "quality").map(({ id }) => id),
    ).toEqual(["first", "second", "late"]);
    expect(
      sortItemCatalogueItems(items, sources, "price").map(({ id }) => id),
    ).toEqual(["second", "first", "late"]);
    expect(
      itemCatalogueCategoryPath(category!, 1, {
        sort: "price",
        pageSize: "all",
      }),
    ).toBe("/items/category/wand/view/price/all/1");
    expect(
      paginateItemCatalogue(items, category!, 1, {
        sources,
        sort: "price",
        pageSize: "all",
      }),
    ).toMatchObject({ pageCount: 1, pageSize: "all", total: 3 });
  });

  it("rejects unsafe and colliding static route segments", () => {
    expect(() =>
      createItemCatalogueCategories([item("unsafe", "Unsafe", "../item")]),
    ).toThrow("cannot be used in a static route");
    expect(() =>
      createItemCatalogueCategories([
        item("one", "One", "weapon:sword"),
        item("two", "Two", "weapon-sword"),
      ]),
    ).toThrow("Multiple item categories resolve to route weapon-sword");
  });

  it("keeps base items unmarked and uses concise accessible expansion labels", () => {
    expect(sourceMarker(sources[0])).toBeNull();
    expect(
      sourceMarker({
        id: "official-expansion-2",
        label: "You Have To Name The Expansion Pack",
        kind: "expansion",
      }),
    ).toEqual({
      fullLabel: "You Have To Name The Expansion Pack",
      shortLabel: "YHTNTEP",
    });
    expect(sourceMarker(sources[1])).toEqual({
      fullLabel: "Expansion",
      shortLabel: "E",
    });
  });
});
