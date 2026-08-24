import { describe, expect, it } from "vitest";

import {
  acidiumSalisCorrectionReviewId,
  canonicalRelationshipReviewDataset,
  itemCorrectionReview,
  sourceOnlyItemReview,
  sourceOnlyItemReviewId,
  type SourceOnlyItemReviewQuery,
} from "../src/relationship-reviews";

const approvedQuery: SourceOnlyItemReviewQuery = {
  ...canonicalRelationshipReviewDataset,
  sourceId: "official-base",
  ownerId: "spell:spore stash",
  relationship: "spell-effect-item-option",
  sourceLabel: "Spores",
};

const approvedCorrectionQuery: SourceOnlyItemReviewQuery = {
  ...canonicalRelationshipReviewDataset,
  sourceId: "official-base",
  ownerId: "spell:luckier find",
  relationship: "spell-effect-item-option",
  sourceLabel: "Acidium Salis",
};

describe("reviewed relationship classifications", () => {
  it("matches only the approved canonical owners and relationship labels", () => {
    expect(sourceOnlyItemReview(approvedQuery)).toBe(sourceOnlyItemReviewId);
    expect(
      sourceOnlyItemReview({
        ...approvedQuery,
        ownerId: "skill:perception",
        relationship: "skill-loadout-item",
        sourceLabel: "lockpick",
      }),
    ).toBeNull();
  });

  it.each([
    ["dataset", { datasetId: "another-dataset" }],
    ["dataset version", { datasetVersion: "another-version" }],
    ["source", { sourceId: "official-expansion-1" }],
    ["source version", { sourceVersion: "another-version" }],
    ["owner", { ownerId: "spell:another stash" }],
    ["relationship", { relationship: "skill-loadout-item" as const }],
    ["source label", { sourceLabel: "spores" }],
  ])("does not broaden the review across a changed %s", (_label, change) => {
    expect(sourceOnlyItemReview({ ...approvedQuery, ...change })).toBeNull();
  });

  it("returns the approved correction target and review provenance", () => {
    expect(itemCorrectionReview(approvedCorrectionQuery)).toEqual({
      reviewId: acidiumSalisCorrectionReviewId,
      targetId: "item:acidum salis",
    });
  });

  it.each([
    ["dataset", { datasetId: "another-dataset" }],
    ["dataset version", { datasetVersion: "another-version" }],
    ["source", { sourceId: "official-expansion-1" }],
    ["source version", { sourceVersion: "another-version" }],
    ["owner", { ownerId: "spell:another find" }],
    ["relationship", { relationship: "skill-loadout-item" as const }],
    ["source label", { sourceLabel: "Acidum Salis" }],
  ])(
    "does not broaden the correction across a changed %s",
    (_label, change) => {
      expect(
        itemCorrectionReview({ ...approvedCorrectionQuery, ...change }),
      ).toBeNull();
    },
  );
});
