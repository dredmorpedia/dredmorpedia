# Modernization roadmap

Updated: 2026-07-22

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

Progress through 2026-07-22: dataset schema 3, search schema 1, output-manifest schema 2, source-manifest schema 2, guarded patch overlays, a version-scoped published-route registry, versioned provenance UI, deterministic search and item/recipe/encrustment/skill/ability/spell relationship queries, collision-safe canonical routes and alternate aliases, search/stat/recipe/encrustment/skill/ability/spell routes, and desktop/mobile browser coverage are implemented. Spell graph traversal stops cycles and repeated branches while retaining every direct edge and dangling target. Skill loadouts retain named/generic choice, quantity, and always/optional semantics; ability progression and supported spell-trigger events are linked. Generated output now uses real-path overlap guards and a manifest-last commit marker, while the web consumer verifies checksums, complete runtime schemas, search derivation, and diagnostic counts. Monster inheritance cycles keep every cycle member local and diagnosed. Broader relation APIs, dependency policy, and final foundation documentation remain.

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

Progress through 2026-07-22: a synthetic-backed search route, item/stat detail links, stat backlinks/provenance, explicit no-stat-definition behavior, static recipe details, and bidirectional crafted-by/used-to-craft links are implemented. Item quality passed a separate synthetic, official-data, artifact, patch, and responsive UI review. Item spell triggers normalize legacy type-specific/direct event shapes and resolve active spells. Fixed item damage/resistance/primary/secondary modifiers now render on item pages and contribute collision-safe item-stat search facets; 1,584 active modifiers across 506 items remove 599 former direct modifier-element diagnostics without claiming scaling or combat-total formulas. Encrustment entities now normalize tool, visibility, skill level, instability, applicability, ingredient links, signed direct modifiers, named power hooks, and appearance descriptors; the dataset-wide instability-effect pool is separately modeled with linked spells and an explicit boundary around unavailable selection semantics. Static spell details expose loss-aware mana-cost source formulas, ordered animation and impact source metadata, buff lifecycle/stacking parameters, signed direct and sight-radius buff modifiers, linked target/player hit buff event hooks, direct effects, cycle-safe recursive chains, diagnostics, and backlinks from items, spells, buff hooks, abilities, monsters, and shared instability effects. Static skill and ability details expose starting loadouts, progression, signed damage/resistance/primary/secondary modifiers, source flags/tags/recovery/currency values, supported spell-trigger events including dodge hooks, and bidirectional item/spell navigation. Monster profiles normalize dungeon depth/special classification, archetype levels, experience, palette metadata, inherited stat bonuses and AI casting chance, every measured official AI and sight attribute, local dig/dash/charge and sound/sprite presentation metadata, exact one-in on-hit odds, aware/on-death/dash/charge spell hooks, direct named/type-driven drops, and parent/variant/spell/item relationships on static routes. The six primary monster attributes now use a separately evidenced pure domain calculation with effective primary bonuses; conflicting Life, Mana, secondary-stat, and damage formulas remain unavailable. The drop/backlink, AI-metadata, sight/movement/presentation, and primary-attribute slices passed separate code review with deterministic last-declaration-wins monster bonus overrides, strict artifact shapes, adversarial malformed-input coverage, and desktop/mobile checks. All measured official skill/ability and monster child elements are normalized. A general hardening review made integer/boolean parsing strict, reports missing required record metadata, keeps inheritance-cycle members local, coordinates and verifies generated output sets, and limits the home catalogue to a 24-item server-rendered preview. The spell presentation slices normalize all 661 active animation declarations and all 70 active impact declarations, removing 666 former `<anim>` and 71 former `<impact>` diagnostics across active and overridden records. The measured compatibility backlog is now 3,244 unsupported or partially supported item/spell constructs plus 19 dangling references: 911 item and 2,333 spell diagnostics. Fifteen separately tracked spell-requirement diagnostics remain. Detailed sprite prefixes and sound cue IDs stay out of rendered pages while publication rights are unresolved. Damage factors, item effect semantics, and other unsupported nested spell mechanics remain explicit. The acceptance statement remains a draft, official stat definitions need an approved source, disputed monster secondary formulas need canonical-build evidence, and broader legacy comparisons remain.

Targeting-template parity now includes searchable static detail routes, strict three-character grid validation, responsive visual previews, assistive descriptions, anchor inclusion, and provenance. Synthetic desktop/mobile keyboard and axe coverage exercises the route.

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
