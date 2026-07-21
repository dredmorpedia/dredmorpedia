# First parity foundation result

Date: 2026-07-19
Scope: split generated artifacts, project-owned search/query logic, collision-safe and registry-pinned item/stat/recipe/encrustment routes, crafting/encrusting backlinks, and provenance UI using tracked synthetic fixtures plus ignored read-only official measurements

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
- Item spell triggers normalize legacy type-specific and direct event shapes, resolve against active spell identities, retain unresolved names with diagnostics, and expose chance/delay/duration/resistance/taxonomy metadata on item details.
- Static recipe routes expose tool, skill requirement, visibility, linked inputs/outputs, provenance, and source-located diagnostics. Item pages link both directions and unresolved ingredients remain visibly unlinked.
- Static encrustment routes expose tool, skill requirement, visibility, signed instability, applicable slots, linked ingredients, provenance, and source-located diagnostics. Ingredient item pages expose deterministic used-to-encrust backlinks; unresolved ingredients remain visible without fabricated routes.
- Item/stat provenance displays dataset/source versions, override history, and reviewed patch reasons with field-level before/after values.
- Canonical item/stat routes use deterministic collision resolution. Registry routes are reserved before automatic allocation; registered historical aliases and unambiguous source original IDs generate alternate paths. Alias pages identify themselves, link to the canonical path, and use `noindex, follow` metadata.
- Browser tests build and serve the static export on their own local port, so they can run while the development server is open.

The formal file contract is in [`../contracts/generated-artifacts.md`](../contracts/generated-artifacts.md). The product acceptance draft is in [`../product/first-parity-slice.md`](../product/first-parity-slice.md).

## Synthetic verification

- Normalized artifact: 26,587 bytes.
- Search artifact: 7,307 bytes for 18 documents.
- Diagnostics remain the intentional 1 error and 16 warnings, with 4 info records for precedence, the guarded synthetic patch, and two applied route-registry entries. Partially normalized item elements, unmodeled encrustment modifiers, and unstable-effect definitions remain explicit.
- Domain/pipeline tests: 31 passed.
- Browser tests: 12 passed across desktop and mobile Chromium.
- Axe scans found no automatically detectable violations on representative home, search, canonical item/stat/recipe, source-ID alias, and registered historical-alias routes.
- Desktop and 412-pixel mobile layouts were visually inspected. The registered alias notice, recipe requirements, unresolved-item state, navigation, relationships, and provenance reflow without horizontal overflow.
- Item quality normalization/display passed its separate code review on 2026-07-21. Synthetic records cover weapon root quality, nested armour quality, nested trap quality, and a potion whose unrelated root level must still normalize to zero. Quality patches accept only non-negative integers, and the web artifact boundary rejects missing or invalid quality fields.
- Synthetic item-trigger coverage includes resolved weapon, potion, wand, combat-event, and repeated triggers plus an intentionally unresolved trap spell. The UI exposes the unresolved state without creating a route, and axe checks include representative resolved and unresolved pages.
- Synthetic encrustment coverage includes resolved and unresolved ingredients, two applicable slots, skill level, instability, provenance, item backlinks, and explicit unmodeled-effect diagnostics. Desktop/mobile browser and axe checks cover the item-to-encrustment-to-item flow.

## Read-only official verification

The canonical `1.1.5 beta_preview` base-plus-three-expansion dataset produces 763 items, 57 active encrustments, and 2,767 search documents with 0 errors, 4,438 warnings, and 71 info records.

- Normalized artifact: 3,817,253 bytes.
- Search artifact: 1,235,035 bytes uncompressed.
- Diagnostics: 2,038,607 bytes.
- The import allocated 52 unambiguous source-ID aliases, all currently on skills, and reported no slug collisions or alias conflicts.
- The earlier 1,000-query local CPU benchmark over the 2,710-document pre-encrustment artifact measured 0.153 ms mean, 0.452 ms p95, and 6.604 ms maximum. This measures query execution only, not browser parse/hydration or interaction latency; the user-facing search route still filters its payload to items and stats.
- The GitHub Pages-subpath static build, including all 374 recipe and 57 encrustment pages, completed in approximately 29.4 seconds and emitted 1,200 HTML files, 10,796 total files, and 58,955,410 bytes.
- The generated JSON and static export contain no local installation or user-profile path.
- The reviewed quality rule matched all 763 official items with zero discrepancies: 257 weapon records use root `level`, 268 armour records use nested `<armour level>`, 54 traps use nested `<trap level>`, and 184 other records use zero. This includes 68 food/potion records whose unrelated root `level` is deliberately ignored. All normalized values were present, non-negative integers; the observed maximum was 16.
- The item-trigger adapter produced 227 triggers across 214 official items. All 227 spell references resolved: 153 came from weapon/food/booze/trap/wand/potion/mushroom shapes and 74 from direct combat-event elements. The direct elements supplied 74 integer chance values and two taxonomy restrictions; the canonical dataset has no item-trigger delay, duration, or unresistable values, while those legacy-compatible fields remain covered synthetically.
- The encrustment adapter read 58 source records and deterministically selected 57 active identities after one same-name collision. The active records contain 190 ingredient references, all resolved, across 11 equipment slot types; skill levels span 0â€“6 and signed instability spans -5â€“40. The 147 unmodeled modifier-element diagnostics and one aggregate unstable-effect diagnostic keep the remaining effect vocabulary measurable.

The measured game build has no standalone `statDB.xml`. The product therefore must identify an approved definition source or model referenced-only stats explicitly; the implementation does not infer descriptions or provenance that the source did not supply.

All official-derived outputs remain ignored and are not approved for commit or publication.

The existing local official manifest remains readable through the schema version 1 migration path. It activates no patches and reports dataset/source versions as `unversioned`; a reviewed local schema version 2 manifest is required before those labels are used for release provenance.

The route-registry mechanism is implemented and verified with synthetic identities. A public release process must populate and review the registry only after the official-data publication policy permits the derived identity/slug inventory.
