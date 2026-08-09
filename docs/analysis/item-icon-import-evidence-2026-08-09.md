# Item-icon import evidence

Date: 2026-08-09

## Scope

This is the first approved incremental local-asset slice. It gives every item
detail page access to its normalized PNG icon without copying unrelated game
resources. Other entity icons, monster sprite treatment, animation frames,
sounds, and old interface art remain outside this slice.

Official input and generated output remain local-only and ignored. This work
does not change the publication or licensing decision.

## Boundary and output contract

- Source roots are the same trusted-manifest, read-only roots already validated
  by the dataset importer.
- Only the final normalized items' non-null icon references are selected.
- Copying uses the exact bytes and checksum captured when a contained asset was
  first registered during normalization. There is no end-of-import source
  reread.
- The initial browser-safe allowlist is PNG only and verifies the PNG signature.
  Missing, unsupported, and invalid files receive stable warning diagnostics
  and render a deliberate decorative fallback.
- Each unique file is named by its full SHA-256 digest. `assets.json` maps item
  IDs to those files; `diagnostics.json` records fallbacks; `manifest.json`
  carries their checksums and is published last.
- The writer rejects source overlap, repository-external output, and replacement
  of an unmanaged directory. It stages and verifies the new set before an
  owned-directory swap, preventing stale files from another selected dataset.
- The web checks the active dataset ID/version, every JSON checksum and schema,
  diagnostic counts, unique entity mappings, safe file names, and every copied
  file checksum before rendering a URL.

## Canonical measurement

The read-only `1.1.5 public_beta`, Steam build `22934623` import produced:

- 763 normalized items with 763 mapped item icons;
- 722 unique content-addressed PNG files;
- 336,014 copied binary bytes;
- a 212,437-byte JSON catalog; and
- zero asset fallback diagnostics.

No source root, local installation path, original icon path, image bytes, or
generated official file is recorded in this evidence.

The legal synthetic fixture deliberately retains its SVG icon references. The
PNG-only importer maps zero icons and produces 13 fallback diagnostics, so
ordinary CI verifies the non-broken item-page placeholder without adding or
converting a speculative format.

## Regression coverage

- Pipeline tests prove checksum deduplication, missing/unsupported/invalid
  diagnostics, first-snapshot copying after the source changes, source-overlap
  refusal, and protection of unmanaged output.
- Web tests prove dataset/version binding, base-path-aware URLs, complete copied
  file verification, tamper rejection, and the unconfigured fallback.
- Browser coverage verifies the synthetic placeholder has no broken `<img>`;
  official manual verification confirms the copied PNG is displayed.

## Validation

- `pnpm.cmd --filter @dredmorpedia/domain typecheck`
- `pnpm.cmd --filter @dredmorpedia/data-pipeline typecheck`
- `pnpm.cmd --filter @dredmorpedia/web typecheck`
- focused pipeline and web asset tests
- `pnpm.cmd generate:check`
- `pnpm.cmd generate:official:check`
- `pnpm.cmd check`
- `pnpm.cmd build:official`
- `pnpm.cmd test:e2e`

The generated official set remains ignored and non-public.
