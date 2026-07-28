# Spell AI hint evidence

Date: 2026-07-28

Scope: preserved legacy behavior, independently authored synthetic fixtures,
and read-only aggregate measurement of the canonical official dataset

Status: implemented ordered spell- and buff-local AI hint metadata; no
targeting or runtime AI behavior is inferred

## Legacy behavior

The preserved spell parser scans spell descendants through a fixed
effect-selector table. It has no selector or parser for `<ai>`, so the legacy
encyclopedia does not retain or display these declarations.

The rebuild preserves each declaration at its direct source scope. Root
declarations stay on the spell, while the single measured nested declaration
stays on its buff. This records the source shape without promoting a hint token
into an effect or claiming to know how the game engine consumes it.

## Normalized and presentation boundary

`Spell` and `SpellBuff` each expose an ordered `aiHints` array. Every
declaration preserves its exact non-blank `hint` token or `null` when the
attribute is absent or blank. Missing values are diagnosed, and empty or
repeated declarations remain present in source order.

The importer accepts only the measured `hint` attribute. Unknown attributes,
nested elements, and text content remain source-located diagnostics, including
their source values where applicable. The strict web artifact schema requires
the complete nullable shape and rejects empty normalized tokens.

The spell page reports the declaration scope and exact token. It labels the
values as uninterpreted engine guidance and explicitly does not infer
targeting, eligibility, priorities, or runtime AI behavior.

## Canonical aggregate measurement

Read-only inspection of all configured official source candidates found 47
declarations:

- 25 in the base source, 6 in expansion 1, 14 in expansion 2, and 2 in
  expansion 3;
- 46 directly under spells and 1 directly under a buff;
- all with exactly one `hint` attribute and no child elements or text; and
- six tokens: `ally` (5), `buff` (9), `corpse` (2), `mine` (13), `self` (6),
  and `target` (12).

Source precedence and duplicate selection supersede two expansion-2
declarations. The active artifact therefore contains 45 declarations across
45 spells: 44 spell-local and 1 buff-local. Active token counts are `ally` (5),
`buff` (9), `corpse` (2), `mine` (13), `self` (5), and `target` (11).

The old compatibility boundary reported all 47 source candidates as
`unknown_element`. Completing the family reduces the spell compatibility
backlog from 2,250 to 2,203 constructs:

- 2,124 unknown spell-effect attributes; and
- 79 remaining unknown spell elements.

The 13 separately tracked non-mana spell-requirement diagnostics and 20
dangling references are unchanged.

The deterministic official generation reports:

- 0 errors, 2,236 warnings, and 71 informational duplicate decisions;
- a 5,666,996-byte normalized artifact;
- an unchanged 1,348,711-byte search artifact with 2,767 documents; and
- no remaining unknown `ai` element.

## Verification

- Focused importer coverage checks repeated spell-local and buff-local hints,
  empty and whitespace-only values, declaration order, record-specific unknown
  attributes, nested elements, text, and the absence of a compatibility
  warning for the supported shape.
- The runtime artifact test rejects an empty normalized AI hint.
- The synthetic spell page exposes both declaration scopes and the
  no-inference boundary.
- Deterministic zero-error official generation is byte-identical and removes
  exactly the 47 intended diagnostics.
- `pnpm.cmd check` passes formatting, lint, type checking, 113 unit/artifact
  tests, byte-identical synthetic generation, and the 43-page static export.
- `pnpm.cmd test:e2e` passes all 34 desktop/mobile tests, including AI hint
  disclosure, keyboard flows, responsive layouts, and representative axe
  scans.
- `pnpm.cmd build:official` repeats deterministic zero-error generation and
  exports all 2,857 local static pages without publishing the ignored artifact.
