# Catalogue framing and item density

Date: 2026-09-28

The 2026-09-08 Items/Craft/Encrust comparison found that the first catalogue
record began below the initial viewport. This slice keeps the compact chooser,
all existing item facts, native disclosure, direct links, and lazy previews.
It shortens the three catalogue introductions, removes repeated section labels,
reduces catalogue-only spacing, and places item facts/modifiers beside their
relationships on wide screens. On narrow screens the compact item chooser is
one horizontally scrollable row in source order; Detailed remains available
for visible category names.

## Local official measurements

Measurements use the ignored official dataset, default compact view, and the
first record on each root catalogue route. Positions are pixels from the top
of the viewport before scrolling, measured at 1280 × 720 and 390 × 844.

| Viewport   | Catalogue | Before | After |
| ---------- | --------- | -----: | ----: |
| 1280 × 720 | Items     |    863 |   621 |
| 1280 × 720 | Crafts    |    813 |   571 |
| 1280 × 720 | Encrusts  |    846 |   591 |
| 390 × 844  | Items     |  1,141 |   667 |
| 390 × 844  | Crafts    |    842 |   685 |
| 390 × 844  | Encrusts  |    870 |   705 |

The first Sword item card changed from approximately 429 to 285 pixels tall at
1280 px wide. Its three direct modifiers, Value/Quality, Crafted from, Used to
craft, and Full details remain present. The mobile item chooser scrolls within
its own 358-pixel area without adding page-wide horizontal overflow. A
320-pixel check exposed existing header overflow; stacking its brand and
utility links at narrow widths now keeps that viewport within 320 pixels too.
These are layout observations, not claims about game mechanics or publication
rights.

## Validation

- `pnpm.cmd build:official` with `NEXT_PUBLIC_BASE_PATH=/dredmorpedia`
  deterministically imports the local official data with zero errors and zero
  asset fallbacks, then exports all 4,496 static entries.
- The optional `e2e/official-local.spec.ts` suite passes six desktop/mobile
  cases. Its new pair checks all three first-card positions, no document-wide
  horizontal overflow, complete first-item modifiers and Crafted from content,
  the narrower desktop card, keyboard access to the mobile icon strip, and
  absence of page-wide overflow at 320 pixels.
  The existing four cases continue to cover search and previews.

## Manual check

1. Run `pnpm.cmd dev:official` from the repository root. At 1280 × 720, open
   `http://localhost:3001/items/`, `/crafts/`, and `/encrusts/`. Each first
   card should begin inside the initial viewport. The first Sword card should
   show its facts and modifiers on the left and its crafting relationships on
   the right, without dropping any entries.
2. At 390 × 844, reopen those routes. The first card should again begin inside
   the initial viewport and the page should not scroll horizontally. On Items,
   swipe the compact icon row to reach later categories, or use Tab to focus
   one; the row should reveal the focused link. Switch to Detailed to see the
   named category grid.
3. Open a recipe eye control from an item relationship by keyboard or touch,
   then press Escape. The preview should close and focus should return to its
   trigger. Full details links remain usable without opening a preview.

No official data, generated derivative, or screenshot is tracked by this
change. The preserved `legacy/` application remains the reference.
