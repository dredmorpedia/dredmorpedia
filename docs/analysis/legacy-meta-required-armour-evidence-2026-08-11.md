# Legacy Meta required-armour evidence

Date: 2026-08-11
Status: evidence prepared; focused product decision pending

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

## Product choices for focused Q&A

1. Preserve the calculation as a clearly named **Legacy armour estimate**, show
   the formula and evidence warning, and avoid presenting it as engine truth.
2. Exclude it intentionally from parity because the calculation is not
   independently verified.
3. Defer the decision while pursuing version-specific runtime or authoritative
   evidence.

Do not implement any option until the owner has considered this individual
mechanic. The decision does not reopen the completed first-parity milestone.
