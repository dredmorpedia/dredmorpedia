# AI agent conversation resume

Updated: 2026-08-03

Use this document to resume the ongoing Dredmorpedia rebuild in a fresh AI conversation. It is a practical workflow/checkpoint summary, not a replacement for `AGENTS.md`, the project brief, architecture records, data policy, roadmap, or the detailed machine handoff.

## Suggested opening instruction

> Read `AGENTS.md` and `docs/handoff/ai-agent-conversation-resume.md` completely, then inspect Git status and the current roadmap/handoff state. Continue with the next smallest coherent parity slice. Treat the local game installation as read-only, never expose its path, do not publish generated official data, include automated coverage and exact manual test steps, and do not commit or push until I ask.

## Current checkpoint

- Repository: `https://github.com/dredmorpedia/dredmorpedia.git`.
- Working branch: `master`, with direct owner-requested commits to `origin/master`.
- The current parity checkpoint is described below; always verify the live HEAD and working tree with Git rather than relying on a copied commit hash.
- Canonical read-only source baseline: Dungeons of Dredmor `1.1.5 public_beta`, Steam build `22934623`, base game plus all three official expansions.
- The modern workspace is under `apps/web`, `packages/domain`, and `packages/data-pipeline`; tracked legal fixtures are under `fixtures/synthetic`; the preserved reference application is under `legacy`.
- Generated official artifacts remain ignored under `data/generated/official-local/` and are not approved for publication.
- Node is pinned by `.node-version` to `24.18.0`; the workspace uses pnpm through Corepack. On Windows, use `pnpm.cmd` when needed.
- Development runs on `http://localhost:3001/`.

## Owner decisions recorded on 2026-07-29

- The current target is a locally complete product based on `1.1.5 public_beta`, including only the official assets needed by entities and features the product actually presents. Public deployment and a dataset-version switcher are postponed.
- Official XML, generated official datasets, and copied official assets stay ignored and non-public. Selected screenshots may be prepared when requesting permission, but a screenshot does not establish permission to publish the underlying material.
- New modern-project material is intended to use MIT terms. `legacy/`, official content and derivatives, bundled mods, and inherited assets are outside that intended scope. Scoped license files remain pending until the copyright-holder wording is supplied.
- ADR 0001 and ADR 0002 are Accepted within this local-only boundary. ADR 0004 accepts a permanent inherited route-registry lifecycle for durably shared or published datasets; its enforcement is an implementation follow-up.
- Search has project-owned, name-and-route-alias-only spelling suggestions when a query has zero results: at most five suggestions, always selected by the user, with no automatic query replacement. Response budgets and broader concrete relevance examples remain open in ADR 0003.
- Engine mechanics absent from XML must be evaluated individually immediately before their implementation. Legacy formulas are evidence to test, not automatically authoritative or automatically excluded.
- Post-parity quality-of-life priorities and presentation of extra technical detail are intentionally deferred until parity polish, when they can be decided against concrete pages.

## How the work is organized

The owner normally asks to “proceed with the next task.” Treat that as authorization to select and implement one bounded, coherent parity or hardening slice—not an arbitrary cleanup.

For each slice:

1. Inspect `git status -sb` and preserve unrelated changes.
2. Read the current roadmap, detailed handoff, relevant evidence/contract files, and ADRs. Read `docs/data-and-assets-policy.md` before touching local game inputs or generated official artifacts.
3. Measure the current diagnostic/source shape and inspect the preserved legacy behavior before choosing semantics.
4. Implement the complete vertical boundary: domain types/calculations, importer/diagnostics, relationship linking, strict artifact consumer schema, user-visible UI/empty or failure state, legal synthetic fixtures, focused tests, browser coverage, and durable documentation.
5. Preserve direct source values loss-aware. Use `null` for absent or invalid optional values where the contract distinguishes them, diagnose malformed input, and do not invent undocumented game formulas or behavior.
6. Run narrow tests first, then the full relevant validation. Restore `apps/web/next-env.d.ts` after Next.js builds if it changes from the tracked development reference.
7. Give the owner exact manual test commands/routes, expected results, and a relevant failure, accessibility, responsive, or regression check.
8. Leave the change uncommitted until the owner explicitly asks to commit and push.

The preferred implementation size is the smallest slice that removes a defensible diagnostic family or completes a user-visible relationship without weakening validation. Do not suppress a compatibility diagnostic until every measured attribute/nested shape in that boundary is represented or rejected explicitly.

## Architecture and safety boundaries

- The web layer consumes only generated artifacts and never parses raw XML.
- The data pipeline treats XML/mod content as untrusted, validates paths and values, and emits deterministic source-located diagnostics.
- Domain code stays framework-independent and browser-free.
- Imports, source precedence, identities, slugs, aliases, relationships, diagnostics, and output order must remain deterministic.
- Official game installations are strictly read-only. Never edit, move, rename, delete, patch, or create files inside them.
- Never commit official XML/assets, generated official derivatives, credentials, machine-local paths, or unapproved inherited assets/mod derivatives.
- Synthetic test data must be independently authored and minimal.
- Presentation paths/cue IDs may be retained in ignored artifacts when safely validated, but remain summarized rather than rendered while publication rights are unresolved.
- UI changes must remain semantic, keyboard-operable, responsive, and covered by representative axe checks.

