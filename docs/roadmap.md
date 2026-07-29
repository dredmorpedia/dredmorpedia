# Modernization roadmap

Updated: 2026-07-29

This roadmap optimizes for a trustworthy vertical slice and a reusable data foundation. Dates and estimates should be added only after the owner resolves the Phase 0 decisions and a complete local dataset is measured.

## Phase 0 — Inception and constraints (policy gates in progress)

### Deliverables

- [x] Repository and runtime audit.
- [x] Product brief and working principles.
- [x] Proposed target architecture and alternatives.
- [x] Root agent/contributor instructions and ADR process.
- [x] Repeatable legacy audit script.
- [x] Relocate the preserved application intact under `legacy/`.
- [x] Confirm initial source scope: base game plus all three official expansions; mods are a later capability.
- [x] Choose the owner-approved platform direction: Next.js/React, Tailwind plus project tokens, and static-first hosting.
- [x] Choose a modern game-inspired visual direction with light, dark, and system themes.
- [x] Choose selective shadcn/ui components backed by Base UI as the accessible component foundation.
- [x] Set English-only initial scope while preserving a clean boundary between canonical game text and interface copy.
- [x] Write an interim read-only data and asset policy.
- [x] Record the exact canonical installed game build/version.
- [ ] Decide what official/generated data and art may be committed or publicly hosted.
- [ ] Establish code and bundled-mod license/provenance policy.
- [ ] Accept technically validated ADR 0001 after the publication boundary is decided.
- [ ] Choose the first quality-of-life feature after parity from the recorded candidates.

### Exit criteria

ADR 0001 is accepted, the exact official source version is recorded, the public data/asset boundary is decided, and the first parity slice has an agreed acceptance statement.

## Phase 1 — Architecture spike (complete)

### Goal

Prove the risky boundaries with representative data before building a design system or many routes.

### Deliverables

- [x] Scaffold the pinned Node/pnpm/TypeScript workspace and CI workflow.
- [x] Establish project-owned Tailwind tokens and add only the shadcn/ui + Base UI components required by the spike interaction.
- [x] Create synthetic fixtures for an item, recipe, skill/ability, spell/effect chain, inherited monster, stat, template, duplicate override, invalid XML, missing asset, and dangling reference.
- [x] Parse the representative synthetic source shapes through a project-owned adapter.
- [x] Parse the approved official XML through the adapter; keep broad mod compatibility as later work.
- [x] Exercise the full installed official dataset read-only; write all measurements and artifacts outside the installation.
- [x] Emit deterministic normalized JSON plus diagnostics with collision-resistant atomic replacement, a manifest-last commit marker, and verified checksums.
- [x] Generate static item routes and one small client search/filter interaction.
- [x] Validate the static export at a GitHub Pages-style repository subpath.
- [x] Pass local unit, build, desktop/mobile keyboard-flow, and axe checks without proprietary data.
- [x] Measure full-dataset entity counts, import/build time, artifact size, and search-index size locally without committing restricted data.
- [x] Record the parser and artifact-format decision as ADR 0002.
- [x] Record the initial search decision as ADR 0003 after measuring the full dataset.

### Exit criteria

Two identical imports produce byte-identical artifacts; invalid/unknown input has source-located diagnostics; one entity route builds statically; CI passes without proprietary data.

Completed on 2026-07-19. The publication and licensing gates remain in Phase 0; they block public official-data deployment, not continued code work on synthetic fixtures and package boundaries.

## Phase 2 — Foundation

### Deliverables

- Complete source manifest, precedence, canonical identity, provenance, patch-overlay, and diagnostics contracts.
- Create domain types and relation graph APIs for all parity entities.
- Add stable slug/collision rules and redirects/aliases where necessary.
- Establish design tokens, typography, icons, responsive shell, navigation, loading/empty/error states, and accessible primitives.
- Add canonical repository commands for dev, audit, generate, test, lint, typecheck, build, and browser smoke.
- Add dependency update and CI caching policy.

