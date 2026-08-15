import type { Item } from "@dredmorpedia/domain";
import { describe, expect, it } from "vitest";

import {
  createItemCatalogueCategories,
  defaultItemCatalogueCategory,
  itemCatalogueCategoryForSegment,
  itemCatalogueCategoryPath,
  itemCataloguePageSize,
  paginateItemCatalogue,
} from "../src/lib/item-catalogue";

function item(id: string, name: string, category: string): Item {
  return {
    kind: "item",
    id,
    canonicalKey: id,
    slug: id,
    slugAliases: [],
    name,
    description: "",
    category,
    price: null,
    quality: 0,
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
      sourceId: "synthetic",
      file: "itemDB.xml",
      line: 1,
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

  it("paginates one category with stable name and ID ordering", () => {
    const items = Array.from(
      { length: itemCataloguePageSize + 2 },
      (_, index) =>
        item(
          `item-${String(index).padStart(2, "0")}`,
          index === 0 ? "Zulu" : `Item ${String(index).padStart(2, "0")}`,
          "wand",
        ),
    );
    const [category] = createItemCatalogueCategories(items);

    expect(category).toMatchObject({ count: itemCataloguePageSize + 2 });
    expect(itemCatalogueCategoryPath(category!, 2)).toBe(
      "/items/category/wand/2",
    );
    const firstPage = paginateItemCatalogue(items, category!, 1);
    const secondPage = paginateItemCatalogue(items, category!, 2);
    expect(firstPage).toMatchObject({
      page: 1,
      pageCount: 2,
      total: itemCataloguePageSize + 2,
    });
    expect(firstPage?.items).toHaveLength(itemCataloguePageSize);
    expect(secondPage?.items.map(({ name }) => name)).toEqual([
      `Item ${String(itemCataloguePageSize + 1).padStart(2, "0")}`,
      "Zulu",
    ]);
    expect(paginateItemCatalogue(items, category!, 0)).toBeUndefined();
    expect(paginateItemCatalogue(items, category!, 3)).toBeUndefined();
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
});
