# Game data and asset policy

Status: owner-approved local-first policy
Updated: 2026-08-12

This document defines the working safety and publication boundary for the rebuild. It is deliberately conservative while ownership, licenses, and redistribution permissions are investigated. It is project policy, not legal advice.

## Agreed source scope

- Initial parity targets the base game and all three official expansions.
- The canonical measurement baseline is Dungeons of Dredmor `1.1.5 public_beta`, Steam app `98800`, build `22934623`, internal branch key `public_beta`, with the base game and all three official expansions installed.
- General mod support should remain possible, but broad mod compatibility is lower priority than official-content parity.
- The inherited bundled mods remain historical evidence. Their presence in the fork does not prove permission to reuse or republish them in new outputs.

## Local installation boundary

A local Dungeons of Dredmor installation is read-only input.

Repository tools and contributors may:

- enumerate and read files needed for analysis;
- calculate hashes, counts, diagnostics, and other non-mutating measurements;
- copy approved inputs into a dedicated gitignored workspace when a task explicitly requires an import.

Repository tools and contributors must not:

- edit, patch, format, rename, move, delete, unpack into, or create files inside the installation;
- execute historical substitution commands against the installation;
- commit or document a contributor's absolute installation path;
- assume that read access grants redistribution rights.

Any future importer must accept an explicit source root, validate that reads remain inside it, reject traversal and unsafe links, and write only to a separate configured output directory.

The local legacy comparison server may expose files from the four roots in the
ignored official manifest through historical request paths. This is a
localhost-only, read-only virtual overlay: it validates containment, does not
copy or change installation files, and does not make those inputs publishable.

The implemented source manifest is a trusted local/operator configuration
boundary. It may name an absolute external source root, but it is not safe to
accept from an untrusted upload or remote request. Every database path declared
beneath that root remains relative and is checked after real-path resolution so
traversal and symbolic-link escapes cannot widen read access. Generated outputs
sanitize the root rather than recording its machine-local value.

## Repository boundary

Do not commit:

- official XML databases or official assets unless explicit redistribution permission is documented;
- generated datasets, indexes, thumbnails, or converted assets while their publication rights are unresolved;
- local paths, machine-specific configuration, credentials, save files, logs containing private paths, or crash dumps;
- new copies or derivatives of bundled mod content without a provenance and license decision.

Tracked automated tests should use small synthetic fixtures or content with explicit compatible redistribution terms. Synthetic fixtures must be independently authored and limited to the minimum structure needed to test behavior.

## Generated output

Local generated artifacts belong under a gitignored location such as `data/generated/`. Each pipeline run should eventually record source identifiers and versions, checksums, tool version, diagnostics, and deterministic build metadata without exposing private absolute paths.

Generated output is not automatically safe to publish merely because it is transformed. Before any dataset or asset reaches GitHub Pages or another public host, the project needs a written decision covering:

1. the rights or permission supporting publication;
2. which fields and assets may be included;
3. required attribution and notices;
4. whether users instead need a local import workflow;
5. a repeatable check preventing restricted inputs from entering the deployment artifact.

The tracked Dredmorpedia stat and engine-item references are independently
authored project data, not extracts of an official database. The stat reference
contains only reviewed modifier-selector/name/category mappings plus closed
project-owned stat-icon identities; it intentionally excludes preserved legacy
prose, official icon paths/bytes, and gameplay formulas. The ignored official
manifest resolves those identities within the same local-only asset boundary.
The engine-item reference contains only separately
evidenced identity/absence facts and an official source path for local asset
resolution. Importing either as a separately versioned `reference` source does
not broaden permission to publish official entity values or assets.
Engine-item references must be visibly
distinguished from ordinary game records, may claim only separately evidenced
facts, and must be reverified for each complete game dataset. A referenced
official icon remains local-only official content even when a tracked project
reference points to its source path.

## Local product and asset scope

The current product target is a locally complete `1.1.5 public_beta` build. Its
official generated data and assets remain ignored and non-public.

An incremental asset pipeline may copy only files referenced by entities or
features that the modern application actually presents. The initial target is
the meaningful entity artwork used by the preserved application for parity,
not a bulk copy of unrelated game resources. Each import must:

- read the installation without modifying it;
- validate source references and containment before copying;
- write only to a separate gitignored generated-assets directory;
- keep machine-local source roots out of generated metadata; and
- include deterministic checksums and missing-asset diagnostics proportional
  to the generated data contract.

Specialized presentation remains page-driven. Monster detail pages now render
only the first downward idle frame: animation XML resolves its explicit first
frame, binary SPR input decodes only its measured first frame, and declared hue
or exact named palettes are applied during deterministic generation. Complete
animations and unrelated sprite resources remain out of scope.

The implemented icon slices follow this boundary for item, skill, ability,
spell, monster, item-catalogue, Encrust-slot, and stat presentation. They copy
referenced PNG item, skill, ability, and root spell icons, derive only the
selected first monster idle frame, and copy only the manifest-declared gold,
quality-star, Encrust applicability and instability, and reviewed stat icons from the
importer's first-registration byte snapshots into the managed, gitignored web
asset directory. The schema-2 generated catalog uses typed entity and UI icon
mappings, content-addressed filenames, complete bounded PNG validation, exact
active artifact identity, and fallback diagnostics. Its schema-3 manifest
additionally declares the complete expected UI asset ID set so the web can
reject a missing, extra, stale, checksum-mismatched, or stat-required interface
icon before rendering the asset set.
Missing, unsupported, or invalid images use a deliberate page fallback. Buff-
and effect-local spell icons remain out of scope because no implemented page
presents them as entity art. Other entity art and monster animation frames
remain out of scope until a page presents them through a separately reviewed
slice.

Selected screenshots from the local product may be prepared for a permission
request. A screenshot does not itself grant permission to publish the
underlying dataset, assets, or a public official-content build.

## Current publication boundary

Code, documentation, and independently authored synthetic fixtures may be
developed publicly. Official XML, generated official datasets, and imported
official assets remain local-only. Public official-content deployment is
postponed until documented permission or other reviewed legal evidence defines
which fields and assets may be hosted, with what attribution and safeguards.

This local-first boundary is the approved current policy and allowed ADRs 0001
and 0002 to be accepted. It is not a conclusion that future redistribution is
permitted. GitHub Pages remains a technical candidate only.
