# New PC and Codex handoff

Updated: 2026-07-29

This is the durable handoff for moving Dredmorpedia to another computer or opening it in a new Codex task with no chat history. Canonical product and architecture documents remain authoritative; this guide summarizes the state needed to resume safely.

## Resume checklist for Codex

1. Read `AGENTS.md` completely and follow it.
2. Read `PROJECT.md`, the dated repository audit, modernization proposal, roadmap, data/asset policy, and ADRs 0001–0003.
3. Run `git status -sb`, `git log --oneline --decorate -5`, and `git remote -v` before changing anything.
4. Run `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/audit-legacy.ps1` to confirm the preserved baseline.
5. Install the pinned workspace and run `pnpm generate:check` plus `pnpm check`. Run `pnpm test:e2e` when Chromium is installed.
6. Ask the owner for the local game-installation path only if the next task needs read-only integration measurements. Do not assume the path from the previous computer still applies, and never commit it.

A useful first prompt on the new machine is:

> Read `AGENTS.md` and `docs/handoff/new-pc-and-codex.md` completely, inspect Git status, and continue from the documented next milestone. Treat the game installation as read-only and do not push or publish anything without my request.

## Repository identity and state

- Canonical GitHub repository: `https://github.com/dredmorpedia/dredmorpedia.git`.
- Working branch: `master`.
- Latest parity checkpoint summarized by hash: `42db351` (`Model spell effect damage scaling`). The subsequent domain determinism/test hardening is described below; use `git log` to confirm the latest live branch state.
- `ed71652` relocated all 1,450 tracked legacy files under `legacy/` as exact renames with no content changes.
- `4fa3d8a` added the modernization analysis, project/agent guidance, roadmap, ADR process, data policy, and repeatable audit.
- The transfer-handoff commit containing this document follows those commits. Use `git log` rather than relying on this document for its own hash.
- The modern workspace contains `apps/web`, `packages/domain`, `packages/data-pipeline`, and `fixtures/synthetic`. Tracked tests and public preview content use only independently authored fixtures.
- Dataset schema 3 separates normalized records from search schema 2; search documents now carry ordered route aliases for project-owned zero-result spelling suggestions. Output-manifest schema 2 checksums normalized, search, and diagnostic outputs and is published last as the output-set commit marker. The web consumer verifies checksums, complete schemas, safe route/asset-reference shapes, unique same-kind canonical/alias ownership, search derivation, and diagnostic counts before rendering. Source-manifest schema 2 declares dataset/source versions, guarded patch overlays, and an optional version-scoped route registry. The web application has deterministic collision-safe item/stat/recipe/encrustment/skill/ability/spell/monster routes, bounded static browse catalogues for every kind, registered historical aliases, source-ID aliases, versioned patch provenance, shareable project-owned search across every generated entity kind with resilient debounced query URLs, fixed item-modifier facets, and bounded user-selected typo recovery, item/stat/crafting/encrusting/loadout/spell/monster-family/drop backlinks, signed item damage/resistance/primary/secondary modifiers, loss-aware spell mana/buff parameters, buff-local descriptions/halos/AI hints, typed effect-list options, direct effect damage/scaling metadata, controls, and linked buff conditions, signed spell-buff direct and sight-radius modifiers, linked target/player hit buff event hooks, normalized item/ability/monster spell triggers, monster core profiles with local AI/sight/dig/dash/charge and sound/sprite presentation metadata plus direct drops, direct encrustment outcomes, a separately modeled shared instability-effect pool, and explicit missing-definition/reference/cycle states.
- Synthetic desktop/mobile keyboard and axe checks pass. At the latest checkpoint, all 36 browser tests remain the interaction baseline, while 150 unit/artifact tests in `pnpm check`, deterministic official generation, and the complete 2,857-page local official export pass. Read-only full-dataset import/build/query measurements are recorded without the local installation path or official content.
- Item use metadata preserves Life/Mana recovery declarations, exact extra food source flags, wand charge ranges, and loss-aware trap activation/targeting/placement declarations; potion, mushroom, and trap leaves are fully validated. Armour metadata separately preserves loss-aware slot, level, and optional `randoms` declarations. Complete weapon leaves combine existing category/quality/fixed-damage/hit relationships with loss-aware floor-target and safe hidden thrown-presentation metadata. Recovery timing, charge consumption, trap runtime behavior, random-stat selection, equipment formulas, weapon recoverability/combat formulas, and neutral flag behavior remain deliberately uninterpreted.
- Generated artifacts remain ignored under `data/generated/`. Dependencies and Playwright browser downloads are local machine state and are not transferred through Git.
- `pnpm dev`/`pnpm dev:synthetic` regenerate and serve the tracked synthetic fixture; `pnpm dev:official` regenerates and serves the ignored canonical artifact from the ignored local manifest. `pnpm generate:official:check` and `pnpm build:official` provide deterministic import-only and full-static-build verification. Every official command enables the zero-error publication gate and preserves the previous output set if the import reports an error. These root commands explicitly select their artifact; optional direct web commands may use an ignored `apps/web/.env.local` copied from the tracked example.
- `pnpm audit:dependencies` checks the production dependency graph against the live advisory database. The current graph uses Next.js 16.2.12 plus reviewed PostCSS and Sharp overrides and reports no known vulnerabilities; weekly Dependabot updates and a separate scheduled dependency-audit workflow provide ongoing coverage.
- Development servers omit the production-only static-export mode so a stale URL from another selected dataset reaches the accessible dataset-neutral 404 page. Production and official builds still require `output: "export"` and prove every generated route statically.
- The preserved application is served with `legacy/` as its document root and must remain runnable until parity is demonstrated.
- Tool-owned auxiliary checkouts under `.claude/worktrees/` are excluded from both Git status and Prettier traversal. Run checks inside an auxiliary checkout when working there; the root `pnpm check` intentionally validates only the current checkout.
- Recheck the working tree rather than assuming it is clean. Root-level `MANIFEST.txt` and `RESTORE.md` files extracted from a transfer package are ignored handoff artifacts; the canonical current handoff remains this tracked document. Keep the extracted files only while their old checksums or restore snapshot are useful, and do not treat them as current project documentation.

