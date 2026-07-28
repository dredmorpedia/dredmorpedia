# Item macguffin declaration evidence

Date: 2026-07-28

Canonical source: Dungeons of Dredmor `1.1.5 public_beta`, Steam build
`22934623`, base game plus all three official expansions

## Scope and legacy behavior

The preserved item parser has no macguffin-specific type or behavior. Both
canonical records therefore fall through to its generic item representation,
which does not retain the nested spell, class-name, or consumable source
values.

The rebuild now preserves those direct values without turning a macguffin into
an ordinary activated item trigger. The source does not establish activation
timing, targeting, or whether a false `consumable` flag is a complete runtime
consumption rule.

## Canonical measurement

Read-only inspection found exactly two active `<macguffin>` declarations, both
in the base game:

- one declaration per item, with no nested elements or text;
- both declarations supply a `spell` reference;
- one supplies `item_class_name="Abomination"`;
- one supplies `consumable="0"`; and
- no other attributes occur.

One spell reference resolves. The other is the source value
`non-existant-spell`, which has no active spell target and is retained as a
dangling relationship rather than discarded or fabricated.

The ordered `macguffinDeclarations` array preserves:

- nullable canonical and source spell names plus an optional resolved
  `spellId`;
- nullable `itemClassName`; and
- loss-aware nullable `consumable`, where explicit false remains distinct from
  an absent or invalid token.

Repeated declarations remain repeated. A missing spell, invalid boolean, empty
class name, unknown attribute, nested content, or text remains diagnosed.

## Consumer boundary

The strict web artifact schema requires every declaration field, enforces the
paired nullable spell key/name shape, and rejects malformed flags and empty
resolved IDs. Item pages show the source class name, spell resolution state,
and consumable flag. Resolved spells link to their detail page, and spell pages
link back to declaring items.

Search text includes the direct spell and class names. The item page explicitly
withholds activation, targeting, and actual-consumption claims.

## Diagnostic and artifact result

Deterministic canonical generation reports:

- 0 errors, 2,376 warnings, and 71 informational decisions;
- 2 normalized declarations, with 1 resolved and 1 dangling spell reference;
- no remaining macguffin compatibility diagnostic;
- 8 remaining item compatibility diagnostics, all `toolkit`;
- 2,335 spell compatibility diagnostics and 13 separately tracked spell
  requirement diagnostics;
- 20 dangling references, including the newly visible canonical macguffin
  reference;
- a 5,568,864-byte normalized artifact;
- a 1,344,831-byte search artifact; and
- a 1,335,280-byte diagnostics artifact.

This removes both former `<macguffin>` compatibility warnings while adding the
previously hidden dangling relationship. Total warnings therefore fall by one.

## Verification

- Focused pipeline coverage passes 37 tests, including class-only,
  explicit-true/false, missing, unresolved, invalid, repeated, extended,
  nested, and text shapes.
- Focused domain and web typechecks pass.
- The strict web artifact suite passes 18 tests, including malformed
  macguffin metadata rejection.
- `pnpm.cmd generate:official:check` produces byte-identical canonical outputs
  and the zero-error publication gate passes.
- `pnpm.cmd check` passes formatting, lint, type checking, all 105
  unit/artifact tests, deterministic generation, and the 42-page synthetic
  static export.
- `pnpm.cmd test:e2e` passes all 32 desktop/mobile browser tests, including
  macguffin disclosure/backlink navigation, responsive overflow, keyboard
  flows, and representative axe scans.
- `pnpm.cmd build:official` repeats the deterministic zero-error canonical
  import and exports all 2,857 local static pages.
