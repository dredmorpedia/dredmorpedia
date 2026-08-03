# Official source-manifest schema-2 migration evidence

Date: 2026-08-03

## Scope

The canonical local official dataset now carries the exact reviewed game/build
identity in generated provenance instead of relying on schema 1's intentional
`unversioned` compatibility labels. The source manifest and generated official
artifact remain ignored and non-public. No game file, local source root, or
official-derived output is added to the repository.

## Migration contract

`pnpm migrate:official-manifest` upgrades only the ignored
`data/raw/local-official-manifest.json` configuration. It:

- requires the canonical dataset ID and exactly the four reviewed official
  source IDs;
- converts schema 1 to schema 2 while preserving every source label, kind,
  precedence, root, database-file declaration, and source order;
- records `1.1.5 public_beta (Steam build 22934623)` as both the dataset version
  and the installed-build version of each source;
- initializes the required patch list as empty and does not invent a route
  registry;
- writes through a same-directory temporary file and atomic rename; and
- is idempotent for an already matching schema-2 manifest, while refusing to
  overwrite different schema-2 version metadata.

The reusable migration function is strict-schema validated and independently
tested with synthetic input. It does not resolve or read a source root. The
ordinary official generation command remains responsible for containment,
input reading, diagnostics, and publication-gate validation.

## Local verification

The existing ignored manifest migrated from schema 1 to schema 2 with all four
source declarations preserved. A second migration invocation made no byte
change. Deterministic read-only generation then reported:

- 763 items and 2,767 search documents;
- 0 errors, 43 warnings, and 71 informational duplicate decisions;
- byte-identical repeated output; and
- dataset and source versions equal to the reviewed canonical build label,
  with no `unversioned` provenance remaining.

`pnpm check` also passes formatting, lint, type checking, all 182 unit/artifact
tests, byte-identical synthetic generation, and the 43-page synthetic export.
`pnpm build:official` repeats the zero-error deterministic import and exports
all 2,857 local pages; the A Mirror Darkly Shield HTML contains the reviewed dataset
and source version and no `unversioned` label.

These aggregate measurements and labels are local verification only. They do
not approve the generated dataset or official content for publication.

## Compatibility boundary

Schema-1 manifests remain readable as a migration aid and continue to produce
`unversioned` labels. New configurations should be authored directly as schema 2. The project-specific command exists for machines that still carry the old
four-source local manifest; it is not a general-purpose tool for labeling mods,
other game builds, or an unexpected source set.