The local commits do not need to be pushed before transfer. A Git bundle includes them. Pushing to GitHub is a separate owner-approved action.

## Confirmed decisions from the owner conversation

| Area | Confirmed direction |
| --- | --- |
| Rebuild | Build the replacement from scratch; use legacy behavior and data rules as evidence, not as the target architecture. |
| Coverage | Complete useful legacy functional/content coverage before the project becomes primarily an improvement effort. Vertical slices are delivery steps, not a reduction of the parity target. |
| Official sources | Use `1.1.5 public_beta` with the base game and all three official expansions for the MVP. Keep mod support architecturally possible, but broad mod support is the lowest initial priority. Postpone a dataset-version switcher until a second complete, verified dataset exists. |
| Platform | Continue with the implemented pnpm/strict TypeScript spike, deterministic Node data pipeline, framework-independent domain layer, and Next.js App Router/React web app. ADRs 0001 and 0002 are Accepted within the local-only product boundary. |
| Rendering/hosting | Start with static export and validate GitHub Pages as the leading free-hosting candidate without hard-coupling the project to it. |
| Styling/components | Use Tailwind CSS plus project-owned design tokens and selectively copied shadcn/ui components backed by Base UI. Create a modern interface rather than copying the legacy design, while retaining enough game-inspired character that approved official icons/images do not look out of place. Add only components required by a product slice and treat their source as maintained web-layer code. |
| Local assets | Build an incremental, read-only importer that copies only assets referenced by entities/features currently presented into an ignored generated-assets output. Aim for the same meaningful entity art the legacy product used for parity; do not bulk-copy unrelated assets. |
| Publication | Build a locally complete product first. Official XML, generated official datasets, and copied official assets remain ignored and non-public while public-release permission is unresolved. Selected screenshots may support a permission request but do not grant publication rights. |
| Licensing | New modern-project material is intended to use MIT terms. `legacy/`, official content and derivatives, bundled mods, and inherited assets are excluded. Add scoped license files after the owner supplies exact copyright-holder wording. |
| Themes | Support light, dark, and system modes from the first real UI foundation. |
| Language | Ship in English initially. Do not add localized routes, translation catalogs, a language selector, or manually translated game content without a maintained source and plan. Keep canonical game text separate from interface copy so localization can be added later without changing record identity. |
| First improvements | Do not choose post-parity improvements yet. Revisit richer filters, technical-detail disclosure, tagging, favorites, and lists during parity polish against concrete pages. |
| Persistence | Do not choose local storage, accounts, or a database prematurely. Favorites/lists need a later persistence and portability decision. |
| Community | No community or social features are planned for the initial project. |
| Live tracking | Potentially valuable, but it is a separate later research track. It must prove what game/save/runtime state is observable and remain read-only, safe, and privacy-preserving. |
| Collaboration | The owner intends to build the project with Codex over time. Keep decisions, commands, risks, and progress in the repository. For unresolved decisions, use focused Q&A and explain concerns/tradeoffs plainly. |

## Non-negotiable data boundary

The game installation is read-only. Inspection and hashing are allowed; editing, patching, formatting, renaming, moving, deleting, or writing inside it are not. Approved inputs may be copied into a separate gitignored workspace when a task requires it.

Do not commit or publish official databases/assets, local paths, generated official derivatives, credentials, or additional bundled-mod derivatives. The canonical measurement baseline is `1.1.5 public_beta`, Steam app `98800`, build `22934623`, internal branch key `public_beta`, with all three official expansions. Local use is the accepted current boundary; any future public release still requires permission evidence. The intended MIT scope excludes inherited code, bundled mods/assets, and official content, whose provenance and license treatment remain separate.

The full policy is in `docs/data-and-assets-policy.md` and overrides any historical mutation instructions preserved under `legacy/`.

## Known baseline

The repeatable legacy audit should report:

- 1,450 files in `legacy/`;
- 19 first-party JavaScript files and 6,170 lines;
- 83 XML files: 82 valid and one known invalid file at `legacy/windmagic/mod/spellDB.xml`;
- 28 missing official database files in a clean checkout, which is expected because proprietary data is excluded.

The invalid Wind Magic XML and missing official databases are baseline evidence, not cleanup tasks. Strict audit switches intentionally fail for them.

## Immediate next milestone

Continue toward local parity without assuming permission to publish official content:

1. Resume the measured spell-mechanic backlog. For engine behavior absent from XML, establish an individual evidence-backed contract immediately before implementation rather than blanket-accepting or rejecting legacy formulas.
2. Settle ADR 0003 response budgets and broader concrete relevance examples
   with desktop/mobile measurements; the approved spelling-suggestion behavior
   is implemented.
3. Implement the approved incremental local asset importer with containment validation, checksums, diagnostics, ignored output, and only assets referenced by currently presented entities/features.
4. Enforce ADR 0004's inherited route-registry lifecycle before a dataset is durably shared/published or a second version is introduced.
5. Review and approve or revise `docs/product/first-parity-slice.md`, and decide how official stat definitions are sourced or modeled: the measured build has item/spell stat references but no standalone `statDB.xml`. Do not invent descriptions or provenance.
6. Keep disputed monster Life, Mana, secondary-stat, and damage formulas unavailable until the documented source conflicts are resolved against the canonical build; all measured official monster child elements and the six independently evidenced primary attributes are already implemented.
7. Treat the current 154 unsupported/partially-supported spell constructs and 23 dangling references as the measured compatibility backlog, not as silently completed parity. Thirteen non-mana/extra-attribute requirement diagnostics are tracked separately. No item compatibility diagnostic remains after the fixed-modifier, artifact, trigger, use/trap, gem, armour, weapon, macguffin, and toolkit slices. Unsupported nested spell mechanics remain explicit. No measured official skill/ability or monster child element remains unsupported.
8. The first bounded maintenance extraction is complete: the unchanged spell-detail browser flow now has a dedicated spec, all 34 desktop/mobile cases still pass, and the full synthetic/official gates remain green. Make any further extraction behavior-preserving and tied to the selected parity boundary.

Architecture and foundation results are in `docs/analysis/architecture-spike-2026-07-19.md` and `docs/analysis/first-parity-foundation-2026-07-19.md`. Generated official-derived output remains ignored and non-public.

Targeting-template parity now has static, searchable, accessible routes with strict grid-shape validation. Spell mana-cost, buff source-parameter, and buff hit-event relationship parity subsequently reduced the compatibility backlog to the counts above.

## Item-quality review completed

The item-quality slice passed its separate code review on 2026-07-21. Read-only comparison against all 763 official item records found zero mismatches: 257 weapon records use root `level`, 268 armour records use nested `<armour level>`, 54 trap records use nested `<trap level>`, and 184 other records use zero. The last group includes 68 food/potion records with unrelated root levels that must not be displayed as quality. Patch validation now permits only non-negative integers, current web consumers reject stale schema 3 artifacts without valid quality, and the reviewed card/detail layouts have no horizontal overflow at desktop or 390-pixel mobile widths. Synthetic generation, full workspace checks, desktop/mobile Playwright flows, and axe checks remain the repeatable regression evidence.

## Item stat modifier slice completed

Item records now preserve fixed weapon damage and direct damage/resistance/primary/secondary modifier declarations in the shared finite signed-modifier shape. Item pages separate named stats from direct modifiers, numeric primary/secondary IDs remain explicit rather than fabricated definitions, and structured search exposes collision-safe modifier facets. The ignored canonical artifact contains 1,584 modifiers across 506 of 763 active items: 480 damage, 255 resistance, 122 primary, and 727 secondary, with at most 12 per item. Supporting the four direct modifier-element families removes 599 former diagnostics, reducing the measured compatibility backlog to 911 item plus 2,333 spell constructs. Damage factors and item effect semantics remain diagnosed and unavailable. Evidence is recorded in `docs/analysis/item-stat-modifier-evidence-2026-07-22.md`.

## Item category slice completed

Item category facets now derive from verified source shapes rather than exposing the overloaded root XML type. Stable keys have project-owned display labels on home, search, and detail routes. The ignored canonical artifact classifies all 763 active items into 31 meaningful categories with no bare numeric or `unknown` category values, and every item search document matches its normalized record. Category derivation does not suppress diagnostics for unmodeled fields inside partially supported item elements. Evidence is recorded in `docs/analysis/item-category-evidence-2026-07-22.md`.

## Item artifact slice completed

Direct item artifact declarations now preserve ordered, loss-aware non-negative qualities. The item page displays the declaration only when present, while invalid or missing supplied quality remains visibly unavailable and diagnosed. The ignored canonical artifact contains 108 valid declarations across 108 active items, spanning qualities 1 through 27. Supporting this verified shape removes all 108 former unsupported `<artifact>` diagnostics and reduces the measured compatibility backlog to 803 item plus 2,333 spell constructs. Evidence is recorded in `docs/analysis/item-artifact-evidence-2026-07-22.md`.

