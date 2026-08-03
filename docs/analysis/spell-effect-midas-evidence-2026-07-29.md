# Spell effect Midas evidence

Date: 2026-07-29

Canonical measurement baseline: Dungeons of Dredmor `1.1.5 public_beta`,
Steam build `22934623`, base game plus all three official expansions

## Scope

This slice preserves the remaining direct `midas` attribute on `damage`
effects. It is modeled as an exact, loss-aware source flag rather than a
calculated currency or transformation result.

The declaration does not establish conversion eligibility, affected target
types, currency value, target transformation, drops, persistence, interaction
with damage, or runtime success. Consumers must not infer those behaviors.

## Preserved legacy and schema evidence

The historical spell adapter recognizes these records as damage effects,
parses their ordinary damage stats, and never reads `midas`. The preserved
application therefore does not disclose this source flag or establish its
runtime semantics.

The installed spell validation schema declares `midas` as a `dredbool`
attribute. The modern adapter preserves that exact boolean source shape without
treating the validation type as documentation of engine formulas or effects.

## Normalized contract

Every normalized spell-effect controls record requires `midas`, a nullable
boolean:

- explicit `1`/`true` becomes `true`;
- explicit `0`/`false` becomes `false`;
- absence remains `null`; and
- a malformed supplied value becomes `null` with a source-located
  `invalid_boolean` diagnostic.

The field is recognized only on the measured `damage` effect type. A `midas`
attribute on another effect type remains an `unknown_attribute` diagnostic.
The spell page reports the exact yes/no source flag when present.

## Read-only canonical measurement

The active official dataset contains four direct declarations:

| Source | Effects            | Measured values           |
| ------ | ------------------ | ------------------------- |
| Base   | 4 `damage` effects | four explicit true values |

They occur on four separate active spells. No official expansion contributes
an active declaration.

Supporting this family removes all four former diagnostics. Deterministic
official generation now reports:

- 0 errors, 43 warnings, and 71 informational duplicate decisions;
- an 8,315,619-byte normalized artifact;
- a 1,407,994-byte search artifact with 2,767 documents; and
- byte-identical repeated output.

The remaining compatibility backlog is seven spell constructs: three unknown
attributes (`level` twice and `buffTag` once) and four unknown elements
(`dodgebuff`, `payback`, `senseWallsFlag`, and `zorkmidAbsorption` once each).
The 13 spell-requirement diagnostics and 23 dangling references remain
separately tracked.

These are aggregate read-only measurements. Official inputs and generated
official artifacts remain ignored and are not approved for publication.

## Verification

- Focused importer coverage checks explicit true/false, absence, malformed and
  extended damage effects, and the same field on an unsupported effect type.
- The independently authored synthetic artifact carries an explicit true flag.
- The strict checksummed-artifact regression rejects a non-boolean normalized
  flag.
- The spell browser flow verifies the visible Midas source flag.
- `pnpm.cmd generate:official:check` passes deterministic zero-error official
  generation with the measurements above.
- The installed workspace check components pass formatting, linting, all three
  type checks, all 179 unit/artifact tests, byte-identical synthetic
  generation, and the 43-page synthetic static export.
- The Playwright run reports all 36 desktop/mobile browser cases successful,
  including the spell disclosure, keyboard flows, responsive layouts, and
  representative axe scans. On this Windows session, the managed static-server
  child did not return control after the final successful case, so the command
  wrapper was terminated at its timeout; no Node process or listener remained.
- Deterministic zero-error canonical regeneration plus the official static
  build exports all 2,857 ignored local pages. The built Midas page contains
  the exact visible true flag and does not render the empty-controls fallback.
