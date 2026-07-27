# Static browse and no-JavaScript discovery evidence

Date: 2026-07-27

## Scope

This slice adds a server-rendered `/browse/` directory and a paginated
catalogue for every generated entity kind. The catalogue paths use
`/browse/<plural-kind>/<page>/`, link directly to static detail routes, and
remain navigable when JavaScript is disabled.

Browse pages consume the checksum-verified search artifact, which the web
consumer already proves is derived exactly from the normalized dataset
artifact. They do not parse raw XML or introduce a second record projection.
Primary navigation, home item discovery, detail breadcrumbs, and the
dataset-neutral 404 now lead into the static browse surface.

## Bounded rendering contract

- All nine entity kinds have a catalogue, including an explicit empty state
  when the active dataset contains none of a kind.
- Each catalogue page renders at most 100 records.
- Page numbers are path segments rather than query parameters, so every page is
  part of the static export and can be followed without client code.
- The browse directory exposes aggregate record counts and descriptions for
  items, recipes, encrustments, skills, abilities, spells, monsters, stats, and
  targeting templates.
- Every card links to the existing canonical detail URL and identifies its
  source label.

The independently authored synthetic dataset contains 22 searchable records.
It produces nine kind pages plus the browse directory, increasing the complete
synthetic export from 30 to 40 pages.

## Canonical read-only measurement

The ignored canonical search artifact still contains 2,767 documents:

| Kind                |   Records | Static catalogue pages |
| ------------------- | --------: | ---------------------: |
| Items               |       763 |                      8 |
| Recipes             |       374 |                      4 |
| Encrustments        |        57 |                      1 |
| Skills              |        52 |                      1 |
| Abilities           |       352 |                      4 |
| Spells              |       951 |                     10 |
| Monsters            |       183 |                      2 |
| Stats               |         0 |     1 empty-state page |
| Targeting templates |        35 |                      1 |
| **Total**           | **2,767** |                 **32** |

Together with the browse directory, these 33 discovery pages increase the
complete canonical static export from 2,824 to 2,857 pages. These aggregate
measurements are local evidence only and do not approve publication of the
ignored official artifact.

## Verification

- Focused web tests cover exhaustive kind metadata, bounded deterministic
  pagination, and invalid/empty page behavior.
- The synthetic static build generates all 40 pages.
- Desktop and mobile Playwright flows disable JavaScript, keyboard-navigate
  from `/browse/` through the spell catalogue to a static spell detail page,
  verify the detail breadcrumb, and check for horizontal overflow.
- The representative axe sweep includes the browse directory and a kind
  catalogue.
- `pnpm.cmd build:official` completes deterministic zero-error generation and
  exports all 2,857 canonical local pages.

## Deliberate boundaries

- Browse is a stable discovery surface, not a replacement for structured
  search or future richer list filters.
- ADR 0003's transfer, parsing, rendering, interaction, and relevance budgets
  remain open.
- Broader non-item stat facets still require an evidenced shared domain
  contract.
- Static-hosting metadata, sitemap, robots, canonical-host policy, and the
  generated-data publication decision remain release work.
