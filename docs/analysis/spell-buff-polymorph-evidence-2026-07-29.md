# Spell buff polymorph evidence

Date: 2026-07-29

Canonical measurement baseline: Dungeons of Dredmor `1.1.5 public_beta`,
Steam build `22934623`, base game plus all three official expansions

## Scope

This slice preserves buff-local `<polymorph>` declarations as ordered,
loss-aware named monster relationships. The declaration identifies the
monster type exposed by the preserved application under its `Polymorph` label.

It is not a transformation simulation. Consumers must not infer
transformation duration, stat or ability replacement, equipment behavior,
targeting, faction, reversibility, or runtime success from the declaration.

## Preserved legacy and source evidence

The historical spell adapter selects `<polymorph>`, labels it `Polymorph`, and
reads its `name` attribute as the monster type. It does not expose additional
transformation rules.

All four active official declarations are direct children of a normalized
`<buff>`:

| Source                   | Declarations |
| ------------------------ | -----------: |
| Base game                |            2 |
| First official expansion |            2 |
| Other official sources   |            0 |
| **Total**                |        **4** |

Every declaration is an empty leaf with only the `name` attribute. They occur
across four distinct spells, no buff repeats the declaration, and all four
named targets resolve to normalized monster entities. The four declarations
refer to three distinct monsters.

## Normalized contract

Every normalized buff has a required ordered `polymorphDeclarations` array:

- a declaration retains paired nullable source monster name/key fields;
- a matching normalized monster adds an optional resolved `monsterId`;
- a missing or blank source name remains as a null pair and is diagnosed;
- a named missing target remains visible and emits a dangling-reference
  diagnostic;
- unsupported attributes, text, or nested elements remain diagnosed; and
- absence is represented by an empty array.

The strict web artifact schema requires the paired source fields and rejects
partial, extended, or otherwise malformed records. Spell pages link resolved
targets from the owning buff, and monster pages expose deterministic reciprocal
backlinks while stating the interpretation boundary.

## Read-only canonical measurement

The active official dataset contains four normalized polymorph declarations
across four spells. All four resolve to normalized monsters. Supporting the
complete measured leaf removes all four former `unknown_element` diagnostics.

Deterministic official generation now reports:

- 0 errors, 68 warnings, and 71 informational duplicate decisions;
- an 8,069,560-byte normalized artifact;
- a 1,407,994-byte search artifact with 2,767 documents; and
- byte-identical repeated output.

The remaining compatibility backlog is 32 spell constructs: 17 unknown
attributes and 15 unknown elements. The 13 spell-requirement diagnostics and
23 dangling references remain separately tracked.

These are aggregate read-only measurements. The official inputs and generated
official artifacts remain ignored and are not approved for publication.

## Verification

- Focused importer coverage checks resolved, missing, blank, dangling,
  extended, textual, and nested invalid shapes.
- The synthetic Clockwork Spark buff carries an independently authored
  polymorph declaration targeting Training Diggle.
- Domain coverage verifies deterministic reciprocal polymorph backlinks.
- The web artifact test rejects a partial normalized target pair.
- Browser coverage checks the buff-local target, reciprocal monster backlink,
  interpretation boundary, responsive layouts, and representative axe scan.
- `pnpm.cmd check` passes 171 unit/artifact tests, byte-identical synthetic
  generation, and the 43-page synthetic static export.
- All 36 desktop/mobile Playwright cases pass, including the spell and monster
  relationship flows, keyboard coverage, responsive checks, and representative
  axe scans.
- `pnpm.cmd build:official` repeats the byte-identical zero-error measurement
  above and exports all 2,857 local static pages.
