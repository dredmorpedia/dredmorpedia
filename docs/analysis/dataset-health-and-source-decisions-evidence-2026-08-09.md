# Dataset health and source-decision evidence

Date: 2026-08-09
Status: implemented for the active verified dataset

## Product gap

The preserved application could list configured data sources, but it did not
provide a reliable dataset-level explanation of duplicate resolution, patches,
route collisions, malformed input, or other import findings. The modern detail
pages already exposed complete provenance when a user knew which record to
open. They did not provide a way to discover the affected records.

The Phase 4 source/collision slice therefore needed one bounded static surface
that answered:

- which sources and versions formed the active dataset, and in what precedence
  order;
- which diagnostics the verified import emitted;
- which active records were changed by source precedence or a reviewed patch;
  and
- where to continue from a diagnostic or decision into the corresponding
  encyclopedia record.

## Implemented boundary

`/dataset/` is a server-rendered static route. It consumes only the same
checksum- and schema-verified `artifact.json` and `diagnostics.json` set used by
the rest of the web application. It does not read a source manifest, raw XML,
the local installation, or an independently cached output member.

The page provides:

- the active dataset entity and diagnostic totals;
- every sanitized source ID, label, kind, version, and precedence value in
  declared order;
- diagnostics grouped by stable severity and code, with native keyboard-
  operable disclosure controls;
- exact messages, sanitized generated source locations, and links to active
  records where `entityId` resolves;
- every active record carrying an override step or reviewed patch;
- each ordered previous-to-replacement source step and its changed normalized
  fields; and
- reviewed patch reasons, changed fields, and before/after values.

No fuzzy entity recovery is performed. A diagnostic without a valid active
`entityId` remains unlinked. Source IDs not present in the public source summary,
such as the synthetic route-registry and patch audit sources, use their stable
sanitized IDs rather than inventing metadata. The page explicitly states that
it never exposes the installation path.

The route is linked from the primary navigation and the home dataset-health
summary. Empty diagnostics and empty source-decision states remain explicit.
The page remains useful without JavaScript; disclosures use native HTML.

## Measured coverage

The independently authored synthetic dataset exercises four ordered sources,
23 diagnostics across nine severity/code groups, one affected item, two
override steps, and one reviewed patch.

Read-only aggregate inspection of the ignored canonical `1.1.5 public_beta`
artifact found:

- 5 sources, including the separately versioned project stat reference;
- 2,829 normalized entities;
- 94 diagnostics: 0 errors, 4 warnings, and 90 informational records;
- 36 active records with source decisions;
- 71 ordered override steps across 2 abilities, 1 encrustment, 27 recipes, and
  6 spells; and
- no canonical reviewed patch.

These are aggregate local measurements, not permission to publish the ignored
official artifact or its entity content.

## Validation

- Focused web unit/artifact tests cover complete entity collection, linked
  detail paths, source-decision aggregation, stable diagnostic grouping, and
  conventional diagnostic-code labels.
- The synthetic static export includes 44 pages, including `/dataset/`.
- The desktop/mobile browser flow expands diagnostic and decision disclosures,
  follows linked record metadata, verifies keyboard focus and responsive
  overflow, and includes `/dataset/` in the representative axe sweep.
- `pnpm check` passes formatting, lint, type checking, all 249 unit/artifact
  tests, byte-identical synthetic generation, and the 44-page synthetic export.
- All 38 desktop/mobile Playwright cases pass, including the representative axe
  sweep.
- `pnpm build:official` passes byte-identical ignored canonical generation with
  0 errors, 4 warnings, and 90 informational records, copies all 763 item icons
  without fallbacks, and exports all 2,981 local pages.

## Remaining boundary

This is an active-dataset explanation surface, not a source selector or data
version switcher. Broad mod compatibility, choosing among complete datasets,
and comparing two separately generated versions remain later work. A version
switcher still waits for a second complete verified dataset, and public
official-content deployment still waits for permission evidence.
