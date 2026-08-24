# ADR 0005: Project-authored stat reference

Date: 2026-08-09; amended 2026-08-24
Status: Accepted
Owners: repository owner + maintainer

## Context

The canonical Dungeons of Dredmor `1.1.5 public_beta` installation declares
damage, resistance, primary, and secondary modifier selectors throughout its
entity databases but contains no standalone `statDB.xml`. The preserved
application supplies its stat catalogue in JavaScript, including prose, icon
names, and derived-stat formulas whose provenance, redistribution status, and
accuracy are not suitable for automatic wholesale reuse. A later parity review
separately verified the bounded selector-to-icon mapping against all 62
catalogue records and confirmed every referenced PNG in the canonical local
installation.

The local parity product needs stable names, routes, backlinks, and filters for
the source selectors without pretending that a project-authored mapping came
from the official XML or accepting the preserved formulas as engine truth.

## Decision

Maintain an independently authored, versioned Dredmorpedia stat reference for
the canonical dataset. Its first version maps the complete verified modifier
vocabulary: 16 damage keys, the corresponding 16 resistance keys, six primary
IDs, and 24 secondary IDs.

The catalogue contains only stable IDs, display names, categories, exact
modifier selectors, and an optional project-owned stat-icon asset ID. It does
not copy legacy tooltip prose, embed official file paths, or define derived-
stat/gameplay formulas. It is imported as a distinct `reference` source with
its own source version and file provenance. Official entity XML remains the
source of every modifier value.

Version 1.1.0 assigns one closed icon identity to each of the 62 canonical stat
definitions. The ignored official source manifest independently resolves those
identities to 61 unique base-game UI PNG files; Wand Affinity and Wand Crafting
intentionally share the same verified source image. This separation keeps the
semantic mapping reviewable in tracked project data while keeping official
paths, bytes, and generated copies inside the existing local-only asset
boundary. An active artifact may request a stat icon only through this closed
set, and a configured presented-asset set must declare every requested ID.

Modifier records retain their original kind/key/amount and may additionally
carry a resolved `statId`. Missing definitions remain valid and visible by raw
selector. Duplicate catalogue selectors are errors and are not linked.

The ignored canonical manifest is upgraded idempotently to include the tracked
reference source before official generation. The source root is narrow and
repository-contained; reference sources are excluded from asset fallback
probing.

## Consequences

### Positive

- Official local builds gain stable stat pages, readable modifier labels, and
  backlinks plus familiar image-led item summaries without inventing source
  XML.
- Source provenance clearly distinguishes Dredmorpedia definitions from
  official game records.
- A future corrected or expanded catalogue can be reviewed and versioned
  independently of a game dataset.
- Unverified mechanics and legacy prose remain outside the generated contract.

### Negative

- The project owns maintenance of the factual mapping and its evidence.
- Stat descriptions and formulas remain intentionally incomplete.
- The project now owns the reviewed selector-to-icon identity mapping and must
  reverify both it and the local official files for another complete dataset.
- A future game version must verify catalogue compatibility rather than
  inheriting this mapping automatically.

## Alternatives

- Reuse the preserved JavaScript table wholesale: rejected because it mixes
  factual mappings with text, assets, and formulas of uncertain provenance and
  correctness.
- Commit or embed the preserved icon paths directly as publishable assets:
  rejected because official imagery remains local-only and path resolution
  belongs to the ignored source manifest.
- Keep every numeric selector unnamed: rejected because it leaves a major
  parity surface unnecessarily opaque despite a verifiable mapping.
- Treat the catalogue as official game data: rejected because the measured
  build does not contain it.

## Validation / follow-up

- Import tests enforce all 62 unique selectors and ambiguous-selector failure.
- Import and manifest tests enforce all 62 closed icon identities, the exact
  reviewed official paths, the known 1.0.0-to-1.1.0 reference upgrade, and
  rejection of unreviewed IDs.
- The web artifact boundary verifies every resolved modifier points to a
  matching stat definition and every stat-requested icon is declared by a
  configured presented-asset set.
- Deterministic synthetic and ignored official generation include the catalogue
  checksum and source version.
- Formula or descriptive additions require separate evidence immediately before
  implementation.

Implementation evidence is recorded in
[`../analysis/stat-reference-catalog-evidence-2026-08-09.md`](../analysis/stat-reference-catalog-evidence-2026-08-09.md)
and
[`../analysis/stat-icon-parity-evidence-2026-08-24.md`](../analysis/stat-icon-parity-evidence-2026-08-24.md).
