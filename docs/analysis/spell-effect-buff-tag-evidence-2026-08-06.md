# Spell effect buff-tag evidence

Date: 2026-08-06

Canonical measurement baseline: Dungeons of Dredmor `1.1.5 public_beta`,
Steam build `22934623`, base game plus all three official expansions

## Scope

This slice preserves the optional `buffTag` attribute on direct and buff-local
spell effects as exact, loss-aware source metadata. It does not resolve the
token or infer tag matching, buff or curse selection, removal behavior, target
scope, evaluation order, timing, or runtime success.

## Preserved application and schema evidence

The installed validation schema declares optional `buffTag` with type
`xs:string` on the general `<effect>` shape. The preserved application has no
`buffTag` or `moverandomcurse` selector or dedicated parser and does not expose
the token. This establishes the source shape but not engine behavior.

The canonical occurrence belongs to a `moverandomcurse` effect in Dump Toxic
Assets. The effect type and attribute name suggest a relationship to tagged
buffs or curses, but neither the schema nor the preserved application defines
matching, candidate selection, removal, target scope, evaluation order, or
runtime outcome. The modern contract therefore stops at the exact token.

## Normalized contract

Every `SpellEffect` now carries a required nullable `buffTag` field. An absent
attribute becomes `null`. A supplied non-blank token is retained exactly, while
a supplied blank token becomes `null` and emits
`missing_spell_effect_buff_tag` at the declaring effect. The parser accepts the
attribute on the shared direct and buff-local effect shape, matching the
installed schema, and continues to diagnose unrelated attributes, children,
and text.

The strict web artifact guard requires the field and accepts only a non-blank
string or `null`. The spell page reports the number of tagged effects and shows
the direct source token inside the matching effect. It creates no entity link
or inferred relationship.

## Read-only canonical measurement

The active official dataset contains exactly one declaration in the third
official expansion:

- spell: Dump Toxic Assets;
- effect type: `moverandomcurse`; and
- source token: `bankster`.

The value normalizes exactly and produces no relationship or dangling
reference. Supporting it removes its sole former compatibility diagnostic.
Deterministic official generation reports 0 errors, 38 warnings, and 71
informational duplicate decisions. Two compatibility constructs remain, both
`level` attributes on spell requirements. The 13 spell requirement diagnostics
and 23 dangling references remain separately tracked.

These are aggregate read-only measurements. Official inputs and generated
official artifacts remain ignored and are not approved for publication.

## Verification

- Importer coverage checks a valid exact token, a blank supplied token, its
  source-located diagnostic, and an unrelated future attribute.
- The independently authored synthetic artifact contains
  `buffTag="synthetic-bankster"` on one effect.
- The strict checksummed-artifact regression rejects a non-string normalized
  value.
- The spell page exposes the token and interpretation boundary without a link;
  an untagged spell remains at a zero summary count with no tagged effect row.
- Deterministic official generation is byte-identical and the normalized Dump
  Toxic Assets effect retains `buffTag="bankster"`.
- `pnpm check`, the complete local official export, and desktop/mobile
  Playwright and axe coverage provide the final repeatable verification.
