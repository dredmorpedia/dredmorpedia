# Stat icon parity evidence

Date: 2026-08-24
Scope: canonical stat-to-icon mapping, local presented-asset import, and Items
catalogue/detail presentation

## Preserved behavior and source verification

The preserved application renders each normalized modifier as its stat icon
followed by the amount. `legacy/js/dredmor-stat.js` supplies one icon identifier
for every damage, resistance, primary, and secondary selector, and
`GetTypeImageHtml` resolves those identifiers under `data/ui/icons/` while
putting the visible stat name in the image title.

This table was used only as bounded behavioral evidence. A read-only check of
the canonical `1.1.5 public_beta` base-game UI directory verified every mapped
PNG:

- 16 damage icons;
- 16 resistance icons;
- 6 primary-stat icons; and
- 24 secondary-stat identities.

All 62 identities resolve. They occupy 61 unique 16×16 PNG files because the
preserved behavior intentionally assigns `stat_wandburn.png` to both Wand
Affinity (`secondary:15`) and Wand Crafting (`secondary:23`). The measured
source spellings `dmg_aphyxiative`, `dmg_necromatic`, and `stat_stubborness`
are filename facts only; Dredmorpedia retains its corrected visible stat names.

## Implemented contract

ADR 0005 is amended and the tracked stat reference is version 1.1.0. Each of
its 62 records carries a closed project-owned `iconAssetId`; it still contains
no legacy prose, derived formula, official file path, or asset bytes. The
ignored official manifest maps those IDs to the verified base-game paths.

The existing page-driven asset importer captures those files from its first
registered read, validates them as PNGs, writes only the managed ignored asset
directory, and includes them in the checksum-bound asset catalogue. A
configured web asset set is rejected when an active stat requests an icon ID
that its manifest does not declare. Unreviewed XML or generated-artifact icon
IDs are also rejected.

The UI uses one shared stat-link component:

- Item catalogue cards show the familiar native 16×16 icon plus the
  signed value. The stat name remains the link's accessible name and native
  title, so the image-led compact view does not become an unnamed control.
- Item details retain visible stat names and add the same icon before each
  linked modifier.
- Stat detail headers show the icon beside the visible stat name.
- Encrustment summaries and details add icons without removing their visible
  modifier names. Their required source level uses the familiar crafting-stat
  icon associated with the selected toolkit.
- Recipe output tiers put the relevant 16×16 crafting-stat icon immediately
  beside each declared level in a leading requirement column, before the
  bordered output item. This keeps requirements attached to the outputs they
  qualify without making output item blocks taller than ingredient blocks or
  repeating the aggregate maximum in the recipe header. Base outputs omit a
  redundant `No requirement` label.
- A dataset without the reviewed identity or configured asset keeps its
  visible text label rather than rendering a broken image.

The display keeps the original 16×16 size used by the game and preserved
application. Its surrounding link retains a larger keyboard/touch target
without scaling the artwork.

## Crafting source-stat presentation

The preserved Craft and Encrust renderers attach the following stat identities
to each tool before displaying the source level:

- Lathe: Wand Crafting;
- Grinder: Alchemy, then Tinkering;
- Alchemy and Still: Alchemy;
- Ingot Press: Smithing, then Tinkering;
- Smithing Kit: Smithing; and
- Tinkerer Parts: Tinkering.

Dredmorpedia preserves this order as presentation compatibility. Where two
icons are present it repeats the declared level beside both, as the preserved
view did, but does not label them AND or OR and does not infer an engine
eligibility formula. Unknown tool tags keep their explicit textual source
level rather than receiving a guessed stat.

## Canonical measurement

`pnpm generate:official:check` passes deterministically with:

- 764 items, 62 stat definitions, and 2,830 search documents;
- all 62 stat icon identities declared and imported;
- 1,867 presented-asset mappings to 1,555 unique files;
- 0 presented-asset fallbacks; and
- 0 dataset errors, 4 deliberate warnings, and 74 informational records.

The repository-wide `pnpm check`, the complete 3,658-page
`pnpm build:official`, and all 78 desktop/mobile `pnpm test:e2e` cases also
pass with this contract active.

These ignored official assets remain local-only and are not authorized for
publication by this implementation.

## Remaining boundary

The icon mapping improves recognition and legacy experience parity. It does
not import the preserved tooltip prose, validate gameplay formulas, or imply
that identical art means identical mechanics. Reuse on other entity summary
surfaces can follow the same shared component as those catalogues receive
their own parity polish.
