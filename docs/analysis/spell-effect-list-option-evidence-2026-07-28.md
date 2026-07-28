# Spell effect list-option evidence

Date: 2026-07-28

Scope: preserved legacy behavior, independently authored synthetic fixtures,
and read-only aggregate measurement of the canonical official dataset

Status: implemented typed ordered item/spell list options and reciprocal
relationships; selection and runtime behavior are not inferred

## Legacy behavior

The preserved `SpawnItemFromList` parser collects descendant `<option>` names
into an item-name array. It does not retain the two measured `amount`
attributes, resolve item relationships, or expose missing targets.

The legacy trigger table declares `triggerfromlist`, but the generic trigger
helper reads only `name` or `spell` from the outer `<effect>`. The measured
targets live on nested `<option>` elements, and the spell effect parser has no
corresponding list-effect handler. Consequently, the legacy encyclopedia does
not disclose the measured trigger-list targets.

The rebuild treats both parent types as direct source declarations rather than
porting those lossy behaviors.

## Normalized and presentation boundary

Every `SpellEffect` carries a required ordered `options` array. Options are
accepted only for the two measured parent types:

- `spawnitemfromlist` produces item options with nullable paired name/key
  fields, an optional resolved item ID, and a nullable positive direct source
  amount; and
- `triggerfromlist` produces spell options with nullable paired name/key
  fields and an optional resolved spell ID.

Missing or whitespace-only names and invalid item amounts remain present as
`null` with source-located diagnostics. Unknown option attributes include
their source values in diagnostics; child elements and text remain explicit.
An `<option>` under any other effect type is still unsupported. The strict web
schema requires the complete discriminated shape, paired target fields, and
positive item amounts.

The spell page exposes source order, resolution state, direct item amounts,
and links. Spell and item detail pages expose reciprocal backlinks. The UI
explicitly does not infer selection weights, probabilities, eligibility,
fallback behavior, or runtime spawning/triggering. Trigger-list options are
not added to recursive effect-chain traversal because their selection
semantics are unavailable.

## Canonical aggregate measurement

Read-only inspection of all configured official sources found 45 list effects
with 276 options:

- base: 8 item-list effects with 99 options and 2 spell-list effects with 10
  options;
- expansion 1: 5 item-list effects with 28 options;
- expansion 2: 13 item-list effects with 65 options and 9 spell-list effects
  with 42 options; and
- expansion 3: 8 spell-list effects with 32 options.

All 276 options have a non-blank `name`, no child elements, and no text.
Exactly two item options additionally carry a positive `amount`; no spell
option has an extra measured attribute. Source selection does not supersede a
list-effect candidate, so the active artifact retains all 45 effects and all
276 options: 192 item options across 26 effects and 84 spell options across 19
effects.

All 84 spell options resolve. Of the 192 item declarations, 189 resolve and
three remain dangling: one declaration names one unavailable item and two
amount-bearing declarations repeat another unavailable item. Preserving those
references raises the separately tracked dangling count from 20 to 23.

The old compatibility boundary reported one nested `unknown_element` per list
effect. Completing the family removes all 45 `<option>` diagnostics and
reduces the spell compatibility backlog from 2,203 to 2,158 constructs:

- 2,124 unknown spell-effect attributes; and
- 34 remaining unknown spell elements.

The 13 separately tracked non-mana spell-requirement diagnostics are
unchanged.

The deterministic official generation reports:

- 0 errors, 2,194 warnings, and 71 informational duplicate decisions;
- a 5,772,957-byte normalized artifact;
- an unchanged 1,348,711-byte search artifact with 2,767 documents; and
- no remaining unknown `option` element under a supported list effect.

## Verification

- Focused importer coverage checks both typed parent shapes, repeated source
  order, absent and invalid item amounts, empty and whitespace-only targets,
  unknown attributes with values, nested elements, text, and a misplaced
  option that remains unsupported.
- Domain coverage checks deterministic spell- and item-option backlinks.
- The runtime artifact test rejects a non-positive normalized item amount.
- The synthetic spell and item pages cover resolved and dangling targets,
  reciprocal links, declared and absent item amounts, explicit empty state,
  and the no-inference boundary.
- Deterministic zero-error official generation is byte-identical and removes
  exactly the 45 intended compatibility diagnostics while surfacing the three
  previously hidden dangling item declarations.
- `pnpm.cmd check` passes formatting, lint, type checking, 116 unit/artifact
  tests, byte-identical synthetic generation, and the 43-page static export.
- `pnpm.cmd test:e2e` passes all 34 desktop/mobile tests, including list-option
  disclosure and backlinks, keyboard flows, responsive layouts, and
  representative axe scans.
- `pnpm.cmd build:official` repeats deterministic zero-error generation and
  exports all 2,857 local static pages without publishing the ignored artifact.