## Canonical commands and validation sequence

Use the root commands documented in `AGENTS.md`:

- `pnpm.cmd generate:check` — deterministic legal synthetic generation.
- `pnpm.cmd audit:dependencies` — fail on high-severity production dependency advisories using the live registry database.
- `pnpm.cmd check` — formatting, lint, types, unit/artifact tests, deterministic generation, and synthetic static build.
- `pnpm.cmd test:e2e` — desktop/mobile interaction, responsive, keyboard, and axe coverage.
- `pnpm.cmd generate:official:check` — optional deterministic read-only canonical import.
- `pnpm.cmd build:official` — optional deterministic canonical import plus full local static export.
- `pnpm.cmd dev` — regenerate and serve synthetic data.
- `pnpm.cmd dev:official` — regenerate and serve ignored official data.

Run official commands only when the ignored local manifest exists and the task needs canonical evidence. Never include its source roots in output or documentation.

After builds, restore the tracked `apps/web/next-env.d.ts` import to:

```ts
import "./.next/dev/types/routes.d.ts";
```

Before handoff, run `git diff --check`, confirm no local installation/user paths entered the diff, and make sure generated outputs remain ignored.

## Implemented product/data coverage

The rebuild currently has deterministic static routes, structured search, and bounded server-rendered browse catalogues across items, stats, recipes, encrustments, spells, skills, abilities, monsters, and targeting templates. Search schema 2 carries ordered route aliases. Search keeps typed input local while debouncing shareable URL updates so an older navigation cannot overwrite newer characters; after a genuine zero-result query, the project-owned domain query can offer at most five name/route-alias spelling suggestions that honor active filters and change the query only when selected. The browse directory and its 100-record pages expose every direct detail route without JavaScript. Detail breadcrumbs, the primary navigation, home item discovery, and the 404 recovery path lead into that catalogue. The application includes provenance/override/patch history, route aliases, crafting/encrusting/loadout/spell/monster-family/drop backlinks, explicit missing-reference states, and cycle-safe spell traversal. Suggestion evidence is in `docs/analysis/search-spelling-suggestions-evidence-2026-07-29.md`.

Important completed item slices include:

- semantic item categories;
- signed fixed item modifiers and modifier search facets;
- loss-aware artifact quality;
- direct hit/kill trigger aliases and exact source flags;
- food/booze recovery, wand charges, and potion/mushroom trigger leaves;
- trap activation, level, caster-targeting, safe placement-source metadata, and stepped-on spell links;
- strict empty gem classification markers;
- loss-aware armour slot, level, and optional `randoms` declarations;
- complete weapon leaves across category, quality, fixed damage, hit triggers, floor targeting, and safe hidden thrown-presentation references;
- loss-aware macguffin spell, class-name, and consumable declarations with reciprocal resolved-spell links; and
- complete toolkit tags, slot/interface source metadata, and reciprocal recipe/encrustment relationships.

The latest canonical toolkit slice covers all eight active declarations, removes the final item compatibility diagnostics, and links all matching recipe/encrustment tool tags without rendering detailed sound cue IDs or raw presentation/layout values or using old game-interface coordinates for the modern UI. Evidence is in `docs/analysis/item-toolkit-declaration-evidence-2026-07-28.md`.

Other completed areas include spell mana/buff/presentation/effect relationships, ordered buff-local descriptions, invisibility, casting-prevention, named polymorph declarations, scoped nested effects, and search text; loss-aware buff-halo and direct-effect presentation metadata; separate created-object sprite and dig graphics-regeneration metadata; direct damage-effect Midas flags; ordered spell- and buff-local AI hint metadata; typed ordered spell effect-list options with item/spell links and reciprocal backlinks; loss-aware direct effect item and monster targets with reciprocal resolved-entity links; named buff-removal targets with reciprocal spell links; damage amounts/factors/scaling selectors; duration declarations; `after`, bleed, and skip-animation flags; chance/targeting/resistance/burn/taxonomy controls; loss-aware source-buff and paired named buff conditions with reciprocal spell links; all measured skill/ability child elements; monster profile/inheritance/AI/sight/movement/presentation/spell/drop data; verified monster primary attributes; encrustment outcomes/shared instability effects; and accessible targeting-template previews.

## Current measured backlog and likely next work

After the damage-effect Midas slice, the canonical import
reports:

- 0 errors, 43 warnings, and 71 informational duplicate decisions;
- seven unsupported/partially-supported constructs, all spell diagnostics;
- 23 dangling references tracked separately; and
- 13 spell requirement diagnostics tracked separately.

No item compatibility diagnostic remains.

