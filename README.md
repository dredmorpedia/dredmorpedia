# Dredmorpedia

Dredmorpedia is being rebuilt as a modern encyclopedia and planning toolkit for [Dungeons of Dredmor](https://www.dungeonsofdredmor.com/). This fork preserves the historical application as a behavioral reference while a typed, deterministic, accessible replacement is developed from scratch.

The repository is currently at the foundation stage: the legacy application has been isolated, the existing system has been audited, and the proposed modern architecture is documented. No modern web workspace has been scaffolded yet.

## Repository map

- [`legacy/`](legacy/) - intact historical jQuery application and its historical setup documentation.
- [`PROJECT.md`](PROJECT.md) - product scope, principles, confirmed direction, and open decisions.
- [`docs/analysis/`](docs/analysis/) - evidence gathered from the inherited repository and runtime.
- [`docs/architecture/`](docs/architecture/) - recommended rebuild architecture and technical stack.
- [`docs/decisions/`](docs/decisions/) - architecture decision records (ADRs).
- [`docs/roadmap.md`](docs/roadmap.md) - delivery phases and exit criteria.
- [`docs/data-and-assets-policy.md`](docs/data-and-assets-policy.md) - current rules for local game files, generated data, and publication.
- [`docs/handoff/new-pc-and-codex.md`](docs/handoff/new-pc-and-codex.md) - current state, decisions, next milestone, and new-machine restoration guide.
- [`AGENTS.md`](AGENTS.md) and [`CONTRIBUTING.md`](CONTRIBUTING.md) - working conventions for coding agents and human contributors.

## Check the preserved application

Run the repeatable baseline audit from the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/audit-legacy.ps1
```

To view the historical site, serve `legacy/` as the document root rather than opening its HTML directly. For example, with Python installed:

```powershell
python -m http.server 8000 --directory legacy
```

Then open `http://localhost:8000/`. A clean checkout intentionally lacks proprietary official databases and most official assets, so much of the legacy interface will be empty unless approved local inputs are supplied.

The instructions in [`legacy/README.md`](legacy/README.md) are preserved historical documentation, not the canonical rebuild workflow. In particular, do not run its mutation commands against a game installation.

## Data and legal boundary

A local Dungeons of Dredmor installation is read-only input. Repository tooling must never alter it. Official data, assets, local paths, and generated derivatives with unresolved redistribution rights must not be committed or published. Tests should use small synthetic or explicitly redistributable fixtures.

The inherited repository has no project-wide license, and bundled mods/assets do not have one obvious common license. See the [data and assets policy](docs/data-and-assets-policy.md) before importing or publishing content.

## Direction

The proposed platform is a strict TypeScript/pnpm workspace with a deterministic XML pipeline, framework-independent domain packages, and a statically exported Next.js application. The owner has approved this direction, Tailwind-based game-inspired styling, light/dark/system themes, official base-game plus three-DLC coverage, and functional parity before the quality-of-life phase. ADR 0001 remains proposed until its spike and policy checks are complete.

Start with the [project brief](PROJECT.md), [repository audit](docs/analysis/repository-audit-2026-07-19.md), [modernization proposal](docs/architecture/modernization-proposal.md), and [roadmap](docs/roadmap.md).

## Moving to another computer

Prefer the repository's transfer-package script over zipping the working folder directly:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/create-transfer-package.ps1
```

It requires a clean working tree and creates a ZIP beside the repository containing the complete committed Git history, a checksum manifest, and restore instructions. Ignored local game data, generated artifacts, credentials, and machine-specific configuration are not included. See the [new-PC handoff](docs/handoff/new-pc-and-codex.md) for the restore procedure and limitations.
