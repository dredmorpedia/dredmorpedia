# Persisted comparator totality evidence

Date: 2026-07-29
Status: implemented and verified

## Scope

The repository-wide review found three low-severity persisted-output comparators that could return equality for different records and therefore inherit their final order from traversal or push order:

- finalized diagnostics omitted severity and structured details;
- equal-precedence entity resolution omitted source column; and
- encrustment instability effects omitted source column.

The existing traversal paths were deterministic, so this was hardening rather than a correction to known generated output.

## Implementation

`packages/data-pipeline/src/output-ordering.ts` now owns directly testable comparators for diagnostics and instability effects. Diagnostic ordering retains its existing file/location/code/entity/message keys, then compares severity, source ID, and a stable serialization of structured details. Instability effects retain their existing semantic and provenance keys, then compare column and the remaining serialized fields.

`resolveEntityCandidates` now compares source column after line and uses the existing stable entity representation as a final fallback. Distinct candidates no longer depend on caller order even if their complete source coordinates are equal.

## Regression coverage

- Domain coverage reverses two equal-precedence candidates that differ only by source column and proves identical resolution, variant order, and winner.
- Pipeline coverage reverses otherwise-equal diagnostics and proves severity/details ordering.
- Pipeline coverage reverses otherwise-equal instability effects and proves source-column ordering.

## Validation

- `pnpm.cmd --filter @dredmorpedia/domain test` — 62 tests passed.
- `pnpm.cmd --filter @dredmorpedia/data-pipeline test` — 46 tests passed.
- Both changed packages pass type checking; the pipeline package passes lint.
- `pnpm.cmd check` — formatting, lint, type checking, all 134 unit/artifact tests, byte-identical synthetic generation, and the 43-page synthetic static export passed.
- `pnpm.cmd generate:official:check` — byte-identical official generation passed with 763 items, 2,767 search documents, 0 errors, 275 warnings, and 71 informational decisions.

No browser suite was rerun because this changes generated ordering only and does not alter routes, rendered content, or interaction behavior.
