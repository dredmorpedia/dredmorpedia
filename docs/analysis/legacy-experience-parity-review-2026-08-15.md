# Legacy experience parity review

Date: 2026-08-15
Status: active; Items catalogue correction complete

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

The initial catalogue reused the existing checksummed item icon set, remained
server rendered without JavaScript, and limited each category page to 36
items. The owner-reviewed correction below subsequently extended the verified
asset contract for three fixed interface icons.

## Owner-reviewed Items correction

The correction is implemented:

1. A compact legacy-like category strip is the default; the grouped, counted
   chooser remains available through the adjacent Detailed toggle.
2. The deterministic default is **game order**, matching source precedence and
   source/XML order. Name, quality, and value are explicit alternatives and do
   not claim to model dungeon availability.
3. Category representatives come from game order rather than alphabetical
   order. A future curated override still requires a documented reason.
4. An accessible display-settings drawer controls order and page size. The
   compact/detailed control also remains visible beside it, and the browser
   stores the preferences locally without changing entity identity.
5. The bounded 36-item default remains canonical. Static alternatives provide
   24, 36, or opt-in **All** views at shareable routes. The largest canonical
   category contains 54 items; its measured All export remains acceptable for
   the local MVP.
6. Base-game records are unmarked. Expansion and mod records use compact,
   project-owned text markers with the complete source name exposed through
   accessible names and titles.
7. The page-driven asset pipeline now imports and verifies the exact gold,
   filled-quality-star, and empty-quality-star interface icons declared by the
   official source manifest. Stat icons remain a separate mapping task because
   ADR 0005 intentionally forbids importing legacy icons through the
   project-authored stat reference.
8. Category representative images use native titles for supplementary item
   identification. Adjacent visible names remain the accessible source of
   truth; rich recipe previews remain assigned to a maintained
   tooltip/popover primitive during Craft parity.

The preserved order is evidenced directly in `legacy/js/item.js` and
`legacy/js/helper.js`: categories sort by type ID, items use `SortBySource`
(source ID followed by generated object ID), and each category icon is the
first item's icon. It is therefore source/XML order—not alphabetical, price, or
quality order.

The next parity slice is the Craft catalogue:

1. Crafts grouped by normalized crafting tool, with ingredient and output art.
   Define one reusable recipe summary card, then use an accessible bounded
   preview of that card from item relationships on hover, focus, and tap.
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

- `pnpm check` passes formatting, lint, type checking, all 308 workspace tests,
  deterministic generation, and the 195-page synthetic static export.
- Focused domain, pipeline, and web tests cover deterministic game order,
  alternative orders, static view paths, source markers, preference controls,
  and schema-bound interface icons.
- `pnpm test:e2e` passes all 62 desktop/mobile cases, including the
  JavaScript-disabled category flow, keyboard navigation, responsive overflow,
  the display drawer, local preference restoration, and representative axe
  scans.
- Browser inspection against the ignored official dataset confirms 31 visible
  item categories with verified art; Sword begins with Crude Iron Sword, Rough
  Iron Sword, Iron Sword, and Fine Iron Sword in game order. Its opt-in value
  view renders all 44 swords at `/items/category/weapon-sword/view/price/all/1/`
  and Reset returns to the canonical route.
- The largest official category contains 54 items. Its All-mode HTML measures
  about 571 KB versus about 442 KB for its default first page, an acceptable
  bounded opt-in increase for the local MVP.
- The deterministic official asset set now contains 1,793 mappings to 1,482
  content-addressed files: the prior 1,790 entity mappings plus the three
  manifest-declared interface icons, with no fallbacks.
- `pnpm build:official` passes deterministic zero-error generation and the
  complete 3,455-page local static export with all canonical and optional
  catalogue view routes.
