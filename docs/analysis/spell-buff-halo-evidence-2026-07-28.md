# Spell buff halo evidence

Date: 2026-07-28

Scope: preserved legacy behavior, independently authored synthetic fixtures,
and read-only aggregate measurement of the canonical official dataset

Status: implemented ordered buff-local halo presentation declarations; no
animation timing or gameplay behavior is inferred

## Legacy behavior

The preserved spell parser scans each spell and its descendants through a
fixed effect-selector table. That table has no selector or parser for
`<halo>`, so the legacy encyclopedia does not retain or display the
declaration. Its separate buff pass only replaces the spell-row icon with the
buff icon.

The rebuild preserves halo data on the buff that declares it. This keeps the
source association explicit without treating an engine sprite loop as a spell
effect or copying the legacy parser's omission.

## Normalized and presentation boundary

Each `SpellBuff` now has an ordered `halos` array. A declaration preserves:

- a normalized, traversal-checked sprite reference from `name`;
- nullable non-negative source frame count, frame rate, and first frame;
- a nullable centered flag; and
- the measured `frameRate`/`framerate` and
  `centerEffect`/`centereffect` casing aliases.

Missing or unsafe sprite references remain present as `null` and are
diagnosed. Invalid numeric and boolean values become `null`. Unknown
attributes, nested elements, and text content remain source-located
diagnostics rather than being silently accepted. Supplying both casing aliases
for one field emits a conflict diagnostic and retains the canonical-cased
value. Repeated declarations retain source order.

The strict web artifact schema requires the complete shape. The spell page
summarizes whether a sprite reference exists plus the source frame fields, but
does not expose sprite identifiers. It labels the values as local engine
presentation metadata rather than animation timing formulas. The application
does not load or render the referenced proprietary sprites.

## Canonical aggregate measurement

Read-only inspection of all configured official source candidates found 53
halo declarations, all directly nested inside buffs. They belong to 53 buffs
across 53 active spells, with at most one declaration per buff. No candidate
is superseded by source precedence.

All 53 declarations:

- have non-empty safe relative sprite references;
- supply `num` frame counts from 1 through 10;
- supply either `frameRate` or `framerate`, with values from 60 through 300;
  and
- have no child elements or text-node content.

Forty-seven declarations supply `first`, always with value 0. Nine supply a
centered flag: eight enabled and one disabled. The five complete measured
attribute sets occur 24, 14, 7, 6, and 2 times respectively; no unmodeled
attribute combination remains in this family.

The old compatibility boundary reported all 53 declarations as
`unknown_element`. Completing the family reduces the spell compatibility
backlog from 2,303 to 2,250 constructs:

- 2,124 unknown spell-effect attributes; and
- 126 remaining unknown spell elements.

The 13 separately tracked non-mana spell-requirement diagnostics and 20
dangling references are unchanged.

The deterministic official generation reports:

- 0 errors, 2,283 warnings, and 71 informational duplicate decisions;
- a 5,637,251-byte normalized artifact;
- an unchanged 1,348,711-byte search artifact with 2,767 documents; and
- no remaining unknown `halo` element.

## Verification

- Focused importer coverage checks both measured casing aliases, repeated
  declarations, path normalization, unsafe and missing references, invalid
  numbers/booleans, conflicting simultaneous aliases, unknown attributes,
  nested content, and the absence of a compatibility warning for the supported
  shape.
- The runtime artifact test rejects a negative halo frame rate.
- The synthetic spell page exposes the halo summary and verifies that the raw
  sprite reference is absent.
- Deterministic zero-error official generation is byte-identical and removes
  exactly the 53 intended diagnostics.
- `pnpm.cmd check` passes formatting, lint, type checking, 111 unit/artifact
  tests, byte-identical synthetic generation, and the 43-page static export.
- `pnpm.cmd test:e2e` passes all 34 desktop/mobile tests, including the halo
  disclosure, keyboard flows, responsive checks, and representative axe scans.
- `pnpm.cmd build:official` repeats the deterministic zero-error import and
  exports all 2,857 local static pages without publishing the ignored artifact.
