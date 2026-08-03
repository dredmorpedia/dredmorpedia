# Dredmorpedia agent guide

This file applies to the whole repository. More specific `AGENTS.md` files may be added later inside independently buildable packages.

## Mission

Dredmorpedia is being rebuilt as a modern, fast, accessible encyclopedia and toolset for Dungeons of Dredmor. The committed jQuery application is the behavioral reference, not the target architecture.

Read these files before making a substantial change:

1. `PROJECT.md`
2. `docs/analysis/repository-audit-2026-07-19.md`
3. `docs/architecture/modernization-proposal.md`
4. `docs/roadmap.md`
5. Relevant records in `docs/decisions/`
6. `docs/data-and-assets-policy.md` and `docs/licensing-policy.md` for content,
   publication, or licensing scope
7. `docs/handoff/new-pc-and-codex.md` when resuming on a new machine or in a context-free Codex task
8. `docs/handoff/ai-agent-conversation-resume.md` when resuming ongoing incremental work in a fresh conversation

## Current repository state

- The intact historical application lives under `legacy/`; serve that directory as the document root when checking legacy behavior.
- The base game and three expansion data directories inside `legacy/` intentionally contain only `mod.xml`; proprietary XML and assets are not committed.
- Ten historical mods and many of their assets are committed.
- The modern workspace contains `apps/web`, `packages/domain`, `packages/data-pipeline`, and independently authored fixtures under `fixtures/synthetic`.
- Generated artifacts live under gitignored `data/generated/`; dataset schema 3 separates normalized entities from search schema 2 and carries versioned source/patch provenance. Search documents include deterministic route aliases for project-owned, user-selected zero-result spelling suggestions. Output-manifest schema 2 is published last as a commit marker; the web verifies every output checksum, complete runtime schema, search derivation, and diagnostic counts. Source-manifest schema 2 can declare a version-scoped route registry that pins canonical slugs and historical aliases. The web application consumes generated artifacts for a bounded home preview and static item, stat, recipe, encrustment, spell, skill, ability, and monster routes with semantic item-category facets, deterministic crafting, encrusting, loadout, spell, buff-event, spell-buff-polymorph, spell-list-option, spell-direct-item, spell-direct-monster, spell-named-buff-removal, spell-effect-condition, macguffin, toolkit, monster-family, and monster-drop backlinks, item recovery, wand-charge, trap, armour, weapon, macguffin, and toolkit source metadata, signed item/ability/spell/encrustment/monster modifiers including spell-buff sight-radius declarations, ordered spell-buff descriptions, invisibility declarations, casting-prevention declarations, and named polymorph declarations, fixed item-modifier search facets, loss-aware spell animation/impact, direct-effect, and buff-halo presentation metadata, ordered spell- and buff-local AI hint metadata, typed ordered item/spell effect-list options, loss-aware direct spell-effect item, monster, and named buff-removal targets, damage/scaling/duration, `after`, bleed, skip-animation, Midas, created-object sprite, and dig graphics-regeneration metadata, controls, and buff conditions, dodge hooks, monster core profiles, spell hooks, direct named/type-driven drops, and explicitly uninterpreted source metadata; it must never parse raw XML.
- Generated input checksums are captured from the exact byte snapshot used by
  parsing or, for referenced assets, from the first registration read. Do not
  reintroduce end-of-import source rereads.
- The web initializes generated output as one verified artifact set. It checks
  every declared output checksum, schema, and cross-file invariant before
  caching or returning even the main artifact.
- The canonical read-only measurement baseline is Dungeons of Dredmor `1.1.5 public_beta`, Steam build `22934623` on internal branch key `public_beta`, with all three official expansions. Never record the local installation path.
- Buff-local spell effects use the same strict effect contract and deterministic
  relationship linker as direct effects while retaining their owning buff
  scope. Consumers must not infer scheduling, trigger order, buff lifetime,
  tick timing, eligibility, or runtime success from their containment.
