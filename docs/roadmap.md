# Modernization roadmap

Updated: 2026-08-09

This roadmap optimizes for a trustworthy vertical slice and a reusable data
foundation. The local-first policy is decided; public-release estimates remain
premature until content permissions are documented.

## Phase 0 — Inception and constraints (local policy complete)

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
- [x] Adopt the local-first read-only data and asset policy.
- [x] Record the exact canonical installed game build/version.
- [x] Keep official/generated data and imported art local-only until future
      publication permission is documented.
- [x] Select MIT for independently authored modern project material with
      explicit legacy/game/mod/asset exclusions.
- [ ] Add the scoped license and notice after confirming copyright-holder
      wording; continue provenance research for excluded material.
- [x] Accept technically validated ADRs 0001 and 0002 under the local-first
      boundary.
- [x] Defer the first quality-of-life feature choice until parity polish.

### Exit criteria

The architecture is accepted, the exact official source version is recorded,
and the current local/public boundary is decided. Permission for public
official content and final first-slice acceptance remain later release gates.

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

Completed on 2026-07-19. The owner subsequently accepted the architecture under
a local-first boundary. Future public official-data deployment remains blocked
on permission, not on the technical spike.

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

Progress through 2026-07-29: dataset schema 3, search schema 2, output-manifest schema 2, source-manifest schema 2, guarded patch overlays, a version-scoped published-route registry, versioned provenance UI, deterministic search and item/recipe/encrustment/skill/ability/spell relationship queries, collision-safe canonical routes and alternate aliases, search/stat/recipe/encrustment/skill/ability/spell routes, and desktop/mobile browser coverage are implemented. Search schema 2 carries ordered route aliases for bounded project-owned zero-result spelling suggestions. Generated search documents have a total `(kind, name, id)` order; every persisted domain/pipeline string order uses one ICU-independent UTF-16 comparator; and regressions cover equal-precedence source resolution, missing monster parents, three-level inheritance, and negative derived totals. Spell graph traversal stops cycles and repeated branches while retaining every direct edge and dangling target. Skill loadouts retain named/generic choice, quantity, and always/optional semantics; ability progression and supported spell-trigger events are linked. Generated output now uses real-path overlap guards and a manifest-last commit marker, while the web consumer verifies checksums, complete runtime schemas, search derivation, and diagnostic counts. Monster inheritance cycles keep every cycle member local and diagnosed. Dependabot groups weekly compatible package updates, a separate scheduled production-dependency audit keeps live advisory availability out of ordinary pull-request CI, and the pinned production graph has been refreshed past the reviewed high-severity Next.js, PostCSS, and Sharp advisories. Broader relation APIs and final foundation documentation remain.

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

ADR 0004's shared-route lifecycle is implemented. Schema-2 registries declare
an explicit root or checksum-bound predecessor, retain canonical routes and
historical aliases by stable source identity, protect removed-route tombstones,
and let the same identity reclaim them on reappearance. Publication mode
requires complete active-entity coverage and rejects missing, mismatched,
stale, incomplete, or conflicting state atomically. A version switcher remains
deferred until a second complete dataset exists.

ADR 0005 resolves the missing official stat-database decision without
fabricating source provenance. A tracked, independently authored versioned
reference source maps all 62 verified damage/resistance/primary/secondary
modifier selectors to names and categories. Modifiers keep their exact source
kind/key/value and optionally resolve `statId`; stat pages expose cross-entity
backlinks and the project-reference boundary. Legacy descriptions, icons, and
disputed formulas remain excluded.

The 2026-08-03 full-project review found and resolved a Windows browser-test
teardown hang by making the loopback test server exit through an explicit,
bounded Playwright teardown handshake. The schema-2 local official-manifest
migration records the reviewed game/build label without committing local
configuration or official content. Input checksums now also come from the exact
byte snapshots used for parsing or first asset registration, eliminating the
old end-of-import reread race. The web now eagerly verifies all three generated
outputs and their cross-file invariants before any loader returns. Numeric XML
fields now use an explicit measured integer/decimal grammar instead of general
JavaScript coercion. Provenance pages now render the complete ordered override
chain, including both source sides and per-step changed fields. This completes
the ordered review queue; work returns to the measured parity roadmap. Detailed
evidence is in
`docs/analysis/full-project-review-2026-08-03.md`,
`docs/analysis/official-manifest-v2-evidence-2026-08-03.md`,
`docs/analysis/input-byte-snapshot-evidence-2026-08-03.md`,
`docs/analysis/eager-artifact-set-verification-evidence-2026-08-04.md`, and
`docs/analysis/numeric-source-lexeme-evidence-2026-08-05.md`, and
`docs/analysis/provenance-override-history-evidence-2026-08-05.md`.

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

