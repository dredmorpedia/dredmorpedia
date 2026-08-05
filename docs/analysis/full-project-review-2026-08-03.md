# Full project review

Date: 2026-08-03

## Scope

This review covered the modern workspace as a whole rather than only the most
recent parity slices. It inspected package boundaries, generated-artifact
publication and consumption, source-version provenance, input validation,
override presentation, CI, and the complete desktop/mobile browser suite. The
preserved application and the existing parity evidence remain the behavioral
reference; this review does not approve official content for publication.

## Validation baseline

Before fixes, the format, lint, type, unit/artifact, deterministic synthetic and
official generation, static export, and dependency-audit gates passed. The
canonical read-only build still produced 763 items, 2,767 search documents, no
errors, and all 2,857 local static pages. All 36 Playwright cases printed as
successful, but the Playwright process did not print its summary or terminate.

## Ordered findings

1. **Resolved 2026-08-03 — browser test teardown could wait forever (high).**
   Playwright's Windows web-server cleanup uses `taskkill` and then waits for
   the launched wrapper process to close. In a restricted process environment,
   `taskkill` returned `Access denied`, so `pnpm test:e2e` remained alive after
   every test had passed. The test-only static server now accepts an explicit
   loopback shutdown request from Playwright global teardown, closes idle
   connections, bounds active-connection cleanup, and exits normally before
   Playwright attempts process-tree cleanup. The full command now prints
   `36 passed` and returns successfully.
2. **Resolved 2026-08-03 — official local provenance used the schema-1
   migration labels (medium).** An idempotent project command now migrates only
   the ignored canonical four-source manifest to schema 2, preserves its local
   roots and database declarations, and records the exact reviewed game/build
   version. It refuses unexpected datasets/source sets and conflicting existing
   schema-2 metadata. Deterministic official generation now carries no
   `unversioned` dataset or source labels. Evidence is in
   `official-manifest-v2-evidence-2026-08-03.md`.
3. **Resolved 2026-08-03 — parsed input bytes and recorded input hashes were
   not one snapshot (medium).** One snapshot registry now captures the source
   manifest, database XML, patch files, and route registry from the exact raw
   bytes decoded for parsing. Referenced assets are checksummed on first
   registration, and output-manifest assembly no longer rereads any input. A
   mutation regression changes a test source between parsing and checksum
   listing and proves the recorded digest and repeated parse input remain tied
   to the original bytes. Conflicting sources for one sanitized display path
   fail explicitly. Evidence is in
   `input-byte-snapshot-evidence-2026-08-03.md`.
4. **Resolved 2026-08-04 — diagnostic integrity was verified lazily
   (medium).** All public loaders now initialize one atomic artifact set. Before
   even `loadArtifact()` returns, the web verifies every manifest-declared
   output checksum and runtime schema, then enforces dataset identity, exact
   search derivation, diagnostic counts and IDs, and entity diagnostic
   references. The cache is assigned only after the complete set passes.
   Regressions prove a main-artifact-only caller rejects tampered diagnostics,
   checksummed diagnostic inconsistencies, and a stale checksummed search
   index. Evidence is in
   `eager-artifact-set-verification-evidence-2026-08-04.md`.
5. **Resolved 2026-08-05 — scalar validation accepted non-canonical numeric
   lexemes (low).** Shared parsers now require explicit ASCII integer or
   finite-number tokens before conversion. The contract retains measured
   negative/leading-zero integers, conventional decimals, fractional trailing
   zeros, and leading-dot decimals while rejecting exponent/radix notation,
   explicit plus signs, trailing dots, separators, Unicode digits, direct
   whitespace, unsafe integers, and non-finite conversions. Unit tests cover
   adversarial forms, and an import fixture proves the grammar reaches real
   integer and decimal fields with source-located diagnostics. Evidence is in
   `numeric-source-lexeme-evidence-2026-08-05.md`.
6. **Resolved 2026-08-05 — the provenance card compressed a multi-step
   override chain into its first predecessor and final source (low).** The card
   now renders every ordered `appliedOverrides` step with its previous and
   replacement source labels, exact source IDs and locations, and normalized
   changed fields. A three-source synthetic collision proves two-step ordering,
   responsive presentation, accessibility, and separation from the later
   reviewed patch. Evidence is in
   `provenance-override-history-evidence-2026-08-05.md`.

ADR 0004 route-registry inheritance/enforcement remains a separate accepted
architecture commitment from the earlier review. It should be completed before
a second verified dataset or any durable publication, but it does not block the
current single-version local MVP.

## Browser-lifecycle regression evidence

- `pnpm.cmd check` passes formatting, lint, type checking, all 193
  unit/artifact tests, byte-identical synthetic generation, and the 43-page
  synthetic static export.
- A one-project diagnostic run passed 18 desktop cases and returned with its
  final summary in 17.8 seconds.
- The canonical root command regenerated the synthetic artifact, built all 43
  static pages, passed all 36 desktop/mobile interaction and axe cases, printed
  its final summary, and returned in 22.7 seconds.
- The shutdown endpoint exists only in the loopback-bound test static server;
  it is not part of the application or exported production pages.

## Input-byte snapshot regression evidence

- The data-pipeline suite passes all 65 tests, including source mutation,
  first-registration asset hashing, and display-path collision regressions.
- Synthetic generation remains byte-identical across two imports.
- The ignored canonical official import remains byte-identical across two
  imports: 763 items, 2,767 search documents, 0 errors, 43 warnings, and 71
  informational duplicate decisions.
- No source or generated schema changed; existing unchanged inputs retain the
  same checksums and generated bytes.

## Eager artifact-set verification evidence

- The web suite passes all 54 tests, including three main-artifact-only
  corruption regressions for diagnostic checksum, diagnostic cross-file, and
  search-derivation failures.
- The full repository gate passes all 189 unit/artifact tests and the 43-page
  synthetic static export.
- The ignored canonical official import remains byte-identical with 0 errors,
  and the eager loader completes the full 2,857-page local static export.
- No generated schema or route behavior changed; the change closes acceptance
  of partial or mixed output sets.

## Numeric source-lexeme evidence

- A broad canonical lexical census found 20,710 integer, 388 conventional
  decimal, and 69 leading-dot decimal occurrences, with no exponent,
  radix-prefix, explicit-plus, or trailing-dot forms.
- The data-pipeline suite passes all 69 tests, including direct adversarial
  grammar coverage and a temporary XML import fixture exercising integer and
  decimal normalization.
- The full repository gate passes all 193 unit/artifact tests and the 43-page
  synthetic static export.
- The ignored canonical official import remains byte-identical with 0 errors,
  proving the tightened grammar changes no normalized official value.

## Complete override-history evidence

- The data-pipeline suite passes all 69 tests, including exact two-step source
  order and per-step changed-field coverage.
- The full repository gate passes all 193 unit/artifact tests and the 43-page
  synthetic static export.
- Desktop/mobile browser checks exercise both override steps, the following
  reviewed patch, and the representative axe scan; a 375-pixel manual viewport
  has no horizontal overflow.
- The ignored canonical official import remains byte-identical with 0 errors,
  and all 2,857 local static pages export successfully.
