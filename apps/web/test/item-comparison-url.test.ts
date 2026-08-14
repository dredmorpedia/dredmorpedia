import { describe, expect, it } from "vitest";

import {
  canonicalItemComparisonParams,
  comparedItemSlugs,
  updateComparedItemParams,
} from "../src/lib/item-comparison-url";

const validSlugs = new Set(["blade", "cuirass", "wand", "trap"]);

describe("item comparison URL state", () => {
  it("keeps three unique valid items in their source order", () => {
    expect(
      comparedItemSlugs(
        "item=blade&item=unknown&item=cuirass&item=blade&item=wand&item=trap",
        validSlugs,
      ),
    ).toEqual(["blade", "cuirass", "wand"]);
  });

  it("canonicalizes item state without discarding unrelated parameters", () => {
    expect(
      canonicalItemComparisonParams(
        "item=unknown&view=compact&item=blade&item=blade&item=wand",
        validSlugs,
      ).toString(),
    ).toBe("view=compact&item=blade&item=wand");
  });

  it("replaces, removes, and de-duplicates comparison slots", () => {
    expect(
      updateComparedItemParams(
        "item=blade&item=cuirass&item=wand",
        validSlugs,
        1,
        "trap",
      ).getAll("item"),
    ).toEqual(["blade", "trap", "wand"]);
    expect(
      updateComparedItemParams(
        "item=blade&item=cuirass&item=wand",
        validSlugs,
        0,
        "wand",
      ).getAll("item"),
    ).toEqual(["wand", "cuirass"]);
    expect(
      updateComparedItemParams(
        "item=blade&item=cuirass&item=wand",
        validSlugs,
        1,
        null,
      ).getAll("item"),
    ).toEqual(["blade", "wand"]);
  });

  it("ignores invalid updates and canonicalizes out-of-range requests", () => {
    expect(
      updateComparedItemParams(
        "item=blade&item=unknown",
        validSlugs,
        8,
        "trap",
      ).getAll("item"),
    ).toEqual(["blade"]);
    expect(
      updateComparedItemParams("item=blade", validSlugs, 0, "unknown").getAll(
        "item",
      ),
    ).toEqual(["blade"]);
  });
});
