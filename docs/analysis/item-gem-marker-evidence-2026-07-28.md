# Item gem marker evidence

Date: 2026-07-28
Scope: legacy behavior, synthetic validation, and read-only aggregate
measurement of the canonical official dataset

## Source and legacy behavior

The preserved item parser classifies a record as a gem when it contains a
`<gem>` child, then delegates all other fields to the generic item parser. It
does not derive another value or behavior from the marker.

Read-only inspection found 20 `<gem>` declarations in the canonical base game
plus three expansions. Every declaration:

- is an empty leaf with no attributes, child elements, or text;
- belongs to an item with the root `alchemical` attribute; and
- corresponds one-to-one with the 20 active records already classified as
  `gem` by the modern source-shape category rule.

No official names, XML, assets, or source paths are recorded here.

## Implemented contract

The pipeline now recognizes `<gem>` as a supported item-classification marker
and validates every declaration as a strict empty leaf. The existing normalized
item category remains the complete public representation; no redundant boolean
or invented gem behavior was added.

Unknown marker attributes and nested elements remain source-located
`unknown_attribute` and `unknown_element` diagnostics. A legal synthetic gem
exercises generation, artifact validation, search, static routing, visible
category presentation, and desktop/mobile browser coverage. An adversarial
synthetic record proves that unexpected marker content is still diagnosed.

## Canonical result

Supporting the complete measured marker family removes exactly 20 former
`unknown_element` diagnostics:

- canonical import: 0 errors, 2,902 warnings, and 71 informational duplicate
  decisions;
- item compatibility backlog: 535 diagnostics, down from 555;
- combined item/spell compatibility backlog: 2,870 diagnostics, down from
  2,890;
- spell compatibility diagnostics: unchanged at 2,335;
- dangling references: unchanged at 19; and
- separately tracked spell-requirement diagnostics: unchanged at 13.

The remaining item families are 268 `armour`, 257 `weapon`, 8 `toolkit`, and 2
`macguffin` diagnostics. They are not equivalent empty markers: measured
toolkits contain extensive interface/crafting metadata, while macguffins carry
spell and consumable semantics. Both remain explicitly unsupported pending
their own evidence-backed contracts.

## Verification

- Focused domain, pipeline, and web artifact tests pass with 11 synthetic items
  and 23 search documents.
- `pnpm.cmd check` passes formatting, lint, type checking, all 99 unit/artifact
  tests, byte-identical synthetic generation, and the 41-page static export.
- `pnpm.cmd test:e2e` passes all 30 desktop/mobile Playwright tests, including
  the gem detail route plus the existing keyboard, no-JavaScript, responsive,
  and representative axe checks.
- `pnpm.cmd build:official` produces byte-identical ignored outputs with the
  canonical counts above and exports all 2,857 local static pages.

Generated official artifacts remain ignored and are not approved for
publication.
