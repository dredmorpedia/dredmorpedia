# Spell weapon-requirement evidence

Date: 2026-08-06

## Scope

This slice preserves exact non-mana `<requirements weapon="..." />`
declarations as loss-aware source metadata. It does not interpret the value as
an actor state, equipped item state, weapon category, eligibility rule, timing
rule, or guarantee of runtime success.

## Preserved application and schema evidence

The installed `validation/spells.xsd` schema declares optional `weapon` on
`<requirements>` with type `dredbool`. The included schema restricts that type
to the lexical integer values `0` and `1`. The preserved application's
`ManaCost` selector visits every `<requirements>` element but reads only `mp`,
`savvyBonus`, and `mincost`; no preserved first-party parser reads or presents
the weapon attribute. The schema therefore establishes the exact source shape,
but the available reference code does not establish engine behavior.

The canonical dataset has one active weapon-only declaration:
Liechtenauer's Overhau supplies `weapon="0"`. It has no other requirement
attribute or nested content.

## Normalized contract

Every normalized spell has an ordered `weaponRequirements` array. Each record
has a required nullable `sourceValue`. Source `1` becomes `true`, source `0`
becomes `false`, and an invalid supplied value becomes `null` with an
`invalid_boolean` diagnostic. An absent weapon attribute produces no weapon
record. Exact weapon-only declarations are removed from the generic
unsupported-requirement backlog. A weapon declaration combined with another
known requirement family remains unsupported until that combined boundary is
evidenced.

The strict web artifact schema requires the array and rejects non-boolean
non-null source values. The spell page presents the source flag and states the
interpretation boundary.

## Read-only canonical measurement

Liechtenauer's Overhau normalizes with `sourceValue: false` and has no attached
diagnostic. Deterministic official generation is byte-identical and reports
763 items, 2,767 search documents, 0 errors, 32 warnings, and 71 informational
duplicate decisions. The remaining warnings are exactly nine unsupported
non-mana spell requirements and 23 dangling references. The remaining
requirement shapes are six booze values and three zorkmid declarations.

These are aggregate read-only measurements. Official inputs and generated
official artifacts remain ignored and are not approved for publication.

## Regression coverage

- Importer coverage checks valid true/false flags, rejects a non-schema boolean
  spelling, keeps a combined shield-and-weapon shape unsupported, and preserves
  unknown extensions as diagnostics.
- The independently authored Clockwork Echo fixture carries a separate
  `weapon="0"` declaration.
- The strict checksummed-artifact regression rejects a numeric replacement for
  the normalized boolean.
- The spell page exposes the source flag, its empty state, and the
  non-interpretation boundary through the existing desktop/mobile spell flow.

## Verification

- `pnpm.cmd check` passes formatting, lint, type checking, 202 unit/artifact
  tests, byte-identical synthetic generation, and the 43-page static export.
- `pnpm.cmd build:official` repeats byte-identical zero-error official
  generation and exports all 2,857 local pages.
- `pnpm.cmd test:e2e` passes all 36 desktop/mobile, keyboard, responsive, and
  representative axe cases.
- Manual official checks confirm the false flag and no attached diagnostic on
  Liechtenauer's Overhau, the empty state on Aetheric Death Ray, and no
  horizontal overflow at a 375-pixel viewport.
