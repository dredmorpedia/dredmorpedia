# Item reference previews

Started: 2026-09-08

Validation date: 2026-09-10
Status: implemented and validated

The owner approved proceeding from the independent Items/Craft/Encrust review.
This slice restores quick item inspection from the full Craft and Encrust
catalogues, and makes reference images part of their adjacent item links.

The existing maintained popover interaction is reused. Item summaries are
generated from the verified artifact at `/item-previews/<slug>/summary.json`.
Only the requested item is fetched, concurrent and later requests share a
validated result, and failures can retry. Existing recipe/encrustment payloads
remain separate. No raw XML, origin asset paths, or complete item records cross
this client boundary.

Previews retain all direct/named modifiers, positive armour random-stat
declarations, value, quality, distinct artifact quality, recovery, wand-charge,
and positive floor-target facts. Descriptions are bounded to 240 characters and
effects to two declarations, with an explicit remaining-effect count and
full-detail link. Engine references keep their visible label and unavailable
facts. Main Items catalogue cards are unchanged.
Reference links also work inside existing recipe/encrustment previews, but do
not create another layer of popovers there.

## Interaction corrections

The new touch regression reproduced a shared interaction defect: after opening
and closing one item, tapping another occurrence with a cached summary could
open on focus and immediately toggle closed on click. The pointer-focus guard
now lasts through the complete press instead of ending on a zero-delay timer.
Escape still restores focus without reopening; mouse hover leaves keyboard
focus unchanged. Existing recipe/encrustment preview flows use the same fix.

Linked reference art is decorative to accessibility APIs, so the adjacent name
labels the link once. Quantity remains alongside that link, and output source
levels stay attached to their output tier. Preview width uses the popover's
available-width value, respecting collision padding and non-overlay scrollbars.
Relationship popups also shift on both axes to remain within that boundary;
flipping sides alone could clip the largest item when its trigger was near
mid-screen. Items with no modifiers omit the empty stat section.

## Automated validation

- `pnpm.cmd check`: formatting, lint, TypeScript, 368 unit/artifact tests, and
  deterministic synthetic generation plus the 261-entry static build pass.
- The focused item-summary, item-loader, and existing catalogue-loader suite
  passes 33 tests. Coverage includes all modifiers, separate artifact quality,
  engine references, bounded descriptions/effects, malformed nested data, route
  identity, concurrent/shared requests, and retry after network/HTTP/JSON errors.
- `pnpm.cmd --filter @dredmorpedia/web exec playwright test --workers=4`: 101 pass;
  the desktop-only hover case is intentionally skipped on mobile. New cases cover desktop hover, keyboard and touch, loading,
  malformed-response recovery, failed-request detail fallback, cached repeated
  outputs, Escape focus restoration, popup bounds, axe, and no-JavaScript
  picture/name links. Existing quantity checks now locate the ingredient group
  and exact quantity separately because artwork lies between quantity and name.
  Existing search tests wait for categories to become enabled and for reset
  results to render before using the next control; URL updates alone could
  precede those states and cause intermittent keyboard-test failures.
- `pnpm.cmd build:official`: deterministic official generation preserves 764
  items, 2,892 search documents, zero errors, four known warnings, and 74 info
  records. The build generates 4,496 entries, including 764 static item-summary
  responses. Assets remain 1,868 mappings to 1,556 files with zero fallbacks;
  this slice introduces no additional official asset inputs.

All 764 exported summaries were parsed with the runtime schema and checked
against their matching official item identity, complete modifier count,
effect/remaining-effect count, and engine-reference status. All 2,441 included
item/stat/spell icon references resolve to exported files. An ignored local
measurement script reads generated output only; no proprietary payload is
included in this record.

| Per-item JSON bytes  |    Size |
| -------------------- | ------: |
| Minimum              |     391 |
| Median               |     936 |
| 95th percentile      |   2,149 |
| Maximum              |   3,564 |
| Complete set on disk | 817,421 |

The largest response is Imperial Clockwork Helm, retaining all 12 modifiers.
The complete set is not transferred on catalogue load: the browser requests
only the interacted item and reuses its validated result during that visit.

## Manual verification

The final official export was inspected at 1280 × 720 and 390 × 844.
Wand of Tesla shows its exact 5–6 charge range and linked effect; clicking its
reference picture navigates to the item detail. Rune Weapon's Dark Orb
ingredient opens an item summary with all six modifiers. The largest preview,
Imperial Clockwork Helm, retains all 12 modifiers and its full-detail link.
At phone width that popup measures 351 × 414.25 px, from x=12 to x=363 and
y=403 to y=817.25 within a 375 × 829 usable viewport. It has no internal
scrollbar, and its full-detail link successfully opens the item. The empty
modifier section is absent from the wand preview. Reference links have one
accessible name after hiding their decorative artwork from accessibility APIs.

Run `pnpm.cmd dev:official` and open `http://localhost:3001/`.

1. Open `/crafts/` and preview **Wand of Tesla** using the eye button. Expect
   its item art, Value 3,500, Quality 0, 5–6 charges, and **Voltaic Empowerment
   when zapped**. Escape should close it and restore focus to the eye; clicking
   the reference picture or name should open `/items/wand-of-tesla/`.
2. Open `/encrusts/`, find **Rune Weapon**, and preview an ingredient. Expect an
   item summary without leaving the Encrust catalogue. The ingredient picture
   and name form one link; the eye is a separate keyboard/tap control.
3. At `/crafts/tool/tinkerer/view/game/all/1/`, preview **Imperial Clockwork
   Helm**. All 12 modifiers should remain visible, including negative values.
4. Repeat at 390 × 844. The popup should stay inside the usable viewport with
   no internal scrollbar. Check a second preview after closing the first.
5. For repeatable failure testing without a game installation, run
   `pnpm.cmd test:e2e`. The item-preview cases intercept unavailable/malformed
   responses and check the visible detail fallback, retry, and restored focus.

## Remaining scope

Catalogue framing/item density, section return context, and item-effect spell
previews remain separate follow-ups from the independent review. Existing
recipe/encrustment popups intentionally offer direct item links without another
layer of popovers. Raw XML parsing, game files, and content publication are
outside this slice.

At 390 × 844 in the Windows browser with ordinary scrollbars, the unchanged
site header extends about 14 px beyond the 375 px content area. The catalogue
cards and corrected popups fit; include the header overflow in the next framing
and density slice rather than treating this spot check as whole-page mobile
parity.
