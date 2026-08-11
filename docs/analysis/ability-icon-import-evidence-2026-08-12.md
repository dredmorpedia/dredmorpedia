# Ability-icon import evidence

Date: 2026-08-12

## Scope

This is the second page-driven extension of the ignored local presented-asset
set beyond items. It imports only the complete ability-icon family already
referenced by normalized ability detail pages. Official input and generated
output remain local-only and ignored. This work does not change the publication
or licensing decision.

## Implemented boundary

- The existing strict PNG allowlist, signature validation, safe source
  containment, and first-registration byte snapshots apply unchanged.
- The typed catalog adds `ability-icon`; every normalized ability with an icon
  must have exactly one copied record or one stable fallback diagnostic.
- Item, skill, and ability outcomes are verified together against the active
  dataset before any kind can produce a URL.
- Ability pages render copied art decoratively beside the existing summary facts
  and render a deliberate non-image placeholder when the set is unconfigured or
  the source asset is unavailable, unsupported, or invalid.
- No spell, monster, animation, sound, interface, or unrelated asset is selected
  by this slice.

## Canonical measurement

The read-only `1.1.5 public_beta`, Steam build `22934623` artifact contains 352
ability icon mappings from 330 unique normalized source references. Those
references resolve to 329 distinct content-addressed PNG files and 3,006,094
bytes when measured within the ability family.

Together with the existing item and skill slices, deterministic official
generation produces:

- 763 item-icon, 52 skill-icon, and 352 ability-icon mappings;
- 1,167 mappings backed by 1,051 unique PNG files;
- 3,342,108 total binary bytes;
- a 327,158-byte JSON catalog; and
- zero asset fallback diagnostics.

The legal synthetic fixture deliberately retains SVG ability icons. Ordinary CI
therefore exercises the non-broken ability fallback without adding a binary or
converted proprietary-style fixture.

## Regression coverage

- Pipeline tests prove item, skill, and ability mappings can share
  content-addressed bytes while retaining distinct typed entity outcomes.
- Web tests prove all three typed URLs are dataset-bound, base-path-aware, and
  covered by complete catalog/file verification.
- Browser coverage verifies the synthetic ability placeholder emits no broken
  `<img>` and remains responsive in the existing desktop/mobile flow.
- A local official-data check at `/abilities/acidical-projector/` loads its
  64-by-64 PNG, emits no placeholder, and introduces no horizontal overflow at
  desktop or mobile width.
- `pnpm generate:official:check` proves the complete ignored official dataset
  and presented-asset set are byte-identical across two imports, with 0 errors,
  4 relationship warnings, 90 informational records, and no asset fallbacks.

## Validation

- `pnpm check` passes 267 domain, pipeline, and web tests plus the 45-page
  synthetic static export.
- `pnpm build:official` exports all 2,982 ignored local pages with the verified
  1,167-record presented-icon catalog.
- `pnpm test:e2e` passes all 40 desktop/mobile interaction and accessibility
  cases, including the deliberate ability-icon fallback.

The generated official set remains ignored and non-public.