### Exit criteria

Every package boundary has tests and documented commands; the web shell meets the agreed mobile/keyboard baseline; pipeline output has a versioned contract.

Progress through 2026-07-28: dataset schema 3, search schema 1, output-manifest schema 2, source-manifest schema 2, guarded patch overlays, a version-scoped published-route registry, versioned provenance UI, deterministic search and item/recipe/encrustment/skill/ability/spell relationship queries, collision-safe canonical routes and alternate aliases, search/stat/recipe/encrustment/skill/ability/spell routes, and desktop/mobile browser coverage are implemented. Generated search documents have a total `(kind, name, id)` order; every persisted domain/pipeline string order uses one ICU-independent UTF-16 comparator; and regressions cover equal-precedence source resolution, missing monster parents, three-level inheritance, and negative derived totals. Spell graph traversal stops cycles and repeated branches while retaining every direct edge and dangling target. Skill loadouts retain named/generic choice, quantity, and always/optional semantics; ability progression and supported spell-trigger events are linked. Generated output now uses real-path overlap guards and a manifest-last commit marker, while the web consumer verifies checksums, complete runtime schemas, search derivation, and diagnostic counts. Monster inheritance cycles keep every cycle member local and diagnosed. Dependabot groups weekly compatible package updates, a separate scheduled production-dependency audit keeps live advisory availability out of ordinary pull-request CI, and the pinned production graph has been refreshed past the reviewed high-severity Next.js, PostCSS, and Sharp advisories. Broader relation APIs and final foundation documentation remain.

Determinism hardening through 2026-07-29 also makes diagnostic, equal-precedence source-resolution, and encrustment-instability comparators self-contained rather than relying on stable-sort traversal order. Reversed-input regressions cover severity/details, source columns, and the final entity-record fallback.

Trust-boundary hardening through 2026-07-29 validates normalized asset values before root probing. A focused parser regression proves traversal is rejected even if a future caller supplies no asset lookup roots.

The web artifact boundary now validates canonical/alias slug and search-URL shapes and independently rejects duplicate same-kind canonical-or-alias route ownership before static route generation. Checksummed-tampering regressions cover all four failure paths without changing valid generated output.

Asset-reference hardening now rejects POSIX absolute, Windows absolute/drive-relative, and traversal values independently of the generator host. One web schema covers all item, skill/ability, spell, and monster presentation paths; all 3,708 non-null canonical references satisfy it.

The source-manifest trust boundary is now explicit: trusted local manifests may
name an absolute read-only game-installation root, while declared database files
remain real-path-contained beneath it and machine-local roots stay out of
generated artifacts. A focused regression covers both the allowed root and a
rejected traversal attempt.

All nine alias detail routes now keep the entity `<h1>` before the alias-note
`<h2>` in document order. The visible canonical-route notice and `noindex`
metadata remain intact, with browser coverage for the heading sequence.

Web source-token labels now use one tested display helper across item, recipe,
encrustment, skill, spell, monster, and stat-modifier presentation. This closes
the review's duplicated `titleCase` finding and makes repeated separators and
surrounding whitespace consistent.

## Phase 3 — First vertical product slice

Recommended slice: **items + stats + source provenance + global search**, followed immediately by crafting backlinks.

### Deliverables

- Item list/category views with URL-addressable filters and useful empty states.
- Useful filters include source, item category, stats, and crafting-skill level where applicable.
- Static item and stat detail pages with source/version provenance.
- Global typeahead/search route with entity-type, source, item-category, and stat filters.
- Item stat display, quality/price, triggers, and known relationships.
- Recipe and encrust input/output backlinks, including clear “used to craft” and “used to encrust” relationships, with shareable URLs.
- Desktop/mobile, keyboard, metadata, broken-link, and accessibility smoke coverage.
- Side-by-side comparison as the first tool if owner prioritizes it.

### Exit criteria

