# Spell effect environmental metadata evidence

Date: 2026-07-29

Canonical measurement baseline: Dungeons of Dredmor `1.1.5 public_beta`,
Steam build `22934623`, base game plus all three official expansions

## Scope

This slice preserves the two remaining direct environmental-effect
attributes: `objectSprite` on `create` effects and `regengfx` on `dig`
effects. They remain separate required nullable fields rather than being
folded into ordinary effect presentation.

The source declarations do not establish a complete wall, object, terrain, or
graphics runtime. Consumers must not infer created-object type or lifetime,
terrain changes, redraw timing, placement, persistence, collision, targeting,
or runtime success from these fields.

## Preserved legacy and schema evidence

The historical spell adapter recognizes `create` effects as “Creates a Wall”
and `dig` effects as “Destroys Walls”. Both type-specific parsers delegate the
common controls to `GenericEffect`; neither reads `objectSprite` or
`regengfx`. The preserved application therefore establishes the broad effect
labels but does not disclose either source field.

The installed spell validation schema declares `objectSprite` as a string on
an effect. It does not declare `regengfx`, although the canonical base game and
first expansion use that exact attribute on `dig` effects. The modern adapter
supports the measured source form without treating the incomplete validation
schema as engine behavior documentation.

## Normalized contract

Every normalized effect requires:

- `createdObjectSpritePath`, a nullable safe relative concrete asset path,
  populated only for `create` effects; and
- `regenerateGraphics`, a nullable loss-aware boolean populated only for
  `dig` effects.

Created-object references use the ordinary concrete-asset containment,
existence, checksum-input, and path-safety boundary. Empty or unsafe supplied
references become unavailable and remain diagnosed. Graphics flags preserve
explicit true and false; malformed supplied values become unavailable with a
source-located diagnostic. Either attribute on an unrelated effect type stays
an `unknown_attribute` diagnostic.

The spell page reports only whether a created-object reference was supplied
and the exact yes/no graphics flag. It never renders raw asset paths.

## Read-only canonical measurement

The active official dataset contains ten declarations on ten direct effects:

| Field          |            Effects | Sources                | Measured values                   |
| -------------- | -----------------: | ---------------------- | --------------------------------- |
| `objectSprite` | 6 `create` effects | base 3; expansion 2: 3 | 3 unique safe concrete references |
| `regengfx`     |    4 `dig` effects | base 2; expansion 1: 2 | four explicit true values         |

All three unique created-object assets exist beneath their declared read-only
source roots and enter the deterministic input manifest. Four declarations
reuse the summoned-wall reference; the other two name one sprite resource and
one image resource.

Supporting this family removes all ten former diagnostics. Deterministic
official generation now reports:

- 0 errors, 47 warnings, and 71 informational duplicate decisions;
- an 8,267,583-byte normalized artifact;
- a 1,407,994-byte search artifact with 2,767 documents; and
- byte-identical repeated output.

The remaining compatibility backlog is 11 spell constructs: seven unknown
attributes and four unknown elements. Thirteen spell-requirement diagnostics
and 23 dangling references remain separately tracked.

These are aggregate read-only measurements. The official inputs, registered
assets, and generated official artifacts remain ignored and are not approved
for publication.

## Verification

- Focused importer coverage checks two concrete reference extensions, slash
  normalization, reference absence, explicit true/false graphics flags,
  absence, empty and unsafe paths, a malformed boolean, unknown extensions,
  and both fields on an unsupported effect type.
- The synthetic artifact carries a legal created-object reference and an
  explicit false graphics-regeneration flag.
- Strict checksummed-artifact regressions reject an unsafe normalized
  created-object path and a non-boolean graphics flag.
- The spell browser flow verifies both visible facts and proves the raw
  created-object path stays hidden.
- `pnpm.cmd generate:official:check` passes deterministic zero-error official
  generation with the measurements above.
- `pnpm.cmd check` passes formatting, linting, type checking, all 177
  unit/artifact tests, byte-identical synthetic generation, and the 43-page
  synthetic static export.
- `pnpm.cmd test:e2e` passes all 36 desktop/mobile browser cases, including the
  spell disclosure, keyboard flows, responsive layouts, and representative axe
  scans.
- `pnpm.cmd build:official` repeats the byte-identical zero-error canonical
  import and exports all 2,857 ignored local static pages.
