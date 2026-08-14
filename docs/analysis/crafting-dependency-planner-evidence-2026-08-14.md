# Crafting dependency planner evidence

Date: 2026-08-14
Status: implemented first Phase 5 crafting slice

## Product brief

The first differentiating tool answers one bounded question: **what source-declared crafting steps and base ingredients are needed to produce a requested quantity of an item?** It is available at `/tools/crafting-graph/` and from the **Plan ingredients** link on craftable item pages.

This slice covers ordinary crafting recipes. Encrustments were deliberately
deferred because they have different input/output semantics and should not be
forced into the recipe calculation without a separate contract; that follow-up
is now implemented and linked under **Next boundary** below.

## Source and data contract

Recipe outputs now preserve the `skill` value from each individual XML output declaration as `skillLevel`. The existing recipe-wide `skillLevel` remains the maximum declared output skill and is labeled **Highest source skill**; it is a summary, not an eligibility rule.

The canonical `1.1.5 public_beta` dataset contains:

- 374 recipes and 588 resolved output declarations;
- 394 distinct craftable items;
- 99 craftable items with more than one declared output choice; and
- source output skill values from 0 through 8.

Multiple declarations for the same item are not summed. The planner asks the user to select the exact declaration to use and retains that choice in the URL. This preserves the measured source without claiming how the game engine chooses a yield or whether a character is eligible for it.

## Calculation contract

The framework-independent domain planner:

1. resolves the selected output declaration for each craftable dependency;
2. combines shared demand before rounding recipe runs;
3. rounds runs upward by the selected output amount;
4. reports produced surplus;
5. emits dependency-ordered crafting steps;
6. aggregates resolved base items and unresolved source labels separately; and
7. stops with an explicit cycle state instead of returning a misleading list.

The planner does not infer inventory, found loot, reuse of surplus from another calculation, byproducts, recipe discovery, skill eligibility, ingredient consumption timing, or any other engine rule. These can be considered only through separate evidenced product decisions.

## URL and interaction contract

The tool uses deterministic, dataset-local query state:

- `item=<canonical-item-slug>` selects the target;
- `quantity=2..999` selects a quantity, while 1 is omitted; and
- repeated `choice=<item-slug>~<recipe-slug>~<output-index>` parameters preserve exact yield selections.

Unknown choice tokens and invalid quantities are removed. An unavailable target slug remains visible as a dataset-specific error so a stale shared link explains why it cannot be calculated. Rapid changes compose from the latest pending URL state rather than overwriting earlier choices.

The interface uses native labeled selects and a number input, remains keyboard-operable, stacks into a single column on narrow screens, and has no horizontal overflow. The primary navigation and item details link to the tool; recipe and item names in the results retain stable detail routes.

## Validation

- Pure domain tests cover demand aggregation before rounding, exact yield choices, unresolved ingredients, cycles, and invalid requests.
- Web tests cover runtime rejection of output declarations without `skillLevel` and rapid URL-choice composition.
- Desktop/mobile Playwright coverage exercises item-to-tool keyboard navigation, quantity and yield selection, URL reload persistence, stale-URL cleanup, responsive overflow, and axe checks.
- `pnpm check` passes deterministic synthetic generation and the 47-page export.
- `pnpm test:e2e` passes all 46 desktop/mobile browser cases.
- `pnpm build:official` passes byte-identical canonical generation with 0 errors, 4 warnings, and 90 informational records, followed by the complete 2,983-page local export. The official artifact is 9,322,713 bytes; the compact search artifact remains 1,185,026 bytes.
- A separate in-app browser pass verified the official A Mirror Darkly Shield dependency chain at desktop and mobile widths, shareable multi-choice URL composition, no horizontal overflow, and no console errors.

## Next boundary

This boundary was completed in the separately modeled encrustment planner; see
`docs/analysis/encrustment-dependency-planner-evidence-2026-08-14.md`. The
implementation reuses presentation and URL conventions while keeping
application inputs, applicability, and instability distinct from an ordinary
crafted output.
