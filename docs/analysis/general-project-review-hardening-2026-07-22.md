# General project review hardening

Date: 2026-07-22

## Scope

This record closes the actionable correctness, publication-boundary, runtime-validation, load-behavior, and keyboard-test findings from a repository-wide review. It does not approve publication of official-derived data or settle any formula whose source evidence remains disputed.

## Changes

- Spell effects now diagnose every unsupported attribute with its original value and every unsupported child element. Required entity names and ability skill references no longer disappear silently.
- Integer parsing accepts only complete integer tokens; invalid booleans produce diagnostics and use the documented fallback. Item prices, recipe quantities, and recipe skill levels enforce their non-negative or positive contracts.
- Monster inheritance uses explicit visiting/resolved state. Every member of a cycle is diagnosed and remains local without an inherited parent ID; a non-cyclic descendant may still inherit that local record.
- Generated output resolves the real target through existing junctions/symbolic links, rejects source/output overlap in either direction, uses collision-resistant temporary names, writes data files before the manifest commit marker, and verifies the completed set.
- The web launcher requires `manifest.json`. The web consumer verifies declared bytes and SHA-256 checksums, complete schemas for every entity/provenance/search/diagnostic field, dataset/search derivation, diagnostic counts, and referenced diagnostic IDs.
- The home route uses dataset-neutral copy and renders at most 24 item cards on the server. Full browsing and filtering remains on the structured search route.
- Browser coverage includes a real Tab/Enter skip-link path rather than relying only on programmatic focus.

## Aggregate canonical measurement

The read-only `1.1.5 public_beta` import remains deterministic and contains 763 items and 2,767 search documents. The stricter loss accounting reports no errors, 4,614 warnings, and 71 informational duplicate decisions:

| Diagnostic code                 | Count |
| ------------------------------- | ----: |
| `unknown_attribute`             | 2,124 |
| `unknown_element`               | 1,688 |
| `partially_supported_element`   |   770 |
| `dangling_reference`            |    19 |
| `unsupported_spell_requirement` |    13 |

Of these, 2,122 unknown attributes and 45 unknown child elements belong to spell `<effect>` declarations that were previously accepted without loss diagnostics. The compatibility backlog is therefore 1,510 item plus 3,070 spell constructs. The higher warning count is newly visible source-modeling work, not newly malformed input.

The official static export still produces 2,824 pages. Its home HTML contains exactly 24 item cards and is 50,582 bytes, compared with the reviewed pre-fix response of roughly 712 KB and all 763 item cards. These are aggregate local measurements only; no generated official artifact is tracked or approved for publication.

## Regression evidence

- Domain inheritance tests cover three-member cycles and a non-cyclic descendant of a cycle member.
- Pipeline tests cover strict scalars, missing names, loss-aware effect diagnostics, output/source overlap in both directions, and a junction alias.
- Web tests corrupt checksums, remove a required entity collection while updating the checksum, and create a checksum-valid search artifact that is not derived from the selected normalized artifact.
- Synthetic and official static builds validate the same complete runtime schemas.
- `pnpm check` passes the full format, lint, type, unit/integration, deterministic-generation, and synthetic static-build pipeline.
- `pnpm test:e2e` passes 22 desktop/mobile interaction and axe checks, including the real Tab/Enter skip-link flow.
- The ignored canonical artifact regenerates byte-identically and its 2,824-page static export succeeds.
