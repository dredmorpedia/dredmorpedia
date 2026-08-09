import {
  compareCodeUnits,
  type AppliedOverride,
  type AppliedPatch,
  type DatasetArtifact,
  type Diagnostic,
  type DiagnosticSeverity,
  type EntityKind,
  type NormalizedEntity,
} from "@dredmorpedia/domain";

import { browseKindFor } from "./browse";

export interface EntitySourceDecision {
  id: string;
  kind: EntityKind;
  name: string;
  url: string;
  activeSourceId: string;
  overrides: AppliedOverride[];
  patches: AppliedPatch[];
}

export interface DiagnosticCodeGroup {
  code: string;
  severity: DiagnosticSeverity;
  diagnostics: Diagnostic[];
}

const severityOrder: Record<DiagnosticSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

export function allDatasetEntities(
  artifact: DatasetArtifact,
): NormalizedEntity[] {
  return Object.values(artifact.entities).flat();
}

export function entityDetailPath(entity: NormalizedEntity): string {
  return `/${browseKindFor(entity.kind).segment}/${entity.slug}/`;
}

export function collectEntitySourceDecisions(
  artifact: DatasetArtifact,
): EntitySourceDecision[] {
  return allDatasetEntities(artifact)
    .filter(
      (entity) =>
        entity.appliedOverrides.length > 0 || entity.appliedPatches.length > 0,
    )
    .map((entity) => ({
      id: entity.id,
      kind: entity.kind,
      name: entity.name,
      url: entityDetailPath(entity),
      activeSourceId: entity.provenance.sourceId,
      overrides: entity.appliedOverrides,
      patches: entity.appliedPatches,
    }));
}

export function groupDiagnosticsByCode(
  diagnostics: readonly Diagnostic[],
): DiagnosticCodeGroup[] {
  const groups = new Map<string, DiagnosticCodeGroup>();

  for (const diagnostic of diagnostics) {
    const key = `${diagnostic.severity}\u0000${diagnostic.code}`;
    const group = groups.get(key);
    if (group) {
      group.diagnostics.push(diagnostic);
    } else {
      groups.set(key, {
        code: diagnostic.code,
        severity: diagnostic.severity,
        diagnostics: [diagnostic],
      });
    }
  }

  return [...groups.values()].sort(
    (left, right) =>
      severityOrder[left.severity] - severityOrder[right.severity] ||
      right.diagnostics.length - left.diagnostics.length ||
      compareCodeUnits(left.code, right.code),
  );
}
