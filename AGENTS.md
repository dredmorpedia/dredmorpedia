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
6. `docs/handoff/new-pc-and-codex.md` when resuming on a new machine or in a context-free Codex task

## Current repository state

- The intact historical application lives under `legacy/`; serve that directory as the document root when checking legacy behavior.
- The base game and three expansion data directories inside `legacy/` intentionally contain only `mod.xml`; proprietary XML and assets are not committed.
- Ten historical mods and many of their assets are committed.
- The modern workspace contains `apps/web`, `packages/domain`, `packages/data-pipeline`, and independently authored fixtures under `fixtures/synthetic`.
- Generated artifacts live under gitignored `data/generated/`; dataset schema 3 separates normalized entities from search schema 1 and carries versioned source/patch provenance. Source-manifest schema 2 can declare a version-scoped route registry that pins canonical slugs and historical aliases. The web application consumes generated artifacts and must never parse raw XML.
- The canonical read-only measurement baseline is Dungeons of Dredmor `1.1.5 beta_preview`, Steam build `22934623` on internal branch key `public_beta`, with all three official expansions. Never record the local installation path.
- ADR 0001 and ADR 0002 are technically validated but remain proposed until the publication-policy gate is complete. ADR 0003's split artifact/query path is implemented but its user-facing budgets remain open. Evidence is recorded under `docs/analysis/`.
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
- `pnpm dev` — generate data and start the web application.
- `pnpm check` — format check, lint, typecheck, unit/integration tests, deterministic generation, and production build.
- `pnpm test:e2e` — desktop/mobile interaction, keyboard-flow, and axe checks; install Chromium with `pnpm --filter @dredmorpedia/web exec playwright install chromium` first.
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
