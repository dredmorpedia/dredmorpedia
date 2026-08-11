# Search response-budget and relevance evidence

Date: 2026-08-09

Updated: 2026-08-11 (search serialization headroom hardening)

## Decision scope

This checkpoint closes ADR 0003's remaining local response-budget and concrete
relevance acceptance items. It does not change ordinary ranking, spelling
behavior, publication rights, or the static-first architecture.

The benchmark uses the ignored canonical Dungeons of Dredmor `1.1.5
public_beta` dataset, Steam build `22934623`, with the base game and all three
official expansions. Only aggregate sizes, timings, and narrowly selected query
expectations are recorded; the generated dataset and static export remain
ignored and non-public.

## Accepted budgets

| Surface                                             | Accepted p95 or size ceiling |
| --------------------------------------------------- | ---------------------------: |
| Uncompressed search artifact                        |              1,500,000 bytes |
| Gzip level-9 search artifact                        |                225,000 bytes |
| Brotli quality-11 search artifact                   |                175,000 bytes |
| Warmed standalone JSON parse                        |                    20 ms p95 |
| Ordinary domain query                               |                    16 ms p95 |
| Zero-result name/alias suggestion query             |                    50 ms p95 |
| Desktop navigation through first exact result       |                 1,500 ms p95 |
| Slowed mobile navigation through first exact result |                 3,000 ms p95 |
| Desktop exact-result interaction                    |                   100 ms p95 |
| Slowed mobile exact-result interaction              |                   200 ms p95 |
| Desktop suggestion interaction                      |                   150 ms p95 |
| Slowed mobile suggestion interaction                |                   300 ms p95 |

The browser measurement runs the production static export in Chromium. The
desktop profile uses Playwright's Desktop Chrome settings. The mobile profile
uses its Pixel 7 settings plus a 4x CPU slowdown. Each profile records ten runs
after two warmups in fresh browser contexts. Network throttling is deliberately
not mixed into that local execution measurement: the static test server is
uncompressed, while a real static host must serve gzip or Brotli. The compressed
artifact ceiling therefore carries the transfer decision separately.

Navigation-to-first-result starts before the static search route navigation,
immediately submits an exact query after DOM content is available, and ends
when its result link is visible. Interaction timing starts inside the page
before the input event and ends on the result/suggestion DOM mutation. The
standalone parse metric measures the exact generated search JSON; the browser
metric covers the actual Next.js payload parsing, React hydration, query, and
render path together.

## Canonical measurements

Environment: Windows x64, Node `24.18.0`, Chromium `149.0.7827.55`, AMD Ryzen 7
9800X3D. Hardware details make the local timings interpretable; the accepted
budgets retain substantial headroom for ordinary developer machines.

The canonical artifact contained 2,767 documents:

| Artifact measurement |          Result |
| -------------------- | --------------: |
| Uncompressed         | 1,407,994 bytes |
| Gzip level 9         |   194,488 bytes |
| Brotli quality 11    |   140,759 bytes |
| JSON parse           |     2.36 ms p95 |

Representative domain measurements over 500 recorded calls after 50 warmups
were 0.55 ms p95 for an exact query, 0.51 ms for a prefix query, 0.44 ms for a
multi-token query, and 0.03 ms for a filtered query. The spelling path measured
2.26 ms p95 over 100 recorded calls after ten warmups.

| Browser profile                  | Navigation to first result | Exact interaction | Suggestion interaction |
| -------------------------------- | -------------------------: | ----------------: | ---------------------: |
| Desktop Chromium                 |              135.53 ms p95 |       6.00 ms p95 |            7.60 ms p95 |
| Pixel 7 profile, 4x CPU slowdown |              615.35 ms p95 |      32.80 ms p95 |           35.70 ms p95 |

All measurements pass the accepted ceilings without a third-party search index
or worker.

## 2026-08-11 headroom hardening

The search scope subsequently grew to 2,829 documents. The unchanged
pretty-printed JSON representation reached 1,477,801 bytes, leaving only 22,199
bytes (1.48%) below the accepted raw ceiling even though compressed transfer and
runtime timings still passed. Field measurement showed that the document data
was useful search content while presentation whitespace alone consumed 297,597
bytes. The pipeline now applies its same stable object-key and document ordering
to a compact `search.json` representation with a final newline. Search schema 2,
query semantics, relevance, runtime validation, and checksum enforcement are
unchanged.

| Artifact measurement | Pretty representation | Compact representation | Budget headroom after |
| -------------------- | --------------------: | ---------------------: | --------------------: |
| Uncompressed         |       1,477,801 bytes |        1,180,204 bytes |         319,796 bytes |
| Gzip level 9         |         202,758 bytes |          196,345 bytes |          28,655 bytes |
| Brotli quality 11    |         146,089 bytes |          143,207 bytes |          31,793 bytes |

The complete canonical command regenerated byte-identical outputs, exported all
2,981 static pages, and retained the concrete relevance examples. Its latest
standalone p95 measurements were 2.50 ms for JSON parsing; 0.66 ms exact, 0.57
ms prefix, 0.57 ms multi-token, and 0.06 ms filtered queries; and 2.44 ms for
the suggestion path.

| Browser profile                  | Navigation to first result | Exact interaction | Suggestion interaction |
| -------------------------------- | -------------------------: | ----------------: | ---------------------: |
| Desktop Chromium                 |              163.51 ms p95 |       8.10 ms p95 |           10.90 ms p95 |
| Pixel 7 profile, 4x CPU slowdown |              858.08 ms p95 |      47.60 ms p95 |           69.30 ms p95 |

This reclaims growth headroom without removing fields, weakening the accepted
relevance contract, raising a budget, or introducing a third-party index.

## Relevance examples

The canonical benchmark proves these concrete examples:

- the exact query `Clockwork Piezoblade` ranks that entity first;
- the reversed multi-token query `blade clockwork`, filtered to items, still
  ranks `Clockwork Piezoblade` first because every normalized token must match;
- `clokwork piezoblade`, filtered to items, offers `Clockwork Piezoblade` as
  the first explicit suggestion; and
- the same typo under the spell filter offers no incompatible suggestion.

Tracked synthetic domain tests additionally prove exact/prefix name ranking
over description matches, deterministic source/category/stat filtering,
route-alias recovery, description-only exclusion, stable ordering, the
five-suggestion cap, and caller-selected limits. The existing browser flow
proves that selecting a suggestion preserves filters, restores input focus,
updates the URL after the normal debounce, and never silently replaces a query.

These examples are the acceptance contract, not a promise of fuzzy full-text
search. A new library or worker requires a measured budget miss or a separately
approved relevance need.

## Repeatable verification

```powershell
pnpm.cmd benchmark:search:official
```

The command regenerates the canonical ignored artifact twice, verifies the full
static export, then runs the domain/artifact and desktop/mobile browser
benchmarks. It fails when a recorded acceptance ceiling or relevance example is
missed. Ordinary CI remains proprietary-data-free and does not run this local
official-data command.
