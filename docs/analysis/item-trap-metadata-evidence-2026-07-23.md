# Item trap metadata evidence

Date: 2026-07-23
Status: implemented

## Verified behavior

The preserved application reads a trap declaration's `level` as item quality and links its `casts` value as a spell triggered when stepped on. It does not expose the declaration's activation, caster-targeting, or placement fields. The rebuild keeps the verified quality and spell relationship while preserving those additional fields as neutral, loss-aware source metadata rather than inventing timing, reset, targeting, or placement rules.

Items carry an ordered `traps` array. Each declaration retains an `always` or `once` activation value, nullable non-negative level, loss-aware caster-targeting flag, safe optional origin asset reference, and optional mount/facing source strings. Unknown activation values, malformed levels or booleans, unsafe asset paths, missing casts, unknown attributes, and nested content remain source-located diagnostics. Raw origin paths are retained only in ignored generated artifacts and summarized rather than rendered while the publication policy remains unresolved.

## Canonical read-only measurement

The canonical `1.1.5 public_beta` base-plus-three-expansion dataset contains:

- 54 active trap items with exactly one trap declaration each;
- 45 `once` and 9 `always` activation declarations;
- valid levels from 1 through 16;
- 2 enabled `targetIsCaster` declarations, with the field absent on the other 52;
- 9 placement declarations using 3 unique origin references, all safely resolved, and the same supplied wall/south mount and facing values; and
- 54 stepped-on spell triggers, all resolved.

These are aggregate measurements from ignored local generated output, not permission to publish official records or assets.

## Diagnostics and artifact boundary

Fully supporting the verified trap leaf removes all 54 former `partially_supported_element` diagnostics. The measured compatibility backlog is now 2,888 constructs: 555 item and 2,333 spell diagnostics. Nineteen dangling references and 15 spell-requirement/extra-attribute diagnostics remain separately tracked.

The deterministic canonical import completes with 0 errors, 2,922 warnings, and 71 informational duplicate decisions. Its normalized artifact is 5,462,796 bytes; the unchanged search artifact is 1,344,780 bytes. The web runtime guard requires the new array and rejects invalid activation, level, boolean, or record shapes, so earlier local schema-3 artifacts must be regenerated rather than guessed compatible.

## Regression coverage

The synthetic trap covers level/quality agreement, once activation, caster targeting, a safe placement reference, mount/facing values, and an intentionally unresolved stepped-on spell. Focused importer tests also cover always activation, absent optional fields, malformed activation/level/boolean values, an unsafe origin path, a missing cast, and unknown attributes/nested content. Item pages expose the source values, withhold the raw asset path, state the behavior boundary, and retain the unresolved-spell state. Artifact-boundary, desktop/mobile interaction, responsive-overflow, keyboard, static-build, determinism, and axe checks remain part of the repository suite.
