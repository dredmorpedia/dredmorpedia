# Spell buff dodge-hook evidence

Date: 2026-08-05

Canonical measurement baseline: Dungeons of Dredmor `1.1.5 public_beta`,
Steam build `22934623`, base game plus all three official expansions

## Scope

This slice preserves the canonical buff-local lowercase `<dodgebuff>`
declaration as a named, percentage-bearing dodge event hook. It does not infer
event eligibility, evaluation order, cooldown interaction, timing, target
selection, or runtime success.

## Preserved application and schema evidence

The installed validation schema defines a camel-cased `dodgeBuff` element with
required `percentage` and `name` attributes. The preserved application defines
a Dodge trigger with the same casing, the selector `dodgeBuff`, and the label
`you dodge`, but it has no corresponding effect parser and therefore does not
successfully present the canonical lowercase record. This establishes the
source relationship label and strict field shape, not the game engine's event
evaluation behavior.

The official source uses the lowercase `dodgebuff` spelling once. The modern
importer supports that measured spelling directly rather than treating the
schema's casing as evidence for unmeasured aliases.

## Normalized contract

The existing buff `eventHooks` array now accepts a `dodge` kind. Each dodge
hook retains:

- the original and canonical spell target names;
- an optional resolved spell ID;
- a nullable integer chance from 0 through 100; and
- its deterministic position after target-hit and player-hit hook groups.

The importer reports missing required names or percentages, malformed chance
values, unknown attributes, text, and child elements at the hook's source
location. A missing target is not fabricated, a dangling named target remains
visible with a diagnostic, and the web artifact guard rejects unknown event
kinds.

## Read-only canonical measurement

The active official dataset contains one lowercase dodge hook on
`Transdimensional Dodging`. It declares a 100-percent chance and names
`Froda's Jump Discontinuity`; the target resolves to the normalized spell and
therefore participates in the existing reciprocal buff-hook backlink.

The active dataset now contains 62 buff event hooks across 43 spells: 43
target-hit, 18 player-hit, and one dodge declaration. Supporting the dodge hook
removes its sole former compatibility diagnostic without adding a dangling
reference.

Deterministic official generation reports 0 errors, 41 warnings, and 71
informational duplicate decisions. Five compatibility constructs remain: three
unknown attributes (`level` twice and `buffTag` once) and two unknown elements
(`payback` and `zorkmidAbsorption` once each). The 13 spell requirement
diagnostics and 23 dangling references remain separately tracked.

These are aggregate read-only measurements. Official inputs and generated
official artifacts remain ignored and are not approved for publication.

## Verification

- Importer coverage exercises resolved dodge hooks, missing names and chances,
  malformed percentages, unknown attributes, and nested content.
- The independently authored synthetic artifact carries one resolved
  100-percent dodge hook.
- Domain coverage includes deterministic backlinks for the new event kind.
- The strict checksummed-artifact regression rejects an unknown normalized
  event kind.
- `pnpm check` passes formatting, lint, type checking, all 196 unit/artifact
  tests, byte-identical synthetic generation, and the 43-page static export.
- Desktop/mobile Playwright and axe coverage exercises the visible dodge label,
  target link, percentage, and interpretation boundary.
- Deterministic zero-error official generation and the complete local static
  export succeed without publishing generated official content.
