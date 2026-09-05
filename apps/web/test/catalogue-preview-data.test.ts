import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EncrustmentSummaryData } from "../src/components/encrustment-summary-card";
import type { RecipeSummaryData } from "../src/components/recipe-summary-card";

const iconUrl = `/generated-assets/current/files/${"a".repeat(64)}.png`;
const stat = { iconUrl, label: "Test Stat", slug: "test-stat" };
const reference = {
  amount: 2,
  iconUrl,
  itemName: "Test Ingredient",
  itemSlug: "test-ingredient",
  key: "test ingredient",
  skillLevel: null,
};
const recipe: RecipeSummaryData = {
  description: "Synthetic preview",
  hidden: false,
  id: "recipe:test",
  inputs: [reference],
  name: "Test Recipe",
  outputs: [{ ...reference, iconUrl: null, itemSlug: null, skillLevel: 3 }],
  slug: "test-recipe",
  sourceMarker: { fullLabel: "Test Source", shortLabel: "TS" },
  sourceStats: [stat],
  toolIconUrl: null,
  toolLabel: "Test Tool",
};
const encrustment: EncrustmentSummaryData = {
  description: "",
  hidden: true,
  id: "encrustment:test",
  inputs: [reference],
  instability: "+1",
  instabilityIconUrl: iconUrl,
  modifiers: [{ key: "test", label: "Test", stat, value: "+2" }],
  name: "Test Encrustment",
  powers: [{ key: "power", name: "Test Power", chanceLabel: "10%" }],
  skillLevel: 2,
  slots: [{ iconUrl: null, key: "weapon", label: "Weapon" }],
  slug: "test-encrustment",
  sourceMarker: null,
  sourceStats: [],
  toolIconUrl: iconUrl,
  toolLabel: "Test Tool",
};

function payload() {
  return structuredClone({
    schemaVersion: 1,
    recipes: { [recipe.id]: recipe },
    encrustments: { [encrustment.id]: encrustment },
  });
}

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

describe("catalogue preview loading", () => {
  it("shares one validated request across concurrent and later previews", async () => {
    const fetch = vi.fn(async () => Response.json(payload()));
    vi.stubGlobal("fetch", fetch);
    const { loadRecipePreview, loadEncrustmentPreview } =
      await import("../src/lib/catalogue-preview-data");

    expect(fetch).not.toHaveBeenCalled();
    await expect(
      Promise.all([
        loadRecipePreview(recipe.id),
        loadEncrustmentPreview(encrustment.id),
      ]),
    ).resolves.toEqual([recipe, encrustment]);
    await expect(loadRecipePreview(recipe.id)).resolves.toEqual(recipe);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["empty summary", {}],
    ["null ingredient", { ...recipe, inputs: [null] }],
    ["missing outputs", { ...recipe, outputs: undefined }],
    ["invalid amount", { ...recipe, inputs: [{ ...reference, amount: 0 }] }],
    [
      "invalid level",
      { ...recipe, outputs: [{ ...reference, skillLevel: -1 }] },
    ],
    ["invalid source marker", { ...recipe, sourceMarker: {} }],
    ["invalid stat", { ...recipe, sourceStats: [{ ...stat, label: {} }] }],
    ["unsafe route", { ...recipe, slug: "../other" }],
    ["external image", { ...recipe, toolIconUrl: "https://example.com/a.png" }],
    ["mismatched identity", { ...recipe, id: "recipe:other" }],
  ])(
    "rejects a recipe with %s and retries after correction",
    async (_, invalid) => {
      const broken = { ...payload(), recipes: { [recipe.id]: invalid } };
      const fetch = vi
        .fn()
        .mockResolvedValueOnce(Response.json(broken))
        .mockResolvedValueOnce(Response.json(payload()));
      vi.stubGlobal("fetch", fetch);
      const { loadRecipePreview } =
        await import("../src/lib/catalogue-preview-data");

      await expect(loadRecipePreview(recipe.id)).rejects.toThrow(
        "invalid payload",
      );
      await expect(loadRecipePreview(recipe.id)).resolves.toEqual(recipe);
      expect(fetch).toHaveBeenCalledTimes(2);
    },
  );

  it.each([
    ["missing modifiers", { ...encrustment, modifiers: undefined }],
    [
      "invalid nested stat",
      {
        ...encrustment,
        modifiers: [{ ...encrustment.modifiers[0], stat: {} }],
      },
    ],
    ["invalid slot", { ...encrustment, slots: [null] }],
    ["invalid power", { ...encrustment, powers: [{ name: "Test" }] }],
  ])("rejects an encrustment with %s", async (_, invalid) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          ...payload(),
          encrustments: { [encrustment.id]: invalid },
        }),
      ),
    );
    const { loadEncrustmentPreview } =
      await import("../src/lib/catalogue-preview-data");
    await expect(loadEncrustmentPreview(encrustment.id)).rejects.toThrow(
      "invalid payload",
    );
  });

  it("rejects missing and inherited record keys without returning a false summary", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(payload())),
    );
    const { loadRecipePreview, loadEncrustmentPreview } =
      await import("../src/lib/catalogue-preview-data");
    await expect(loadRecipePreview("recipe:missing")).rejects.toThrow(
      "not available",
    );
    await expect(loadRecipePreview("toString")).rejects.toThrow(
      "not available",
    );
    await expect(loadEncrustmentPreview("constructor")).rejects.toThrow(
      "not available",
    );
  });

  it("retries after HTTP and JSON failures", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("Unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response("invalid JSON"))
      .mockResolvedValueOnce(Response.json(payload()));
    vi.stubGlobal("fetch", fetch);
    const { loadRecipePreview } =
      await import("../src/lib/catalogue-preview-data");
    await expect(loadRecipePreview(recipe.id)).rejects.toThrow("HTTP 503");
    await expect(loadRecipePreview(recipe.id)).rejects.toThrow();
    await expect(loadRecipePreview(recipe.id)).resolves.toEqual(recipe);
  });
});
