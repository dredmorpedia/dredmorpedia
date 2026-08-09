# Spell zorkmid-requirement evidence

Date: 2026-08-09

## Scope

This slice preserves the source parameters on zorkmid-family
`<requirements>` declarations. It does not combine those fields into a cost or
Savvy formula or infer an actor, available currency, payment, eligibility,
timing, or runtime success.

## Preserved application and schema evidence

The installed `validation/spells.xsd` schema declares optional `zorkmids`,
`zorkmidScaleF`, and `savvyBonus` attributes on `<requirements>`.
`zorkmids` has type `xs:positiveInteger`; the two factor fields have type
`xs:decimal`.

The preserved application's `ManaCost` selector visits every
`<requirements>` declaration but reads only `mp`, `savvyBonus`, and
`mincost`. It does not read `zorkmids` or `zorkmidScaleF`. Because the measured
zorkmid declarations do not supply `mp`, that parser does not establish a
usable currency-cost formula or the role of any of the three source fields.

The canonical dataset has three active declarations, all in the same official
expansion and all with no nested content:

- Insurance Fraud: `zorkmids="25"`, `zorkmidScaleF="2.5"`, and
  `savvyBonus="0.25"`;
- Hire Contractor: `zorkmids="100"`, `zorkmidScaleF="2.0"`, and
  `savvyBonus="0.25"`; and
- Fiscal Hedge: `zorkmids="50"`, `zorkmidScaleF="1.75"`, and
  `savvyBonus="0.25"`.

No active declaration combines shield, weapon, booze, mana, level, or other
requirement-family fields.

## Normalized contract

Every normalized spell has an ordered `zorkmidRequirements` array. Each record
preserves three required nullable artifact fields:

- `sourceZorkmids`, a positive source integer when supplied;
- `sourceZorkmidScaleFactor`, a finite source decimal when supplied; and
- `sourceSavvyBonus`, a finite source decimal when supplied.

An absent optional source attribute becomes `null`. An empty, malformed, or
non-positive supplied `zorkmids` value becomes `null` with an `invalid_number`
diagnostic; invalid supplied decimal fields follow the same loss-aware rule.
A declaration enters this family when it supplies `zorkmids` or
`zorkmidScaleF` without another known non-mana requirement family. Unknown
extensions remain diagnostics, and a mixed known-family declaration remains
unsupported rather than being partially reinterpreted.

The strict web artifact schema requires the complete record and enforces the
positive-integer and finite-number shapes. The spell page exposes all three
source values, an explicit empty state, and the interpretation boundary.

## Read-only canonical measurement

All three active declarations normalize as one record on their declaring
spell with no attached diagnostic. Deterministic official generation is
byte-identical and reports 763 items, 2,767 search documents, 0 errors, 23
warnings, and 71 informational duplicate decisions. The warnings are now
exactly the 23 previously tracked dangling references; no unsupported spell
requirement remains.

These are aggregate read-only measurements. Official inputs and generated
official artifacts remain ignored and are not approved for publication.

## Regression coverage

- Importer coverage checks the complete measured shape, optional fields,
  signed decimal values, non-positive/empty/malformed values, unknown
  extensions, and a mixed zorkmid/weapon shape.
- The independently authored Clockwork Echo fixture carries a separate
  zorkmid declaration with source values `25`, `2.5`, and `0.25`.
- The strict checksummed-artifact regression rejects a non-positive normalized
  `sourceZorkmids` value.
- The existing spell browser flow covers the empty state on Clockwork Spark
  and all three values plus the interpretation boundary on Clockwork Echo.

## Verification

- `pnpm.cmd check` passes formatting, lint, type checking, 204 unit/artifact
  tests, byte-identical synthetic generation, and the 43-page static export.
- `pnpm.cmd build:official` repeats byte-identical zero-error official
  generation and exports all 2,857 local pages.
- `pnpm.cmd test:e2e` passes all 36 desktop/mobile, keyboard, responsive, and
  representative axe cases.
- Manual official checks confirm the three source records and the empty state,
  with no horizontal overflow at a 375-pixel viewport.
