# Spell mana-cost evidence

Date: 2026-07-22

## Scope

This note records the evidence for normalizing and presenting spell mana requirements. It covers source parameters and legacy presentation behavior only; it does not claim undocumented runtime rounding or player-state calculations.

The preserved application models `<requirements>` with `mp` as a Mana Cost effect in `legacy/js/spell.js`. It presents the base amount, subtracts the declared Savvy coefficient, and shows `mincost` as a lower bound through the shared stat renderer in `legacy/js/dredmor-stat.js`.

## Canonical read-only measurements

Across all source candidates, the canonical build contains 118 `<requirements>` declarations. Of those, 105 declare `mp`; the remaining 13 are non-mana requirement shapes. Source precedence leaves 104 active spells with a mana declaration, and every active spell has at most one.

The active normalized dataset contains:

- 104 valid base costs, ranging from 1 through 60;
- 98 Savvy-reduction coefficients, ranging from 0.09 through 0.7;
- 77 minimum costs, ranging from 1 through 15;
- 6 mana declarations without a Savvy coefficient;
- 27 mana declarations without a minimum.

The sources use both `savvyBonus` and `savvybonus`; the adapter normalizes both spell-requirement spellings. Two mana declarations also carry a `level` attribute. That attribute remains diagnosed because the legacy mana-cost model does not establish its semantics. The 13 non-mana declarations likewise remain `unsupported_spell_requirement` diagnostics instead of being converted into invented requirements.

After this slice, the deterministic canonical import reports no errors, 2,595 warnings, and 71 informational duplicate decisions. The measured compatibility backlog falls from 2,679 to 2,576 constructs: 1,510 item diagnostics and 1,066 spell diagnostics. Nineteen dangling references remain separately reported.

## Artifact and presentation boundary

Each supported declaration produces an ordered `SpellManaCost` record with nullable `base`, `savvyReduction`, and `minimum` fields. Supplied invalid numbers emit `invalid_number` and become `null`; absent optional fields also remain `null`. The runtime artifact guard requires finite, non-negative values or `null` for every field.

The spell page renders the source expression and its three parameters. It explicitly states that final in-game rounding is not inferred. Spells without a supported mana declaration show an empty state, and any unsupported requirement remains visible through the entity diagnostics.

## Repeatable verification

Synthetic coverage includes a complete formula, missing optional values, lowercase coefficient spelling, multiple ordered declarations, invalid and negative values, an unknown attribute, nested unknown content, and a non-mana requirement. The canonical import was run twice and produced byte-identical output. Repository checks and desktop/mobile Playwright coverage exercise the rendered formula, unsupported state, diagnostics, keyboard navigation, responsive layout, and automated accessibility scan.
