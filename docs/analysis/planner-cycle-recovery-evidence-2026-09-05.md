# Planner cycle recovery

Date: 2026-09-05

## Problem and correction

The independent review reproduced a valid recipe selection disappearing from
the crafting planner URL as soon as it formed a dependency cycle. The shared
domain planner returned no selected choices on its cycle branch, so both the
crafting and encrusting interfaces treated the user's selection as stale.

Cycle results now retain all reachable selected and pending recipe choices in
deterministic item order. Their `requiredAmount` is `null`: recursive demand
cannot be calculated until the loop is resolved. Ordinary plans continue to
return numeric amounts. Crafting steps and calculated base requirements remain
unavailable during a cycle; directly declared encrustment application inputs
remain visible in their separate section.

Both planners preserve these choices through URL cleanup and reload. The
interface explains the loop, labels choice quantities as unavailable, and
keeps the native controls available to clear or change a selection. Unknown
tokens and choices outside the reachable dependency graph still get removed.
For a cycle without alternative recipes, the interface suggests another
target. This restores the existing planner contract without changing game
mechanics, generated schemas, source precedence, or asset scope.

## Regression coverage

- The crafting domain regression covers two selected recipes forming a nested
  cycle, stable results with reversed input ordering, absent calculated totals,
  and recovery by changing the nested recipe.
- The encrusting domain regression covers a cyclic ingredient alongside
  selected and pending sibling ingredients, removal of an unrelated selection,
  preserved direct application totals, and successful recalculation.
- An independently authored Brass Loop Recipe in the synthetic fixture makes
  Brass Ingot depend on itself as one explicit alternative. Browser coverage
  exercises both planners on desktop and mobile, including stale URL cleanup,
  reload persistence, keyboard clearing, selection of an acyclic alternative,
  restored shopping lists, page errors, axe checks, and horizontal overflow.

## Validation

- `pnpm.cmd check` passed formatting, lint, types, all 352 unit/artifact tests,
  byte-identical synthetic generation, and the 247-page synthetic export.
- After the preview follow-up below, the synthetic build/types and focused
  lint checks passed again. The final
  `pnpm.cmd --filter @dredmorpedia/web exec playwright test` run passed all 90
  desktop/mobile cases, including all four planner cycle cases, keyboard
  preview reopening, malformed preview recovery, no-JavaScript catalogues,
  responsive behavior, and representative axe scans.
- `pnpm.cmd build:official` passed byte-identical official generation and the
  complete 3,732-page local static export: 764 items, 2,892 search documents,
  0 errors, 4 warnings, and 74 informational diagnostics. The presented asset
  set has 1,868 mappings to 1,556 files and no fallback diagnostics. Official
  source files remained read-only; generated data and assets remain ignored.
- The existing ignored official artifact still reproduces the nine previously
  measured cycle-producing individual choices. Cracked Orb's selected recipe
  now remains in the result, with its loop reported and calculated totals
  withheld. This bounded scan is not an exhaustive multi-choice cycle audit.

## Preview regression found during validation

The catalogue regression run exposed an existing intermittent keyboard
reopening failure. A strict Escape → Tab → Shift+Tab sequence reproduced it
on both browser profiles: conditional removal of `PopoverContent` bypassed
the popup's closing lifecycle, leaving focus handling active after the visible
popup disappeared. Keeping `PopoverContent` in the component tree lets the
Base UI portal control unmounting and finish its own focus cleanup. Preview
requests remain conditional on opening and retain their shared lazy cache.

The updated browser test waits for focus after a mobile tap, verifies Escape
returns to the trigger, tabs to the next actual relationship link, and returns
with Shift+Tab to reopen the preview. Focus-event diagnostics were temporary
and removed after verifying the correction. Recipe and encrustment failure,
retry, focus-restoration, and ordinary preview checks pass together.

## Manual verification

1. Run `pnpm.cmd dev:synthetic`, then open:

   ```text
   http://localhost:3001/tools/crafting-graph/?item=brass-ingot&choice=brass-ingot~brass-loop-recipe~0
   http://localhost:3001/tools/encrusting-plan/?encrustment=synthetic-gear-polish&choice=brass-ingot~brass-loop-recipe~0
   ```

2. Each page should explain Brass Ingot → Brass Ingot, retain Brass Loop
   Recipe after reload, and show unavailable crafting totals. In encrusting,
   the separate application ingredients should remain visible.
3. Focus the Brass Ingot choice with the keyboard and select the placeholder
   to clear it. The cycle and its URL choice should disappear. Select Brass
   Ingot Recipe's first output: one crafting step and Training Gem as a base
   requirement should appear. At a narrow mobile width, the controls and cycle
   explanation should remain usable without horizontal scrolling.
   On `/items/category/material/1/`, focus the Clockwork Blade recipe eye
   control, close with Escape, then press Tab and Shift+Tab: the preview should
   reopen without losing the direct item and recipe links.
4. For the original official reproduction, run `pnpm.cmd dev:official` and
   open:

   ```text
   http://localhost:3001/tools/crafting-graph/?item=cracked-orb&choice=cracked-orb~cracked-orb-recipe~0
   ```

   The selected recipe and URL choice should persist, with the Cracked Orb →
   Molten Orb → Cracked Orb explanation visible after reload. This is a source
   dependency loop, not an assertion about how the game handles those recipes.