The ordered repository-wide hardening queue is complete. Patch overlays enforce complete normalized field invariants and exclude derived compatibility arrays; XML provenance and diagnostics use record-specific locations; source manifests, patch definitions, and route registries reject unknown fields at every object level; official output publication requires zero error diagnostics; and tool-owned `.claude/worktrees/` checkouts are excluded from both Git status and formatting inputs. The all-entity search slice removed the web-only allow-list that hid 1,969 already-generated official records and made query typing resilient to asynchronous URL updates. The following static-browse slice closed the audit's no-JavaScript discovery gap with 32 bounded canonical catalogue pages plus a directory. A later repository review found no new correctness blocker, but identified concentrated maintenance risk in the spell normalizer/tests, spell detail page, browser spec, and artifact schema. The first bounded extraction is complete: the 355-line spell-detail browser flow now lives in a dedicated spec with every assertion and all 34 desktop/mobile cases preserved. Generated search ordering now has a final entity-ID tiebreaker, regressions cover equal-precedence resolution, missing monster parents, three-level inheritance, and negative derived totals, every persisted domain/pipeline string order uses one ICU-independent UTF-16 comparator, and the remaining diagnostic/resolution/instability comparators have complete stable tiebreakers. Normalized asset values are validated before root probing, including the future empty-root caller edge. The web artifact boundary now validates route-field shapes and unique same-kind canonical/alias ownership before static parameter generation. Route-registry lifecycle is the review's only remaining medium finding. Further extraction should stay behavior-preserving and be selected only when it supports the next parity slice rather than becoming an open-ended cleanup.

The 2026-08-03 full-project review adds a new bounded hardening queue. Its
high-priority browser-process finding is resolved: Playwright now asks the
loopback static server to shut down normally, so all 36 desktop/mobile cases
print their final summary and `pnpm.cmd test:e2e` returns instead of waiting
indefinitely after a denied Windows `taskkill`. Continue in this order: migrate
the ignored official manifest to reviewed schema-2 provenance without exposing
its path; hash the same source bytes the importer parses; verify all manifest
outputs eagerly; define strict measured numeric lexemes; then render complete
multi-step override history. ADR 0004 inheritance/enforcement remains required
before a second dataset or durable publication. See
`docs/analysis/full-project-review-2026-08-03.md`.

The asset-reference contract is also host-independent end to end: the pipeline rejects POSIX absolute, Windows absolute/drive-relative, and traversal values, and the web applies one safe-relative-path schema across all item, skill/ability, spell, and monster presentation fields. The ignored canonical artifact's 3,708 non-null references satisfy the boundary.

The source-manifest trust assumption is explicit in code, policy, and the input
contract. A trusted local manifest may name an absolute external read-only
source root; declared database paths are still real-path-contained beneath that
root, and generated artifacts never expose the machine-local root.

The low-severity alias heading-order finding is resolved across all nine entity
detail routes: the entity `<h1>` now precedes the visible alias-note `<h2>`, and
the existing alias browser flow guards the heading order, canonical link, and
`noindex` behavior.

The low-severity duplicated display-label helper finding is also resolved.
Item, recipe, encrustment, skill, spell, monster, and stat-modifier labels now
share one tested `titleCase` implementation with consistent separator and
empty-segment handling. `pnpm.cmd check` passes all 146 unit/artifact tests and
the 43-page synthetic export; all 34 desktop/mobile browser cases pass.

The subsequent spelling-suggestion slice raises the current totals to 150
unit/artifact tests and 36 desktop/mobile browser cases. Search schema 2, the
43-page synthetic export, deterministic official generation, and all 2,857
ignored local official pages pass. The spell-effect-`after` slice raises the
unit/artifact total to 151, the bleed slice raises it to 152, the
skip-animation slice raises it to 153, the direct effect-presentation slice
raises it to 155, the direct item-target slice raises it to 158, the direct
monster-target slice raises it to 161, the named buff-removal slice raises it
to 164, the buff-local invisibility slice raises it to 166, and the buff-local
mute slice raises it to 168, and the buff-local polymorph slice raises it to
171, the buff-local effect slice raises it to 174, the environmental-effect
metadata slice raises it to 177, and the damage-effect Midas slice raises it to
179 while retaining the 36 browser cases.

After the review-hardening queue, remeasure rather than relying only on the recorded backlog counts. Every measured item family is now complete. The next content-parity task should select one of the remaining measured spell-mechanic families and give it an independently evidenced contract rather than blanket-supporting spell content.

The local product boundary and the technical direction in ADR 0001/0002 are now accepted. Remaining policy/product gates are permission evidence for any future public release, exact copyright-holder wording and provenance treatment for excluded inherited material, first-parity acceptance, search response budgets/broader relevance examples, and an approved source for official stat definitions. ADR 0004 route-registry enforcement and the bounded local asset importer are approved directions but remain implementation work.

## Git and owner handoff convention

- When the owner asks to commit and push, inspect the exact diff, stage only the coherent verified scope, use a terse descriptive commit message, and push `master` to `origin/master` unless the owner changes the workflow.
- Do not open a pull request unless requested.
- The Codex process may report a stale `gh auth status` token even while Git HTTPS push succeeds through the machine credential manager. Never expose token values; use the actual Git push result as evidence for direct pushes.
- After every user-visible development task, provide manual verification instructions even when automated checks are comprehensive.

## Last completed slice validation

The damage-effect Midas slice preserves all four active `midas` declarations
as a required nullable field in the controls record. All four occur on direct
base-game `damage` effects and are explicit true. Strict importer coverage
includes true, false, absent, malformed, extended, and unsupported-type
declarations; the strict checksummed-artifact regression rejects a non-boolean
value. Gold conversion eligibility or value, target transformation, drops,
persistence, interaction with damage, and runtime success remain
uninterpreted. Deterministic official generation is byte-identical with 0
errors, 43 warnings, and 71 informational decisions. Evidence is recorded in
`docs/analysis/spell-effect-midas-evidence-2026-07-29.md`. All installed
workspace check components pass with 179 unit/artifact tests and the 43-page
synthetic export; all 36 desktop/mobile browser cases report successful before
a Windows managed-server teardown timeout; and the byte-identical canonical
dataset exports all 2,857 local static pages. No test server remains running.

