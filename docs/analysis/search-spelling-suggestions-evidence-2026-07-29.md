# Search spelling-suggestion evidence

Date: 2026-07-29

## Scope

This slice adds project-owned spelling recovery to the existing static search
route without adopting a third-party search library. Ordinary deterministic
matching and ranking are unchanged except that registered route aliases now
contribute to searchable text.

Search schema 2 adds an ordered `aliases` array to every search document. The
array is derived only from the normalized entity's collision-checked
`slugAliases`; descriptions, source labels, categories, stats, and relation
text never become suggestion candidates.

## Behavior contract

- Suggestions are evaluated only for a normalized query between 3 and 120
  characters that has no ordinary result under the active entity, source,
  category, and item-stat filters.
- Candidate text is the entity's canonical name plus its registered route
  aliases. Alias separators are normalized to spaces for comparison.
- Project-owned edit distance accepts a bounded difference proportional to the
  candidate length, with a minimum of one edit and a maximum of five.
- Results sort by edit distance, length difference, canonical-name matches
  before alias matches, then the shared `(kind, name, id)` deterministic order.
- Duplicate canonical suggested queries are removed, and no caller can receive
  more than five suggestions.
- Selecting a suggestion replaces the input with its canonical entity name,
  preserves structured filters, returns focus to the search box, and lets the
  existing debounce write the selected query to the shareable URL. The
  application never silently changes a query.

An alias can therefore help recover a misspelling while still directing the
user toward the canonical entity name. A typo that resembles only description
text produces no suggestion.

## Artifact boundary

The web consumer requires search schema 2, validates every alias as a safe
entity slug, and still byte-compares the complete search document array against
a fresh derivation from the checksum-verified normalized artifact. A stale
schema-1 file or a checksum-valid document without `aliases` fails before
rendering.

The ignored canonical `1.1.5 public_beta` output contains:

- 2,767 search documents;
- 52 documents with a route alias;
- 52 aliases in total, with at most one on a document; and
- a 1,407,994-byte uncompressed search artifact.

These aggregate measurements are local evidence only and do not approve
publication of the official-derived artifact.

## Verification

- `pnpm.cmd check`: formatting, lint, all workspace type checks, 150
  unit/artifact tests, byte-identical synthetic generation, and the 43-page
  static export passed.
- Focused domain search tests: 8 passed, including name typo, alias typo,
  description exclusion, filter isolation, deterministic ordering, the
  five-suggestion cap, and caller limits.
- Focused pipeline importer tests: 32 passed.
- Focused web artifact/browse tests: 34 passed, including rejection of a
  checksum-valid search document without its alias list.
- `pnpm.cmd test:e2e`: 36 desktop/mobile tests passed. The browser flow
  keyboard-selects a suggestion, verifies focus and the debounced URL, confirms
  the result, proves an incompatible entity filter suppresses it, and includes
  the typo state in the representative axe sweep.
- `pnpm.cmd generate:official:check`: byte-identical schema-2 official output
  with 0 errors, 206 warnings, and 71 informational decisions.
- `pnpm.cmd build:official`: the same deterministic zero-error import and all
  2,857 ignored local static pages passed the strict schema-2 web boundary.
