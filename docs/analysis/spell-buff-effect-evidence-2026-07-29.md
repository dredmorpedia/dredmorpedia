# Spell buff-local effect evidence

Date: 2026-07-29

Canonical measurement baseline: Dungeons of Dredmor `1.1.5 public_beta`,
Steam build `22934623`, base game plus all three official expansions

## Scope

This slice preserves `<effect>` declarations nested directly inside a spell
`<buff>`. They use the same source vocabulary as direct spell effects but stay
inside their owning normalized buff so consumers do not lose their declared
scope.

The declarations are source metadata and relationships, not an execution
simulation. Consumers must not infer scheduling, trigger order, buff lifetime,
tick timing, eligibility, resistance resolution, or runtime success.

## Preserved legacy and source evidence

The historical spell adapter intentionally selects a spell and all of its
descendants before applying the effect-type parsers. It therefore includes
buff-local effects in the spell's displayed effect list, although it flattens
their scope.

The active official dataset contains 26 buff-local effects across 11 spells
and 11 buffs:

| Source                    | Declarations |
| ------------------------- | -----------: |
| Base game                 |            9 |
| Second official expansion |           16 |
| Third official expansion  |            1 |
| **Total**                 |       **26** |

| Effect type        | Declarations |
| ------------------ | -----------: |
| `buff`             |            9 |
| `trigger`          |           14 |
| `dot`              |            1 |
| `paralyze`         |            1 |
| `removebuffbyname` |            1 |

Every declaration is an empty leaf. Ten buffs contain one effect and one
contains 16. Fifteen declarations name spell targets and all 15 resolve. The
named buff-removal target also resolves. Nine `buff` effects carry the
previously modeled sprite/frame/rate/sound presentation shape; one of those
also carries safe large and small icon references.

## Normalized contract

Every normalized buff has a required deterministic `effects` array. Its
entries use the same strict, loss-aware `SpellEffect` contract as direct spell
effects:

- type-specific attributes are parsed and validated identically;
- spell, stat, item, monster, condition, option, and named-removal references
  pass through the same deterministic linker;
- domain effect chains and reciprocal backlinks include direct and buff-local
  effects;
- effect presentation may retain safe nullable large/small icon references in
  addition to sprite/frame/rate/centered/sound metadata;
- raw icon, sprite, and sound identifiers remain hidden; and
- malformed numbers, booleans, paths, unknown attributes, text, and nested
  elements remain source-located diagnostics.

The spell page displays the effects inside the owning buff and separately
counts them. The combined Effects section retains direct effects and adds the
complete fields for buff-local effects. The strict web artifact schema requires
every buff's effect collection and the complete presentation shape before
static generation.

## Read-only canonical measurement

Supporting the complete measured family removes all 11 former
`unknown_element` diagnostics—one for each declaring buff—while normalizing 26
declarations. Deterministic official generation now reports:

- 0 errors, 57 warnings, and 71 informational duplicate decisions;
- an 8,126,648-byte normalized artifact;
- a 1,407,994-byte search artifact with 2,767 documents; and
- byte-identical repeated output.

The remaining compatibility backlog is 21 spell constructs: 17 unknown
attributes and four unknown elements. The 13 spell-requirement diagnostics and
23 dangling references remain separately tracked.

These are aggregate read-only measurements. Official inputs and generated
official artifacts remain ignored and are not approved for publication.

## Verification

- Focused importer coverage checks presentation metadata, resolved nested
  triggers, controls and conditions, malformed numbers, unknown attributes,
  text, and child elements.
- Domain coverage proves chains and backlinks include buff-local effects.
- The synthetic Clockwork Spark buff carries an independently authored
  presentation-only nested effect.
- The web artifact test rejects a buff missing its required effect collection.
- Browser coverage checks the accessible buff-local region, hidden-reference
  summaries, source frame count, behavior boundary, and responsive/axe
  regressions.
- `pnpm.cmd check` passes 174 unit/artifact tests, byte-identical synthetic
  generation, and the 43-page synthetic static export.
- All 36 desktop/mobile Playwright cases pass.
- `pnpm.cmd build:official` repeats the byte-identical zero-error measurement
  above and exports all 2,857 local static pages.