The environmental-effect metadata slice preserves six active
`objectSprite` references on `create` effects and four active `regengfx` flags
on `dig` effects as separate required nullable fields. All three unique
concrete assets are safe, available, and registered as deterministic inputs;
all four canonical flags are explicit true. Strict importer coverage includes
valid, absent, empty, unsafe, malformed, extended, and unsupported-type
declarations. Strict checksummed-artifact regressions reject an unsafe path and
a non-boolean flag. Created-object lifetime, terrain changes, redraw timing,
placement, persistence, and runtime success remain uninterpreted.
Deterministic official generation is byte-identical with 0 errors, 47
warnings, and 71 informational decisions. Evidence is recorded in
`docs/analysis/spell-effect-environment-metadata-evidence-2026-07-29.md`.
`pnpm.cmd check` passes all 177 unit/artifact tests and the 43-page synthetic
export; all 36 desktop/mobile browser cases pass; and the byte-identical
canonical dataset exports all 2,857 local static pages.

The buff-local mute slice preserves all six active `<mute>` declarations
across six spells. Three retain source amount `1`, and three validly omit it.
The strict importer and artifact boundary cover ordered, amount-present,
amount-absent, blank, negative, fractional, non-numeric, extended, nested, and
malformed records. The preserved application labels the marker `Prevents
Casting` but does not interpret the source amount; affected actors or spell
categories, amount meaning, immunity, resistance, stacking, duration, removal,
targeting, AI, and runtime behavior remain uninterpreted. Deterministic
official generation is byte-identical with 0 errors, 72 warnings, and 71
informational decisions. Evidence is recorded in
`docs/analysis/spell-buff-mute-evidence-2026-07-29.md`. `pnpm.cmd check`
passes all 168 unit/artifact tests and the 43-page synthetic export; all 36
desktop/mobile browser cases pass; and the byte-identical canonical dataset
exports all 2,857 local static pages.

The buff-local invisibility slice preserves all nine active `<invisible>`
declarations across nine spells. Eight retain source amount `1`, and one
validly omits it. The strict importer and artifact boundary cover ordered,
amount-present, amount-absent, blank, negative, fractional, extended, nested,
and malformed records. The preserved application confirms the invisibility
label but does not interpret the source amount; visibility strength, detection,
actor scope, breaking, stacking, duration, targeting, AI, and runtime behavior
remain uninterpreted. Deterministic official generation is byte-identical with
0 errors, 78 warnings, and 71 informational decisions. Evidence is recorded in
`docs/analysis/spell-buff-invisibility-evidence-2026-07-29.md`. `pnpm.cmd
check` passes all 166 unit/artifact tests and the 43-page synthetic export; all
36 desktop/mobile browser cases pass; and the byte-identical canonical dataset
exports all 2,857 local static pages.

The direct spell-effect monster-target slice preserves all 21 active
`monsterType` declarations across 11 `summon` and 10 `summonhostile` effects.
All targets resolve to normalized monsters with reciprocal backlinks; two
additional summon-family effects intentionally omit the target and remain
valid null records. The strict importer and artifact boundary cover absence,
empty values, dangling targets, unsupported types, and partial records.
Availability, allegiance, placement, lifetime, AI state, selection, timing,
and runtime spawning remain uninterpreted. Deterministic official generation
is byte-identical with 0 errors, 110 warnings, and 71 informational decisions.
Evidence is recorded in
`docs/analysis/spell-effect-monster-target-evidence-2026-07-29.md`.
`pnpm.cmd check` passes all 161 unit/artifact tests and the 43-page synthetic
export; all 36 desktop/mobile browser cases pass; and the byte-identical
canonical dataset exports all 2,857 local static pages.

The direct spell-effect item-target slice preserves all nine active
`itemname` / `itemName` declarations on `spawn` and
`spawnitematlocation` effects. Three targets resolve to normalized items with
reciprocal backlinks; six remain visible source labels without fabricated
entities or false dangling warnings. The strict importer and artifact boundary
cover absence, empty values, alias conflicts, unsupported types, and partial
records. Random selection, inventory placement, availability, timing, and
runtime spawning remain uninterpreted. Deterministic official generation is
byte-identical with 0 errors, 131 warnings, and 71 informational decisions.
Evidence is recorded in
`docs/analysis/spell-effect-item-target-evidence-2026-07-29.md`.
`pnpm.cmd check` passes all 158 unit/artifact tests and the 43-page synthetic
export; all 36 desktop/mobile browser cases pass; and the byte-identical
canonical dataset exports all 2,857 local static pages.

The direct spell-effect presentation slice preserves all 33 active `sprite`,
`frames`, `framerate`, `centerEffect`, and `sfx` attributes across 15 effects
as nullable loss-aware records. Strict importer and artifact checks reject
unsafe paths and malformed extensions; the page shows reference coverage and
direct frame/center values while hiding raw sprite and sound identifiers.
Timing, placement, playback, synchronization, and other engine behavior remain
uninterpreted. Deterministic official generation is byte-identical with 0
errors, 140 warnings, and 71 informational decisions. Evidence is recorded in
`docs/analysis/spell-effect-presentation-evidence-2026-07-29.md`.
`pnpm.cmd check` passes all 155 unit/artifact tests and the 43-page synthetic
export; all 36 desktop/mobile browser cases pass; and the byte-identical
canonical dataset exports all 2,857 local static pages.

