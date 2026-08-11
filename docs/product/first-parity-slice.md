# First parity slice acceptance draft

Status: draft for owner approval

The first product slice is **items + stats + source provenance + search**. This
statement remains a reviewable draft. Official content is approved only for the
ignored local `1.1.5 public_beta` MVP, not public deployment. ADR 0003's search
relevance and local performance budgets are accepted independently of this
broader parity statement.

## User outcome

A player can find an item or stat, understand normalized game values and sources, follow implemented item/stat/recipe/encrustment/skill/ability/spell/monster relationships, inspect crafting, encrusting, loadout, progression, spell-effect, monster-profile, and monster-drop details, and share a URL that preserves a structured search query. Missing definitions, broken relationships, and recursive spell cycles are visible rather than silently invented.

## Functional acceptance

- Every normalized item has a stable static detail route with a human-readable, source-shape-derived category, including a strictly validated empty gem marker where supplied, description, price, quality, loss-aware artifact quality and armour slot/level/`randoms` declarations, direct Life/Mana recovery, wand charge, and trap activation/targeting/placement source values, named stats, signed direct damage/resistance/primary/secondary modifiers, resolved or explicitly unresolved spell triggers with exact retained source flags, source/file provenance, attached diagnostics, and known recipe relationships. A configured local asset set displays the item's checksummed copied PNG icon; unavailable, unsupported, or invalid art uses a non-broken decorative fallback. Gem behavior, random-stat selection, equipment formulas, recovery timing, charge-use behavior, trap runtime behavior, and neutral source flags are not promoted into fabricated formulas.
- Every linked recipe has a stable static detail route with tool, skill requirement, visibility, input/output quantities, source/file provenance, and attached diagnostics. Resolved items link both ways; unresolved ingredients remain visible without a fabricated item route.
- Every linked encrustment has a stable static detail route with tool, skill requirement, visibility, instability, applicable slots, ingredients, direct signed modifiers, named power hooks, appearance descriptors, source/file provenance, and attached diagnostics. The dataset-wide instability-effect pool remains separate, exposes resolved/unresolved spell references and provenance, and does not imply unavailable per-recipe selection semantics. Ingredient items expose used-to-encrust backlinks; unresolved ingredients remain visible without a fabricated item route.
- Name collisions receive deterministic unique canonical routes. A local exact-version registry can preserve reviewed routes; a publication-oriented schema-2 registry additionally inherits checksum-bound stable source-identity reservations, protects removed-route tombstones, and reactivates them only for the returning identity. Every active alternate path resolves to the same record and visibly links to its canonical URL.
- Every available source or project-reference stat definition has a stable static detail route with item, encrustment, ability, spell, and monster backlinks plus source/file provenance. Project references identify their exact modifier selector and do not imply a gameplay formula.
- Every normalized spell has a stable static detail route with root wand and item-consumption source metadata, mana source formulas, ordered animation/impact presentation declarations, ordered buff-local descriptions and halo declarations, spell- and buff-local AI hints, loss-aware buff lifecycle/stacking parameters, signed direct and sight-radius modifiers, target/player hit buff event hooks, typed effect-list options, direct effect damage/scaling/presentation/duration, `after`, bleed, and skip-animation metadata, controls, and buff-presence conditions, resolved or explicitly unresolved spell/stat/item targets, cycle-safe recursive effect relationships, item/spell/buff-hook/ability/monster/instability backlinks, source/file provenance, and attached diagnostics. Detailed presentation references stay hidden, root wand flags do not establish wand-item compatibility or eligibility, source frame values do not claim timing semantics, and AI hints, list options, damage/scaling/presentation/duration/`after`/bleed/skip-animation fields, effect controls, and buff conditions remain direct source metadata rather than fabricated formulas, countdowns, evaluation order, targeting, selection, probability, resistance, ignition, bleeding damage/duration/stacking, animation order/timing/synchronization, placement, playback, eligibility, consumption, or scheduling behavior. Unsupported nested buff mechanics remain visible as diagnostics rather than fabricated behavior, and sight modifiers do not claim a final visibility formula. Resolved spell references on item, stat, encrustment, and monster pages link to these routes.
- Every normalized skill has a stable static detail route with archetype, complete named/generic starting loadouts, ordered ability progression, source/file provenance, and attached diagnostics. Resolved named items link both ways; generic choices and unresolved names remain visible without fabricated item routes.
- Every normalized ability has a stable static detail route with its resolved or explicitly unresolved parent skill, starting/level position, resolved or explicitly unresolved spell triggers, source/file provenance, and attached diagnostics. Supported direct event-trigger shapes retain chance, delay, duration, resistance, and taxonomy metadata.
- Every normalized monster has a stable static detail route with taxonomy, dungeon-depth/special classification, source archetype levels and experience, inherited stat bonuses and AI casting chance, palette metadata, local loss-aware AI/sight/dig/dash/charge source metadata, resolved or explicitly unresolved on-hit/cast/on-death/dash/charge spell hooks, direct named or type-driven drops, resolved parent/direct-variant navigation, source/file provenance, and attached diagnostics. Exact one-in odds remain visible, resolved spells and named drop items link both ways, type-driven drops do not fabricate items, and the page does not present unverified derived combat totals or inherited sight/movement/drop behavior.
- A dataset with no standalone stat definitions exports successfully and explains that limitation without fabricating definitions.
- Search covers all nine generated entity kinds and supports shareable text,
  entity-type, source, category, and stat filters. Stat facets cover item,
  ability, spell, and encrustment declarations, use canonical reference keys
  where definitions exist, retain unresolved selectors loss-aware, and do not
  infer a cross-scope strength formula. Monster stat relationships remain on
  stat detail pages instead of duplicating inherited bonuses in search.
