# Encrust catalogue parity evidence

Date: 2026-08-24
Status: implemented and validated

## Purpose

The generic Browse and advanced Search routes already exposed every normalized
encrustment, but they did not preserve the preserved application's direct,
image-led toolkit browsing. This slice adds a player-facing Encrust catalogue
without replacing either exhaustive route or the existing planner and detail
pages.

## Preserved behavior reviewed

`legacy/index.html` presents Encrust as toolkit tabs followed by Description,
Hidden Recipe, Inputs, and Output columns. `legacy/js/encrust.js` groups records
by numeric toolkit identity and retains source order within each group. The
tool definitions in `legacy/js/helper.js` establish the familiar order:
Lathe, Grinder, Alchemy, Still, Ingot Press, Smithing Kit, and Tinkerer Parts.
Only tools with records appear in the active view.

The modern catalogue therefore keeps the used subset of that order and
preserves source/XML order as its default. It does not copy runtime numeric
hashes, tab-only state, table markup, or pointer-dependent behavior.

## Canonical measurement

The ignored, verified `1.1.5 public_beta` artifact contains 57 encrustments:

| Toolkit tag | Records |
| ----------- | ------: |
| `lathe`     |       7 |
| `alchemy`   |      12 |
| `ingot`     |       3 |
| `smithing`  |      20 |
| `tinkerer`  |      15 |

Seven records are hidden. Declared source levels span 0–6, and declared
instability values span -5–40. These are source facts only: the dataset does
not establish a complete instability probability or final applied-item
formula.

All five representative toolkit records and every resolved ingredient already
participate in the bounded item asset slice. The follow-up applicability-art
review identified an exact closed set of 11 official 64 x 64 Encrust interface
icons. Their semantic UI IDs map the normalized `neck`, `chest`, `waist`,
`feet`, `ranged`, `hands`, `head`, `legs`, `ring`, `shield`, and `weapon` tokens
to the corresponding amulet, armour, belt, boots, crossbow, gauntlets, helm,
pants, ring, shield, and weapon images. The importer copies only these newly
displayed files into the checksum-bound, ignored presented-asset set.

### Preserved orphaned output marker

The preserved Encrust table shows a bare `x` in every Output cell. This is not
a quantity or mechanic. `legacy/index.html` reused the Craft output template,
which prints an amount, the literal multiplication marker, and an item, while
`legacy/js/encrust.js` creates Encrust output objects containing only stats.
The undefined amount and item render empty and leave the literal marker behind.
The modern catalogue deliberately does not reproduce this rendering defect.

## Implemented behavior

- `/encrusts/` opens the first used toolkit in familiar order.
- `/encrusts/tool/<tool>/` gives every used toolkit a stable static route.
- The complete toolkit group is the default, preserving the useful unpaginated
  legacy behavior. Optional 12, 24, and All page sizes plus game, name,
  required source-level, and declared-instability orders use explicit static
  URLs.
- Compact toolkit icons are the default. A Detailed view exposes every toolkit
  name; the selected tab progressively becomes the same upper-right return-to-
  chooser control used by Items and Crafts after its chooser scrolls away.
  Without JavaScript it remains an ordinary selected link.
- Toolkit navigation and ingredient rows are shared maintained components, not
  separately styled lookalikes. Craft behavior remains covered by its existing
  regression tests.
- Summary cards show exact ingredient quantities and art, applicable slots,
  nonzero required source levels, instability, direct stat modifiers, power
  hooks, Hidden state, and source marker. A zero level is omitted instead of
  repeating the redundant `Requires / No requirement` pair. Required levels use the same compact
  tool-to-stat icon and number treatment as Craft outputs. Instability uses the
  native 16-by-16 Encrusting interface icon with the exact signed source value;
  neither the concise wording nor icon implies a probability or complete risk
  formula. Modifier names retain their readable text
  beside the verified stat icons. Repeated
  ingredient declarations are aggregated only for catalogue presentation;
  unit quantities remain visually omitted and detail records are unchanged.
- Source `<encrustwith>` descriptors are deliberately omitted from generic
  catalogue cards because they do not help compare recipes. Detail pages retain
  the exact ordered values under the source-facing label **Encrusted with**.