The spell-effect-skip-animation slice preserves all five active lowercase
declarations as loss-aware booleans and accepts the installed validation
schema's camel-cased alias. Strict importer and artifact checks preserve
explicit false, reject malformed values, and diagnose simultaneous aliases.
The page discloses the direct flag without inferring animation order, timing,
synchronization, target selection, or which presentation sequence the engine
suppresses. Deterministic official generation is byte-identical with 0 errors,
173 warnings, and 71 informational decisions. Evidence is recorded in
`docs/analysis/spell-effect-skip-animation-evidence-2026-07-29.md`.
`pnpm.cmd check` passes all 153 unit/artifact tests and the 43-page synthetic
export; all 36 desktop/mobile browser cases pass; and the byte-identical
canonical dataset exports all 2,857 local static pages.

The spell-effect-bleed slice preserves all 12 active direct declarations as
loss-aware booleans and gives the nine standalone bleed effects the preserved
application's "Starts bleeding" label. Strict importer and artifact checks
reject malformed values; the page preserves explicit false without inferring
damage, duration, stacking, resistance, target selection, or other runtime
behavior. Deterministic official generation is byte-identical with 0 errors,
178 warnings, and 71 informational decisions. Evidence is recorded in
`docs/analysis/spell-effect-bleed-evidence-2026-07-29.md`.

The spell-effect-`after` slice preserves all 16 active direct declarations as
loss-aware booleans across knock, paralyze, swap, and trigger effects. Explicit
false remains distinct from absence; strict importer and artifact checks reject
malformed values; and the spell page discloses the flag without inferring
evaluation order, delay, scheduling, or trigger timing. Deterministic official
generation is byte-identical with 0 errors, 190 warnings, and 71 informational
decisions. Evidence is recorded in
`docs/analysis/spell-effect-after-flag-evidence-2026-07-29.md`.

The spell-effect-duration slice preserves all 69 active direct `turns`
declarations across 69 effects and 68 spells. Loss-aware normalization,
strict artifact validation, and the spell page expose non-negative source turn
counts without inferring runtime countdown or scheduling behavior. Focused
importer, domain, artifact-boundary, and type checks pass. `pnpm.cmd check`
passes all 143 unit/artifact tests and the 43-page synthetic export; all 34
desktop/mobile browser cases pass; and the byte-identical ignored canonical
dataset exports all 2,857 pages with 763 items, 2,767 search documents, 0
errors, 206 warnings, and 71 informational decisions. Evidence is recorded in
`docs/analysis/spell-effect-duration-evidence-2026-07-29.md`.

The source-root trust-boundary checkpoint documents the source manifest as
trusted local/operator configuration. A focused regression proves an absolute
external root is permitted while a declared traversal remains rejected.
`pnpm.cmd check` passes all 142 unit/artifact tests, byte-identical synthetic
generation, and the 43-page synthetic export; deterministic official generation
remains byte-identical with 763 items, 2,767 search documents, 0 errors, 275
warnings, and 71 informational decisions. Evidence is recorded in
`docs/analysis/source-root-trust-boundary-evidence-2026-07-29.md`.

The asset-reference artifact-boundary checkpoint makes pipeline rejection of POSIX absolute, Windows absolute/drive-relative, and traversal values independent of the generator host and applies one web schema to every generated item, skill/ability, spell, and monster asset reference. Focused pipeline and checksummed-tampering regressions pass; all 3,708 non-null canonical references satisfy the boundary. The full workspace passes 141 unit/artifact tests and the 43-page synthetic export; the byte-identical ignored canonical dataset passes the complete 2,857-page static export with 0 errors, 275 warnings, and 71 informational decisions. Evidence is recorded in `docs/analysis/asset-reference-artifact-boundary-evidence-2026-07-29.md`.

The web route artifact-boundary checkpoint gives canonical/alias slugs and search-document URLs explicit safe shapes and independently rejects duplicate same-kind canonical-or-alias ownership before static route generation. Four checksummed-tampering regressions cover invalid canonical slugs, aliases, route collisions, and search URLs. The full workspace passes 139 unit/artifact tests and the 43-page synthetic export; the byte-identical ignored canonical dataset passes the complete 2,857-page static export with 0 errors, 275 warnings, and 71 informational decisions. Evidence is recorded in `docs/analysis/web-route-artifact-boundary-evidence-2026-07-29.md`.

The asset-path validation checkpoint closes the review's empty-root path gap: unsafe normalized asset values are rejected before filesystem root probing. A focused `parseDatabase` regression supplies no asset roots and proves traversal becomes an unavailable value plus an `unsafe_asset_path` error without reaching input registration. The full workspace passes 135 unit/artifact tests, byte-identical synthetic generation, and the 43-page synthetic export; deterministic official generation remains byte-identical with 763 items, 2,767 search documents, 0 errors, 275 warnings, and 71 informational decisions. Evidence is recorded in `docs/analysis/asset-path-validation-evidence-2026-07-29.md`.

