# Independent code and local-app review

Date: 2026-09-05
Scope: HEAD `47cdcbf` plus the existing uncommitted catalogue/preview work,
followed by the preview validation fix described below. No commit or push.

This review used current source, newly run checks, a fresh deterministic
official import/static export, and the running local app. Earlier handoff
claims were treated as context rather than proof. The official installation
remained read-only; official data, assets, and temporary review measurements
remain ignored and local.

## Completed fix: validate preview responses before rendering

`catalogue-preview-data.ts` previously checked only the outer JSON container
and then asserted the complete TypeScript type. An entry such as an empty
recipe object passed the check but threw when the card mapped its ingredients.
The asynchronous load rejection handler did not catch subsequent rendering
errors, so the intended unavailable-preview link was bypassed.

The loader now validates both complete summary shapes, including nested item
references, source markers, stat links, slots, modifiers, and powers. It checks
route slugs, local content-addressed icon URL shapes, numeric fields, and
record-key/summary-ID agreement. Missing or inherited record keys are rejected.
The schema loads dynamically on first preview interaction. Successful requests
remain shared and cached; failed requests can retry on a later opening.

Coverage includes 17 loader regressions and recipe/encrustment browser failure
and recovery flows on both desktop and mobile. The browser tests inject malformed
ingredients, verify the fallback detail link receives focus, close with Escape,
reopen with Enter, and confirm successful recovery without a page error.
All 493 freshly exported official summaries satisfy the new schema. A live
official item preview also rendered its ingredient, output, and toolkit art.

A later planner regression run also exposed premature popup unmounting during
preview close. The portal now completes its own closing and focus lifecycle;
see the [follow-up evidence](planner-cycle-recovery-evidence-2026-09-05.md)
for the desktop/mobile Escape and keyboard reopening regression.

## Planner finding and follow-up fix

### P2, fixed: Planner URL cleanup discards valid choices that produce cycles

Follow-up: reachable choices now remain editable and survive URL cleanup in
both planners while cyclic quantities remain unavailable. See
[`planner-cycle-recovery-evidence-2026-09-05.md`](planner-cycle-recovery-evidence-2026-09-05.md)
for the correction, regression coverage, and current verification. The
reproduction below records the original defect before that fix.

Locations: `packages/domain/src/crafting-plan.ts` cycle-return branch;
`apps/web/src/components/crafting-planner.tsx` and
`apps/web/src/components/encrustment-planner.tsx` active-choice cleanup.

When the dependency graph contains a cycle, the domain result intentionally
withholds calculations but also returns an empty `selectedChoices` array.
Both planner components use that array to decide which URL choices are valid.
They consequently remove the selections that caused the cycle and recompute
an undecided plan. This loses the user's choice and the visible cycle
explanation, and prevents a stable shareable reproduction.

Reproduced in the official local browser by opening:

```text
/tools/crafting-graph/?item=cracked-orb&choice=cracked-orb~cracked-orb-recipe~0
```

The URL immediately becomes `?item=cracked-orb`, and the source-yield selector
returns to its placeholder. Independently calling the domain planner for that
choice reports the cycle Cracked Orb → Molten Orb → Cracked Orb and zero
retained selections. A scan of individual choices for items with alternatives
found nine such cycle-producing plans in the current official data; this is
not an exhaustive count of multi-choice cycles. The encrustment impact is
established by the shared domain result and equivalent cleanup code, not by a
separate browser reproduction.

Recommended correction: preserve reachable selected identities and editable
choices when returning a cycle result, while continuing to withhold invalid
quantity calculations. Add an alternative-choice cycle regression at both the
domain and URL/browser boundary; existing domain cycle coverage uses only
single-option recipes and does not exercise cleanup.

## Remaining findings

### P2: Search still trusts malformed nested response records

Location: `apps/web/src/components/search-explorer.tsx`, fetched-payload check.

Search accepts a matching dataset ID and any `documents` array without checking
its entries or schema version. A synthetic response with the matching ID and
`documents: [{}]` passes that exact check. Passing its documents into the
render-time query with `q=sword` throws while reading `document.text.includes`.
That exception occurs after the fetch handler, bypassing the displayed load
failure state. The generated endpoint is verified at build time, but that
does not validate the later HTTP response or reject an incompatible response
with the same dataset label.

