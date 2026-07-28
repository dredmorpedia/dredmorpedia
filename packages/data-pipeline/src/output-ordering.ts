import {
  canonicalKey,
  compareCodeUnits,
  type EncrustmentInstabilityEffect,
} from "@dredmorpedia/domain";

import { stableSerialize } from "./serialization";
import type { DiagnosticDraft } from "./xml-adapter";

export function compareDiagnosticDrafts(
  left: DiagnosticDraft,
  right: DiagnosticDraft,
): number {
  return (
    compareCodeUnits(left.source?.file ?? "", right.source?.file ?? "") ||
    (left.source?.line ?? 0) - (right.source?.line ?? 0) ||
    (left.source?.column ?? 0) - (right.source?.column ?? 0) ||
    compareCodeUnits(left.code, right.code) ||
    compareCodeUnits(left.entityId ?? "", right.entityId ?? "") ||
    compareCodeUnits(left.message, right.message) ||
    compareCodeUnits(left.severity, right.severity) ||
    compareCodeUnits(
      left.source?.sourceId ?? "",
      right.source?.sourceId ?? "",
    ) ||
    compareCodeUnits(
      stableSerialize(left.details ?? null),
      stableSerialize(right.details ?? null),
    )
  );
}

export function compareEncrustmentInstabilityEffects(
  left: EncrustmentInstabilityEffect,
  right: EncrustmentInstabilityEffect,
): number {
  return (
    compareCodeUnits(canonicalKey(left.name), canonicalKey(right.name)) ||
    compareCodeUnits(left.spellKey, right.spellKey) ||
    compareCodeUnits(left.provenance.sourceId, right.provenance.sourceId) ||
    compareCodeUnits(left.provenance.file, right.provenance.file) ||
    left.provenance.line - right.provenance.line ||
    left.provenance.column - right.provenance.column ||
    compareCodeUnits(left.name, right.name) ||
    compareCodeUnits(left.spellName, right.spellName) ||
    compareCodeUnits(
      left.provenance.originalName,
      right.provenance.originalName,
    ) ||
    compareCodeUnits(
      left.provenance.originalId ?? "",
      right.provenance.originalId ?? "",
    ) ||
    compareCodeUnits(left.spellId ?? "", right.spellId ?? "")
  );
}
