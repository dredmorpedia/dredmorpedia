import { describe, expect, it } from "vitest";

import { itemCategoryLabel } from "../src/index";

describe("item category labels", () => {
  it("labels structured category keys for display", () => {
    expect(itemCategoryLabel("weapon:sword")).toBe("Sword weapon");
    expect(itemCategoryLabel("armour:chest")).toBe("Chest armour");
    expect(itemCategoryLabel("weapon:ammunition")).toBe("Ammunition");
  });

  it("keeps custom fixture and mod categories readable", () => {
    expect(itemCategoryLabel("crafting_material")).toBe("Crafting Material");
    expect(itemCategoryLabel("")).toBe("Item");
  });
});
