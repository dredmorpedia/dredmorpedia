# Spell shield-requirement evidence

Date: 2026-08-06

## Scope

This slice preserves exact non-mana `<requirements shield="..." />`
declarations as loss-aware source metadata. It does not interpret the value as
an actor state, equipped item, eligibility rule, timing rule, or guarantee of
runtime success.

## Preserved application and schema evidence

The installed `validation/spells.xsd` schema declares optional `shield` on
`<requirements>` with type `dredbool`. The included schema restricts that type
to the lexical integer values `0` and `1`. The preserved application's
`ManaCost` selector visits every `<requirements>` element but reads only `mp`,
`savvyBonus`, and `mincost`; no preserved first-party parser reads or presents
the shield attribute. The schema therefore establishes the exact source shape,
but the available reference code does not establish engine behavior.

The canonical dataset has three active shield-only declarations:

- Tortoise Maneuver: `shield="1"`;
- Defensive Bash: `shield="1"`; and
- Duck And Cover!: `shield="1"`.

No active official shield declaration combines another requirement attribute
or nested content.

## Normalized contract

Every normalized spell has an ordered `shieldRequirements` array. Each record
has a required nullable `sourceValue`. Source `1` becomes `true`, source `0`
becomes `false`, and an invalid supplied value becomes `null` with an
`invalid_boolean` diagnostic. An absent shield attribute produces no shield
record. Exact shield-only declarations are removed from the generic
unsupported-requirement backlog. A shield declaration combined with another
known requirement family remains unsupported until that combined boundary is
evidenced.

The strict web artifact schema requires the array and rejects non-boolean
non-null source values. The spell page presents the source flag and states the
interpretation boundary.

## Read-only canonical measurement

All three active declarations normalize with `sourceValue: true`.
Deterministic official generation is byte-identical and reports 763 items,
2,767 search documents, 0 errors, 33 warnings, and 71 informational duplicate
decisions. The remaining warnings are exactly ten unsupported non-mana spell
requirements and 23 dangling references. The remaining requirement shapes are
one weapon flag, six booze values, and three zorkmid declarations.

These are aggregate read-only measurements. Official inputs and generated
official artifacts remain ignored and are not approved for publication.

## Regression coverage

- Importer coverage checks valid true/false flags, rejects a non-schema boolean
  spelling, retains the unsupported weapon shape, and preserves unknown
  extensions as diagnostics.
- The independently authored Clockwork Echo fixture carries `shield="1"`.
- The strict checksummed-artifact regression rejects a numeric replacement for
  the normalized boolean.
- The spell page exposes the source flag, its empty state, and the
  non-interpretation boundary through the existing desktop/mobile spell flow.

## Verification

- `pnpm.cmd check` passes formatting, lint, type checking, 201 unit/artifact
  tests, byte-identical synthetic generation, and the 43-page static export.
- `pnpm.cmd build:official` repeats byte-identical zero-error official
  generation and exports all 2,857 local pages.
- `pnpm.cmd test:e2e` passes all 36 desktop/mobile, keyboard, responsive, and
  representative axe cases.
- Manual official checks confirm the true flag and no attached diagnostic on
  Tortoise Maneuver, the empty state on Aetheric Death Ray, and no horizontal
  overflow at a 375-pixel viewport.
