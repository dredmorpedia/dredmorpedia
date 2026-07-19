# Source manifest and patch contract

Status: implemented foundation contract

The importer treats source selection, version identity, precedence, and reviewed corrections as explicit input. It never discovers precedence from directory enumeration and never edits a source root.

## Source manifest

Source manifest schema version `2` requires:

- a stable `datasetId` and human-readable `datasetVersion`;
- one or more sources with unique IDs, explicit versions, kinds, integer precedence, roots, and declared database files; and
- an ordered `patches` array, which may be empty.

Lower source precedence is processed first. A higher precedence replaces a lower candidate with the same entity kind and canonical key. Equal precedence is resolved by source ID, source file, and source location so the result never depends on input enumeration or asynchronous timing.

Patch references contain an integer `order` and a repository-relative `path`. Patch paths must resolve inside the repository, are included in input checksums, and are sorted by order then path. Duplicate source IDs and duplicate patch paths are rejected.

Schema version `1` manifests remain readable as a local migration aid. They produce `unversioned` dataset/source provenance and cannot declare patches. New or edited manifests must use version `2`.

## Patch files

Patch file schema version `1` contains:

- a unique patch `id` and a non-empty `reason`;
- an `appliesTo` guard naming the exact dataset ID/version and source ID/version;
- one or more operations targeting an entity kind, canonical key, allowed field, expected value, and replacement value.

The expected value is a stale-input guard, not optional documentation. A patch is applied atomically only when its dataset/source scope, targets, fields, value types, and every expected value match. Otherwise none of its operations are applied and the importer emits source-located error diagnostics.

Patchable fields deliberately exclude identity, names, routes, raw provenance, diagnostic IDs, override history, and relationship objects. The initial allowlist covers normalized scalar fields and selected string arrays that can be safely relinked after patching. Extending the allowlist requires a matching type validator and tests.

## Provenance and diagnostics

Successful patches append an `appliedPatches` entry to each affected entity. The entry records patch ID/file/reason, guarded source ID/version, and the before/after value for every changed field. Raw source provenance and losing source variants remain unchanged.

Every successful patch emits `patch_applied` info diagnostics. Invalid scope, missing targets, source mismatches, unsupported fields, invalid value types, duplicate operations, and failed expected-value guards are errors. Diagnostics and patch histories use deterministic ordering.

Patch definitions are tracked code and data-review artifacts. They do not authorize publication of the patched source data or generated derivatives.
