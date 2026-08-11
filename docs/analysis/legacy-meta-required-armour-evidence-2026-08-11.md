# Legacy Meta required-armour evidence

Date: 2026-08-11
Status: owner-approved compatibility behavior; implemented

## Preserved behavior

The preserved application has one Meta entry: **Required Armour by Monster**.
It displays the ten monsters with the highest calculated amount and describes
that amount as the armour required to nullify a non-critical mundane melee hit.

For each active monster, `legacy/js/meta.js` computes:

```text
base = floor((2 × fighterLevel + rogueLevel + wizardLevel - 5) / 3)
legacyEstimate = base + crushingDamage + slashingDamage + blastingDamage
```

The three damage terms come from the monster's legacy `totalStats` collection.
The results are sorted descending and truncated to ten. The implementation does
not clamp negative values, show its formula, expose uncertainty, or provide a
full sortable monster table.

## Evidence boundary

- The formula exists in preserved application code, not in the official XML.
- The current project independently verifies the six monster primary-attribute
  formulas, but deliberately withholds melee damage, Armour Absorption, and
  other secondary combat totals because historical sources conflict.
- The legacy label therefore states more certainty than the available evidence
  supports. Its code proves preserved behavior, not engine correctness.
- The calculation does not establish critical-hit behavior, attack-specific
  effects, weapon or skill contributions, resistance interaction, runtime
  rounding, caps, minimum damage, or whether the three fixed damage modifiers
  fully describe every mundane melee hit.
- Reusing the result as an ordinary game fact would conflict with the project's
  “correct before clever” and provenance principles.

The relevant existing formula review is
`docs/analysis/monster-derived-stat-evidence-2026-07-22.md`. No official data,
generated derivatives, private path, or inherited icon was added for this
analysis.

## Owner decision

Preserve the calculation under the exact user-facing legacy name **Required
Armour by Monster**. Do not add “Legacy” to the UI label. Keep the evidence
limitations and possible future formula-verification improvement in project
documentation rather than blocking parity implementation.

This decision does not establish the formula as engine truth and does not reopen
the completed first-parity milestone.

## Implementation

- `packages/domain/src/monster-derived-stats.ts` owns the pure compatibility
  calculation and deterministic ranking. It uses effective inherited monster
  modifiers, sorts by required amount descending, resolves ties by fixed
  UTF-16 monster name and ID order, and returns at most ten results.
- `/meta/required-armour-by-monster/` presents the exact approved title, result
  count, ranking, calculation breakdown, and canonical monster links. It does
  not label the feature as legacy.
- Primary navigation and the server-rendered Browse directory expose the route;
  Browse discovery remains usable with JavaScript disabled.
- The historical no-clamp floor behavior remains exact. Acidic, aethereal, and
  other damage types plus resistance/primary/secondary modifiers do not enter
  the calculation.
- The fourth primary-navigation link exposed a narrow-screen header overflow.
  The responsive header now stacks navigation beneath the brand and gives the
  four keyboard targets the available width without horizontal scrolling.

## Validation

- `pnpm check` passes formatting, lint, type checking, 76 domain tests, 101
  pipeline tests, 89 web tests, deterministic generation, and the 45-page
  synthetic static export.
- `pnpm test:e2e` passes all 40 desktop/mobile cases, including keyboard Meta
  navigation, exact synthetic ranking values, monster links, no-JavaScript
  discovery, responsive overflow, and the representative axe sweep.
- `pnpm build:official` produces byte-identical ignored artifacts with 0 errors,
  the expected four relationship warnings, 90 informational records, 763 item
  icon mappings with no fallbacks, and all 2,982 local static pages.

## Possible future improvement

Seek version-specific runtime or authoritative evidence for the monster melee
damage and Armour Absorption rules. If that evidence establishes a different
formula, document a separate product decision and migration rather than silently
changing this compatibility view.
