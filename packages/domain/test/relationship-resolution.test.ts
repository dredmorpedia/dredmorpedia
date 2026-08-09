import { describe, expect, it } from "vitest";

import {
  classifyRelationshipAsSourceOnly,
  resolveRelationshipExactly,
  resolveRelationshipWithReviewedCorrection,
  unresolvedRelationship,
} from "../src/index";

describe("relationship resolution", () => {
  it("retains the exact source label through every reviewed state", () => {
    const unresolved = unresolvedRelationship("item", "Acidium Salis");

    expect(resolveRelationshipExactly(unresolved, "item:acidum salis")).toEqual(
      {
        status: "resolved",
        resolutionMethod: "exact",
        targetKind: "item",
        sourceLabel: "Acidium Salis",
        targetId: "item:acidum salis",
      },
    );
    expect(
      resolveRelationshipWithReviewedCorrection(
        unresolved,
        "item:acidum salis",
        "review:acidium-salis",
      ),
    ).toEqual({
      status: "resolved",
      resolutionMethod: "reviewed-correction",
      targetKind: "item",
      sourceLabel: "Acidium Salis",
      targetId: "item:acidum salis",
      reviewId: "review:acidium-salis",
    });
    expect(
      classifyRelationshipAsSourceOnly(unresolved, "review:source-only-item"),
    ).toEqual({
      status: "source-only",
      targetKind: "item",
      sourceLabel: "Acidium Salis",
      reviewId: "review:source-only-item",
    });
  });

  it("rejects blank labels, targets, and review identifiers", () => {
    expect(() => unresolvedRelationship("item", " ")).toThrow(/source label/);

    const unresolved = unresolvedRelationship("item", "Spores");
    expect(() => resolveRelationshipExactly(unresolved, " ")).toThrow(
      /target ID/,
    );
    expect(() => classifyRelationshipAsSourceOnly(unresolved, " ")).toThrow(
      /review ID/,
    );
    expect(() =>
      resolveRelationshipWithReviewedCorrection(unresolved, "item:spores", ""),
    ).toThrow(/review ID/);
    expect(() =>
      resolveRelationshipExactly(
        { ...unresolved, sourceLabel: "" },
        "item:spores",
      ),
    ).toThrow(/source label/);
  });
});