- Text matching requires every normalized query token. Exact and prefix name matches rank above description-only matches; ties are deterministic.
- A zero-result query offers at most five deterministic, user-selected spelling
  suggestions derived from entity names and aliases. Suggestions do not
  silently replace the query.
- Search renders at most 50 results at once and exposes the total match count and useful empty/reset states.
- Static browse catalogues expose every entity kind and direct detail link without JavaScript, render at most 100 records per page, and preserve an explicit empty page for kinds absent from the active dataset.
- A static dataset-health route exposes ordered source/version/precedence
  metadata, grouped exact diagnostics, linked affected records, ordered
  override steps, and reviewed patches without reading raw XML or exposing a
  local installation path.
- Item-to-stat and stat-to-item links do not produce broken routes for available definitions.
- Item-to-recipe and recipe-to-item links do not produce broken routes for resolved references.
- Item-to-encrustment and encrustment-to-item links do not produce broken routes for resolved references.
- Monster-to-item drop links and reciprocal item backlinks do not produce broken routes for resolved named drops.

## Data and safety acceptance

- Synthetic fixtures cover every published behavior and remain sufficient for CI.
- The canonical local official dataset imports and builds read-only with zero parser errors.
- Local paths, official databases/assets, and generated official derivatives
  remain outside Git and public output.
- Local visual parity may copy only assets referenced by entities/features shown
  by implemented pages into ignored generated output, without modifying the
  installation or bulk-copying unrelated resources.
- Unsupported constructs, dangling references, missing definitions, and precedence decisions remain measurable diagnostics.

## Quality acceptance

- Desktop and mobile keyboard flows pass for static browse with JavaScript disabled, item filters, global search filters, item details, stat details, recipe backlinks, encrustment backlinks, spell-effect navigation, item/skill/ability/loadout navigation, and monster-family/spell/drop navigation.
- Representative home, browse, search, item, stat, recipe, encrustment, skill, ability, spell, and monster pages have no automatically detected axe violations.
- `pnpm benchmark:search:official` enforces the accepted search artifact,
  parse, ordinary/suggestion query, exact/suggestion interaction, and
  desktop/slowed-mobile navigation budgets against the ignored canonical
  dataset. Concrete exact, multi-token, typo, and filter-isolation examples are
  part of ADR 0003's accepted relevance contract.

## Current progress

Implemented: versioned split search artifact, versioned source/patch provenance, deterministic query/filter and item/recipe/encrustment/skill/ability/spell/monster-drop relationship APIs, shareable all-entity search with fixed item-modifier facets and bounded user-selected zero-result spelling suggestions, bounded static all-entity browse catalogues, collision-safe canonical routes, a version-scoped route registry and source-ID aliases, static stat/recipe/encrustment/skill/ability/spell/monster routes, strict gem classification markers, loss-aware item artifact quality and armour declarations, direct item recovery/wand-charge values and trap activation/targeting/placement source metadata, signed item damage/resistance/primary/secondary modifiers, item/stat/crafting/encrusting/loadout/spell/monster-family/drop backlinks, cycle-safe effect traversal, loss-aware spell mana-cost source formulas, animation/impact presentation metadata, ordered buff-local descriptions and halo metadata, spell- and buff-local AI hints, typed effect-list options with reciprocal item/spell links, direct effect damage/scaling/presentation/duration, `after`, bleed, and skip-animation metadata, controls, and linked buff-presence conditions, buff source parameters, signed spell-buff direct and sight-radius modifiers, linked target/player hit buff event hooks, item/ability/monster spell-trigger normalization/linking/presentation including measured direct-trigger casing aliases and exact source flags, shared signed ability/encrustment/monster modifier normalization, skill/ability source metadata and dodge hooks, monster core stat/inheritance profiles, reciprocal spell links, local monster dig/dash/charge declarations, behavior spell hooks, and sound/sprite presentation metadata, direct named/type-driven drops, direct encrustment outcomes, the separately modeled shared instability-effect pool, explicit missing-definition/reference/cycle states, and synthetic desktop/mobile browser coverage including a JavaScript-disabled browse flow. Alternate pages are marked `noindex, follow` and expose the canonical in-app URL; final public canonical-link metadata remains part of the hosting/domain work.

The inherited route-registry publication lifecycle, the first incremental local
entity-asset import for item icons, and the separately versioned project-authored
62-selector stat reference are implemented. A static dataset-health/source-
decision route makes all verified diagnostics and every active override/patch
record discoverable across entity kinds. Other asset families remain page-driven.

Outstanding: approve this statement after parity polish, evaluate engine-derived
mechanics individually when their implementation is selected, and continue
representative comparisons with legacy behavior. The accepted stat reference
supplies names/categories only; descriptions, icons, and disputed formulas
remain outside it. Item quality has passed its separate synthetic,
official-data, artifact, patch, and responsive UI review.
