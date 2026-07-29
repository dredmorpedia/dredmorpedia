# Direct spell effect named-buff removal evidence

Date: 2026-07-29

Canonical measurement baseline: Dungeons of Dredmor `1.1.5 public_beta`,
Steam build `22934623`, base game plus all three official expansions

## Scope

This slice preserves the named buff target declared by
`removebuffbyname` spell effects. It retains the exact `name` source label plus
its canonical spell lookup key, links the matching normalized spell whose buff
is named by the declaration, and exposes reciprocal spell navigation.

The record is direct source metadata, not a buff-removal simulation. Consumers
must not infer eligibility, affected actor or area, evaluation order, timing,
stack selection, number of stacks removed, interaction with removable flags,
or whether removal succeeds at runtime.

## Preserved legacy and source evidence

The historical spell adapter has no dedicated `removebuffbyname` selector or
parser, so these declarations were absent from the legacy spell presentation.
The active official XML consistently uses `name` on this one effect type to
refer to another named spell that carries a buff.

The modern adapter models that evidenced relationship directly rather than
reusing the ordinary spell-effect chain. Removing a named buff does not mean
that the target spell is cast, and the relationship therefore does not enter
recursive trigger traversal.

## Normalized and relationship contract

Every normalized direct effect has a required `removedBuff` record:

- unsupported effect types carry null name/key values;
- a `removebuffbyname` effect with an absent or explicitly blank `name`
  becomes unavailable and emits a source-located diagnostic;
- a non-empty source label retains its exact text and canonical lookup key;
- a matching normalized spell adds `spellId`; and
- a named missing spell remains visible and emits a dangling-reference
  diagnostic.

The strict web artifact schema requires the record on every effect, rejects
partial key/name pairs and resolved IDs without a source target, and rejects
unknown extensions. Spell pages link resolved removal targets and list
reciprocal named-removal backlinks in deterministic spell/effect order.

## Read-only canonical measurement

The active official dataset contains 23 named buff-removal declarations across
23 effects and 12 source spells:

| Effect type        | Declarations | Resolved targets | Unresolved targets |
| ------------------ | -----------: | ---------------: | -----------------: |
| `removebuffbyname` |           23 |               23 |                  0 |
| **Total**          |       **23** |           **23** |              **0** |

The 23 declarations reference 19 distinct target spells. Every resolved target
contains a normalized buff declaration.

Supporting the measured target-bearing effect type removes all 23 former
`name` compatibility diagnostics. Deterministic official generation now
reports:

- 0 errors, 87 warnings, and 71 informational duplicate decisions;
- an 8,036,529-byte normalized artifact;
- a 1,407,994-byte search artifact with 2,767 documents; and
- byte-identical repeated output.

The remaining compatibility backlog is 51 spell constructs: 17 unknown
attributes and 34 unknown elements. The 13 spell-requirement diagnostics and
23 dangling references remain separately tracked.

These are aggregate read-only measurements. The official inputs and generated
official artifacts remain ignored and are not approved for publication.

## Verification

- Focused importer coverage checks a resolved target, absent and explicitly
  empty targets, a dangling target, and the same attribute on an unsupported
  effect type.
- Domain coverage checks deterministic reciprocal named-removal backlinks and
  excludes unresolved targets.
- The synthetic artifact makes `Clockwork Echo` remove the named
  `Clockwork Spark` buff.
- The web artifact test rejects a partial normalized removed-buff target.
- Browser coverage checks the resolved effect link, keyboard focus, reciprocal
  backlink, behavior boundary, responsive layout, and representative axe scan.
- `pnpm.cmd generate:official:check` passes deterministic zero-error official
  generation with the measurements above.