## Item direct-trigger slice completed

Direct item melee-target, melee-self, crossbow, thrown, and kill hooks are now fully normalized with both measured target/self casing forms. The shared item/ability trigger contract preserves ordered exact source flags, and item/ability pages display them without assigning engine timing semantics. The ignored canonical artifact contains 77 fully resolved direct hooks within 230 total item triggers; three formerly ignored lowercase aliases now resolve, and one kill hook retains `after=1`. Supporting the verified leaves removes all 74 associated compatibility diagnostics and reduces the measured backlog to 729 item plus 2,333 spell constructs. Evidence is recorded in `docs/analysis/item-direct-trigger-evidence-2026-07-23.md`.

## Item use metadata slice completed

Item pages now expose ordered, loss-aware Life/Mana recovery source values and wand minimum/maximum charge ranges, while exact extra food flags remain neutral key/value metadata. Food, wand, potion, mushroom, and mushroom-associated casts leaves are fully validated. The ignored canonical artifact contains 49 recovery declarations, 21 valid charge ranges, and 64 fully resolved related item triggers. Supporting these leaves removes 120 former compatibility diagnostics and reduces the measured backlog to 609 item plus 2,333 spell constructs. Recovery timing, charge consumption, and `meat` behavior remain explicitly uninterpreted. Evidence is recorded in `docs/analysis/item-use-metadata-evidence-2026-07-23.md`.

## Item trap metadata slice completed

Item pages now expose loss-aware trap activation, level, caster-targeting, and placement-source coverage while retaining the existing stepped-on spell relationship. Raw origin asset paths remain in ignored artifacts and are summarized rather than rendered. The ignored canonical artifact contains 54 active declarations: 45 `once`, 9 `always`, 2 caster-targeting flags, 9 safe origin references, and 54 fully resolved spell links. Supporting the complete verified leaf removes all 54 former trap diagnostics and reduces the measured backlog to 555 item plus 2,333 spell constructs. Reset timing, target selection, and placement behavior remain explicitly uninterpreted. Evidence is recorded in `docs/analysis/item-trap-metadata-evidence-2026-07-23.md`.

## Item gem marker slice completed

The pipeline now strictly validates `<gem>` as an empty item-classification leaf while keeping the existing `gem` category as its complete normalized representation. All 20 canonical markers match that shape, so the slice removes all 20 former gem diagnostics and reduces the measured backlog to 535 item plus 2,335 spell constructs. Unexpected attributes or children remain diagnosed, and no additional gem behavior is inferred. The full synthetic, desktop/mobile browser, and ignored official-build checks pass. Evidence is recorded in `docs/analysis/item-gem-marker-evidence-2026-07-28.md`.

## Item armour declaration slice completed

Items now preserve ordered, loss-aware armour slot, level, and optional `randoms` source values. The item page exposes those direct declarations while withholding random-stat selection and equipment formulas, and the strict importer/artifact boundary diagnoses malformed or extended shapes. All 268 canonical declarations satisfy the contract, removing all 268 former armour compatibility diagnostics and reducing the measured backlog to 267 item plus 2,335 spell constructs. Evidence is recorded in `docs/analysis/item-armour-declaration-evidence-2026-07-28.md`.

## Item weapon declaration slice completed

All 257 canonical weapon leaves are now complete across semantic category, root quality, 452 fixed damage values, 35 resolved hit triggers, and ordered loss-aware weapon declarations for 20 floor-target flags and 28 safe hidden presentation references. The strict importer accepts both measured floor-target spellings and diagnoses invalid booleans, unsafe paths, text, nested content, and scaling/extension attributes. The item page discloses direct floor-target/reference coverage without showing raw paths or inferring recoverability or combat formulas. This removes all 257 former weapon compatibility diagnostics and reduces the measured backlog to 10 item plus 2,335 spell constructs. Evidence is recorded in `docs/analysis/item-weapon-declaration-evidence-2026-07-28.md`.

## Item macguffin declaration slice completed

Both canonical macguffin leaves now preserve ordered loss-aware spell, item-class-name, and consumable source values. Resolved spells link both ways; the source's `non-existant-spell` target remains visible and raises the measured dangling-reference count to 20. Strict importer and web schemas diagnose malformed or extended shapes, while item pages explicitly withhold activation, targeting, and actual-consumption claims. This removes both former macguffin compatibility diagnostics and leaves 8 `toolkit` plus 2,335 spell constructs. Evidence is recorded in `docs/analysis/item-macguffin-declaration-evidence-2026-07-28.md`.

## Item toolkit declaration slice completed

