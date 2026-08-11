# Root spell self source-flag evidence

Date: 2026-08-11
Canonical source: Dungeons of Dredmor `1.1.5 public_beta`, Steam build
`22934623`, base game plus all three official expansions
Status: implemented and verified locally; generated official content remains
ignored and non-public

## Purpose

Close the next root-spell compatibility family without conflating a sparse
root attribute with the existing buff- and effect-local self fields or turning
it into an unverified targeting rule.

The preserved application reads `self` inside its generic effect parser. It
does not define a dedicated root-self parser or presentation. Its root spell
selectors that reuse generic effect parsing cover template and mine spells,
while the three measured root `self` declarations belong to missile, target,
and self spell types. The modern contract therefore preserves the root flag as
separate neutral source metadata.

## Read-only measurement

The measurement inspected 958 uncommented root `<spell>` declarations from the
ordered canonical sources. It did not record installation paths or copy source
XML.

- `self` occurs on three source candidates, all of which remain active.
- `Tentacular Infestation Bolt` is a missile spell with `self="0"`.
- `Infested With Tentacles` is a target spell with `self="0"`.
- `Invisible Geometries Drain` is a self spell with `self="1"`.
- Every measured token satisfies the established strict source-binary grammar.

The declarations do not establish an actor, target selection, casting origin,
effect scope, eligibility, timing, or runtime success.

## Implemented contract

- Every spell has a required nullable `sourceSelfFlag` field.
- A supplied value uses the strict source-binary grammar: `1` becomes true, `0`
  becomes false, absence remains `null`, and another supplied token becomes
  `null` with a source-located `invalid_boolean` diagnostic.
- Root metadata remains structurally separate from buff `affectsSelf` and
  direct-effect control fields.
- The web validates the generated field and exposes a supplied value in an
  accessible Root self metadata card with the interpretation boundary visible.
- Patch validation applies the complete nullable-boolean field invariant.

## Validation

- Focused pipeline coverage exercises explicit false, valid absence, and an
  invalid source token; the synthetic Clockwork Spark declaration supplies an
  explicit true value.
- Web artifact coverage rejects a non-boolean generated value.
- Desktop/mobile browser coverage verifies the accessible Root self metadata
  region on Clockwork Spark and its absence on Clockwork Echo.
- Deterministic official generation is byte-identical with 763 items and 2,829
  search documents. It reports 0 errors, 5 warnings, and 90 informational
  records. The normalized artifact is 9,268,424 bytes; compact `search.json`
  remains 1,180,204 bytes.
- The slice removes all three `self` compatibility warnings. The remaining
  root spell audit is the one `noanimation` declaration; the other four
  canonical warnings are the deliberately retained dangling relationships.
- `pnpm check` passes all 262 unit/artifact tests and the 44-page synthetic
  export. All 38 desktop/mobile Playwright cases pass, and the complete
  official static export generates all 2,981 local pages.

No official XML, generated artifact, local path, or other proprietary content
is added to Git by this evidence record.
