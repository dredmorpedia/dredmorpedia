# Cross-entity stat search evidence

Date: 2026-08-09
Scope: deterministic structured stat discovery for the active dataset

## Preserved behavior and selected boundary

The preserved application exposes a clickable stat search in
`legacy/js/search.js`. It scans item effects, skill abilities, and spell
effects, then clones matching legacy rows into result tabs. It predates
encrustments, does not search monsters, may repeat a record when several
effects match, and sorts within each legacy group by a loosely typed source
amount.

The modern search now preserves the useful discovery behavior without cloning
rendered rows or inventing a cross-scope strength formula:

- items contribute resolved named stats and fixed modifiers;
- abilities and encrustments contribute their direct modifiers;
- spells contribute direct and buff-local stat effects, damage declarations,
  and buff modifiers; and
- recipe, skill, stat-definition, targeting-template, and monster documents do
  not claim stat facets.

Monster stat backlinks remain available on each stat detail route. Repeating
1,331 effective inherited monster bonuses in the search payload was rejected:
the preserved stat search did not include monsters, inherited values are not
direct local declarations, and the duplication exceeded the accepted search
artifact budget. A future monster-comparison surface needs its own evidenced
semantics rather than piggybacking on this filter.

The result order remains the ordinary deterministic search order. The modern
filter does not rank heterogeneous item bonuses, buff modifiers, and damage
effect amounts as though they were one comparable gameplay value.

## Stable facet identity

Each resolved declaration stores one canonical stat key in `statKeys`.
Unresolved selectors retain the collision-safe
`modifier:<kind>:<source-key>` form. The search control derives its labels and
aliases from the verified active stat catalogue:

- duplicate display options collapse to one definition;
- definitions unused by the active searchable records are omitted;
- existing selector-shaped URL values remain accepted as aliases; and
- selecting a definition writes the stable canonical key to the shareable URL.

This is an additive search-schema-2 behavior change: the `statKeys` field and
query contract are unchanged, and saved raw selector values remain readable.
The web still verifies that `search.json` is derived exactly from the
checksum-verified normalized artifact before returning it.

## Canonical measurement

The ignored `1.1.5 public_beta` dataset produces 2,829 search documents.
Exactly 1,350 documents carry at least one stat facet:

| Kind         | Faceted records | Facet assignments |
| ------------ | --------------: | ----------------: |
| Items        |             506 |             1,583 |
| Abilities    |             217 |               472 |
| Spells       |             572 |             1,340 |
| Encrustments |              55 |               126 |

Sixty-one of the 62 project-authored definitions occur in those records.
`Wand Affinity` is valid reference vocabulary but has no declaration in this
searchable boundary, so the control does not offer a guaranteed zero-result
option.

Representative combined results are:

- `Melee Power`: 66 records (10 items, 17 abilities, 38 spells, and one
  encrustment);
- `Crushing Damage`: 158 records (92 items, 17 abilities, 47 spells, and two
  encrustments); and
- `Armour Absorption`: 189 records (135 items, six abilities, 42 spells, and
  six encrustments).

These ignored aggregate measurements are implementation evidence only. They do
not approve publication of official-derived data.

## Budget and validation evidence

`pnpm.cmd benchmark:search:official` passes the existing ADR 0003 budgets
without raising them:

- uncompressed: 1,477,801 bytes (budget 1,500,000);
- gzip level 9: 202,758 bytes (budget 225,000);
- Brotli quality 11: 146,089 bytes (budget 175,000);
- parse p95: 2.5161 ms (budget 20 ms);
- filtered query p95: 0.0334 ms (budget 16 ms);
- desktop navigation/exact interaction p95: 132.169 / 6.6 ms; and
- 4x-CPU mobile navigation/exact interaction p95: 651.616 / 37.2 ms.

The same command proves byte-identical zero-error canonical generation and the
complete 2,981-page local static export. Focused tests cover canonical-key
deduplication, selector aliases, unused definitions, fallback labels, all four
searchable entity families, inherited-monster exclusion, and the synthetic
keyboard filter flow. Repository-wide and complete browser validation are
recorded in the implementing commit handoff.
