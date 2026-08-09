# Stat reference catalogue evidence

Date: 2026-08-09
Scope: canonical `1.1.5 public_beta` modifier names, exact selector linking,
portable source-manifest integration, static stat routes, and backlinks

## Source finding

The measured canonical installation declares modifier values throughout item,
skill, spell, encrustment, and monster databases but contains no standalone
`statDB.xml`. The preserved application instead hardcodes a stat table in
`legacy/js/dredmor-stat.js`; that table mixes factual selector mappings with
tooltip prose, icon identifiers, and derived-stat formulas. It is behavioral
evidence, not official XML provenance or a safe source to copy wholesale.

Existing read-only evidence verifies all 16 named damage keys and the six
primary ID mappings. Canonical entity measurement covers secondary IDs 0-14
and 16–23; the preserved behavior establishes the remaining ID 15 mapping.
The owner approved a project-authored names/categories-only catalogue and
explicitly excluded legacy prose, icons, and formulas from it.

## Implemented boundary

ADR 0005 introduces
`reference-data/dredmor-1.1.5-public-beta/statDB.xml` version `1.0.0` with 62
unique selectors:

- 16 damage keys;
- 16 matching resistance keys;
- 6 primary numeric IDs; and
- 24 secondary numeric IDs.

The source manifest accepts a distinct `reference` source kind. The canonical
ignored manifest is upgraded idempotently before every official generation
command and records the catalogue's independent version/provenance. Its
`rootBase: "repository"` path remains traversal-checked and real-path-contained
without embedding a machine-specific absolute path. Reference roots are never
used for entity-asset fallback probing.

A stat definition may declare one exact modifier selector. Linked modifiers
retain their original kind, key, and amount and add only `statId`; missing
definitions stay valid and raw, while duplicate selectors are errors and remain
unlinked. The web boundary independently checks that each `statId` exists and
matches the modifier's exact selector.

Stat-aware modifier labels now link from item, encrustment, ability, spell, and
monster pages to the canonical stat route. Stat pages expose reciprocal
backlinks, exact selector metadata, separate catalogue provenance, and an
explicit no-formula statement. Datasets without definitions retain their
existing unavailable state.

## Canonical measurement

The ignored deterministic canonical import produces:

- 62 stat definitions and 2,829 canonical search documents;
- 4,309 modifier declarations, all linked by exact selector;
- 61 selectors used by active entities, with only `secondary:15` present as a
  verified but currently unused catalogue mapping;
- 506 items, 55 encrustments, 217 abilities, 223 spells, and 183 monsters with
  at least one linked modifier;
- 0 errors, the existing 4 dangling-reference warnings, and 90 informational
  records; and
- a 2,980-page static local export, including canonical and source-ID alias stat
  routes.

These aggregate measurements do not authorize publication of the ignored
official artifact.

## Validation

- `pnpm.cmd check` passes formatting, lint, all type checks, 246 unit/artifact
  tests, byte-identical synthetic generation, and the 43-page synthetic export.
- `pnpm.cmd generate:official:check` is byte-identical with 763 items, 2,829
  search documents, 0 errors, 4 warnings, 90 info records, 763 mapped item icons,
  722 copied PNG files, and no asset fallbacks.
- `pnpm.cmd build:official` exports all 2,980 ignored local pages.
- `pnpm.cmd test:e2e` passes all 36 desktop/mobile keyboard, responsive, and axe
  cases, including stat reference metadata and backlinks.
- Focused safety coverage rejects repository-root traversal. The first
  canonical attempt correctly rejected an upward relative path before reading
  the catalogue; the final contract uses the explicit contained repository
  base instead of weakening the path guard.

## Remaining boundary

This work names and connects source selectors. It does not establish Life,
Mana, secondary-stat, damage, armour, scaling, or other engine formulas. Those
mechanics remain separate evidence decisions immediately before their parity
implementation. A future game version must verify catalogue compatibility and
version it intentionally rather than inheriting this mapping automatically.
