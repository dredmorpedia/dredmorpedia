# Legacy navigation and tooltip parity

Date: 2026-08-11
Status: navigation/tooltip inventory complete; selected recipe-tool gap implemented

## 2026-08-15 experience-parity correction

The inventory below remains useful evidence about the preserved application's
mechanics, but its conclusion was too broad. Stable routes, Search, and generic
Browse catalogues reproduce content reachability; they do not by themselves
reproduce the preserved site's simple player experience. Direct section tabs,
image-led category choices, and dense relationship-bearing rows made ordinary
browsing more obvious than the generic text catalogues.

The project therefore reopens **experience parity** without restoring jQuery UI,
numeric hashes, the all-record DOM, icon-only labels, or cloned-row hover
tooltips. The corrected direction is:

- direct primary navigation using the familiar Items, Crafts, Encrusts, Skills,
  Spells, Monsters, Stats, Templates, and Meta names;
- image-led, visibly grouped catalogue controls backed by stable static routes;
- concise player-facing facts and relationships on catalogue cards; and
- Search, Dataset, and planning tools retained as complementary utilities.

The first corrected slice implements the shell, a Tools directory, and a
category-first Items catalogue. The table's earlier “superseded” classifications
should be read as historical implementation decisions, not as the remaining
product plan. See
`docs/analysis/legacy-experience-parity-review-2026-08-15.md`.

## Scope and method

This inventory closes the final navigation/tooltip checkpoint in Phase 4. It
compares the preserved application's first-party implementation in
`legacy/index.html`, `legacy/js/dredmor.js`, `legacy/js/helper.js`,
`legacy/js/search.js`, and the entity section renderers with the modern static
routes, Browse directory, structured search, breadcrumbs, and reciprocal
relationships.

The canonical ignored `1.1.5 public_beta` artifact was measured only to verify
coverage. No official source, generated derivative, inherited asset, local
installation path, or historical tooltip markup is added to Git.

## Inventory and decisions

| Preserved behavior                                                                                       | Modern treatment                                                                               | Decision                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Twelve top-level jQuery UI tabs                                                                          | Stable routes plus visible Home, Browse, Search, Meta, and Dataset navigation                  | Superseded. Record kinds remain exhaustively discoverable through Browse and Search without an all-record DOM.                                                                                    |
| Item-type tabs                                                                                           | Semantic item categories in structured search plus bounded static item catalogues              | Retained through a more explicit, shareable filter.                                                                                                                                               |
| Crafting-tool tabs                                                                                       | Recipe records preserved `tool`, but search documents omitted it                               | **Gap fixed in this slice:** every recipe now exposes its normalized tool through the existing category filter.                                                                                   |
| Encrusting-tool tabs                                                                                     | Encrustment search categories already use the normalized tool                                  | Already covered.                                                                                                                                                                                  |
| One icon tab per skill                                                                                   | Static skill catalogues and skill detail routes with complete ability progression              | Superseded without hiding the skill name behind an icon title.                                                                                                                                    |
| Alphabetic spell tabs                                                                                    | Text search and bounded alphabetical static catalogues                                         | Intentionally superseded. The A–Z split was an all-DOM scaling workaround, not a distinct domain relationship.                                                                                    |
| Monster dungeon-depth/special tabs                                                                       | Monster catalogues, text search, and detail pages preserve depth and special classification    | Content parity is covered. A combined structured depth/taxonomy filter is a possible Phase 5 rich-filter improvement rather than a reason to retain tab mechanics.                                |
| Damage/resistance/primary/secondary stat tabs and clickable stat icons                                   | Named stat routes, category-bearing search documents, stat filter, and reciprocal backlinks    | Superseded with visible text and keyboard-operable controls.                                                                                                                                      |
| Runtime numeric hash links and per-row “Link to this” icons                                              | Deterministic canonical and alias URLs for every record                                        | Replaced. The page URL itself is the durable link.                                                                                                                                                |
| Reference clicks that pushed the current row, selected nested tabs, scrolled, and highlighted the target | Ordinary links, browser history, breadcrumbs, canonical headings, and reciprocal relationships | Replaced with native navigation; back/forward behavior no longer needs an application history shim.                                                                                               |
| Hover tooltips that cloned the referenced table row's HTML                                               | Visible link labels, summaries, and full static target pages                                   | Intentionally excluded. The clone was pointer-only, unavailable on touch, unreliable for keyboard/assistive technology, duplicated arbitrary imported markup, and scaled with the all-record DOM. |
| Icon-only tab and stat `title` attributes                                                                | Visible names, descriptions, labels, and accessible control names                              | Superseded; essential information does not depend on hover.                                                                                                                                       |
| Source tags and the Mods tab                                                                             | Visible provenance and the Dataset source/diagnostic/override explorer                         | Active-dataset visibility is covered. Choosing among complete datasets and broad mod workflows remain later product capabilities.                                                                 |
| Historical About links and release prose                                                                 | Repository product/policy documentation and the local-dataset footer                           | Not a content-parity dependency. A public About/legal surface belongs with release work after wording and publication rights are settled.                                                         |

