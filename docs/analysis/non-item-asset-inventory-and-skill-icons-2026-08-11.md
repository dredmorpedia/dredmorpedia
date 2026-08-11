# Non-item asset inventory and skill-icon evidence

Date: 2026-08-11

## Scope

This is the first page-driven extension of the ignored local presented-asset
set beyond item icons. It inventories non-item art references already retained
by implemented detail pages, then imports only the complete skill-icon family.
Official input and generated output remain local-only and ignored. This work
does not change the publication or licensing decision.

## Canonical inventory

The read-only `1.1.5 public_beta`, Steam build `22934623` normalized artifact
contains:

| Entity family | Active records | Records with a reference | Unique source references | Format                                   |
| ------------- | -------------: | -----------------------: | -----------------------: | ---------------------------------------- |
| Skills        |             52 |                       52 |                       52 | PNG                                      |
| Abilities     |            352 |                      352 |                      330 | PNG                                      |
| Spells        |            951 |                      440 |                      274 | PNG                                      |
| Monsters      |            183 |                      183 |                       47 | 96 SPR and 87 animation XML declarations |

Skills are the smallest complete browser-ready family and their detail route
already has a natural presentation location. Ability and spell icons remain
direct PNG follow-ups. Monster art is not a direct image-file slice: it needs a
separate decision for sprite/animation decoding, frame selection, inherited
palette tinting, and the accessible fallback before any files are copied.

## Implemented boundary

- The existing strict PNG allowlist, signature validation, safe source
  containment, and first-registration byte snapshots apply unchanged.
- The typed catalog adds `skill-icon`; every normalized skill with an icon must
  have exactly one copied record or one stable fallback diagnostic.
- Item and skill outcomes are verified together against the active dataset
  before either kind can produce a URL.
- Skill pages render copied art as decorative beside the existing heading and
  render a deliberate non-image placeholder when the set is unconfigured or
  the source asset is unavailable, unsupported, or invalid.
- No ability, spell, monster, animation, sound, interface, or unrelated asset
  is selected by this slice.

## Canonical measurement

Deterministic official generation produces:

- 763 item-icon mappings and 52 skill-icon mappings;
- 722 unique item PNGs plus 52 unique skill PNGs, 774 files in total;
- 336,014 item bytes plus 472,006 skill bytes, 808,020 binary bytes in total;
- a 226,791-byte JSON catalog; and
- zero asset fallback diagnostics.

No source root, local installation path, original icon path, image bytes, or
generated official file is recorded in this evidence.

The legal synthetic fixture deliberately retains its SVG skill icon. Ordinary
CI therefore exercises the non-broken skill fallback without adding a binary
or converted proprietary-style fixture.

## Regression coverage

- Pipeline tests prove typed item/skill mappings can share content-addressed
  bytes while retaining distinct entity outcomes.
- Web tests prove both typed URLs are dataset-bound, base-path-aware, and
  covered by complete catalog/file verification.
- Browser coverage verifies the synthetic skill placeholder emits no broken
  `<img>` and remains responsive in the existing desktop/mobile flow.
- A local official-data check at `/skills/alchemy/` loads its 64-by-64 PNG,
  emits no placeholder, and introduces no horizontal overflow.
- `pnpm generate:official:check` proves the complete ignored official dataset
  and presented-asset set are byte-identical across two imports, with 0 errors,
  4 relationship warnings, 90 informational records, and no asset fallbacks.

## Validation

- `pnpm check` passes 267 domain, pipeline, and web tests plus the 45-page
  synthetic static export.
- `pnpm build:official` exports all 2,982 ignored local pages with the verified
  815-record presented-icon catalog.
- `pnpm test:e2e` passes all 40 desktop/mobile interaction and accessibility
  cases, including the deliberate skill-icon fallback.

The generated official set remains ignored and non-public.
