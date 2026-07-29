# Spell effect skip-animation evidence

Date: 2026-07-29

Canonical measurement baseline: Dungeons of Dredmor `1.1.5 public_beta`,
Steam build `22934623`, base game plus all three official expansions

## Scope

This slice preserves the direct `skipanimation` spell-effect flag as a nullable
boolean named `controls.skipAnimation`. It also accepts the validation schema's
`skipAnimation` casing as an alias. The contract records a direct source
declaration without defining animation order, timing, synchronization, target
selection, or which presentation sequence the engine suppresses.

## Preserved legacy and schema evidence

The historical spell adapter selects teleport effects and labels them
"Teleports", but its generic effect parser reads only chance, caster/self
targeting, burn, resistance, and taxonomy controls. Neither the generic parser
nor any specialized parser reads either skip-animation casing, so the
preserved application does not disclose this flag.

The installed validation schema declares `skipAnimation` as a boolean effect
attribute. The active official XML instead uses only lowercase
`skipanimation`. The modern importer accepts both source forms, prefers the
schema-cased form when both are supplied, and emits a source-located alias
conflict rather than silently choosing between simultaneous declarations.

## Normalized and presentation contract

Every normalized spell effect has a required `controls.skipAnimation` field:

- an absent declaration becomes `null`;
- source `0` becomes `false`;
- source `1` becomes `true`;
- any other supplied value becomes `null` with a source-located
  `invalid_boolean` diagnostic; and
- simultaneous aliases retain the `skipAnimation` value and emit
  `conflicting_spell_effect_control_aliases`.

The strict web artifact schema rejects missing or non-boolean values. A supplied
value renders as a "Skip animation" yes/no fact. The spell page explicitly
withholds animation sequencing and runtime interpretation.

## Read-only canonical measurement

The four configured official sources contain five active lowercase
`skipanimation` declarations. All five use the value `1`:

| Source                              | Effect shapes                   | Declarations |
| ----------------------------------- | ------------------------------- | -----------: |
| Dungeons of Dredmor                 | teleport, swap-with-monster     |            2 |
| Realm of the Diggle Gods            | none                            |            0 |
| You Have To Name The Expansion Pack | teleport                        |            3 |
| Conquest of the Wizardlands         | none                            |            0 |
| **Total**                           | **teleport, swap-with-monster** |        **5** |

Supporting the flag removes all five former `skipanimation` diagnostics.
Deterministic official generation now reports:

- 0 errors, 173 warnings, and 71 informational duplicate decisions;
- a 7,443,738-byte normalized artifact;
- a 1,407,994-byte search artifact with 2,767 documents; and
- byte-identical repeated output.

The remaining compatibility backlog is 137 spell constructs: 103 unknown
attributes and 34 unknown elements. The 13 spell-requirement diagnostics and
23 dangling references remain separately tracked.

These are aggregate read-only measurements. The official inputs and generated
official artifacts remain ignored and are not approved for publication.

## Verification

- Focused importer coverage preserves both casing forms, explicit true and
  false, a simultaneous-alias diagnostic, and malformed input.
- The synthetic artifact includes an explicit false lowercase declaration.
- The web artifact test rejects a non-boolean normalized value.
- The spell browser flow checks the explicit false fact.
- `pnpm.cmd generate:official:check` passes deterministic zero-error official
  generation with the measurements above.
- `pnpm.cmd check` passes formatting, linting, type checking, all 153
  unit/artifact tests, byte-identical synthetic generation, and the 43-page
  synthetic static export.
- `pnpm.cmd test:e2e` passes all 36 desktop/mobile browser cases, including the
  skip-animation disclosure, responsive layouts, keyboard flows, and
  representative axe scans.
- `pnpm.cmd build:official` repeats deterministic zero-error generation and
  exports all 2,857 local static pages.
