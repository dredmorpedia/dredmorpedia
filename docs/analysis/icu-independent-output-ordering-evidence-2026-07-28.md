# ICU-independent output ordering evidence

Date: 2026-07-28

## Scope

This hardening slice closes the repository review's medium finding that
generated output order depended on the ICU/CLDR version bundled with Node.
It does not change user-facing alphabetical presentation or the generated
artifact schemas.

## Contract

- `compareCodeUnits` defines one persisted-output order using ECMAScript
  UTF-16 code-unit comparison.
- All 94 former `localeCompare(value, "en")` call sites in `packages/domain`
  and `packages/data-pipeline` use that comparator.
- The two remaining `localeCompare` uses are in the web layer and intentionally
  sort English presentation choices rather than persisted output.
- Stable JSON serialization uses the same comparator for object keys.

This removes dependence on host ICU/CLDR collation data. Repeated generation
still guards against input and publication nondeterminism, but it no longer
needs to detect locale-engine differences in output ordering.

## Regression coverage

- Domain tests prove the fixed code-unit order across uppercase, lowercase,
  accented Latin, and Greek strings, plus exact equality behavior.
- Pipeline tests prove stable serialization follows that order even when
  insertion order differs.
- Existing resolution, route-allocation, relationship, normalization,
  diagnostics, search, and deterministic-generation tests exercise every
  migrated comparator family.

## Validation

- `pnpm.cmd check` passes formatting, lint, type checking, all 131 unit/artifact
  tests, byte-identical synthetic generation, and the 43-page static export.
- `pnpm.cmd generate:official:check` remains byte-identical with 763 items,
  2,767 search documents, 0 errors, 275 warnings, and 71 informational
  decisions.
- The current official artifact and search sizes remain unchanged at
  7,221,905 and 1,348,711 bytes respectively, confirming that the fixed order
  does not reorder the canonical dataset currently in use.

No official-derived artifact is committed or approved for publication by this
evidence.
