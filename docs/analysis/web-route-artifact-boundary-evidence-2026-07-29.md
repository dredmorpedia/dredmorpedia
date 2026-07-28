# Web route artifact-boundary evidence

Date: 2026-07-29

## Scope

This checkpoint closes the repository review's low-severity generated-route validation gap. It changes only the web consumer's checksummed artifact boundary; valid generated data, route allocation, search derivation, and rendered behavior are unchanged.

## Contract

The web artifact schema now requires every canonical and historical alias slug to contain only lowercase ASCII letters, digits, and hyphens. Search-document URLs must be absolute two-segment entity paths with the same lowercase slug shape.

After schema validation, the loader independently verifies that every canonical-or-alias slug has exactly one owner within its entity kind. Cross-kind reuse remains valid because each kind has a separate route namespace, while canonical/canonical, canonical/alias, alias/canonical, and alias/alias collisions within one kind are rejected before Next.js derives static parameters.

These checks deliberately complement rather than replace the pipeline's deterministic route allocator and search derivation. A checksummed but stale, manually edited, or incorrectly produced artifact can no longer rely solely on those upstream invariants.

## Regression coverage

Focused tampered-artifact tests recompute the manifest checksum so each case reaches the semantic consumer boundary. They prove that the loader rejects:

- a traversal-shaped canonical slug;
- an alias containing spaces and uppercase characters;
- a same-kind canonical/alias route collision with both entity owners identified;
- a JavaScript-scheme search URL before the later search-derivation comparison.

The existing valid-fixture test continues to load all canonical and alias routes.

## Validation

- `pnpm.cmd --filter @dredmorpedia/web exec vitest run test/artifact.test.ts`
- `pnpm.cmd --filter @dredmorpedia/web typecheck`
- `pnpm.cmd check`
- `pnpm.cmd build:official`

All checks pass. The focused artifact suite has 27 tests; the full workspace has 139 unit/artifact tests and exports the 43-page synthetic site. The ignored canonical dataset remains byte-identical with 763 items, 2,767 search documents, 0 errors, 275 warnings, and 71 informational decisions, and all 2,857 local static pages export successfully.

No browser suite is required because this checkpoint changes failure handling at build/load time, not valid UI, routes, or interactions.