Progress through 2026-07-28: a synthetic-backed search route, item/stat detail links, stat backlinks/provenance, explicit no-stat-definition behavior, static recipe details, and bidirectional crafted-by/used-to-craft links are implemented. Item quality passed a separate synthetic, official-data, artifact, patch, and responsive UI review. Item artifact declarations preserve loss-aware quality and remove 108 former unsupported-element diagnostics. Item spell triggers normalize legacy type-specific/direct event shapes, both measured target/self casing forms, and exact extra source flags; all 77 active direct hooks resolve and their 74 compatibility diagnostics are removed. Item use metadata preserves 49 Life/Mana recovery declarations, 21 wand charge ranges, and 64 resolved related triggers, removing another 120 former diagnostics without claiming recovery timing or charge-use behavior. Trap metadata preserves 54 activation/targeting/placement declarations with fully resolved stepped-on spell links, removing all 54 former trap diagnostics without claiming runtime behavior. All 20 canonical gem markers are strict empty classification leaves; unexpected content remains diagnosed and no additional behavior is inferred. Fixed item damage/resistance/primary/secondary modifiers now render on item pages and contribute collision-safe item-stat search facets; 1,584 active modifiers across 506 items remove 599 former direct modifier-element diagnostics without claiming scaling or combat-total formulas. Encrustment entities now normalize tool, visibility, skill level, instability, applicability, ingredient links, signed direct modifiers, named power hooks, and appearance descriptors; the dataset-wide instability-effect pool is separately modeled with linked spells and an explicit boundary around unavailable selection semantics. Static spell details expose loss-aware mana-cost source formulas, ordered animation and impact metadata, ordered buff-local descriptions and halo declarations, spell- and buff-local AI hints, buff lifecycle/stacking parameters, signed direct and sight-radius buff modifiers, linked target/player hit buff event hooks, typed effect-list options, direct effect damage/scaling metadata, controls, and buff-presence conditions, cycle-safe recursive chains, diagnostics, and backlinks from items, spells, buff hooks, abilities, monsters, and shared instability effects. Static skill and ability details expose starting loadouts, progression, signed damage/resistance/primary/secondary modifiers, source flags/tags/recovery/currency values, supported spell-trigger events including dodge hooks, and bidirectional item/spell navigation. Monster profiles normalize dungeon depth/special classification, archetype levels, experience, palette metadata, inherited stat bonuses and AI casting chance, every measured official AI and sight attribute, local dig/dash/charge and sound/sprite presentation metadata, exact one-in on-hit odds, aware/on-death/dash/charge spell hooks, direct named/type-driven drops, and parent/variant/spell/item relationships on static routes. The six primary monster attributes now use a separately evidenced pure domain calculation with effective primary bonuses; conflicting Life, Mana, secondary-stat, and damage formulas remain unavailable. The drop/backlink, AI-metadata, sight/movement/presentation, and primary-attribute slices passed separate code review with deterministic last-declaration-wins monster bonus overrides, strict artifact shapes, adversarial malformed-input coverage, and desktop/mobile checks. All measured official skill/ability and monster child elements are normalized. A general hardening review made integer/boolean parsing strict, reports missing required record metadata, keeps inheritance-cycle members local, coordinates and verifies generated output sets, and limits the home catalogue to a 24-item server-rendered preview. The spell presentation slices normalize all 661 active animation declarations and all 70 active impact declarations, removing 666 former `<anim>` and 71 former `<impact>` diagnostics across active and overridden records. At that earlier checkpoint, the measured compatibility backlog was 2,870 unsupported or partially supported item/spell constructs plus 19 dangling references: 535 item and 2,335 spell diagnostics. The chronological entries below supersede those counts. Thirteen separately tracked spell-requirement diagnostics remain. Detailed sprite prefixes and sound cue IDs stay out of rendered pages while publication rights are unresolved. Item effect/scaling semantics, final spell-effect formulas, and other unsupported nested spell mechanics remain explicit. The acceptance statement remains a draft; the project stat-reference source is now approved and implemented, while disputed monster secondary formulas still need canonical-build evidence and broader legacy comparisons remain.

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

