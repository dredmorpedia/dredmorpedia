# Spell wand source-flag evidence

Date: 2026-08-11
Canonical source: Dungeons of Dredmor `1.1.5 public_beta`, Steam build
`22934623`, base game plus all three official expansions
Status: implemented and verified locally; generated official content remains
ignored and non-public

## Purpose

Close the largest remaining root-spell compatibility family without naming or
implementing an unverified engine rule. The preserved application does not
parse or present the root `wand` attribute. The modern contract therefore
retains the exact source flag and keeps its meaning deliberately neutral.

## Read-only measurement

The source-candidate measurement inspected 958 uncommented root `<spell>`
declarations from the ordered canonical sources. It did not record installation
paths or copy source XML.

- `wand` occurs on 192 source candidates: 54 use `1` and 138 use `0`.
- After source precedence, 191 active spells retain the declaration: 54 true
  and 137 false.
- The declarations span 12 root spell types, so normalization does not
  condition the field on spell type.
- The 21 distinct spells already targeted by normalized wand-item triggers do
  not establish a consistent interpretation: nine have `wand="1"`, one has
  `wand="0"`, and eleven have no root `wand` declaration.

The last comparison is direct source evidence against treating this flag as a
wand-item compatibility, eligibility, or linkage rule.

## Implemented contract

- Every spell has a required nullable `sourceWandFlag` field.
- A supplied value uses the strict source-binary grammar: `1` becomes true, `0`
  becomes false, absence remains `null`, and another supplied token becomes
  `null` with a source-located diagnostic.
- The web validates the generated field and exposes a supplied value in an
  accessible Wand metadata card.
- Consumers must not infer whether or how a wand item may use the spell, item
  matching, charge use, targeting, eligibility, timing, or runtime success.

## Validation

- Focused pipeline coverage exercises explicit false, valid absence, and an
  invalid source token; the synthetic fixture supplies an explicit true value.
- Web artifact coverage rejects a non-boolean generated value.
- Desktop/mobile browser coverage verifies the accessible Wand metadata region
  on Clockwork Spark and its absence on Clockwork Echo.
- Deterministic official generation is byte-identical with 763 items and 2,829
  search documents. It reports 0 errors, 12 warnings, and 90 informational
  records. The normalized artifact is 9,209,836 bytes; compact `search.json`
  remains 1,180,204 bytes.
- The slice removes all 192 exact `wand` compatibility warnings. The remaining
  root spell audit contains eight warnings: four `radius`, three `self`, and
  one `noanimation` declaration.

No official XML, generated artifact, local path, or other proprietary content
is added to Git by this evidence record.
