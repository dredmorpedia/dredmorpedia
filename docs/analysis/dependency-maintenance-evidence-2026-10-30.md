# Dependency maintenance and preview-test stability

Date: 2026-10-30 (work started 2026-10-18)
Status: validated; one low-severity development-only advisory remains upstream

The return-to-project review found that the ordinary CI checks passed while the
separate scheduled production dependency audit failed. This maintenance slice
refreshes the affected dependencies, preserves the preview viewport checks
while allowing asynchronous positioning to settle, and clarifies historical
recommendations in the handoff documents. It adds no product features or
publication permissions.

## Dependency changes

| Direct dependency               | Before  | After  |
| ------------------------------- | ------- | ------ |
| `next` and `eslint-config-next` | 16.2.12 | 16.4.2 |
| `vitest`                        | 4.1.10  | 4.1.12 |
| `zod` in web and data-pipeline  | 4.4.3   | 4.6.7  |
| `shadcn` development CLI        | 4.13.1  | 4.23.0 |

The lockfile also refreshes compatible transitive dependencies. The workspace
overrides now select these versions for their declared affected ranges:

| Override selector                  | Selected version  |
| ---------------------------------- | ----------------- |
| `baseline-browser-mapping@<2.11.0` | 2.11.29           |
| `brace-expansion@>=5.0.0 <5.0.12`  | 5.0.12            |
| `browserslist@<4.29.5`             | 4.29.5            |
| `nanoid@<3.3.18`                   | 3.3.20            |
| `postcss@<8.5.23`                  | 8.5.23, unchanged |
| `sharp@<0.35.5`                    | 0.35.5            |
| `vite@>=8.0.0 <8.1.6`              | 8.3.5             |

The `brace-expansion` override applies only to its version-5 branch. The
Browserslist override also aligns its update helper's peer dependency. Vite
stays within the major version supported by Vitest. `pnpm.cmd peers check`
reports no peer dependency issues.

## Audit results and remaining limitation

The production audit at the start of maintenance on 2026-10-18 reported 15
advisories: 3 critical, 7 high, 4 moderate, and 1 low. The resumed 2026-10-30
audit identified a newer Zod advisory and additional development-tool
advisories, so validation includes another compatible dependency refresh.
After the refresh,
`pnpm.cmd audit:dependencies` exits successfully and reports no known
production vulnerabilities. These results describe the advisory database and
lockfile checked on this date; later work must run the live audit again.

The full dependency audit reports one low-severity advisory for
development-only `deepmerge@4.3.1`, through `shadcn` directly and its
`@shadcn/registry` dependency:
[GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4).
It concerns prototype poisoning of returned objects. The registry's latest
published version is 4.3.1; 4.3.2 is not published. Although the audit response
names `>=4.3.2` as its patched range, the GitHub advisory lists no patched
version. This finding remains visible pending an upstream release or a
reviewed dependency replacement. No audit ignore, exception, or fabricated
version override was added.

The initially recorded high-severity `braces` advisory
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
was withdrawn upstream on 2026-10-23 and is no longer reported. A clean
production audit does not mean the complete development dependency graph is
free of known advisories.

## Runtime scope

Production builds use `output: "export"`, disable Next.js image optimization,
and generate all three JSON data handlers statically. The exported site has
no live Next.js server or image optimizer. Local development still runs
`next dev`, and build and development tools remain dependency consumers.
Static export therefore qualifies the applicability of server-runtime
advisories; it does not establish that every installed dependency advisory is
irrelevant or that this project was exploitable through each reported issue.

## Preview-test change

The Craft output preview test previously read its popup bounds once, then read
document dimensions separately. Loaded content and collision positioning can
settle asynchronously, so that sample could fail during an intermediate
layout. The revised assertion reads popup and document geometry together in
one browser evaluation and retries the complete set of assertions for at
most five seconds.

The original width, height, and 11-pixel edge bounds remain unchanged. The
test still requires every bound to hold in the same rendered snapshot and
continues with accessibility, Escape/focus-restoration, request caching, and
detail-navigation checks. No product positioning code or assertion threshold
was changed.

Next.js 16.4 also generates a `root-params.d.ts` reference. The tracked
`next-env.d.ts` retains it alongside the route types, with both references
restored to the repository's development-path convention after production
builds.

## Validation

- Production dependency audit: passed, no known vulnerabilities.
- Full dependency audit: one unresolved low-severity development-only
  `deepmerge` advisory as documented above; no moderate, high, or critical
  findings.
- `pnpm.cmd install --frozen-lockfile`: passed.
- `pnpm.cmd peers check`: passed, no peer dependency issues.
- `pnpm.cmd check`: passed formatting, lint, all package typechecks, 372
  unit/artifact tests, byte-identical synthetic generation, and the 261-entry
  synthetic static export. The synthetic fixture's deliberate error and
  fallback diagnostics remain expected.
- `pnpm.cmd --filter @dredmorpedia/web exec playwright test` against that
  export: 105 passed, nine intentional skips for optional official/subpath
  cases and desktop-only hover behavior.
- Focused preview assertion with `--grep 'inspects Craft outputs'
--repeat-each=5`: all ten desktop/mobile repetitions passed.
- `NEXT_PUBLIC_BASE_PATH=/dredmorpedia pnpm.cmd build:official`: passed
  byte-identical generation with 764 items, 2,892 search documents, zero errors,
  four reviewed warnings, and 74 informational records. All 1,868 presented
  asset mappings resolve to 1,556 copied files with no fallback diagnostics;
  the official static export contains 4,496 entries.
- Official-local Playwright suite with `DREDMORPEDIA_E2E_OFFICIAL=1` and
  `DREDMORPEDIA_E2E_BASE_PATH=/dredmorpedia`: all six desktop/mobile cases
  passed, including narrow layouts, detached data loading, and malformed
  search-response recovery.
- `pnpm.cmd exec shadcn --version`: passed, reports 4.23.0.

## Manual check

1. Run `pnpm.cmd dev:synthetic` and open
   `http://localhost:3001/crafts/tool/smithing/`.
2. Open the Clockwork Blade output preview using keyboard focus or the eye
   control on a touch viewport. Its contents should fit inside the viewport;
   Escape should close it and restore focus to the trigger.
3. Follow the full item details link. The item route should remain available
   independently of the preview.

Official generated data and assets remain ignored and local-only. The local
game installation is read-only.