Direct spell-effect `after` metadata now preserves all 16 active declarations
as loss-aware booleans across knock, paralyze, swap, and trigger effects.
Explicit false remains distinguishable from absence, and the spell page
discloses the flag without inferring evaluation order, delay, scheduling, or
trigger timing. This removes all 16 former `after` diagnostics and leaves 154
spell compatibility constructs, 13 separately tracked spell requirements, and
23 dangling references. Evidence is recorded in
`docs/analysis/spell-effect-after-flag-evidence-2026-07-29.md`.

Direct spell-effect `bleed` metadata now preserves all 12 active declarations
as loss-aware booleans on damage effects. The page retains the preserved
application's "Starts bleeding" wording for both the direct flag and the nine
standalone bleed effects, while withholding damage, duration, stacking,
resistance, targeting, and other runtime semantics. This removes all 12 former
`bleed` diagnostics and leaves 142 spell compatibility constructs, 13
separately tracked spell requirements, and 23 dangling references. Evidence is
recorded in
`docs/analysis/spell-effect-bleed-evidence-2026-07-29.md`.

Direct spell-effect skip-animation metadata now preserves all five active
lowercase declarations and accepts the installed validation schema's
camel-cased alias. The page discloses the loss-aware source flag while
withholding animation order, timing, synchronization, target-selection, and
suppressed-sequence semantics. This removes all five former `skipanimation`
diagnostics and leaves 137 spell compatibility constructs, 13 separately
tracked spell requirements, and 23 dangling references. Evidence is recorded in
`docs/analysis/spell-effect-skip-animation-evidence-2026-07-29.md`.

Direct spell-effect presentation now preserves all 33 active `sprite`,
`frames`, `framerate`, `centerEffect`, and `sfx` attributes as one nullable,
loss-aware record. Safe sprite/reference coverage and direct frame/center
values are visible while raw identifiers and sound cues remain hidden; timing,
placement, playback, and other engine behavior remain uninterpreted. This
removes all 33 former direct-effect presentation diagnostics and leaves 104
spell compatibility constructs, 13 separately tracked spell requirements, and
23 dangling references. Evidence is recorded in
`docs/analysis/spell-effect-presentation-evidence-2026-07-29.md`.

Direct spell-effect item targets now preserve all nine active `itemname` /
`itemName` declarations on `spawn` and `spawnitematlocation` effects. Three
targets resolve to normalized items with reciprocal backlinks; six remain
visible source-only labels without fabricated entities or false dangling
warnings. Random selection, inventory placement, availability, and runtime
spawning remain uninterpreted. This removes all nine former target diagnostics
and leaves 95 spell compatibility constructs, 13 separately tracked spell
requirements, and 23 dangling references. Evidence is recorded in
`docs/analysis/spell-effect-item-target-evidence-2026-07-29.md`.

Direct spell-effect monster targets now preserve all 21 active `monsterType`
declarations across 11 `summon` and 10 `summonhostile` effects. All 21 resolve
to normalized monsters with reciprocal backlinks; two additional summon-family
effects intentionally omit the target and remain valid null records.
Availability, allegiance, placement, lifetime, AI state, selection, and runtime
spawning remain uninterpreted. This removes all 21 former target diagnostics
and leaves 74 spell compatibility constructs, 13 separately tracked spell
requirements, and 23 dangling references. Evidence is recorded in
`docs/analysis/spell-effect-monster-target-evidence-2026-07-29.md`.

Direct named buff-removal targets now preserve all 23 active `name`
declarations on `removebuffbyname` effects. All targets resolve to normalized
buff-bearing spells with reciprocal backlinks, while the removal relationship
stays separate from the ordinary recursive trigger chain. Eligibility, actor
or area, evaluation order, timing, stack selection, removal count, removable
flags, and runtime success remain uninterpreted. This removes all 23 former
`name` diagnostics and leaves 51 spell compatibility constructs, 13 separately
tracked spell requirements, and 23 dangling references. Evidence is recorded
in
`docs/analysis/spell-effect-named-buff-removal-evidence-2026-07-29.md`.

