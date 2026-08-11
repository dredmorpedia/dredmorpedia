# Generated artifact contract

Status: implemented foundation contract

The data pipeline writes a coordinated set of deterministic JSON files. Consumers must validate the declared versions and dataset identity before using them. Generated official-data derivatives remain ignored and non-public regardless of their schema validity.

## Files

### `artifact.json`

Dataset schema version: `3`

Contains the dataset ID/version, language, ordered versioned source summaries, normalized entity collections, and diagnostic counts. Source kinds include official base/expansion content, mods, fixtures, and separately versioned project-authored `reference` catalogues. Search documents were removed from version 2 so normal page generation does not load the search payload. Version 3 requires source-version provenance, ordered `appliedOverrides` history, and field-level `appliedPatches` history. Each override step retains its previous and replacement provenance plus the sorted normalized fields that differ; consumers must present the actual sequence rather than collapsing its endpoints.

Every normalized entity has one canonical `slug` and a deterministically ordered `slugAliases` array. A valid route registry may pin a canonical slug and historical aliases to an active entity; schema-2 tombstones additionally protect removed routes without creating an entity or redirect. All protected routes are reserved before automatic allocation. Unregistered name collisions retain the unsuffixed route for the first entity in canonical identity order and assign stable identity-derived suffixes to the others. Unambiguous source original IDs become aliases. An automatic alias claimed by multiple entities, by another entity's canonical slug, by an active registry owner, or by a tombstone is omitted and reported as `slug_alias_conflict`; a reassigned colliding route is reported as `slug_collision`. Active registry aliases remain authoritative.

Items include a non-negative integer `quality` field. The adapter reads a weapon-shaped record's root `level`, an armour record's nested `<armour level>`, or a trap record's nested `<trap level>`; all other item shapes use zero. Root `level` values on non-weapon records such as food and potions are not item quality.

Items also include an ordered `artifacts` array for direct artifact declarations. Each declaration preserves its nullable non-negative integer `quality`; `null` distinguishes an absent or invalid supplied quality from an item with no declaration. Repeated declarations remain repeated, and unknown attributes or nested content remain diagnostics. Consumers may present the declared quality but must not infer artifact-generation, corruption, or equipment behavior from it.

Items also include an ordered `armourDeclarations` array. Each declaration preserves a normalized nullable source slot, nullable non-negative source level, and nullable non-negative `randoms` value; `null` distinguishes an absent or invalid supplied value from zero. The semantic item category and non-negative item quality remain derived convenience fields, while repeated declarations remain loss-aware. Missing required slot/level values, invalid numbers, unknown attributes, text, and nested content remain diagnostics. Consumers may present the direct values but must not infer random-stat selection, rolling, or final equipment formulas.

Items also include an ordered `weaponDeclarations` array for the direct weapon values not represented by the existing category, quality, modifier, and trigger fields. Each declaration preserves a loss-aware floor-target flag and a safe optional thrown-presentation path. Both measured `canTargetFloor` casing variants normalize identically; `null` distinguishes an absent flag or invalid supplied token from an explicit false value. Repeated declarations remain repeated. Invalid booleans, unsafe paths, unknown attributes, text, and nested content remain diagnostics. Consumers may present floor targeting and presentation-reference coverage, but raw paths stay hidden and recoverability or combat behavior must not be inferred.

Items also include an ordered `macguffinDeclarations` array. Each declaration preserves paired nullable source/canonical spell names, an optional resolved `spellId`, a nullable source item-class name, and a loss-aware nullable consumable flag. Missing or dangling spells, invalid booleans, empty supplied class names, unknown attributes, text, and nested content remain diagnostics. Resolved spells link in both directions, and spell/class names contribute to deterministic search text. Consumers may present the direct values but must not convert them into an ordinary activation trigger or infer activation, targeting, or actual-consumption behavior.

Items also include an ordered `toolkitDeclarations` array. Each declaration preserves a nullable crafting tag, non-negative slot count, symbolic sound cue, safe missing/present/active/background presentation references, ordered numbered slot rectangles, output bounds, craft/recipe/autofill control references and positions, and a close position. Missing required tags/slot counts, invalid coordinates, partial groups, coordinates beyond the declared slot count, unsafe references, unknown attributes, text, and nested content remain diagnostics. Matching tags form deterministic computed recipe/encrustment relationships in both directions, while tags and sound cues contribute to search text. Detailed cue IDs, raw references, and coordinates stay hidden; consumers must not use old game-interface coordinates to lay out the modern site or infer ingredient placement, item consumption, control behavior, sound timing, or a complete crafting formula.

Each item also has a deterministic semantic `category` key. Weapon root type codes map to nine weapon classes; armour slot types plus the verified Orb/Tome overrides map to equipment categories; and food/booze, trap, wand, potion, mushroom, gem, toolkit, and reagent shapes map to named categories. Unrecognized records use `item`, while a non-numeric explicit fixture/mod type remains a normalized fallback. Consumers render category keys through project-owned labels rather than exposing engine codes. Category recognition does not imply that every attribute within a partially supported source element is normalized.

Items also include a deterministic `modifiers` array for fixed damage, resistance, primary, and secondary source values. Fixed weapon damage and direct damage/resistance modifier attributes retain their named source key and finite amount; primary/secondary declarations retain their numeric source ID and finite amount. An exact separately sourced stat definition may add a resolved `statId`, while the original kind/key/amount remains authoritative and an unavailable definition leaves `statId` absent. Repeated declarations remain repeated because item stacking/override semantics are not inferred. Damage-factor attributes and damage embedded in item effects remain outside this fixed-value shape and continue to be diagnosed explicitly.

Items also include ordered `recoveries` and `chargeRanges` arrays. A recovery preserves its `life` or `mana` resource, nullable non-negative integer source amount, and ordered exact source flags such as `meat=1`; `null` distinguishes an invalid supplied amount from an absent declaration. A wand charge range preserves nullable non-negative minimum and maximum source values. A complete range must not be inverted; invalid source ranges become fully unavailable with a diagnostic. Consumers may label these direct values but must not infer recovery timing, charge consumption, or behavior from additional source flags. Food, wand, potion, mushroom, and mushroom-associated casts leaves are fully validated.

