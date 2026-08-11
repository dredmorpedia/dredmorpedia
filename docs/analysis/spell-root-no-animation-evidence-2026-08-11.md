# Root spell no-animation source-flag evidence

Date: 2026-08-11
Canonical source: Dungeons of Dredmor `1.1.5 public_beta`, Steam build
`22934623`, base game plus all three official expansions
Status: implemented and verified locally; generated official content remains
ignored and non-public

## Purpose

Close the final measured root-spell compatibility family while keeping its
presentation flag separate from the existing direct-effect skip-animation
control and avoiding an unverified engine rule.

The preserved application has no `noanimation` selector, parser, or
presentation. Its generic effect parser also does not read the direct-effect
`skipanimation` field. The installed validation schema declares root
`noanimation` as a `dredbool`, so the modern contract preserves the declaration
through the established strict source-binary grammar without claiming what the
engine suppresses.

## Read-only measurement

The measurement inspected 958 active root `<spell>` declarations from the
ordered canonical sources. It did not record installation paths or copy source
XML.

- Exactly one active spell supplies `noanimation`.
- `Sample the Local Cuisine` is an item-type spell with `noanimation="1"`.
- The spell also declares a cooldown and consume/trigger effects, but those
  neighboring declarations do not define the no-animation flag's scope.
- The measured token satisfies the established strict source-binary grammar.

The declaration does not establish which presentation sequence is affected,
animation order, timing, synchronization, target selection, sound behavior, or
runtime success.

## Implemented contract

- Every spell has a required nullable `sourceNoAnimationFlag` field.
- A supplied value uses the strict source-binary grammar: `1` becomes true, `0`
  becomes false, absence remains `null`, and another supplied token becomes
  `null` with a source-located `invalid_boolean` diagnostic.
- Root metadata remains structurally separate from direct-effect
  `controls.skipAnimation`.
- The web validates the generated field and exposes a supplied value in an
  accessible Root animation metadata card with the interpretation boundary
  visible.
- Patch validation applies the complete nullable-boolean field invariant.

## Validation

- Focused pipeline coverage exercises explicit false, valid absence, and an
  invalid source token; the synthetic Clockwork Spark declaration supplies an
  explicit true value.
- Web artifact coverage rejects a non-boolean generated value.
- Desktop/mobile browser coverage verifies the accessible Root animation
  metadata region on Clockwork Spark and its absence on Clockwork Echo.
- Deterministic official generation is byte-identical with 763 items and 2,829
  search documents. It reports 0 errors, 4 relationship warnings, and 90
  informational records. The normalized artifact is 9,305,461 bytes; compact
  `search.json` remains 1,180,204 bytes.
- The slice removes the final root spell compatibility warning. The only
  remaining canonical warnings are the four deliberately retained dangling
  relationships.
- `pnpm check` passes all 263 unit/artifact tests and the 44-page synthetic
  export. All 38 desktop/mobile Playwright cases pass, including keyboard and
  representative axe coverage.
- `pnpm build:official` repeats the byte-identical zero-error generation and
  exports all 2,981 local pages. Static-output inspection confirms the card and
  true value on Sample the Local Cuisine and its absence on a representative
  spell without the declaration.

No official XML, generated artifact, local path, or other proprietary content
is added to Git by this evidence record.
