# First parity foundation result

Date: 2026-07-19
Scope: split generated artifacts, project-owned search/query logic, collision-safe and registry-pinned item/stat/recipe/encrustment/skill/ability/spell routes, crafting/encrusting/loadout/spell backlinks, and provenance UI using tracked synthetic fixtures plus ignored read-only official measurements

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
- Static encrustment routes expose tool, skill requirement, visibility, signed instability, applicable slots, linked ingredients, direct signed damage/resistance/primary/secondary modifiers, named power hooks, appearance descriptors, and the separately modeled shared instability-effect pool. Ingredient item pages expose deterministic used-to-encrust backlinks; unresolved ingredients and spells remain visible without fabricated routes. The UI states that effect weights, per-encrustment assignment, and the complete risk formula are not present in the source.
- Static spell routes expose direct effects, resolved or explicitly unresolved spell/stat targets, source provenance, diagnostics, and deterministic backlinks from spell effects, item triggers, abilities, and shared instability definitions. Resolved references on item, stat, and encrustment pages now lead to spell details.
- The domain spell traversal records every direct spell edge, expands a resolved spell only once, and marks cycle-closing or already-expanded branches instead of recursing indefinitely. Dangling targets remain terminal visible steps.
- Skill normalization retains complete named and generic loadout definitions, quantity, always/optional semantics, ordered progression, and resolved item links. Static skill pages link abilities and items; item pages expose deterministic starting-loadout backlinks.
- Ability normalization retains starting/level position and the legacy-supported direct event/activated spell triggers with chance, delay, duration, resistance, and taxonomy metadata. Static ability pages link their parent skill and resolved spells, keep dangling spell names unlinked, and expose source-located diagnostics for remaining unsupported modifiers.
- Item/stat provenance displays dataset/source versions, override history, and reviewed patch reasons with field-level before/after values.
- Canonical item/stat routes use deterministic collision resolution. Registry routes are reserved before automatic allocation; registered historical aliases and unambiguous source original IDs generate alternate paths. Alias pages identify themselves, link to the canonical path, and use `noindex, follow` metadata.
- Browser tests build and serve the static export on their own local port, so they can run while the development server is open.

The formal file contract is in [`../contracts/generated-artifacts.md`](../contracts/generated-artifacts.md). The product acceptance draft is in [`../product/first-parity-slice.md`](../product/first-parity-slice.md).

## Synthetic verification

- Normalized artifact: 31,692 bytes.
- Search artifact: 7,846 bytes for 19 documents.
- Diagnostics remain the intentional 1 error and 18 warnings, with 4 info records for precedence, the guarded synthetic patch, and two applied route-registry entries. Partially normalized item elements plus intentionally unresolved shared-effect, spell-effect, ability-spell, and skill-loadout targets remain explicit.
- Domain/pipeline tests: 37 passed.
- Browser tests: 16 passed across desktop and mobile Chromium.
- Axe scans found no automatically detectable violations on representative home, search, canonical item/stat/recipe/encrustment/skill/ability/spell, source-ID alias, and registered historical-alias routes.
- Desktop and 412-pixel mobile layouts were visually inspected. The registered alias notice, recipe requirements, unresolved-item state, navigation, relationships, and provenance reflow without horizontal overflow.
- Item quality normalization/display passed its separate code review on 2026-07-21. Synthetic records cover weapon root quality, nested armour quality, nested trap quality, and a potion whose unrelated root level must still normalize to zero. Quality patches accept only non-negative integers, and the web artifact boundary rejects missing or invalid quality fields.
- Synthetic item-trigger coverage includes resolved weapon, potion, wand, combat-event, and repeated triggers plus an intentionally unresolved trap spell. The UI exposes the unresolved state without creating a route, and axe checks include representative resolved and unresolved pages.
- Synthetic encrustment coverage includes resolved and unresolved ingredients, two applicable slots, skill level, instability, signed direct modifiers, a probabilistic named power hook, an appearance descriptor, provenance, item backlinks, and two shared instability effects with resolved and unresolved spell references. Desktop/mobile browser and axe checks cover the item-to-encrustment-to-item flow, direct outcomes, the shared-pool disclosure, and its explicit selection-semantics boundary.
- Synthetic spell coverage includes a resolved two-spell chain, a deliberate cycle, a dangling spell target, a resolved stat target, direct/backlink navigation, provenance, and diagnostics. Desktop/mobile browser checks follow an item trigger into the chain, verify the explicit stop states, and navigate between both spell pages.
- Synthetic skill/ability coverage includes resolved, dangling, and generic loadout choices; always/optional quantities; a starting and leveled ability; resolved and dangling activated spells; and a probabilistic melee event trigger. Desktop/mobile browser checks follow item→skill→ability→spell relationships in both directions and exercise keyboard navigation.

