# Spell buff invisibility evidence

Date: 2026-07-29

Canonical measurement baseline: Dungeons of Dredmor `1.1.5 public_beta`,
Steam build `22934623`, base game plus all three official expansions

## Scope

This slice preserves buff-local `<invisible>` declarations as ordered,
loss-aware source metadata. The declaration identifies an invisibility marker
and retains its optional non-negative integer `amount`.

It is not a visibility simulation. Consumers must not infer visibility
strength, detection rules, affected actor, breaking conditions, stacking,
duration, targeting eligibility, AI behavior, or runtime success from the
marker or amount.

## Preserved legacy and source evidence

The historical spell adapter selects `<invisible>` and labels it
`Invisibility`. Its generic effect parser does not interpret the declaration's
`amount`.

All nine active official declarations are direct children of a normalized
`<buff>`:

| Source shape             | Declarations |
| ------------------------ | -----------: |
| `<invisible amount="1">` |            8 |
| `<invisible>`            |            1 |
| **Total**                |        **9** |

Every declaration is an empty leaf, and the nine declarations occur across
nine distinct spells. The modern adapter therefore preserves the optional
amount but does not assign it an engine meaning.

## Normalized contract

Every normalized buff has a required ordered `invisibilityDeclarations`
array:

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

The active official dataset contains nine normalized invisibility declarations
across nine spells: eight retain amount `1`, and one has no declared amount.
Supporting the complete measured leaf removes all nine former
`unknown_element` diagnostics.

Deterministic official generation now reports:

- 0 errors, 78 warnings, and 71 informational duplicate decisions;
- an 8,048,443-byte normalized artifact;
- a 1,407,994-byte search artifact with 2,767 documents; and
- byte-identical repeated output.

The remaining compatibility backlog is 42 spell constructs: 17 unknown
attributes and 25 unknown elements. The 13 spell-requirement diagnostics and
23 dangling references remain separately tracked.

These are aggregate read-only measurements. The official inputs and generated
official artifacts remain ignored and are not approved for publication.

## Verification

- Focused importer coverage checks ordered amount-present and amount-absent
  declarations plus blank, negative, fractional, extended, and nested invalid
  shapes.
- The synthetic Clockwork Spark buff carries an independently authored
  `<invisible amount="1">` declaration.
- The web artifact test rejects a negative normalized amount.
- Browser coverage checks the buff-local declaration, exact source amount,
  interpretation boundary, responsive layouts, and representative axe scan.
- `pnpm.cmd check` passes 166 unit/artifact tests, byte-identical synthetic
  generation, and the 43-page synthetic static export.
- All 36 desktop/mobile Playwright cases pass, including the spell flow,
  responsive checks, keyboard flows, and representative axe scans.
- `pnpm.cmd build:official` repeats the byte-identical zero-error measurement
  above and exports all 2,857 local static pages.