Items also include an ordered `traps` array. Each declaration preserves a nullable `always`/`once` activation value, nullable non-negative source level, loss-aware caster-targeting flag, safe optional origin asset path, and nullable mount/facing source strings. The corresponding `casts` relationship remains in the item trigger array and a missing cast is diagnosed. Invalid activation, numeric, boolean, or unsafe path values become unavailable with diagnostics, and unknown attributes or nested content remain explicit. Consumers may present these direct declarations but must not infer reset timing, target-selection, or placement behavior. Raw origin asset paths stay out of rendered pages while publication rights remain unresolved.

Items also include a deterministic `triggers` array. Each trigger records its normalized event kind, canonical spell key and source name, optional resolved `spellId`, optional integer chance from 0 to 100 (`null` means unconditional), non-negative delay/duration, resistance flag, optional monster taxonomy, and ordered exact source flags. The adapter covers the legacy type-specific weapon, food/booze, trap, wand, potion, and mushroom shapes plus direct combat/cast/effect trigger elements, including both measured target/self hit casing forms. Direct trigger leaves are fully validated; the measured `after` flag is preserved without inferred timing semantics. Missing spell targets remain visible by name and emit a source-located dangling-reference diagnostic rather than a fabricated link.

The `spells` collection contains stable named entities with spell type, description, icon path, required nullable `sourceRadius`, `sourceCooldownTurns`, `sourcePerformsMeleeAttack`, `sourceWandFlag`, `itemConsumption`, and `mine` metadata, deterministic `manaCosts`, `boozeRequirements`, `zorkmidRequirements`, `shieldRequirements`, `weaponRequirements`, `animations`, `impacts`, and `buffs` arrays, and a deterministic `effects` array. `sourceRadius` preserves the root `radius` attribute as an exact non-negative integer; absence is `null`, while a malformed or negative supplied value becomes `null` with a source-located diagnostic. Consumers must not infer distance units, area shape, origin, target selection, obstruction handling, or runtime success from it. `sourceCooldownTurns` preserves the root `downtime` attribute as an exact non-negative integer; absence is `null`, while a malformed or negative supplied value becomes `null` with a source-located diagnostic. Consumers must not infer when cooldown starts, modifiers, actor eligibility, timing interactions, or runtime success from it. `sourcePerformsMeleeAttack` preserves the root `attack` attribute through the strict source-binary grammar: `1` is true, `0` is false, absence is `null`, and another supplied token becomes `null` with a diagnostic. It is root source metadata rather than a fabricated spell effect. Consumers must not infer attacker, target, weapon, damage, hit resolution, timing, or runtime success from it. `sourceWandFlag` preserves the root `wand` attribute through the same strict source-binary grammar. It does not establish whether or how a wand item may use the spell, item matching, charge use, targeting, eligibility, timing, or runtime success. A mana-cost declaration preserves a loss-aware non-negative base, Savvy-reduction coefficient, minimum, and optional signed-byte `sourceLevel`: `null` distinguishes an absent optional parameter or an invalid supplied value, with invalid values diagnosed. Both measured `savvyBonus` casing variants normalize identically. Only `<requirements>` declarations that supply `mp` enter `manaCosts`. Exact booze-only declarations enter `boozeRequirements` as ordered nullable signed-byte source values; a malformed or out-of-range supplied value becomes `null` with a source-located diagnostic. Zorkmid-family declarations enter `zorkmidRequirements` when they supply `zorkmids` or `zorkmidScaleF` without another known non-mana family. Each record preserves nullable positive-integer `sourceZorkmids` plus finite-number `sourceZorkmidScaleFactor` and `sourceSavvyBonus` fields; absent optional attributes stay `null`, while malformed supplied values are diagnosed. Exact shield-only and weapon-only declarations enter their respective requirement arrays as ordered nullable boolean source flags: the installed `dredbool` source shape accepts only `0` or `1`, and a malformed supplied value becomes `null` with a diagnostic. Other non-mana requirement shapes remain explicit `unsupported_spell_requirement` diagnostics located at the declaring requirement. The web presents the legacy mana expression—base minus the declared Savvy coefficient, bounded by the declared minimum—without inventing final in-game integer rounding. It exposes all other requirement fields only as uninterpreted source metadata and does not infer a zorkmid cost or Savvy formula, actor, inventory, available currency, payment, consumption or equipped-item state, weapon category, unlock, eligibility, progression, timing, runtime success, or other engine rule.

The nullable root spell `itemConsumption` record exists when either `consumeItem` or `consumeItemType` is supplied. `sourceConsumesItem` uses the strict source-binary grammar, while `sourceItemType` preserves the exact nonblank source token after the XML adapter's established whitespace normalization. Missing optional fields remain `null`; malformed flags and empty supplied type tokens become `null` with source-located diagnostics. The source declaration does not establish an actor, item selection or matching rule, inventory state, transformation behavior, timing, eligibility, actual consumption, or runtime success.

The nullable root spell `mine` record exists when any supported mine-family attribute is supplied. It preserves strict binary enabled/glint/unobstructed flags; nullable nonnegative radius, timer, permanence, sprite draw-order, glint-density, and frame parameters; and safe hidden static/animated presentation references. The two measured `mineSpritePNGSeries`/`minespritePNGSeries` casing forms normalize identically, with a diagnostic and deterministic canonical-casing precedence when both are supplied. `minePermanent` remains an exact integer because the canonical source contains `0`, `1`, and `2`; consumers must not coerce it to a boolean. Invalid supplied values become `null` with source-located diagnostics. Consumers must not infer placement, radius geometry, obstruction evaluation, lifetime, trigger timing, persistence, presentation timing units, draw behavior, glint behavior, or runtime success. The web reports reference availability without exposing source sprite paths while publication rights remain unresolved.

Each ordered spell animation preserves a safe normalized sprite prefix, nullable non-negative frame count/rate/first-frame parameters, loss-aware centered and synchronized flags, and an optional symbolic sound cue. Observed `frames`/`num`, `firstframe`/`first`, and `centerEffect`/`centereffect` aliases normalize identically. Invalid supplied numbers or booleans become `null` with diagnostics. A missing sprite reference is diagnosed; an unsafe absolute or traversal reference is rejected. Spell sprite values identify frame families rather than concrete files, so they pass a path-safety boundary without a fabricated file-existence check. Consumers must not infer timing units or runtime behavior from the source values. The spell page exposes parameters and reference coverage without rendering detailed sprite prefixes or sound cue IDs while the asset-publication policy remains unresolved.

