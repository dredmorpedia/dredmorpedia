# Spell buff-description evidence

Date: 2026-07-28

Scope: preserved legacy behavior, independently authored synthetic fixtures,
and read-only aggregate measurement of the canonical official dataset

Status: implemented ordered buff-local description declarations; no gameplay
behavior is inferred

## Legacy behavior

The preserved spell parser obtains a spell description with
`xmlSpell.find('description').attr('text')`. Because that query searches every
descendant, a `<description>` nested inside a `<buff>` can become the legacy
spell-row description when no earlier description is present. The legacy buff
effect itself does not retain or label the text separately.

The rebuild keeps the existing direct spell-description boundary and now
preserves nested text on the buff that declares it. This avoids moving
buff-specific copy into the spell-wide description while retaining the useful
legacy-visible content.

## Normalized and presentation boundary

Each `SpellBuff` now contains an ordered `descriptions` array. Every declaration
has a nullable `text` field:

- a supplied string, including a concrete empty string, is preserved exactly;
- a declaration with no `text` attribute remains present with `null` and emits
  `missing_spell_buff_description_text`;
- unknown attributes and child elements remain source-located diagnostics; and
- repeated declarations retain source order rather than being collapsed.

The strict web artifact schema requires this complete shape. Buff description
text contributes to the deterministic search document for its spell. The spell
detail page renders the text inside the matching buff and exposes an explicit
unavailable state for a malformed declaration. It does not interpret the copy
as a duration, trigger, stacking, targeting, or other gameplay rule.

## Canonical aggregate measurement

Read-only inspection of all configured official source candidates found 32
`<description>` declarations nested directly inside buffs. Every declaration:

- has exactly one attribute named `text`;
- has no child element or text-node content; and
- belongs to a buff with no second description declaration.

Source precedence leaves 31 active declarations across 31 spells. The remaining
candidate is superseded before publication. All 31 active description strings
are non-empty, no active value is `null`, and the maximum remains one
description per buff.

The old compatibility boundary reported all 32 candidate declarations as
`unknown_element`. Completing this family reduces the canonical compatibility
backlog from 2,335 to 2,303 constructs, all on spells. The 13 separately tracked
non-mana spell-requirement diagnostics and 20 dangling references are
unchanged.

The deterministic official generation reports:

- 0 errors, 2,336 warnings, and 71 informational decisions;
- a 5,620,230-byte normalized artifact;
- a 1,348,711-byte search artifact with the same 2,767 documents; and
- no remaining unknown `description` element beneath a spell buff.

The complete static export remains 2,857 pages.

## Verification

- Focused importer coverage checks ordered repeated descriptions, missing text,
  unknown attributes, nested unknown content, search indexing, and the absence
  of compatibility warnings for the supported shape.
- The runtime artifact test rejects a non-string, non-null description value.
- `pnpm.cmd check` passes formatting, lint, type checking, 110 unit/artifact
  tests, byte-identical synthetic generation, and the 43-page synthetic static
  export.
- `pnpm.cmd test:e2e` passes all 34 desktop/mobile tests, including visible
  buff-local text, keyboard flows, responsive checks, and the representative
  axe sweep.
- Deterministic zero-error official generation passes, and the local static
  export generates all 2,857 pages without publishing the ignored artifact.
