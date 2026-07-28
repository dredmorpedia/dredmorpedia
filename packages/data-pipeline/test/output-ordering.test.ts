import { describe, expect, it } from "vitest";

import type {
  Diagnostic,
  EncrustmentInstabilityEffect,
} from "@dredmorpedia/domain";

import {
  compareDiagnosticDrafts,
  compareEncrustmentInstabilityEffects,
} from "../src/output-ordering";

type DiagnosticDraft = Omit<Diagnostic, "id">;

function diagnostic(
  severity: DiagnosticDraft["severity"],
  reference: string,
): DiagnosticDraft {
  return {
    severity,
    code: "same_code",
    message: "Same diagnostic message.",
    source: {
      sourceId: "synthetic-base",
      file: "fixtures/synthetic/base/itemDB.xml",
      line: 2,
      column: 3,
    },
    entityId: "item:test item",
    details: { reference },
  };
}

function instabilityEffect(column: number): EncrustmentInstabilityEffect {
  return {
    name: "Same Mishap",
    spellKey: "same spell",
    spellName: "Same Spell",
    provenance: {
      sourceId: "synthetic-base",
      file: "fixtures/synthetic/base/encrustDB.xml",
      line: 2,
      column,
      originalName: "Same Mishap",
    },
  };
}

describe("persisted output ordering", () => {
  it("orders otherwise-equal diagnostics by severity and stable details", () => {
    const error = diagnostic("error", "Beta");
    const warningBeta = diagnostic("warning", "Beta");
    const warningAlpha = diagnostic("warning", "Alpha");

    expect(
      [warningBeta, error, warningAlpha].sort(compareDiagnosticDrafts),
    ).toEqual([error, warningAlpha, warningBeta]);
  });

  it("orders otherwise-equal instability effects by source column", () => {
    const earlier = instabilityEffect(3);
    const later = instabilityEffect(18);

    expect([later, earlier].sort(compareEncrustmentInstabilityEffects)).toEqual(
      [earlier, later],
    );
  });
});