Buff-local invisibility metadata now preserves all nine active `<invisible>`
declarations across nine spells. Eight retain source amount `1`, and one
retains a valid unavailable amount because the source omits it. The preserved
application confirms the invisibility label but does not interpret the amount;
the modern page therefore withholds visibility strength, detection, actor
scope, breaking, stacking, duration, targeting, AI, and runtime semantics.
This removes all nine former `<invisible>` diagnostics and leaves 42 spell
compatibility constructs, 13 separately tracked spell requirements, and 23
dangling references. Evidence is recorded in
`docs/analysis/spell-buff-invisibility-evidence-2026-07-29.md`.

Buff-local casting-prevention metadata now preserves all six active `<mute>`
declarations across six spells. Three retain source amount `1`, and three
validly retain an unavailable amount because the source omits it. The
preserved application labels the marker `Prevents Casting` but does not
interpret the amount; the modern page therefore withholds affected actor and
spell-category selection, amount meaning, immunity, resistance, stacking,
duration, removal, and runtime semantics. This removes all six former `<mute>`
diagnostics and leaves 36 spell compatibility constructs, 13 separately
tracked spell requirements, and 23 dangling references. Evidence is recorded
in `docs/analysis/spell-buff-mute-evidence-2026-07-29.md`.

Buff-local polymorph metadata now preserves all four active `<polymorph>`
declarations across four spells. Each declaration retains its source monster
name and all four resolve to normalized monsters with reciprocal backlinks.
The preserved application establishes only the `Polymorph` label and reads
the source `name` as a monster type; the modern page therefore withholds
transformation duration, stat or ability replacement, equipment behavior,
targeting, faction, reversibility, and runtime success. This removes all four
former `<polymorph>` diagnostics and leaves 32 spell compatibility constructs,
13 separately tracked spell requirements, and 23 dangling references.
Evidence is recorded in
`docs/analysis/spell-buff-polymorph-evidence-2026-07-29.md`.

Buff-local spell effects now preserve all 26 active declarations across 11
buffs while retaining their declared scope. Fifteen nested spell targets and
the one named buff-removal target resolve through the same deterministic
linker used by direct effects; effect chains and reciprocal backlinks include
both scopes. Nine effects retain safe hidden presentation metadata, including
one measured large/small icon pair. The page exposes the declarations inside
their owning buff without inferring scheduling, trigger order, buff lifetime,
tick timing, eligibility, or runtime success. This removes all 11 former
nested `<effect>` diagnostics and leaves 21 spell compatibility constructs, 13
separately tracked spell requirements, and 23 dangling references. Evidence is
recorded in
`docs/analysis/spell-buff-effect-evidence-2026-07-29.md`.

Direct environmental spell effects now preserve all six active
`objectSprite` references on `create` effects and all four active `regengfx`
flags on `dig` effects as separate loss-aware fields. The three unique concrete
asset references are safe, available, and registered as deterministic inputs;
all four graphics flags are explicit true values. The page exposes reference
availability and the exact flag without rendering paths or inferring
created-object lifetime, terrain changes, redraw timing, placement,
persistence, or runtime success. This removes all ten former diagnostics and
leaves 11 spell compatibility constructs, 13 separately tracked spell
requirements, and 23 dangling references. Evidence is recorded in
`docs/analysis/spell-effect-environment-metadata-evidence-2026-07-29.md`.

Direct damage effects now preserve all four active `midas` declarations as a
loss-aware source flag. All four declarations come from the base game and are
explicit true values. The installed validation schema declares the field as a
game boolean, while the preserved application ignores it when rendering the
same damage effects. The page exposes the exact flag without inferring gold
conversion eligibility or value, target transformation, drops, persistence,
or runtime success. This removes all four former diagnostics and leaves seven
spell compatibility constructs, 13 separately tracked spell requirements, and
23 dangling references. Evidence is recorded in
`docs/analysis/spell-effect-midas-evidence-2026-07-29.md`.

Buff-local wall-sensing metadata now preserves the one active
`senseWallsFlag` declaration as an ordered, loss-aware game-boolean marker. The
installed validation schema establishes the required boolean source shape,
while the preserved application provides no behavior formula. The spell page
therefore exposes only the exact flag and withholds detection range, revealed
terrain, actor scope, interaction with sight modifiers, stacking, duration,
and runtime success. This removes the former `senseWallsFlag` diagnostic and
leaves six spell compatibility constructs, 13 separately tracked spell
requirements, and 23 dangling references. Evidence is recorded in
`docs/analysis/spell-buff-sense-walls-evidence-2026-08-05.md`.

