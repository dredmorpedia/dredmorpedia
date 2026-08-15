# Legacy experience parity review

Date: 2026-08-15
Status: active; first implementation slice complete

## Why parity was reopened

The earlier parity milestone correctly established normalized content,
relationships, stable routes, provenance, diagnostics, complete discovery, and
validation. A side-by-side product review found a separate gap: the preserved
application often makes the same information easier for a player to recognize.
Its direct section tabs, item/tool/depth/alphabet groupings, game art, and dense
summary rows provide context before a user opens a detail page.

The modern generic Browse cards and advanced Search are useful foundations and
additions, but they are not a complete replacement for that experience. Search
in particular should help with precise or cross-cutting questions rather than
being required for ordinary category browsing.

## Decisions

- Keep direct primary navigation named Items, Crafts, Encrusts, Skills, Spells,
  Monsters, Stats, Templates, and Meta. Do not label these surfaces “Legacy.”
- Keep Search, Tools, and Dataset as distinct utilities. Do not remove their
  modern functionality.
- Reproduce useful visual grouping and image-led summaries with semantic HTML,
  static routes, bounded pages, visible labels, and keyboard/touch support.
- Do not reproduce numeric hash state, eager all-record rendering, fixed-width
  layout, icon-only control names, or cloned-row hover tooltips.
- Use the already approved page-driven asset importer only for entities shown
  by each implemented surface. Do not bulk-copy unrelated game resources.
- Put common player facts and relationships on summary cards. Keep advanced
  source/provenance and uninterpreted technical declarations on detail pages,
  with further progressive-disclosure polish decided page by page.
- Do not add a Mods tab until the product can actually select or compare a
  second complete verified dataset.

## First implementation slice

The first slice provides:

- a two-level responsive header with the nine core encyclopedia links and a
  separate Search/Tools/Dataset utility group;
- a `/tools/` directory for item comparison and the two dependency planners;
- `/items/` plus statically generated, bounded
  `/items/category/<category>/<page>/` routes;
- visible category groups ordered by familiar player concepts, each with an
  existing verified item icon, label, and count;
- image-led item summary cards with description, value, quality, recovery,
  named stats/modifiers, representative crafting inputs, “Used to craft,”
  “Used to encrust,” effects, and a detail link when those declarations exist;
  and
- item-detail breadcrumbs returning to the new catalogue, with the comparison
  callout demoted behind core detail content.

No importer or artifact contract changed. The catalogue reuses the existing
checksummed item icon set, remains server rendered without JavaScript, and
limits each category page to 36 items.

## Recommended continuation

Continue experience parity before starting another differentiating tool:

1. Crafts grouped by normalized crafting tool, with ingredient and output art.
2. Encrusts grouped by toolkit, with ingredient, applicability, instability,
   and output-relevant summaries.
3. Skills and abilities as image-led progression summaries.
4. Spells with an accessible alphabetical index and effect-focused summaries.
5. Monsters grouped by dungeon depth/special classification with existing art.
6. Stats and templates grouped by their familiar semantic families.
7. Detail-page progressive disclosure after the catalogue surfaces reveal
   which technical sections distract from common player questions.

Search and the generic exhaustive Browse directory remain available throughout
this work as advanced and completeness-oriented fallbacks.

## Validation

- `pnpm check` passes formatting, lint, type checking, all 305 workspace tests,
  deterministic generation, and the 63-page synthetic static export.
- `pnpm test:e2e` passes all 60 desktop/mobile cases, including the
  JavaScript-disabled category flow, keyboard navigation, responsive overflow,
  and representative axe scans.
- Browser inspection against the ignored official dataset confirms 31 visible
  item categories with verified art, bounded 36-item pages, and reagent cards
  rich in visible relationships.
- `pnpm build:official` remains byte-identical with 763 items, 2,829 search
  documents, 0 errors, the expected 4 warnings and 90 informational records,
  1,790 presented icon mappings with no fallbacks, 40 category pages, and the
  complete 3,027-page local static export.
