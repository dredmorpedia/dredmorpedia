# ADR 0001: Platform and repository direction

Date: 2026-07-19
Status: Proposed
Owners: repository owner + maintainer

## Context

The legacy application parses proprietary/locally supplied XML in the browser, stores records in mutable globals, and renders the dataset into one fixed-width page. The clean checkout lacks official database files, duplicate precedence can depend on asynchronous completion, and there are no tests or build boundaries.

The replacement needs static reference pages, interactive structured tools, deterministic import behavior, strong tests, inexpensive initial deployment, and a path to optional user features.

## Decision under validation

Adopt:

- a pnpm workspace on Node.js 24 LTS;
- strict TypeScript throughout new code;
- independent `domain` and `data-pipeline` packages;
- a current stable Next.js App Router/React application;
- static export for the first public encyclopedia;
- Tailwind CSS with project-owned design tokens and light/dark/system themes;
- generated, versioned normalized artifacts between the pipeline and web application;
- Vitest for domain/pipeline tests and Playwright for browser/accessibility smoke tests;
- no database or authentication until an approved feature requires synchronized user data.

Target complete legacy functional/content parity for the base game and all three official expansions. Preserve mod support as a future capability rather than an initial coverage requirement. Validate GitHub Pages as the first free static-hosting candidate without coupling the build to that provider.

Relocate the legacy application intact under `legacy/` in an isolated, verified commit. Keep it runnable there as the behavioral reference until parity evidence permits archival.

## Consequences

### Positive

- XML quirks, precedence, linking, and calculations become testable without a browser.
- Entity pages have stable URLs, HTML, and metadata.
- Core hosting remains static and portable.
- React supports the expected planner/comparison/import tool surface.
- A future server deployment can reuse App Router routes/components.

### Negative

- The workspace and pipeline add upfront structure before visible UI progress.
- Static export cannot use runtime server actions, ISR, or default image optimization.
- Next.js has more framework surface than a purely static Astro site.
- The team must maintain a generated-artifact contract and avoid leaking framework types into domain packages.

## Alternatives

- **Astro:** preferred if scope is deliberately limited to static content plus small islands.
- **React + Vite SPA:** suitable for a separate local-only mod tool, weaker for the public encyclopedia’s entity pages/metadata.
- **Upgrade the legacy app:** rejected because it preserves the problematic boundaries.
- **Database-first SSR:** deferred because current data is build-time/reference data.

## Acceptance checklist

- [x] Repository owner approves the framework and styling direction.
- [x] Initial source scope is base game plus all three official expansions; mods are lower priority.
- [ ] Exact canonical installed game version/build is recorded.
- [ ] Redistribution policy for generated data and assets is written.
- [ ] A short spike proves representative XML parsing, deterministic collisions, artifact generation, and static generation of at least one entity route.
- [ ] The spike records build time and artifact size using the available full local dataset.

The interim read-only and non-publication rules are documented in [`../data-and-assets-policy.md`](../data-and-assets-policy.md). They do not by themselves resolve redistribution rights.

After acceptance, update this ADR’s status and scaffold the workspace in a dedicated change.
