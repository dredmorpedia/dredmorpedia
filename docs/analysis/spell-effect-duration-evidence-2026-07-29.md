# Spell effect duration evidence

Date: 2026-07-29

Canonical measurement baseline: Dungeons of Dredmor `1.1.5 public_beta`,
Steam build `22934623`, base game plus all three official expansions

## Scope

This slice preserves the direct `turns` attribute on normalized spell effects
as a nullable non-negative integer named `durationTurns`. It records the
source-declared duration without combining it with chance, amount, effect type,
buff duration, trigger scheduling, or any engine timing formula.

## Preserved legacy evidence

The historical spell model documents effect duration in turns. Its `paralyze`
and `create` effect adapters copy the direct `turns` attribute into that
duration field and display it as a turn count.

The canonical build also supplies `turns` on `charm`, `fear`, and `sleep`
effects. Those declarations establish the source field but do not prove that
all five effect types share every runtime rule. The rebuild therefore preserves
the direct value uniformly while making no claim about countdown start,
stacking, refresh, resistance, removal, or scheduling semantics.

## Normalized and presentation contract

Every normalized spell effect has a required `controls.durationTurns` field:

- an absent declaration becomes `null`;
- a supplied non-negative integer is preserved exactly;
- a blank, negative, fractional, or otherwise invalid supplied value becomes
  `null` with a source-located `invalid_number` diagnostic; and
- unrelated effect attributes and children remain explicit compatibility
  diagnostics.

The strict web artifact schema rejects negative, fractional, non-finite, or
missing duration fields. The spell page renders a supplied value as a declared
source duration and keeps the existing boundary against inferred trigger
timing or runtime behavior.

## Read-only canonical measurement

The four configured official sources contain 69 direct declarations:

| Source                         | Declarations |
| ------------------------------ | -----------: |
| Dungeons of Dredmor            |           39 |
| Realm of the Diggle Gods       |            3 |
| You Have To Name The Expansion |           17 |
| Conquest of the Wizardlands    |           10 |

All 69 source candidates remain active across 69 effects and 68 spells:

| Effect type | Declarations |
| ----------- | -----------: |
| `paralyze`  |           57 |
| `create`    |            6 |
| `charm`     |            4 |
| `fear`      |            1 |
| `sleep`     |            1 |

Values are positive integers from 1 through 100. Supporting this family removes
all 69 former `unknown_attribute` diagnostics. Deterministic official
generation now reports:

- 0 errors, 206 warnings, and 71 informational duplicate decisions;
- a 7,278,711-byte normalized artifact;
- an unchanged 1,348,711-byte search artifact with 2,767 documents; and
- byte-identical repeated output.

The remaining compatibility backlog is 170 spell constructs: 136 unknown
attributes and 34 unknown elements. The 13 spell-requirement diagnostics and
23 dangling references remain separately tracked.

These are aggregate read-only measurements. The official inputs and generated
official artifacts remain ignored and are not approved for publication.

## Verification

- Focused importer coverage preserves positive and explicit zero values while
  rejecting negative and fractional declarations.
- The synthetic artifact includes a three-turn paralyze declaration.
- The web artifact test rejects a negative normalized duration.
- The spell browser flow verifies the declared source duration and the
  no-runtime-inference disclosure.
- `pnpm.cmd generate:official:check` passes deterministic zero-error official
  generation with the measurements above.
- `pnpm.cmd check` passes formatting, linting, type checking, all 143
  unit/artifact tests, byte-identical synthetic generation, and the 43-page
  synthetic static export.
- `pnpm.cmd test:e2e` passes all 34 desktop/mobile browser cases, including the
  duration disclosure and representative axe scans.
- `pnpm.cmd build:official` repeats the byte-identical zero-error official
  generation and exports all 2,857 local static pages.
