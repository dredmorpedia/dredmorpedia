# Spell requirement-level evidence

Date: 2026-08-06

Canonical measurement baseline: Dungeons of Dredmor `1.1.5 public_beta`,
Steam build `22934623`, base game plus all three official expansions

## Scope

This slice preserves the optional `level` attribute on mana-bearing spell
requirements as loss-aware source metadata. It does not interpret the value as
an actor level, unlock, eligibility, progression, availability, or any other
engine rule.

## Preserved application and schema evidence

The installed `validation/spells.xsd` schema declares optional `level` with
type `xs:byte` on `<requirements>`. The preserved application selects every
`<requirements>` element as a mana-cost effect but reads only `mp`,
`savvyBonus`, and `mincost`; it neither reads nor presents `level`. The schema
therefore establishes a signed-byte source shape, but the available reference
code does not establish its runtime meaning.

The two canonical declarations sit on the mana requirements for Oil Slick and
Oil Slick2. Both supply `mp="5"` and `level="1"`. No other active official
spell requirement supplies `level`.

## Normalized contract

Every normalized `SpellManaCost` has a required nullable `sourceLevel` field.
An absent attribute becomes `null`. A valid source integer from -128 through
127 is preserved exactly. A malformed or out-of-range supplied value becomes
`null` with an `invalid_number` diagnostic. Only mana-bearing requirements
enter `manaCosts`; the 13 non-mana requirement declarations remain explicit
`unsupported_spell_requirement` diagnostics for separate evidence-first work.

The strict web artifact guard requires `sourceLevel` and enforces the same
signed-byte range. The spell page labels it as a requirement-level source
value and states the interpretation boundary.

## Read-only canonical measurement

Both active declarations normalize with `sourceLevel: 1`. Supporting the field
removes the final two measured compatibility diagnostics. Deterministic
official generation reports 0 errors, 36 warnings, and 71 informational
duplicate decisions. The remaining warnings are exactly 13 unsupported
non-mana spell requirements and 23 dangling references.

These are aggregate read-only measurements. Official inputs and generated
official artifacts remain ignored and are not approved for publication.

## Verification

- Importer coverage checks valid values, both signed-byte boundaries, and an
  out-of-range value with its source-located diagnostic.
- The independently authored synthetic artifact carries `level="1"` on the
  Clockwork Spark mana requirement.
- The strict checksummed-artifact regression rejects a source level outside
  the signed-byte range.
- The spell page exposes the source value and the non-interpretation boundary.
- Deterministic official generation is byte-identical, and both Oil Slick
  declarations retain `sourceLevel: 1`.
- `pnpm check`, the complete local official export, and desktop/mobile
  Playwright and axe coverage provide the final repeatable verification.
