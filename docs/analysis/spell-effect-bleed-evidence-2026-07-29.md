# Spell effect bleed evidence

Date: 2026-07-29

Canonical measurement baseline: Dungeons of Dredmor `1.1.5 public_beta`,
Steam build `22934623`, base game plus all three official expansions

## Scope

This slice preserves the direct `bleed` attribute on normalized spell effects
as a nullable boolean named `controls.bleedsTarget`. It also gives the already
normalized standalone `type="bleed"` effect the preserved application's
"Starts bleeding" presentation label. The contract records source declarations
without defining damage, duration, stacking, resistance, target selection, or
other engine behavior.

## Preserved legacy evidence

The historical spell adapter independently applies every matching effect
parser to the source XML. Its damage parser selects `effect[type="damage"]`,
while its bleed parser selects both `effect[type="bleed"]` and
`effect[bleed="1"]` and labels each match "Starts Bleeding".

Consequently, a damage declaration with `bleed="1"` produces both a damage
presentation entry and a bleeding entry in the historical application. The
modern page keeps one normalized source effect and presents the bleeding
declaration as an additional fact, avoiding a duplicate source record while
retaining the useful legacy meaning. Standalone bleed effects use the same
readable label.

## Normalized and presentation contract

Every normalized spell effect has a required `controls.bleedsTarget` field:

- an absent declaration becomes `null`;
- source `0` becomes `false`;
- source `1` becomes `true`;
- any other supplied value becomes `null` with a source-located
  `invalid_boolean` diagnostic; and
- unrelated effect attributes and children remain explicit compatibility
  diagnostics.

The strict web artifact schema rejects non-boolean or missing values. A
supplied value renders as a "Starts bleeding" yes/no fact. The spell page's
existing disclosure continues to prohibit inferred final damage, targeting,
resistance, timing, and other runtime behavior.

## Read-only canonical measurement

The four configured official sources contain 12 active direct `bleed`
attributes. All are `bleed="1"` on `type="damage"` effects:

| Source                              | Declarations |
| ----------------------------------- | -----------: |
| Dungeons of Dredmor                 |            8 |
| Realm of the Diggle Gods            |            1 |
| You Have To Name The Expansion Pack |            3 |
| Conquest of the Wizardlands         |            0 |
| **Total**                           |       **12** |

The canonical sources also contain nine standalone `type="bleed"` effects:
eight in the base game and one in Realm of the Diggle Gods. No declaration
uses both shapes, so the preserved application's selector exposes 21 active
bleeding presentations in total.

Supporting the direct attribute removes all 12 former `bleed` diagnostics.
Deterministic official generation now reports:

- 0 errors, 178 warnings, and 71 informational duplicate decisions;
- a 7,383,540-byte normalized artifact;
- a 1,407,994-byte search artifact with 2,767 documents; and
- byte-identical repeated output.

The remaining compatibility backlog is 142 spell constructs: 108 unknown
attributes and 34 unknown elements. The 13 spell-requirement diagnostics and
23 dangling references remain separately tracked.

These are aggregate read-only measurements. The official inputs and generated
official artifacts remain ignored and are not approved for publication.

## Verification

- Focused importer coverage preserves explicit true and false while rejecting
  a malformed declaration.
- The synthetic artifact includes explicit false direct-effect metadata and a
  standalone bleed effect.
- The web artifact test rejects a non-boolean normalized value.
- The spell browser flow checks both the explicit false fact and the standalone
  "Starts bleeding" effect label.
- `pnpm.cmd generate:official:check` passes deterministic zero-error official
  generation with the measurements above.
- `pnpm.cmd check` passes formatting, linting, type checking, all 152
  unit/artifact tests, byte-identical synthetic generation, and the 43-page
  synthetic static export.
- `pnpm.cmd test:e2e` passes all 36 desktop/mobile browser cases, including the
  bleed disclosures, responsive layouts, keyboard flows, and representative
  axe scans.
- `pnpm.cmd build:official` repeats deterministic zero-error generation and
  exports all 2,857 local static pages.
