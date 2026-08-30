import { compareCodeUnits } from "./ordering";
import { entityId } from "./identity";
import type {
  AppliedOverride,
  Encrustment,
  EntityProvenance,
  NormalizedEntity,
  Recipe,
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

export interface IndependentNamedDeclaration {
  baseCanonicalKey: string;
  entityId: string;
  kind: "recipe" | "encrustment";
  name: string;
  provenance: EntityProvenance;
}

export interface NamedDeclarationSeparationResult<
  T extends Recipe | Encrustment,
> {
  candidates: EntityCandidate<T>[];
  independentDeclarations: IndependentNamedDeclaration[];
}

const metadataFields = new Set([
  "provenance",
  "variants",
  "appliedOverrides",
  "appliedPatches",
  "diagnosticIds",
]);

const declarationIdentityExcludedFields = new Set([
  ...metadataFields,
  "id",
  "canonicalKey",
  "slug",
  "slugAliases",
  "name",
]);

function comparable(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(comparable).join(",")}]`;
  }

  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => compareCodeUnits(left, right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${comparable(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function compareCandidates<T extends NormalizedEntity>(
  left: EntityCandidate<T>,
  right: EntityCandidate<T>,
): number {
  return (
    compareCodeUnits(left.entity.canonicalKey, right.entity.canonicalKey) ||
    left.precedence - right.precedence ||
    compareCodeUnits(
      left.entity.provenance.sourceId,
      right.entity.provenance.sourceId,
    ) ||
    compareCodeUnits(
      left.entity.provenance.file,
      right.entity.provenance.file,
    ) ||
    left.entity.provenance.line - right.entity.provenance.line ||
    left.entity.provenance.column - right.entity.provenance.column ||
    compareCodeUnits(comparable(left.entity), comparable(right.entity))
  );
}

function declarationSignature(entity: Recipe | Encrustment): string {
  return comparable(
    Object.fromEntries(
      Object.entries(entity).filter(
        ([key]) => !declarationIdentityExcludedFields.has(key),
      ),
    ),
  );
}

function stableDeclarationSuffix(value: string): string {
  let hash = 14_695_981_039_346_656_037n;
  const mask = (1n << 64n) - 1n;
  for (const character of value.normalize("NFC")) {
    hash ^= BigInt(character.codePointAt(0) ?? 0);
    hash = (hash * 1_099_511_628_211n) & mask;
  }
  return hash.toString(36).padStart(13, "0");
}

/**
 * Recipes and encrustments are ordered declarations, not ordinary name-keyed
 * database records. Keep the declaration selected by the former resolver on
 * the historical clean identity and give differing same-name declarations a
 * deterministic semantic identity before ordinary source precedence runs.
 */
export function separateRepeatedNamedDeclarations<
  T extends Recipe | Encrustment,
>(
  candidates: readonly EntityCandidate<T>[],
): NamedDeclarationSeparationResult<T> {
  const groups = new Map<string, EntityCandidate<T>[]>();
  for (const candidate of candidates) {
    const group = groups.get(candidate.entity.canonicalKey) ?? [];
    group.push(candidate);
    groups.set(candidate.entity.canonicalKey, group);
  }

  const separated: EntityCandidate<T>[] = [];
  const independentDeclarations: IndependentNamedDeclaration[] = [];

  for (const [baseCanonicalKey, group] of [...groups].sort(([left], [right]) =>
    compareCodeUnits(left, right),
  )) {
    const bySignature = new Map<string, EntityCandidate<T>[]>();
    for (const candidate of group) {
      const signature = declarationSignature(candidate.entity);
      const signatureGroup = bySignature.get(signature) ?? [];
      signatureGroup.push(candidate);
      bySignature.set(signature, signatureGroup);
    }

    if (bySignature.size === 1) {
      separated.push(...group);
      continue;
    }

    const preferred = [...group].sort(compareCandidates).at(-1)!;
    const preferredSignature = declarationSignature(preferred.entity);
    const occupiedKeys = new Set([baseCanonicalKey]);

    for (const [signature, signatureGroup] of [...bySignature].sort(
      ([left], [right]) => compareCodeUnits(left, right),
    )) {
      if (signature === preferredSignature) {
        separated.push(...signatureGroup);
        continue;
      }

      const baseSuffix = stableDeclarationSuffix(signature);
      let declarationKey = `${baseCanonicalKey}~${baseSuffix}`;
      let collisionIndex = 2;
      while (occupiedKeys.has(declarationKey)) {
        declarationKey = `${baseCanonicalKey}~${baseSuffix}-${collisionIndex}`;
        collisionIndex += 1;
      }
      occupiedKeys.add(declarationKey);

      const remapped = signatureGroup.map((candidate) => ({
        ...candidate,
        entity: {
          ...candidate.entity,
          id: entityId(candidate.entity.kind, declarationKey),
          canonicalKey: declarationKey,
        },
      }));
      separated.push(...remapped);

      const representative = [...remapped].sort(compareCandidates).at(-1)!;
      independentDeclarations.push({
        baseCanonicalKey,
        entityId: representative.entity.id,
        kind: representative.entity.kind,
        name: representative.entity.name,
        provenance: representative.entity.provenance,
      });
    }
  }

  return {
    candidates: separated.sort(compareCandidates),
    independentDeclarations: independentDeclarations.sort(
      (left, right) =>
        compareCodeUnits(left.kind, right.kind) ||
        compareCodeUnits(left.name, right.name) ||
        compareCodeUnits(left.entityId, right.entityId),
    ),
  };
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
    .sort((left, right) => compareCodeUnits(left, right));
}

export function resolveEntityCandidates<T extends NormalizedEntity>(
  candidates: readonly EntityCandidate<T>[],
): ResolutionResult<T> {
  const sorted = [...candidates].sort(compareCandidates);
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
      compareCodeUnits(left.canonicalKey, right.canonicalKey),
    ),
    collisions,
  };
}
