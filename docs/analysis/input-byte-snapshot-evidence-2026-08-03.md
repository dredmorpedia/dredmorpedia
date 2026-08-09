# Input-byte snapshot integrity evidence

Date: 2026-08-03

## Scope

Generated input checksums now identify the exact source bytes used by an
import. This closes the interval in which a local source could change after
parsing but before the old end-of-import checksum read. The change affects the
import boundary only; normalized, search, diagnostic, and output-manifest
schemas are unchanged.

## Implemented contract

A per-import snapshot registry owns every sanitized input path and captures its
SHA-256 checksum at the first read:

- the source manifest, database XML, patch definitions, and optional route
  registry are read as raw buffers, checksummed, decoded as UTF-8, and cached
  for any repeated parsing;
- resolved referenced assets are checksummed when the normalizer first
  registers them and retain those exact bytes for approved incremental local
  presentation copying;
- output-manifest assembly lists the captured checksums and performs no source
  rereads;
- a later text read of a previously asset-only input decodes the captured bytes
  without rereading the source; and
- one sanitized display path cannot silently identify two absolute inputs in a
  single import.

This preserves the read-only installation boundary. The registry reads source
files but never writes to them, and generated metadata continues to contain
only sanitized display paths rather than machine-local roots.

## Regression coverage

The focused mutation regression reads a synthetic XML input, replaces the file
before checksum listing, then proves that repeated parser access and the
reported digest both retain the original byte snapshot. Separate cases prove
that referenced assets retain their first-registration digest and bytes and
that conflicting display-path ownership fails explicitly. The later item-icon
slice additionally changes a source icon after import and proves the copy still
uses the registered snapshot; see
[`item-icon-import-evidence-2026-08-09.md`](item-icon-import-evidence-2026-08-09.md).

Validation on the committed synthetic fixtures passes all 65 pipeline tests;
the full repository gate passes all 186 unit/artifact tests and the 43-page
synthetic static export. Repeated synthetic output is byte-identical. Read-only
verification against the ignored canonical `1.1.5 public_beta` dataset also
remains byte-identical:

- 763 items and 2,767 search documents;
- 0 errors, 43 warnings, and 71 informational duplicate decisions;
- 8,315,764 artifact bytes; and
- 1,407,994 search bytes.

These aggregate measurements do not add official inputs or generated output to
Git and do not approve official-derived content for publication.