The comparator-totality checkpoint closes review finding 4: diagnostics now end on severity, source ID, and stable details; equal-precedence source resolution includes column plus a stable full-record fallback; and instability effects include column and remaining stable fields. Reversed-input regressions cover all three paths. `pnpm.cmd check` passes all 134 unit/artifact tests, byte-identical synthetic generation, and the 43-page synthetic export. `pnpm.cmd generate:official:check` remains byte-identical with 763 items, 2,767 search documents, 0 errors, 275 warnings, and 71 informational decisions. Evidence is recorded in `docs/analysis/comparator-totality-evidence-2026-07-29.md`.

The ICU-independent ordering checkpoint replaces all 94 domain/pipeline locale-collation calls with one tested UTF-16 code-unit comparator while retaining locale-aware sorting only for web presentation. It closes the review's cross-platform output-ordering finding without changing the current canonical bytes. `pnpm.cmd check` passes all 131 unit/artifact tests, byte-identical synthetic generation, and the 43-page synthetic export. `pnpm.cmd generate:official:check` remains byte-identical with 763 items, 2,767 search documents, 0 errors, 275 warnings, and 71 informational decisions. Evidence is recorded in `docs/analysis/icu-independent-output-ordering-evidence-2026-07-28.md`.

The earlier review determinism/test-hardening checkpoint gives generated search documents a total `(kind, name, id)` order and covers equal-precedence source resolution, missing monster parents, three-level inheritance, and genuinely negative derived primary totals. The behavior is domain-only: no UI or official-data contract changed.

The spell-effect damage/scaling slice preserves 605 active damage declarations across 433 effects: 586 base amounts, 294 factor coefficients, and 19 factor-only declarations. It also preserves 15 amount factors, two floor factors, 23 primary selectors, and 67 secondary selectors across 106 effects. Strict type-specific normalization and the artifact guard reject malformed shapes, both measured primary-selector casings are supported, and the UI presents these as direct source metadata without inferring final combat, healing, mana, or spawn formulas. `pnpm.cmd check` passes all 123 unit/artifact tests and the 43-page synthetic export; all 34 desktop/mobile Playwright cases pass; and `pnpm.cmd build:official` is byte-identical with 0 errors, 275 warnings, 71 informational decisions, and all 2,857 local static pages. Evidence is recorded in `docs/analysis/spell-effect-damage-scaling-evidence-2026-07-28.md`.

The browser-spec maintenance checkpoint moves the complete spell-detail/cycle flow from the catch-all spike spec into `apps/web/e2e/spells.spec.ts` without changing its assertions. The catch-all spec falls from 1,487 to 1,131 lines, and Playwright still discovers and passes all 34 desktop/mobile cases across two files, including the representative axe sweep. `pnpm.cmd check` passes all 121 unit/artifact tests and the 43-page synthetic export; `pnpm.cmd build:official` remains byte-identical with 0 errors, 1,265 warnings, 71 informational decisions, and all 2,857 local static pages.

The dependency-hardening checkpoint upgrades Next.js and its ESLint configuration to 16.2.12, pins reviewed transitive PostCSS and Sharp versions through workspace overrides, groups compatible weekly Dependabot updates, and adds a separate scheduled production-dependency audit. `pnpm.cmd audit:dependencies` reports no known production vulnerabilities. `pnpm.cmd check` passes all 121 unit/artifact tests, deterministic generation, and the 43-page synthetic export; all 34 desktop/mobile Playwright tests pass; and `pnpm.cmd build:official` deterministically generates zero errors and exports all 2,857 local static pages.

The spell-effect-buff-condition slice preserves 16 active source-buff requirements, 49 required named-buff pairs, and eight forbidden named-buff pairs across 73 direct effects and 38 spells. All 57 named targets resolve with reciprocal backlinks; malformed pairs, invalid flags, simultaneous aliases, and attributes on unsupported effect types remain diagnosed. The later full dependency-hardening validation exercised this slice through all workspace, artifact, desktop/mobile browser, axe, deterministic-generation, and official-export gates. Evidence is recorded in `docs/analysis/spell-effect-buff-condition-evidence-2026-07-28.md`.

The spell AI-hint slice preserves all 47 measured source candidates as ordered, nullable spell- or buff-local metadata. Source precedence leaves 45 active declarations across 45 spells; malformed extensions remain diagnosed, and the page exposes the exact scope/token with an explicit boundary around targeting and runtime behavior. `pnpm.cmd check` passes formatting, lint, type checking, all 113 unit/artifact tests, deterministic generation, and the 43-page synthetic export. All 34 desktop/mobile Playwright tests pass, including AI-hint disclosure, responsive layouts, keyboard flows, and representative axe scans. Deterministic official generation is byte-identical with 2,236 warnings and 71 informational decisions, and the full local static export produces all 2,857 pages. Evidence is recorded in `docs/analysis/spell-ai-hint-evidence-2026-07-28.md`.

The spell effect-list-option slice preserves all 276 measured declarations under 45 typed list effects. It links 84 spell options and 189 of 192 item options, keeps the three unavailable item declarations visible, and exposes reciprocal spell/item navigation without inferring selection or runtime behavior. `pnpm.cmd check` passes formatting, lint, type checking, all 116 unit/artifact tests, deterministic generation, and the 43-page synthetic export. All 34 desktop/mobile Playwright tests pass, including option disclosure/backlinks, responsive layouts, keyboard flows, and representative axe scans. Deterministic official generation is byte-identical with 2,194 warnings and 71 informational decisions, and the full local static export produces all 2,857 pages. Evidence is recorded in `docs/analysis/spell-effect-list-option-evidence-2026-07-28.md`.

