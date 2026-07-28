# Spell effect control evidence

Date: 2026-07-28

Scope: preserved legacy behavior, independently authored synthetic fixtures,
and read-only aggregate measurement of the canonical official dataset

Status: implemented loss-aware direct effect chance, targeting, resistance,
burn, and taxonomy controls; combined runtime behavior is not inferred

## Legacy behavior

The preserved generic effect parser:

- reads `percent`, falling back to `percentage`, but omits a declared `100`
  from its presentation model;
- treats either measured `affectsCaster` casing as a caster flag;
- reads `self` and `burn` as enabled only for the source value `1`;
- converts `resistable=0` into a derived `unresistable` display flag; and
- retains `taxa` as a monster-taxonomy label.

The legacy template displays chance, caster, self, burn, unresistable, and
taxonomy values. It does not preserve explicit false declarations, does not
retain a declared 100-percent value, and does not parse the measured
`affectsCorpses` attribute.

The rebuild uses the legacy behavior as vocabulary evidence, while preserving
the direct source values instead of copying those lossy conversions.

## Normalized and presentation boundary

Every direct `SpellEffect` now carries a required `controls` object:

- `chancePercent` accepts the measured `percent` and `percentage` aliases as
  a nullable integer from 0 through 100;
- `affectsCaster` accepts both measured casing aliases;
- `affectsSelf`, `affectsCorpses`, `resistable`, and `burnsTarget` preserve
  explicit true/false source flags; and
- `taxonomy` preserves a non-blank direct source token.

Absent and invalid values remain distinct through `null`. Invalid percentages,
invalid booleans, blank supplied taxonomy, and simultaneous aliases receive
source-located diagnostics. Simultaneous aliases use the canonical casing
deterministically rather than combining potentially contradictory values. The
strict web schema requires every field and rejects malformed normalized data.

The spell page exposes only declared values and an explicit empty state for an
effect without controls. It does not combine the fields into target
eligibility, corpse selection, resistance, ignition, or runtime probability
behavior.

## Canonical aggregate measurement

Read-only inspection of all configured official sources found 799 valid
control attributes across 715 direct effect declarations:

| Source      | Controlled effects | Control attributes |
| ----------- | -----------------: | -----------------: |
| Base game   |                285 |                316 |
| Expansion 1 |                 91 |                102 |
| Expansion 2 |                247 |                262 |
| Expansion 3 |                 92 |                119 |

The candidate attributes comprise:

- 213 `percent` and 52 `percentage` declarations;
- 134 `affectsCaster` and 130 `affectscaster` declarations;
- 84 `self` declarations;
- 75 `affectsCorpses` declarations;
- 47 `resistable` declarations;
- 52 `taxa` declarations; and
- 12 `burn` declarations.

No candidate supplies both aliases for either normalized field. Every measured
percentage is an integer from 2 through 100, every flag is `0` or `1`, and
every taxonomy value is non-blank.

Source precedence leaves 795 direct control values on 711 active effects
across 403 spells:

- 264 chances;
- 263 caster flags: 238 true and 25 false;
- 84 self flags: 22 true and 62 false;
- 73 corpse flags: 2 true and 71 false;
- 47 resistance flags, all false;
- 12 burn flags, all true; and
- 52 taxonomy values across Animal, Construct, Demon, Gas Canister, Other,
  Player, and Undead.

Completing this family removes exactly 799 former effect-attribute diagnostics.
The spell compatibility backlog falls from 2,158 to 1,359 constructs:

- 1,325 remaining unknown direct-effect attributes; and
- 34 remaining unknown spell elements.

The 13 separately tracked non-mana spell-requirement diagnostics and 23
dangling references are unchanged.

Deterministic official generation reports:

- 0 errors, 1,395 warnings, and 71 informational duplicate decisions;
- a 6,207,318-byte normalized artifact;
- an unchanged 1,348,711-byte search artifact with 2,767 documents; and
- byte-identical repeated output.

## Verification

- Focused importer coverage exercises both aliases, explicit true/false
  values, invalid percentages and booleans, blank taxonomy, simultaneous
  aliases, and an unrelated future attribute that remains diagnosed.
- The synthetic artifact includes one effect with every control plus other
  effects with the explicit no-controls state.
- The runtime artifact guard rejects an out-of-range normalized chance.
- The synthetic spell page exposes every direct value, the no-controls state,
  and the no-inference boundary.
- Deterministic zero-error official generation removes exactly the intended
  799 compatibility diagnostics without changing search output.
- `pnpm.cmd check` passes formatting, lint, type checking, all 118
  unit/artifact tests, byte-identical synthetic generation, and the 43-page
  static export.
- `pnpm.cmd test:e2e` passes all 34 desktop/mobile tests, including direct
  effect control disclosure, keyboard flows, responsive layouts, and
  representative axe scans.
- `pnpm.cmd build:official` repeats deterministic zero-error generation and
  exports all 2,857 local static pages without publishing the ignored artifact.