The slice is visibly better than legacy on correctness feedback, load behavior, responsive use, navigation, and search; representative outputs are checked against the legacy application and source XML.

Item category facets now derive from verified source shapes: all 763 active items fall into 31 meaningful weapon, equipment, consumable, and utility categories with no raw numeric or `unknown` values.

Item artifact metadata now preserves every direct declaration and its loss-aware non-negative quality. The canonical dataset has 108 valid declarations across 108 items; this removes all 108 former unsupported `<artifact>` diagnostics without inferring artifact-generation or corruption behavior.

Direct item melee-target, melee-self, crossbow, thrown, and kill hooks now fully preserve both measured casing forms and exact extra source flags. All 77 canonical direct hooks resolve, and the 74 associated compatibility diagnostics are removed.

Item use metadata now preserves ordered Life/Mana recovery declarations, exact extra food source flags, and loss-aware wand charge ranges. Potion and mushroom trigger leaves are fully validated. The canonical dataset has 49 recoveries, 21 charge ranges, and 64 fully resolved related triggers; this removes 120 former compatibility diagnostics without inferring recovery timing or charge-use behavior.

Trap metadata now preserves ordered loss-aware activation, level, caster-targeting, and safe placement-source declarations while retaining the stepped-on spell relationship. The canonical dataset has 54 fully modeled active traps and resolved spell references; this removes all 54 former trap compatibility diagnostics without inferring reset, targeting, or placement behavior.

Gem classification now treats the 20 canonical empty `<gem>` leaves as strict source-shape markers. The existing `gem` category is their complete normalized representation; unexpected marker attributes or children remain diagnosed, and no additional gem behavior is inferred. This removes all 20 former gem-marker diagnostics.

Armour declarations now preserve all 268 canonical slot, level, and optional `randoms` source shapes loss-aware. The item page discloses the direct values without inventing random-stat selection or equipment formulas, and malformed extensions remain diagnosed. This removes all 268 former armour compatibility diagnostics.

Weapon leaves are now complete across the existing semantic category, source quality, fixed modifier, and hit-trigger fields plus an ordered loss-aware `weaponDeclarations` array for floor targeting and safe hidden thrown-presentation references. All 257 canonical declarations satisfy the strict contract; malformed scaling/extension shapes remain diagnosed, and recoverability or combat formulas are not inferred. This removes all 257 former weapon compatibility diagnostics.

Macguffin leaves now preserve ordered loss-aware spell, item-class-name, and consumable source metadata without converting them into ordinary activation triggers. Both canonical declarations satisfy the strict contract; one spell link resolves and the source's absent target remains visible as a dangling relationship. This removes both former macguffin compatibility diagnostics while adding one previously hidden dangling reference.

Toolkit leaves now preserve ordered loss-aware crafting tags, slot counts, sound cues, safe presentation references, layout rectangles, controls, and close positions. Matching tags link toolkit items bidirectionally with all recipes and encrustments, while detailed cue IDs, raw paths, and old game-interface coordinates remain hidden and do not control the modern UI. All eight canonical declarations satisfy the strict contract, removing the final eight item compatibility diagnostics.