The spell-effect-control slice preserves 795 active chance, caster/self/corpse, resistance, burn, and taxonomy values across 711 effects and 403 spells. Both measured chance and caster aliases normalize loss-aware; explicit false and 100-percent values remain visible, malformed or dual aliases stay diagnosed, and the page withholds combined targeting, resistance, ignition, and probability behavior. `pnpm.cmd check` passes formatting, lint, type checking, all 118 unit/artifact tests, deterministic generation, and the 43-page synthetic export. All 34 desktop/mobile Playwright tests pass, including effect-control disclosure, responsive layouts, keyboard flows, and representative axe scans. Deterministic official generation is byte-identical with 1,395 warnings and 71 informational decisions, and the full local static export produces all 2,857 pages. Evidence is recorded in `docs/analysis/spell-effect-control-evidence-2026-07-28.md`.

The spell buff-halo slice preserves all 53 measured active declarations as ordered buff-local presentation metadata. It validates safe hidden sprite references, frame counts/rates, optional first frames, centered flags, and all measured casing aliases; malformed extensions remain diagnosed, and the page exposes only a source-field summary without loading sprites or inferring animation timing. `pnpm.cmd check` passes formatting, lint, type checking, all 111 unit/artifact tests, deterministic generation, and the 43-page synthetic export. All 34 desktop/mobile Playwright tests pass, including halo disclosure, responsive layouts, keyboard flows, and representative axe scans. Deterministic official generation is byte-identical with 2,283 warnings and 71 informational decisions, and the full local static export produces all 2,857 pages. Evidence is recorded in `docs/analysis/spell-buff-halo-evidence-2026-07-28.md`.

The spell buff-description slice preserves all 32 measured candidate declarations as ordered, nullable buff-local text. Source precedence leaves 31 active, non-empty values across 31 spells; malformed or extended declarations remain diagnosed, the text contributes to spell search, and the page displays it inside the matching buff without inferring gameplay semantics. `pnpm.cmd check` passes formatting, lint, type checking, all 110 unit/artifact tests, deterministic generation, and the 43-page synthetic export. All 34 desktop/mobile Playwright tests pass, including description disclosure, responsive layouts, keyboard flows, and representative axe scans. Deterministic official generation passes with 2,336 warnings and 71 informational decisions, and the full local static export produces all 2,857 pages. Evidence is recorded in `docs/analysis/spell-buff-description-evidence-2026-07-28.md`.

The item-toolkit declaration slice preserves all eight measured tags, slot counts, sound cues, safe presentation references, layout rectangles, controls, and close positions in an ordered loss-aware shape. Strict importer and web schemas reject malformed extensions; all 374 recipes and 57 encrustments link through matching toolkit tags; detailed cue/reference/coordinate values remain hidden; and no complete crafting behavior is inferred. `pnpm.cmd check` passes formatting, lint, type checking, all 109 unit/artifact tests, deterministic generation, and the 43-page synthetic export. All 34 desktop/mobile Playwright tests pass, including toolkit disclosure, reciprocal crafting navigation, keyboard focus, responsive layouts, and representative axe scans. `pnpm.cmd build:official` passes deterministic zero-error generation with 2,368 warnings and 71 informational decisions and exports all 2,857 local static pages. Evidence is recorded in `docs/analysis/item-toolkit-declaration-evidence-2026-07-28.md`.

The item-macguffin declaration slice preserves both measured spell references, the one item-class name, and the explicit false consumable flag in an ordered loss-aware shape. Strict importer and web schemas reject malformed extensions, resolved spells link in both directions, the source's missing target remains visible, and activation/targeting/actual-consumption behavior is not inferred. `pnpm.cmd check` passes formatting, lint, type checking, all 105 unit/artifact tests, deterministic generation, and the 42-page synthetic export. All 32 desktop/mobile Playwright tests pass, including macguffin disclosure/backlinks, responsive layouts, keyboard flows, and representative axe scans. `pnpm.cmd build:official` passes deterministic zero-error generation with 2,376 warnings and 71 informational decisions and exports all 2,857 local static pages. Evidence is recorded in `docs/analysis/item-macguffin-declaration-evidence-2026-07-28.md`.

The item-weapon declaration slice completes all measured weapon leaves across the existing semantic category, root quality, fixed modifiers, and hit-trigger relationships plus ordered loss-aware floor-target/presentation metadata. Strict importer and web schemas reject malformed extensions, the item page hides raw presentation references, and no recoverability or combat formula is inferred. `pnpm.cmd check` passes formatting, lint, type checking, all 103 unit/artifact tests, deterministic generation, and the 41-page synthetic export. All 30 desktop/mobile Playwright tests pass, including weapon disclosure, responsive layouts, keyboard flows, and representative axe scans. `pnpm.cmd build:official` passes deterministic zero-error generation with 2,377 warnings and 71 informational decisions and exports all 2,857 local static pages. Evidence is recorded in `docs/analysis/item-weapon-declaration-evidence-2026-07-28.md`.

