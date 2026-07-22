# First parity slice acceptance draft

Status: draft for owner approval

The first product slice is **items + stats + source provenance + search**. This statement is intentionally a reviewable draft: it does not approve publishing official data or choose a final search performance budget.

## User outcome

A player can find an item or stat, understand normalized game values and sources, follow implemented item/stat/recipe/encrustment/skill/ability/spell/monster relationships, inspect crafting, encrusting, loadout, progression, spell-effect, monster-profile, and monster-drop details, and share a URL that preserves a structured search query. Missing definitions, broken relationships, and recursive spell cycles are visible rather than silently invented.

## Functional acceptance

- Every normalized item has a stable static detail route with category, description, price, quality, stats, resolved or explicitly unresolved spell triggers, source/file provenance, attached diagnostics, and known recipe relationships.
- Every linked recipe has a stable static detail route with tool, skill requirement, visibility, input/output quantities, source/file provenance, and attached diagnostics. Resolved items link both ways; unresolved ingredients remain visible without a fabricated item route.
- Every linked encrustment has a stable static detail route with tool, skill requirement, visibility, instability, applicable slots, ingredients, direct signed modifiers, named power hooks, appearance descriptors, source/file provenance, and attached diagnostics. The dataset-wide instability-effect pool remains separate, exposes resolved/unresolved spell references and provenance, and does not imply unavailable per-recipe selection semantics. Ingredient items expose used-to-encrust backlinks; unresolved ingredients remain visible without a fabricated item route.
- Name collisions receive deterministic unique canonical routes. A version-scoped route registry preserves reviewed canonical slugs and historical aliases; unambiguous source-ID aliases are also generated. Every alternate path resolves to the same record and visibly links to its canonical URL.
- Every available standalone stat definition has a stable static detail route with item and spell-effect backlinks plus source/file provenance.
- Every normalized spell has a stable static detail route with direct effects, resolved or explicitly unresolved spell/stat targets, cycle-safe recursive effect relationships, item/spell/ability/monster/instability backlinks, source/file provenance, and attached diagnostics. Resolved spell references on item, stat, encrustment, and monster pages link to these routes.
- Every normalized skill has a stable static detail route with archetype, complete named/generic starting loadouts, ordered ability progression, source/file provenance, and attached diagnostics. Resolved named items link both ways; generic choices and unresolved names remain visible without fabricated item routes.
- Every normalized ability has a stable static detail route with its resolved or explicitly unresolved parent skill, starting/level position, resolved or explicitly unresolved spell triggers, source/file provenance, and attached diagnostics. Supported direct event-trigger shapes retain chance, delay, duration, resistance, and taxonomy metadata.
- Every normalized monster has a stable static detail route with taxonomy, dungeon-depth/special classification, source archetype levels and experience, inherited stat bonuses and AI casting chance, palette metadata, local loss-aware AI/sight/dig/dash/charge source metadata, resolved or explicitly unresolved on-hit/cast/on-death/dash/charge spell hooks, direct named or type-driven drops, resolved parent/direct-variant navigation, source/file provenance, and attached diagnostics. Exact one-in odds remain visible, resolved spells and named drop items link both ways, type-driven drops do not fabricate items, and the page does not present unverified derived combat totals or inherited sight/movement/drop behavior.
- A dataset with no standalone stat definitions exports successfully and explains that limitation without fabricating definitions.
- Search covers item and stat records and supports shareable text, entity-type, source, item-category, and item-stat filters.
- Text matching requires every normalized query token. Exact and prefix name matches rank above description-only matches; ties are deterministic.
- Search renders at most 50 results at once and exposes the total match count and useful empty/reset states.
- Item-to-stat and stat-to-item links do not produce broken routes for available definitions.
- Item-to-recipe and recipe-to-item links do not produce broken routes for resolved references.
- Item-to-encrustment and encrustment-to-item links do not produce broken routes for resolved references.
- Monster-to-item drop links and reciprocal item backlinks do not produce broken routes for resolved named drops.

## Data and safety acceptance

- Synthetic fixtures cover every published behavior and remain sufficient for CI.
- The canonical local official dataset imports and builds read-only with zero parser errors.
- Local paths, official databases/assets, and generated official derivatives remain outside Git and public output until the policy gate is resolved.
- Unsupported constructs, dangling references, missing definitions, and precedence decisions remain measurable diagnostics.

## Quality acceptance

- Desktop and mobile keyboard flows pass for item filters, global search filters, item details, stat details, recipe backlinks, encrustment backlinks, spell-effect navigation, item/skill/ability/loadout navigation, and monster-family/spell/drop navigation.
- Representative home, search, item, stat, recipe, encrustment, skill, ability, spell, and monster pages have no automatically detected axe violations.
- Search parse/hydration cost, interaction latency, compressed transfer size, and a response-time budget still require owner-approved targets before the slice is complete.
- Representative relevance examples still require owner approval before ADR 0003 can be accepted.

## Current progress

Implemented: versioned split search artifact, versioned source/patch provenance, deterministic query/filter and item/recipe/encrustment/skill/ability/spell/monster-drop relationship APIs, shareable global search, collision-safe canonical routes, a version-scoped route registry and source-ID aliases, static stat/recipe/encrustment/skill/ability/spell/monster routes, item/stat/crafting/encrusting/loadout/spell/monster-family/drop backlinks, cycle-safe effect traversal, loss-aware spell mana-cost source formulas, item/ability/monster spell-trigger normalization/linking/presentation, shared signed ability/encrustment/monster modifier normalization, skill/ability source metadata and dodge hooks, monster core stat/inheritance profiles, reciprocal spell links, local monster dig/dash/charge declarations, behavior spell hooks, and sound/sprite presentation metadata, direct named/type-driven drops, direct encrustment outcomes, the separately modeled shared instability-effect pool, explicit missing-definition/reference/cycle states, and synthetic desktop/mobile browser coverage. Alternate pages are marked `noindex, follow` and expose the canonical in-app URL; final public canonical-link metadata remains part of the hosting/domain work.

Outstanding: approve this statement and search budgets, establish an approved source for official stat definitions absent from the measured game build, complete independently verified monster derived-stat parity, and continue representative comparisons with legacy behavior. Item quality has passed its separate synthetic, official-data, artifact, patch, and responsive UI review.
