# ADR 0003: Initial search artifact and query strategy

Date: 2026-07-19
Status: Proposed (full-dataset size measured; product-slice benchmark pending)
Owners: repository owner + maintainer

## Context

The full approved local dataset produces 2,710 search documents. Their deterministic uncompressed JSON representation is 1,088,845 bytes. This is small enough to test a project-owned client query path before accepting the bundle cost, worker complexity, and query semantics of a third-party search engine.

Search must eventually combine text with typed filters and numeric game fields. A general full-text library does not replace domain-specific filtering, source precedence, stable URLs, or relationship queries.

## Decision under validation

- Generate a separately loadable, versioned search-document artifact from normalized domain records.
- Keep structured facets and numeric filters in project-owned TypeScript rather than encoding game rules in a third-party query language.
- Begin the first product slice with normalized text matching over the generated documents. Load the search artifact only on routes that use it and do not render the full dataset merely to search the DOM.
- Benchmark query latency, parse/hydration cost, compressed transfer size, and keyboard interaction on representative desktop and mobile hardware.
- Add a library such as MiniSearch or move querying to a worker only if measurements show the project-owned path misses an agreed responsiveness or relevance target.

The current architecture-spike artifact remains combined because it is an internal proof. Splitting the public search artifact is implementation work for the first search slice, not permission to publish official content.

## Consequences

This avoids an early dependency and keeps domain filtering explicit. It also means the project owns token normalization, ranking, result grouping, and later typo/prefix behavior until evidence justifies a specialized index.

## Acceptance checklist

- [x] Full-dataset search-document count and uncompressed serialized size are recorded.
- [x] Search documents have deterministic IDs, URLs, text, and facets.
- [ ] The first product slice emits the search documents as a separate artifact.
- [ ] Query and interaction benchmarks are recorded on desktop and mobile.
- [ ] Relevance acceptance examples and a response-time budget are agreed.
