# Architecture decision records

ADRs record decisions that are expensive to rediscover or reverse. They complement the dated audit and broader architecture proposal.

## Status vocabulary

- **Proposed** — concrete recommendation awaiting owner/team approval.
- **Accepted** — current direction; implementation should follow it.
- **Superseded** — replaced by another ADR, which must be linked.
- **Rejected** — considered and intentionally not selected.
- **Deprecated** — still present but scheduled for removal.

## Index

- [`0001-platform-and-repository-direction.md`](0001-platform-and-repository-direction.md) — Proposed (owner-approved direction, pending validation): TypeScript workspace, deterministic pipeline, and statically exported Next.js application.
- [`0002-xml-adapter-and-generated-artifact-boundary.md`](0002-xml-adapter-and-generated-artifact-boundary.md) — Proposed (synthetic spike validated, full dataset pending): isolated XML parsing, deterministic normalization, diagnostics, and atomic generated artifacts.

Copy [`template.md`](template.md) for a new decision. Keep records short enough to review, link evidence, and describe migration consequences.
