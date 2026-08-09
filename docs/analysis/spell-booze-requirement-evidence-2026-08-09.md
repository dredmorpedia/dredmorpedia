# Spell booze-requirement evidence

Date: 2026-08-09

## Scope

This slice preserves exact non-mana `<requirements booze="..." />`
declarations as loss-aware source metadata. It does not interpret the value as
an actor state, inventory count, consumption requirement, eligibility rule,
timing rule, or guarantee of runtime success.

## Preserved application and schema evidence

The installed `validation/spells.xsd` schema declares optional `booze` on
`<requirements>` with type `xs:byte`, establishing the signed integer range
from -128 through 127. The preserved application's `ManaCost` selector visits
every `<requirements>` element but reads only `mp`, `savvyBonus`, and
`mincost`; no preserved first-party parser reads or presents the `booze`
attribute. The schema therefore establishes the exact source shape, while the
available reference code does not establish engine behavior or the unit of the
value.

The canonical dataset has six active booze-only declarations:

- Nip of Courage: `booze="10"`;
- Buzzing with Magic: `booze="15"`;
- Wizard Krunk: `booze="20"`;
- The Ballmer Peak: `booze="25"`;
- Magically Liquoured: `booze="30"`; and
- Dangerously Mana-blasted: `booze="40"`.

No active official booze declaration combines another requirement attribute
or nested content.

## Normalized contract

Every normalized spell has an ordered `boozeRequirements` array. Each record
has a required nullable signed-byte `sourceValue`. A valid source integer is
preserved exactly. A malformed, empty, or out-of-range supplied value becomes
`null` with an `invalid_number` diagnostic. An absent `booze` attribute
produces no booze record. Exact booze-only declarations are removed from the
generic unsupported-requirement backlog; a booze declaration combined with
another known requirement family remains unsupported until that combined
boundary is evidenced.

Spell-requirement parsing now lives in a bounded pipeline module rather than
the monolithic normalizer. All requirement diagnostics use the declaring
`<requirements>` location, including still-unsupported shapes. The strict web
artifact schema requires `boozeRequirements` and enforces the same signed-byte
range. The spell page presents the source value and states the interpretation
boundary.

## Read-only canonical measurement

All six active declarations normalize with values from 10 through 40 and have
no attached diagnostic. Deterministic official generation is byte-identical
and reports 763 items, 2,767 search documents, 0 errors, 26 warnings, and 71
informational duplicate decisions. The remaining warnings are exactly three
unsupported zorkmid requirements and 23 dangling references.

These are aggregate read-only measurements. Official inputs and generated
official artifacts remain ignored and are not approved for publication.

## Regression coverage

- Importer coverage checks ordinary and signed-byte boundary values, rejects
  empty and out-of-range values, keeps a combined booze/weapon shape
  unsupported, preserves unknown extensions as diagnostics, and verifies the
  requirement-level source location.
- The independently authored Clockwork Echo fixture carries a separate
  `booze="10"` declaration.
- The strict checksummed-artifact regression rejects an out-of-range normalized
  value.
- The spell page exposes the source value, its empty state, and the
  non-interpretation boundary through the existing desktop/mobile spell flow.

## Verification

- `pnpm.cmd check` passes formatting, lint, type checking, 203 unit/artifact
  tests, byte-identical synthetic generation, and the 43-page static export.
- `pnpm.cmd build:official` repeats byte-identical zero-error official
  generation and exports all 2,857 local pages.
- `pnpm.cmd test:e2e` passes all 36 desktop/mobile, keyboard, responsive, and
  representative axe cases.
- Manual official checks confirm source values 10 on Nip of Courage and 40 on
  Dangerously Mana-blasted, the empty state on Aetheric Death Ray, and no
  horizontal overflow at a 375-pixel viewport.
