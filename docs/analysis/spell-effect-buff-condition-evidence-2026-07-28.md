# Spell effect buff-condition evidence

Date: 2026-07-28

Scope: preserved legacy behavior, independently authored synthetic fixtures,
and read-only aggregate measurement of the canonical official dataset

Status: implemented loss-aware source-buff and named buff-presence conditions;
combined trigger eligibility and timing are not inferred

## Legacy behavior

The preserved generic effect parser reads chance, caster/self targeting, burn,
resistance, and taxonomy fields. Its trigger and damage-over-time effect
parsers retain their spell references and trigger vocabulary. No preserved
parser reads `requirebuff`, `requireBuff`, `requirebuffontrigger`,
`requirebuffontriggername`, `requirebuffonnottrigger`, or
`requirebuffonnottriggername`.

The legacy presentation therefore loses all six measured spell-effect
condition spellings. The rebuild uses the source vocabulary directly instead
of inventing behavior from that omission.

## Normalized and relationship boundary

Every direct `SpellEffect` now carries a required `conditions` object:

- `requiresSourceBuff` accepts the measured `requirebuff` and `requireBuff`
  aliases as a loss-aware nullable boolean;
- `requiredBuff` preserves the paired `requirebuffontrigger` flag and
  `requirebuffontriggername` spell reference; and
- `forbiddenBuff` preserves the paired `requirebuffonnottrigger` flag and
  `requirebuffonnottriggername` spell reference.

The attributes are supported only on the measured `trigger` and `dot` effect
types. A future occurrence on another effect type remains an unknown-attribute
diagnostic. Invalid flags become `null`; blank names, incomplete flag/name
pairs, and simultaneous source-buff aliases receive source-located
diagnostics. The canonical lowercase alias wins a simultaneous-alias conflict
deterministically.

Non-blank named conditions preserve the source name and canonical key, resolve
through the normal spell identity map, and form deterministic reciprocal
backlinks. A missing target remains visible and produces the existing
dangling-reference diagnostic. The strict web schema requires the complete
loss-aware shape and rejects partial normalized key/name pairs.

The spell page shows the source flag and linked or unresolved named buff for
each direct effect, plus an explicit no-conditions state. It does not infer
buff-presence evaluation order, trigger eligibility, duration, consumption,
timing, or interaction with the other direct effect controls.

## Canonical aggregate measurement

Read-only inspection of all configured official sources found 143 condition
attributes across 86 candidate direct effects:

| Source      | Conditioned effects | Condition attributes |
| ----------- | ------------------: | -------------------: |
| Base game   |                   7 |                    7 |
| Expansion 1 |                   0 |                    0 |
| Expansion 2 |                  46 |                   77 |
| Expansion 3 |                  33 |                   59 |

The candidate attributes comprise:

- 25 lowercase `requirebuff` and four camel-case `requireBuff` declarations;
- 49 complete `requirebuffontrigger`/`requirebuffontriggername` pairs; and
- eight complete
  `requirebuffonnottrigger`/`requirebuffonnottriggername` pairs.

All measured flags are `1`. Every named pair is complete and non-blank, no
candidate supplies both source-buff aliases, and the 57 named declarations use
14 unique spell names that all resolve in the active dataset. Candidate shapes
are confined to 70 `trigger` and 16 `dot` effects.

Source precedence leaves 73 conditioned effects across 38 active spells:

- 58 `trigger` and 15 `dot` effects;
- 16 enabled source-buff requirements;
- 49 enabled required named-buff declarations; and
- eight enabled forbidden named-buff declarations.

All 57 active named conditions resolve. Completing this family removes exactly
130 former direct-effect attribute diagnostics. The spell compatibility
backlog falls from 1,359 to 1,229 constructs:

- 1,195 remaining unknown direct-effect attributes; and
- 34 remaining unknown spell elements.

The 13 separately tracked non-mana spell-requirement diagnostics and 23
dangling references are unchanged.

Deterministic official generation reports:

- 0 errors, 1,265 warnings, and 71 informational duplicate decisions;
- a 6,835,017-byte normalized artifact;
- an unchanged 1,348,711-byte search artifact with 2,767 documents; and
- byte-identical repeated output.

## Verification

- Focused importer coverage exercises both source-buff aliases, explicit
  true/false flags, positive and negative named pairs, invalid flags, blank
  names, incomplete pairs, simultaneous aliases, dangling names, and a
  condition attribute on an unsupported effect type.
- The synthetic artifact includes enabled source-buff, required named-buff,
  forbidden named-buff, reciprocal-link, and no-conditions states.
- The domain relationship test verifies deterministic required/forbidden
  backlinks, including explicit false.
- The runtime artifact guard rejects a partial normalized condition key/name
  pair.
- The synthetic spell page exposes the flags, links, backlinks, no-conditions
  state, and the no-inference boundary.
- Deterministic zero-error official generation removes exactly the intended
  130 compatibility diagnostics without changing search output.