All eight canonical toolkit leaves now preserve ordered loss-aware crafting tags, slot counts, sound cues, safe presentation references, layout rectangles, controls, and close positions. Matching tags link toolkit items bidirectionally with all 374 recipes and 57 encrustments, while detailed cue IDs, raw references, and old game-interface coordinates remain hidden and do not control the modern UI. Strict importer and web schemas diagnose malformed or extended shapes. This removes the final eight item compatibility diagnostics and leaves 2,335 spell constructs. Evidence is recorded in `docs/analysis/item-toolkit-declaration-evidence-2026-07-28.md`.

Spell buff descriptions, buff halos, and spell/buff AI hints are now strict ordered metadata families. Spell effect-list options subsequently preserve all 276 measured declarations under 45 typed list effects: 192 item options and 84 spell options. All spell options and 189 item declarations resolve; three item declarations remain visibly dangling. Reciprocal spell/item links are exposed without inferring selection or runtime behavior. This removes the 45 former nested `<option>` diagnostics and leaves 2,158 spell compatibility constructs, 13 separately tracked spell requirements, and 23 dangling references. Evidence is recorded in `docs/analysis/spell-effect-list-option-evidence-2026-07-28.md`.

Direct spell-effect controls now preserve 795 active chance, caster/self/corpse, resistance, burn, and taxonomy values across 711 effects and 403 spells. Both measured chance and caster aliases normalize loss-aware; explicit false and 100-percent values are retained, malformed or simultaneous aliases remain diagnosed, and the UI does not combine the fields into targeting, resistance, ignition, or runtime probability behavior. This removes 799 source-candidate effect-attribute diagnostics and leaves 1,359 spell compatibility constructs, 13 separately tracked spell requirements, and 23 dangling references. Evidence is recorded in `docs/analysis/spell-effect-control-evidence-2026-07-28.md`.

Direct trigger/damage-over-time buff conditions now preserve 16 active source-buff requirements, 49 required named-buff pairs, and eight forbidden named-buff pairs across 73 effects and 38 spells. Both measured source-buff casing aliases normalize loss-aware; all 57 named targets resolve with reciprocal backlinks, while malformed pairs and unsupported effect types remain diagnosed. This removes 130 former direct-effect attribute diagnostics and leaves 1,229 spell compatibility constructs, 13 separately tracked spell requirements, and 23 dangling references without inferring buff-presence evaluation, trigger eligibility, duration, consumption, or timing. Evidence is recorded in `docs/analysis/spell-effect-buff-condition-evidence-2026-07-28.md`.

Direct spell-effect damage/scaling metadata now preserves 605 active damage declarations across 433 effects: 586 base amounts, 294 factor coefficients, and 19 factor-only declarations. It also preserves 15 amount factors, two floor factors, 23 primary source IDs, and 67 secondary source IDs across 106 effects. Strict type-specific normalization supports both measured primary-selector casing forms, preserves malformed declarations loss-aware, and does not combine the fields with undeclared defaults or infer final damage, healing, mana, spawn, resistance, armour, or rounding formulas. This removes 990 former effect-attribute diagnostics and leaves 239 spell compatibility constructs, 13 separately tracked spell requirements, and 23 dangling references. The full workspace passes 123 unit/artifact tests, all 34 desktop/mobile browser cases, byte-identical synthetic and official generation, the 43-page synthetic export, and the 2,857-page official local export. Evidence is recorded in `docs/analysis/spell-effect-damage-scaling-evidence-2026-07-28.md`.

Direct spell-effect duration metadata now preserves all 69 active `turns`
declarations across 69 effects and 68 spells. Strict loss-aware normalization
and the web artifact guard accept non-negative integers and reject malformed
values; the page discloses source turn counts without inferring countdown,
stacking, refresh, removal, or scheduling behavior. This removes 69 former
effect-attribute diagnostics and leaves 170 spell compatibility constructs, 13
separately tracked spell requirements, and 23 dangling references. The full
workspace passes 143 unit/artifact tests, all 34 desktop/mobile browser cases,
byte-identical synthetic and official generation, the 43-page synthetic
export, and the 2,857-page official local export. Evidence is recorded in
`docs/analysis/spell-effect-duration-evidence-2026-07-29.md`.

Direct spell-effect `after` metadata now preserves all 16 active declarations
as loss-aware booleans. Explicit false remains distinct from absence, and the
spell page discloses the direct flag without inferring evaluation order, delay,
scheduling, or trigger timing. This removes all 16 former `after` diagnostics
and leaves 154 spell compatibility constructs, 13 separately tracked spell
requirements, and 23 dangling references. Evidence is recorded in
`docs/analysis/spell-effect-after-flag-evidence-2026-07-29.md`.

