import type {
  AppliedOverride,
  EntityProvenance,
  NormalizedEntity,
} from "./types";

export interface EntityCandidate<T extends NormalizedEntity> {
  entity: T;
  precedence: number;
}

export interface Collision {
  kind: NormalizedEntity["kind"];
  canonicalKey: string;
  previous: EntityProvenance;
  replacement: EntityProvenance;
  changedFields: string[];
}

export interface ResolutionResult<T extends NormalizedEntity> {
  active: T[];
  collisions: Collision[];
}

const metadataFields = new Set([
  "provenance",
  "variants",
  "appliedOverrides",
  "appliedPatches",
  "diagnosticIds",
]);

function comparable(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(comparable).join(",")}]`;
  }

  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right, "en"))
      .map(([key, entry]) => `${JSON.stringify(key)}:${comparable(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function changedFields(
  previous: NormalizedEntity,
  replacement: NormalizedEntity,
): string[] {
  const keys = new Set([...Object.keys(previous), ...Object.keys(replacement)]);

  return [...keys]
    .filter((key) => !metadataFields.has(key))
    .filter(
      (key) =>
        comparable(previous[key as keyof NormalizedEntity]) !==
        comparable(replacement[key as keyof NormalizedEntity]),
    )
    .sort((left, right) => left.localeCompare(right, "en"));
}

export function resolveEntityCandidates<T extends NormalizedEntity>(
  candidates: readonly EntityCandidate<T>[],
): ResolutionResult<T> {
  const sorted = [...candidates].sort((left, right) => {
    return (
      left.entity.canonicalKey.localeCompare(right.entity.canonicalKey, "en") ||
      left.precedence - right.precedence ||
      left.entity.provenance.sourceId.localeCompare(
        right.entity.provenance.sourceId,
        "en",
      ) ||
      left.entity.provenance.file.localeCompare(
        right.entity.provenance.file,
        "en",
      ) ||
      left.entity.provenance.line - right.entity.provenance.line
    );
  });
  const active = new Map<string, T>();
  const collisions: Collision[] = [];

  for (const candidate of sorted) {
    const previous = active.get(candidate.entity.canonicalKey);

    if (!previous) {
      active.set(candidate.entity.canonicalKey, candidate.entity);
      continue;
    }

    const fields = changedFields(previous, candidate.entity);
    const appliedOverride: AppliedOverride = {
      previous: previous.provenance,
      replacement: candidate.entity.provenance,
      changedFields: fields,
    };

    collisions.push({
      kind: candidate.entity.kind,
      canonicalKey: candidate.entity.canonicalKey,
      previous: previous.provenance,
      replacement: candidate.entity.provenance,
      changedFields: fields,
    });

    active.set(candidate.entity.canonicalKey, {
      ...candidate.entity,
      variants: [...previous.variants, candidate.entity.provenance],
      appliedOverrides: [...previous.appliedOverrides, appliedOverride],
      diagnosticIds: [
        ...new Set([
          ...previous.diagnosticIds,
          ...candidate.entity.diagnosticIds,
        ]),
      ],
    });
  }

  return {
    active: [...active.values()].sort((left, right) =>
      left.canonicalKey.localeCompare(right.canonicalKey, "en"),
    ),
    collisions,
  };
}
