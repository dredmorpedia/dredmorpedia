# Encrustment dependency planner evidence

Date: 2026-08-14

## Scope and semantics

This Phase 5 slice extends the ingredient-planning product to encrustments
without representing an encrustment as a crafted item. An application has its
own declared ingredients, source tool and skill, applicable equipment slots,
and signed instability value. The planner multiplies those inputs by an
explicit application count and recursively expands only the resolved ingredient
items through ordinary recipe declarations.

The calculation does not choose or count equipment to receive an encrustment,
inspect inventory, reuse surplus, infer application eligibility or behavior, or
derive an instability formula or outcome. Those facts are not present in the
normalized application contract.

## Canonical measurement

Read-only inspection of the ignored `1.1.5 public_beta` artifact found:

- 57 active encrustments;
- 190 ingredient declarations, all resolved to normalized items;
- 47 encrustments with at least one craftable ingredient;
- 131 craftable ingredient declarations; and
- 11 declared equipment-slot types.

No official record or asset was copied into tracked output.

## Implementation

- `packages/domain/src/crafting-plan.ts` now exposes a multi-root requirements
  calculation. It combines demand shared by separate application ingredients
  before rounding recipe runs while preserving the existing single-target
  crafting API.
- `packages/domain/src/encrustment-plan.ts` aggregates direct application
  inputs, multiplies them by the selected application count, retains unresolved
  source labels, and delegates resolved items to the multi-root recipe graph.
- Exact alternative recipe outputs remain user-selected source declarations.
  Selected tiers remain visible and editable after calculation in both tools.
- `/tools/encrusting-plan/` provides deterministic dataset-local URL state for
  the encrustment, application count, and repeated yield choices. Invalid
  quantities and unknown choice tokens are removed, while stale encrustment
  links receive an explicit recovery state.
- Encrustment detail pages and primary navigation link to the planner. The
  shared result component keeps crafting and encrusting step, cycle, choice,
  unresolved-reference, and shopping-list presentation aligned.

No generated schema, publication route registry, source policy, or asset scope
changed.

## Validation

- `pnpm.cmd check` passes formatting, lint, type checking, 292 unit/artifact
  tests, deterministic synthetic generation, and the 48-page synthetic export.
- `pnpm.cmd test:e2e` passes all 50 desktop/mobile Chromium cases, including
  keyboard navigation from an encrustment detail, quantity and yield changes,
  URL restoration, stale-state cleanup, responsive overflow, and representative
  axe scans.
- `pnpm.cmd build:official` deterministically regenerates the ignored canonical
  artifact with 0 errors, 4 warnings, and 90 informational decisions, then
  exports all 2,984 local pages.
- Manual synthetic verification confirmed direct and unresolved inputs,
  application multiplication, editable yield selection, rounded recipe runs,
  surplus, URL restoration, and a combined shopping list without browser
  warnings or errors.
- Manual canonical verification completed a two-application plan with two
  explicit ingredient-yield selections and a combined base shopping list,
  again without browser warnings or errors.

## Next boundary

The expanded crafting/encrusting dependency milestone is complete. The next
recommended Phase 5 slice is rich cross-list filtering and reusable filter
views; it needs a bounded product brief and URL contract before implementation.
