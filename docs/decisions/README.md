# Architecture decision records

ADRs record decisions that are expensive to rediscover or reverse. They complement the dated audit and broader architecture proposal.

## Status vocabulary

- **Proposed** — concrete recommendation awaiting owner/team approval.
- **Accepted** — current direction; implementation should follow it.
- **Superseded** — replaced by another ADR, which must be linked.
- **Rejected** — considered and intentionally not selected.
- **Deprecated** — still present but scheduled for removal.

## Index

- [`0001-platform-and-repository-direction.md`](0001-platform-and-repository-direction.md) — Proposed (technically validated, publication boundary pending): TypeScript workspace, deterministic pipeline, and statically exported Next.js application.
- [`0002-xml-adapter-and-generated-artifact-boundary.md`](0002-xml-adapter-and-generated-artifact-boundary.md) — Proposed (technically validated, publication boundary pending): isolated XML parsing, deterministic normalization, diagnostics, and atomic generated artifacts.
- [`0003-initial-search-artifact-and-query-strategy.md`](0003-initial-search-artifact-and-query-strategy.md) — Proposed: generated search documents and project-owned structured filtering before adopting a third-party index.

Copy [`template.md`](template.md) for a new decision. Keep records short enough to review, link evidence, and describe migration consequences.
