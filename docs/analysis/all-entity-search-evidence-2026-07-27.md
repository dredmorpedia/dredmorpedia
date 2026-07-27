# All-entity search and resilient URL input evidence

Date: 2026-07-27

## Scope

This slice exposes the complete generated search artifact through the existing
static `/search/` route. The entity-type filter now covers items, recipes,
encrustments, skills, abilities, spells, monsters, stats, and targeting
templates instead of discarding every kind except items, stats, and templates.
No raw XML, new game-data semantics, or publication permission is introduced.

The text input now keeps a local draft so typing immediately updates the field
and visible results. After 250 milliseconds without another edit, the draft is
written to the URL with `router.replace`. Immediate structured-filter changes
carry the current draft into their URL update, and URL changes from history or
external navigation synchronize back into the input without allowing an older
in-flight update to overwrite newer typing.

## Measured reach

The ignored canonical search artifact currently contains 2,767 documents:

- 763 items;
- 374 recipes;
- 57 encrustments;
- 52 skills;
- 352 abilities;
- 951 spells;
- 183 monsters;
- 0 stats; and
- 35 targeting templates.

The former web allow-list exposed 798 of those documents and hid the other
1,969 despite their existing static detail routes. The new filter makes all
2,767 records queryable without changing the generated artifact.

These aggregate measurements are local evidence only. They do not approve
publication of the ignored official artifact.

## Deliberate boundaries

- Results remain capped at 50 and use the existing deterministic domain ranking.
- The stat facet remains an item-stat facet because broader ability/spell stat
  search needs its own evidenced domain contract.
- The search payload remains client-interactive. Static browse indexes and a
  useful no-JavaScript discovery surface remain separate product work.
- ADR 0003's transfer, parsing, interaction, and relevance acceptance budgets
  remain open.

## Verification

`pnpm.cmd check` passes formatting, lint, type checking, all 96 unit/artifact
tests, byte-identical synthetic generation, and the 30-page static export.
`pnpm.cmd test:e2e` passes all 26 desktop/mobile tests. The browser suite enters
a spell query character by character, verifies that the complete input remains
visible, waits for the debounced shareable URL, follows the result to its static
spell route, and continues to exercise item/stat/template filters, keyboard
interaction, mobile layouts, and the representative axe sweep.

`pnpm.cmd build:official` also passes deterministic zero-error generation and
the complete 2,824-page local static export with all 2,767 search documents.
