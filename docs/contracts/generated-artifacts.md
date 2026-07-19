# Generated artifact contract

Status: implemented foundation contract

The data pipeline writes a coordinated set of deterministic JSON files. Consumers must validate the declared versions and dataset identity before using them. Generated official-data derivatives remain ignored and non-public regardless of their schema validity.

## Files

### `artifact.json`

Dataset schema version: `2`

Contains the dataset ID, language, ordered source summaries, normalized entity collections, and diagnostic counts. Search documents were removed from version 2 so normal page generation does not load the search payload.

### `search.json`

Search schema version: `1`

Contains `datasetSchemaVersion: 2`, the matching dataset ID/language, and deterministic search documents. Each document has an entity ID, route, normalized text, entity/source/category facets, and item-stat facets. The web application loads this file only on search routes.

### `diagnostics.json`

Contains the stable, source-located diagnostics array for the same import. Entity records refer to entries by deterministic diagnostic ID.

### `manifest.json`

Manifest schema version: `2`

Contains sanitized input paths and checksums plus the byte length and SHA-256 checksum of `artifact.json`, `search.json`, and `diagnostics.json`. Machine-local absolute source paths must never appear in this file.

## Cross-file invariants

- Dataset IDs must match across normalized, search, and manifest artifacts.
- `search.json.datasetSchemaVersion` must equal `artifact.json.schemaVersion`.
- Inputs, entities, diagnostics, search documents, and manifest entries use deterministic ordering.
- Identical inputs and generator code must produce byte-identical files.
- Writes use per-file atomic replacement and are refused inside an input source root.
- The web layer fails its build on an unsupported artifact version rather than guessing at compatibility.

## Evolution rules

- Increment the affected schema version for removed or reinterpreted fields, changed identity/ordering behavior, or any change that makes an older consumer unsafe.
- Additive fields may retain the current version only when older consumers can ignore them without changing meaning.
- Update domain types, pipeline serialization, runtime consumer checks, deterministic tests, this document, and a migration note in the same change.
- Do not retain a second compatibility implementation before a real published artifact requires it; generated local artifacts can be regenerated from approved inputs.
