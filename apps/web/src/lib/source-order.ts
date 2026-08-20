import {
  compareCodeUnits,
  type NormalizedEntityBase,
  type SourceSummary,
} from "@dredmorpedia/domain";

export function createSourceOrderComparator<T extends NormalizedEntityBase>(
  sources: readonly Pick<SourceSummary, "id" | "precedence">[],
): (left: T, right: T) => number {
  const precedenceBySource = new Map(
    sources.map((source) => [source.id, source.precedence]),
  );

  return (left, right) =>
    (precedenceBySource.get(left.provenance.sourceId) ??
      Number.MAX_SAFE_INTEGER) -
      (precedenceBySource.get(right.provenance.sourceId) ??
        Number.MAX_SAFE_INTEGER) ||
    compareCodeUnits(left.provenance.sourceId, right.provenance.sourceId) ||
    compareCodeUnits(left.provenance.file, right.provenance.file) ||
    left.provenance.line - right.provenance.line ||
    left.provenance.column - right.provenance.column ||
    compareCodeUnits(left.id, right.id);
}
