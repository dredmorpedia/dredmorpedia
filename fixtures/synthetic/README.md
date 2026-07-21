# Synthetic architecture-spike fixtures

These XML files and SVGs are independently authored test data. They imitate only the minimum structural conventions needed to exercise the pipeline and contain no game text or artwork.

The fixture set deliberately includes:

- representative items, stats, a recipe, a skill with resolved/dangling/generic loadouts plus source flags and progression tags, starting and leveled abilities with signed damage/resistance/primary/secondary modifiers, recovery/currency source values, source flags, and resolved/dangling/event spell triggers, a cyclic spell chain, an inherited monster with depth, archetype levels, experience, palette metadata, and overriding/inherited stat bonuses, and a targeting template;
- a higher-precedence item override;
- a version-guarded patch that changes one active item value without modifying its XML source;
- a dataset-versioned route registry that pins canonical item slugs and preserves a historical alias;
- two items whose names normalize to the same route slug, with distinct source-ID aliases;
- one malformed XML file;
- one dangling item reference;
- one missing asset;
- one unsupported element; and
- one normalized encrustment with resolved and unresolved ingredients, signed direct modifiers, a probabilistic named power hook, an appearance descriptor, and a shared instability pool containing resolved and unresolved spell references.

The explicit manifest controls source order and file discovery so output never depends on filesystem enumeration order.
