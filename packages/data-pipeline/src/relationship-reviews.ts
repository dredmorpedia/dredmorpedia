export const canonicalRelationshipReviewDataset = {
  datasetId: "dredmor-1.1.5-public-beta-steam-build-22934623",
  datasetVersion: "1.1.5 public_beta (Steam build 22934623)",
  sourceVersion: "1.1.5 public_beta (Steam build 22934623)",
} as const;

export const sourceOnlyItemReviewId =
  "relationship-review:2026-08-09:lockpick-and-spores-source-only";

export const acidiumSalisCorrectionReviewId =
  "relationship-review:2026-08-09:acidium-salis-to-acidum-salis";

export type ReviewedItemRelationship =
  "skill-loadout-item" | "spell-effect-item-option";

export interface SourceOnlyItemReviewQuery {
  datasetId: string;
  datasetVersion: string;
  sourceId: string;
  sourceVersion: string | undefined;
  ownerId: string;
  relationship: ReviewedItemRelationship;
  sourceLabel: string;
}

interface SourceOnlyItemReviewRule extends SourceOnlyItemReviewQuery {
  sourceVersion: string;
  reviewId: string;
}

export interface ReviewedItemCorrection {
  reviewId: string;
  targetId: string;
}

interface ItemCorrectionReviewRule extends SourceOnlyItemReviewQuery {
  sourceVersion: string;
  reviewId: string;
  targetId: string;
}

const sourceOnlyItemReviewRules: readonly SourceOnlyItemReviewRule[] = [
  {
    ...canonicalRelationshipReviewDataset,
    sourceId: "official-base",
    ownerId: "skill:burglary",
    relationship: "skill-loadout-item",
    sourceLabel: "lockpick",
    reviewId: sourceOnlyItemReviewId,
  },
  {
    ...canonicalRelationshipReviewDataset,
    sourceId: "official-base",
    ownerId: "skill:perception",
    relationship: "skill-loadout-item",
    sourceLabel: "lockpick",
    reviewId: sourceOnlyItemReviewId,
  },
  {
    ...canonicalRelationshipReviewDataset,
    sourceId: "official-expansion-1",
    ownerId: "skill:piracy",
    relationship: "skill-loadout-item",
    sourceLabel: "lockpick",
    reviewId: sourceOnlyItemReviewId,
  },
  {
    ...canonicalRelationshipReviewDataset,
    sourceId: "official-base",
    ownerId: "spell:spore stash",
    relationship: "spell-effect-item-option",
    sourceLabel: "Spores",
    reviewId: sourceOnlyItemReviewId,
  },
];

const itemCorrectionReviewRules: readonly ItemCorrectionReviewRule[] = [
  {
    ...canonicalRelationshipReviewDataset,
    sourceId: "official-base",
    ownerId: "spell:luckier find",
    relationship: "spell-effect-item-option",
    sourceLabel: "Acidium Salis",
    targetId: "item:acidum salis",
    reviewId: acidiumSalisCorrectionReviewId,
  },
];

export function sourceOnlyItemReview(
  query: SourceOnlyItemReviewQuery,
): string | null {
  const match = sourceOnlyItemReviewRules.find(
    (rule) =>
      rule.datasetId === query.datasetId &&
      rule.datasetVersion === query.datasetVersion &&
      rule.sourceId === query.sourceId &&
      rule.sourceVersion === query.sourceVersion &&
      rule.ownerId === query.ownerId &&
      rule.relationship === query.relationship &&
      rule.sourceLabel === query.sourceLabel,
  );
  return match?.reviewId ?? null;
}

export function itemCorrectionReview(
  query: SourceOnlyItemReviewQuery,
): ReviewedItemCorrection | null {
  const match = itemCorrectionReviewRules.find(
    (rule) =>
      rule.datasetId === query.datasetId &&
      rule.datasetVersion === query.datasetVersion &&
      rule.sourceId === query.sourceId &&
      rule.sourceVersion === query.sourceVersion &&
      rule.ownerId === query.ownerId &&
      rule.relationship === query.relationship &&
      rule.sourceLabel === query.sourceLabel,
  );
  return match ? { reviewId: match.reviewId, targetId: match.targetId } : null;
}
