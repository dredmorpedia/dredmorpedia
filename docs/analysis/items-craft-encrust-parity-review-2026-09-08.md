# Items, Craft, and Encrust parity review

Date: 2026-09-08

Reviewed checkout: `caef089` (`Harden catalogue previews and preserve planner cycle choices`)

Scope: independent comparison with the running preserved application; review only.

The audited content is substantially in parity. The remaining gaps concern
inspection without leaving a catalogue, browsing density, and navigation
continuity. No missing recipe or encrustment declaration was found in the
measured comparison. This does not certify every item field or engine mechanic.

## Findings, in priority order

### P2: quick inspection stops at recipe and encrustment previews

On `/crafts/`, ingredients and outputs provide item names and links, but no
item preview. For example, comparing the Lathe's wand recipes requires leaving
the catalogue to inspect each wand's charges and effect. Encrust ingredients
have the same limitation. On `/items/category/wand/1/`, spell references such
as **Voltaic Empowerment** link to the spell page without exposing its contents
in place.

Legacy attaches a tooltip to every `a.ref`, including Craft/Encrust ingredient
and Craft output icons, and item spell references. Its tooltip copies the
referenced record, making that information available without navigating away.
The current recipe/encrustment previews restore only part of this workflow:
an item can show its recipe, but that recipe cannot show its referenced item.

Evidence:

- `legacy/js/dredmor.js:33–53` attaches reference tooltips;
  `217–265` produces item and spell reference links.
- `legacy/index.html:331`, `342`, and `406` use item references for Craft inputs,
  outputs, and Encrust inputs.
- `apps/web/src/components/catalogue-item-reference-list.tsx:64–87` renders
  reference art and a plain item link.
- `apps/web/src/components/item-trigger-effect.tsx:43–47` renders a plain spell
  link. The surrounding component retains trigger context and declared chance,
  duration, delay, taxonomy, and resistance qualifiers.

Recommended first slice: bounded item previews on Craft and Encrust references,
with an explicit focus/tap control and the existing direct link retained.
Follow with a separately scoped spell summary for item effects. Preserve lazy
loading, validated payloads, failure links, and Escape/focus behavior. The
legacy HTML-cloning implementation remains intentionally excluded.

### P2: page framing delays discovery and item cards reduce comparison density

With the default Compact chooser, none of the three modern catalogues shows
its first record in the initial 1280 × 720 viewport. The site header,
breadcrumb, large introduction, display controls, chooser, and selected-group
heading consume the first screen before the content begins.

Measured vertical position of the first record at the top of each default page:

| Catalogue      | Legacy, 1280 × 720 | Modern, 1280 × 720 | Modern, 390 × 844 |
| -------------- | -----------------: | -----------------: | ----------------: |
| Items: Sword   |             295 px |             863 px |          1,264 px |
| Craft: Lathe   |             184 px |             813 px |            914 px |
| Encrust: Lathe |             184 px |             846 px |            970 px |

The first Sword item is also approximately 429 px tall in the modern view
versus 174 px in legacy. Its description, facts, modifiers, and relationships
stack in one main column despite available desktop width. This makes comparing
several items slower. Craft and Encrust already use a responsive card grid;
their main shared problem here is the space preceding that grid. Encrust's
additional facts legitimately need more room than the incomplete legacy row.

Relevant implementation: `apps/web/src/app/globals.css`, especially
`.browse-header` at line 603, `.item-summary-card` at 1029,
`.item-summary-main` at 1091, and `.detail-page` at 2161; the catalogue headers
are composed in the three `*-catalogue-page.tsx` components.

Recommended slice: compact the catalogue introduction and repeated group
framing, then use desktop columns within item cards where useful. Retain all
modifier entries, readable labels, narrow-screen wrapping, and the chooser's
existing return control. The Compact/Detailed toggle currently controls the
chooser, not record density. Pagination is an intentional separate choice.

### P3: primary section navigation forgets the selected category or tool

Reproduction: select **Crafts → My Little Anvil Junior Smithing Kit**, select
**Items** in the primary navigation, then select **Crafts** again.

- Legacy returns to Smithing, with its 189 recipes.
- Modern returns to `/crafts/` and selects the Lathe, with 20 recipes.

The same implementation pattern affects Items and Encrusts: primary links in
`apps/web/src/app/layout.tsx:57–60` always target section roots. Stored display
preferences retain ordering/page size/chooser layout, not the last category
or tool. This costs repeat navigation when moving between related sections.

Recommended slice: preserve the last visited catalogue route per section, or
offer an explicit return-to-last-group action. Keep stable URLs and native
browser history. This finding concerns primary section links; it does not
claim that browser Back is broken.

### P3: ingredient and output images are inactive click targets

Legacy's Craft input/output and Encrust input images sit inside their reference
links. Modern renders `ReferenceArt` outside the adjacent item link in
`apps/web/src/components/catalogue-item-reference-list.tsx:64–81`. Clicking the
picture therefore does not open the item, although clicking its name does.

On the initial Lathe Craft page, the DOM contained 84 ingredient/output images
and zero images inside their item links. The initial Lathe Encrust page had
19 ingredient images, also with zero inside links. This affects the image-led
interaction that the chooser otherwise encourages.

Recommended slice: make each resolved reference's picture and name one
coherent link target, with a separate preview control. Avoid duplicate keyboard
stops and preserve plain text for unresolved references. This finding does not
apply to the large main item portrait, which was not a legacy reference link.

## Coverage and content checks

The running legacy app used the read-only local official overlay. Its rendered
DOM was compared with the ignored modern official artifact. Both use the local
`1.1.5 public_beta` baseline with all three expansions. The working tree was
clean at the beginning; the existing official static export was used for UI
inspection.

