# Direct spell effect monster-target evidence

Date: 2026-07-29

Canonical measurement baseline: Dungeons of Dredmor `1.1.5 public_beta`,
Steam build `22934623`, base game plus all three official expansions

## Scope

This slice preserves the direct monster target declared by `summon` and
`summonhostile` spell effects. It retains the exact `monsterType` source label
plus its canonical lookup key, links the matching normalized monster, and
exposes reciprocal spell-to-monster navigation.

The record is source metadata, not a spawning simulation. Consumers must not
infer availability, allegiance, placement, lifetime, AI state, selection,
creation timing, or other runtime behavior. The `summonhostile` effect type
remains visible as its own source type; the normalized target does not add any
further hostility semantics.

## Preserved legacy and source evidence

The historical spell adapter has a dedicated `summon` parser. It labels the
effect “Summons”, reads `monsterType`, reads an amount with a legacy display
default of one, and renders the target through `derefMonster`. The historical
template therefore treats a declared summon target as a monster relationship.
The modern artifact preserves only an actually supplied amount rather than
turning that display default into source data.

The historical adapter has no dedicated `summonhostile` parser. The active
official XML nevertheless uses the same `monsterType` field on both measured
effect types: 11 `summon` declarations and 10 `summonhostile` declarations.
The modern adapter normalizes that shared direct reference without inventing
the unrepresented hostile-summon mechanics.

## Normalized and relationship contract

Every normalized direct effect has a required `monsterTarget` record:

- unsupported effect types and supported effects with no declared target carry
  null name/key values;
- an explicitly blank target becomes unavailable with a source-located
  diagnostic;
- a non-empty source label retains its exact text and canonical lookup key;
- a matching normalized monster adds `monsterId`; and
- a named missing monster remains visible and emits a dangling-reference
  diagnostic.

Absence remains valid because the canonical data contains one `summon` and one
`summonhostile` effect without `monsterType`. The pipeline does not guess what
the engine selects for those effects.

The strict web artifact schema requires the record on every effect, rejects
partial key/name pairs and resolved IDs without a source target, and rejects
unknown extensions. Spell pages link resolved targets. Monster pages list
reciprocal direct-summon backlinks in deterministic spell/effect order,
including the actually declared source amount when present.

## Read-only canonical measurement

The active official dataset contains 21 direct monster-target declarations
across 21 effects and 17 spells:

| Effect type     | Declarations | Resolved monsters | Unresolved monsters |
| --------------- | -----------: | ----------------: | ------------------: |
| `summon`        |           11 |                11 |                   0 |
| `summonhostile` |           10 |                10 |                   0 |
| **Total**       |       **21** |            **21** |               **0** |

Two additional summon-family effects intentionally omit a target and retain
the valid null record.

Supporting both measured target-bearing effect types removes all 21 former
`monsterType` compatibility diagnostics. Deterministic official generation
now reports:

- 0 errors, 110 warnings, and 71 informational duplicate decisions;
- a 7,858,941-byte normalized artifact;
- a 1,407,994-byte search artifact with 2,767 documents; and
- byte-identical repeated output.

The remaining compatibility backlog is 74 spell constructs: 40 unknown
attributes and 34 unknown elements. The 13 spell-requirement diagnostics and
23 dangling references remain separately tracked.

These are aggregate read-only measurements. The official inputs and generated
official artifacts remain ignored and are not approved for publication.

## Verification

- Focused importer coverage checks `summon`, `summonhostile`, a resolved
  monster, true absence, an explicitly empty target, a dangling target, and the
  same attribute on an unsupported effect type.
- Domain coverage checks deterministic reciprocal monster-target backlinks and
  excludes unresolved targets.
- The synthetic artifact gives `Clockwork Spark` a resolved
  `Training Diggle` summon target.
- The web artifact test rejects a partial normalized monster target.
- Browser coverage checks the resolved spell-page link, keyboard navigation,
  reciprocal monster-page backlink, source amount, behavior boundary,
  responsive layout, and representative axe scan.
- `pnpm.cmd generate:official:check` passes deterministic zero-error official
  generation with the measurements above.
