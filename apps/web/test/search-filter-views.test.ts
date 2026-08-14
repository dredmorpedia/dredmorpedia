import { describe, expect, it } from "vitest";

import { searchFilterViews } from "../src/lib/search-filter-views";

describe("reusable search filter views", () => {
  it("uses unique stable IDs and ordinary shareable search URLs", () => {
    expect(new Set(searchFilterViews.map((view) => view.id)).size).toBe(
      searchFilterViews.length,
    );

    for (const view of searchFilterViews) {
      const url = new URL(view.href, "https://dredmorpedia.invalid");
      expect(url.pathname).toBe("/search/");
      expect(url.searchParams.get("kind")).toBe("crafting");
    }
  });

  it("provides a cross-list numeric crafting view", () => {
    const view = searchFilterViews.find(
      (candidate) => candidate.id === "early-crafting",
    );
    const url = new URL(view!.href, "https://dredmorpedia.invalid");

    expect(url.searchParams.get("maxSkill")).toBe("2");
  });
});
