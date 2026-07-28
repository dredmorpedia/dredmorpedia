# Asset-reference artifact-boundary evidence

Date: 2026-07-29

## Scope

This checkpoint closes the repository review's remaining low-severity presentation/reference path-schema gap. It aligns the pipeline's cross-platform path rejection with the web consumer's checksummed artifact validation; valid generated data and rendered behavior are unchanged.

## Contract

The pipeline now rejects POSIX absolute paths, Windows absolute paths, Windows drive-relative paths, and `..` traversal independently of the host operating system. Presentation references continue to normalize backslashes to forward slashes before validation, and invalid values become unavailable with a source-located `unsafe_asset_path` error.

The web artifact schema applies one nullable safe-relative-path contract to:

- item icons, weapon thrown references, trap origins, and toolkit state/background/control references;
- skill and ability icons;
- spell icons, buff icons, animation/impact sprite prefixes, and buff halos;
- monster icons plus directional, death, cast, beam, morph, and dig sprite references.

The consumer requires slash-normalized, non-absolute, non-drive-relative, non-traversing values. Symbolic sound cue IDs remain ordinary strings because they are not filesystem paths. Detailed presentation references remain hidden from rendered pages while publication rights are unresolved.

## Canonical measurement

The ignored canonical artifact contains 3,708 non-null values covered by this contract:

- 846 item presentation references;
- 404 skill and ability icons;
- 1,756 spell icons, frame prefixes, buff icons, and halo references;
- 702 monster icons and animation references.

All 3,708 satisfy the consumer schema. The measurement prints only aggregate field counts and does not publish proprietary reference values.

## Regression coverage

- The existing spell animation/impact importer regression now supplies the host-independent drive-relative value `C:outside`; it becomes `null` and emits `unsafe_asset_path`.
- A checksummed-tampered item icon containing `../` is rejected by the web schema.
- A checksummed-tampered nested monster attack reference using a Windows drive-relative value is rejected at its exact artifact location.

## Validation

- `pnpm.cmd --filter @dredmorpedia/data-pipeline exec vitest run test/import.test.ts -t "normalizes spell animation and impact metadata"`
- `pnpm.cmd --filter @dredmorpedia/web exec vitest run test/artifact.test.ts`
- `pnpm.cmd check`
- `pnpm.cmd build:official`

All checks pass. The focused artifact suite has 29 tests; the full workspace has 141 unit/artifact tests and exports the 43-page synthetic site. The ignored canonical dataset remains byte-identical with 763 items, 2,767 search documents, 0 errors, 275 warnings, and 71 informational decisions, and all 2,857 local static pages export successfully.

No browser suite is required because this checkpoint changes rejected input shapes at generation/build time, not valid UI, routes, or interactions.
