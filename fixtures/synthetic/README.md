# Synthetic architecture-spike fixtures

These XML files and SVGs are independently authored test data. They imitate only the minimum structural conventions needed to exercise the pipeline and contain no game text or artwork.

The fixture set deliberately includes:

- representative items, stats, a recipe, a skill and ability, a spell chain, an inherited monster, and a targeting template;
- a higher-precedence item override;
- one malformed XML file;
- one dangling item reference;
- one missing asset; and
- one unsupported element; and
- one valid but not-yet-normalized encrustment database.

The explicit manifest controls source order and file discovery so output never depends on filesystem enumeration order.
