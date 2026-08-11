# Spell radius source metadata evidence

Date: 2026-08-11
Canonical source: Dungeons of Dredmor `1.1.5 public_beta`, Steam build
`22934623`, base game plus all three official expansions
Status: implemented and verified locally; generated official content remains
ignored and non-public

## Purpose

Close the next root-spell compatibility family without converting a sparse
source attribute into an unverified targeting or geometry rule. The preserved
application does not parse or present the root `radius` attribute. The modern
contract therefore retains the exact source integer and keeps its meaning
deliberately narrow.

## Read-only measurement

The measurement inspected 958 uncommented root `<spell>` declarations from the
ordered canonical sources. It did not record installation paths or copy source
XML.

- `radius` occurs on four active declarations.
- The exact values are 0, 2, 3, and 12.
- The declarations belong to four different root spell types: `target`,
  `fireball`, `cone`, and `area`.
- Every measured value satisfies the established non-negative source-integer
  grammar.

The small, heterogeneous source shape does not establish distance units, area
geometry, an origin, target selection, obstruction behavior, or runtime
success.

## Implemented contract

- Every spell has a required nullable `sourceRadius` field.
- A supplied value must be an exact non-negative source integer. Absence
  remains `null`; a malformed or negative supplied token becomes `null` with a
  source-located `invalid_number` diagnostic.
- The web validates the generated field and exposes a supplied value in an
  accessible Radius metadata card.
- Consumers must not infer distance units, area shape, origin, target
  selection, obstruction handling, or runtime success from this declaration.

## Validation

- Focused pipeline coverage exercises valid zero, valid absence, a negative
  source value, and the positive synthetic declaration.
- Web artifact coverage rejects a negative generated value.
- Desktop/mobile browser coverage verifies the accessible Radius metadata
  region on Clockwork Spark and its absence on Clockwork Echo.
- Deterministic official generation is byte-identical with 763 items and 2,829
  search documents. It reports 0 errors, 8 warnings, and 90 informational
  records. The normalized artifact is 9,238,146 bytes; compact `search.json`
  remains 1,180,204 bytes.
- The slice removes all four `radius` compatibility warnings. The remaining
  root spell audit contains four warnings: three `self` and one `noanimation`
  declaration. The other four canonical warnings are the deliberately retained
  dangling relationships.
- `pnpm check` passes all 261 unit/artifact tests and the 44-page synthetic
  export. All 38 desktop/mobile Playwright cases pass, and the complete
  official static export generates all 2,981 local pages.

No official XML, generated artifact, local path, or other proprietary content
is added to Git by this evidence record.