Each ordered spell impact declaration uses the same loss-aware frame-presentation shape but remains a separate `impacts` array so consumers do not conflate casting animation with hit presentation. The measured source uses `sprite`, `frames`, `framerate`, optional `firstframe`, both observed centered-effect casing variants, optional `sync`, and optional `sfx`. Impact references receive the same path-safety and hidden-reference treatment as animations; consumers must not infer timing units, target behavior, or a relationship to direct effect resolution.

Each buff preserves local presentation paths; nullable non-negative timer, duration, mana/Zorkmid upkeep, hit/attack limit, and stack-limit parameters; loss-aware removable, self-targeting, resistable, detrimental, stackable, and allow-stacking declarations; exact additional source flags; and deterministic signed damage, resistance, primary, and secondary modifiers. Invalid supplied numbers or booleans become `null` with diagnostics. Measured root-attribute and modifier-element casing aliases normalize identically. Numeric primary/secondary IDs remain source IDs; an exact reference-catalogue match may additionally resolve `statId` without changing the source value or implying a formula. Unsupported nested mechanics remain explicit diagnostics, and consumers must not infer stacking, trigger, currency, or combat formulas from these parameters.

Each buff also contains a deterministic `eventHooks` array for the measured target-hit, player-hit, and dodge spell relationships. The dodge relationship comes from the canonical source's lowercase `<dodgebuff>` spelling; the installed validation schema and preserved trigger label use `dodgeBuff`. A hook preserves its event kind, original/canonical spell reference, optional resolved `spellId`, nullable integer chance from 0 through 100, and exact additional source flags such as `after` where supported. Missing names or required chances, invalid chances, unknown content, and dangling named targets remain explicit diagnostics. Consumers may present the declared condition and chance but must not infer event eligibility, evaluation order, timing, target selection, or runtime success, assign timing semantics to `after`, or fold a conditional hook into an unconditional direct-effect chain.

Each buff also contains an ordered `sightModifiers` array for direct `<sightbuff>` declarations. Each entry preserves a nullable signed finite amount: `null` means the source amount was absent or invalid, and invalid or missing values are diagnosed. The source element establishes the `Sight radius` label, but consumers must not infer final visibility, darkness, or stacking behavior or fabricate a standalone stat definition from it.

Each buff also contains ordered `invisibilityDeclarations` and `muteDeclarations` arrays. Both retain a nullable non-negative integer source amount; absence is valid and malformed supplied values become `null` with diagnostics. The preserved application establishes the `Invisibility` and `Prevents Casting` labels but does not interpret either amount. Consumers must not infer visibility/detection behavior or affected actor/spell selection, strength, amount meaning, immunity, resistance, stacking, duration, removal, or runtime success from these source markers.

Each buff also contains an ordered `senseWallsDeclarations` array for direct `<senseWallsFlag>` children. Every declaration preserves a nullable game-boolean `enabled` value; missing required or malformed source flags become `null` with diagnostics. The preserved application does not interpret this element. Consumers must not infer detection range, revealed terrain, actor scope, interaction with sight modifiers, stacking, duration, or runtime success from the source marker.

Each buff also contains an ordered `paybackDeclarations` array for direct
`<payback>` children. Every declaration preserves a nullable game-boolean
`secondaryScale` source flag and a nullable finite decimal `factor` read from
the required `paybackF` attribute. Missing or malformed required values become
`null` with diagnostics, and unknown content remains diagnosed. The preserved
application does not parse these attributes. Consumers must not infer a base
amount or source stat, health relationship, damage return, trigger or event
timing, caps, stacking, eligibility, or a final formula, and must not fabricate
a relationship to the separate spell named `Payback`.

Each buff also contains an ordered `zorkmidAbsorptionDeclarations` array for
direct `<zorkmidAbsorption>` children. Every declaration preserves nullable
signed-byte `zorkmidsPerDamage` and `damageCap` source values plus a nullable
finite decimal `maxRatio`. Missing, malformed, or out-of-range required values
become `null` with diagnostics, and unknown content remains diagnosed. The
installed schema establishes only this source shape; the preserved application
does not parse the child. Consumers must not derive a currency cost or
damage-mitigation formula, cap application, target, timing, eligibility,
stacking, duration, or runtime success from these parameters.

Each buff also contains an ordered `polymorphDeclarations` array. A declaration retains nullable paired source monster name/key fields and an optional resolved `monsterId`. Missing or blank targets remain present as a null pair and are diagnosed; named missing targets remain visible with a dangling-reference diagnostic; resolved targets link in both directions. The preserved application establishes only the `Polymorph` label and reads the source `name` as a monster type. Consumers must not infer transformation duration, stat or ability replacement, equipment behavior, targeting, faction, reversibility, or runtime success.

Each buff also contains a required deterministic `effects` array for direct
`<effect>` children nested inside that buff. Entries use the same strict,
loss-aware effect shape and relationship linker as the spell's direct
`effects`, while containment preserves their declared buff scope. Domain effect
chains and reciprocal backlinks include both scopes. Consumers must not infer
scheduling, trigger order, buff lifetime, tick timing, eligibility, or runtime
success from this containment.

Effects preserve their source type, optional numeric amount, optional spell/stat names and canonical keys, required loss-aware `itemTarget`, `monsterTarget`, and `removedBuff` objects, a required ordered `damage` array, a required loss-aware `scaling` object, required nullable loss-aware `presentation`, a required loss-aware `controls` object, a required loss-aware `conditions` object, and a required ordered `options` array.

Direct item targets are normalized only on `spawn` and `spawnitematlocation` effects. The required record retains nullable paired item name/key fields and an optional resolved `itemId`; both the measured `itemname` spelling and validation-schema `itemName` spelling normalize identically. An explicitly blank target and simultaneous aliases remain diagnosed. Absence remains a valid null pair because the canonical data includes an item-spawning effect whose concrete selection is not declared in XML. Resolved targets link in both directions. Source-only labels remain visible without a fabricated entity or dangling-reference warning because they may name engine selectors or hard-coded concepts. Consumers must not infer random selection, inventory placement, availability, timing, or other spawning behavior.

