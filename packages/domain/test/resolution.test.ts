import { describe, expect, it } from "vitest";

import {
  canonicalKey,
  entityId,
  resolveEntityCandidates,
  slugify,
  type EntityCandidate,
  type Item,
} from "../src/index";

function candidate(
  sourceId: string,
  precedence: number,
  price: number,
): EntityCandidate<Item> {
  const name = "Clockwork Blade";
  const provenance = {
    sourceId,
    file: `${sourceId}/itemDB.xml`,
    line: 2,
    column: 3,
    originalName: name,
  };

  return {
    precedence,
    entity: {
      id: entityId("item", name),
      kind: "item",
      canonicalKey: canonicalKey(name),
      slug: slugify(name),
      name,
      description: `${sourceId} variant`,
      category: "weapon",
      price,
      iconPath: null,
      stats: [],
      provenance,
      variants: [provenance],
      appliedOverrides: [],
      diagnosticIds: [],
    },
  };
}

describe("source precedence", () => {
  it("is deterministic regardless of candidate input order", () => {
    const lower = candidate("synthetic-base", 0, 120);
    const higher = candidate("synthetic-expansion", 10, 155);

    const forward = resolveEntityCandidates([lower, higher]);
    const reverse = resolveEntityCandidates([higher, lower]);

    expect(forward).toEqual(reverse);
    expect(forward.active[0]?.price).toBe(155);
    expect(
      forward.active[0]?.variants.map((variant) => variant.sourceId),
    ).toEqual(["synthetic-base", "synthetic-expansion"]);
    expect(forward.collisions[0]?.changedFields).toContain("price");
  });
});
