# First parity foundation result

Date: 2026-07-19
Scope: split generated artifacts, project-owned search/query logic, collision-safe and registry-pinned item/stat/recipe routes, crafting backlinks, and provenance UI using tracked synthetic fixtures plus ignored read-only official measurements

## Implemented result

- Dataset artifact schema version 3 separates normalized entities from search data and carries dataset/source versions plus field-level applied-patch history.
- Search artifact schema version 1 records the matching dataset schema, dataset identity, normalized text, routes, and entity/source/category/stat facets.
- Manifest schema version 2 checksums the normalized, search, and diagnostic outputs.
- Source manifest schema version 2 declares dataset/source versions and ordered repository-contained patch files. Guarded patches apply atomically after precedence and before linking; stale scope or expected values fail with diagnostics.
- An optional route-registry schema version 1 pins canonical slugs and historical aliases to exact active source identities for one dataset version. Stale, ambiguous, duplicate, or conflicting entries reject the registry atomically.
- Deterministic domain queries combine all-token text matching with entity, source, category, and stat filters. Exact and prefix name matches rank first with stable tie-breaking.
- `/search` loads the separate search payload, preserves filters in the URL, exposes total results, and renders at most 50 records.
- Static stat routes provide item and spell-effect backlinks plus provenance. Datasets with no standalone stat definitions emit an explicit unavailable state.
- The item detail route links normalized stats to available stat definitions.
- A deterministic domain query separates an item's crafted-by and used-to-craft relationships, including summed quantities and stable ordering.
- Static recipe routes expose tool, skill requirement, visibility, linked inputs/outputs, provenance, and source-located diagnostics. Item pages link both directions and unresolved ingredients remain visibly unlinked.
- Item/stat provenance displays dataset/source versions, override history, and reviewed patch reasons with field-level before/after values.
- Canonical item/stat routes use deterministic collision resolution. Registry routes are reserved before automatic allocation; registered historical aliases and unambiguous source original IDs generate alternate paths. Alias pages identify themselves, link to the canonical path, and use `noindex, follow` metadata.
- Browser tests build and serve the static export on their own local port, so they can run while the development server is open.

The formal file contract is in [`../contracts/generated-artifacts.md`](../contracts/generated-artifacts.md). The product acceptance draft is in [`../product/first-parity-slice.md`](../product/first-parity-slice.md).

## Synthetic verification

- Normalized artifact: 20,053 bytes.
- Search artifact: 6,021 bytes for 15 documents.
- Diagnostics remain the intentional 1 error and 5 warnings, with 4 info records for precedence, the guarded synthetic patch, and two applied route-registry entries.
- Domain/pipeline tests: 27 passed.
- Browser tests: 10 passed across desktop and mobile Chromium.
- Axe scans found no automatically detectable violations on representative home, search, canonical item/stat/recipe, source-ID alias, and registered historical-alias routes.
- Desktop and 412-pixel mobile layouts were visually inspected. The registered alias notice, recipe requirements, unresolved-item state, navigation, relationships, and provenance reflow without horizontal overflow.
- Item quality normalization/display passes synthetic checks but is intentionally pending the separate code review recorded in the handoff.

## Read-only official verification

The canonical `1.1.5 beta_preview` base-plus-three-expansion dataset still produces 763 items and 2,710 search documents with 0 errors, 4,291 warnings, and 70 info records.

- Normalized artifact: 3,586,324 bytes.
- Search artifact: 1,202,823 bytes uncompressed.
- Diagnostics: 1,935,824 bytes.
- The import allocated 52 unambiguous source-ID aliases, all currently on skills, and reported no slug collisions or alias conflicts.
- A 1,000-query local CPU benchmark over 2,710 documents measured 0.153 ms mean, 0.452 ms p95, and 6.604 ms maximum. This measures query execution only, not browser parse/hydration or interaction latency.
- The GitHub Pages-subpath static build, including all 374 recipe pages, completed in approximately 21.7 seconds and emitted 1,143 HTML files, 10,283 total files, and 53,973,362 bytes.
- The generated JSON and static export contain no local installation or user-profile path.

The measured game build has no standalone `statDB.xml`. The product therefore must identify an approved definition source or model referenced-only stats explicitly; the implementation does not infer descriptions or provenance that the source did not supply.

All official-derived outputs remain ignored and are not approved for commit or publication.

The existing local official manifest remains readable through the schema version 1 migration path. It activates no patches and reports dataset/source versions as `unversioned`; a reviewed local schema version 2 manifest is required before those labels are used for release provenance.

The route-registry mechanism is implemented and verified with synthetic identities. A public release process must populate and review the registry only after the official-data publication policy permits the derived identity/slug inventory.