An accessible entity-preview popover could still be useful later, but it would
be a new quality-of-life feature: it should use a maintained focus/ARIA
primitive, load a deliberately bounded summary, work on touch and keyboard, and
be justified by user need. It must not reproduce the cloned-row tooltip.

## Implemented recipe-tool navigation

`packages/domain/src/search.ts` now maps normalized recipe `tool` values into
the existing search-document `category` field, matching the already implemented
encrustment treatment. This does not change search schema: the nullable field
already exists, and its deterministic filtering/URL contract is unchanged.

The canonical ignored dataset contains 374 active recipes, all now categorized
across the same seven tool tags used by the preserved Craft section:

| Tool     | Recipes |
| -------- | ------: |
| alchemy  |      55 |
| grinder  |       5 |
| ingot    |      16 |
| lathe    |      20 |
| smithing |     169 |
| still    |      13 |
| tinkerer |      96 |

The synthetic Clockwork Blade Recipe provides the tracked regression: selecting
**Recipes** and **Smithing** in Search yields exactly that recipe and preserves
`kind=recipe&category=smithing` in the URL.

## Validation

- Focused domain search tests pass with the recipe-tool category regression.
- `pnpm generate:official:check` remains byte-identical with 763 items, 2,829
  search documents, 0 errors, 4 relationship warnings, 90 informational
  records, and all 374 recipes categorized. The compact search artifact is
  1,185,026 bytes, still below ADR 0003's 1,500,000-byte raw ceiling.
- `pnpm check` passes formatting, lint, type checking, 77 domain tests, 101
  pipeline tests, 89 web tests, deterministic generation, and the 45-page
  synthetic static export.
- `pnpm test:e2e` passes all 40 desktop/mobile cases, including keyboard
  Recipes → Smithing selection, URL persistence, responsive flows, and the
  representative axe sweep.
- `pnpm benchmark:search:official` exports all 2,982 local pages and retains
  every ADR 0003 transfer, parse, query, relevance, desktop, and 4x-CPU mobile
  budget. The current compact artifact is 1,185,026 bytes raw, 196,912 bytes
  gzip, and 143,690 bytes Brotli.

## Checkpoint conclusion

The navigation/tooltip checkpoint is complete. The useful outcomes of the
preserved navigation are covered, the one measured recipe-tool omission is
fixed, and the obsolete hover/hash mechanics are explicitly excluded. Keep
`legacy/` as a reference until complete parity evidence and a separate archival
decision; this conclusion does not delete it, broaden publication rights, add a
version switcher, or approve disputed engine formulas.

The next active parity work is the approved page-driven visual pass: inventory
the non-item artwork referenced by entity types already shown in the modern UI,
then extend the ignored local asset pipeline for the first selected family
without bulk-copying unrelated resources. Phase 5 product prioritization still
waits for that parity polish.