Direct monster targets are normalized only on the measured `summon` and `summonhostile` effect types. The required record retains nullable paired monster name/key fields and an optional resolved `monsterId`. An explicitly blank target remains diagnosed, while true absence is valid because the canonical data contains both summon types without a declared target. Named missing targets remain visible and emit dangling-reference diagnostics; resolved targets link in both directions. Optional effect `amount` remains a direct source value rather than receiving the historical display default. Consumers must not infer availability, allegiance, placement, lifetime, AI state, selection, creation timing, or other runtime spawning behavior.

Named buff-removal targets are normalized only on `removebuffbyname` effects. The required `removedBuff` record retains nullable paired spell name/key fields and an optional resolved `spellId`. A missing or explicitly blank target is diagnosed; a named missing target remains visible with a dangling-reference diagnostic; and resolved targets link in both directions without entering the ordinary spell-effect trigger chain. Consumers must not infer eligibility, actor or area, evaluation order, timing, stack selection, removal count, interaction with removable flags, or runtime success.

Damage declarations normalize the 16 measured damage source keys on `damage` and `drain` effects. A declaration exists when its direct amount or matching `F` factor attribute was supplied and preserves each value as a nullable non-negative finite number; `null` distinguishes an absent side of the pair or invalid supplied value. Factor-only declarations remain factor-only. Scaling preserves nullable non-negative `amountF` and `floorScaleF` coefficients on their measured effect types plus nullable non-negative integer primary/secondary source stat IDs. Both measured `primaryScale` casing variants normalize identically. Invalid numbers, simultaneous primary aliases, simultaneous primary/secondary selectors, and attributes on unsupported effect types remain diagnosed. Consumers may disclose the direct values but must not combine damage amounts, factors, selectors, or undeclared engine defaults into a final damage, healing, mana, spawn, or combat formula.

Presentation is `null` when no modeled effect presentation attribute is
supplied. Otherwise it retains safe nullable large/small icon paths and sprite
prefix, nullable non-negative integer frame count/rate, nullable centered flag,
and nullable non-blank symbolic sound cue. The measured icon pair occurs on a
buff-local effect. Unsafe paths, invalid values, blank supplied cues, and
unknown extensions remain diagnosed. The page exposes reference availability
and direct values while hiding raw icon, sprite, and sound identifiers.
Consumers must not infer timing units, animation order, target placement,
synchronization, sound playback, or other engine behavior. Separate spell
animation/impact and buff-halo declarations are not conflated with this
record.

Every effect separately requires nullable `createdObjectSpritePath` and
`regenerateGraphics` fields. The created-object reference is normalized only
for `create` effects from the direct `objectSprite` attribute, must be a safe
relative concrete asset path, and receives the ordinary existence/input
registration check. The graphics-regeneration flag is normalized only for
`dig` effects from the direct `regengfx` attribute and preserves explicit true
and false. Attributes on other effect types remain diagnostics. Consumers may
disclose reference availability and the source flag, but must not infer
created-object type or lifetime, terrain changes, graphics-redraw timing,
placement, persistence, or runtime success.

Every effect also requires a nullable `buffTag` field. A supplied value retains
the exact non-blank source token; an absent attribute is `null`, and a supplied
blank token becomes `null` with a source-located diagnostic. The installed
schema permits the attribute on the general effect shape, so direct and
buff-local effects share the same contract. The token is not resolved to an
entity or relationship. Consumers may disclose it but must not infer tag
matching, buff or curse selection, removal behavior, target scope, evaluation
order, timing, or runtime success.

Controls retain nullable non-negative effect duration in turns, the direct
`after` source flag, source chance from `percent`/`percentage`, caster targeting
from both measured casing aliases, self targeting, corpse targeting,
resistance, burn, bleed, the direct damage-effect `midas` source flag,
skip-animation from `skipAnimation`/`skipanimation`, and taxonomy values.
Duration is a direct integer source declaration; percentages are integers from
0 through 100; flags preserve explicit true/false while `null` distinguishes
absence or malformed input; taxonomy is a non-blank source token or `null`.
`midas` is recognized only on the measured `damage` effect type, and the same
attribute on an unrelated type remains diagnosed. Dual aliases, invalid
values, and blank supplied taxonomy remain diagnosed. Consumers may disclose
these direct controls but must not combine them into countdown, evaluation
order, delay, scheduling, target eligibility, resistance, ignition, bleeding
damage/duration/stacking, gold conversion eligibility or value, target
transformation, drops, persistence, animation order/timing/synchronization, or
runtime probability behavior.

Conditions are normalized only on the measured `trigger` and `dot` effect types. They preserve a nullable source-buff requirement from the `requirebuff`/`requireBuff` aliases plus required and forbidden named-buff pairs from `requirebuffontrigger`/`requirebuffontriggername` and `requirebuffonnottrigger`/`requirebuffonnottriggername`. Flags are loss-aware nullable booleans. Named conditions retain nullable paired source/canonical spell names and optional resolved spell IDs; resolved targets link in both directions, while dangling names remain visible and diagnosed. Invalid flags, blank names, incomplete pairs, and simultaneous aliases remain diagnosed. Consumers may disclose these direct declarations but must not infer buff-presence evaluation order, trigger eligibility, duration, consumption, timing, or interaction with other effect controls.

Options are normalized only for the measured `spawnitemfromlist` and `triggerfromlist` parent types. Item options retain nullable paired item name/key fields, optional resolved `itemId`, and a nullable positive direct source amount; every named item option also carries the shared loss-aware `itemResolution` record. Exact and reviewed-correction states require a matching target/compatibility ID, reviewed source-only states require a stable review ID and carry no target, and unresolved states keep the original source label without a target. Reviewed corrections are version/source/owner/relationship/label/target-scoped, retain the original source label plus a stable review ID, and emit `reviewed_correction_reference`; they are encyclopedia resolutions, not source patches or global aliases. Missing or blank item targets carry no resolution. Spell options retain nullable paired spell name/key fields and an optional resolved `spellId`. Missing or blank option targets and invalid amounts remain present as `null` with diagnostics. Unexpected option attributes, children, and text remain diagnostics, and `<option>` under any other effect type stays unsupported. Resolved targets link in both directions; unresolved names remain visible and emit source-located diagnostics, while narrowly reviewed source-only labels emit informational audit records without fabricating entity links. List order is preserved, but consumers must not infer weights, probabilities, eligibility, fallback behavior, or runtime spawning/triggering from position or repetition.

