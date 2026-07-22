# Spell buff event-hook evidence

Date: 2026-07-22

Scope: legacy behavior, synthetic compatibility fixtures, and read-only aggregate measurement of the canonical official dataset

Status: implemented target-hit and player-hit spell relationships; other nested buff mechanics remain explicit backlog

## Legacy behavior

The preserved spell parser scans buff descendants for `<targetHitEffectBuff>` and `<playerHitEffectBuff>`. It presents them as conditional spell effects for hitting a target in melee or being hit in melee. Both shapes use `name` as the spell reference, and the shared legacy effect parser reads `percentage` as their chance.

The canonical sources additionally contain one `after="1"` declaration on a target-hit hook. Neither the legacy encyclopedia nor the available source establishes a safe timing formula for that flag, so the rebuild retains it as exact source metadata instead of assigning behavior.

## Normalized boundary

Each `SpellBuff` now has a deterministic `eventHooks` array. Target-hit hooks are emitted before player-hit hooks, and repeated declarations retain their source order within each kind. Every hook preserves:

- its `target-hit` or `player-hit` event kind;
- the original spell name, canonical key, and optional resolved spell ID;
- a loss-aware integer chance from 0 through 100;
- exact additional source flags, currently the measured `after` attribute.

`null` distinguishes an absent chance from an invalid supplied chance. Invalid numbers, missing spell names, unknown attributes, and nested child content produce source-located diagnostics. A missing target is not fabricated into a hook; a named but unresolved spell remains visible and emits a dangling-reference diagnostic.

The web presents these hooks inside their declaring buff with a linked or unresolved target, source percentage, and neutral source-flag wording. Target spells expose deterministic reciprocal backlinks. Event hooks are conditional relationships, so they are not folded into the direct-effect recursion tree.

## Canonical aggregate measurement

The active canonical dataset contains 61 hook declarations across 42 spells, with exactly one declaring buff on each of those spells:

| Hook kind  | Declarations |
| ---------- | -----------: |
| Target hit |           43 |
| Player hit |           18 |

Twenty-four spells have one hook, 17 have two, and one has three. Every declaration supplies a valid percentage, spanning 2 through 100. One target-hit declaration supplies the additional `after` flag. All 61 spell references resolve against the active 951-spell dataset, so the pre-existing 19 dangling references are unchanged.

The 61 declarations previously generated 53 compatibility diagnostics because the old diagnostic boundary reports one unsupported child-element key per declaring buff rather than one warning per repeated element. Completing this slice therefore reduces spell unknown-element diagnostics from 974 to 921 and the item-plus-spell compatibility backlog from 2,484 to 2,431: 1,510 item diagnostics plus 921 spell diagnostics.

## Remaining boundary

Two deterministic canonical imports are byte-identical and report no errors, 2,465 warnings, and 71 informational duplicate decisions. Remaining spell unknown-element diagnostics are:

| Element             | Diagnostics |
| ------------------- | ----------: |
| `anim`              |         666 |
| `impact`            |          71 |
| `halo`              |          53 |
| `ai`                |          47 |
| `description`       |          32 |
| `sightbuff`         |          18 |
| nested `effect`     |          11 |
| `invisible`         |           9 |
| `mute`              |           6 |
| `polymorph`         |           4 |
| `payback`           |           1 |
| `zorkmidAbsorption` |           1 |
| `senseWallsFlag`    |           1 |
| `dodgebuff`         |           1 |

Thirteen non-mana spell requirements and two unrelated requirement `level` attributes remain separately diagnosed. At completion of this slice, sight changes, nested effects, halos, invisibility, muting, polymorph, timing semantics, and other buff mechanics were still unsupported.

The subsequent sight-modifier slice normalizes the 18 `sightbuff` declarations, reducing the current compatibility backlog to 2,413 diagnostics: 1,510 item plus 903 spell diagnostics. Its current remaining-element table and formula boundary are recorded in [`spell-buff-sight-evidence-2026-07-22.md`](spell-buff-sight-evidence-2026-07-22.md).

## Verification

- Focused importer tests cover both event kinds, multiple declarations, linking, dangling targets, the `after` source flag, out-of-range and malformed chances, missing names, unknown attributes, and unsupported nested children.
- A pure domain query returns deterministic reciprocal backlinks with their buff and hook positions.
- The runtime artifact guard requires a complete hook shape and rejects unknown kinds, invalid percentages, malformed source flags, and invalid optional spell IDs.
- Synthetic desktop/mobile browser coverage verifies resolved and unresolved targets, percentages, the neutral `after` disclosure, reciprocal navigation, keyboard flow, and the axe baseline.
- The ignored canonical import is deterministic and its static application build consumes the richer artifact without publishing it.
