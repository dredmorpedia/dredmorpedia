# Spell-icon import evidence

Date: 2026-08-12

## Scope

This is the third page-driven extension of the ignored local presented-asset
set beyond items. It imports only root spell icons already referenced by
normalized spell detail pages. Official input and generated output remain
local-only and ignored. This work does not change the publication or licensing
decision.

## Implemented boundary

- The existing strict PNG allowlist, signature validation, safe source
  containment, and first-registration byte snapshots apply unchanged.
- The typed catalog adds `spell-icon`; every normalized spell with a root icon
  must have exactly one copied record or one stable fallback diagnostic.
- Item, skill, ability, and spell outcomes are verified together against the
  active dataset before any kind can produce a URL.
- Spell pages render copied art decoratively beside the existing summary facts
  and render a deliberate non-image placeholder when the set is unconfigured or
  the source asset is unavailable, unsupported, or invalid.
- Buff-local, effect-local, animation, monster, sound, interface, and unrelated
  assets are not selected by this slice.

## Canonical measurement

The read-only `1.1.5 public_beta`, Steam build `22934623` artifact contains 440
root spell-icon mappings from 274 unique normalized source references. Those
references resolve to 269 distinct content-addressed PNG files and 920,314
bytes when measured within the spell family.

Together with the existing item, skill, and ability slices, deterministic
official generation produces:

- 763 item-icon, 52 skill-icon, 352 ability-icon, and 440 spell-icon mappings;
- 1,607 mappings backed by 1,312 unique PNG files;
- 4,190,593 total binary bytes;
- a 451,178-byte JSON catalog; and
- zero asset fallback diagnostics.

The legal synthetic fixture deliberately retains SVG spell icons. Ordinary CI
therefore exercises the non-broken spell fallback without adding a binary or
converted proprietary-style fixture.

## Regression coverage

- Pipeline tests prove all four typed entity mappings can share
  content-addressed bytes while retaining distinct outcomes.
- Web tests prove all four typed URLs are dataset-bound, base-path-aware, and
  covered by complete catalog/file verification.
- Browser coverage verifies the synthetic spell placeholder emits no broken
  `<img>` and remains responsive in the existing desktop/mobile flow.
- A local official-data check at `/spells/abyssal-fire/` loads its referenced
  PNG, emits no placeholder, and introduces no horizontal overflow at desktop
  or mobile width.
- `pnpm generate:official:check` proves the complete ignored official dataset
  and presented-asset set are byte-identical across two imports, with 0 errors,
  4 relationship warnings, 90 informational records, and no asset fallbacks.

## Validation

- `pnpm check` passes 267 domain, pipeline, and web tests plus the 45-page
  synthetic static export.
- `pnpm build:official` exports all 2,982 ignored local pages with the verified
  1,607-record presented-icon catalog.
- `pnpm test:e2e` passes all 40 desktop/mobile interaction and accessibility
  cases, including the deliberate spell-icon fallback.

The generated official set remains ignored and non-public.
