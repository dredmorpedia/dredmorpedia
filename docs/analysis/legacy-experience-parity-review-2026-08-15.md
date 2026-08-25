# Legacy experience parity review

Date: 2026-08-15
Status: active; Items, Crafts, and Encrusts catalogue corrections implemented

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
- image-led item summary cards with description, value, quality, the distinct
  source-declared **Artifact / Quality x** property, recovery,
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
   filled-quality-star, empty-quality-star, Encrust applicability, and stat
   interface icons declared by the official source manifest. ADR 0005's
   2026-08-24 amendment keeps official paths/bytes outside the project stat
   reference while adding 62 reviewed stat-icon identities. Item catalogue
   modifiers use compact icon-plus-value links; item details retain names
   beside the same icons, and missing configured imagery falls back to text.
8. Category representative images use native titles for supplementary item
   identification. Adjacent visible names remain the accessible source of
   truth; recipe previews use the maintained popover described below.
9. The Value/Quality fact row aligns its labels with the centre of the game
   icon presentation rather than mixing text baselines with padded imagery.
10. Item effect summaries retain the preserved player-facing structure:
    explicit source chance, verified spell icon, linked spell, and trigger
    context flow as one readable sentence. The same
    presenter applies to weapons, armour, tomes, traps, wands, potions,
    mushrooms, food, and booze. Available duration, delay, taxonomy, and
    resistance qualifiers remain visible. A native disclosure exposes the
    uncommon third and later effects instead of silently truncating them.

The preserved order is evidenced directly in `legacy/js/item.js` and
`legacy/js/helper.js`: categories sort by type ID, items use `SortBySource`
(source ID followed by generated object ID), and each category icon is the
first item's icon. It is therefore source/XML order—not alphabetical, price, or
quality order.

### Remaining item-card parity findings

A 2026-08-25 comparison of every branch in `legacy/js/item.js` against the
official normalized dataset found that the modern detail routes already retain
the source facts used by the preserved item table. The remaining card-level
presentation gaps are narrower:

- the 21 wand records keep their exact minimum/maximum charge range on detail
  pages, but catalogue cards do not yet show the preserved player-facing
  `x–y charges` summary;
- three armour records retain a non-zero direct random-stat declaration on
  detail pages, but catalogue cards do not yet reproduce the preserved
  **Random Stats** marker;
- 20 weapon declarations retain a direct `canTargetFloor` source flag on
  detail pages, but catalogue cards do not yet show **Can target the floor**.
  The preserved application's accompanying **Cannot be recovered** text is an
  inference from that flag and remains intentionally excluded until separate
  engine evidence supports it; and
- 35 official items have more than six combined named stats and direct
  modifiers. Catalogue cards currently cap that block without an explicit
  disclosure, unlike the preserved table's complete stat block. Add a compact
  native disclosure rather than making every default card permanently taller.

Price, quality, Artifact quality, health/mana recovery, trap quality and cast
spell, item/spell triggers, direct stats, craft inputs/outputs, description,
category context, icon, and source identity are otherwise represented on the
catalogue or its maintained relationship previews. The modern **Used to
encrust** relationship is an intentional addition.

## Craft catalogue foundation

The Craft catalogue foundation is implemented at `/crafts/` and
`/crafts/tool/<tool>/`:

- all recipes are grouped under the seven normalized crafting tools in the
  preserved familiar tool order;
- tool navigation uses the existing verified toolkit item art, recipe counts,
  visible selection state, and horizontally scrollable keyboard/touch-safe
  markup; compact icons are the default and a Detailed toggle keeps every tool
  name visible;
- a matching display-settings drawer stores the tool-chooser layout, recipe
  order, and page size locally. The canonical view shows 36 recipes in
  deterministic source/XML game order; 24, 36, and All plus name and lowest
  declared output-level orders have ordinary static shareable routes;
- the reusable recipe summary card presents ingredient/output art and links,
  neutral source levels, hidden status, source marker, and a full-detail route.
  As in the preserved Craft view, unit ingredient quantities are omitted;
  exceptional input quantities and all output quantities remain explicit. In
  Items and selected-tool Craft routes, the actual selected tab progressively
  detaches into a compact upper-right return-to-chooser control after the
  chooser scrolls away. Without JavaScript it remains an ordinary selected
  link. The card suppresses redundant tool identity when the selected route and
  floating tab already establish it; and