Buff-local dodge-hook parity now preserves the one active lowercase
`<dodgebuff>` declaration as the existing event-hook relationship kind. Its
100-percent source chance and named spell target are retained, the target
resolves with the existing reciprocal backlink, and malformed or extended
declarations remain source-located diagnostics. The installed validation
schema and preserved application use the `dodgeBuff` casing and establish the
required percentage/name shape plus the `you dodge` label; neither establishes
event eligibility, evaluation order, timing, target selection, or runtime
success. This removes the former `dodgebuff` diagnostic and leaves five spell
compatibility constructs, 13 separately tracked spell requirements, and 23
dangling references. Evidence is recorded in
`docs/analysis/spell-buff-dodge-hook-evidence-2026-08-05.md`.

Buff-local payback parity now preserves the one active `<payback>` declaration
as ordered, loss-aware `secondaryScale` and `paybackF` source parameters. The
installed validation schema establishes the required game-boolean and decimal
shape, while the preserved application does not parse the attributes. The
spell page exposes only those direct values and does not infer a base amount or
source stat, health relationship, damage return, trigger or event timing,
caps, stacking, eligibility, or final formula, or fabricate a link to the
separate spell named `Payback`. This removes the former `payback` diagnostic
and leaves four spell compatibility constructs, 13 separately tracked spell
requirements, and 23 dangling references. Evidence is recorded in
`docs/analysis/spell-buff-payback-evidence-2026-08-05.md`.

Buff-local zorkmid-absorption parity now preserves the one active
`<zorkmidAbsorption>` declaration as ordered, loss-aware
`zorkmidsPerDamage`, `damageCap`, and `maxRatio` source parameters. The
installed validation schema establishes two required signed-byte values and a
required decimal, while the preserved application does not parse the child.
The spell page exposes only the direct values and does not derive a currency
cost or damage-mitigation formula, cap application, target, timing,
eligibility, stacking, duration, or runtime success. This removes the former
`zorkmidAbsorption` diagnostic and leaves three spell compatibility
constructs, all unknown attributes, plus 13 separately tracked spell
requirements and 23 dangling references. Evidence is recorded in
`docs/analysis/spell-buff-zorkmid-absorption-evidence-2026-08-06.md`.

Spell effect buff-tag parity now preserves the one active `buffTag` attribute
as an exact, loss-aware source token on the `moverandomcurse` effect in Dump
Toxic Assets. The installed validation schema permits an optional string on
the general effect shape, while the preserved application has no dedicated
selector or parser for the attribute. The spell page exposes the token without
linking it or inferring tag matching, buff or curse selection, removal
behavior, target scope, evaluation order, timing, or runtime success. This
removes the former `buffTag` diagnostic and leaves two compatibility
constructs, both `level` attributes on spell requirements, plus 13 separately
tracked spell requirements and 23 dangling references. Evidence is recorded
in `docs/analysis/spell-effect-buff-tag-evidence-2026-08-06.md`.

Spell requirement-level parity now preserves the two active `level="1"`
attributes on the Oil Slick and Oil Slick2 mana declarations as nullable
signed-byte `sourceLevel` values. The installed validation schema establishes
the source shape, while the preserved application ignores the attribute. The
spell page therefore exposes the exact source value without inferring an actor,
unlock, eligibility, progression, or other engine rule. At that checkpoint this
removed the final two constructs visible to the child/effect/requirement audit;
13 non-mana spell requirement diagnostics and 23 dangling references remained
explicit. The later root spell audit below supersedes the former zero-backlog
claim. Evidence is recorded in
`docs/analysis/spell-requirement-level-evidence-2026-08-06.md`.

Spell shield-requirement parity now preserves the three active exact
`shield="1"` declarations on Tortoise Maneuver, Defensive Bash, and Duck And
Cover! as ordered nullable source flags. The installed schema restricts
`dredbool` to `0` or `1`, while the preserved application does not read or
present the shield attribute. The spell page exposes the exact flag without
inferring an actor, equipment state, eligibility rule, timing, or runtime
success. This removes three non-mana requirement diagnostics; ten remain (one
weapon, six booze, and three zorkmid shapes), alongside 23 dangling references.
Evidence is recorded in
`docs/analysis/spell-shield-requirement-evidence-2026-08-06.md`.