This was reproduced at the response-check/domain-query boundary; a malformed
response was not injected into the live official browser. Recommended
correction: validate the complete search response before storing documents,
with malformed-record and incompatible-schema browser tests. Keep the existing
separate search payload and response budgets.

### P3: Detached JSON requests omit the configured hosting subpath

Locations: `apps/web/src/app/search/page.tsx` (`/search-data.json`) and
`apps/web/src/lib/catalogue-preview-data.ts` (`/catalogue-previews.json`).

The framework configuration supports `NEXT_PUBLIC_BASE_PATH`, and presented
asset URLs incorporate it. These two raw fetch URLs instead start at the
origin root. With a build hosted at `/dredmorpedia`, they request
`/search-data.json` and `/catalogue-previews.json` instead of the files below
`/dredmorpedia/`. This is a source-traced finding; a separate subpath build was
not run. Root-hosted local use is unaffected. Include a subpath browser smoke
test before treating the earlier static-hosting spike as current evidence.

## Product observations from the running app

- Items has a distinctive visual identity, verified art, direct relationships,
  and functional accessible previews. The catalogue's large introduction and
  category area place the first item below the initial approximately
  1264-by-744 viewport. Reducing that space is a possible polish task, not a
  correctness defect.
- The actual Skills navigation currently opens `/browse/skills/1/`: 52 text
  cards, without skill art, archetype grouping, or a progression overview.
  Thus image-led Skills is still a defensible next product slice independently
  of the handoff's recommendation.
- Detail pages such as Crude Iron Sword devote many sections to absent source
  declarations and empty relationships. A later player-facing presentation
  pass could put useful stats/relationships first and disclose empty or
  technical source sections. Preserve provenance and exact source semantics.

## Fresh verification

- `pnpm.cmd check`: formatting, lint, types, 350 unit/artifact tests,
  byte-identical synthetic generation, and 246 generated static pages passed.
- `pnpm.cmd --filter @dredmorpedia/web exec playwright test`, against that
  completed synthetic build: all 86 desktop/mobile tests passed, including
  keyboard, no-JavaScript, responsive, and representative axe coverage.
- `pnpm.cmd build:official`: byte-identical import and 3,732 generated static
  pages passed. The newly measured dataset has 764 items, 435 recipes,
  58 encrustments, 52 skills, 352 abilities, 951 spells, 183 monsters,
  62 stats, and 35 templates; 2,892 search documents; 0 errors,
  4 warnings, and 74 informational diagnostics.
- Official asset generation reports 1,868 mappings to 1,556 copied files and
  zero fallback diagnostics. Every exported recipe/encrustment preview passed
  the new schema.
- Browser inspection confirmed the official preview renders and the planner
  cycle-choice failure occurs. No game mechanics were independently verified
  by running the game. This is a bounded review, not a line-by-line audit of
  every normalizer or a new search performance benchmark. An optional full
  exported-anchor scan was stopped because of its filesystem cost; no claim
  of exhaustive link-crawl coverage is made.

The prior handoff's current-checkpoint figures (330 tests, 80 browser cases,
3,731 pages, 90 informational diagnostics) should not be treated as live
measurements. Historical evidence remains historical; the figures above are
from this checkout and include this fix.

## Manual verification

1. Run `pnpm.cmd dev:official`, then open
   `http://localhost:3001/items/crude-iron-sword/`. Activate the recipe eye
   control: ingredient/output/tool art should appear. Press Escape: focus
   should return to that control without reopening the preview.
2. For repeatable malformed-response verification, run `pnpm.cmd test:e2e`.
   The two `recovers from malformed ... preview data with keyboard navigation`
   cases must pass on both browser profiles. They test failure, full-detail
   navigation availability, focus restoration, and a successful retry.
3. With the official app running, open the Cracked Orb planner URL above.
   After the follow-up fix, the `choice` and selected recipe should persist
   after reload while the page explains the cycle. See the linked planner
   evidence for synthetic keyboard recovery checks in both planners.
