# AI agent conversation resume

Updated: 2026-07-27

Use this document to resume the ongoing Dredmorpedia rebuild in a fresh AI conversation. It is a practical workflow/checkpoint summary, not a replacement for `AGENTS.md`, the project brief, architecture records, data policy, roadmap, or the detailed machine handoff.

## Suggested opening instruction

> Read `AGENTS.md` and `docs/handoff/ai-agent-conversation-resume.md` completely, then inspect Git status and the current roadmap/handoff state. Continue with the next smallest coherent parity slice. Treat the local game installation as read-only, never expose its path, do not publish generated official data, include automated coverage and exact manual test steps, and do not commit or push until I ask.

## Current checkpoint

- Repository: `https://github.com/dredmorpedia/dredmorpedia.git`.
- Working branch: `master`, with direct owner-requested commits to `origin/master`.
- Pushed checkpoint before the current review-hardening work: `246a599` (`Add item trap metadata`). Always verify with `git log` rather than assuming this remains HEAD.
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

The rebuild currently has deterministic static routes and search for items, stats, recipes, encrustments, spells, skills, abilities, monsters, and targeting templates. It includes provenance/override/patch history, route aliases, crafting/encrusting/loadout/spell/monster-family/drop backlinks, explicit missing-reference states, and cycle-safe spell traversal.

Important completed item slices include:

- semantic item categories;
- signed fixed item modifiers and modifier search facets;
- loss-aware artifact quality;
- direct hit/kill trigger aliases and exact source flags;
- food/booze recovery, wand charges, and potion/mushroom trigger leaves; and
- trap activation, level, caster-targeting, safe placement-source metadata, and stepped-on spell links.

The latest canonical trap slice covers 54 active declarations and 54 resolved spell links, removes all 54 former trap compatibility diagnostics, and deliberately does not infer reset timing, target selection, or placement behavior. Evidence is in `docs/analysis/item-trap-metadata-evidence-2026-07-23.md`.

Other completed areas include spell mana/buff/presentation/effect relationships, all measured skill/ability child elements, monster profile/inheritance/AI/sight/movement/presentation/spell/drop data, verified monster primary attributes, encrustment outcomes/shared instability effects, and accessible targeting-template previews.

## Current measured backlog and likely next work

After the trap slice, the canonical import reports:

- 0 errors, 2,922 warnings, and 71 informational duplicate decisions;
- 2,888 unsupported/partially-supported item/spell constructs: 555 item and 2,333 spell diagnostics;
- 19 dangling references tracked separately; and
- 15 spell requirement/extra-attribute diagnostics tracked separately.

Remaining item element diagnostics are:

- 268 `armour`;
- 257 `weapon`;
- 20 `gem`;
- 8 `toolkit`; and
- 2 `macguffin`.

The repository-wide review is being addressed in priority order. Patch overlays now enforce the complete normalized field invariants for prices, skill levels, monster levels, encrustment instability, and template grids; derived `loadoutItemKeys` and `spellKeys` compatibility arrays are no longer patchable. XML provenance and diagnostics use parser-captured record offsets, while unsupported direct children use a parent-bounded scanner so repeated and empty tags resolve to the declaring record rather than the first same-named tag in a file. Source manifests, patch definitions, and route registries now reject unknown fields at every object level rather than silently stripping misspelled configuration. The immediate next hardening task is an opt-in zero-error gate for official generation, followed by hermetic local checks.

After the review-hardening queue, remeasure rather than relying only on the recorded backlog counts. A small `gem`, `toolkit`, or `macguffin` slice may be appropriate if its official and legacy shapes form a coherent user-visible contract. Do not combine unrelated families merely to reduce the count. Weapon/armour work is larger and should be split by independently evidenced semantics rather than blanket-marking the root element supported.

Phase 0 policy gates remain open: official/generated publication rights, inherited code/mod/asset licensing, formal ADR 0001/0002 acceptance, first-parity acceptance, search budgets/relevance examples, and an approved source for official stat definitions. Do not resolve these by assumption.

## Git and owner handoff convention

- When the owner asks to commit and push, inspect the exact diff, stage only the coherent verified scope, use a terse descriptive commit message, and push `master` to `origin/master` unless the owner changes the workflow.
- Do not open a pull request unless requested.
- The Codex process may report a stale `gh auth status` token even while Git HTTPS push succeeds through the machine credential manager. Never expose token values; use the actual Git push result as evidence for direct pushes.
- After every user-visible development task, provide manual verification instructions even when automated checks are comprehensive.

## Last completed slice validation

The strict-input-schema hardening passes repository lint and type checking plus all 95 unit/artifact tests, including root and nested unknown-field coverage for source manifests, patch definitions, and both route-registry target shapes. Synthetic and canonical imports remain compatible and byte-identical across repeated generation, and the synthetic 30-page static export succeeds.

The XML diagnostic-location hardening passed 30 pipeline tests, including CRLF input, repeated empty children, a same-named nested child, per-record provenance, and a missing-name record. Repository lint, type checking, all 92 unit/artifact tests, deterministic synthetic generation, and the 30-page static export pass when invoked independently. The aggregate `pnpm.cmd check` currently stops at formatting because Prettier traverses pre-existing Git-ignored `.claude/worktrees/`; fixing that hermetic-check boundary remains a later review item. The deterministic canonical import still reports 0 errors, 2,922 warnings, and 71 informational decisions; all 257 `<weapon>` and 268 `<armour>` diagnostics now have distinct declaring locations. Its corrected artifact is 5,465,007 bytes and the search artifact remains 1,344,780 bytes.

The patch-contract hardening passed 50 domain tests, 29 pipeline tests, 12 web artifact tests, lint, type checking, deterministic synthetic generation, and the 30-page static export. No browser behavior changed in that slice.

The item trap metadata checkpoint passed:

- `pnpm.cmd check`: 42 domain tests, 28 pipeline tests, 12 web artifact tests, deterministic synthetic generation, and 30 static pages;
- `pnpm.cmd test:e2e`: 24 desktop/mobile tests including responsive and axe coverage;
- `pnpm.cmd generate:official:check`: byte-identical canonical output; and
- `pnpm.cmd build:official`: 2,824 static pages.

The canonical artifact measured 5,462,796 bytes; the unchanged search artifact measured 1,344,780 bytes. These ignored local measurements are evidence only, not publication approval.
