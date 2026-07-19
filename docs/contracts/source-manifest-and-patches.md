# Source manifest and patch contract

Status: implemented foundation contract

The importer treats source selection, version identity, precedence, and reviewed corrections as explicit input. It never discovers precedence from directory enumeration and never edits a source root.

## Source manifest

Source manifest schema version `2` requires:

- a stable `datasetId` and human-readable `datasetVersion`;
- one or more sources with unique IDs, explicit versions, kinds, integer precedence, roots, and declared database files; and
- an ordered `patches` array, which may be empty; plus
- an optional repository-relative `routeRegistry` path.

Lower source precedence is processed first. A higher precedence replaces a lower candidate with the same entity kind and canonical key. Equal precedence is resolved by source ID, source file, and source location so the result never depends on input enumeration or asynchronous timing.

Patch references contain an integer `order` and a repository-relative `path`. Patch paths must resolve inside the repository, are included in input checksums, and are sorted by order then path. Duplicate source IDs and duplicate patch paths are rejected.

## Published-route registry

Route-registry schema version `1` pins canonical slugs and historical aliases for a specific dataset ID/version. Each entry names an entity kind and resolves its target either by current canonical entity ID or, preferably, by exact source ID plus original source ID. The source-ID form survives a corrected display name or canonical key as long as the source record identity remains stable.

Canonical slugs and aliases must already be normalized URL slugs. A route may have only one owner within an entity kind. Malformed entries, duplicate declared targets, and conflicting declared routes reject the registry during schema loading. When a structurally valid registry is resolved, stale or ambiguous targets, scope mismatches, and multiple entries that resolve to one active entity emit diagnostics and reject the registry atomically; partial registry application is not allowed.

Registry canonical routes and aliases are reserved before automatic name-slug and source-ID allocation. They therefore keep ownership when a later entity would otherwise claim the same route. Automatic ambiguous aliases are omitted, while registry aliases remain authoritative. Successful entries emit `route_registry_applied` diagnostics and are included in input checksums.

The registry preserves routes for entities that still resolve in the active dataset. Removed-entity tombstones or cross-entity redirects require a later explicit contract; the static application does not silently redirect an unresolved route.

A source manifest without `routeRegistry` remains valid for local/import compatibility, but it does not constitute a frozen public-route release. Only synthetic route registries may be committed until the publication policy covers any official-derived identity/slug inventory.

Schema version `1` manifests remain readable as a local migration aid. They produce `unversioned` dataset/source provenance and cannot declare patches or a route registry. New or edited manifests must use version `2`.

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
