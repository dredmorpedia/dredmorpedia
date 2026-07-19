# ADR 0001: Platform and repository direction

Date: 2026-07-19
Status: Proposed (technical validation complete; publication boundary pending)
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
- selectively adopted shadcn/ui component source backed by Base UI for complex interactive controls, with native HTML retained where it is sufficient;
- generated, versioned normalized artifacts between the pipeline and web application;
- Vitest for domain/pipeline tests and Playwright for browser/accessibility smoke tests;
- no database or authentication until an approved feature requires synchronized user data.

Target complete legacy functional/content parity for the base game and all three official expansions. Preserve mod support as a future capability rather than an initial coverage requirement. Validate GitHub Pages as the first free static-hosting candidate without coupling the build to that provider.

Ship the initial application and canonical game content in English only. Do not introduce localized routes, translation catalogs, or a language selector until there is an approved source and maintenance plan for at least one additional language. Keep imported source text separate from application interface copy, use UTF-8 and `lang="en"`, prefer locale-aware formatting APIs, and keep stable entity identities and canonical routes independent of display language. Future translated game content should be an explicit overlay with provenance rather than a mutation of canonical English records.

Add shadcn/ui components only when a product slice uses them; do not import the entire catalog. Keep the copied component source in the web boundary, apply project-owned tokens, and review modifications as maintained application code. Base UI supplies difficult interaction behavior such as keyboard navigation and focus management, but semantic structure, labels, focus appearance, contrast, responsive behavior, and accessibility verification remain project responsibilities.

Relocate the legacy application intact under `legacy/` in an isolated, verified commit. Keep it runnable there as the behavioral reference until parity evidence permits archival.

## Consequences

### Positive

- XML quirks, precedence, linking, and calculations become testable without a browser.
- Entity pages have stable URLs, HTML, and metadata.
- Core hosting remains static and portable.
- React supports the expected planner/comparison/import tool surface.
- Maintained Base UI behavior reduces the amount of keyboard, focus, and ARIA interaction code implemented from scratch while shadcn/ui keeps the styled component layer editable.
- A future server deployment can reuse App Router routes/components.
- English-only delivery avoids translation infrastructure and content-maintenance work before real translations exist, without coupling canonical identities to English display strings.

### Negative

- The workspace and pipeline add upfront structure before visible UI progress.
- Static export cannot use runtime server actions, ISR, or default image optimization.
- Next.js has more framework surface than a purely static Astro site.
- Copied shadcn/ui components become project-owned code that must be reviewed when upstream fixes or accessibility improvements are relevant.
- Accessible primitives do not remove the need for application-level accessibility design and testing.
- The team must maintain a generated-artifact contract and avoid leaking framework types into domain packages.

## Alternatives

- **Astro:** preferred if scope is deliberately limited to static content plus small islands.
- **React + Vite SPA:** suitable for a separate local-only mod tool, weaker for the public encyclopedia’s entity pages/metadata.
- **Upgrade the legacy app:** rejected because it preserves the problematic boundaries.
- **Database-first SSR:** deferred because current data is build-time/reference data.
- **Entirely project-authored interactive components:** rejected because dialogs, comboboxes, menus, tabs, and similar controls have substantial keyboard, focus, and assistive-technology behavior.
- **A fully themed packaged component suite:** rejected because it would constrain the game-specific visual language and usually require wrapper/override layers.
- **Full localization infrastructure now:** deferred because the game content and current maintained interface are English-only and no translated-content source or maintenance workflow exists.

## Acceptance checklist

- [x] Repository owner approves the framework and styling direction.
- [x] Repository owner approves selective shadcn/ui + Base UI adoption and the initial English-only scope.
- [x] Initial source scope is base game plus all three official expansions; mods are lower priority.
- [x] Exact canonical installed game version/build is recorded.
- [ ] Redistribution policy for generated data and assets is written.
- [x] A short synthetic-data spike proves representative XML parsing, deterministic collisions, artifact generation, and static generation of at least one entity route.
- [x] The spike records build time and artifact size using the available full local dataset.

The interim read-only and non-publication rules are documented in [`../data-and-assets-policy.md`](../data-and-assets-policy.md). They do not by themselves resolve redistribution rights.

Component approach references: [shadcn/ui introduction](https://ui.shadcn.com/docs), [Base UI overview](https://base-ui.com/react/overview/about), and [Base UI accessibility responsibilities](https://base-ui.com/react/overview/accessibility).

Synthetic and read-only full-dataset evidence is recorded in [`../analysis/architecture-spike-2026-07-19.md`](../analysis/architecture-spike-2026-07-19.md). Keep this ADR Proposed until the remaining publication-policy gate passes; the workspace may continue only through work that does not assume redistribution rights.
