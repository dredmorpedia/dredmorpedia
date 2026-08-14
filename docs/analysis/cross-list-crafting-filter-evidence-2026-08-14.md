# Cross-list crafting filter evidence

Date: 2026-08-14

## Product boundary

This Phase 5 slice adds the first rich domain-specific filter shared by more
than one entity list. Recipes and encrustments can be searched together under
the **Recipes and encrustments** scope and bounded by their exact declared
source skill.

The bound is inclusive. It does not infer a player character, learned skills,
tool availability, inventory state, hidden-recipe discovery, application
eligibility, runtime success, or any other engine rule. Project-authored views
are ordinary search URLs; this slice introduces no browser storage, account,
custom-list, or synchronization policy.

## Generated contract and query behavior

- Search schema 3 adds nullable `craftingSkillLevel` to every deterministic
  search document. Recipe and encrustment documents carry the normalized
  non-negative source value; all other entity kinds carry `null`.
- The pure domain query accepts an inclusive maximum crafting-skill level and
  excludes documents without that field.
- `kind=crafting` maps deterministically to the existing recipe and
  encrustment entity kinds. Compatible crafting-tool categories continue to
  work across both kinds.
- `maxSkill` accepts only non-negative levels present in the active verified
  artifact. Invalid values and values paired with incompatible single-entity
  scopes are removed from the URL.
- The Browse and Search routes expose **All crafting** and **Crafting through
  skill 2** as project-owned starting views. Their ordinary URLs remain
  editable, bookmarkable, and shareable.

## Canonical measurement

Read-only inspection of the ignored `1.1.5 public_beta` artifact found 431
crafting records: 374 recipes and 57 encrustments. Recipe source-skill levels
span 0 through 8; encrustment source-skill levels span 0 through 6. The
cross-list level-2 view matches 165 records and its first bounded page includes
both entity kinds.

The compact 2,829-document search artifact is 1,263,752 bytes uncompressed,
199,369 bytes with gzip level 9, and 145,019 bytes with Brotli quality 11. No
official record, generated artifact, asset, or local path was added to tracked
output.

## Validation

- `pnpm.cmd check` passes formatting, lint, type checking, 298 unit/artifact
  tests, byte-identical synthetic generation, and the 48-page synthetic static
  export.
- `pnpm.cmd test:e2e` passes all 52 desktop/mobile Chromium cases. Coverage
  follows the reusable Browse link, checks both kinds, changes the source-skill
  bound by keyboard, verifies stale-state cleanup and responsive behavior, and
  retains the representative axe sweep.
- `pnpm.cmd benchmark:search:official` passes deterministic canonical
  generation with 0 errors, 4 warnings, and 90 informational decisions, the
  complete 2,984-page static export, and every accepted artifact, parse,
  ordinary-query, suggestion, desktop, and 4x-CPU mobile budget.
- Manual synthetic verification confirmed the level-2 view, keyboard
  refinement to level 1, URL restoration, the single expected result, no
  positive horizontal overflow at 390 by 844 pixels, and no console warnings
  or errors.
- Manual canonical verification found 165 matching records at level 2 or
  lower; the first 50 contained 23 encrustments and 27 recipes with only source
  skill values 0, 1, or 2, and no console warnings or errors.

## Next boundary

The roadmap's first reusable cross-list filter use case is complete. Additional
numeric fields should be introduced only when a concrete cross-entity question
defines their semantics. The next recommended Phase 5 slice is side-by-side
comparison and build planning with shareable URLs.
