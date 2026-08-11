# Spell item-consumption evidence

Date: 2026-08-11
Canonical source: Dungeons of Dredmor `1.1.5 public_beta`, Steam build
`22934623`, base game plus all three official expansions
Status: implemented and verified locally; generated official content remains
ignored and non-public

## Purpose

Close the paired root-spell `consumeItem`/`consumeItemType` compatibility
family without inventing inventory or transformation behavior. The preserved
application recognizes the broad `type="item"` spell category but does not
parse either attribute, so the modern contract is based on the exact canonical
source declarations and keeps their engine meaning explicitly bounded.

## Read-only measurement

The source-candidate measurement inspected 958 uncommented root `<spell>`
declarations from the ordered canonical sources. It did not record installation
paths or copy source XML.

- `consumeItem` occurs on 11 source candidates and 11 effective spells. Its
  values are `1` on three declarations and `0` on eight.
- `consumeItemType` occurs on seven of those declarations. The five measured
  nonblank tokens are `artifact`, `gem`, `mushroom`, `potion`, and `wand`.
- Ordered source precedence does not remove or replace any declaration in this
  family. Seven declarations have root spell type `item`; the remaining four
  are two `self` and two `target` spells, so normalization does not condition
  the fields on spell type.

## Implemented contract

- Every spell has a required nullable `itemConsumption` record. It is `null`
  only when neither supported root attribute is supplied.
- `sourceConsumesItem` accepts the strict measured `0`/`1` source grammar.
  Absence is `null`; another supplied token becomes `null` with a
  source-located diagnostic.
- `sourceItemType` preserves the exact nonblank token after the XML adapter's
  established whitespace normalization. Absence is `null`; an empty supplied
  token becomes `null` with a source-located diagnostic.
- The web validates the complete nested artifact shape and exposes the flag and
  token in an accessible spell-page card.
- Consumers must not infer an actor, item selection or matching rule, inventory
  state, transformation behavior, timing, eligibility, actual consumption, or
  runtime success.

## Validation

- Focused pipeline coverage exercises complete, flag-only, malformed-flag, and
  empty-token declarations.
- Web artifact coverage accepts the synthetic declaration and rejects a
  non-boolean flag or blank type token.
- Desktop/mobile browser coverage verifies the accessible Item consumption
  region on Clockwork Spark and its absence on Clockwork Echo.
- Deterministic official generation is byte-identical with 763 items and 2,829
  search documents. It reports 0 errors, 204 warnings, and 90 informational
  records. The normalized artifact is 9,189,220 bytes; compact `search.json`
  remains 1,180,204 bytes.
- The slice removes all 18 exact item-consumption-family compatibility
  warnings. The remaining root spell audit contains 200 warnings across four
  case-insensitive families: `noanimation`, `radius`, `self`, and `wand`.

No official XML, generated artifact, local path, or other proprietary content
is added to Git by this evidence record.
