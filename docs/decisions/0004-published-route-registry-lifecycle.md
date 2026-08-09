# ADR 0004: Published route registry lifecycle

Date: 2026-07-29
Status: Accepted (implemented 2026-08-09)
Owners: repository owner + maintainer

## Context

Automatic collision-safe slugs are deterministic for a fixed entity set, but
adding or removing a colliding entity can transfer the clean slug to another
record. The implemented route registry can pin routes within one exact dataset
version, yet a version mismatch currently discards its reservations with a
diagnostic. That is sufficient for unpublished local experiments but not for
URLs that have been shared or published.

The `1.1.5 public_beta` dataset is the MVP target. A version switcher is
deliberately deferred until a second complete, verified dataset exists.

## Decision

- A route registry is optional for an unpublished experimental local dataset.
- Any dataset whose URLs are intentionally shared or published must use a
  registry inherited from the preceding shared version in the same dataset
  lineage.
- An entity that remains in the lineage keeps its canonical slug and historical
  aliases. A newly colliding entity receives a suffixed route.
- A removed entity leaves its routes reserved. Those tombstones must not be
  reassigned to another entity; the same stable source identity may reclaim
  them if it returns.
- Missing, mismatched, stale, or conflicting inherited registry state must fail
  a publication-oriented build rather than silently returning to automatic
  allocation.
- When a second verified game dataset is supported, archived versions should
  receive version-prefixed routes such as `/versions/<version>/items/...`.
  Unversioned routes represent the selected primary dataset.

Schema-2 registries now encode an explicit root or checksum-bound inherited
lineage, stable source-identity entries, active/tombstone state, and complete
publication coverage. The `--publication-routes` gate rejects missing,
mismatched, stale, incomplete, or conflicting state atomically. This removes
the engineering blocker; content permission remains a separate release gate.

## Consequences

### Positive

- Previously shared URLs cannot silently change owners after dataset updates.
- The MVP can remain single-version without closing the path to a later
  switcher.
- Local experiments remain lightweight when stable public routes are irrelevant.

### Negative

- Published dataset updates require an explicit registry migration step.
- Tombstones accumulate and can prevent attractive old slugs from being reused.
- Multi-version static output will add route and artifact volume when it is
  eventually implemented.

## Alternatives

- Independent per-version registries were rejected because the same
  unversioned route could change identity.
- Fully automatic allocation was rejected because insertion and deletion can
  churn previously shared URLs.
- Building the version switcher before a second real dataset was rejected as
  speculative complexity.

## Validation / follow-up

- [x] Add insertion, deletion, tombstone, reappearance, and inherited-registry
      tests.
- [x] Add a publication mode that requires valid inherited registry state.
- Design the versioned artifact and route layout only after a second verified
  dataset is available.