- recipe detail breadcrumbs now return through the matching Craft tool route,
  while advanced Search and the crafting planner remain explicit additions.

The aggregate `recipe.skillLevel` is only the maximum of the declared output
tiers, so cards and details no longer repeat it as “Highest source skill.” The
individual output tiers remain attached to their outputs and now use the
preserved tool-to-stat icon mapping. Dual-stat tools show both familiar icons
without claiming an AND/OR eligibility rule or another engine formula.

The current text Hidden badge and compact text expansion markers remain
functional but are not treated as finished iconography. A later card-polish
decision may replace them with project-owned or permission-cleared icons; do
not assume the game supplies suitable assets.

Item catalogue and item-detail “Used to craft” relationships now reuse a
bounded form of the same card through a maintained Base UI popover. The
crafted-item or recipe link remains visible and usable without opening the
preview. Fine-pointer hover applies to the whole relationship chip; a compact
icon-only button remains the explicit keyboard and touch control with a full
accessible name and native title. Keyboard focus enters the interactive card,
and Escape closes it and returns focus without reopening. The bounded popup
does not create an internal scrollbar. Each side is limited to four references
with an explicit overflow message. Cross-context cards place the verified
toolkit icon between their ingredient and output lists when the active asset
set provides it; cards on an already selected tool page continue to suppress
that redundant identity because its selected tab provides scrolling context.

## Encrust catalogue foundation

The Encrust catalogue is implemented at `/encrusts/` and
`/encrusts/tool/<tool>/`:

- all 57 canonical encrustments are grouped under their five used toolkits in
  the preserved familiar order: Lathe, Alchemy, Ingot Press, Smithing Kit, and
  Tinkerer Parts;
- the compact/detailed chooser, toolkit art, counts, floating selected tab,
  local preference behavior, and no-JavaScript fallback reuse the maintained
  catalogue navigation shared with Crafts;
- the complete selected tool group is the default, matching the preserved
  catalogue's unpaginated behavior. Optional 12, 24, and All views plus game,
  name, required source-level, and declared-instability orders have ordinary
  static routes;
- summary cards reuse the maintained ingredient rows and omit redundant unit
  quantities. Repeated declarations of the same ingredient are combined for
  catalogue presentation while the normalized detail record remains
  unchanged; and
- cards expose exact source level, declared instability, ingredient links and
  art, applicable slots, direct modifiers, power hooks, Hidden status, and
  source markers. Exact `<encrustwith>` descriptors remain on detail pages as
  **Encrusted with** but are omitted from generic catalogue cards. The pages do not derive an
  instability probability, final item stats, or another engine formula;
- required levels use the preserved crafting-stat icon associated with the
  toolkit, while modifier rows retain their names and add the same verified
  stat imagery used by Items;
- applicable slots pair their visible labels with the exact 11 manifest-
  declared blue schematic icons on catalogue and detail routes. Missing
  verified imagery, including the synthetic fixture, retains the text-only
  fallback; and
- item **Used to encrust** relationships reuse the maintained summary card and
  show every applicable slot as an icon stack. Recipe relationships now give
  **Crafted from** the same preview behavior as **Used to craft**: each whole
  ingredient group previews its recipe through hover or one adjacent eye
  control, without a repeated recipe-name row or unit quantities. Passive
  `+N more` text is replaced with native in-place
  disclosure. Overflow rows keep their art, direct detail links, and preview
  cards, while the expanded Hide control follows the revealed rows visually;
  and
- the preserved table's orphaned `x` output marker is intentionally omitted.
  It comes from a Craft output template whose amount and item are never
  populated by the Encrust loader, not from a game quantity or mechanic.

The selected toolkit remains visible through the floating selected tab after
the chooser scrolls away, so cards suppress repeated tool identity on these
tool-group routes. Advanced Search, the encrustment planner, exhaustive Browse,
and the existing detail routes remain distinct additions and fallbacks. The
detail breadcrumb now returns through the matching direct toolkit route.
Existing item and toolkit icons covered the entity art. The page-driven asset
importer expanded only for the 11 exact applicability UI icons now rendered by
this slice. Detailed evidence is in
`encrust-catalogue-evidence-2026-08-24.md`.

