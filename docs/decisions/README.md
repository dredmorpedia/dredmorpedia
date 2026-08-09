# Architecture decision records

ADRs record decisions that are expensive to rediscover or reverse. They complement the dated audit and broader architecture proposal.

## Status vocabulary

- **Proposed** — concrete recommendation awaiting owner/team approval.
- **Accepted** — current direction; implementation should follow it.
- **Superseded** — replaced by another ADR, which must be linked.
- **Rejected** — considered and intentionally not selected.
- **Deprecated** — still present but scheduled for removal.

## Index

- [`0001-platform-and-repository-direction.md`](0001-platform-and-repository-direction.md) — Accepted: TypeScript workspace, deterministic pipeline, and statically exported Next.js application under the local-first official-content boundary.
- [`0002-xml-adapter-and-generated-artifact-boundary.md`](0002-xml-adapter-and-generated-artifact-boundary.md) — Accepted: isolated XML parsing, deterministic normalization, diagnostics, and atomic generated artifacts.
- [`0003-initial-search-artifact-and-query-strategy.md`](0003-initial-search-artifact-and-query-strategy.md) — Accepted: generated search documents, project-owned structured filtering, bounded user-selected spelling suggestions, and measured local response budgets before adopting a third-party index.
- [`0004-published-route-registry-lifecycle.md`](0004-published-route-registry-lifecycle.md) — Accepted and implemented: checksum-bound inherited route reservations, tombstones, stable-identity reappearance, and publication enforcement.

Copy [`template.md`](template.md) for a new decision. Keep records short enough to review, link evidence, and describe migration consequences.