Progress through 2026-07-28: a synthetic-backed search route, item/stat detail links, stat backlinks/provenance, explicit no-stat-definition behavior, static recipe details, and bidirectional crafted-by/used-to-craft links are implemented. Item quality passed a separate synthetic, official-data, artifact, patch, and responsive UI review. Item artifact declarations preserve loss-aware quality and remove 108 former unsupported-element diagnostics. Item spell triggers normalize legacy type-specific/direct event shapes, both measured target/self casing forms, and exact extra source flags; all 77 active direct hooks resolve and their 74 compatibility diagnostics are removed. Item use metadata preserves 49 Life/Mana recovery declarations, 21 wand charge ranges, and 64 resolved related triggers, removing another 120 former diagnostics without claiming recovery timing or charge-use behavior. Trap metadata preserves 54 activation/targeting/placement declarations with fully resolved stepped-on spell links, removing all 54 former trap diagnostics without claiming runtime behavior. All 20 canonical gem markers are strict empty classification leaves; unexpected content remains diagnosed and no additional behavior is inferred. Fixed item damage/resistance/primary/secondary modifiers now render on item pages and contribute collision-safe item-stat search facets; 1,584 active modifiers across 506 items remove 599 former direct modifier-element diagnostics without claiming scaling or combat-total formulas. Encrustment entities now normalize tool, visibility, skill level, instability, applicability, ingredient links, signed direct modifiers, named power hooks, and appearance descriptors; the dataset-wide instability-effect pool is separately modeled with linked spells and an explicit boundary around unavailable selection semantics. Static spell details expose loss-aware mana-cost source formulas, ordered animation and impact metadata, ordered buff-local descriptions and halo declarations, spell- and buff-local AI hints, buff lifecycle/stacking parameters, signed direct and sight-radius buff modifiers, linked target/player hit buff event hooks, typed effect-list options, direct effect damage/scaling metadata, controls, and buff-presence conditions, cycle-safe recursive chains, diagnostics, and backlinks from items, spells, buff hooks, abilities, monsters, and shared instability effects. Static skill and ability details expose starting loadouts, progression, signed damage/resistance/primary/secondary modifiers, source flags/tags/recovery/currency values, supported spell-trigger events including dodge hooks, and bidirectional item/spell navigation. Monster profiles normalize dungeon depth/special classification, archetype levels, experience, palette metadata, inherited stat bonuses and AI casting chance, every measured official AI and sight attribute, local dig/dash/charge and sound/sprite presentation metadata, exact one-in on-hit odds, aware/on-death/dash/charge spell hooks, direct named/type-driven drops, and parent/variant/spell/item relationships on static routes. The six primary monster attributes now use a separately evidenced pure domain calculation with effective primary bonuses; conflicting Life, Mana, secondary-stat, and damage formulas remain unavailable. The drop/backlink, AI-metadata, sight/movement/presentation, and primary-attribute slices passed separate code review with deterministic last-declaration-wins monster bonus overrides, strict artifact shapes, adversarial malformed-input coverage, and desktop/mobile checks. All measured official skill/ability and monster child elements are normalized. A general hardening review made integer/boolean parsing strict, reports missing required record metadata, keeps inheritance-cycle members local, coordinates and verifies generated output sets, and limits the home catalogue to a 24-item server-rendered preview. The spell presentation slices normalize all 661 active animation declarations and all 70 active impact declarations, removing 666 former `<anim>` and 71 former `<impact>` diagnostics across active and overridden records. At that earlier checkpoint, the measured compatibility backlog was 2,870 unsupported or partially supported item/spell constructs plus 19 dangling references: 535 item and 2,335 spell diagnostics. The chronological entries below supersede those counts. Thirteen separately tracked spell-requirement diagnostics remain. Detailed sprite prefixes and sound cue IDs stay out of rendered pages while publication rights are unresolved. Item effect/scaling semantics, final spell-effect formulas, and other unsupported nested spell mechanics remain explicit. The acceptance statement remains a draft, official stat definitions need an approved source, disputed monster secondary formulas need canonical-build evidence, and broader legacy comparisons remain.

Current weapon-slice measurement supersedes the compatibility totals in the preceding cumulative chronicle: 2,345 item/spell constructs remain, comprising 10 item and 2,335 spell diagnostics. The remaining item leaves are 8 `toolkit` and 2 `macguffin`; the 19 dangling references and 13 separately tracked spell-requirement diagnostics are unchanged.

Current macguffin-slice measurement supersedes the preceding weapon total: 2,343 item/spell compatibility constructs remain, comprising 8 `toolkit` and 2,335 spell diagnostics. Thirteen spell-requirement diagnostics remain separately tracked. The now-visible unresolved macguffin spell raises the separately tracked dangling-reference count from 19 to 20.

