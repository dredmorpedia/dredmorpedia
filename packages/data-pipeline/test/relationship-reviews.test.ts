import { describe, expect, it } from "vitest";

import {
  canonicalRelationshipReviewDataset,
  sourceOnlyItemReview,
  sourceOnlyItemReviewId,
  type SourceOnlyItemReviewQuery,
} from "../src/relationship-reviews";

const approvedQuery: SourceOnlyItemReviewQuery = {
  ...canonicalRelationshipReviewDataset,
  sourceId: "official-base",
  ownerId: "skill:perception",
  relationship: "skill-loadout-item",
  sourceLabel: "lockpick",
};

describe("reviewed relationship classifications", () => {
  it("matches only the approved canonical owners and relationship labels", () => {
    expect(sourceOnlyItemReview(approvedQuery)).toBe(sourceOnlyItemReviewId);
    expect(
      sourceOnlyItemReview({
        ...approvedQuery,
        ownerId: "spell:spore stash",
        relationship: "spell-effect-item-option",
        sourceLabel: "Spores",
      }),
    ).toBe(sourceOnlyItemReviewId);
  });

  it.each([
    ["dataset", { datasetId: "another-dataset" }],
    ["dataset version", { datasetVersion: "another-version" }],
    ["source", { sourceId: "official-expansion-1" }],
    ["source version", { sourceVersion: "another-version" }],
    ["owner", { ownerId: "skill:another" }],
    ["relationship", { relationship: "spell-effect-item-option" as const }],
    ["source label", { sourceLabel: "Lockpick" }],
  ])("does not broaden the review across a changed %s", (_label, change) => {
    expect(sourceOnlyItemReview({ ...approvedQuery, ...change })).toBeNull();
  });
});
