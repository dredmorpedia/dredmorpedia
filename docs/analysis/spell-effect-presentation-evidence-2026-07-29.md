# Direct spell effect presentation evidence

Date: 2026-07-29

Canonical measurement baseline: Dungeons of Dredmor `1.1.5 public_beta`,
Steam build `22934623`, base game plus all three official expansions

## Scope

This slice preserves the direct `sprite`, `frames`, `framerate`,
`centerEffect`, and `sfx` attributes on normalized spell effects as one
nullable `presentation` record. These fields describe source presentation
inputs attached to effect resolution; they do not define timing units,
animation order, target placement, synchronization, sound playback, or other
engine behavior.

The separate spell-level `<anim>` and `<impact>` declarations and buff-local
`<halo>` declarations retain their existing contracts. Direct effect
`objectSprite` and `regengfx` attributes describe different source shapes and
remain explicit compatibility diagnostics.

## Preserved legacy and schema evidence

The historical spell adapter labels the measured `confuse`, `heal`,
`targetblink`, `drain`, and `damage` effects through their type-specific
parsers. Every one of those parsers delegates common fields to
`GenericEffect`, which reads chance, caster/self targeting, burn, resistance,
and taxonomy. It does not read any of the five presentation attributes, so the
preserved application does not disclose them.

The installed spell validation schema declares all five attributes directly on
`<effect>`. It types `frames` as a string, `framerate` as a byte,
`centerEffect` as a Dredmor boolean, and the sprite and sound references as
strings. The active official data uses non-negative integer frame values and
the standard `0`/`1` boolean form. The modern contract applies the stricter
measured shape while retaining malformed input loss-aware.

## Normalized and presentation contract

Every normalized effect has a required nullable `presentation` field:

- no presentation attribute produces `null`;
- any supplied presentation attribute produces a record with nullable
  `spritePath`, `frameCount`, `frameRate`, `centered`, and `soundEffect`
  fields;
- sprite references must be safe relative paths, but frame-family prefixes do
  not receive a fabricated concrete-file existence check;
- frame counts and rates must be non-negative integers;
- `centerEffect` preserves explicit true and false;
- an empty supplied sound cue becomes `null` with a source-located diagnostic;
  and
- invalid paths, numbers, booleans, and unrelated attributes remain
  diagnosed.

The strict web artifact schema rejects missing, unsafe, malformed, or extended
records before static generation. The spell page discloses reference
availability and direct numeric/boolean values, but never renders raw sprite
paths or sound cue IDs.

## Read-only canonical measurement

The active official dataset contains 33 presentation attributes across 15
effects and 13 spells. Every declaration comes from the base game:

| Field          | Declarations | Measured values                                       |
| -------------- | -----------: | ----------------------------------------------------- |
| `sprite`       |            6 | six safe references to one frame-family prefix        |
| `frames`       |            6 | six values of `5`                                     |
| `framerate`    |            6 | five values of `100`; one value of `70`               |
| `centerEffect` |            5 | five explicit true values                             |
| `sfx`          |           10 | ten non-blank declarations across six symbolic tokens |
| **Total**      |       **33** | **15 effects across 13 spells**                       |

The 15 effects comprise five `confuse`, five `drain`, three `damage`, one
`heal`, and one `targetblink` declaration. The five `confuse` effects carry the
complete sprite/frame/rate/centered group, the `heal` effect carries
sprite/frame/rate/sound data, and the remaining measured effects carry only a
sound cue.

Supporting the coherent field set removes all 33 former presentation
diagnostics. Deterministic official generation now reports:

- 0 errors, 140 warnings, and 71 informational duplicate decisions;
- a 7,500,693-byte normalized artifact;
- a 1,407,994-byte search artifact with 2,767 documents; and
- byte-identical repeated output.

The remaining compatibility backlog is 104 spell constructs: 70 unknown
attributes and 34 unknown elements. The 13 spell-requirement diagnostics and
23 dangling references remain separately tracked.

These are aggregate read-only measurements. The official inputs and generated
official artifacts remain ignored and are not approved for publication.

## Verification

- Focused importer coverage checks a complete declaration, sound-only
  metadata, explicit zero/false values, absence, unsafe paths, malformed
  numbers/booleans, an empty cue, and unknown extensions.
- The synthetic artifact carries the complete presentation record on a direct
  effect.
- The web artifact test rejects a non-boolean normalized presentation value.
- The spell browser flow checks all five visible presentation facts while raw
  references remain hidden.
- `pnpm.cmd generate:official:check` passes deterministic zero-error official
  generation with the measurements above.
- `pnpm.cmd check` passes formatting, linting, type checking, all 155
  unit/artifact tests, byte-identical synthetic generation, and the 43-page
  synthetic static export.
- `pnpm.cmd test:e2e` passes all 36 desktop/mobile browser cases, including the
  direct effect presentation, responsive layouts, keyboard flows, and
  representative axe scans.
- `pnpm.cmd build:official` repeats deterministic zero-error generation and
  exports all 2,857 local static pages.
