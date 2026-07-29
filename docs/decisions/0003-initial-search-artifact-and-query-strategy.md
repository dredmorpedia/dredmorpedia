# ADR 0003: Initial search artifact and query strategy

Date: 2026-07-19
Status: Proposed (separate artifact and query path implemented; acceptance budgets pending)
Owners: repository owner + maintainer

## Context

The full approved local dataset produces 2,710 search documents. The implemented deterministic search artifact is 1,202,823 bytes uncompressed after adding item-stat facets. This is small enough to test a project-owned client query path before accepting the bundle cost, worker complexity, and query semantics of a third-party search engine.

Search must eventually combine text with typed filters and numeric game fields. A general full-text library does not replace domain-specific filtering, source precedence, stable URLs, or relationship queries.

## Decision under validation

- Generate a separately loadable, versioned search-document artifact from normalized domain records.
- Keep structured facets and numeric filters in project-owned TypeScript rather than encoding game rules in a third-party query language.
- Begin the first product slice with normalized text matching over the generated documents. Load the search artifact only on routes that use it and do not render the full dataset merely to search the DOM.
- Benchmark query latency, parse/hydration cost, compressed transfer size, and keyboard interaction on representative desktop and mobile hardware.
- Add a library such as MiniSearch or move querying to a worker only if measurements show the project-owned path misses an agreed responsiveness or relevance target.
- Keep ordinary matching deterministic. When a query has zero results, offer at
  most five project-owned spelling suggestions derived from entity names and
  aliases only. Suggestions never silently replace the query. Use a search
  library only if measured relevance or performance later justifies it.

Dataset artifact version 3 and search artifact version 2 now implement this
split. Search schema 2 adds ordered route aliases to each document. The search
route loads the search payload, applies project-owned text/facet and spelling
logic, preserves filters in the URL, and renders at most 50 results. This
implementation is not permission to publish official content.

## Consequences

This avoids an early dependency and keeps domain filtering explicit. It also means the project owns token normalization, ranking, result grouping, and later typo/prefix behavior until evidence justifies a specialized index.

Initial read-only measurements over 2,710 documents recorded a 0.452 ms p95 for query execution across 1,000 representative calls. This excludes JSON transfer, parse/hydration, rendering, and interaction latency, so the user-facing budget remains open. Initial query evidence is recorded in [`../analysis/first-parity-foundation-2026-07-19.md`](../analysis/first-parity-foundation-2026-07-19.md); the implemented suggestion contract and schema-2 measurements are in [`../analysis/search-spelling-suggestions-evidence-2026-07-29.md`](../analysis/search-spelling-suggestions-evidence-2026-07-29.md).

## Acceptance checklist

- [x] Full-dataset search-document count and uncompressed serialized size are recorded.
- [x] Search documents have deterministic IDs, URLs, text, and facets.
- [x] The first product slice emits the search documents as a separate artifact.
- [x] Initial relevance direction is agreed: deterministic ordinary results
      plus bounded, user-selected name/alias suggestions for zero-result
      queries.
- [x] Name/route-alias suggestions are implemented without a third-party
      library, honor active filters, remain capped at five, and require an
      explicit user selection.
- [ ] Query and interaction benchmarks are recorded on desktop and mobile.
- [ ] Detailed suggestion examples and a response-time budget are agreed and
      measured.
