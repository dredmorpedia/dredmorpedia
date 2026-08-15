# First-parity completion review

Date: 2026-08-11
Status: complete

## Scope

This review checks the first-parity statement against the implemented local
`1.1.5 public_beta` product after completion of the measured compatibility
backlog. It closes an evidence-based engineering milestone; it does not approve
public publication, infer engine mechanics, or decide the preserved Meta
formula.

## Result

The first-parity milestone is complete. The implementation satisfies the
documented local item, stat, provenance, search, crafting, encrustment, skill,
ability, spell, targeting-template, monster, browse, and dataset-health surface.
The final measured compatibility set contains no unsupported item, spell-child/
effect, spell-requirement, root-spell, skill/ability, or monster child
declaration. The ignored canonical import retains only four deliberate
relationship warnings and 90 informational review records.

This conclusion remains valid as an engineering/content milestone: the data
contracts, entity coverage, relationships, routes, and validation gates are
complete for its stated scope. A later player-experience review on 2026-08-15
found that generic Browse and advanced Search did not preserve enough of the
legacy site's direct, image-led discovery. Experience parity is therefore
reopened separately; it does not invalidate the compatibility measurements in
this review. See
`docs/analysis/legacy-experience-parity-review-2026-08-15.md`.

The review found one documentation omission: the functional acceptance list did
not explicitly cover targeting-template pages or all completed root spell
families. The statement now includes:

- static targeting-template routes, strict three-character grids, accessible
  summaries, responsive previews, provenance, and reciprocal spell links; and
- root radius, cooldown, melee-attack, mine, item-consumption, wand, self,
  no-animation, and targeting-template declarations with their explicit
  no-inference boundaries.

No application or generated-artifact contract changed in this review.

## Validation

- `pnpm check` passes formatting, lint, type checking, all 263 unit/artifact
  tests, deterministic synthetic generation, and the 44-page static export.
- `pnpm test:e2e` passes all 38 desktop/mobile browser cases, including
  JavaScript-disabled discovery, keyboard targeting-template navigation,
  responsive flows, and the representative axe sweep.
- `pnpm build:official` produces byte-identical ignored official artifacts with
  0 errors, the expected four relationship warnings, 90 informational review
  records, 763 item-icon mappings with no fallbacks, and all 2,981 local static
  pages.
- `git diff --check` passes, and Next's generated type shim is restored to the
  repository's development form after the builds.

## Evidence used

- `docs/product/first-parity-slice.md`
- `docs/analysis/spell-targeting-template-evidence-2026-08-11.md`
- `docs/analysis/spell-cooldown-evidence-2026-08-11.md`
- `docs/analysis/spell-melee-attack-evidence-2026-08-11.md`
- `docs/analysis/spell-mine-declaration-evidence-2026-08-11.md`
- `docs/analysis/spell-item-consumption-evidence-2026-08-11.md`
- `docs/analysis/spell-wand-flag-evidence-2026-08-11.md`
- `docs/analysis/spell-radius-evidence-2026-08-11.md`
- `docs/analysis/spell-root-self-flag-evidence-2026-08-11.md`
- `docs/analysis/spell-root-no-animation-evidence-2026-08-11.md`
- `docs/analysis/dataset-health-and-source-decisions-evidence-2026-08-09.md`
- `docs/analysis/search-response-budgets-evidence-2026-08-09.md`

## Follow-up boundaries

1. Discuss the preserved Meta view's “Required Armour by Monster” heuristic
   immediately before implementing or intentionally excluding it. Its formula
   must not be presented as engine truth by assumption.
2. Public official-content release remains separately blocked on documented
   permission and licensing scope.
