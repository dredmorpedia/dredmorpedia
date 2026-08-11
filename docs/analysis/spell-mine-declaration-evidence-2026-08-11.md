# Spell mine-declaration evidence

Date: 2026-08-11
Canonical source: Dungeons of Dredmor `1.1.5 public_beta`, Steam build
`22934623`, base game plus all three official expansions
Status: implemented and verified locally; generated official content remains
ignored and non-public

## Purpose

Close the next coherent root-spell compatibility family without inventing game
engine behavior. The preserved application recognized `spell[mine="1"]` and
presented a mine label, radius, timer, and a brittle approximation. That code is
useful parity evidence, but its truthiness check treated any supplied
`minePermanent` string as permanent and therefore is not authoritative for the
modern data contract.

## Read-only measurement

The source-candidate measurement inspected 958 uncommented root `<spell>`
declarations from the ordered canonical sources. It did not record installation
paths or copy source XML.

| Exact root attribute      | Source candidates | Measured values or shape                |
| ------------------------- | ----------------: | --------------------------------------- |
| `mine`                    |                71 | all `1`                                 |
| `mineradius`              |                71 | integers 1 through 6                    |
| `mineTimer`               |                68 | nonnegative integers 3 through 96       |
| `minePermanent`           |                55 | `0` (11), `1` (43), `2` (1)             |
| `mineSpriteDrawOrder`     |                60 | `0` or `1`                              |
| `mineSpritePNGSeries`     |                67 | safe relative sprite-series prefixes    |
| `minespritePNGSeries`     |                 2 | measured casing alias of the same field |
| `mineSpritePNGFirst`      |                69 | all `0`                                 |
| `mineSpritePNGNum`        |                69 | nonnegative frame counts                |
| `mineSpritePNGRate`       |                69 | nonnegative source rates                |
| `mineUseGlints`           |                46 | `0` or `1`                              |
| `mineGlintDensity`        |                45 | nonnegative integers                    |
| `minesMustBeUnobstructed` |                 7 | all `0`                                 |
| `minesprite`              |                 2 | safe relative static-sprite references  |

Ordered source precedence leaves 70 active mine declarations: every effective
`sourceEnabled` value is true, all 70 preserve a radius, 67 preserve a timer,
54 preserve a permanence value, 68 preserve an animated-series reference, and
two preserve a static-sprite reference. The single source-candidate declaration
not present in the effective count is superseded by a later source.

The effective `minePermanent` values are `0` on 11 spells, `1` on 42 spells,
and `2` on one spell. Because the canonical data is not binary, the modern
contract preserves a nullable nonnegative integer instead of fabricating a
boolean interpretation.

## Implemented contract

- Each spell has a required nullable `mine` declaration. `null` means no known
  root mine attribute was supplied.
- The declaration preserves loss-aware enabled, radius, timer, permanence,
  sprite draw-order, glint, and unobstructed-placement source fields.
- `mine`, `mineUseGlints`, and `minesMustBeUnobstructed` use the strict measured
  `0`/`1` binary grammar. Numeric parameters use the canonical strict integer
  grammar and must be nonnegative. Invalid supplied values become `null` with a
  source-located diagnostic.
- Both measured sprite-series casing forms normalize to one field. Supplying
  both produces a conflict diagnostic and deterministically prefers
  `mineSpritePNGSeries`.
- Static and animated sprite references pass the same host-independent safe
  relative-path boundary as other hidden spell presentation metadata. The web
  validates the complete nested shape again before rendering.
- Spell pages expose the source parameters and presentation availability but
  do not expose the source paths. Consumers must not infer placement, radius
  geometry, obstruction evaluation, lifetime, trigger timing, persistence,
  frame-rate units, draw behavior, glint behavior, or runtime success.

## Validation

- Focused pipeline coverage exercises complete valid metadata, both casing
  forms, conflicting aliases, malformed flags/numbers, and traversal rejection.
- Web artifact coverage accepts the complete synthetic record and rejects a
  negative radius or unsafe nested presentation reference.
- Desktop/mobile browser coverage verifies the accessible Mine region on the
  synthetic Clockwork Spark page and verifies absence on a spell without the
  declaration.
- `pnpm check` passes formatting, lint, type checking, all 257 unit/artifact
  tests, byte-identical synthetic generation, and the 44-page static export.
- `pnpm test:e2e` passes all 38 desktop/mobile interaction, keyboard, and
  representative axe cases.
- `pnpm generate:official:check` is byte-identical with 763 items and 2,829
  search documents. It reports 0 errors, 222 warnings, and 90 informational
  records. The normalized artifact is 9,157,816 bytes; compact `search.json`
  remains 1,180,204 bytes.
- `pnpm build:official` repeats the deterministic zero-error gate and completes
  all 2,981 local static pages.
- The slice removes all 701 exact mine-family compatibility warnings. The
  remaining root spell audit contains 218 warnings across six case-insensitive
  families: `consumeItem`, `consumeItemType`, `noanimation`, `radius`, `self`,
  and `wand`.

No official XML, generated artifact, sprite, local path, or other proprietary
content is added to Git by this evidence record.
