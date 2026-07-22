# Item use metadata evidence

Date: 2026-07-23
Status: implemented

## Verified behavior

The preserved application presents a food declaration's `hp` value as Life recovery, its `mp` value as Mana recovery, and a wand declaration's `mincharge`/`maxcharge` pair as its charge range. Potion and mushroom declarations contribute their named spell through the existing Quaffed and Munched trigger relationships. The rebuild now preserves those same source values without assigning recovery timing, charge-consumption, or `meat` behavior.

Items carry ordered, loss-aware recovery records with a `life` or `mana` resource, nullable non-negative integer amount, and exact additional source flags. Wand declarations carry ordered nullable non-negative minimum/maximum charge ranges. A reversed range is diagnosed and becomes unavailable. Food, wand, potion, mushroom, and mushroom-associated casts leaves reject unknown attributes or nested content instead of becoming silently complete.

## Canonical read-only measurement

The canonical `1.1.5 public_beta` base-plus-three-expansion dataset contains:

- 49 recovery declarations across 49 active items: 32 Life and 17 Mana;
- valid amounts from 1 through 64, with no unavailable canonical values;
- 25 exact `meat=1` source flags;
- 21 charge ranges across 21 active wands, with minimums from 3 through 20 and maximums from 4 through 40;
- 64 related item spell triggers: 1 Eaten, 4 Drunk, 21 Zapped, 26 Quaffed, and 12 Munched; every reference resolves.

Every active item has at most one recovery declaration and at most one charge range. These are aggregate measurements from ignored local generated output, not permission to publish official records.

## Diagnostics and artifact boundary

Fully supporting the five verified leaf families removes 120 former `partially_supported_element` diagnostics: 49 food, 26 potion, 21 wand, 12 mushroom-marker, and 12 mushroom-cast entries. The measured compatibility backlog is now 2,942 constructs: 609 item and 2,333 spell diagnostics. Nineteen dangling references and 15 spell-requirement diagnostics remain separately tracked.

The deterministic canonical import completes with 0 errors, 2,976 warnings, and 71 informational duplicate decisions. Its normalized artifact is 5,437,706 bytes; the unchanged search artifact is 1,344,780 bytes. The web runtime guard requires both new arrays, rejects negative recovery/charge values and inverted complete ranges, and therefore rejects stale schema-3 local artifacts instead of guessing.

## Regression coverage

Synthetic fixtures include Life and Mana recovery, an exact food source flag, a complete wand range, potion and mushroom spell triggers, malformed or missing recovery values, incomplete and reversed ranges, missing mushroom casts, unknown attributes/nested content, and a casts declaration outside a mushroom shape. Item pages expose the direct values with an explicit behavior boundary and an empty state. Unit, artifact-boundary, desktop/mobile interaction, responsive-overflow, keyboard, static-build, determinism, and axe coverage remain part of the repository checks.
