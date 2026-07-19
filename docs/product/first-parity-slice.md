# First parity slice acceptance draft

Status: draft for owner approval

The first product slice is **items + stats + source provenance + search**. This statement is intentionally a reviewable draft: it does not approve publishing official data or choose a final search performance budget.

## User outcome

A player can find an item or stat, understand its normalized game values and source, follow implemented item/stat relationships, and share a URL that preserves a structured search query. Missing definitions and broken relationships are visible rather than silently invented.

## Functional acceptance

- Every normalized item has a stable static detail route with category, description, price, stats, source/file provenance, attached diagnostics, and known recipe relationships.
- Name collisions receive deterministic unique canonical routes. A version-scoped route registry preserves reviewed canonical slugs and historical aliases; unambiguous source-ID aliases are also generated. Every alternate path resolves to the same record and visibly links to its canonical URL.
- Every available standalone stat definition has a stable static detail route with item and spell-effect backlinks plus source/file provenance.
- A dataset with no standalone stat definitions exports successfully and explains that limitation without fabricating definitions.
- Search covers item and stat records and supports shareable text, entity-type, source, item-category, and item-stat filters.
- Text matching requires every normalized query token. Exact and prefix name matches rank above description-only matches; ties are deterministic.
- Search renders at most 50 results at once and exposes the total match count and useful empty/reset states.
- Item-to-stat and stat-to-item links do not produce broken routes for available definitions.

## Data and safety acceptance

- Synthetic fixtures cover every published behavior and remain sufficient for CI.
- The canonical local official dataset imports and builds read-only with zero parser errors.
- Local paths, official databases/assets, and generated official derivatives remain outside Git and public output until the policy gate is resolved.
- Unsupported constructs, dangling references, missing definitions, and precedence decisions remain measurable diagnostics.

## Quality acceptance

- Desktop and mobile keyboard flows pass for item filters, global search filters, item details, and stat details.
- Representative home, search, item, and stat pages have no automatically detected axe violations.
- Search parse/hydration cost, interaction latency, compressed transfer size, and a response-time budget still require owner-approved targets before the slice is complete.
- Representative relevance examples still require owner approval before ADR 0003 can be accepted.

## Current progress

Implemented: versioned split search artifact, versioned source/patch provenance, deterministic query/filter API, shareable global search route, collision-safe canonical routes, a version-scoped route registry and source-ID aliases, static stat routes, item/stat backlinks, explicit empty-stat-definition state, and synthetic desktop/mobile browser coverage. Alternate pages are marked `noindex, follow` and expose the canonical in-app URL; final public canonical-link metadata remains part of the hosting/domain work.

Outstanding: approve this statement and search budgets, establish an approved source for official stat definitions absent from the measured game build, complete item/relationship fields, and compare representative outputs with legacy behavior.
