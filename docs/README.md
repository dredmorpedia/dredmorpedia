# Project documentation

This directory is the durable memory for the Dredmorpedia rebuild.

## Orientation

- [`../PROJECT.md`](../PROJECT.md) — product mission, audiences, principles, constraints, and open decisions.
- [`analysis/repository-audit-2026-07-19.md`](analysis/repository-audit-2026-07-19.md) — dated evidence about the legacy repository and runtime.
- [`analysis/architecture-spike-2026-07-19.md`](analysis/architecture-spike-2026-07-19.md) — implemented synthetic-spike evidence, measurements, checks, and remaining validation gates.
- [`analysis/first-parity-foundation-2026-07-19.md`](analysis/first-parity-foundation-2026-07-19.md) — split-artifact, search, stat-route, accessibility, and read-only official validation evidence.
- [`analysis/item-artifact-evidence-2026-07-22.md`](analysis/item-artifact-evidence-2026-07-22.md) — loss-aware item artifact-quality semantics, canonical measurements, diagnostics reduction, and regression boundary.
- [`analysis/item-direct-trigger-evidence-2026-07-23.md`](analysis/item-direct-trigger-evidence-2026-07-23.md) — direct item trigger aliases, exact source flags, canonical relationship coverage, and diagnostics reduction.
- [`analysis/item-use-metadata-evidence-2026-07-23.md`](analysis/item-use-metadata-evidence-2026-07-23.md) — food/booze recovery, wand charge ranges, consumable trigger leaves, canonical measurements, and diagnostics reduction.
- [`analysis/item-trap-metadata-evidence-2026-07-23.md`](analysis/item-trap-metadata-evidence-2026-07-23.md) — loss-aware trap activation, targeting, placement coverage, canonical measurements, and diagnostics reduction.
- [`analysis/spell-mana-cost-evidence-2026-07-22.md`](analysis/spell-mana-cost-evidence-2026-07-22.md) — legacy semantics, canonical shape measurements, compatibility aliases, and explicit mana-formula limits.
- [`analysis/spell-buff-evidence-2026-07-22.md`](analysis/spell-buff-evidence-2026-07-22.md) — legacy buff behavior, canonical source-shape measurements, signed modifier coverage, and explicit nested-mechanic limits.
- [`analysis/spell-buff-event-hook-evidence-2026-07-22.md`](analysis/spell-buff-event-hook-evidence-2026-07-22.md) — target/player hit hook semantics, relationship coverage, canonical counts, and remaining nested-buff limits.
- [`architecture/modernization-proposal.md`](architecture/modernization-proposal.md) — recommended target architecture, stack, alternatives, and feature opportunities.
- [`data-and-assets-policy.md`](data-and-assets-policy.md) — mandatory safety and publication boundary for local game files, generated data, mods, and assets.
- [`handoff/new-pc-and-codex.md`](handoff/new-pc-and-codex.md) — machine-transfer procedure, current repository state, agreed decisions, and the next task for a context-free Codex session.
- [`roadmap.md`](roadmap.md) — phased delivery plan and exit criteria.
- [`decisions/`](decisions/) — architecture decision records (ADRs), including owner-approved directions that still need technical or policy validation.
- [`contracts/generated-artifacts.md`](contracts/generated-artifacts.md) — versioned normalized/search/diagnostic artifact contract and evolution rules.
- [`contracts/source-manifest-and-patches.md`](contracts/source-manifest-and-patches.md) — versioned source selection, precedence, and guarded patch-overlay contract.
- [`product/first-parity-slice.md`](product/first-parity-slice.md) — reviewable acceptance draft for items, stats, provenance, and search.

## Documentation rules

- Dated audits describe what was observed at a point in time; do not rewrite history when the code changes. Add a new audit or an explicit update section.
- Architecture proposals may change during discovery. Durable accepted decisions belong in ADRs.
- Keep the project brief focused on stable product intent, not implementation details.
- Never put a contributor's local game-installation path in committed documentation, diagnostics, or examples.
- Keep commands in `AGENTS.md`, `CONTRIBUTING.md`, and the root package configuration synchronized after the modern workspace is scaffolded.