The follow-up generic Item comparison is also resolved. Voodoo Globe and
Satanic Locator are active official records, so they remain visible under a
new semantic Macguffin category. Lockpick is absent from the active item
database but present in 16 starting-loadout declarations, the active `Lucky
Pick` direct item target, further read-only engine data, and a verified official
icon. ADR 0006 therefore exposes it as a visibly labelled, project-authored
engine reference with exact normalized backlinks and `Not declared`
value/quality facts; the preserved setup's invented price is not copied.
Evidence is in
`docs/analysis/engine-item-reference-and-macguffin-catalogue-evidence-2026-08-22.md`.

The remaining parity order is:

1. Skills and abilities as image-led progression summaries;
2. Spells with an accessible alphabetical index and effect-focused summaries;
3. Monsters grouped by dungeon depth/special classification with existing art;
4. Stats and templates grouped by their familiar semantic families; and
5. detail-page progressive disclosure after the catalogue surfaces reveal
   which technical sections distract from common player questions.

Search and the generic exhaustive Browse directory remain available throughout
this work as advanced and completeness-oriented fallbacks.

## Validation

- `pnpm check` passes formatting, lint, type checking, all 321 workspace tests,
  deterministic generation, and the 240-page synthetic static export.
- Focused domain, pipeline, and web tests cover deterministic game order,
  alternative orders, static view paths, source markers, preference controls,
  and schema-bound interface icons.
- `pnpm test:e2e` passes all 80 desktop/mobile cases, including the
  JavaScript-disabled category flow, keyboard navigation, responsive overflow,
  the display drawer, local preference restoration, whole-relationship hover,
  icon-only focus/tap recipe controls, Escape focus restoration, and
  representative axe scans. The item-effect coverage includes explicit chance
  and trigger context on a non-weapon card plus keyboard/touch disclosure of
  its later effects.
- Browser inspection against the ignored official dataset confirms 31 visible
  item categories with verified art; Sword begins with Crude Iron Sword, Rough
  Iron Sword, Iron Sword, and Fine Iron Sword in game order. Its opt-in value
  view renders all 44 swords at `/items/category/weapon-sword/view/price/all/1/`
  and Reset returns to the canonical route.
- The relationship-heavy Reagent category now measures about 1.77 MB for its
  default 36-item page and 2.05 MB for its explicit All view. The increase pays
  for every disclosed recipe/encrustment relationship retaining its complete
  preview behavior as well as its direct detail link.
- The deterministic official asset set now contains 1,867 mappings to 1,555
  content-addressed files, with no fallbacks. All 62 reviewed stat identities
  resolve to verified local icon assets; catalogue modifiers retain accessible
  names and titles while using the compact image-led presentation.
- `pnpm build:official` passes deterministic zero-error generation and the
  complete 3,658-page local static export with all canonical and optional
  catalogue view routes.
- The Craft foundation's focused unit tests cover familiar/fallback tool order,
  toolkit names and representatives, route collisions, and source/XML recipe
  order. Its JavaScript-disabled Playwright flow passes on desktop and mobile,
  including keyboard tool navigation, unresolved ingredients, exact output
  tiers, and responsive overflow.
- The official static export verifies the relationship preview's toolkit and
  item art. Playwright preserves the adjacent direct item link, recipe link,
  per-output source level, full-detail route, centered transformation icon, and
  popup without an internal scrollbar.
- `pnpm build:official` also verifies all 374 canonical recipes across seven
  Craft tool routes and 113 optional static view routes with the unchanged
  1,793-mapping asset set, zero fallbacks, and a complete 3,576-page local
  static export.
- The later engine-reference/Macguffin correction passes the full 312-test
  repository gate and all 72 desktop/mobile browser cases. Its deterministic
  official build contains 764 items, 2,830 search documents, 1,794 asset
  mappings to 1,483 files, zero fallbacks, and 3,589 static pages. The four
  deliberate relationship warnings are unchanged; informational records fall
  to 74 because all 16 Lockpick loadouts now resolve exactly.
- The Encrust foundation verifies all 57 canonical records across five toolkit
  routes and 63 optional static view routes. Its focused tests cover source
  order, alternate orders, page sizes, collisions, and repeated-input
  presentation plus all 11 exact applicability-icon mappings; its JavaScript-
  disabled and interactive Playwright flows pass on desktop and mobile. The
  official HTML contains titled slot imagery while the synthetic export keeps
  readable label fallbacks. Detailed evidence is in
  `encrust-catalogue-evidence-2026-08-24.md`.
