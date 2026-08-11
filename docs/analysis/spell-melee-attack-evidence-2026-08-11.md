# Spell melee-attack source metadata evidence

Date: 2026-08-11

## Scope

The corrected root spell audit exposed `attack` as the next remaining family
that the preserved application directly presented. Its parser labeled a
nonzero declaration “Performs Melee Attack.” This slice preserves the measured
binary source flag without converting it into an ordinary spell effect or
inventing combat behavior.

## Contract

- Each normalized spell requires nullable `sourcePerformsMeleeAttack`
  metadata.
- A supplied `attack` value uses the exact source-binary grammar: `1` becomes
  true, `0` becomes false, absence remains `null`, and another supplied token
  becomes `null` with a source-located `invalid_boolean` diagnostic.
- The spell page presents a supplied value with the preserved-app melee-attack
  label. It does not infer attacker, target, weapon, damage, hit resolution,
  timing, eligibility, or runtime success.
- The value remains root source metadata and does not enter direct-effect
  arrays, effect chains, or reciprocal spell relationships.
- The web artifact boundary independently requires the nullable boolean shape
  before any static spell route is generated.

## Canonical read-only measurement

The ignored `1.1.5 public_beta` base-plus-three-expansion import contains 40
source-candidate `attack` declarations. All use the exact source value `1`.
After source precedence, 39 active spells retain the effective true flag; no
active false or invalid value exists.

This removes all 40 `attack` compatibility warnings. The remaining root audit
contains 919 warnings across 19 case-insensitive attribute families (20 exact
source spellings). Together with the four reviewed unresolved relationships,
deterministic official generation reports 0 errors, 923 warnings, and 90
informational records. It produces 2,829 search documents, a 9,132,261-byte
normalized artifact, and an unchanged 1,180,204-byte compact search artifact.

These are aggregate local measurements only. No official XML, names, source
paths, generated artifact, or asset is committed or approved for publication.

## Verification

- Focused importer coverage proves explicit true and false values, valid
  absence, and an invalid source token with a diagnostic.
- The web artifact regression rejects a non-boolean generated value.
- The synthetic keyboard-first spell flow presents the true source flag and
  non-inference boundary, then proves a spell without the declaration omits the
  section.
- Repeated synthetic and official generation remains byte-identical.
- `pnpm check` passes all 255 unit/artifact tests and the 44-page synthetic
  static export.
- All 38 desktop/mobile Playwright cases pass, including the spell flow and
  representative axe scan. The search-flow reset now waits for its shareable
  URL transition before applying a following filter, removing a pre-existing
  mobile timing race without changing search behavior.
- The complete official static export generates all 2,981 local pages.
