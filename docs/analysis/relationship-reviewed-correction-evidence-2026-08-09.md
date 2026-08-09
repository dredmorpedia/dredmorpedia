# Reviewed item-label correction evidence

Date: 2026-08-09
Status: owner-approved and implemented

## Decision

The owner approved one reviewed relationship correction for the canonical
local dataset: Luckier Find's source label `Acidium Salis` resolves to the
existing `Acidum Salis` item.

This is an encyclopedia relationship resolution, not a game patch. The
pipeline does not edit the read-only installation, rewrite the source label, or
create a global fuzzy alias. It retains `Acidium Salis` and records why that
exact declaration links to `item:acidum salis`.

## Exact scope

The rule matches only this complete tuple:

- dataset ID `dredmor-1.1.5-public-beta-steam-build-22934623`;
- dataset and source version `1.1.5 public_beta (Steam build 22934623)`;
- source `official-base`;
- owner `spell:luckier find`;
- relationship `spell-effect-item-option`;
- source label `Acidium Salis`; and
- target `item:acidum salis`.

Its stable review ID is
`relationship-review:2026-08-09:acidium-salis-to-acidum-salis`. Changing any
matching dimension prevents the review rule from applying. The target is part
of the rule rather than discovered by fuzzy matching.

## Artifact and presentation behavior

The item-list option now carries:

- `status: resolved`;
- `resolutionMethod: reviewed-correction`;
- the original `sourceLabel: Acidium Salis`;
- `targetId` and compatibility `itemId` equal to `item:acidum salis`; and
- the stable review ID.

The pipeline emits one informational `reviewed_correction_reference` diagnostic
instead of the former dangling warning. Spell details link to `Acidum Salis`
and disclose the original corrected source label. The Acidum Salis item page
gains the reciprocal Luckier Find item-list backlink with the same disclosure.
Neither page claims selection probability, fallback behavior, runtime spawning,
or whether the typo changes engine behavior.

## Canonical measurement

The ignored canonical artifact contains:

- 47 exact and 16 source-only named skill loadouts, plus 13 type-only loadouts;
- 189 exact, one reviewed-correction, and two source-only item-list options;
- 18 reviewed source-only informational records;
- one reviewed-correction informational record;
- four remaining dangling-reference warnings; and
- 0 errors, 4 warnings, and 90 informational records overall.

The remaining warnings are the deliberate `non-existant-spell` placeholder and
the three ambiguous monster spell labels. They remain unresolved absent new
evidence and a separate owner decision.

## Verification

- Review-rule tests cover the exact match and every scoped near miss.
- A pipeline integration test proves the original label, corrected target,
  stable review ID, informational diagnostic, and removal of the former
  dangling warning.
- Domain backlink coverage includes reviewed-correction targets.
- The web artifact boundary accepts only a complete reviewed-correction shape
  with matching source label, target ID, item ID, and review provenance.
- `pnpm.cmd check` passes formatting, lint, type checking, all 228
  unit/artifact tests, byte-identical synthetic generation, and the 43-page
  synthetic export.
- All 36 desktop/mobile Playwright cases pass, including keyboard flows and
  representative axe scans.
- `pnpm.cmd generate:official:check` generates 763 items and 2,767 search
  documents with 0 errors / 4 warnings / 90 info and byte-identical output.
- `pnpm.cmd build:official` exports all 2,857 ignored local static pages; direct
  HTML inspection confirms the disclosure and reciprocal backlink.
- No official input, generated official artifact, asset, local installation
  path, or game-source modification is committed.
