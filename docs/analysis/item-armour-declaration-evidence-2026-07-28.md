# Item armour declaration evidence

Date: 2026-07-28
Scope: legacy behavior, synthetic validation, and read-only aggregate
measurement of the canonical official dataset

## Source and legacy behavior

The preserved item parser uses `<armour type>` to classify equipment and
`<armour level>` as item quality. For rings and amulets it also turns a
non-zero `randoms` attribute into a generic "Random Stats" description. It
does not expose a selection pool, roll procedure, or equipment formula.

Read-only inspection found 268 active `<armour>` declarations in the canonical
base game plus three expansions. Every declaration:

- has one of the ten already-supported equipment slot values;
- has a non-negative integer `level`;
- contains no text or nested elements; and
- uses no attributes other than `type`, `level`, and an optional `randoms`.

Thirty-three declarations supply `randoms`: 30 use `0` and 3 use `1`. The
other 235 omit it. No official names, XML, assets, or source paths are recorded
here.

## Implemented contract

Each item now preserves ordered, loss-aware armour declarations with:

- a normalized nullable slot string;
- a nullable non-negative source level; and
- a nullable non-negative `randoms` source value.

`null` distinguishes an absent or invalid supplied value from zero. The
existing semantic category and item quality remain the convenient derived
fields; the declaration array preserves the direct source shape and repeated
records. Missing required slot/level values, invalid numbers, unknown
attributes, text, and nested elements remain source-located diagnostics.

The item page exposes these direct values under "Armour declarations" and
states that random-stat selection and equipment formulas are not inferred.
The strict web artifact boundary rejects absent, negative, or malformed
declaration fields.

## Canonical result

All 268 active declarations satisfy the contract. Supporting the complete
measured family removes exactly 268 former `partially_supported_element`
diagnostics:

- canonical import: 0 errors, 2,634 warnings, and 71 informational duplicate
  decisions;
- item compatibility backlog: 267 diagnostics, down from 535;
- combined item/spell compatibility backlog: 2,602 diagnostics, down from
  2,870;
- spell compatibility diagnostics: unchanged at 2,335;
- dangling references: unchanged at 19; and
- separately tracked spell-requirement diagnostics: unchanged at 13.

The remaining item families are 257 `weapon`, 8 `toolkit`, and 2 `macguffin`
diagnostics. Weapon damage, categories, quality, and hit spells are already
partially normalized, but its scaling and other source fields still require a
separate complete contract. Toolkit and macguffin declarations also remain
explicit pending their own evidence-backed semantics.

## Verification

- Focused importer tests cover complete, missing, invalid, repeated, and
  extended declarations; strict web tests reject malformed generated metadata.
- `pnpm.cmd check` passes formatting, lint, type checking, all 101
  unit/artifact tests, byte-identical synthetic generation, and the 41-page
  static export.
- `pnpm.cmd test:e2e` passes all 30 desktop/mobile Playwright tests, including
  armour disclosure, the related empty state, responsive layouts, and the
  representative axe sweep.
- `pnpm.cmd build:official` produces byte-identical ignored outputs with the
  canonical counts above and exports all 2,857 local static pages.

Generated official artifacts remain ignored and are not approved for
publication.