| Area           | Measured result                                                                                                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Items          | Legacy renders 763 records; modern has 764. Sorted names match after excluding the explicit modern Lockpick reference.                                                                                                    |
| Item groups    | Both have 32 groups. Modern moves The Log from generic Armour to Shield, separates Voodoo Globe and Satanic Locator into Macguffin, and includes Lockpick under Item. These explain the observed group-count differences. |
| Craft          | All 435 declarations match on tool, hidden status, ordered ingredients, and each ordered output's item, quantity, and source level.                                                                                       |
| Craft groups   | Both have Lathe 20, Grinder 28, Alchemy 57, Still 21, Ingot Press 21, Smithing 189, and Tinkerer 99.                                                                                                                      |
| Encrust        | All 58 declarations match on name, description, tool, hidden status, ordered ingredients, and source level.                                                                                                               |
| Encrust groups | Both have Lathe 7, Alchemy 12, Ingot Press 3, Smithing 20, and Tinkerer 16.                                                                                                                                               |

For a compact whole-set comparison, DOM-derived records and corresponding
artifact records were serialized as sorted tuples, preserving duplicate
declarations and repeated ingredients. Counts, string lengths, and FNV-1a
comparison fingerprints agreed:

| Comparison                     | Records | Serialized characters | Fingerprint |
| ------------------------------ | ------: | --------------------: | ----------- |
| Item names, excluding Lockpick |     763 |                13,074 | `a04286a3`  |
| Craft display tuples           |     435 |                42,985 | `81f2b683`  |
| Encrust display tuples         |      58 |                11,623 | `773bf479`  |

These are aggregate comparison fingerprints, not cryptographic artifact
verification or an exhaustive comparison of every modern rendered field.
Modern card components and representative live records were inspected as well:

- Crude/Rough Iron Sword retain ingredient groups and distinct recipe variants.
  Dwarven Army Sword exposes all seven modifiers, ordinary Quality 11, and the
  separate Artifact / Quality 3 declaration.
- Wand cards expose charge ranges and linked effects with trigger context.
  The Wand of Tesla recipe preview opens through keyboard activation. The
  Crude Iron Sword preview loads its ingredients/output and restores focus to
  its trigger after Escape and the close transition.
- Both Rocket Thrusters declarations appear in the Tinkerer Encrust group,
  with separate Hands/Feet applicability and their respective modifiers.
  Their repeated Aluminum Tube ingredients appear as `2 ×`.
- Encrust cards add applicability, instability, modifiers, and powers beyond
  the legacy list's description/hidden/ingredients/level display. Rune Weapon
  was checked live as a representative example.
- At 390 × 844, the three modern default pages did not produce document-wide
  horizontal overflow. Navigation has its own scrolling surface. This was a
  layout spot check, not a complete mobile accessibility audit.

## Intentional differences and limits

Stable routes, ordinary history, bounded pages with optional All views,
visible names, signed modifiers, native disclosure, and accessible maintained
popovers remain the modern direction. Do not restore numeric runtime hashes,
the all-record DOM, pointer-only cloned HTML, the legacy Encrust bare output
`×`, or the unsupported floor-targeting/recoverability inference. Hidden and
expansion icon polish remains separate from preservation of the visible facts.

Earlier navigation/tooltip and catalogue completion documents were used as
context, not proof. In particular, content reachability through a detail link
does not by itself settle quick-inspection or browsing-density parity. The
findings above propose further experience work without reversing the accepted
architecture or asserting additional game rules.

Legacy tooltip contents were traced through the committed implementation and
its rendered reference targets; pointer-hover rendering was not separately
automated in this review. No new application code or fixtures were added, no
game files were modified, and no generated official content or screenshots
were added to Git. Full build, unit, and browser suites were not rerun for this
documentation-only review; the previous validation remains in
`planner-cycle-recovery-evidence-2026-09-05.md`.

## Rechecking the findings locally

1. Run `pnpm.cmd dev:legacy` and `pnpm.cmd dev:official` in separate terminals.
   Compare legacy at `http://localhost:3002/` with modern at
   `http://localhost:3001/`.
2. At 1280 × 720, open Items, Crafts, and Encrusts at their default groups with
   Compact selected. Check how far down the first record begins, then compare
   the first Sword item's use of desktop width.
3. On Craft/Lathe, inspect an output wand and an ingredient through their image
   and name. Legacy exposes referenced item information on hover and navigates
   on image click; modern currently requires the name link and a detail visit.
4. Repeat Smithing → Items → Crafts using the primary section navigation.
   Legacy retains Smithing; modern currently resets to Lathe.
5. On modern Items, open a recipe with its eye control, use Tab within it, then
   Escape. It should close and return focus to the trigger. Future item previews
   should also work by keyboard and tap, preserve their full-detail links when
   preview loading fails, and remain usable at 390 × 844.

Suggested implementation order: item previews on Craft/Encrust; shared header
and desktop item-density polish; section return context; separately bounded
spell previews. Include reference-image linking with the first preview slice.

## Follow-up implementation

The first owner-approved slice implements item previews on full Craft and
Encrust catalogue references and makes their artwork part of the item link.
See [`item-reference-previews-evidence-2026-09-08.md`](item-reference-previews-evidence-2026-09-08.md)
for current behavior, validation, and manual steps. The findings and reproduction
steps above describe the reviewed `caef089` baseline. Density, section return
context, and item-effect spell previews remain open; nested popovers inside
recipe/encrustment previews are intentionally excluded from this first slice.

The 2026-09-28 catalogue framing and item-density follow-up is recorded in
[`catalogue-density-evidence-2026-09-28.md`](catalogue-density-evidence-2026-09-28.md).
Section return context and item-effect spell previews remain open.