Spell weapon-requirement parity now preserves the one active exact
`weapon="0"` declaration on Liechtenauer's Overhau as an ordered nullable
source flag. The installed schema restricts `dredbool` to `0` or `1`, while
the preserved application does not read or present the weapon attribute. The
spell page exposes the exact flag without inferring an actor, equipped item
state, weapon category, eligibility rule, timing, or runtime success. This
removes one non-mana requirement diagnostic; nine remain (six booze and three
zorkmid shapes), alongside 23 dangling references. Evidence is recorded in
`docs/analysis/spell-weapon-requirement-evidence-2026-08-06.md`.

Spell booze-requirement parity now preserves all six active exact
`booze="..."` declarations as ordered nullable signed-byte source values. The
installed schema establishes the byte shape, while the preserved application
does not read or present the attribute. The spell page exposes the exact value
without inferring an actor, inventory or consumption state, eligibility rule,
timing, or runtime success. Supporting this family also moves generic
unsupported-requirement diagnostics to the declaring requirement location.
Six non-mana requirement diagnostics are removed; three zorkmid shapes remain,
alongside 23 dangling references. Evidence is recorded in
`docs/analysis/spell-booze-requirement-evidence-2026-08-09.md`.

Spell zorkmid-requirement parity now preserves all three active declarations
as ordered, loss-aware positive-integer `zorkmids` plus decimal
`zorkmidScaleF` and `savvyBonus` source values. The installed schema
establishes those source types, while the preserved application does not read
the currency fields or establish a usable cost formula. The spell page exposes
the exact fields without combining them into a cost or Savvy formula or
inferring an actor, available currency, payment, eligibility, timing, or
runtime success. This removes the final three spell-requirement diagnostics;
the canonical warnings are now exactly 23 dangling references. Evidence is
recorded in
`docs/analysis/spell-zorkmid-requirement-evidence-2026-08-09.md`.

The complete dangling-reference warning set is now classified before any
correction is applied. Twenty-three source declarations reduce to nine
owner/reference pairs and seven labels: 16 `lockpick` loadouts plus two
`Spores` options are engine/source-only candidates; `Acidium Salis` is a
probable source typo for the active `Acidum Salis` item; the Satanic Locator
target is a deliberate placeholder; and the two `Strong Lingering ...`
monster spells plus Deep Raven's `Eye Lasers` spell label remain ambiguous.
A generic loss-aware relationship contract now preserves original labels and
distinguishes exact links, reviewed corrections, reviewed source-only labels,
and unresolved targets. Named skill loadouts are its first integrated consumer;
the canonical set originally had 47 exact and 16 unresolved named loadouts,
plus 13 type-only loadouts without an item relationship. The owner subsequently
approved the 16 `lockpick` loadouts and two `Spores` options as reviewed
source-only item labels. Named spell item-list options now use the same
contract; the canonical relationship split is 47 exact plus 16 source-only
named loadouts, and 189 exact plus one reviewed correction plus two source-only
item-list options. Eighteen source-only informational records replace those
former dangling warnings without creating entities or routes. The owner also
approved the owner/source/version/relationship/label/target-scoped `Acidium
Salis` correction to `Acidum Salis`; it adds one reviewed backlink without
patching game data or creating a fuzzy alias. The canonical relationship warning
set is now four declarations, with 90 informational records. Evidence is recorded in
`docs/analysis/dangling-reference-classification-2026-08-09.md` and
`docs/analysis/relationship-reviewed-correction-evidence-2026-08-09.md`.

Targeting-template parity now includes searchable static detail routes, strict three-character grid validation, responsive visual previews, assistive descriptions, anchor inclusion, provenance, and reciprocal spell relationships. Root spell attributes are now audited rather than silently discarded. The measured targeting family contains 105 canonical `templateID` declarations, one lowercase `templateid` source alias, and 42 explicit `anchored` flags; all 106 active template spells resolve to normalized templates. The cooldown family recognizes all 133 source-candidate `downtime` declarations; 131 active spells retain the effective exact loss-aware value. The melee-attack family recognizes all 40 source-candidate `attack="1"` declarations; 39 active spells retain the effective true flag. The mine family recognizes all 71 source-candidate root declarations and preserves 70 effective active records across exact mechanic, placement, and hidden presentation fields without treating the measured `minePermanent="2"` value as boolean. These values are presented without inferring engine behavior. The remaining root audit exposes 218 compatibility warnings across six case-insensitive attribute families for later feature-by-feature classification. The full canonical import therefore reports 0 errors, 222 warnings, and 90 informational records. Evidence is in `docs/analysis/spell-targeting-template-evidence-2026-08-11.md`, `docs/analysis/spell-cooldown-evidence-2026-08-11.md`, `docs/analysis/spell-melee-attack-evidence-2026-08-11.md`, and `docs/analysis/spell-mine-declaration-evidence-2026-08-11.md`.

