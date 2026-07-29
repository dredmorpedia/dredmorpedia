# Spell effect `after` flag evidence

Date: 2026-07-29

Canonical measurement baseline: Dungeons of Dredmor `1.1.5 public_beta`,
Steam build `22934623`, base game plus all three official expansions

## Scope

This slice preserves the direct `after` attribute on normalized spell effects
as a nullable boolean named `controls.after`. It records the exact true/false
source declaration without treating the field as proof of evaluation order,
delay, scheduling, or trigger timing.

## Preserved legacy evidence

The historical spell adapter does not read or display the direct spell-effect
`after` attribute. The canonical XML nevertheless supplies it on four effect
families. The rebuild therefore preserves the direct field as technical source
metadata while making no engine-behavior claim that the preserved application
did not establish.

## Normalized and presentation contract

Every normalized spell effect has a required `controls.after` field:

- an absent declaration becomes `null`;
- source `0` becomes `false`;
- source `1` becomes `true`;
- any other supplied value becomes `null` with a source-located
  `invalid_boolean` diagnostic; and
- unrelated effect attributes and children remain explicit compatibility
  diagnostics.

The strict web artifact schema rejects non-boolean or missing values. The spell
page renders a supplied value as an “After source flag” yes/no fact and keeps
the existing boundary against inferred trigger timing and runtime behavior.

## Read-only canonical measurement

The four configured official sources contain 16 active declarations:

| Source                         | Declarations |
| ------------------------------ | -----------: |
| Dungeons of Dredmor            |            7 |
| Realm of the Diggle Gods       |            1 |
| You Have To Name The Expansion |            0 |
| Conquest of the Wizardlands    |            8 |

The declarations span:

| Effect type       | False |   True |  Total |
| ----------------- | ----: | -----: | -----: |
| `knock`           |     0 |      3 |      3 |
| `paralyze`        |     0 |      4 |      4 |
| `swapwithmonster` |     0 |      1 |      1 |
| `trigger`         |     1 |      7 |      8 |
| **Total**         | **1** | **15** | **16** |

Supporting this family removes all 16 former `after` attribute diagnostics.
Deterministic official generation now reports:

- 0 errors, 190 warnings, and 71 informational duplicate decisions;
- a 7,325,332-byte normalized artifact;
- a 1,407,994-byte search artifact with 2,767 documents; and
- byte-identical repeated output.

The remaining compatibility backlog is 154 spell constructs: 120 unknown
attributes and 34 unknown elements. The 13 spell-requirement diagnostics and
23 dangling references remain separately tracked.

These are aggregate read-only measurements. The official inputs and generated
official artifacts remain ignored and are not approved for publication.

## Verification

- Focused importer coverage preserves explicit true and false while rejecting
  malformed declarations.
- The synthetic artifact includes an explicit false direct-effect flag.
- The web artifact test rejects a non-boolean normalized value.
- The spell browser flow verifies the explicit false disclosure and the
  no-runtime-inference boundary.
- `pnpm.cmd generate:official:check` passes deterministic zero-error official
  generation with the measurements above.
- `pnpm.cmd check` passes formatting, linting, type checking, all 151
  unit/artifact tests, byte-identical synthetic generation, and the 43-page
  synthetic static export.
- `pnpm.cmd test:e2e` passes all 36 desktop/mobile browser cases, including the
  `after` disclosure and representative axe scans.
- `pnpm.cmd build:official` repeats the byte-identical zero-error official
  generation and exports all 2,857 local static pages.
