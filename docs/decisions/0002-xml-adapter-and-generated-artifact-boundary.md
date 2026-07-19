# ADR 0002: XML adapter and generated artifact boundary

Date: 2026-07-19
Status: Proposed (synthetic spike validated; full installed dataset pending)
Owners: repository owner + maintainer

## Context

The legacy browser application loads many XML files directly into mutable UI-facing objects. That makes parse failures silent, source precedence timing-dependent, and domain behavior difficult to test. The replacement needs deterministic imports, actionable diagnostics, provenance, and a legal boundary between read-only local inputs and the public web application.

## Decision under validation

- Parse XML only in `packages/data-pipeline` through a project-owned adapter around `fast-xml-parser`.
- Reject DOCTYPE declarations and invalid XML before normalization. Treat source content as untrusted and never expose parser-library shapes outside the pipeline.
- Discover inputs from an explicit, ordered manifest. Resolve collisions by declared source precedence plus stable tie-breakers, never filesystem enumeration or request completion order.
- Normalize into framework-independent types from `packages/domain`, retain losing variants, and preserve source ID, repository-relative source file, original name/ID, and source location.
- Link relationships in a deterministic second pass. Emit missing assets, dangling references, duplicate choices, unsupported elements, and parse failures as stable, source-located diagnostics.
- Emit schema-versioned JSON, diagnostics, and a checksum manifest into a separate output directory using atomic file replacement. The web layer reads only these generated artifacts and never raw XML.
- Keep generated official-data derivatives ignored and non-public until the publication policy explicitly permits them. Tracked tests use independently authored synthetic fixtures.

## Consequences

The parser can be replaced without changing domain or UI contracts, deterministic output can be byte-compared, and a running development server cannot observe partially written JSON. The costs are a maintained normalization layer, an explicit artifact-version migration policy, and a required regeneration step before web builds.

The initial spike uses one combined artifact because its legal fixture dataset is tiny. A separate search artifact or worker remains a measurement-driven decision after the full official dataset is tested.

## Validation evidence

The synthetic spike covers items, recipes, skills/abilities, a spell chain, inherited monsters, stats, templates, an override, invalid XML, an unknown element, a dangling reference, and a missing asset. Two imports produce byte-identical output, tests verify traversal and DOCTYPE rejection, and the web application statically generates entity routes from the artifact.

See [`../analysis/architecture-spike-2026-07-19.md`](../analysis/architecture-spike-2026-07-19.md).

## Acceptance checklist

- [x] Synthetic fixtures prove deterministic precedence, linking, diagnostics, provenance, and checksums.
- [x] Pipeline/domain unit and integration tests pass without a game installation.
- [x] The web layer imports generated JSON and no raw XML parser.
- [x] Output writes are atomic and refused inside source roots.
- [ ] The complete approved base-game-plus-three-DLC dataset imports read-only with measured results.
- [ ] Unsupported constructs and performance found in the full dataset are assessed.
- [ ] The generated-artifact publication boundary is approved.