Direct spell references form a directed graph that may contain cycles or repeated branches. Consumers must use cycle-safe traversal and must not interpret array nesting as an acyclic tree. `triggerfromlist` options are displayed as potential source-declared targets and backlinks but are not added to the recursive effect-chain traversal because their selection and execution semantics are unavailable.

The `skills` collection preserves archetype, icon, ordered ability IDs, complete starting-loadout definitions, source flags, and progression tags. Each loadout retains an optional named item key/name/resolved `itemId`, optional generic item type, positive quantity, and whether it is always included. Every named loadout also carries an `itemResolution` record. Its states are exact or reviewed-correction `resolved`, explicitly reviewed `source-only`, and `unresolved`; every state retains the original source label and expected target kind. Reviewed states require a stable review ID, resolved states carry the target ID, and the compatibility `itemId` must match that target. Type-only choices carry no item resolution and are not fabricated as items. The compatibility `loadoutItemKeys` array remains derived from named entries. Unresolved named items remain visible with diagnostics; source-only classification is not inferred merely because a target is absent. Source flags retain their exact key/value pairs without invented behavior. Progression tags retain their non-negative level and source name in deterministic order.

The `abilities` collection preserves its parent skill key and optional resolved `skillId`, non-negative progression level, starting-ability flag, deterministic signed modifiers, source flags, recovery-buff amounts, currency-buff percent values, and deterministic spell triggers. Ability modifiers use the same `damage`, `resistance`, `primary`, and `secondary` shape as encrustments, including the source key, finite amount, and optional exact `statId` resolution. Numeric primary/secondary source IDs remain explicit even when named. Recovery and currency arrays retain finite source numbers without claiming undocumented formulas; source flags retain exact key/value pairs. Ability triggers use the same event-kind/chance/delay/duration/resistance/taxonomy/source-flag contract as item triggers and retain original spell names plus optional resolved `spellId`. The compatibility `spellKeys` and `spellIds` arrays remain derived from those triggers. Supported direct event hooks include the observed `<triggerondodge>` spelling as a dodge trigger. Activated `<spell>` records and all measured official skill/ability child elements are normalized.

The `monsters` collection preserves taxonomy, zero-based source level, effective one-based dungeon depth, special classification, icon and palette metadata, fighter/rogue/wizard source levels, local AI aggressiveness/span/invisible/chicken/charm/paralyze/steal source metadata, local sight cone/modifier source metadata, local dig/dash/charge movement metadata, local sound/sprite presentation metadata, optional experience value, deterministic signed stat bonuses, effective AI spell chance, deterministic spell hooks, direct drops, and optional parent identity. Description, taxonomy, depth, icon, palette, stat bonuses, and AI spell chance follow the verified nested-monster inheritance rules; a child's matching bonus overrides its parent while unrelated parent bonuses remain. Repeated local bonuses with the same kind and source key emit `duplicate_monster_modifier` and use the last source declaration before sorting and inheritance, so each effective monster modifier pair is unique. Archetype levels, experience, AI/sight/movement/presentation source metadata, spell-hook definitions, and drops stay local to the child record.

AI numeric values are non-negative integers; steal percentage is constrained to 0 through 100. The five AI boolean flags are loss-aware: `true` and `false` retain explicit source values while `null` means the attribute was not supplied or a supplied token was invalid. Invalid supplied boolean tokens emit an `invalid_boolean` diagnostic rather than being silently represented as disabled. Both observed spell/steal percentage casing variants normalize identically. Sight cone and modifier are loss-aware non-negative finite numbers; `null` means that individual attribute was not supplied. Movement is an object with nullable `dig`, `dash`, and `charge` declarations. Dig preserves percentage, ambush percentage, blocked percentage, minimum/maximum turns, and minimum distance. Dash preserves chance, speed, minimum distance, and the loss-aware source `interruptable` flag as `interruptible`. Charge preserves chance, range, turns, and loss-aware interruptible/blocks-action/targets-self flags. Percentage fields are integers from 0 through 100, other numeric fields are non-negative integers, and `null` distinguishes an absent declaration or attribute. All AI, sight, and movement values remain descriptive source metadata; the artifact does not infer a complete behavior formula. Unrecognized attributes and nested child elements remain explicit diagnostics.

Presentation is a required object with nullable declarations for sound effects, attack/hit/death/cast/beam animations, morph states, and dig animations. A supplied declaration preserves every measured attribute as a nullable string so an absent element, an absent attribute, and a concrete reference remain distinct. Sound values are symbolic engine cue IDs rather than filesystem paths. Sprite values pass through the same normalized safe-path boundary as other asset references and emit missing/unsafe asset diagnostics when applicable. Presentation declarations remain local rather than inheriting from a parent. The monster page summarizes cue and animation coverage without rendering the detailed engine references while the asset-publication policy remains unresolved.

On-hit hooks retain their exact positive `oneChanceIn` denominator plus a rounded display percentage; aware-casting hooks retain the effective integer percentage from 0 through 100. On-death, dash-hit, dash-miss, and charge hooks retain their declared source percentage when available. Every hook retains its original/canonical spell name and optional resolved `spellId`; missing targets remain visible with diagnostics. Each drop retains its integer chance from 0 through 100, defaulting an omitted source percentage to 100 per the legacy rule, and exactly one of two shapes: an original/canonical item name with an optional resolved `itemId`, or a game-defined `dropType`. The shared runtime guard rejects partial or mixed shapes. Named missing items remain visible with diagnostics; type-driven drops remain explicit without a fabricated item. These are source values, not fabricated derived combat totals or inherited movement/drop behavior. All measured official monster child elements are normalized. Consumers may use the pure domain calculation to derive the six independently verified primary attributes from archetype levels and effective inherited primary modifiers; disputed Life, Mana, secondary-stat, and combat formulas remain unavailable and are not stored in the artifact.

The `encrustments` collection contains stable named entities with tool, visibility, non-negative skill level, signed instability, sorted applicable equipment slots, and ingredient item references. Resolved ingredients carry `itemId`; unresolved names remain visible and emit dangling-reference diagnostics. Direct outcomes are deterministic arrays of signed modifiers (`damage`, `resistance`, `primary`, or `secondary`, with their source key, amount, and optional exact `statId` resolution), named power hooks with an optional probability from 0 to 1, and appearance descriptors. Numeric primary/secondary source IDs remain preserved even when named.