Current toolkit-slice measurement supersedes the preceding macguffin total: 2,335 compatibility constructs remain, all spell-side. No item compatibility diagnostic remains. Thirteen spell-requirement diagnostics and 20 dangling references remain separately tracked.

Spell buff descriptions now preserve all 32 measured candidate declarations as ordered, loss-aware buff-local text rather than relying on the legacy parser's descendant query to promote them into a spell-wide description. Source precedence leaves 31 active descriptions across 31 spells; all active text is non-empty, malformed extensions remain diagnosed, and the text contributes to spell search. This removes all 32 former nested-description compatibility diagnostics. The current backlog is 2,303 compatibility constructs, all spell-side, plus 13 separately tracked spell-requirement diagnostics and 20 dangling references.

Spell buff halos now preserve all 53 measured declarations as ordered, loss-aware buff-local presentation metadata. Safe hidden sprite references, frame counts/rates, optional first frames, centered flags, and the measured casing aliases are strict artifact fields; malformed extensions remain diagnosed and the UI exposes only a source-field summary. This removes all 53 former halo diagnostics without loading proprietary sprites or inferring timing. The current backlog is 2,250 compatibility constructs, all spell-side, plus 13 separately tracked spell-requirement diagnostics and 20 dangling references.

Spell AI hints now preserve all 47 measured source candidates as strict, ordered spell- or buff-local metadata. Duplicate/source selection leaves 45 active declarations across 45 spells; the page reports their exact source tokens and scopes without inferring targeting, eligibility, priorities, or runtime AI behavior. This removes all 47 former `<ai>` diagnostics. The current backlog is 2,203 compatibility constructs, all spell-side, plus 13 separately tracked spell-requirement diagnostics and 20 dangling references.

Spell effect-list options now preserve all 276 measured declarations in source order under their typed `spawnitemfromlist` or `triggerfromlist` parent. The active artifact contains 192 item options across 26 effects and 84 spell options across 19 effects. All spell targets and 189 item declarations resolve; three item declarations remain visibly dangling. Direct item amounts stay loss-aware, reciprocal spell/item backlinks are exposed, and the UI explicitly withholds selection weights, probabilities, eligibility, fallback, and runtime behavior. This removes all 45 former nested `<option>` compatibility diagnostics. The current backlog is 2,158 compatibility constructs, all spell-side, plus 13 separately tracked spell-requirement diagnostics and 23 dangling references.

Direct spell-effect controls now preserve 795 active chance, caster/self/corpse, resistance, burn, and taxonomy values across 711 effects and 403 spells. Both measured chance and caster aliases normalize loss-aware; explicit false and 100-percent declarations are retained, malformed or simultaneous aliases stay diagnosed, and the UI does not combine the fields into targeting, resistance, ignition, or probability behavior. This removes 799 source-candidate effect-attribute diagnostics. The current backlog is 1,359 compatibility constructs, all spell-side, plus 13 separately tracked spell-requirement diagnostics and 23 dangling references.

Direct trigger/damage-over-time buff conditions now preserve 16 active source-buff requirements, 49 required named-buff pairs, and eight forbidden named-buff pairs across 73 effects and 38 spells. Both measured source-buff casing aliases normalize loss-aware; all 57 named targets resolve with reciprocal backlinks, while malformed pairs and unsupported effect types remain diagnosed. This removes 130 former direct-effect attribute diagnostics without inferring buff-presence evaluation, trigger eligibility, duration, consumption, or timing. The current backlog is 1,229 compatibility constructs, all spell-side, plus 13 separately tracked spell-requirement diagnostics and 23 dangling references.

