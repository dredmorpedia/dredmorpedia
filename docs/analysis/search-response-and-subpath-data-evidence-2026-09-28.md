# Search response and hosting-subpath data hardening

Date: 2026-09-28

## Scope

The static search artifact remains build-verified and separately fetched after
the small Search client shell hydrates. The browser now parses the complete
response with the same strict schema used at the artifact boundary before it
stores any documents. A matching dataset ID alone no longer permits malformed
nested documents or an incompatible schema version to reach query/render code.
The existing loading and failure text remains available when validation fails.
The schema loads only after the response arrives.

The three detached JSON request families now use the configured
`NEXT_PUBLIC_BASE_PATH`: search data, the shared Craft/Encrust preview payload,
and per-item preview summaries. Root-hosted URLs are unchanged. Next.js still
manages ordinary page and asset links; the helper covers browser `fetch` URLs.
No official data or assets are added to tracked files.

## Validation

- `pnpm.cmd check` passes format, lint, type checking, 372 unit/artifact tests,
  byte-identical synthetic generation, and a 261-route static export.
- `pnpm.cmd test:e2e` passes 105 desktop/mobile cases; seven cases are skipped
  in the root build (the touch-inapplicable hover case, two subpath cases, and
  four optional official-data cases).
  The new search cases inject a nested empty document and a wrong schema
  version with the correct dataset ID. Both reach the displayed failure state
  without an uncaught page error.
- A separate export with `NEXT_PUBLIC_BASE_PATH=/dredmorpedia` builds all 261
  synthetic routes. A desktop browser smoke test loads search data, a recipe
  preview, and an item preview from beneath that prefix, with HTTP 200
  responses and visible content. The test server serves only prefixed export
  paths in this mode, so an origin-root JSON request would fail.
- `pnpm.cmd benchmark:search:official` passes byte-identical official
  generation, the 4,496-entry static export, domain search relevance/query
  budgets, and desktop plus 4x-CPU-mobile browser budgets. The official local
  dataset has 764 items and 2,892 search documents, with zero errors, four
  warnings, 74 information records, and zero asset fallbacks. The compact
  search artifact is 1,376,792 bytes. Browser p95 navigation to first result
  is 191.4 ms on desktop and 1,216.1 ms on the slowed mobile profile. These
  are local measurements, not permission to publish the official output.
- A second `pnpm.cmd build:official` with
  `NEXT_PUBLIC_BASE_PATH=/dredmorpedia` exports all 4,496 entries. The optional
  `e2e/official-local.spec.ts` suite passes four desktop/mobile cases against
  that ignored output. Search fetches all 2,892 official documents and finds
  Wand of Tesla. The Crude Iron Sword recipe preview and Wand of Tesla item
  preview both load from prefixed JSON URLs; the item summary shows its exact
  5–6 charge range and linked Voltaic Empowerment effect. A matching-dataset
  response with a malformed nested document displays the failure state on both
  devices without an uncaught page error. No game-installation file is changed.

## Manual verification

1. Run `pnpm.cmd dev:synthetic`, open `http://localhost:3001/search/?q=clockwork`,
   and expect matching records after the loading state. Open
   `/items/category/material/1/` and `/crafts/tool/smithing/`; their recipe and
   item eye controls should still open previews.
2. Run `pnpm.cmd test:e2e`. The two `rejects search data` cases should show the
   failure message for malformed responses without a browser page error on
   desktop and mobile.
3. For the hosting prefix, run the following PowerShell commands from the
   repository root, then remove the two session environment variables when
   finished:

   ```powershell
   $env:NEXT_PUBLIC_BASE_PATH = '/dredmorpedia'
   pnpm.cmd build
   $env:DREDMORPEDIA_E2E_BASE_PATH = '/dredmorpedia'
   Push-Location apps/web
   .\node_modules\.bin\playwright.cmd test e2e/subpath.spec.ts --project=desktop-chromium
   Pop-Location
   Remove-Item Env:NEXT_PUBLIC_BASE_PATH, Env:DREDMORPEDIA_E2E_BASE_PATH
   ```

   Expect one passing test. It requests all three JSON families under
   `/dredmorpedia/` and renders their associated content.

4. To repeat the optional real-data browser test, use the local official
   manifest and ignored output only:

   ```powershell
   $env:NEXT_PUBLIC_BASE_PATH = '/dredmorpedia'
   pnpm.cmd build:official
   $env:DREDMORPEDIA_E2E_BASE_PATH = '/dredmorpedia'
   $env:DREDMORPEDIA_E2E_OFFICIAL = '1'
   Push-Location apps/web
   .\node_modules\.bin\playwright.cmd test e2e/official-local.spec.ts
   Pop-Location
   Remove-Item Env:NEXT_PUBLIC_BASE_PATH, Env:DREDMORPEDIA_E2E_BASE_PATH, Env:DREDMORPEDIA_E2E_OFFICIAL
   ```

   Expect four passing desktop/mobile tests, including the malformed-response
   failure path. The test is skipped during ordinary synthetic CI runs.
