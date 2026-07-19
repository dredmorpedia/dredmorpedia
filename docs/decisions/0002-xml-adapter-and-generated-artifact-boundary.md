# ADR 0002: XML adapter and generated artifact boundary

Date: 2026-07-19
Status: Proposed (technical validation complete; publication boundary pending)
Owners: repository owner + maintainer

## Context

The legacy browser application loads many XML files directly into mutable UI-facing objects. That makes parse failures silent, source precedence timing-dependent, and domain behavior difficult to test. The replacement needs deterministic imports, actionable diagnostics, provenance, and a legal boundary between read-only local inputs and the public web application.

## Decision under validation

- Parse XML only in `packages/data-pipeline` through a project-owned adapter around `fast-xml-parser`.
- Reject DOCTYPE declarations and invalid XML before normalization. Treat source content as untrusted and never expose parser-library shapes outside the pipeline.
- Discover inputs from an explicit, ordered manifest. Resolve collisions by declared source precedence plus stable tie-breakers, never filesystem enumeration or request completion order.
- Normalize into framework-independent types from `packages/domain`, retain losing variants, and preserve source ID, repository-relative source file, original name/ID, and source location.
- Apply only manifest-declared, repository-contained patch files after source precedence and before relationship linking. Guard every patch by exact dataset/source versions and expected old values; apply it atomically and retain field-level patch history in provenance.
- Resolve an optional manifest-declared route registry after precedence/patches and before route allocation. Pin published canonical slugs and historical aliases to exact source IDs where available, reserve them ahead of automatic routes, and reject stale or conflicting registries atomically.
- Link relationships in a deterministic second pass. Emit missing assets, dangling references, duplicate choices, unsupported elements, and parse failures as stable, source-located diagnostics.
- Emit schema-versioned JSON, diagnostics, and a checksum manifest into a separate output directory using atomic file replacement. The web layer reads only these generated artifacts and never raw XML.
- Keep generated official-data derivatives ignored and non-public until the publication policy explicitly permits them. Tracked tests use independently authored synthetic fixtures.

## Consequences

The parser can be replaced without changing domain or UI contracts, deterministic output can be byte-compared, and a running development server cannot observe partially written JSON. The costs are a maintained normalization layer, an explicit artifact-version migration policy, and a required regeneration step before web builds.

Artifact schema version 3 separates normalized entities from the versioned search payload and requires dataset/source versions plus applied-patch history. The checksum manifest covers both artifacts and diagnostics. A search worker or third-party index remains measurement-driven.

## Validation evidence

The synthetic spike covers items, recipes, skills/abilities, a spell chain, inherited monsters, stats, templates, an override, a guarded patch, a version-scoped route registry, invalid XML, an unknown element, a dangling reference, and a missing asset. Two imports produce byte-identical normalized, search, diagnostic, and manifest files; tests verify traversal, patch and route-registry guards, atomic stale-registry rejection, and DOCTYPE rejection; and the web application statically generates canonical and alternate entity routes from the normalized artifact.

See [`../analysis/architecture-spike-2026-07-19.md`](../analysis/architecture-spike-2026-07-19.md).
The implemented versioned contract is documented in [`../contracts/generated-artifacts.md`](../contracts/generated-artifacts.md).

## Acceptance checklist

- [x] Synthetic fixtures prove deterministic precedence, linking, diagnostics, provenance, and checksums.
- [x] Pipeline/domain unit and integration tests pass without a game installation.
- [x] The web layer imports generated JSON and no raw XML parser.
- [x] Output writes are atomic and refused inside source roots.
- [x] The complete approved base-game-plus-three-DLC dataset imports read-only with measured results.
- [x] Unsupported constructs and performance found in the full dataset are assessed.
- [x] Versioned source manifests and guarded patch overlays preserve deterministic field-level provenance.
- [x] A version-scoped route registry preserves canonical and historical routes without partial application.
- [ ] The generated-artifact publication boundary is approved.