- Applicable slots use the exact manifest-declared blue schematic icon beside
  a visible label in both catalogue summaries and detail pages. Images carry
  semantic title text; synthetic datasets or an unavailable verified icon fall
  back to the same readable text instead of inventing or exposing a raw path.
- Selected-tool cards suppress redundant per-card toolkit identity because the
  selected/floating tab retains that context. Advanced Search and the
  encrustment planner remain explicit actions.
- Encrust detail breadcrumbs return through the matching toolkit route, and
  primary navigation now opens `/encrusts/`. Generic Browse remains available
  as the exhaustive fallback.

### Item relationship completion

- Item catalogue and detail relationships use the same accessible
  hover/focus/tap preview interaction for recipes and encrustments while
  retaining their ordinary direct links. Escape closes a preview and restores
  focus to its trigger.
- **Crafted from** omits redundant unit quantities and recipe-name rows. Each
  complete ingredient group is the hover target for its recipe option, with
  one adjacent eye control for focus, touch, and keyboard access to the same
  maintained recipe card used by **Used to craft**.
- Bounded catalogue cards no longer replace undisplayed relationships with a
  passive `+N more` message. Native disclosure controls reveal every remaining
  crafted item or encrustment in place without JavaScript. Every disclosed
  relationship retains its art, direct full-detail link, and the same popover
  preview as the initially visible rows. When expanded, the Hide control is
  visually ordered after those rows instead of splitting the list. Explicit
  down/up chevrons describe the Show and Hide actions consistently. The native
  disclosure remains preferable to a JavaScript-only Collapsible primitive for
  this static-catalogue fallback.
- **Used to encrust** uses the maintained Encrust summary card. Its compact
  relationship identity shows every declared applicability icon as a small
  overlapping stack rather than selecting an arbitrary representative.
  Fireproof Coating therefore shows its chest, hands, and legs icons, and the
  preview spells out all three labels. The measured canonical maximum is four
  applicability slots.
- Item detail **Crafted by** and **Used to encrust** relationships use the same
  previews, so the catalogue and detail surfaces no longer diverge.

## Interpretation boundaries

The page preserves the familiar tool-to-stat presentation association from the
reference application; that association is not derived from the encrustment
XML. It does not interpret dual icons as AND or OR, apply modifiers to an item,
combine repeated modifiers into a final result, calculate instability risk,
assign shared instability effects to a record, or infer engine runtime
behavior. It labels exact declarations and links normalized entities only.

## Validation

- Focused Craft/Encrust catalogue tests cover familiar
  toolkit order, source ordering, alternate static views, optional pagination,
  route-collision rejection, repeated-input aggregation, and all 11 exact
  normalized-slot-to-UI-asset mappings. Craft tests also cover the exact
  seven-tool source-stat order and unknown-tool fallback. Manifest tests additionally prove that
  the prior three-icon local manifest migrates to the closed current set and
  that unexpected mappings still fail.
- `pnpm check` passes formatting, lint, type checking, all 321 workspace tests,
  deterministic generation, and the 240-page synthetic static export.
- `pnpm test:e2e` exports 240 synthetic pages and passes all 78 desktop/mobile
  Playwright cases. Coverage includes JavaScript-disabled browsing, keyboard
  links, responsive overflow, persisted compact/detailed settings, the drawer,
  focus restoration, per-output source-level fallback, and representative axe
  scans.
- `pnpm build:official` regenerates the canonical artifact and presented assets
  byte-identically with 0 errors, 4 warnings, 74 informational records, 1,867
  mappings to 1,555 files, and 0 asset fallbacks. The full local export contains
  3,658 pages, including all 57 detail routes, five toolkit routes, and 63
  optional Encrust view routes.
- The relationship-heavy Reagent item category measures about 1.77 MB for its
  default 36-item page and 2.05 MB for its explicit All view. This deliberately
  includes preview data for every overflow relationship so expansion does not
  produce a reduced-functionality list.

## Next parity slice

Continue with image-led Skills and Abilities progression summaries. Keep
Hidden/expansion iconography and broader detail-page disclosure as later polish
decisions informed by the completed catalogue surfaces.
