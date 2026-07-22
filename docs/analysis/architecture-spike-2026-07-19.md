# Architecture spike results

Date: 2026-07-19
Scope: independently authored synthetic fixtures plus read-only measurements from the locally installed official dataset; no official content or generated derivative is tracked

## Outcome

The architecture spike validates the proposed package boundaries, deterministic importer, source overlay behavior, and static delivery path against both legal synthetic fixtures and the full local official dataset. Technical validation for ADRs 0001 and 0002 is complete. They remain Proposed because normalized official data/art publication and inherited-content licensing are unresolved.

## Implemented proof

- A pinned Node 24/pnpm workspace with strict TypeScript, ESLint, Prettier, Vitest, Playwright, and Windows GitHub Actions.
- Framework-independent `domain` and `data-pipeline` packages plus a Next.js App Router web application.
- A project-owned `fast-xml-parser` adapter, explicit source manifest, deterministic collision resolution, stable IDs, source provenance, relationship linking, source-located diagnostics, and checksummed atomic JSON output.
- Independently authored fixtures covering representative item, recipe, skill/ability, spell/effect, monster inheritance, stat, template, precedence, invalid-input, missing-asset, unknown-element, and dangling-reference behavior.
- A statically generated item detail route and a responsive client search/category filter using a selective Base UI-backed shadcn-style Select and project-owned Tailwind tokens.
- English document semantics, light/dark/system token behavior, visible fixture health, empty state, keyboard category selection, and automated desktop/mobile accessibility scans.

## Measured synthetic result

- Active entities/search documents: 13.
- Items/static item routes: 3.
- Diagnostics: 1 expected error, 4 expected warnings, and 1 precedence info record.
- Generated artifact: 20,822 bytes.
- GitHub Pages subpath export: 1,008,359 bytes across 7 HTML files plus supporting assets.
- Production compile: approximately 1.5 seconds in the recorded local run; complete `pnpm build` command approximately 8 seconds with warm dependencies.
- Static export succeeded both at `/` and with `NEXT_PUBLIC_BASE_PATH=/dredmorpedia`; emitted asset and entity links include the subpath.
- Automated checks: 10 domain/pipeline tests and 4 Playwright cases across desktop and mobile projects passed. Axe reported no automatically detectable violations on the representative home and item-detail routes.
- Desktop light-theme and Pixel 7 dark-theme full-page screenshots were inspected locally; the shell, diagnostic panel, controls, and item cards reflow without clipping or overlap.
- Repeated import output was byte-identical. The CLI prints checksum-bearing output metadata and refuses output inside an input source root.

These numbers characterize only the tiny synthetic fixture and must not be used to predict final artifact size or performance.

## Read-only official dataset result

The owner identified the canonical measurement baseline as Dungeons of Dredmor `1.1.5 public_beta`, Steam app `98800`, build `22934623`, internal branch key `public_beta`, with the base game and all three official expansions installed. The local absolute installation path is deliberately not recorded.

- Official encyclopedia databases: 22 files, 1,287,424 bytes total. All parsed without XML errors.
- Deterministic input checksums: 1,390 database and resolved-asset entries.
- Normalized/search documents: 2,710 total — 763 items, 374 recipes, 52 skills, 352 abilities, 951 spells, 183 monsters, 35 templates, and no standalone stat definitions because this build has no `statDB.xml`.
- Generated normalized artifact: 4,573,522 bytes.
- Generated diagnostics: 1,935,824 bytes.
- Search-document JSON: 1,088,845 bytes uncompressed.
- Diagnostics: 0 errors, 4,291 warnings, and 70 precedence info records. The warnings are 4,274 unsupported child elements, 16 dangling item references, and 1 explicitly deferred encrustment database normalizer.
- Source-specific asset roots with deterministic lower-precedence fallback resolved all referenced assets encountered by the implemented normalizers. The initial naive single-root measurement produced 476 false missing-asset warnings and was rejected.
- A warm deterministic CLI command that imports twice, compares bytes, and emits once completed in approximately 4.8 seconds locally.
- The GitHub Pages-style static build generated 763 item routes in approximately 27.5 seconds. The export contains 767 HTML files and 6,898 files overall, totaling 32,457,484 bytes.
- Generated JSON and the static export were scanned for the local installation and user-profile paths; neither contained an absolute local path.

All official-derived JSON and HTML remain in ignored local output directories and are not approved for commit or publication.

## Decisions supported

The spike supports retaining the proposed Node/pnpm/strict TypeScript, Next.js static export, Tailwind tokens, selective shadcn/Base UI, Vitest, Playwright, and adapter-based XML pipeline direction. It supports source-precedence asset fallback and confirms that the static route count is viable. ADR 0003 keeps search documents project-owned and separately loadable before a third-party index is adopted; query performance and relevance still need product-slice benchmarks.

## Remaining validation gates

1. Decide which normalized official data and artwork, if any, can be committed or publicly deployed.
2. Establish code and inherited mod/asset license and provenance policy.
3. Agree the first parity-slice acceptance statement and search response/relevance budgets.
4. Implement missing domain normalizers incrementally from synthetic fixtures; the current full-data artifact is structural evidence, not parity-complete content.
5. Accept or revise ADRs 0001 and 0002 after the publication boundary is decided.