Direct spell-effect damage and scaling metadata now preserves 605 active damage declarations across 433 effects: 586 base amounts, 294 factor coefficients, and 19 factor-only declarations. A further 106 effects preserve scaling data through 15 amount factors, two floor factors, 23 primary source IDs, and 67 secondary source IDs. Strict type-specific normalization covers both measured primary-selector casing forms, retains malformed declarations loss-aware, and does not combine the fields with undeclared engine defaults or infer final damage, healing, mana, spawn, resistance, armour, or rounding formulas. This removes 990 former effect-attribute diagnostics. The current backlog is 239 compatibility constructs, all spell-side, plus 13 separately tracked spell-requirement diagnostics and 23 dangling references.

Direct spell-effect duration metadata now preserves all 69 active `turns`
declarations across 69 effects and 68 spells. Values are loss-aware
non-negative integers and render as source turn counts without inferring
countdown start, stacking, refresh, removal, or scheduling behavior. This
removes 69 former effect-attribute diagnostics. The current backlog is 170
compatibility constructs, all spell-side, plus 13 separately tracked
spell-requirement diagnostics and 23 dangling references. Evidence is recorded
in `docs/analysis/spell-effect-duration-evidence-2026-07-29.md`.

Targeting-template parity now includes searchable static detail routes, strict three-character grid validation, responsive visual previews, assistive descriptions, anchor inclusion, and provenance. Synthetic desktop/mobile keyboard and axe coverage exercises the route.

Structured search now exposes all nine generated entity kinds rather than discarding recipes, encrustments, skills, abilities, spells, and monsters at the web boundary. Query text is locally buffered for immediate, lossless typing and written to the shareable URL after a short pause; sequential-input, keyboard-navigation, mobile, and axe coverage exercise the interaction. A server-rendered browse directory and 100-record static catalogue pages now expose every kind and direct detail link without JavaScript, with consistent primary navigation, breadcrumbs, empty states, keyboard coverage, and axe coverage. Broader non-item stat facets and ADR 0003's user-facing performance/relevance budgets remain open.

## Phase 4 — Legacy parity

Implement in dependency order rather than old-tab order:

1. stats and templates;
2. spells/effects and recursive link handling;
3. skills/abilities/loadouts;
4. monsters/inheritance/drops/derived stats;
5. crafts and encrustments;
6. source/mod variants and collision explorer;
7. meta/derived views;
8. any remaining valuable legacy navigation/tooltips.

### Exit criteria

All agreed parity concepts have stable routes, tested relationships, provenance, and diagnostics. Any intentionally dropped legacy feature is documented. The preserved `legacy/` application may then be archived or removed in a dedicated change.

## Phase 5 — Differentiating tools

Candidate order, subject to owner priority after parity:

1. Rich cross-list filtering and reusable filter views.
2. Expanded crafting/encrusting dependency views and shopping lists.
3. Local tagging, favorites, and custom lists after a separate persistence/portability decision.
4. Side-by-side comparison and build planning with shareable URLs.
5. Local mod inspector/validator, conflict view, spell/effect graph, and data-version diff.
6. Offline installability after artifact/asset sizing.

Live game-progress tracking is a separate research track after the core data model is proven. Research must establish what state is observable, whether save/runtime formats are stable, what platforms are feasible, and how to remain read-only and privacy-preserving before it enters the product roadmap.

Each tool needs a product brief, pure domain logic, URL/persistence policy, mobile/keyboard design, and representative browser tests.

## Phase 6 — Public release and operations

### Deliverables

- Select static hosting/CDN based on domain, preview, analytics, and cost needs.
- Reproducible production data import with an approved publication boundary.
- Security headers/dependency review at the chosen hosting layer.
- Sitemap, robots policy, canonical metadata, 404s, asset caching, and performance budgets.
- Dataset/version health page and release changelog.
- Backup/rollback and domain ownership documentation.
- Remove or clearly archive obsolete deployment and PWA instructions.

### Exit criteria

Production can be rebuilt from documented inputs, release checks are automated, restricted data is excluded, and rollback is proven.

## Later decision gates

Accounts, synchronized builds/favorites/lists, community annotations, a public API, and a database remain outside this roadmap until usage evidence justifies their privacy, moderation, security, and operational costs.