The review-hardening checkpoints give generated search documents a total `(kind, name, id)` order; cover equal-precedence source resolution, missing monster parents, three-level inheritance, and genuinely negative derived primary totals; replace all 94 domain/pipeline locale-collation calls with one fixed UTF-16 code-unit comparator; complete the remaining diagnostic, source-resolution, and instability-effect tiebreakers; validate normalized asset paths before root probing, including the future empty-root caller edge; make path rejection host-independent for POSIX absolute, Windows absolute/drive-relative, and traversal forms; enforce safe route/asset-reference shapes plus unique same-kind canonical/alias ownership at the web boundary; and document the trusted source-manifest root exception with a paired containment regression. Locale-aware ordering remains only in web presentation. `pnpm.cmd check` passes all 142 unit/artifact tests and the 43-page synthetic export; the byte-identical ignored canonical dataset passes deterministic generation with 763 items, 2,767 search documents, 0 errors, 275 warnings, and 71 informational decisions. Route-registry lifecycle policy is the review's only remaining medium finding. Evidence is recorded in `docs/analysis/icu-independent-output-ordering-evidence-2026-07-28.md`, `docs/analysis/comparator-totality-evidence-2026-07-29.md`, `docs/analysis/asset-path-validation-evidence-2026-07-29.md`, `docs/analysis/web-route-artifact-boundary-evidence-2026-07-29.md`, `docs/analysis/asset-reference-artifact-boundary-evidence-2026-07-29.md`, and `docs/analysis/source-root-trust-boundary-evidence-2026-07-29.md`.

The source-manifest trust assumption is explicit: a trusted local manifest may
name an absolute external read-only game-installation root, while each declared
database path remains real-path-contained beneath it and generated output
sanitizes the machine-local root.

All nine entity alias routes now keep the detail-header `<h1>` before the
alias-note `<h2>` in document order. The canonical-link notice and `noindex`
metadata remain unchanged, and the alias browser flow guards the heading
sequence.

All source-token title casing in item, recipe, encrustment, skill, spell,
monster, and stat-modifier presentation now uses one focused, tested web
helper. Repeated separators and surrounding whitespace no longer produce
route-specific label differences. The full workspace and all 34
desktop/mobile browser cases pass.

## Spell relationship slice completed

Static spell details now expose loss-aware mana-cost source formulas, ordered animation and impact source metadata, ordered buff declarations with lifecycle/stacking parameters and signed direct and sight-radius modifiers, target/player hit event hooks, direct effects, resolved or dangling spell/stat targets, provenance, diagnostics, and deterministic backlinks from spells, buff hooks, items, abilities, and the shared instability pool. Mana declarations preserve base cost, both measured Savvy-coefficient casing variants, and optional minimum cost; non-mana requirement shapes stay explicitly diagnosed, and final runtime rounding is not inferred. Animation and impact declarations remain separate while preserving safe sprite prefixes, optional frame parameters, centering/synchronization flags, and symbolic sound cues without assigning timing units or rendering detailed references. Buff declarations preserve measured attribute/element casing aliases, presentation paths, exact additional source flags, numeric primary/secondary IDs, signed sight-radius declarations, and conditional hook percentages without inferring stacking, visibility, darkness, timing, trigger, currency, or combat formulas. Other unsupported nested buff mechanics remain diagnosed. The pure domain traversal records every direct-effect edge, expands each resolved spell once, and marks cycles or repeated branches where recursion stops; conditional buff hooks remain separate relationships with reciprocal backlinks. Synthetic desktop/mobile and axe coverage includes animation/impact metadata plus hidden-reference assertions, a mana formula, complete buff parameters and modifiers, a signed sight modifier, resolved and dangling buff hooks, explicit empty states, an unsupported non-mana requirement, a deliberate two-spell cycle, and a dangling direct-effect target. The ignored official dataset builds 951 spell routes; all 807 official direct spell-reference edges and all 61 buff event hooks resolve, and the measured maximum shortest-path depth is 7.

Read-only canonical item measurement found 1,584 fixed modifiers across 506 active items: 480 damage, 255 resistance, 122 primary, and 727 secondary. Spell measurement found 104 active spells with one mana declaration each. All 104 have valid base costs from 1 through 60, 98 include Savvy coefficients from 0.09 through 0.7, and 77 include minimum costs from 1 through 15. It found 661 active spells with one animation declaration each: every declaration has a safe sprite prefix, 656 supply frame counts from 0 through 18, 612 supply source frame rates from 5 through 250, 30 supply first-frame values from 0 through 2, and 594 supply symbolic sound cues. It also found 70 active spells with one impact declaration each: all have safe sprite prefixes, frame counts from 3 through 10, and source frame-rate values from 50 through 180; one supplies first-frame 0 and 65 supply symbolic sound cues. It found 266 active spells with one buff declaration each and 795 normalized direct buff modifiers: 38 damage, 189 resistance, 215 primary, and 353 secondary. Eighteen spells contain one valid signed sight-radius modifier each, spanning -3 through +3. Forty-two spells contain 61 buff event hooks: 43 target-hit and 18 player-hit declarations, all with valid 2–100 percentages and resolved spell targets; one preserves an additional `after` source flag. Thirteen non-mana requirement declarations remain explicit diagnostics, as do two unrelated `level` attributes. The deterministic import completes with no errors, 3,278 warnings, and 71 informational duplicate decisions; the compatibility subset is 911 item plus 2,333 spell diagnostics, with the 15 requirement diagnostics and 19 dangling references tracked separately. Detailed evidence is recorded in `docs/analysis/item-stat-modifier-evidence-2026-07-22.md`, `docs/analysis/spell-mana-cost-evidence-2026-07-22.md`, `docs/analysis/spell-animation-evidence-2026-07-22.md`, `docs/analysis/spell-impact-evidence-2026-07-22.md`, `docs/analysis/spell-buff-evidence-2026-07-22.md`, `docs/analysis/spell-buff-event-hook-evidence-2026-07-22.md`, `docs/analysis/spell-buff-sight-evidence-2026-07-22.md`, and `docs/analysis/general-project-review-hardening-2026-07-22.md`.

