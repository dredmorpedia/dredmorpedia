# ADR 0003: Initial search artifact and query strategy

Date: 2026-07-19
Status: Accepted (budgets and relevance examples accepted 2026-08-09; compact representation accepted 2026-08-11)
Owners: repository owner + maintainer

## Context

The first approved local measurement produced 2,710 search documents and a
1,202,823-byte uncompressed search artifact. After the search scope expanded to
2,829 canonical `1.1.5 public_beta` documents, pretty-printed serialization
reached 1,477,801 bytes and left only 22,199 bytes below the accepted raw
ceiling. Deterministic compact serialization reduces the same schema and
documents to 1,180,204 bytes. This remains small enough for a project-owned
client query path without accepting the bundle cost, worker complexity, and
query semantics of a third-party search engine.

Search must eventually combine text with typed filters and numeric game fields. A general full-text library does not replace domain-specific filtering, source precedence, stable URLs, or relationship queries.

## Decision

- Generate a separately loadable, versioned search-document artifact from normalized domain records.
- Serialize the transfer-facing search artifact compactly while retaining
  deterministic object-key/document ordering, a final newline, and manifest
  byte/checksum coverage. Keep normalized and diagnostic artifacts readable;
  this representation choice does not change search schema or query semantics.
- Keep structured facets and numeric filters in project-owned TypeScript rather than encoding game rules in a third-party query language.
- Begin the first product slice with normalized text matching over the generated documents. Load the search artifact only on routes that use it and do not render the full dataset merely to search the DOM.
- Benchmark query latency, parse/hydration cost, compressed transfer size, and
  interaction on reproducible desktop and conservative slowed-mobile browser
  profiles.
- Add a library such as MiniSearch or move querying to a worker only if measurements show the project-owned path misses an agreed responsiveness or relevance target.
- Keep ordinary matching deterministic. When a query has zero results, offer at
  most five project-owned spelling suggestions derived from entity names and
  aliases only. Suggestions never silently replace the query. Use a search
  library only if measured relevance or performance later justifies it.

The canonical acceptance budgets are:

- search artifact: at most 1,500,000 bytes uncompressed, 225,000 bytes with
  gzip level 9, and 175,000 bytes with Brotli quality 11;
- warmed standalone JSON parsing: at most 20 ms p95;
- ordinary exact, prefix, multi-token, and filtered domain queries: at most
  16 ms p95;
- zero-result name/alias suggestion query: at most 50 ms p95;
- production-static navigation through the first exact result: at most 1,500
  ms p95 on the desktop Chromium profile and 3,000 ms p95 on the Pixel 7
  browser profile with 4x CPU slowdown;
- input-to-visible-result interaction: at most 100 ms p95 on desktop and 200 ms
  p95 on the slowed mobile profile; and
- input-to-visible-suggestion interaction: at most 150 ms p95 on desktop and
  300 ms p95 on the slowed mobile profile.

`pnpm benchmark:search:official` regenerates and exports the ignored official
dataset, measures the artifact/query budgets, and runs ten recorded browser
iterations after two warmups for each profile. These timing budgets are a local
regression contract, not a claim about public-host network latency. The
compressed-size thresholds bound the eventual transfer separately; public
hosting must enable gzip or Brotli before the transfer budget can be treated as
met in deployment.

Dataset artifact version 3 and search artifact version 2 now implement this
split. Search schema 2 adds ordered route aliases to each document. The search
route loads the search payload, applies project-owned text/facet and spelling
logic, preserves filters in the URL, and renders at most 50 results. This
implementation is not permission to publish official content.

The stat facet now covers direct item, ability, spell, and encrustment
declarations. Resolved selectors share one canonical stat key; raw historical
selector URLs remain accepted aliases, and unresolved selectors retain their
collision-safe source identity. Inherited monster bonuses remain available as
stat-page backlinks rather than being duplicated in search. This extension
passes the same accepted artifact, query, relevance, and browser budgets
without changing them.

## Consequences

This avoids an early dependency and keeps domain filtering explicit. It also means the project owns token normalization, ranking, result grouping, and later typo/prefix behavior until evidence justifies a specialized index.

Initial read-only measurements over 2,710 documents recorded a 0.452 ms p95
for query execution across 1,000 representative calls. The current compact
2,829-document artifact measures 1,180,204 bytes uncompressed, 196,345 bytes
with gzip, and 143,207 bytes with Brotli. Its parse, query, suggestion, and
desktop/4x-CPU-mobile browser paths remain inside every accepted budget, so
MiniSearch and a worker remain unjustified. Initial query evidence is recorded
in [`../analysis/first-parity-foundation-2026-07-19.md`](../analysis/first-parity-foundation-2026-07-19.md),
the implemented suggestion contract is in
[`../analysis/search-spelling-suggestions-evidence-2026-07-29.md`](../analysis/search-spelling-suggestions-evidence-2026-07-29.md),
and the accepted response/relevance measurements are in
[`../analysis/search-response-budgets-evidence-2026-08-09.md`](../analysis/search-response-budgets-evidence-2026-08-09.md),
which also records the 2026-08-11 headroom hardening.
Cross-entity stat-filter evidence is in
[`../analysis/cross-entity-stat-search-evidence-2026-08-09.md`](../analysis/cross-entity-stat-search-evidence-2026-08-09.md).

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
- [x] Query and interaction benchmarks are recorded on desktop and a
      conservative slowed mobile browser profile.
- [x] Detailed ordinary/suggestion relevance examples and response-time
      budgets are agreed, measured, and reproducible.
