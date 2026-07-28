# AI agent conversation resume

Updated: 2026-07-28

Use this document to resume the ongoing Dredmorpedia rebuild in a fresh AI conversation. It is a practical workflow/checkpoint summary, not a replacement for `AGENTS.md`, the project brief, architecture records, data policy, roadmap, or the detailed machine handoff.

## Suggested opening instruction

> Read `AGENTS.md` and `docs/handoff/ai-agent-conversation-resume.md` completely, then inspect Git status and the current roadmap/handoff state. Continue with the next smallest coherent parity slice. Treat the local game installation as read-only, never expose its path, do not publish generated official data, include automated coverage and exact manual test steps, and do not commit or push until I ask.

## Current checkpoint

- Repository: `https://github.com/dredmorpedia/dredmorpedia.git`.
- Working branch: `master`, with direct owner-requested commits to `origin/master`.
- Latest pushed checkpoint before the current AI-hint work: `afa3a7e` (`Model spell buff halos`). Always verify with `git log` rather than assuming this remains HEAD.
- Canonical read-only source baseline: Dungeons of Dredmor `1.1.5 public_beta`, Steam build `22934623`, base game plus all three official expansions.
- The modern workspace is under `apps/web`, `packages/domain`, and `packages/data-pipeline`; tracked legal fixtures are under `fixtures/synthetic`; the preserved reference application is under `legacy`.
- Generated official artifacts remain ignored under `data/generated/official-local/` and are not approved for publication.
- Node is pinned by `.node-version` to `24.18.0`; the workspace uses pnpm through Corepack. On Windows, use `pnpm.cmd` when needed.
- Development runs on `http://localhost:3001/`.

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

The rebuild currently has deterministic static routes, structured search, and bounded server-rendered browse catalogues across items, stats, recipes, encrustments, spells, skills, abilities, monsters, and targeting templates. Search keeps typed input local while debouncing shareable URL updates so an older navigation cannot overwrite newer characters. The browse directory and its 100-record pages expose every direct detail route without JavaScript. Detail breadcrumbs, the primary navigation, home item discovery, and the 404 recovery path lead into that catalogue. The application includes provenance/override/patch history, route aliases, crafting/encrusting/loadout/spell/monster-family/drop backlinks, explicit missing-reference states, and cycle-safe spell traversal.

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

Other completed areas include spell mana/buff/presentation/effect relationships, ordered buff-local descriptions and their search text, loss-aware buff-halo presentation metadata, ordered spell- and buff-local AI hint metadata, all measured skill/ability child elements, monster profile/inheritance/AI/sight/movement/presentation/spell/drop data, verified monster primary attributes, encrustment outcomes/shared instability effects, and accessible targeting-template previews.

## Current measured backlog and likely next work

After the spell AI-hint slice, the canonical import reports:

- 0 errors, 2,236 warnings, and 71 informational duplicate decisions;
- 2,203 unsupported/partially-supported constructs, all spell diagnostics;
- 20 dangling references tracked separately; and
- 13 spell requirement diagnostics tracked separately.

No item compatibility diagnostic remains.

The ordered repository-wide hardening queue is complete. Patch overlays enforce complete normalized field invariants and exclude derived compatibility arrays; XML provenance and diagnostics use record-specific locations; source manifests, patch definitions, and route registries reject unknown fields at every object level; official output publication requires zero error diagnostics; and tool-owned `.claude/worktrees/` checkouts are excluded from both Git status and formatting inputs. The all-entity search slice removed the web-only allow-list that hid 1,969 already-generated official records and made query typing resilient to asynchronous URL updates. The following static-browse slice closed the audit's no-JavaScript discovery gap with 32 bounded canonical catalogue pages plus a directory. The next implementation task should return to the measured parity backlog after remeasurement.

After the review-hardening queue, remeasure rather than relying only on the recorded backlog counts. Every measured item family is now complete. The next content-parity task should select one measured spell-mechanic family from the much larger spell backlog and give it an independently evidenced contract rather than blanket-supporting spell content.

Phase 0 policy gates remain open: official/generated publication rights, inherited code/mod/asset licensing, formal ADR 0001/0002 acceptance, first-parity acceptance, search budgets/relevance examples, and an approved source for official stat definitions. Do not resolve these by assumption.

## Git and owner handoff convention

- When the owner asks to commit and push, inspect the exact diff, stage only the coherent verified scope, use a terse descriptive commit message, and push `master` to `origin/master` unless the owner changes the workflow.
- Do not open a pull request unless requested.
- The Codex process may report a stale `gh auth status` token even while Git HTTPS push succeeds through the machine credential manager. Never expose token values; use the actual Git push result as evidence for direct pushes.
- After every user-visible development task, provide manual verification instructions even when automated checks are comprehensive.

## Last completed slice validation

The spell AI-hint slice preserves all 47 measured source candidates as ordered, nullable spell- or buff-local metadata. Source precedence leaves 45 active declarations across 45 spells; malformed extensions remain diagnosed, and the page exposes the exact scope/token with an explicit boundary around targeting and runtime behavior. `pnpm.cmd check` passes formatting, lint, type checking, all 113 unit/artifact tests, deterministic generation, and the 43-page synthetic export. All 34 desktop/mobile Playwright tests pass, including AI-hint disclosure, responsive layouts, keyboard flows, and representative axe scans. Deterministic official generation is byte-identical with 2,236 warnings and 71 informational decisions, and the full local static export produces all 2,857 pages. Evidence is recorded in `docs/analysis/spell-ai-hint-evidence-2026-07-28.md`.

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