## Skill and ability parity slice completed

Static skill and ability details now expose archetype, complete named/generic starting loadouts, always/optional quantities, ordered progression, signed damage/resistance/primary/secondary modifiers, source flags, progression tags, recovery/currency source values, supported spell-trigger events, provenance, and diagnostics. Resolved items and spells link both ways; dangling names stay visible without fabricated routes. Synthetic desktop/mobile and axe coverage follows item→skill→ability→spell navigation and includes generic/dangling loadouts, signed modifier values, numeric stat-ID disclosure, neutral source-metadata disclosure, a dodge hook, and a dangling ability spell. The ignored official dataset contains 52 skills, 352 linked abilities, 76 loadout definitions, 264 fully resolved ability triggers, and 473 direct modifiers across 217 abilities. It also preserves 11 flag values, 4 progression tags, 10 recovery amounts, and 1 currency percent; no measured skill/ability child elements remain unsupported. Sixteen named loadouts remain genuinely unresolved.

## Monster profile, movement, presentation, spell-hook, and drop slices completed

Feature review status: the monster-drop/item-backlink and initial aggressiveness/span/invisible AI source-metadata slices passed separate feature code review on 2026-07-21. The sight, movement, presentation, and primary-attribute formula slices passed separate feature code review on 2026-07-22. The reviews made named and type-driven drops an exclusive domain union enforced by the web artifact guard, added adversarial malformed-shape coverage, established the loss-aware flag pattern used by every measured boolean AI and movement attribute, changed invalid boolean tokens from silent disabled values to diagnosed unavailable values, rejected unexpected nested leaf content, kept raw engine references out of the browser, and made duplicate local monster bonuses diagnose and resolve with the preserved last-declaration-wins rule before inheritance and calculation.

Static monster details now expose taxonomy, dungeon-depth/special classification, fighter/rogue/wizard source levels, experience, palette metadata, effective inherited stat bonuses and AI casting chance, the six verified primary attributes, local loss-aware aggressiveness/span/invisible/chicken/charm/paralyze/steal, sight cone/modifier, dig/dash/charge source metadata, and safe sound/sprite coverage summaries, resolved or dangling on-hit/cast/on-death/dash/charge spell hooks, direct named/type-driven drops, parent/direct-variant navigation, provenance, and diagnostics. Primary values come from a pure domain coefficient table and add effective inherited primary bonuses. Exact one-in odds are retained alongside a rounded display percentage; resolved spells and named items link both ways. Drops, AI/sight/movement/presentation metadata, and hook declarations remain local to the declaring monster, and type-driven drops do not fabricate items. Detailed engine references are retained in local generated artifacts but not rendered while asset publication remains unresolved. Life, Mana, secondary combat totals, and complete AI/movement formulas remain explicitly unavailable because the researched sources conflict. Synthetic desktop/mobile, keyboard, and axe coverage follows a child to its parent, spell, and drop item, verifies reciprocal backlinks and inherited/overridden fields, exercises a generic artifact drop, displays a primary total with a source bonus plus enabled, disabled, numeric, invalid-fallback, and absent AI/sight/movement/presentation values without claiming behavior formulas, and exposes dangling spell/item names without fabricating routes. Focused importer tests cover absent/disabled/enabled AI states, both measured percentage casing variants, supplied/absent/invalid sight and movement values, boolean movement flags, resolved/dangling behavior spells, all measured sound/sprite shapes, local presentation non-inheritance, and unknown-attribute diagnostics. Formula evidence and exclusions are recorded in `docs/analysis/monster-derived-stat-evidence-2026-07-22.md`.

The ignored official dataset contains 183 monsters: 132 inherit, 23 are special, all 183 resolve a dungeon depth, 177 supply experience, and 131 supply palette metadata. Inheritance produces 1,331 effective modifiers (458 damage, 486 resistance, 12 primary, and 375 secondary). AI metadata contains 108 aggressiveness/span pairs; invisible has 5 enabled/1 disabled values, chicken has 17 enabled/10 disabled values, charm and paralyze have 4 and 3 explicit disabled values, steal-gold has 1 enabled value, and steal percentage has 2 values (20 and 50). All measured official AI attributes are normalized. Sight metadata is present on 55 monsters with no diagnostics: cones are 90 (28), 270 (23), or 360 (4), and modifiers span 0.65 through 3.2. Movement metadata is present as 6 dig, 4 dash, and 2 charge declarations. All 4 dash records enable interruptible; both charge records enable interruptible/blocks-action and disable targets-self. The 11 associated on-death/dash/charge spell hooks all resolve. The earlier 274 hooks remain (223 aware-casting and 51 on-hit); 271 resolve and three remain explicit dangling references, with at most 16 hooks on one monster. Fifty-six direct drops normalize across 15 monsters: all 49 named items resolve, and six `artifact` plus one `zorkmids` type-driven drops remain explicit, with at most 12 drops on one monster. Presentation metadata contains 60 sound declarations with 242 symbolic cue IDs plus 54 attack, 52 hit, 52 death, 27 cast, 2 beam, 1 morph, and 1 dig animation declarations with 519 validated sprite references. No measured official monster child element remains unsupported; the only monster diagnostics are the three genuine dangling spell references. All 183 routes export within 2,824 static pages.

