# Architecture spike results

Date: 2026-07-19
Scope: independently authored synthetic data only

## Outcome

The narrow architecture spike validates the proposed package boundaries and static delivery path without reading or publishing proprietary game data. It does not complete ADR 0001 because the exact installed game build, full official-data measurements, redistribution policy, and inherited-content licensing remain unresolved.

## Implemented proof

- A pinned Node 24/pnpm workspace with strict TypeScript, ESLint, Prettier, Vitest, Playwright, and Windows GitHub Actions.
- Framework-independent `domain` and `data-pipeline` packages plus a Next.js App Router web application.
- A project-owned `fast-xml-parser` adapter, explicit source manifest, deterministic collision resolution, stable IDs, source provenance, relationship linking, source-located diagnostics, and checksummed atomic JSON output.
- Independently authored fixtures covering representative item, recipe, skill/ability, spell/effect, monster inheritance, stat, template, precedence, invalid-input, missing-asset, unknown-element, and dangling-reference behavior.
- A statically generated item detail route and a responsive client search/category filter using a selective Base UI-backed shadcn-style Select and project-owned Tailwind tokens.
- English document semantics, light/dark/system token behavior, visible fixture health, empty state, keyboard category selection, and automated desktop/mobile accessibility scans.

## Measured synthetic result

- Active entities/search documents: 13.
- Items/static item routes: 3.
- Diagnostics: 1 expected error, 3 expected warnings, and 1 precedence info record.
- Generated artifact: 20,854 bytes.
- GitHub Pages subpath export: 1,008,359 bytes across 7 HTML files plus supporting assets.
- Production compile: approximately 1.5 seconds in the recorded local run; complete `pnpm build` command approximately 8 seconds with warm dependencies.
- Static export succeeded both at `/` and with `NEXT_PUBLIC_BASE_PATH=/dredmorpedia`; emitted asset and entity links include the subpath.
- Automated checks: 9 domain/pipeline tests and 4 Playwright cases across desktop and mobile projects passed. Axe reported no automatically detectable violations on the representative home and item-detail routes.
- Desktop light-theme and Pixel 7 dark-theme full-page screenshots were inspected locally; the shell, diagnostic panel, controls, and item cards reflow without clipping or overlap.
- Repeated import output was byte-identical. The CLI prints checksum-bearing output metadata and refuses output inside an input source root.

These numbers characterize only the tiny synthetic fixture and must not be used to predict final artifact size or performance.

## Decisions supported

The spike supports retaining the proposed Node/pnpm/strict TypeScript, Next.js static export, Tailwind tokens, selective shadcn/Base UI, Vitest, Playwright, and adapter-based XML pipeline direction. It also supports one combined artifact for the spike. Search-library choice and production artifact partitioning remain intentionally open until the full dataset is measured.

## Remaining validation gates

1. Record the exact canonical installed game version/build.
2. With an owner-provided path, inspect the base game and all three expansions read-only and write generated measurements only to the ignored workspace.
3. Record full-dataset entity/diagnostic counts, import/build time, artifact/search size, and unsupported XML constructs.
4. Decide which normalized official data and artwork, if any, can be committed or publicly deployed.
5. Establish code and inherited mod/asset license and provenance policy.
6. Accept or revise ADRs 0001 and 0002 from that evidence before broad parity work.
