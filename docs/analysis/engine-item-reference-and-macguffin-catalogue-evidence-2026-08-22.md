# Engine-item reference and Macguffin catalogue evidence

Date: 2026-08-22

Read-only installation follow-up: 2026-08-24

Canonical source: Dungeons of Dredmor `1.1.5 public_beta`, Steam build
`22934623`, base game plus all three official expansions

## Question

The modern generic Item category showed two records that were absent from the
owner's preserved-site comparison, while that comparison showed Lockpick. The
review needed to distinguish a parser error from a source-version or
project-authored difference.

## Read-only findings

- Voodoo Globe and Satanic Locator are active base-game item records. Each has
  one direct `<macguffin>` declaration, so neither is synthetic or accidental.
- The canonical sources contain 16 active `lockpick` starting-loadout
  declarations across Burglary, Perception, and Piracy.
- The active `Lucky Pick` spell contains a direct `spawn` effect naming
  `Lockpick` with source amount 3. The normalized spell relationship already
  resolves exactly to `item:lockpick` when the reference source is present.
- The active `Rogue Tricks 1` room contains a `misc`/`lockpick` loot
  declaration with source amount 8.
- Active configuration help says Lockpicks may be used on doors and conserved
  for treasure chests. The tweak database contains source keys named
  `lockpick exp`, `lockpick roll min`, and `lockpick roll max`, with respective
  source values 8, 520, and 559. Those names and values do not establish a
  runtime formula or selection distribution.
- No active canonical item record defines Lockpick. A Lockpick recipe appears
  only inside an XML comment and is not active source data.
- The old Lockpicking skill group, its `Blast Key` spells, and a Lockpick
  tutorial entry are also commented out and are not active source data.
- The installation contains `items/lockpick.png`, a Lockpick status image,
  configuration-toggle images, and old Lockpicking skill icons. Filename
  presence does not make the commented skill group active.
- The executable contains literal Lockpick identity, icon/category,
  configuration, pick-lock action, break, and unlock strings. It also repeats
  the Coat of Bergstrom interaction described by the changelog. This is useful
  evidence of an engine-handled identity and interactions, but it is not parsed
  into the dataset and does not by itself specify complete mechanics.
- The preserved application's setup instructions mutate its local item data to
  add Lockpick with a value of 10. That value is preserved-project behavior,
  not evidence from the canonical game dataset.

The old and modern lists therefore differed because they did not use the same
effective item source, not because the modern parser invented the two
Macguffin records.

## Implemented boundary

ADR 0006 adds a tracked, independently authored, versioned engine-item
reference source for the canonical dataset. Its first record creates
`item:lockpick`, uses the verified official icon path in ignored local output,
and states only that active game data references the engine item while the
active item database omits an ordinary record. It declares no price, quality,
stats, recipe, or inferred engine behavior.

The item and comparison UIs derive reference status from source provenance.
They visibly label Lockpick as `Engine reference` and render its value and
quality as `Not declared`. The detail page explains why the reference exists
and exposes the 16 exact loadout backlinks plus the already-normalized `Lucky
Pick` direct-item backlink with source amount 3. Entity provenance continues
to identify the project reference source, while the generated input manifest
records the official base source path for the copied local icon.

The room, tweak, configuration-text, changelog, and executable findings are
not added to the source manifest merely to enrich this one item. They remain
read-only evidence until a player-facing room/loot slice or an explicitly
bounded technical-information contract needs those source families.

The 16 former reviewed source-only relationships now resolve by exact name.
The two `Spores` options keep their original reviewed source-only status and
stable historical review ID. No alias, reviewed correction, fuzzy match, game
XML patch, or legacy price is introduced.

Direct item records with a `<macguffin>` child now use the semantic
`macguffin` catalogue category. This moves Voodoo Globe and Satanic Locator out
of the generic Item category without hiding either official record or
interpreting the mechanic.

## Canonical result

Deterministic official generation reports:

- 764 items and 2,830 search documents;
- 0 errors, the same four deliberate relationship warnings, and 74
  informational records;
- exactly one `reference`-sourced Lockpick entity with null price, no claimed
  source quality, 16 exact loadout backlinks, one exact direct-spell backlink,
  and no project-only route alias;
- exactly two `macguffin` category items: Voodoo Globe and Satanic Locator;
- 1,794 presented-asset mappings to 1,483 content-addressed local files, with
  no fallback diagnostics; and
- a byte-identical second generation pass.

The informational count falls from 90 to 74 because the 16 Lockpick
source-only audit records become ordinary exact relationships. The warnings
do not change: the Satanic Locator placeholder and three ambiguous monster
spell labels remain unresolved.

## Verification

- Focused domain tests: 88 passed.
- Focused data-pipeline tests: 111 passed.
- Focused web tests: 113 passed.
- `pnpm generate:official:check` passes the zero-error and deterministic-output
  gates with the measurements above.
- `pnpm check` passes formatting, lint, types, all 312 workspace tests,
  byte-identical synthetic generation, and the 227-page synthetic export.
- `pnpm test:e2e` passes all 72 desktop/mobile cases, including Macguffin
  discovery, reference labels and undeclared facts, exact loadout navigation,
  keyboard/responsive flows, and representative axe scans.
- `pnpm build:official` repeats the zero-error deterministic measurement and
  exports all 3,589 local static pages.

No official input, generated official artifact, copied official asset, or
machine-local path is committed.
