# Complete provenance override history evidence

Date: 2026-08-05

## Decision boundary

The generated artifact already retained every source-resolution step as an
ordered `appliedOverrides` array. This slice changes no schema or precedence
rule. The web now presents each retained step separately, with the previous and
replacement source labels, exact source IDs and locations, and the normalized
fields that changed. Reviewed patch history remains a distinct later stage.

## Regression fixture

The independent synthetic Clockwork Blade fixture now has three ordered source
candidates. Resolution records two steps: Synthetic Base to Synthetic
Expansion, then Synthetic Expansion to Synthetic Override. The second candidate
changes only `description`, while the existing guarded patch still changes the
resolved price from 155 to 160. Import tests assert both step order and the
second step's exact field list.

## Verification

- `pnpm check` passes formatting, lint, type checking, all 193 unit/artifact
  tests, byte-identical synthetic generation, and the 43-page static export.
- Synthetic generation reports 13 items, 25 search documents, one intentional
  error, 18 warnings, and five informational decisions; the extra information
  record is the deliberate second override.
- Desktop and mobile Playwright coverage verifies both rendered steps, their
  source order, per-step changed fields, and the following reviewed patch.
  The representative Clockwork Blade axe scan remains clean.
- Manual browser inspection confirms the ordered-list and nested definition-list
  semantics. At a 375-pixel viewport, document width equals viewport width and
  both override cards fit at 301 pixels without horizontal overflow.
- The ignored canonical official import remains byte-identical and the complete
  static export succeeds, proving the presentation change does not alter
  official normalized data.

This resolves finding 6, the final ordered fix from the 2026-08-03 full-project
review.
