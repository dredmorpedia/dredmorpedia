# Search filtering rework evidence

Date: 2026-08-13
Status: implemented and verified

## Scope

This slice closes the deferred search-category presentation and interaction
backlog without changing search schema 2, generated documents, query ranking,
or ADR 0003's response budgets.

The category facet carries several different domain meanings. The previous
control flattened item categories, crafting tools, skill archetypes, monster
taxonomies, and stat groups into one unbounded list ordered by raw source
values. It also silently ignored an incompatible category after an entity-type
change while leaving that stale value in the shareable URL.

## Implemented behavior

- Category options are grouped as **Crafting tools**, **Item categories**,
  **Monster taxonomies**, **Skill archetypes**, and **Stat groups**.
- Groups appear in stable display order and each group's options are sorted by
  the labels users see rather than by raw source tokens. Item labels continue
  to use the verified semantic item-category catalogue; the other groups use
  presentation-only English title casing.
- Selecting an entity type restricts the category popup to compatible groups.
  Types without a category facet disable the control.
- A category that becomes incompatible is removed atomically when the entity
  type changes. Invalid or stale incoming `category` parameters are also
  removed with a history-preserving URL replacement.
- The shared Base UI Select list is capped at `20rem` and the available
  viewport height, with keyboard and touch scrolling, overscroll containment,
  scroll padding, and the existing scroll arrows.
- Select item text has an explicit second grid column. Base UI omits the
  unchecked indicator element, so this prevents unselected labels from
  collapsing into the checkmark column.
- Result metadata uses the same entity-aware category labels as the filter.

No query semantics changed: the stored category value remains the exact
generated facet token, and choosing a shared crafting tool with all record
types selected still finds both recipes and encrustments.

## Verification

- Focused category-facet unit coverage proves grouping, deduplication,
  displayed-label ordering, entity-type restriction, empty groups, and
  entity-aware labels.
- The desktop/mobile Playwright flow opens the actual Base UI popup, verifies
  its five semantic groups, confirms the list is scrollable and capped at 320
  pixels, reaches the final option by keyboard, checks recipe-only options,
  and proves both interactive and incoming stale-category URL cleanup.
- The representative axe sweep continues to include `/search/` on desktop and
  mobile.
- Manual browser inspection at 1280×720 and 390×844 confirmed the bounded
  popup, readable group hierarchy, full-width option text, no positive
  horizontal overflow, and a 320-pixel scroll viewport.
- `pnpm check`, `pnpm test:e2e`, `pnpm build:official`, and
  `pnpm benchmark:search:official` pass at this checkpoint.

The official dataset and local imported assets remain ignored and local-only.
