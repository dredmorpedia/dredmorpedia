# Dangling-reference classification

Date: 2026-08-09

## Scope

This checkpoint classifies the complete warning set from the canonical
`1.1.5 public_beta` import before any reference alias, source correction, or
fabricated entity is introduced. It compares the normalized records with the
declaring official XML, the installed validation schemas, and the preserved
application's relationship rendering.

The work is evidence only. It does not change normalized identities, links,
diagnostic severity, or runtime interpretation.

## Corrected measurement

The 23 `dangling_reference` warnings are 23 source declarations, not 23
distinct missing entities. They reduce to nine owner/reference pairs and seven
distinct unresolved source labels:

| Source label                        | Owners                       | Declarations | Evidence class                  |
| ----------------------------------- | ---------------------------- | -----------: | ------------------------------- |
| `lockpick`                          | Perception, Burglary, Piracy |           16 | Engine/source-only candidate    |
| `Spores`                            | Spore Stash                  |            2 | Engine/source-only candidate    |
| `Acidium Salis`                     | Luckier Find                 |            1 | Probable source typo            |
| `non-existant-spell`                | Satanic Locator              |            1 | Deliberate placeholder          |
| `Strong Lingering Dullness Missile` | Tougher Lord Dredmor         |            1 | Ambiguous stale name            |
| `Strong Lingering Weakness Missile` | Tougher Lord Dredmor         |            1 | Ambiguous stale name            |
| `Eye Lasers`                        | Deep Raven                   |            1 | Ambiguous cross-kind/stale name |

All 23 warnings use the owning entity's provenance because relationship-level
source locations are not retained in the current artifact. Repeated
declarations therefore receive stable occurrence suffixes but share the same
message and source location.

## Evidence by class

### Engine/source-only candidates

The 16 `lockpick` declarations are named `misc` loadout subtypes across three
skills. The installed skill schema makes `subtype` an unconstrained string,
and the base recipe source separately produces `Lockpick` at multiple skill
levels without an item database record. The preserved application retains the
subtype label but its item renderer emits an icon/link only when the item
database contains the same name. This is consistent with an engine-defined
inventory/subtype token, but it does not establish a normalized item entity.

The two `Spores` declarations are separate amount-bearing options in one
`spawnitemfromlist` effect. No normalized `Spores` item exists. Other source
shapes use distinct `Mushroom Spores` and `randommushroom` labels, so mapping
`Spores` to either would be an unsupported inference. The installed spell
schema permits an arbitrary option name, and the preserved application again
hides an unresolved item icon rather than defining a fallback target.

Safe conclusion: preserve these labels and amounts without fabricating item
routes. A future explicit `source-only` relationship status is more accurate
than treating absence as proof of a missing entity, but that status should be
implemented as a reviewed contract rather than as fuzzy matching.

### Probable source typo

`Luckier Find` names `Acidium Salis`; the active item database instead contains
`Acidum Salis`. The one-character difference and otherwise exact name make a
source typo highly probable. This still should not become a global fuzzy alias:
the safe correction is source-version-, owner-, relationship-, and
target-scoped, with the original label and correction provenance retained.

### Deliberate placeholder

The Satanic Locator macguffin literally names `non-existant-spell`, and no
spell with that name exists. The spelling and placeholder wording are direct
evidence that this is not a missing encyclopedia entity. It should remain a
visible unresolved source declaration; no route or relationship should be
invented for it.

### Ambiguous stale or cross-kind spell names

Tougher Lord Dredmor names two `Strong Lingering ... Missile` spells. Neither
exists. The source contains both unprefixed `Lingering ... Missile` and
`Supreme Lingering ... Missile` records, so there is no evidence-backed choice
between a stale name, a removed intermediate spell, or either surviving
variant.

Deep Raven names `Eye Lasers` as a spell. `Eye Lasers` exists as an ability,
and that ability activates the separate `Eye Laser Blast` spell. This makes a
stale ability-label reference plausible, but the monster source and schema
still declare a spell relationship. Cross-kind linking or silently mapping it
to `Eye Laser Blast` would overstate the evidence.

Safe conclusion: keep all three spell labels unresolved until runtime behavior
or another independent authoritative source establishes their intended
targets.

## Preserved-application boundary

The preserved application does not repair any of these relationships. Unknown
items render no icon or link. Unknown monster spells remain plain text and log
a dereference warning. That behavior supports keeping original labels visible,
but it is not evidence for a target mapping or engine behavior.

## Recommended implementation order

1. Define a loss-aware relationship-resolution contract that distinguishes a
   resolved entity link, an explicitly reviewed source-only label, and a truly
   unresolved target while retaining the original source label.
2. Apply that contract first to the 16 `lockpick` loadouts and two `Spores`
   options only after the owner approves their source-only classification.
3. Add a narrowly scoped, provenance-bearing correction for `Acidium Salis`
   only after the owner approves the proposed `Acidum Salis` target.
4. Keep the placeholder and three ambiguous spell names unresolved. Revisit
   each immediately before a related parity feature if new engine/runtime
   evidence becomes available.
5. Report both declaration count and unique owner/reference-pair count in
   future dataset-health work so repeated source declarations are not mistaken
   for distinct missing entities.

## Verification

- The existing ignored canonical artifact reports 0 errors, 23 warnings, and
  71 informational duplicate decisions.
- Filtering the diagnostic artifact by `dangling_reference` yields 23 records,
  nine owner/reference pairs, and seven distinct labels with the exact
  16/2/1/1/1/1/1 declaration split above.
- Read-only source inspection found no normalized target for six labels and the
  single probable spelling target described above.
- No official input, generated official artifact, asset, or local installation
  path is committed by this checkpoint.
