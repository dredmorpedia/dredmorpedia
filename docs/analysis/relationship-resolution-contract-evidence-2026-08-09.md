# Relationship-resolution contract evidence

Date: 2026-08-09

## Scope

This slice implements the first step recommended by the canonical
dangling-reference classification: a loss-aware relationship state that can
represent reviewed exceptions without erasing or rewriting the source label.
Named skill loadouts are the first integrated relationship family. No official
reference is reclassified or redirected by this change.

## Contract

`RelationshipResolution` has four valid shapes:

| Status        | Method                | Target                        | Review provenance         |
| ------------- | --------------------- | ----------------------------- | ------------------------- |
| `resolved`    | `exact`               | required normalized entity ID | not applicable            |
| `resolved`    | `reviewed-correction` | required normalized entity ID | required stable review ID |
| `source-only` | not applicable        | deliberately absent           | required stable review ID |
| `unresolved`  | not applicable        | absent                        | not applicable            |

Every shape retains the expected target kind and the original non-blank source
label. Domain constructors reject blank source labels, target IDs, and review
IDs. This makes a reviewed correction explicit rather than a fuzzy alias and
prevents absence alone from silently becoming a source-only classification.

## Skill-loadout integration

- Every named loadout starts as `unresolved` during normalization and retains
  its exact source item name.
- The deterministic second-pass linker changes only exact item matches to
  `resolved` with method `exact`.
- The existing `itemId` remains as a compatibility field and must equal the
  resolved target ID. Unresolved and source-only records cannot carry it.
- Generic type-only loadouts have no named item relationship and therefore no
  resolution record.
- Item backlinks and the skill page consume the explicit state. The page keeps
  unresolved labels visible and has a distinct source-only presentation ready
  for a future approved classification.
- The strict web artifact boundary rejects missing resolution data on a named
  loadout, changed source labels, target/ID mismatches, unreviewed source-only
  states, and resolution data on type-only loadouts.

The field is additive within dataset schema 3. Earlier local schema-3 outputs
must be regenerated; no official artifact has been published and no
compatibility reader is retained.

## Canonical measurement

At this contract-only checkpoint, the read-only `1.1.5 public_beta` import
contained:

- 47 exact named item loadouts;
- 16 unresolved named item loadouts (the already-classified `lockpick`
  declarations);
- zero reviewed-correction or source-only loadouts; and
- 13 type-only loadouts without an item relationship.

The complete diagnostic set remains 0 errors, 23 warnings, and 71 informational
duplicate decisions. All 23 warnings remain the previously classified dangling
references; this slice suppresses none of them.

## Verification

- Domain tests cover all four states, original-label retention, and blank
  label/target/review rejection.
- Pipeline tests cover exact and unresolved named loadout serialization.
- Web artifact tests reject an unreviewed source-only state and a resolution
  that loses its source label.
- `pnpm.cmd generate:official:check` generates 763 items and 2,767 search
  documents, reports 0 errors / 23 warnings / 71 info, and proves byte-identical
  output.
- No official input, generated official artifact, asset, or machine-local path
  is committed.

## Subsequent status and next decision gate

The owner approved the first decision: the 16 `lockpick` loadouts and two
`Spores` item-list options are now narrowly classified as reviewed source-only
labels. Named item-list options use the same contract, and the current
canonical import reports 5 warnings plus 18 source-only informational audit
records. See
[`relationship-source-only-classification-evidence-2026-08-09.md`](relationship-source-only-classification-evidence-2026-08-09.md).

The remaining decision gate is whether to approve the narrowly scoped,
provenance-bearing `Acidium Salis` to `Acidum Salis` correction.

The deliberate placeholder and three ambiguous monster spell labels remain
unresolved unless new evidence establishes a target.
