# Published route-registry lifecycle evidence

Date: 2026-08-09
Status: implemented and verified with independently authored fixtures

## Scope

This checkpoint implements ADR 0004's URL-continuity contract without adding a
dataset-version switcher or changing the local-only official-content boundary.
Ordinary unpublished imports may still omit a registry. The new
`--publication-routes` mode is an engineering release gate only; it does not
authorize publication of official data, routes, or assets.

## Contract

- Route-registry schema 1 remains readable for exact-version local
  compatibility.
- Schema 2 requires stable `sourceId` plus `originalId` targets, explicit
  `active` or `tombstone` state, and either a root lineage or a predecessor
  dataset version plus exact SHA-256 checksum.
- An inherited manifest supplies the previous snapshot through
  `previousRouteRegistry`. Both registry files remain repository-contained,
  are captured once, and participate in generated input checksums.
- Every predecessor target must remain in the current registry with the same
  canonical route and every historical alias. Removal changes the entry to a
  tombstone; reappearance by the same stable source identity changes it back to
  active.
- Tombstones reserve canonical and alias slugs before automatic allocation and
  cannot be fabricated without predecessor history.
- Publication mode additionally requires one active registry entry for every
  current entity. Missing, mismatched, stale, incomplete, active-tombstone, or
  conflicting state rejects the registry atomically and prevents output
  publication.

## Regression evidence

Synthetic filesystem-backed tests cover:

- insertion after a prior route is tombstoned;
- deletion without route reassignment;
- reappearance and route reclamation by stable source identity;
- missing current and predecessor registries;
- predecessor dataset/checksum mismatch;
- omitted inherited reservations and aliases;
- conflicting route owners;
- tombstones without inherited history;
- refusal to write a publication-gated output with route errors; and
- repository containment for the predecessor path.

The domain allocator separately proves that tombstoned slugs cannot become a
new canonical route or automatic source-ID alias. Invalid registry application
remains atomic, so a failed publication build cannot partially pin routes.

## Validation

- `pnpm.cmd check` passes formatting, lint, every type check, 242
  unit/artifact tests, byte-identical synthetic generation, and the 43-page
  synthetic static export.
- `pnpm.cmd generate:official:check` remains byte-identical with 763 items,
  2,767 search documents, 0 errors, 4 warnings, 90 information diagnostics,
  763 item-icon mappings, 722 copied PNGs, and no asset fallback.
- `pnpm.cmd build:official` completes the 2,857-page ignored local export.
- `pnpm.cmd test:e2e` passes all 36 desktop/mobile interaction, keyboard, and
  accessibility cases. One initial attempt stopped before tests because the
  preceding official Next.js build still held its own lock; after that owned
  process exited naturally, the clean rerun passed.

No official route registry, generated official data, local installation path,
or proprietary content is added to Git.