## Read-only official verification

The canonical `1.1.5 beta_preview` base-plus-three-expansion dataset produces 763 items, 57 active encrustments, and 2,767 search documents with 0 errors, 4,290 warnings, and 71 info records.

- Normalized artifact: 3,978,650 bytes.
- Search artifact: 1,235,035 bytes uncompressed.
- Diagnostics: 1,931,344 bytes.
- The import allocated 52 unambiguous source-ID aliases, all currently on skills, and reported no slug collisions or alias conflicts.
- The earlier 1,000-query local CPU benchmark over the 2,710-document pre-encrustment artifact measured 0.153 ms mean, 0.452 ms p95, and 6.604 ms maximum. This measures query execution only, not browser parse/hydration or interaction latency; the user-facing search route still filters its payload to items and stats.
- The latest production build, including all 374 recipe, 57 encrustment, 52 canonical skill, 352 ability, and 951 spell pages plus registered/source-ID aliases, completed in approximately 52.4 seconds and prerendered 2,606 static pages.
- The generated JSON and static export contain no local installation or user-profile path.
- The reviewed quality rule matched all 763 official items with zero discrepancies: 257 weapon records use root `level`, 268 armour records use nested `<armour level>`, 54 traps use nested `<trap level>`, and 184 other records use zero. This includes 68 food/potion records whose unrelated root `level` is deliberately ignored. All normalized values were present, non-negative integers; the observed maximum was 16.
- The item-trigger adapter produced 227 triggers across 214 official items. All 227 spell references resolved: 153 came from weapon/food/booze/trap/wand/potion/mushroom shapes and 74 from direct combat-event elements. The direct elements supplied 74 integer chance values and two taxonomy restrictions; the canonical dataset has no item-trigger delay, duration, or unresistable values, while those legacy-compatible fields remain covered synthetically.
- The encrustment adapter read 58 source records and deterministically selected 57 active identities after one same-name collision. The active records contain 190 ingredient references, all resolved, across 11 equipment slot types; skill levels span 0â€“6 and signed instability spans -5â€“40. Direct outcomes comprise 126 modifiers (28 damage, 31 resistance, 11 primary, and 56 secondary), 7 named power hooks (3 probabilistic), and 67 appearance descriptors. The separate shared pool contains 16 unique name/spell pairs, and all 16 resolve. Those definitions contain only `name` and `spell`; the importer therefore does not claim weights, assignments, trigger rules, or a complete probability formula.
- The 951-spell graph contains 1,634 direct effects and 807 spell-reference edges; all 807 targets resolve. A deterministic depth-first measurement observed 14 cycle-closing edges. The largest spell has 34 direct effects, the largest reachable set contains 28 spells, and the maximum shortest-path depth is 7, so explicit cycle handling is necessary while full static traversal remains tractable.
- All 352 active abilities resolve to 52 skills, with at most 9 abilities in one progression. The adapter preserves 76 loadout definitions: 63 name an item, 47 of those resolve, 16 remain explicit dangling references, and 13 are generic type-only choices. It captures 263 ability spell triggers (176 activated, 41 melee-target, 23 kill-target, 12 melee-self, and 11 across crossbow/cast/thrown/block/counter events); all 263 resolve and the largest ability has 4 triggers. Recognizing those legacy-supported event shapes reduced warnings by 84. The remaining 354 skill/ability unknown-element diagnostics comprise 333 direct stat modifiers plus 21 recovery/flag/currency/dodge constructs and remain the next compatibility slice.

The measured game build has no standalone `statDB.xml`. The product therefore must identify an approved definition source or model referenced-only stats explicitly; the implementation does not infer descriptions or provenance that the source did not supply.

All official-derived outputs remain ignored and are not approved for commit or publication.

The existing local official manifest remains readable through the schema version 1 migration path. It activates no patches and reports dataset/source versions as `unversioned`; a reviewed local schema version 2 manifest is required before those labels are used for release provenance.

The route-registry mechanism is implemented and verified with synthetic identities. A public release process must populate and review the registry only after the official-data publication policy permits the derived identity/slug inventory.
