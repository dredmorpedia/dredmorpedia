# Spell cooldown source metadata evidence

Date: 2026-08-11

## Scope

The corrected root spell audit exposed `downtime` as the largest remaining
attribute family that the preserved application directly presented. This slice
preserves that value without interpreting the rest of the root spell backlog or
inventing an engine formula.

## Contract

- Each normalized spell requires nullable `sourceCooldownTurns` metadata.
- A supplied `downtime` value must use the canonical source-integer grammar and
  be non-negative. Invalid or negative values become `null` and emit a
  source-located `invalid_number` diagnostic; absence remains valid `null`.
- The spell page presents a supplied value as exact source turns. It does not
  infer when cooldown begins, cooldown modifiers, actor eligibility, timing
  interactions, or runtime success.
- The web artifact boundary independently requires the nullable non-negative
  shape before any static spell route is generated.

## Canonical read-only measurement

The ignored `1.1.5 public_beta` base-plus-three-expansion import contains 133
source-candidate `downtime` declarations. After source precedence, 131 active
spells retain effective cooldown metadata. Every active normalized value is
valid and positive, ranging from 1 through 384 source turns.

This removes all 133 `downtime` compatibility warnings. The remaining root
audit contains 959 warnings across 20 case-insensitive attribute families (21
exact source spellings). Together with the four reviewed unresolved
relationships, deterministic official generation reports 0 errors, 963
warnings, and 90 informational records. It produces 2,829 search documents, a
9,093,432-byte normalized artifact, and an unchanged 1,180,204-byte compact
search artifact.

These are aggregate local measurements only. No official XML, names, source
paths, generated artifact, or asset is committed or approved for publication.

## Verification

- Focused importer coverage proves positive and zero values are preserved,
  absence stays `null`, and a negative source value becomes unavailable with a
  diagnostic.
- The web artifact regression rejects negative cooldown metadata.
- The synthetic keyboard-first spell flow presents the exact cooldown and the
  non-inference boundary.
- Repeated synthetic and official generation remains byte-identical.
- `pnpm check` passes all 254 unit/artifact tests and the 44-page synthetic
  static export.
- All 38 desktop/mobile Playwright cases pass, including the spell flow and
  representative axe scan.
- The complete official static export generates all 2,981 local pages.
