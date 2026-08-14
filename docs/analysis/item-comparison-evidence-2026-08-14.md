# Item comparison evidence

Date: 2026-08-14

## Product boundary

This first side-by-side comparison slice adds `/tools/item-compare/`. A user
can select up to three items and keep their ordered choices in repeated `item`
URL parameters. Every item detail page links into the tool, while Browse and
the primary navigation make the empty tool discoverable.

The comparison presents only normalized source facts already verified at the
artifact boundary: category, value, quality, selected use declarations, named
stats, and direct modifiers. Named-stat declarations and direct modifiers stay
in separate tables. An absent declaration is displayed as **Not declared**,
not zero. The tool does not calculate equipment totals or infer combat,
stacking, inventory, eligibility, or another engine rule.

## URL and interaction contract

- Repeated `item` parameters preserve column order and remain ordinary static-
  hosting-compatible URL state.
- Only the first three unique canonical item slugs in the active dataset are
  retained. Unavailable, repeated, and extra entries are removed and explained
  in the UI.
- Replacing or removing a slot canonicalizes the URL without browser storage,
  accounts, or a persistence decision.
- The Base UI item selectors are grouped by displayed semantic item category,
  alphabetized by displayed item name, keyboard operable, and bounded by the
  shared scrollable popup.
- Comparison tables use semantic row and column headers. On narrow screens,
  each table is its own focusable horizontal scroll region; the document does
  not acquire horizontal overflow.

## Validation

- `pnpm.cmd check` passes formatting, lint, type checking, 302 unit/artifact
  tests, byte-identical synthetic generation, and the 49-page synthetic static
  export.
- `pnpm.cmd test:e2e` passes all 56 desktop/mobile Chromium cases. Coverage
  keyboard-opens comparison from an item, adds and restores a second item,
  checks exact source values and missing-declaration labels, verifies stale and
  duplicate URL cleanup, checks mobile document width, and includes the route
  in the representative axe sweep.
- `pnpm.cmd build:official` passes deterministic canonical generation with 0
  errors, 4 warnings, and 90 informational decisions plus the complete
  2,985-page local static export.
- The canonical comparison page, including selector data for all 763 items, is
  613,655 bytes raw, 106,167 bytes with gzip level 9, and 78,676 bytes with
  Brotli quality 11.
- Manual synthetic verification confirmed ordered item restoration, semantic
  row/column headers, explicit missing values, stat-page/detail links, and the
  responsive local-scroll boundary.

No generated official record, imported asset, local installation path, or
other restricted input was added to tracked output.

## Next boundary

Item comparison is the first completed part of the roadmap's comparison/build-
planning milestone. The next recommended slice is a bounded build-planning
model with a separately reviewed definition of what a build contains; it must
not infer totals until each relevant engine mechanic is verified.
