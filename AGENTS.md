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

## Current repository state

- The intact historical application lives under `legacy/`; serve that directory as the document root when checking legacy behavior.
- The base game and three expansion data directories inside `legacy/` intentionally contain only `mod.xml`; proprietary XML and assets are not committed.
- Ten historical mods and many of their assets are committed.
- No modern application has been scaffolded yet. The owner approved the direction described by decision 0001, but the ADR remains proposed until the architecture spike and publication-policy gates are complete.
- Run `powershell -ExecutionPolicy Bypass -File scripts/audit-legacy.ps1` for a repeatable baseline audit.

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

Do not invent package commands while the modern workspace is absent. After scaffolding, keep canonical commands in the root `package.json`, `CONTRIBUTING.md`, and this file synchronized.

## Definition of done

A change is done when its behavior is implemented, relevant automated checks pass, failure states are handled, documentation is current, and no restricted data or unrelated edits were introduced. Data-pipeline changes also require deterministic-output and broken-reference checks. UI changes also require desktop/mobile and keyboard verification proportional to the change.

## Legacy editing rules

- Avoid formatting or dependency cleanup in legacy files unless required by the task.
- Document discovered legacy behavior before changing it.
- Prefer explicit compatibility fixtures over copying legacy implementation details blindly.
- Known baseline defects, including the invalid `windmagic/mod/spellDB.xml`, are evidence. Fix them only through an intentional migration/patch decision.
