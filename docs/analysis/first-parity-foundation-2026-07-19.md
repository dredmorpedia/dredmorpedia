# First parity foundation result

Date: 2026-07-19
Scope: split generated artifacts, project-owned search/query logic, collision-safe item/stat routes, and provenance UI using tracked synthetic fixtures plus ignored read-only official measurements

## Implemented result

- Dataset artifact schema version 2 separates normalized entities from search data.
- Search artifact schema version 1 records the matching dataset schema, dataset identity, normalized text, routes, and entity/source/category/stat facets.
- Manifest schema version 2 checksums the normalized, search, and diagnostic outputs.
- Deterministic domain queries combine all-token text matching with entity, source, category, and stat filters. Exact and prefix name matches rank first with stable tie-breaking.
- `/search` loads the separate search payload, preserves filters in the URL, exposes total results, and renders at most 50 records.
- Static stat routes provide item and spell-effect backlinks plus provenance. Datasets with no standalone stat definitions emit an explicit unavailable state.
- The item detail route links normalized stats to available stat definitions.
- Canonical item/stat routes use deterministic collision resolution. Unambiguous source original IDs are generated as alias paths; alias pages identify themselves, link to the canonical path, and use `noindex, follow` metadata.
- Browser tests build and serve the static export on their own local port, so they can run while the development server is open.

The formal file contract is in [`../contracts/generated-artifacts.md`](../contracts/generated-artifacts.md). The product acceptance draft is in [`../product/first-parity-slice.md`](../product/first-parity-slice.md).

## Synthetic verification

- Normalized artifact: 18,669 bytes.
- Search artifact: 6,021 bytes for 15 documents.
- Diagnostics remain the intentional 1 error and 1 precedence info record, with 5 warnings including the synthetic slug-collision result.
- Domain/pipeline tests: 15 passed.
- Browser tests: 8 passed across desktop and mobile Chromium.
- Axe scans found no automatically detectable violations on representative home, search, canonical item/stat, and item-alias routes.
- Desktop and 412-pixel mobile layouts were visually inspected. The filter grid, result cards, navigation, alias notice, stat relationships, and provenance reflow without horizontal overflow.

## Read-only official verification

The canonical `1.1.5 beta_preview` base-plus-three-expansion dataset still produces 763 items and 2,710 search documents with 0 errors, 4,291 warnings, and 70 info records.

- Normalized artifact: 3,504,861 bytes.
- Search artifact: 1,202,823 bytes uncompressed.
- Diagnostics: 1,935,824 bytes.
- The import allocated 52 unambiguous source-ID aliases, all currently on skills, and reported no slug collisions or alias conflicts.
- A 1,000-query local CPU benchmark over 2,710 documents measured 0.153 ms mean, 0.452 ms p95, and 6.604 ms maximum. This measures query execution only, not browser parse/hydration or interaction latency.
- The GitHub Pages-subpath static build completed in approximately 16.7 seconds and emitted 769 HTML files, 6,917 total files, and 34,710,532 bytes.
- The generated JSON and static export contain no local installation or user-profile path.

The measured game build has no standalone `statDB.xml`. The product therefore must identify an approved definition source or model referenced-only stats explicitly; the implementation does not infer descriptions or provenance that the source did not supply.

All official-derived outputs remain ignored and are not approved for commit or publication.

The deterministic collision owner is derived from canonical identity order. Before already-published datasets evolve, a release process should add a persistent route registry or explicit migration aliases so a newly introduced collision cannot silently move an established public URL.
