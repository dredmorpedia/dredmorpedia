# Spell buff sight-modifier evidence

Date: 2026-07-22

Scope: legacy behavior, synthetic compatibility fixtures, and read-only aggregate measurement of the canonical official dataset

Status: implemented signed sight-radius source modifiers; final visibility and darkness behavior remain uninterpreted

Later note: diagnostic totals in this slice are its historical completion baseline. The subsequent general hardening review exposed previously silent spell-effect attributes and children; current totals are recorded in [`general-project-review-hardening-2026-07-22.md`](general-project-review-hardening-2026-07-22.md).

## Legacy behavior

The preserved stat parser handles a direct `<sightbuff>` child as a special case. It reads the `amount` attribute as a floating-point value and labels the result `Sight Radius`. This establishes the source declaration's display meaning, but it does not establish a complete engine formula for darkness, visibility, stacking, or the player's final sight radius.

## Normalized boundary

Each `SpellBuff` now contains an ordered `sightModifiers` array. Every declaration preserves a nullable signed finite `amount`. `null` distinguishes a missing or malformed amount from a concrete zero, while malformed and missing values produce source-located diagnostics. Unknown attributes and nested child elements remain explicit diagnostics.

The web labels each declaration `Sight radius`, displays its signed source amount, and states that final visibility and darkness behavior are not derived. This dedicated shape preserves the semantic source element without fabricating a standalone official stat definition or rewriting it as a numeric secondary-stat ID.

## Canonical aggregate measurement

The active canonical dataset contains 18 `<sightbuff>` declarations across 18 spells and 18 buffs. Every declaring buff has exactly one sight modifier. All declarations:

- use lowercase `sightbuff`;
- contain only the `amount` attribute;
- have no nested content;
- supply a valid signed integer amount.

Amounts span -3 through +3 with this distribution:

| Amount | Declarations |
| -----: | -----------: |
|     -3 |            5 |
|     -2 |            1 |
|     -1 |            6 |
|     +2 |            5 |
|     +3 |            1 |

No active declaration supplies zero or +1. The normalized contract accepts any finite signed source number because the legacy parser uses floating-point parsing and synthetic coverage verifies a fractional value without claiming that the official build uses one.

## Diagnostics and remaining boundary

The 18 declarations previously generated 18 `unknown_element` compatibility diagnostics. Completing this slice reduces spell unknown-element diagnostics from 921 to 903 and the item-plus-spell compatibility backlog from 2,431 to 2,413: 1,510 item diagnostics plus 903 spell diagnostics. The existing 19 dangling references are unchanged.

Two canonical imports are byte-identical and report no errors, 2,447 warnings, and 71 informational duplicate decisions. Remaining spell unknown-element diagnostics are:

| Element             | Diagnostics |
| ------------------- | ----------: |
| `anim`              |         666 |
| `impact`            |          71 |
| `halo`              |          53 |
| `ai`                |          47 |
| `description`       |          32 |
| nested `effect`     |          11 |
| `invisible`         |           9 |
| `mute`              |           6 |
| `polymorph`         |           4 |
| `dodgebuff`         |           1 |
| `payback`           |           1 |
| `senseWallsFlag`    |           1 |
| `zorkmidAbsorption` |           1 |

Thirteen non-mana spell requirements and two unrelated requirement `level` attributes remain separately diagnosed. This slice does not claim parity for nested effects, animation/impact/AI metadata, halos, invisibility, muting, polymorph, dodge behavior, or any other unsupported buff mechanic.

## Verification

- Focused importer tests cover ordered positive, negative, and fractional values; malformed and empty amounts; unknown attributes; and nested unknown children.
- The runtime artifact guard requires the complete `sightModifiers` array and rejects non-finite or non-numeric supplied amounts while permitting the explicit `null` unavailable state.
- Synthetic desktop/mobile browser coverage verifies the `Sight radius` label, signed value, formula boundary note, existing keyboard navigation, and the axe baseline.
- The ignored canonical import is deterministic and normalizes all 18 measured declarations without publishing the generated artifact.
