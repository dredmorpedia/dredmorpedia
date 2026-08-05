# Spell buff payback evidence

Date: 2026-08-05

Canonical measurement baseline: Dungeons of Dredmor `1.1.5 public_beta`,
Steam build `22934623`, base game plus all three official expansions

## Scope

This slice preserves direct buff-local `<payback>` declarations as ordered,
loss-aware source parameters. It does not calculate a returned-damage value or
infer a base amount or source stat, health relationship, trigger or event
timing, caps, stacking, eligibility, or final formula.

## Preserved application and schema evidence

The installed validation schema defines `<payback>` with two required
attributes: game-boolean `secondaryScale` and decimal `paybackF`. The preserved
application parses the containing buff and its ordinary modifiers and event
hooks, but has no `payback` selector or parser and does not present these two
attributes. This establishes the strict source shape, not engine semantics.

The canonical spell description says that Insurance Fraud scales payback based
on hitpoints, but neither that prose nor the two source attributes establishes
a complete calculation. The modern artifact therefore does not link the
declaration to the separate spell named `Payback` and does not manufacture a
damage-return relationship.

## Normalized contract

Every spell buff now has an ordered `paybackDeclarations` array. Each entry
retains:

- nullable game-boolean `secondaryScale` source metadata; and
- a nullable finite decimal `factor` read from `paybackF`.

Missing required fields, malformed boolean or decimal tokens, unknown
attributes, text, and nested content remain source-located diagnostics.
Missing or malformed fields become `null`; declarations are not discarded.
The strict web artifact guard requires the complete shape. The spell page
shows the two direct values and an explicit interpretation boundary.

## Read-only canonical measurement

The active official dataset contains exactly one declaration on Insurance
Fraud. It supplies `secondaryScale="0"` and `paybackF="0.1"`; both values
normalize successfully. Supporting the declaration removes its sole former
compatibility diagnostic without adding a relationship or dangling reference.

Deterministic official generation reports 0 errors, 40 warnings, and 71
informational duplicate decisions. Four compatibility constructs remain:
three unknown attributes (`level` twice and `buffTag` once) and one unknown
element (`zorkmidAbsorption` once). The 13 spell requirement diagnostics and
23 dangling references remain separately tracked.

These are aggregate read-only measurements. Official inputs and generated
official artifacts remain ignored and are not approved for publication.

## Verification

- Importer coverage checks ordered valid declarations, required-field loss,
  malformed boolean/decimal values, unknown attributes, and nested content.
- The independently authored synthetic artifact carries one declaration with
  a false `secondaryScale` flag and `0.1` factor.
- The strict checksummed-artifact regression rejects a non-numeric factor.
- `pnpm check` passes formatting, lint, type checking, all 197 unit/artifact
  tests, byte-identical synthetic generation, and the 43-page static export.
- Desktop/mobile Playwright and axe coverage exercises the visible parameters,
  no-link boundary, and responsive presentation.
- Deterministic zero-error official generation and the complete local static
  export succeed without publishing generated official content.
