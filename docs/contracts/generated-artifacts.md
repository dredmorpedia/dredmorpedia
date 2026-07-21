# Generated artifact contract

Status: implemented foundation contract

The data pipeline writes a coordinated set of deterministic JSON files. Consumers must validate the declared versions and dataset identity before using them. Generated official-data derivatives remain ignored and non-public regardless of their schema validity.

## Files

### `artifact.json`

Dataset schema version: `3`

Contains the dataset ID/version, language, ordered versioned source summaries, normalized entity collections, and diagnostic counts. Search documents were removed from version 2 so normal page generation does not load the search payload. Version 3 requires source-version provenance and field-level `appliedPatches` history.

Every normalized entity has one canonical `slug` and a deterministically ordered `slugAliases` array. A valid version-scoped route registry may pin a canonical slug and historical aliases to an active entity; those routes are reserved before automatic allocation. Unregistered name collisions retain the unsuffixed route for the first entity in canonical identity order and assign stable identity-derived suffixes to the others. Unambiguous source original IDs become aliases. An automatic alias claimed by multiple entities, by another entity's canonical slug, or by a registered owner is omitted and reported as `slug_alias_conflict`; a reassigned colliding route is reported as `slug_collision`. Registry aliases remain authoritative.

Items include a non-negative integer `quality` field. The adapter reads a weapon-shaped record's root `level`, an armour record's nested `<armour level>`, or a trap record's nested `<trap level>`; all other item shapes use zero. Root `level` values on non-weapon records such as food and potions are not item quality.

Items also include a deterministic `triggers` array. Each trigger records its normalized event kind, canonical spell key and source name, optional resolved `spellId`, optional integer chance from 0 to 100 (`null` means unconditional), non-negative delay/duration, resistance flag, and optional monster taxonomy. The adapter covers the legacy type-specific weapon, food/booze, trap, wand, potion, and mushroom shapes plus direct combat/cast/effect trigger elements. Missing spell targets remain visible by name and emit a source-located dangling-reference diagnostic rather than a fabricated link.

The `spells` collection contains stable named entities with spell type, description, icon path, and a deterministic `effects` array. Effects preserve their source type, optional numeric amount, and optional spell/stat names and canonical keys. Resolved targets carry `spellId` or `statId`; dangling names remain visible and emit source-located diagnostics. Spell references form a directed graph that may contain cycles or repeated branches. Consumers must use cycle-safe traversal and must not interpret array nesting as an acyclic tree.

The `skills` collection preserves archetype, icon, ordered ability IDs, complete starting-loadout definitions, source flags, and progression tags. Each loadout retains an optional named item key/name/resolved `itemId`, optional generic item type, positive quantity, and whether it is always included. The compatibility `loadoutItemKeys` array remains derived from named entries. Generic type-only choices are not fabricated as items, and unresolved named items remain visible with diagnostics. Source flags retain their exact key/value pairs without invented behavior. Progression tags retain their non-negative level and source name in deterministic order.

The `abilities` collection preserves its parent skill key and optional resolved `skillId`, non-negative progression level, starting-ability flag, deterministic signed modifiers, source flags, recovery-buff amounts, currency-buff percent values, and deterministic spell triggers. Ability modifiers use the same `damage`, `resistance`, `primary`, and `secondary` shape as encrustments, including the source key and finite amount. Numeric primary/secondary source IDs remain explicit rather than being fabricated as standalone stat definitions. Recovery and currency arrays retain finite source numbers without claiming undocumented formulas; source flags retain exact key/value pairs. Ability triggers use the same event-kind/chance/delay/duration/resistance/taxonomy contract as item triggers and retain original spell names plus optional resolved `spellId`. The compatibility `spellKeys` and `spellIds` arrays remain derived from those triggers. Supported direct event hooks include the observed `<triggerondodge>` spelling as a dodge trigger. Activated `<spell>` records and all measured official skill/ability child elements are normalized.

The `monsters` collection preserves taxonomy, zero-based source level, effective one-based dungeon depth, special classification, icon and palette metadata, fighter/rogue/wizard source levels, local AI aggressiveness/span/invisible source metadata, optional experience value, deterministic signed stat bonuses, effective AI spell chance, deterministic spell hooks, direct drops, and optional parent identity. Description, taxonomy, depth, icon, palette, stat bonuses, and AI spell chance follow the verified nested-monster inheritance rules; a child's matching bonus overrides its parent while unrelated parent bonuses remain. Archetype levels, experience, AI aggressiveness/span/invisible values, spell-hook definitions, and drops stay local to the child record. AI numeric values are non-negative integers. The invisible flag is loss-aware: `true` and `false` retain explicit source values while `null` means the attribute was not supplied. All AI values remain descriptive source metadata, and the artifact does not infer their behavior. On-hit hooks retain their exact positive `oneChanceIn` denominator plus a rounded display percentage; aware-casting hooks retain the effective integer percentage from 0 through 100. Both retain original/canonical spell names and optional resolved `spellId`; missing targets remain visible with diagnostics. Each drop retains its integer chance from 0 through 100, defaulting an omitted source percentage to 100 per the legacy rule, and exactly one of two shapes: an original/canonical item name with an optional resolved `itemId`, or a game-defined `dropType`. The shared runtime guard rejects partial or mixed shapes. Named missing items remain visible with diagnostics; type-driven drops remain explicit without a fabricated item. These are source values, not fabricated derived combat totals or inherited drop behavior. Unmodeled AI fields and remaining presentation/behavior elements continue to emit diagnostics until their own verified slices normalize them.

