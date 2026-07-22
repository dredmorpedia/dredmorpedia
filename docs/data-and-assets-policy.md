# Game data and asset policy

Status: interim project policy
Updated: 2026-07-19

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

## Current publication gate

Code and documentation may be developed and published independently of restricted content. A production data deployment remains blocked until the generated-data and asset boundary above is resolved. GitHub Pages is a viable technical candidate for a static build, but hosting availability does not answer the content-rights question.
