# Spell buff mute evidence

Date: 2026-07-29

Canonical measurement baseline: Dungeons of Dredmor `1.1.5 public_beta`,
Steam build `22934623`, base game plus all three official expansions

## Scope

This slice preserves buff-local `<mute>` declarations as ordered, loss-aware
source metadata. The declaration identifies the marker that the preserved
application labels `Prevents Casting` and retains its optional non-negative
integer `amount`.

It is not a casting-eligibility simulation. Consumers must not infer affected
actors or spell categories, amount meaning, immunity, resistance, stacking,
duration, removal, targeting, AI behavior, or runtime success from the marker
or amount.

## Preserved legacy and source evidence

The historical spell adapter selects `<mute>`, parses it through the generic
effect adapter, and labels it `Prevents Casting`. The generic adapter does not
read the declaration's `amount`.

All six active official declarations are direct children of a normalized
`<buff>`:

| Source shape        | Declarations |
| ------------------- | -----------: |
| `<mute amount="1">` |            3 |
| `<mute>`            |            3 |
| **Total**           |        **6** |

Every declaration is an empty leaf, and the six declarations occur across six
distinct spells. The modern adapter therefore preserves the optional amount
without assigning it an engine meaning.

## Normalized contract

Every normalized buff has a required ordered `muteDeclarations` array:

- a declaration with a valid non-negative integer amount retains it;
- an absent amount remains `null` and is valid;
- a supplied blank, negative, fractional, or non-numeric amount becomes
  unavailable and is diagnosed;
- unsupported attributes, text, or nested elements remain diagnosed; and
- absence is represented by an empty array.

The strict web artifact schema requires this array and rejects negative,
fractional, extended, or otherwise malformed declarations. Spell pages expose
the source amount inside the owning buff and state the interpretation
boundary.

## Read-only canonical measurement

The active official dataset contains six normalized mute declarations across
six spells: three retain amount `1`, and three have no declared amount.
Supporting the complete measured leaf removes all six former
`unknown_element` diagnostics.

Deterministic official generation now reports:

- 0 errors, 72 warnings, and 71 informational duplicate decisions;
- an 8,058,166-byte normalized artifact;
- a 1,407,994-byte search artifact with 2,767 documents; and
- byte-identical repeated output.

The remaining compatibility backlog is 36 spell constructs: 17 unknown
attributes and 19 unknown elements. The 13 spell-requirement diagnostics and
23 dangling references remain separately tracked.

These are aggregate read-only measurements. The official inputs and generated
official artifacts remain ignored and are not approved for publication.

## Verification

- Focused importer coverage checks ordered amount-present and amount-absent
  declarations plus blank, negative, fractional, non-numeric, extended, and
  nested invalid shapes.
- The synthetic Clockwork Spark buff carries an independently authored
  `<mute amount="1">` declaration.
- The web artifact test rejects a negative normalized amount.
- Browser coverage checks the buff-local declaration, exact source amount,
  interpretation boundary, responsive layouts, and representative axe scan.
- `pnpm.cmd check` passes 168 unit/artifact tests, byte-identical synthetic
  generation, and the 43-page synthetic static export.
- All 36 desktop/mobile Playwright cases pass, including the spell flow,
  responsive checks, keyboard flows, and representative axe scans.
- `pnpm.cmd build:official` repeats the byte-identical zero-error measurement
  above and exports all 2,857 local static pages.
