import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ItemPreviewData } from "../src/lib/item-preview-types";

const iconUrl = `/generated-assets/current/files/${"a".repeat(64)}.png`;
const summary: ItemPreviewData = {
  category: "Wand",
  description: "Synthetic preview",
  effects: [
    {
      iconUrl,
      spell: { name: "Test Effect", slug: "test-effect" },
      trigger: {
        chance: 25,
        delay: 1,
        duration: 2,
        kind: "zapped",
        monsterTaxonomy: null,
        spellName: "Test Effect",
        unresistable: false,
      },
    },
  ],
  engineReference: false,
  facts: [{ label: "Wand", value: "2–4 charges" }],
  iconUrl,
  modifiers: [
    {
      group: "damage",
      label: "Test Damage",
      value: "+3",
      stat: { iconUrl, label: "Test Damage", slug: "test-damage" },
    },
  ],
  name: "Test Wand",
  remainingEffects: 0,
  slug: "test-wand",
  sourceMarker: null,
};
const payload = (item = summary) => ({ schemaVersion: 1, item });
beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

describe("item preview loading", () => {
  it("fetches only the requested item and shares concurrent and subsequent results", async () => {
    const fetch = vi.fn(async () => Response.json(payload()));
    vi.stubGlobal("fetch", fetch);
    const { loadItemPreview } = await import("../src/lib/item-preview-data");
    expect(fetch).not.toHaveBeenCalled();
    expect(
      await Promise.all([
        loadItemPreview(summary.slug),
        loadItemPreview(summary.slug),
      ]),
    ).toEqual([summary, summary]);
    expect(await loadItemPreview(summary.slug)).toEqual(summary);
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      "/item-previews/test-wand/summary.json",
    );
  });

  it.each([
    ["missing item", undefined],
    ["null fact", { ...summary, facts: [null] }],
    [
      "invalid nested modifier",
      { ...summary, modifiers: [{ ...summary.modifiers[0], stat: {} }] },
    ],
    [
      "invalid trigger",
      {
        ...summary,
        effects: [
          {
            ...summary.effects[0],
            trigger: { ...summary.effects[0]!.trigger, kind: "invented" },
          },
        ],
      },
    ],
    [
      "non-numeric chance",
      {
        ...summary,
        effects: [
          {
            ...summary.effects[0],
            trigger: { ...summary.effects[0]!.trigger, chance: "25" },
          },
        ],
      },
    ],
    [
      "unsafe spell route",
      {
        ...summary,
        effects: [
          { ...summary.effects[0], spell: { name: "Bad", slug: "../other" } },
        ],
      },
    ],
    [
      "external image",
      { ...summary, iconUrl: "https://example.com/image.png" },
    ],
    ["wrong item", { ...summary, slug: "other-item" }],
    ["unbounded description", { ...summary, description: "x".repeat(241) }],
    ["missing source label", { ...summary, sourceMarker: {} }],
  ])("rejects %s and retries a corrected response", async (_, invalid) => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ schemaVersion: 1, item: invalid }))
      .mockResolvedValueOnce(Response.json(payload()));
    vi.stubGlobal("fetch", fetch);
    const { loadItemPreview } = await import("../src/lib/item-preview-data");
    await expect(loadItemPreview(summary.slug)).rejects.toThrow(
      "invalid payload",
    );
    await expect(loadItemPreview(summary.slug)).resolves.toEqual(summary);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("rejects unsafe request paths without making a request", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { loadItemPreview } = await import("../src/lib/item-preview-data");
    await expect(loadItemPreview("../test-wand")).rejects.toThrow(
      "route is invalid",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("retries network, HTTP, and JSON failures without evicting other successful items", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json(payload()))
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response("bad JSON"))
      .mockResolvedValueOnce(
        Response.json(payload({ ...summary, slug: "other-item" })),
      );
    vi.stubGlobal("fetch", fetch);
    const { loadItemPreview } = await import("../src/lib/item-preview-data");
    await loadItemPreview(summary.slug);
    await expect(loadItemPreview("other-item")).rejects.toThrow("offline");
    await expect(loadItemPreview("other-item")).rejects.toThrow("HTTP 503");
    await expect(loadItemPreview("other-item")).rejects.toThrow();
    await expect(loadItemPreview("other-item")).resolves.toMatchObject({
      slug: "other-item",
    });
    expect(await loadItemPreview(summary.slug)).toEqual(summary);
    expect(fetch).toHaveBeenCalledTimes(5);
  });
});
