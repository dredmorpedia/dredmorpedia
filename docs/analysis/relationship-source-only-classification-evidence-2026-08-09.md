# Reviewed source-only relationship classification evidence

Date: 2026-08-09

## Scope

This slice implements the owner's approval to classify exactly 16 `lockpick`
skill loadouts and two `Spores` spell item-list options as source-only item
labels in the canonical Dungeons of Dredmor `1.1.5 public_beta`, Steam build
`22934623` dataset. It does not create an item, alias, route, or inferred engine
behavior.

## Reviewed boundary

The review is matched only when all of these values agree with a tracked rule:

- dataset ID and dataset version;
- declaring source ID and source version;
- owning normalized entity ID;
- relationship family; and
- exact, case-sensitive source label.

The approved owners are Perception, Burglary, and Piracy for their `lockpick`
loadouts, plus Spore Stash for its `Spores` item-list options. Every classified
relationship retains its original label and carries the stable review ID
`relationship-review:2026-08-09:lockpick-and-spores-source-only`. A same-named
record in another dataset, version, source, owner, or relationship remains
unresolved.

## Artifact and presentation behavior

- Named spell item-list options now use the same loss-aware item-resolution
  contract as named skill loadouts.
- Exact links carry a matching normalized target and compatibility `itemId`.
- Source-only and unresolved relationships carry no target or item ID.
- Missing/blank item options carry no relationship record.
- Skill and spell pages display the original source-only label without a link.
- Each approved declaration emits an informational
  `reviewed_source_only_reference` record rather than a dangling warning, so
  the classification remains visible in dataset health and entity diagnostics.
- Item backlinks consume only resolved target IDs; source-only labels cannot
  become backlinks accidentally.

## Canonical measurement

The ignored canonical artifact contains:

- 47 exact and 16 source-only named skill loadouts, plus 13 type-only loadouts;
- 189 exact, two source-only, and one then-unresolved item-list option;
- 18 reviewed source-only informational records;
- five remaining dangling-reference warnings; and
- 0 errors, 5 warnings, and 89 informational records overall.

The remaining warnings are the probable `Acidium Salis` typo, the deliberate
`non-existant-spell` placeholder, and the three ambiguous monster spell labels.

## Verification

- Review-rule tests prove that changing any scope dimension prevents a match.
- Pipeline tests cover exact/unresolved item-option serialization and reviewed
  rule matching.
- Domain backlink tests accept only explicitly resolved option targets.
- Web artifact tests require resolution for named item options, reject invalid
  shapes, and accept a reviewed source-only option without an item ID.
- `pnpm.cmd generate:official:check` generates 763 items and 2,767 search
  documents with 0 errors / 5 warnings / 89 info and byte-identical output.
- No official input, generated official artifact, asset, or machine-local path
  is committed.

## Subsequent decision

The owner subsequently approved the separate narrowly scoped,
provenance-bearing correction from `Acidium Salis` to the existing `Acidum
Salis` item. Its implementation and current measurements are recorded in
[`relationship-reviewed-correction-evidence-2026-08-09.md`](relationship-reviewed-correction-evidence-2026-08-09.md).
Keep the placeholder and ambiguous spell labels unresolved absent new evidence.

On 2026-08-22, ADR 0006 superseded only the Lockpick portion of this
classification. A separately versioned project reference now creates an
explicitly labelled `item:lockpick` identity from the 16 active loadout
declarations, the active `Lucky Pick` direct item target, and the verified
official icon path, without importing the legacy-authored price. Those
relationships resolve exactly and no longer emit source-only audit records. A
later read-only installation search found additional room, tweak,
configuration-text, and executable evidence but did not expand the generated
item contract. The two `Spores` options retain this document's source-only
classification and stable review ID. Current measurements are in
[`engine-item-reference-and-macguffin-catalogue-evidence-2026-08-22.md`](engine-item-reference-and-macguffin-catalogue-evidence-2026-08-22.md).