The item-armour declaration slice preserves all canonical slot, level, and optional `randoms` values in an ordered loss-aware shape, renders the direct values with an explicit no-formula boundary, and rejects malformed or extended source/artifact shapes. `pnpm.cmd check` passes formatting, lint, type checking, all 101 unit/artifact tests, deterministic generation, and the 41-page synthetic export. All 30 desktop/mobile Playwright tests pass, including armour disclosure, the related empty state, responsive layouts, and the representative axe sweep. `pnpm.cmd build:official` passes deterministic zero-error generation with 2,634 warnings and 71 informational decisions, removes exactly the 268 intended armour diagnostics, and exports all 2,857 local static pages. Evidence is recorded in `docs/analysis/item-armour-declaration-evidence-2026-07-28.md`.

The item-gem marker slice strictly validates all 20 canonical empty leaves while keeping the existing `gem` category as their complete representation. `pnpm.cmd check` passes formatting, lint, type checking, all 99 unit/artifact tests, deterministic generation, and the 41-page synthetic export. All 30 desktop/mobile Playwright tests pass, including the new gem route and existing keyboard, no-JavaScript, responsive, and axe coverage. `pnpm.cmd build:official` passes deterministic zero-error generation with 2,902 warnings and 71 informational decisions, removes only the 20 intended gem diagnostics, and exports all 2,857 local static pages. Evidence is recorded in `docs/analysis/item-gem-marker-evidence-2026-07-28.md`.

The static-browse slice adds a server-rendered directory plus 100-record catalogue pages for all nine entity kinds. Focused web tests cover the exhaustive kind map, pagination, and invalid/empty pages. The current `pnpm.cmd check` passes formatting, lint, type checking, all 99 unit/artifact tests, deterministic generation, and the 41-page synthetic export. The current 30 desktop/mobile Playwright tests pass, including a keyboard flow with JavaScript disabled, responsive overflow checks, and browse pages in the representative axe sweep. `pnpm.cmd build:official` passes deterministic zero-error generation and the complete 2,857-page local static export: the 2,767 canonical documents occupy 32 bounded kind pages plus the browse directory. Evidence and remaining boundaries are recorded in `docs/analysis/static-browse-evidence-2026-07-27.md`.

The all-entity search slice exposes every generated kind through one exhaustive entity-type filter and preserves immediate sequential input while debouncing the shareable URL. `pnpm.cmd check` passes formatting, lint, type checking, all 96 unit/artifact tests, deterministic synthetic generation, and the 30-page static export. All 26 desktop/mobile Playwright tests pass, including character-by-character spell search, keyboard navigation, and the representative axe sweep. `pnpm.cmd build:official` passes deterministic zero-error generation and the complete 2,824-page local static export with all 2,767 search documents. Evidence and remaining boundaries are recorded in `docs/analysis/all-entity-search-evidence-2026-07-27.md`.

The hermetic-local-check hardening makes the auxiliary `.claude/worktrees/` boundary repository-owned instead of relying on a machine-private `.git/info/exclude`. The aggregate `pnpm.cmd check` now validates only this checkout and passes formatting, lint, type checking, all 96 unit/artifact tests, deterministic synthetic generation, and the 30-page static export.

The zero-error publication gate passes repository lint and type checking plus all 96 unit/artifact tests, including byte-for-byte preservation of an existing four-file output set after a failing import. A direct CLI failure-path check exits nonzero and creates no output directory for the intentionally invalid synthetic fixture. Deterministic canonical generation succeeds with the gate enabled, ordinary synthetic generation still publishes its deliberate error diagnostic, and the synthetic 30-page static export succeeds.

The strict-input-schema hardening passes repository lint and type checking plus all 95 unit/artifact tests, including root and nested unknown-field coverage for source manifests, patch definitions, and both route-registry target shapes. Synthetic and canonical imports remain compatible and byte-identical across repeated generation, and the synthetic 30-page static export succeeds.

The XML diagnostic-location hardening passed 30 pipeline tests, including CRLF input, repeated empty children, a same-named nested child, per-record provenance, and a missing-name record. Repository lint, type checking, all 92 unit/artifact tests, deterministic synthetic generation, and the 30-page static export pass when invoked independently. The deterministic canonical import still reports 0 errors, 2,922 warnings, and 71 informational decisions; all 257 `<weapon>` and 268 `<armour>` diagnostics now have distinct declaring locations. Its corrected artifact is 5,465,007 bytes and the search artifact remains 1,344,780 bytes.

The patch-contract hardening passed 50 domain tests, 29 pipeline tests, 12 web artifact tests, lint, type checking, deterministic synthetic generation, and the 30-page static export. No browser behavior changed in that slice.

The item trap metadata checkpoint passed:

- `pnpm.cmd check`: 42 domain tests, 28 pipeline tests, 12 web artifact tests, deterministic synthetic generation, and 30 static pages;
- `pnpm.cmd test:e2e`: 24 desktop/mobile tests including responsive and axe coverage;
- `pnpm.cmd generate:official:check`: byte-identical canonical output; and
- `pnpm.cmd build:official`: 2,824 static pages.

The canonical artifact measured 5,462,796 bytes; the unchanged search artifact measured 1,344,780 bytes. These ignored local measurements are evidence only, not publication approval.