The `stats` collection accepts standalone source definitions and separately versioned project reference definitions. A stat may carry one nullable modifier selector containing an exact modifier kind and non-empty source key. Selectors are optional because named source relationships can exist independently; when supplied, each selector must be unique across the resolved dataset. Exact selector matches add `statId` to item, encrustment, ability, spell-buff, and monster modifiers. Missing definitions leave raw selectors visible, while ambiguous definitions emit an error and remain unlinked. The canonical project catalogue contains only independently authored names/categories and verified selectors; it carries no copied legacy prose, icon paths, or gameplay formulas.

The `templates` collection contains stable targeting-pattern entities with a lossless ordered `rows` array and an `affectsPlayer` flag. Each non-empty rectangular grid uses only `.` for an unaffected tile, `@` for an affected tile, and exactly one `#` for the player or selected-target anchor. Rows are not padded or reshaped by the adapter. The current web consumer validates this shape before rendering a static, labelled area-of-effect preview and rejects stale or malformed schema 3 artifacts instead of guessing at cell semantics. An empty rows array remains valid so incomplete input has an explicit page state.

The top-level `encrustmentInstabilityEffects` array preserves the shared definitions stored outside individual encrustments. Each entry contains its name, canonical and original spell reference, optional resolved `spellId`, and source provenance. Missing names/spells and dangling spell references remain diagnostics. The source shape provides no effect weights, per-encrustment assignment, trigger rules, or complete risk formula, so the artifact does not invent those selection semantics or duplicate the pool onto every encrustment.

### `search.json`

Search schema version: `2`

Contains `datasetSchemaVersion: 3`, the matching dataset ID/language, and deterministic search documents. Each document has an entity ID, canonical route, ordered route aliases, normalized text, entity/source/category facets, and stat facets. Route aliases are part of normalized text and are the only candidates beyond canonical names for project-owned zero-result spelling suggestions. Resolved item, ability, spell, and encrustment declarations use one canonical stat key; unresolved selectors keep collision-safe `modifier:<kind>:<source-key>` identities. The web derives labels and selector-shaped URL aliases from the verified active stat catalogue, omits definitions unused by searchable records, and never ranks heterogeneous declarations through an inferred gameplay formula. Monster documents use taxonomy as their category and include dungeon depth, fighter/rogue/wizard source levels, spell-hook names, and drop item/type names in normalized text, but their inherited modifier sets remain discoverable through stat-page backlinks rather than duplicated as search facets. The web application loads this file only on search and bounded browse routes. The pipeline serializes this transfer-facing file without presentation whitespace while retaining stable object-key and document ordering plus a final newline. This representation-only compaction does not change search schema 2 or its query behavior; the manifest records the compact bytes and checksum.

### `diagnostics.json`

Contains the stable, source-located diagnostics array for the same import. Entity records refer to entries by deterministic diagnostic ID.

The static web `/dataset/` route may group these diagnostics by their stable
severity/code pair and link a supplied `entityId` to the matching active
record. It must retain each exact message and sanitized source location, leave
diagnostics without an active entity unlinked, and consume diagnostics only as
part of the already verified atomic artifact set. This presentation does not
authorize raw source-manifest/XML reads or machine-local path disclosure.

### `manifest.json`

Manifest schema version: `2`

Contains sanitized input paths and checksums plus the byte length and SHA-256 checksum of `artifact.json`, `search.json`, and `diagnostics.json`. Each text-input checksum is calculated from the same byte snapshot decoded for parsing; the source manifest, database XML, patch files, and route registry are not reread during checksum finalization. Referenced assets are checksummed when first registered and are likewise not reread at the end of the import. Machine-local absolute source paths must never appear in this file. The pipeline publishes this file last as the commit marker for the output set.

## Presented asset set

Presented asset catalog schema version: `1`

The current incremental scope is `item-icon` only. After normalization and
precedence resolution, every item with a non-null icon reference is matched to
the exact asset bytes captured when that safe, real-path-contained reference
was first registered. The copy stage never rereads the installation. It accepts
only `.png` references with the PNG signature; missing inputs, other formats,
and invalid signatures produce stable warning diagnostics and no broken web
reference.

The ignored managed output at
`apps/web/public/generated-assets/current/` contains:

- `assets.json`, with schema version, dataset ID/version, and deterministic
  `item-icon` records mapping an entity ID to a content-addressed file, byte
  length, and full SHA-256 checksum;
- `diagnostics.json`, with deterministic fallback diagnostics that retain only
  entity, source, kind, code, severity, and a non-path-bearing message;
- `files/<sha256>.png`, deduplicated by complete content checksum; and
- `manifest.json`, with dataset identity, diagnostic counts, and byte/checksum
  declarations for the catalog and diagnostics.

The writer requires a dedicated repository-contained directory that does not
overlap any source root. It replaces only a directory carrying its exact
ownership marker, stages and verifies the complete set beside the target,
swaps the directory, and publishes the manifest last inside the staged set.
This prevents stale assets from another selected dataset entering a static
export. The web verifies catalog/diagnostic checksums and schemas, dataset ID
and version, diagnostic counts, unique entity mappings, safe content-addressed
paths, and every copied file's byte length/checksum before returning an icon
URL. The manually constructed URL includes the configured Next.js base path.

Generated official assets remain local-only and ignored. Adding another asset
kind requires an implemented page that displays it, corresponding diagnostics
and consumer validation, and a policy review for any specialized conversion.

## Cross-file invariants

- Dataset IDs must match across normalized, search, and manifest artifacts.
- `search.json.datasetSchemaVersion` must equal `artifact.json.schemaVersion`.
- Inputs, entities, diagnostics, search documents, manifest entries, and serialized object keys use the shared UTF-16 code-unit comparator for deterministic ordering independent of host ICU/CLDR data. Locale-aware sorting is presentation-only.
- Canonical route slugs are unique within an entity kind, and an alias never resolves to more than one canonical entity of that kind.
- Serialized asset and presentation references are slash-normalized relative paths. POSIX/Windows absolute paths, Windows drive-relative paths, and `..` traversal are invalid; symbolic sound cue IDs are not path fields.
- Identical inputs and generator code must produce byte-identical files.
- One sanitized input path identifies one resolved source for the duration of
  an import. Conflicting resolutions fail instead of silently replacing a
  checksum. Repeated text consumption reuses its first byte snapshot; a text
  input first registered as an asset is decoded from those captured bytes
  without rereading the source.