- Direct trigger/damage-over-time spell conditions preserve loss-aware source-buff requirements and paired named required/forbidden buff references. Consumers must not infer buff-presence evaluation order, trigger eligibility, duration, consumption, or timing from them.
- Direct named buff-removal spell effects preserve only their paired source spell target. Consumers must not infer eligibility, actor or area, evaluation order, timing, stack selection, removal count, interaction with removable flags, or runtime success.
- Buff-local invisibility declarations preserve only their marker and optional source amount. Consumers must not infer visibility strength, detection, actor scope, breaking conditions, stacking, duration, targeting, AI behavior, or runtime success.
- Buff-local mute declarations preserve only the legacy casting-prevention label and optional source amount. Consumers must not infer affected actors or spell categories, amount meaning, immunity, resistance, stacking, duration, removal, or runtime success.
- Buff-local polymorph declarations preserve only their paired source monster target and optional resolved monster ID. Consumers must not infer transformation duration, stat or ability replacement, equipment behavior, targeting, faction, reversibility, or runtime success.
- Direct spell-effect damage declarations preserve source amounts and factor coefficients alongside loss-aware amount/floor factors and primary/secondary scaling source IDs. Consumers must not combine them with undeclared engine defaults or infer final damage, healing, mana, spawn, or combat formulas.
- Direct spell-effect `after` declarations preserve explicit true/false source flags. Consumers must not infer evaluation order, delay, scheduling, or trigger timing from them.
- Direct spell-effect `bleed` declarations preserve explicit true/false source flags. Consumers must not infer damage, duration, stacking, resistance, target selection, or other runtime behavior from them.
- Direct spell-effect skip-animation declarations preserve both source casing forms as explicit true/false flags. Consumers must not infer animation order, timing, synchronization, target selection, or which presentation sequence the engine suppresses.
- Direct spell-effect presentation preserves safe hidden sprite references, frame counts/rates, centered flags, and symbolic sound cues. Consumers must not infer timing units, animation order, target placement, synchronization, sound playback, or other engine behavior.
- Direct `create` and `dig` spell effects preserve separate loss-aware
  created-object sprite references and graphics-regeneration flags. Consumers
  must not infer object type or lifetime, terrain changes, redraw timing,
  placement, persistence, or runtime success.
- Direct damage-effect `midas` declarations preserve the exact loss-aware
  source flag. Consumers must not infer gold conversion eligibility, target
  transformation, currency value, drops, persistence, or runtime success.
- Direct `spawn` and `spawnitematlocation` spell effects preserve loss-aware item source labels and link only matching normalized items. Consumers must not infer that source-only labels are missing entities or infer random selection, inventory placement, availability, timing, or other spawning behavior.
- Direct `summon` and `summonhostile` spell effects preserve loss-aware monster source labels and link matching normalized monsters. Consumers must not infer availability, allegiance, placement, lifetime, AI state, selection, timing, or other spawning behavior.
- Direct item artifact declarations are normalized as ordered, loss-aware quality metadata; consumers must not infer artifact-generation or corruption behavior from that source value.
- Direct item and ability spell triggers preserve ordered exact source flags; the measured `after` flag remains uninterpreted timing metadata.
- Direct weapon declarations preserve loss-aware floor-target flags and safe hidden thrown-presentation references; consumers must not infer recoverability or combat formulas.
- Direct macguffin declarations preserve spell, class-name, and consumable source values; consumers must not infer activation, targeting, or actual-consumption behavior.
- Direct toolkit declarations preserve crafting tags, slot counts, symbolic sound cues, safe presentation references, and old game-interface coordinates. Matching recipe/encrustment tags link bidirectionally, but detailed cue/reference/coordinate values stay hidden; consumers must not use the coordinates for the modern UI or infer a complete crafting runtime formula.
- Trap activation, caster-targeting, and placement fields remain direct source metadata; consumers must not infer reset timing, target selection, or placement behavior, and raw origin asset paths stay hidden while publication rights are unresolved.
- ADR 0001 and ADR 0002 are accepted under the owner-approved local-first
  official-content boundary. ADR 0003's split artifact/query path is
  implemented, including bounded user-selected zero-result name/alias
  suggestions; user-facing budgets remain open. ADR 0004 accepts inherited
  route reservations and tombstones for shared dataset lineages, with
  enforcement still pending. Evidence is recorded under `docs/analysis/`.
- Run `pnpm audit:legacy` for the repeatable legacy audit and `pnpm check` for the non-browser modern workspace checks.

## Non-negotiable constraints

- Do not commit proprietary base-game or expansion data, generated derivatives of unclear redistribution status, credentials, or local installation paths.
- Treat every local game installation as read-only. Tools may inspect files and may copy approved inputs into a gitignored workspace, but must never patch, rename, move, delete, or create files inside the installation.
- Do not assume the bundled mods or assets have licenses that permit redistribution. Preserve them while provenance is investigated; do not expand their use without an explicit decision.
- Keep the legacy application runnable as a reference until replacement parity is demonstrated. Prefer a side-by-side rebuild under the target workspace rather than rewriting legacy files in place.
- Treat XML and mod content as untrusted input. Parse it outside rendering, validate it, escape it at presentation boundaries, and report errors with source locations.
- Make data processing deterministic. Source precedence, duplicate resolution, stable IDs/slugs, relationships, and diagnostics must never depend on request timing or filesystem enumeration order.
- Preserve provenance on normalized records: source ID, source file, original name/ID where present, and applied patch information.
- Use small synthetic or explicitly redistributable fixtures in tests. Tests must not require a local game installation unless clearly marked as optional integration tests.
- New UI must be responsive, keyboard operable, semantically structured, and tested for common accessibility failures.
- The local MVP targets `1.1.5 public_beta`. Do not build a version switcher
  until a second complete, verified dataset exists.
