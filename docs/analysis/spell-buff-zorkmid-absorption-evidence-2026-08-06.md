# Spell buff zorkmid-absorption evidence

Date: 2026-08-06

Canonical measurement baseline: Dungeons of Dredmor `1.1.5 public_beta`,
Steam build `22934623`, base game plus all three official expansions

## Scope

This slice preserves direct buff-local `<zorkmidAbsorption>` declarations as
ordered, loss-aware source parameters. It does not calculate a currency cost
or damage-mitigation value or infer cap application, target, timing,
eligibility, stacking, duration, or runtime success.

## Preserved application and schema evidence

The installed validation schema defines `<zorkmidAbsorption>` with three
required attributes: signed-byte `zorkmidsPerDamage`, signed-byte `damageCap`,
and decimal `maxRatio`. The preserved application parses the containing buff's
ordinary fields and modifiers but has no `zorkmidAbsorption` selector or parser
and does not present these three attributes. This establishes the strict source
shape, not engine semantics.

Fiscal Hedge's canonical description discusses trading zorkmids for damage
mitigation, but prose plus the three source values does not establish the
complete engine calculation. The modern artifact therefore preserves the
parameters without deriving how currency, damage, or the cap interact.

## Normalized contract

Every spell buff now has an ordered `zorkmidAbsorptionDeclarations` array. Each
entry retains:

- nullable signed-byte `zorkmidsPerDamage` source metadata;
- nullable signed-byte `damageCap` source metadata; and
- a nullable finite decimal `maxRatio` source value.

Missing required fields, malformed or out-of-range numbers, unknown
attributes, text, and nested content remain source-located diagnostics. Missing
or invalid fields become `null`; declarations are not discarded. The strict
web artifact guard requires the complete shape and byte bounds. The spell page
shows the three direct values and an explicit interpretation boundary.

## Read-only canonical measurement

The active official dataset contains exactly one declaration on Fiscal Hedge
from the third official expansion. It supplies `zorkmidsPerDamage="30"`,
`damageCap="20"`, and `maxRatio="0.5"`; all three values normalize
successfully. Supporting the declaration removes its sole former compatibility
diagnostic without adding a relationship or dangling reference.

Deterministic official generation reports 0 errors, 39 warnings, and 71
informational duplicate decisions. Three compatibility constructs remain, all
unknown attributes: `level` twice on requirements and `buffTag` once on an
effect. The 13 spell requirement diagnostics and 23 dangling references remain
separately tracked.

These are aggregate read-only measurements. Official inputs and generated
official artifacts remain ignored and are not approved for publication.

## Verification

- Importer coverage checks ordered valid declarations, signed-byte boundaries,
  required-field loss, malformed and out-of-range values, unknown attributes,
  and nested content.
- The independently authored synthetic artifact carries one declaration with
  values `30`, `20`, and `0.5`.
- The strict checksummed-artifact regression rejects an out-of-range signed-byte
  value.
- `pnpm check` passes formatting, lint, type checking, all 198 unit/artifact
  tests, byte-identical synthetic generation, and the 43-page static export.
- Desktop/mobile Playwright and axe coverage exercises the visible parameters,
  no-link boundary, and responsive presentation; a spell without the
  declaration has no empty section.
- Deterministic zero-error official generation is byte-identical and the
  normalized Fiscal Hedge declaration retains all three measured values; the
  complete 2,857-page local official export succeeds.