- Writes use collision-resistant temporary names and per-file atomic replacement, publish the manifest last, and are refused when the real output path overlaps an input source root in either direction. Junctions and symbolic links do not bypass the boundary.
- Publication can opt into a zero-error diagnostic gate. The official-data commands always enable it and refuse to replace any output file when the import contains one or more error diagnostics. Synthetic generation leaves it disabled because the fixture intentionally covers an invalid XML input.
- Consumers must read all files from the directory containing the selected manifest and verify every declared byte length and SHA-256 checksum before parsing an output. An interrupted or mixed publication is an error, not a partially usable dataset.
- A configured presented asset set must identify the exact active dataset and
  version. Missing or invalid individual item art falls back during import;
  missing, mixed, tampered, or stale generated set metadata fails the web build.
- The web consumer initializes `artifact.json`, `search.json`, and
  `diagnostics.json` as one atomic in-memory set. It verifies every checksum and
  schema plus dataset identity, search derivation, diagnostic counts/IDs, and
  entity diagnostic references before any public loader returns. No
  independently valid member is cached after another member fails.
- The web layer validates every required top-level, entity, search-document, provenance, and diagnostic field; enforces safe route and asset-reference shapes plus unique same-kind canonical/alias ownership; checks dataset/search/diagnostic cross-file invariants; and fails its build on unsupported, incomplete, or stale artifacts rather than guessing at compatibility.

The source input, published-route registry, and patch-overlay contract is documented separately in [`source-manifest-and-patches.md`](source-manifest-and-patches.md).

The shared integer and finite-number token grammar used before numeric artifact
fields are constructed is documented in
[`numeric-source-lexemes.md`](numeric-source-lexemes.md).

## Evolution rules

- Increment the affected schema version for removed or reinterpreted fields, changed identity/ordering behavior, or any change that makes an older consumer unsafe.
- Additive fields may retain the current version only when older consumers can ignore them without changing meaning.
- `slugAliases` was added to schema version 2 under the additive rule. Consumers that support it should resolve aliases to the canonical entity and avoid indexing the alias as a separate record.
- Version 3 requires `datasetVersion`, source `version`, and entity `appliedPatches`. Regenerate version 2 local artifacts from their declared inputs; no compatibility reader is retained in the web application because no version 2 artifact was publicly released.
- Item `quality` was added to version 3 under the additive rule; consumers that do not display it can safely ignore it. Current web consumers reject schema 3 artifacts that predate the field and instruct maintainers to regenerate them.
- Item `artifacts` was added to version 3 under the same additive rule. Current web consumers require the ordered loss-aware declaration shape, so earlier local schema 3 artifacts must be regenerated.
- Item `armourDeclarations` was added to version 3 under the same additive rule. Current web consumers require the ordered loss-aware source shape, so earlier local schema 3 artifacts must be regenerated.
- Item `weaponDeclarations` was added to version 3 under the same additive rule. Current web consumers require the ordered loss-aware floor-target/presentation shape, so earlier local schema 3 artifacts must be regenerated.
- Item `macguffinDeclarations` was added to version 3 under the same additive rule. Current web consumers require the ordered loss-aware reference/class/consumable shape, so earlier local schema 3 artifacts must be regenerated.
- Item `toolkitDeclarations` was added to version 3 under the same additive rule. Current web consumers require the complete loss-aware tag/slot/presentation/layout shape, so earlier local schema 3 artifacts must be regenerated.
- Item `triggers` was added to version 3 under the same additive rule and later gained required ordered `sourceFlags`. Current web consumers validate the complete trigger shape and require older local schema 3 artifacts to be regenerated.
- Required item `recoveries` and `chargeRanges` were added to version 3 under the same additive rule. Current web consumers require the loss-aware source-value shapes and valid complete ranges, so earlier local schema 3 artifacts must be regenerated.
- Required item `traps` were added to version 3 under the same additive rule. Current web consumers require the complete loss-aware behavior/presentation shape, so earlier local schema 3 artifacts must be regenerated.
- Required item `modifiers` were added to version 3 under the same additive rule. Current web consumers require finite shared modifier records, so earlier local schema 3 artifacts must be regenerated.
- Item `category` retained its schema-3 string shape but changed from a raw root attribute to a semantic, deterministic facet. No artifact was publicly released; local artifacts and search indexes must be regenerated together.
- Spell records predate schema version 3, but the current web consumer now requires and validates their identity, diagnostic IDs, and effect-reference shape before generating spell routes. This strengthens validation without changing the artifact meaning or schema version.
- Required spell `manaCosts` were added to version 3 under the additive rule. Current web consumers require the loss-aware non-negative shape, so older local schema 3 artifacts must be regenerated.
- Required spell `boozeRequirements` were subsequently added under the same rule. Current web consumers require the ordered nullable signed-byte source-value shape, so earlier local schema 3 artifacts must be regenerated.
- Required spell `zorkmidRequirements` were subsequently added under the same rule. Current web consumers require the ordered loss-aware positive-integer-and-decimal source shape, so earlier local schema 3 artifacts must be regenerated.
- Required spell `shieldRequirements` were subsequently added under the same rule. Current web consumers require the ordered nullable source-boolean shape, so earlier local schema 3 artifacts must be regenerated.
- Required spell `weaponRequirements` were subsequently added under the same rule. Current web consumers require the ordered nullable source-boolean shape, so earlier local schema 3 artifacts must be regenerated.
- Required spell `sourceCooldownTurns` was subsequently added under the same
  rule. Current web consumers require the nullable non-negative source value,
  so earlier local schema 3 artifacts must be regenerated.
- Required spell `sourcePerformsMeleeAttack` was subsequently added under the
  same rule. Current web consumers require the nullable strict source-binary
  value, so earlier local schema 3 artifacts must be regenerated.
- Required spell `sourceWandFlag` was subsequently added under the same rule.
  Current web consumers require the nullable strict source-binary value, so
  earlier local schema 3 artifacts must be regenerated.
- Required spell `sourceRadius` was subsequently added under the same rule.
  Current web consumers require the nullable non-negative source integer, so
  earlier local schema 3 artifacts must be regenerated.
- Required nullable spell `itemConsumption` metadata was subsequently added
  under the same rule. Current web consumers require and validate its complete
  loss-aware source flag and token shape, so earlier local schema 3 artifacts
  must be regenerated.