- A future local asset importer may copy only assets referenced by displayed
  entities/features into gitignored generated output. It must remain read-only
  toward the installation and must not bulk-copy unrelated resources.

## Architecture boundaries for the rebuild

Until an accepted decision supersedes this section, keep these conceptual boundaries even if folder names change:

- `web`: routes, presentation, metadata, and thin interactive islands.
- `domain`: framework-independent TypeScript types, calculations, source precedence, linking, and query logic.
- `data-pipeline`: filesystem discovery, XML parsing, normalization, validation, diagnostics, and generated artifacts.
- `fixtures`: minimal legal test inputs that cover schema quirks and cross-references.

The web layer must not parse raw XML. The parser must not import UI code. Domain logic should be testable without a browser or framework runtime.

## Working method

1. Inspect `git status` and preserve unrelated user changes.
2. Identify the relevant project brief, audit finding, roadmap item, and architecture decision.
3. Read `docs/data-and-assets-policy.md` before accessing game files, adding fixtures, generating datasets, or publishing assets.
4. If a change introduces or reverses an important technical/product choice, add or update an ADR before implementation.
5. Implement the smallest coherent vertical slice, including tests and user-visible error states.
6. Run the narrow checks first, then the repository-wide checks documented by the package once the new workspace exists.
7. Update documentation when behavior, commands, constraints, or decisions change.
8. When handing off a user-visible change, give the owner concise manual test steps with exact commands or routes and the expected result. Include both the primary behavior and the most relevant failure, accessibility, responsive, or regression check that can be verified locally.

Keep canonical commands in the root `package.json`, `CONTRIBUTING.md`, and this file synchronized.

## Canonical workspace commands

- `pnpm install --frozen-lockfile` — install the pinned workspace.
- `pnpm generate:check` — regenerate the synthetic artifact twice and prove byte-identical output.
- `pnpm dev` / `pnpm dev:synthetic` — regenerate the legal synthetic artifact and start the web application on `http://localhost:3001/`.
- `pnpm migrate:official-manifest` — idempotently migrate the ignored canonical four-source manifest from schema 1 to the reviewed schema-2 game/build provenance without changing source roots.
- `pnpm dev:official` — regenerate the ignored official artifact with a zero-error publication gate and start the same local application against it.
- `pnpm generate:official:check` — deterministically regenerate the ignored official artifact with a zero-error publication gate, without starting the web application.
- `pnpm build:official` — deterministically regenerate the ignored official artifact with a zero-error publication gate and verify the full local static export.
- `pnpm check` — format check, lint, typecheck, unit/integration tests, deterministic generation, and production build.
- `pnpm test:e2e` — desktop/mobile interaction, keyboard-flow, and axe checks; install Chromium with `pnpm --filter @dredmorpedia/web exec playwright install chromium` first.
- `pnpm audit:dependencies` — fail on high-severity production dependency advisories; the scheduled dependency-audit workflow runs the same gate.
- `pnpm audit:legacy` — repeatable preserved-application audit.

## Session and machine handoff

- Treat repository documentation and committed tests as durable memory; do not rely on a previous chat being available.
- Keep `docs/handoff/new-pc-and-codex.md` current when repository state, agreed direction, blockers, or the immediate next milestone changes materially.
- Use `scripts/create-transfer-package.ps1` for an unpushed machine transfer. It packages committed Git history and restore instructions without collecting ignored local data.
- On a new machine, ask the owner for the current game-installation path if read-only integration work needs it. Never reuse or commit a path remembered from another machine.

## Definition of done

A change is done when its behavior is implemented, relevant automated checks pass, failure states are handled, documentation is current, manual verification steps are provided to the owner, and no restricted data or unrelated edits were introduced. Data-pipeline changes also require deterministic-output and broken-reference checks. UI changes also require desktop/mobile and keyboard verification proportional to the change.

## Legacy editing rules

- Avoid formatting or dependency cleanup in legacy files unless required by the task.
- Document discovered legacy behavior before changing it.
- Prefer explicit compatibility fixtures over copying legacy implementation details blindly.
- Known baseline defects, including the invalid `windmagic/mod/spellDB.xml`, are evidence. Fix them only through an intentional migration/patch decision.