The verified primary calculation covers all 183 ignored official monsters. Eight have 12 effective primary modifiers; totals span 0–154 Burliness, 0–190 Sagacity, 0–140 Nimbleness, 0–173 Caddishness, 0–223 Stubbornness, and 0–209 Savvy. These are aggregate read-only measurements, not permission to publish the artifact.

## Targeting template slice completed

Static template routes now render the ordered `.`/`@`/`#` targeting grid with a visible legend, a concise assistive label, anchor inclusion, dimensions, provenance, canonical/alias routing, and an explicit empty-pattern state. Templates are included in the structured search route and can be selected by entity type. The current web artifact guard rejects malformed template rows before static generation. Synthetic desktop/mobile browser coverage follows the keyboard path from filtered search to the template page and includes the route in axe scans. Read-only aggregate inspection found 35 templates in the ignored canonical artifact, all using only the verified three-character alphabet; no official names or row data are recorded here.

## Static all-entity discovery completed

The server-rendered `/browse/` directory exposes all nine entity kinds and links to 100-record static catalogue pages. Primary navigation, detail breadcrumbs, home item discovery, and the dataset-neutral 404 now lead into this surface. Desktop and mobile Playwright coverage disables JavaScript, keyboard-navigates through a kind catalogue into a detail route, checks responsive overflow, and includes browse pages in the representative axe sweep. The ignored canonical artifact's 2,767 records produce 32 bounded kind pages plus the directory, bringing the complete local export to 2,857 pages without publishing any generated official content. Detailed evidence is in `docs/analysis/static-browse-evidence-2026-07-27.md`.

## Open decisions and blockers

- Permission evidence for publishing normalized official data and art beyond the accepted local-only boundary.
- Exact modern-project MIT copyright-holder wording and provenance/license treatment for excluded inherited code, historical mods, and assets.
- Approval or revision of the drafted first parity-slice acceptance statement.
- Search response-time and relevance acceptance criteria for ADR 0003.
- Approved source/model for stat definitions absent from the canonical installed build.
- Post-parity quality-of-life priorities and extra technical-detail presentation, intentionally deferred until parity polish.
- Technical feasibility of live progress tracking, deliberately deferred.

Do not resolve these by assumption. Ask the owner when a choice would materially change the implementation or publication boundary.

## Safe transfer package

Run from the clean repository on the old PC:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/create-transfer-package.ps1
```

The script creates `dredmorpedia-transfer-<timestamp>.zip` beside the repository. It contains:

- `dredmorpedia.bundle` — all committed Git refs and history, including local unpushed commits;
- `RESTORE.md` — a copy of this guide;
- `MANIFEST.txt` — source branch/commit, remote, creation time, and checksums.

Because the package is built from committed Git objects, it excludes ignored/untracked official data, generated output, credentials, editor state, and machine-specific files. The script refuses to package a dirty working tree, refuses to write inside the repository, does not overwrite an existing archive, verifies the bundle, and validates the ZIP contents.

### Restore on the new PC

1. Copy the ZIP through Google Drive and verify its SHA-256 against the value printed by the packaging script or recorded separately.
2. Extract the ZIP to a temporary folder.
3. Clone the bundled history:

```powershell
git clone .\dredmorpedia.bundle dredmorpedia
Set-Location dredmorpedia
git remote set-url origin https://github.com/dredmorpedia/dredmorpedia.git
git status -sb
git log --oneline --decorate -5
```

4. Configure the preferred repository-local Git author identity on the new computer; local Git configuration is intentionally not transferred by the bundle.
5. Open the restored folder in Codex and use the resume prompt above.
6. Provide the new machine's game-installation path only when a read-only integration task needs it.

The Codex chat transcript, local game installation, ignored data, local Git configuration, credentials, editor extensions/settings, dependency caches, and generated artifacts are not transferred. This document is the intentional substitute for relying on the old chat transcript.

## Why not zip the working folder directly?

A whole-folder ZIP can include ignored proprietary/generated files because `.gitignore` does not affect archive tools. Some Windows ZIP workflows also omit hidden files such as `.git`, which would lose local history and unpushed commits. A raw ZIP is acceptable only after independently verifying its complete contents and exclusions; the bundle-based package is the canonical transfer method for this repository.