The `encrustments` collection contains stable named entities with tool, visibility, non-negative skill level, signed instability, sorted applicable equipment slots, and ingredient item references. Resolved ingredients carry `itemId`; unresolved names remain visible and emit dangling-reference diagnostics. Direct outcomes are deterministic arrays of signed modifiers (`damage`, `resistance`, `primary`, or `secondary`, with their source key and amount), named power hooks with an optional probability from 0 to 1, and appearance descriptors. Numeric primary/secondary source IDs are preserved without invented stat definitions.

The top-level `encrustmentInstabilityEffects` array preserves the shared definitions stored outside individual encrustments. Each entry contains its name, canonical and original spell reference, optional resolved `spellId`, and source provenance. Missing names/spells and dangling spell references remain diagnostics. The source shape provides no effect weights, per-encrustment assignment, trigger rules, or complete risk formula, so the artifact does not invent those selection semantics or duplicate the pool onto every encrustment.

### `search.json`

Search schema version: `1`

Contains `datasetSchemaVersion: 3`, the matching dataset ID/language, and deterministic search documents. Each document has an entity ID, route, normalized text, entity/source/category facets, and item-stat facets. Monster documents use taxonomy as their category and include dungeon depth, fighter/rogue/wizard source levels, spell-hook names, and drop item/type names in normalized text. The web application loads this file only on search routes.

### `diagnostics.json`

Contains the stable, source-located diagnostics array for the same import. Entity records refer to entries by deterministic diagnostic ID.

### `manifest.json`

Manifest schema version: `2`

Contains sanitized input paths and checksums plus the byte length and SHA-256 checksum of `artifact.json`, `search.json`, and `diagnostics.json`. Machine-local absolute source paths must never appear in this file.

## Cross-file invariants

- Dataset IDs must match across normalized, search, and manifest artifacts.
- `search.json.datasetSchemaVersion` must equal `artifact.json.schemaVersion`.
- Inputs, entities, diagnostics, search documents, and manifest entries use deterministic ordering.
- Canonical route slugs are unique within an entity kind, and an alias never resolves to more than one canonical entity of that kind.
- Identical inputs and generator code must produce byte-identical files.
- Writes use per-file atomic replacement and are refused inside an input source root.
- The web layer fails its build on an unsupported artifact version rather than guessing at compatibility.

The source input, published-route registry, and patch-overlay contract is documented separately in [`source-manifest-and-patches.md`](source-manifest-and-patches.md).

## Evolution rules

- Increment the affected schema version for removed or reinterpreted fields, changed identity/ordering behavior, or any change that makes an older consumer unsafe.
- Additive fields may retain the current version only when older consumers can ignore them without changing meaning.
- `slugAliases` was added to schema version 2 under the additive rule. Consumers that support it should resolve aliases to the canonical entity and avoid indexing the alias as a separate record.
- Version 3 requires `datasetVersion`, source `version`, and entity `appliedPatches`. Regenerate version 2 local artifacts from their declared inputs; no compatibility reader is retained in the web application because no version 2 artifact was publicly released.
- Item `quality` was added to version 3 under the additive rule; consumers that do not display it can safely ignore it. Current web consumers reject schema 3 artifacts that predate the field and instruct maintainers to regenerate them.
- Item `triggers` was added to version 3 under the same additive rule. Current web consumers validate the trigger shape and require older local schema 3 artifacts to be regenerated.
- Spell records predate schema version 3, but the current web consumer now requires and validates their identity, diagnostic IDs, and effect-reference shape before generating spell routes. This strengthens validation without changing the artifact meaning or schema version.
- Skill `loadouts`, `sourceFlags`, and `progressionTags` plus ability `level`, `startSkill`, `modifiers`, `sourceFlags`, `recoveryBuffAmounts`, `currencyBuffPercents`, and `triggers` were added to version 3 under the additive rule. Current web consumers require and validate the richer records, so older local schema 3 artifacts must be regenerated. Existing key/ID arrays remain for compatibility and deterministic query use.
- Monster `depth`, `special`, palette metadata, `archetypeLevels`, `ai`, `experienceValue`, `modifiers`, `spellChance`, `triggers`, and `drops` were added to version 3 under the additive rule. Current web consumers require and validate the richer records, including the loss-aware invisible flag and exclusive drop shapes, so older local schema 3 artifacts must be regenerated.
- The `encrustments` collection was added to version 3 under the additive rule and later expanded with direct outcome arrays. Current web consumers require and validate the complete collection, so older local schema 3 artifacts must be regenerated.
- The top-level `encrustmentInstabilityEffects` array was added to version 3 under the additive rule. Current web consumers require and validate it, so older local schema 3 artifacts must be regenerated.
- Update domain types, pipeline serialization, runtime consumer checks, deterministic tests, this document, and a migration note in the same change.
- Do not retain a second compatibility implementation before a real published artifact requires it; generated local artifacts can be regenerated from approved inputs.
