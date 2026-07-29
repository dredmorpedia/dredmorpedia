# Direct spell effect item-target evidence

Date: 2026-07-29

Canonical measurement baseline: Dungeons of Dredmor `1.1.5 public_beta`,
Steam build `22934623`, base game plus all three official expansions

## Scope

This slice preserves the direct item target declared by `spawn` and
`spawnitematlocation` spell effects. It accepts the measured `itemname` source
spelling and the installed validation schema's `itemName` spelling, retains the
exact source label plus canonical lookup key, links a normalized item when one
exists, and exposes reciprocal spell-to-item navigation.

The source label is not proof that an item entity should exist. Values such as
`randomgem`, `randommushroom`, `randomring`, `zorkmids`, and `Lockpick` can be
engine selectors or hard-coded concepts rather than XML item records. They
remain visible source targets without a fabricated entity or dangling-reference
warning. Consumers must not infer random selection, inventory placement,
availability, creation timing, or other spawning behavior.

## Preserved legacy and schema evidence

The historical spell adapter has dedicated parsers for both supported effect
types. `Spawn` labels the effect “Spawns an Item” and reads `itemname`;
`SpawnItemAtLocation` labels it “Spawns an Item on tile” and reads the same
attribute. It does not resolve the label to a normalized entity and does not
accept the camel-case spelling.

The installed `spells.xsd` instead declares `itemName` on the generic effect
shape. The active official XML uses eight lowercase declarations and one
camel-case declaration. The modern adapter accepts both observed/schema-backed
forms, reports a conflict when both are supplied, and gives the measured
lowercase spelling deterministic precedence.

## Normalized and relationship contract

Every normalized direct effect has a required `itemTarget` record:

- unsupported effect types and supported effects with no target carry null
  name/key values;
- an explicitly empty target becomes unavailable with a source-located
  diagnostic;
- a non-empty source label retains its exact text and canonical lookup key;
- a matching normalized item adds `itemId`; and
- a source-only label remains visible without being misclassified as broken.

The strict web artifact schema requires the record on every effect, rejects
partial key/name pairs and resolved IDs without a source target, and rejects
unknown extensions. The spell page links resolved items and labels source-only
targets explicitly. Item pages list reciprocal direct-effect backlinks in
deterministic spell/effect order.

## Read-only canonical measurement

The active official dataset contains nine direct item-target declarations
across nine effects and nine spells:

| Effect type           | Declarations | Resolved items | Source-only labels |
| --------------------- | -----------: | -------------: | -----------------: |
| `spawn`               |            6 |              2 |                  4 |
| `spawnitematlocation` |            3 |              1 |                  2 |
| **Total**             |        **9** |          **3** |              **6** |

The resolved targets are `Puffball`, `Haematic Phylactery`, and `Diggle Egg`.
The source-only labels are retained exactly. A separate
`spawnitematlocation` effect intentionally declares no item target and remains
a valid null record rather than receiving an invented interpretation.

Supporting the two target aliases removes all nine former item-target
compatibility diagnostics. Deterministic official generation now reports:

- 0 errors, 131 warnings, and 71 informational duplicate decisions;
- a 7,672,083-byte normalized artifact;
- a 1,407,994-byte search artifact with 2,767 documents; and
- byte-identical repeated output.

The remaining compatibility backlog is 95 spell constructs: 61 unknown
attributes and 34 unknown elements. The 13 spell-requirement diagnostics and
23 dangling references remain separately tracked.

These are aggregate read-only measurements. The official inputs and generated
official artifacts remain ignored and are not approved for publication.

## Verification

- Focused importer coverage checks both aliases, a resolved item, an
  unresolved source label, absence, an explicitly empty target, an alias
  conflict, and the same attribute on an unsupported effect type.
- Domain coverage checks deterministic reciprocal direct-item backlinks and
  excludes source-only targets.
- The synthetic artifact contains both a resolved `spawn` target and an
  unresolved `spawnitematlocation` source label.
- The web artifact test rejects a partial normalized item target.
- Browser coverage checks the resolved link, source-only disclosure, and the
  reciprocal item-page backlink.
- `pnpm.cmd generate:official:check` passes deterministic zero-error official
  generation with the measurements above.
