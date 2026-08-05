# Spell buff wall-sensing evidence

Date: 2026-08-05

Canonical measurement baseline: Dungeons of Dredmor `1.1.5 public_beta`,
Steam build `22934623`, base game plus all three official expansions

## Scope

This slice preserves direct buff-local `<senseWallsFlag>` declarations as an
ordered, loss-aware source marker. It does not calculate a wall-detection range
or infer revealed terrain, actor scope, interaction with sight modifiers,
stacking, duration, or runtime success.

## Preserved legacy and schema evidence

The preserved encyclopedia does not parse or render this element. The installed
validation schema defines `senseWallsFlag` as a buff child with one required
`amount` attribute of the game's boolean type. That establishes the strict
source shape, but not broader engine behavior.

## Normalized contract

Every spell buff now has an ordered `senseWallsDeclarations` array. Each entry
contains a nullable `enabled` value:

- `1` or `true` becomes `true`;
- `0` or `false` becomes `false`;
- a missing required flag or malformed token becomes `null` with a
  source-located diagnostic; and
- unknown attributes, text, and nested content remain diagnostics.

The web artifact guard requires this exact shape. The spell page exposes the
yes/no/unavailable source value and an explicit interpretation boundary.

## Read-only canonical measurement

The active official dataset contains one declaration. It is enabled, belongs
to one active buff, and has no malformed or unavailable value. Supporting it
removes the sole former `senseWallsFlag` diagnostic.

Deterministic official generation now reports 0 errors, 42 warnings, and 71
informational duplicate decisions. Six compatibility constructs remain: three
unknown attributes (`level` twice and `buffTag` once) and three unknown elements
(`dodgebuff`, `payback`, and `zorkmidAbsorption` once each). The 13 spell
requirement diagnostics and 23 dangling references remain separately tracked.

These are aggregate read-only measurements. Official inputs and generated
official artifacts remain ignored and are not approved for publication.

## Verification

- Focused importer coverage checks ordered true/false declarations, missing and
  malformed flags, unknown attributes, text, and nested content.
- The independently authored synthetic artifact carries one enabled marker.
- The strict checksummed-artifact regression rejects a non-boolean normalized
  value.
- `pnpm check` passes formatting, lint, type checking, all 195 unit/artifact
  tests, byte-identical synthetic generation, and the 43-page static export.
- Desktop/mobile Playwright and axe coverage exercises the visible marker and
  interpretation boundary.
- Deterministic zero-error official generation and the complete local static
  export succeed without publishing generated official content.
