# Spell buff evidence

Date: 2026-07-22

Scope: legacy behavior, synthetic compatibility fixtures, and read-only aggregate measurement of the canonical official dataset

Status: implemented source-parameter and direct-modifier slice; nested buff mechanics remain explicit backlog

## Legacy behavior

The preserved spell parser treats a direct `<buff>` child as an effect. It displays duration, mana upkeep, hit and attack limits, removability, stack limit, self targeting, resistance behavior, and nested stat modifiers. The rebuild retains those source declarations but does not copy the legacy parser's implicit defaults or infer engine behavior when an attribute is absent.

The shared legacy stat parser recognizes damage, resistance, primary, and secondary modifier children. Official spell data also uses casing variants for both modifier child names and several buff attributes. The adapter therefore matches the measured variants explicitly while keeping unknown content diagnosed.

## Normalized boundary

Each spell now has an ordered `buffs` array. A buff preserves:

- local large and small presentation paths;
- non-negative integer timer mode, duration, mana and Zorkmid upkeep parameters, hit limit, attack limit, and stack limit;
- loss-aware removable, self-targeting, resistable, detrimental, stackable, and allow-stacking declarations;
- exact additional source flags that are measured but do not have an approved behavior model;
- deterministic signed damage, resistance, primary, and secondary modifiers.

`null` distinguishes an absent parameter from a concrete zero. An invalid supplied integer or boolean also becomes `null` and emits a source-located diagnostic. Numeric primary and secondary IDs remain source IDs because the canonical installed build has no approved standalone stat-definition database.

The adapter accepts the measured `useTimer`/`usetimer`, `manaUpkeep`/`manaupkeep`, and `allowstacking`/`allowStacking` variants. Modifier child names are matched case-insensitively across the measured `damagebuff`, `resistbuff`, `primarybuff`, and `secondarybuff` families. Unsupported nested buff mechanics remain individual diagnostics instead of being silently discarded.

## Canonical aggregate measurement

Across all configured official source candidates, 268 buff declarations were observed. Source precedence leaves 266 active spells with one buff each; no active spell has more than one.

The 266 active buffs contain 795 normalized direct modifiers:

| Kind       | Count |
| ---------- | ----: |
| Damage     |    38 |
| Resistance |   189 |
| Primary    |   215 |
| Secondary  |   353 |

All 266 active buffs declare a timer mode, with values from 0 through 1. Other active parameter coverage is:

| Parameter      | Present | Range |
| -------------- | ------: | ----: |
| Duration       |     206 | 0-200 |
| Mana upkeep    |      18 |  1-10 |
| Zorkmid upkeep |       7 |  1-15 |
| Hit limit      |      16 |  1-12 |
| Attack limit   |      13 |  1-20 |
| Stack limit    |     172 |  1-55 |

Loss-aware boolean coverage is 60 removable declarations, 126 self-targeting declarations, 1 resistable declaration, 148 detrimental declarations, 47 stackable declarations, and 175 allow-stacking declarations. Fifteen additional source-flag values are retained without inventing behavior.

## Diagnostics and remaining boundary

After this slice, two identical canonical imports are byte-identical and report no errors, 2,518 warnings, and 71 informational duplicate decisions. The measured unsupported/partially-supported item-and-spell backlog falls from 2,576 to 2,484 constructs: 1,510 item diagnostics and 974 spell diagnostics. Nineteen dangling references remain separately reported.

The buff root and the four supported modifier families no longer produce compatibility diagnostics. Remaining spell work includes animation metadata and nested buff mechanics such as effect hooks, hit-event buffs, sight changes, halos, invisibility, muting, polymorph, and other engine-specific declarations. Those constructs are not represented as completed behavior by this slice.

The web page presents the normalized parameters and signed modifiers, explicitly labels them as source declarations, and does not infer stacking resolution, trigger timing, final combat totals, or undocumented currency behavior. Presentation paths remain in the local generated artifact and are not rendered while the asset-publication boundary is unresolved.

## Verification

- Focused domain and pipeline tests cover valid values, casing aliases, multiple declaration ordering, signed modifiers, invalid numeric and boolean tokens, unknown modifier keys, missing stat IDs, unknown attributes, and unsupported nested children.
- The runtime artifact guard requires every buff field and rejects malformed nullable, numeric, boolean, flag, or modifier shapes.
- Synthetic desktop/mobile browser coverage verifies the buff source parameters, signed modifier labels, numeric stat-ID disclosure, explicit empty state, keyboard navigation, and axe baseline.
- The canonical official import is deterministic and the static application build consumes the ignored local artifact without publishing it.
