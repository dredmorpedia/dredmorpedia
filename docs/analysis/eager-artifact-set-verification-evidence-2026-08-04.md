# Eager generated artifact-set verification evidence

Date: 2026-08-04

## Scope

The web application now treats the three manifest-declared generated outputs
as one atomic runtime input. A page that asks only for the main dataset cannot
continue with a corrupt, stale, missing, or cross-file-inconsistent search or
diagnostic member.

## Implemented contract

The first public artifact-loader call performs one complete initialization:

1. load and strictly validate output-manifest schema 2;
2. read `artifact.json`, `search.json`, and `diagnostics.json` from the
   manifest's directory and verify each declared byte length and SHA-256;
3. strictly validate every runtime schema;
4. enforce dataset identity, unique source/entity/route ownership, and exact
   search derivation from normalized entities;
5. enforce diagnostic severity counts, unique diagnostic IDs, and every entity
   diagnostic reference; and
6. cache the three values together only after all checks pass.

`loadArtifact()`, `loadSearchArtifact()`, and `loadDiagnostics()` remain the
public API, but each reads from that same all-or-nothing cache. A failed member
therefore cannot leave a partially initialized artifact or search cache.

## Regression coverage

Three focused cases call only `loadArtifact()` and prove it rejects:

- a changed `diagnostics.json` whose bytes no longer match the manifest;
- a structurally valid and correctly checksummed diagnostics array whose
  severity counts no longer match `artifact.json`; and
- a structurally valid and correctly checksummed search index that is no
  longer derived from the main artifact.

The web suite passes all 54 tests. The full repository gate passes all 189
unit/artifact tests, byte-identical synthetic generation, and the 43-page
synthetic static export.

Read-only verification against the ignored canonical `1.1.5 public_beta`
dataset also passes:

- 763 items and 2,767 search documents;
- 0 errors, 43 warnings, and 71 informational duplicate decisions;
- byte-identical repeated generated output; and
- all 2,857 local static pages exported successfully with eager set
  verification enabled.

No official input, local path, or generated official derivative is committed,
and this verification does not approve official-derived content for
publication.
