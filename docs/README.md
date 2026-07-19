# Project documentation

This directory is the durable memory for the Dredmorpedia rebuild.

## Orientation

- [`../PROJECT.md`](../PROJECT.md) — product mission, audiences, principles, constraints, and open decisions.
- [`analysis/repository-audit-2026-07-19.md`](analysis/repository-audit-2026-07-19.md) — dated evidence about the legacy repository and runtime.
- [`architecture/modernization-proposal.md`](architecture/modernization-proposal.md) — recommended target architecture, stack, alternatives, and feature opportunities.
- [`data-and-assets-policy.md`](data-and-assets-policy.md) — mandatory safety and publication boundary for local game files, generated data, mods, and assets.
- [`roadmap.md`](roadmap.md) — phased delivery plan and exit criteria.
- [`decisions/`](decisions/) — architecture decision records (ADRs), including proposals that still need owner approval.

## Documentation rules

- Dated audits describe what was observed at a point in time; do not rewrite history when the code changes. Add a new audit or an explicit update section.
- Architecture proposals may change during discovery. Durable accepted decisions belong in ADRs.
- Keep the project brief focused on stable product intent, not implementation details.
- Never put a contributor's local game-installation path in committed documentation, diagnostics, or examples.
- Keep commands in `AGENTS.md`, `CONTRIBUTING.md`, and the root package configuration synchronized after the modern workspace is scaffolded.
