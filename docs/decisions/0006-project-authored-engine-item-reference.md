# ADR 0006: Project-authored engine item reference

Date: 2026-08-22
Status: Accepted
Owners: repository owner + maintainer

## Context

The canonical Dungeons of Dredmor `1.1.5 public_beta` sources contain 16
active skill-loadout declarations for `lockpick`, and the base installation
contains `items/lockpick.png`, but no active item database record defines the
item. A Lockpick recipe is present only inside an XML comment. The preserved
site worked around this gap by mutating its local item database and assigning
the item a price of 10; that value is project-authored legacy behavior, not
canonical source evidence.

Treating the loadout declarations as permanently source-only prevents a useful
item route, image, and backlink surface. Copying the legacy mutation would hide
the provenance gap and turn an unsupported price into apparent game data.

The same review found two active official items whose direct `macguffin`
declarations currently fall through to the generic Item catalogue category.
They are real item records and should remain visible, but their mechanic has a
clearer source-backed category than the generic fallback.

## Decision

Maintain a narrowly scoped, independently authored, versioned engine-item
reference for the canonical dataset. Its first record identifies Lockpick by
name and official icon path and explains that it is referenced by active
starting-loadout declarations but absent from the active item database.

The reference is imported as a distinct `reference` source after the measured
game sources. It creates the stable `item:lockpick` identity and route, resolves
the existing loadout relationships, and may use the verified base-game icon in
the ignored local presented-asset output. The UI must label the record as an
engine reference and render undeclared item facts such as price and quality as
`Not declared`.

The reference does not patch the game installation or generated official XML,
does not activate commented XML, and does not import the preserved site's
invented price. A future complete dataset must first be checked for an active
official Lockpick record; if one exists, the reference must be retired rather
than override it.

Items with a direct `macguffin` declaration use the semantic `macguffin`
catalogue category. This changes presentation only; it does not infer engine
behavior from the declaration.

The earlier reviewed source-only classification remains valid for the two
`Spores` spell-list options. Its Lockpick portion is superseded by this record
because the exact labels can now resolve without an alias or correction.

## Consequences

### Positive

- Lockpick gains an image-led item route and complete starting-loadout
  backlinks without fabricating official item facts.
- Provenance remains explicit and queryable at the artifact and UI boundaries.
- Voodoo Globe and Satanic Locator remain visible under a source-backed
  Macguffin category instead of the generic Item fallback.
- The local asset policy remains page-driven and read-only toward the game
  installation.

### Negative

- The project owns the reference wording and must reverify it for another game
  version.
- The canonical source order contains one deliberately later reference source;
  validation must reject missing or altered reference metadata.
- Lockpick remains intentionally sparse because the source does not declare
  ordinary item stats.

## Alternatives

- Keep Lockpick source-only: rejected because active relationships and a
  verified official icon support a useful, honestly labelled reference route.
- Reproduce the legacy item mutation: rejected because the price and active
  item record are not present in the canonical sources.
- Hide the two Macguffin records: rejected because they are active official
  items, not parser accidents.

## Validation / follow-up

- Manifest tests enforce the exact reference source, version, ordering, and
  canonical game scope.
- Import tests enforce Macguffin categorization and exact relationship
  resolution without a reviewed correction.
- Web tests cover the reference badge, undeclared facts, item route, category,
  and keyboard-accessible relationships.
- Official generation must preserve zero errors and the existing four
  deliberate relationship warnings.

Implementation evidence is recorded in
[`../analysis/engine-item-reference-and-macguffin-catalogue-evidence-2026-08-22.md`](../analysis/engine-item-reference-and-macguffin-catalogue-evidence-2026-08-22.md).
