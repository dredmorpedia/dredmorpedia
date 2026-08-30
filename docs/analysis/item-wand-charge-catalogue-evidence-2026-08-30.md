# Item wand-charge catalogue evidence

Date: 2026-08-30
Dataset: `1.1.5 public_beta`, Steam build `22934623`, all three official expansions

## Purpose

The normalized item contract already retained loss-aware wand minimum and
maximum charge declarations, and detail pages exposed both endpoints. The
preserved item table also presented that common player fact directly on each
wand row. The modern catalogue omitted it, leaving users to open every detail
page.

## Presentation contract

Item catalogue cards now place the complete ordered charge declaration in the
ordinary fact row as **Wand / x–y charges**. A fixed value uses singular or
plural wording, multiple declarations remain visible in source order, and an
incomplete endpoint stays explicit as `?`; a declaration with neither endpoint
is **Unavailable**. Items without a charge declaration render no Wand fact.

This is presentation of normalized source values only. It does not infer charge
consumption, recharge behavior, spell eligibility, item matching, timing, or
runtime success.

## Canonical measurement

All 21 active official item charge declarations have exact minimum and maximum
values and now appear on their catalogue cards. The set includes `Camera` plus
the 20 wand-named records, with ranges from `3–4 charges` through
`20–40 charges`.

## Validation

- Focused formatter tests cover ranges, fixed singular/plural values,
  incomplete values, unavailable declarations, and ordered repetition.
- Desktop/mobile Playwright coverage confirms `2–4 charges` on the synthetic
  charged wand card, no fabricated row on the undeclared wand, the existing
  detailed endpoints, and responsive overflow safety.
- `pnpm check` passes all 330 unit/artifact tests, deterministic synthetic
  generation, and the complete 245-page synthetic static export.
- All 80 desktop/mobile Playwright cases pass.
- `pnpm build:official` passes deterministic zero-error generation, retains
  all 21 exact charge declarations, imports the presented official assets with
  zero fallbacks, and exports all 3,731 local static pages.

Generated official data and artwork remain ignored and local-only under the
existing data-and-assets policy.