- Required nullable spell `mine` metadata was subsequently added under the same
  rule. Current web consumers require and validate its complete loss-aware
  mechanic, placement, and safe hidden presentation shape, so earlier local
  schema 3 artifacts must be regenerated.
- Required spell `animations` were added to version 3 under the additive rule. Current web consumers require the ordered, loss-aware source-metadata shape, so older local schema 3 artifacts must be regenerated.
- Required spell `impacts` were added to version 3 under the additive rule. Current web consumers require the ordered, loss-aware frame-presentation shape, so earlier local schema 3 artifacts must be regenerated.
- Required spell `buffs` were added to version 3 under the additive rule. Current web consumers require every loss-aware source parameter, flag, presentation path, and modifier field, so older local schema 3 artifacts must be regenerated.
- Required buff `eventHooks` were subsequently added under the same rule and later gained the measured `dodge` event kind. Current web consumers require and validate the complete event-kind/reference/chance/source-flag shape, so earlier local schema 3 artifacts must be regenerated.
- Required buff `sightModifiers` were subsequently added under the same rule. Current web consumers require the ordered nullable finite-number shape, so earlier local schema 3 artifacts must be regenerated.
- Required buff `invisibilityDeclarations` were subsequently added under the same rule. Current web consumers require the ordered loss-aware non-negative integer amount shape, so earlier local schema 3 artifacts must be regenerated.
- Required buff `muteDeclarations` were subsequently added under the same rule. Current web consumers require the ordered loss-aware non-negative integer amount shape, so earlier local schema 3 artifacts must be regenerated.
- Required buff `senseWallsDeclarations` were subsequently added under the same rule. Current web consumers require the ordered loss-aware game-boolean shape, so earlier local schema 3 artifacts must be regenerated.
- Required buff `paybackDeclarations` were subsequently added under the same rule. Current web consumers require the ordered loss-aware boolean-and-decimal shape, so earlier local schema 3 artifacts must be regenerated.
- Required buff `zorkmidAbsorptionDeclarations` were subsequently added under the same rule. Current web consumers require the ordered loss-aware signed-byte-and-decimal shape, so earlier local schema 3 artifacts must be regenerated.
- Required buff `polymorphDeclarations` were subsequently added under the same rule. Current web consumers require the ordered loss-aware paired monster-target shape, so earlier local schema 3 artifacts must be regenerated.
- Required buff `effects` were subsequently added under the same rule, and
  effect presentation gained required nullable large/small icon fields. Current
  web consumers require the scoped nested collection and complete presentation
  shape, so earlier local schema 3 artifacts must be regenerated.
- Required spell-effect `controls` were subsequently added under the same rule and later gained the required nullable damage-effect `midas` flag. Current web consumers require the complete loss-aware chance/targeting/resistance/burn/bleed/Midas/taxonomy shape, so earlier local schema 3 artifacts must be regenerated.
- Required spell-effect `conditions` were subsequently added under the same rule. Current web consumers require the complete loss-aware source-buff and paired named-buff shape, so earlier local schema 3 artifacts must be regenerated.
- Required spell-effect `damage` and `scaling` fields were subsequently added under the same rule. Current web consumers require the complete ordered damage amount/factor declarations and loss-aware amount/floor/primary/secondary scaling shape, so earlier local schema 3 artifacts must be regenerated.
- Required spell-effect `itemTarget` was subsequently added under the same rule. Current web consumers require the complete loss-aware paired source-target shape, so earlier local schema 3 artifacts must be regenerated.
- Required spell-effect `monsterTarget` was subsequently added under the same rule. Current web consumers require the complete loss-aware paired source-target shape, so earlier local schema 3 artifacts must be regenerated.
- Required spell-effect `removedBuff` was subsequently added under the same rule. Current web consumers require the complete loss-aware paired source-target shape, so earlier local schema 3 artifacts must be regenerated.
- Required spell-effect `createdObjectSpritePath` and `regenerateGraphics`
  fields were subsequently added under the same rule. Current web consumers
  require safe loss-aware created-object references and boolean-or-null
  graphics-regeneration metadata, so earlier local schema 3 artifacts must be
  regenerated.
- Required spell-effect `buffTag` was subsequently added under the same rule.
  Current web consumers require the non-blank-string-or-null shape, so earlier
  local schema 3 artifacts must be regenerated.
- Skill `loadouts`, `sourceFlags`, and `progressionTags` plus ability `level`, `startSkill`, `modifiers`, `sourceFlags`, `recoveryBuffAmounts`, `currencyBuffPercents`, and `triggers` were added to version 3 under the additive rule. Named skill loadouts subsequently gained the required loss-aware `itemResolution` record under the same rule; current consumers require its original-label retention and exact ID/review provenance invariants. Current web consumers require and validate the richer records, so older local schema 3 artifacts must be regenerated. Existing key/ID arrays remain for compatibility and deterministic query use.
- Monster `depth`, `special`, palette metadata, `archetypeLevels`, `ai`, `sight`, `movement`, `presentation`, `experienceValue`, `modifiers`, `spellChance`, `triggers`, and `drops` were added to version 3 under the additive rule. The AI record was later expanded with loss-aware chicken/charm/paralyze/steal flags and steal percentage; sight preserves loss-aware cone/modifier values; movement preserves local dig/dash/charge declarations; presentation preserves local sound cue and sprite declarations; and trigger kinds now include on-death/dash/charge spell references. Current web consumers require and validate the richer records, including every loss-aware AI, sight, movement, and presentation field plus the exclusive drop shapes, so older local schema 3 artifacts must be regenerated.
- The `encrustments` collection was added to version 3 under the additive rule and later expanded with direct outcome arrays. Current web consumers require and validate the complete collection, so older local schema 3 artifacts must be regenerated.
- The top-level `encrustmentInstabilityEffects` array was added to version 3 under the additive rule. Current web consumers require and validate it, so older local schema 3 artifacts must be regenerated.
- Template rows and `affectsPlayer` predate schema version 3, but the current web consumer now requires their complete routed-entity shape and validates the three-character grid alphabet before generating template routes. This strengthens validation without changing the artifact meaning or schema version.
- Update domain types, pipeline serialization, runtime consumer checks, deterministic tests, this document, and a migration note in the same change.
- Do not retain a second compatibility implementation before a real published artifact requires it; generated local artifacts can be regenerated from approved inputs.