Structured search now exposes all nine generated entity kinds rather than discarding recipes, encrustments, skills, abilities, spells, and monsters at the web boundary. Query text is locally buffered for immediate, lossless typing and written to the shareable URL after a short pause; sequential-input, keyboard-navigation, mobile, and axe coverage exercise the interaction. A server-rendered browse directory and 100-record static catalogue pages now expose every kind and direct detail link without JavaScript, with consistent primary navigation, breadcrumbs, empty states, keyboard coverage, and axe coverage. Project-owned name/route-alias spelling suggestions now appear only for zero-result queries, honor active filters, remain capped at five, and update the query only after the user selects one. The stat filter now covers direct item, ability, spell, and encrustment declarations through canonical reference keys while retaining unresolved selectors and historical selector-shaped URL aliases. It deliberately leaves inherited monster bonuses on stat-page backlinks and does not infer a cross-scope strength ranking. Deterministic compact serialization reduces the same 2,829-document canonical search artifact from 1,477,801 to 1,180,204 bytes without changing schema or behavior, restoring 319,796 bytes of raw budget headroom. ADR 0003's unchanged transfer, parsing, ordinary/suggestion query, desktop, and 4x-CPU mobile-browser budgets all pass. Evidence is in `docs/analysis/search-spelling-suggestions-evidence-2026-07-29.md`, `docs/analysis/search-response-budgets-evidence-2026-08-09.md`, and `docs/analysis/cross-entity-stat-search-evidence-2026-08-09.md`.

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

The single-version MVP uses `1.1.5 public_beta`. A version switcher waits for a
second complete, verified dataset. The first local visual-parity slice now
copies and renders only normalized item PNG icons through a checksummed,
manifest-coordinated, ignored asset set; the canonical build maps all 763 items
to 722 unique files without fallbacks. Extend that importer only when another
implemented page displays a concrete asset. Specialized sprite treatment is
still decided per page rather than imported speculatively.
Engine mechanics absent from XML are evaluated individually immediately before
implementation and may be supported when repeatable evidence verifies them.

The first source/collision explorer is implemented as the static `/dataset/`
route. It lists every active source/version/precedence declaration, groups the
verified import diagnostics without altering them, links findings to active
records, and makes all ordered override steps and reviewed patches discoverable
across entity kinds. The ignored canonical dataset has 36 affected records and
71 override steps. This completes active-dataset decision visibility; choosing
between complete datasets and broad mod workflows remain later capabilities.
Evidence is in
`docs/analysis/dataset-health-and-source-decisions-evidence-2026-08-09.md`.

The remaining valuable legacy stat-search navigation is implemented without
adopting the preserved app's loosely typed amount ranking. The canonical
filter exposes 61 used definitions across 1,350 item, ability, spell, and
encrustment records, stays within the accepted search budgets, and preserves
raw selector URL aliases. The single legacy Meta view still depends on the
separate disputed monster-damage formula decision.

### Exit criteria

All agreed parity concepts have stable routes, tested relationships, provenance, and diagnostics. Any intentionally dropped legacy feature is documented. The preserved `legacy/` application may then be archived or removed in a dedicated change.

## Phase 5 — Differentiating tools

Candidate order is intentionally unprioritized until parity polish:

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
- Document permission or another reviewed legal basis before any official
  dataset or imported official asset is deployed.
- Security headers/dependency review at the chosen hosting layer.
- Sitemap, robots policy, canonical metadata, 404s, asset caching, and performance budgets.
- Dataset/version health page and release changelog.
- Backup/rollback and domain ownership documentation.
- Remove or clearly archive obsolete deployment and PWA instructions.

### Exit criteria

Production can be rebuilt from documented inputs, release checks are automated, restricted data is excluded, and rollback is proven.

## Later decision gates

Accounts, synchronized builds/favorites/lists, community annotations, a public API, and a database remain outside this roadmap until usage evidence justifies their privacy, moderation, security, and operational costs.
