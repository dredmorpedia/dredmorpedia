import type { EntityKind, RelationshipResolution } from "./types";

function requireNonblank(value: string, label: string): string {
  if (value.trim().length === 0) {
    throw new Error(`${label} must be non-blank.`);
  }
  return value;
}

export function unresolvedRelationship<TargetKind extends EntityKind>(
  targetKind: TargetKind,
  sourceLabel: string,
): RelationshipResolution<TargetKind> {
  return {
    status: "unresolved",
    targetKind,
    sourceLabel: requireNonblank(sourceLabel, "Relationship source label"),
  };
}

export function resolveRelationshipExactly<TargetKind extends EntityKind>(
  relationship: RelationshipResolution<TargetKind>,
  targetId: string,
): RelationshipResolution<TargetKind> {
  return {
    status: "resolved",
    resolutionMethod: "exact",
    targetKind: relationship.targetKind,
    sourceLabel: requireNonblank(
      relationship.sourceLabel,
      "Relationship source label",
    ),
    targetId: requireNonblank(targetId, "Relationship target ID"),
  };
}

export function resolveRelationshipWithReviewedCorrection<
  TargetKind extends EntityKind,
>(
  relationship: RelationshipResolution<TargetKind>,
  targetId: string,
  reviewId: string,
): RelationshipResolution<TargetKind> {
  return {
    status: "resolved",
    resolutionMethod: "reviewed-correction",
    targetKind: relationship.targetKind,
    sourceLabel: requireNonblank(
      relationship.sourceLabel,
      "Relationship source label",
    ),
    targetId: requireNonblank(targetId, "Relationship target ID"),
    reviewId: requireNonblank(reviewId, "Relationship review ID"),
  };
}

export function classifyRelationshipAsSourceOnly<TargetKind extends EntityKind>(
  relationship: RelationshipResolution<TargetKind>,
  reviewId: string,
): RelationshipResolution<TargetKind> {
  return {
    status: "source-only",
    targetKind: relationship.targetKind,
    sourceLabel: requireNonblank(
      relationship.sourceLabel,
      "Relationship source label",
    ),
    reviewId: requireNonblank(reviewId, "Relationship review ID"),
  };
}
