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

Dataset artifact version 2 and search artifact version 1 now implement this split. The search route loads the search payload, applies project-owned text/facet logic, preserves filters in the URL, and renders at most 50 results. This implementation is not permission to publish official content.

## Consequences

This avoids an early dependency and keeps domain filtering explicit. It also means the project owns token normalization, ranking, result grouping, and later typo/prefix behavior until evidence justifies a specialized index.

Initial read-only measurements over 2,710 documents recorded a 0.452 ms p95 for query execution across 1,000 representative calls. This excludes JSON transfer, parse/hydration, rendering, and interaction latency, so the user-facing budget remains open. Evidence is recorded in [`../analysis/first-parity-foundation-2026-07-19.md`](../analysis/first-parity-foundation-2026-07-19.md).

## Acceptance checklist

- [x] Full-dataset search-document count and uncompressed serialized size are recorded.
- [x] Search documents have deterministic IDs, URLs, text, and facets.
- [x] The first product slice emits the search documents as a separate artifact.
- [ ] Query and interaction benchmarks are recorded on desktop and mobile.
- [ ] Relevance acceptance examples and a response-time budget are agreed.
