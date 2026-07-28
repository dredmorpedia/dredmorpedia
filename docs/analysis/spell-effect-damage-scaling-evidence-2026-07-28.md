# Spell effect damage and scaling evidence

Date: 2026-07-28
Canonical measurement baseline: Dungeons of Dredmor `1.1.5 public_beta`, Steam build `22934623`, base game plus all three official expansions

## Scope

This slice preserves direct spell-effect damage amounts, matching factor coefficients, and the measured scaling-selector fields. It covers:

- the 16 source damage keys already used by the shared stat contract;
- matching `F` factor attributes on `damage` and `drain` effects;
- `amountF` on `heal` and `spellpoints` effects;
- `floorScaleF` on `spawnitematlocation` effects; and
- `primaryScale`/`primaryscale` and `secondaryScale` selectors on `damage`, `drain`, and `heal` effects.

The normalized artifact records source declarations. It does not calculate final damage, healing, mana, spawn count, resistance, armour interaction, rounding, or any other combat result.

## Preserved legacy evidence

The historical application calls `Dredmor.Stat.ParseStats` for `damage` and `drain` effects. That parser reads the same 16 damage attributes and their matching `F` attributes. For a factor it selects a declared primary stat first, then a secondary stat, and otherwise falls back to Magic Power.

The historical spell parser also reads `amount` and `amountF` explicitly for `heal` and `spellpoints`. It does not document `floorScaleF`.

Those observations establish field recognition, but they are not sufficient evidence for a complete runtime formula. In particular, the rebuild does not reproduce the legacy fallback to Magic Power, selector precedence, resistance or armour rules, rounding, or `floorScaleF` behavior.

## Normalized contract

Every normalized spell effect now has:

- an ordered `damage` array containing only supplied damage-source declarations;
- each declaration's canonical source key, nullable non-negative base amount, and nullable non-negative factor;
- a required `scaling` object with nullable non-negative amount and floor factors; and
- nullable non-negative integer primary and secondary source IDs.

Factor-only damage declarations remain present with `amount: null`. Missing, blank, negative, or non-finite supplied numbers become `null` and emit source-located `invalid_number` diagnostics. Attributes on an effect type outside the evidenced boundary remain `unknown_attribute` diagnostics.

The two measured primary-selector casing forms normalize to one field. Supplying both aliases emits `conflicting_spell_effect_scaling_aliases` and preserves the canonical-casing value. Supplying primary and secondary selectors together emits `conflicting_spell_effect_scaling_selectors` and retains both source values without choosing a formula.

The web artifact guard requires the complete shape and rejects unknown damage keys, negative or non-finite coefficients, and invalid selector IDs. Spell pages render each base/factor declaration and supplied scaling field, explicitly state when no damage or scaling was declared, and explain that the source fields are not a computed formula.

## Read-only canonical measurement

Before normalization, the four official sources contained 990 candidate attributes across 453 source effects:

| Source      | Effects | Base damage | Damage factors | Selectors | Amount factors | Floor factors | Total attributes |
| ----------- | ------: | ----------: | -------------: | --------: | -------------: | ------------: | ---------------: |
| Base game   |     235 |         309 |            128 |        24 |             14 |             0 |              475 |
| Expansion 1 |      38 |          53 |             21 |         8 |              1 |             0 |               83 |
| Expansion 2 |     137 |         164 |            109 |        43 |              0 |             0 |              316 |
| Expansion 3 |      43 |          63 |             36 |        15 |              0 |             2 |              116 |
| Total       |     453 |         589 |            294 |        90 |             15 |             2 |              990 |

Source precedence leaves 951 active spells with 1,634 effects. The active normalized artifact contains:

- 605 damage declarations across 433 effects;
- 586 declared base amounts and 294 factor coefficients;
- 19 factor-only declarations;
- at most four damage declarations on one effect;
- 106 effects with at least one scaling field;
- 15 amount factors, two floor factors, 23 primary selectors, and 67 secondary selectors.

The measured fixed amounts are positive integers from 1 through 38. Damage factors range from 0.04 through 6, amount factors from 0.025 through 1.2, and floor factors from 1 through 1.1. Primary source IDs range from 0 through 5 and secondary source IDs from 1 through 23. No active official effect supplies both primary and secondary selectors or both primary-selector aliases.

Supporting this family removes all 990 candidate compatibility diagnostics. Deterministic official generation now reports 0 errors, 275 warnings, and 71 informational duplicate decisions. The remaining compatibility backlog is 239 spell constructs, with 13 spell-requirement diagnostics and 23 dangling references tracked separately.

These are aggregate read-only measurements. The official inputs and generated official artifacts remain ignored and are not approved for publication.

## Verification

Focused pipeline tests cover complete declarations, factor-only damage, both primary-selector aliases, invalid/blank/negative numbers, alias conflicts, simultaneous selectors, and attributes on unsupported effect types. The web artifact test rejects an invalid negative factor. Synthetic browser coverage verifies a mixed base/factor declaration, a factor-only declaration, a secondary selector, the no-formula disclosure, and the explicit empty state.

`pnpm.cmd check` passes formatting, lint, type checking, all 123 unit/artifact tests, byte-identical synthetic generation, and the 43-page synthetic export. All 34 desktop/mobile Playwright cases pass, including the spell disclosure, responsive layouts, keyboard flows, and representative axe scans. `pnpm.cmd build:official` passes byte-identical zero-error official generation with 275 warnings and 71 informational decisions and exports all 2,857 local static pages.
