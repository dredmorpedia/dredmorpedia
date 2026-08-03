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
4. **Diagnostic integrity is verified lazily (medium).** `loadArtifact()`
   verifies `artifact.json`, while diagnostic counts, IDs, and the checksum of
   `diagnostics.json` are checked only if a route calls `loadDiagnostics()`.
   Artifact-set initialization should validate every manifest-declared output
   once so ordinary page generation cannot accept a corrupt diagnostic member.
5. **Scalar validation accepts non-canonical numeric lexemes (low).** The
   shared integer and number helpers use `Number(value)`, so whitespace,
   exponent notation, and other JavaScript numeric forms can pass even though
   review evidence describes complete game-number tokens. Define the accepted
   source grammar explicitly and add adversarial fixture coverage before
   tightening it, so genuine measured decimal forms remain supported.
6. **The provenance card compresses a multi-step override chain into its first
   predecessor and final source (low).** The artifact retains the full ordered
   `appliedOverrides` history, but the UI reads only the first entry and points
   directly to the active source. Render the actual ordered chain, including
   per-step changed fields, when the next provenance UI slice is taken.

ADR 0004 route-registry inheritance/enforcement remains a separate accepted
architecture commitment from the earlier review. It should be completed before
a second verified dataset or any durable publication, but it does not block the
current single-version local MVP.

## Browser-lifecycle regression evidence

- `pnpm.cmd check` passes formatting, lint, type checking, all 186
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
