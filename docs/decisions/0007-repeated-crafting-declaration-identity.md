# ADR 0007: Repeated crafting declaration identity

Date: 2026-08-30
Status: Accepted
Owners: repository owner + maintainer

## Context

The preserved application stores `<craft>` and `<encrust>` records in ordered
arrays, including repeated names. A complete `1.1.5 public_beta` comparison
found 435 recipe declarations under 374 names and 58 encrustment declarations
under 57 names. These are not ordinary name-keyed entity overrides: repeated
recipes provide alternative ingredients, tools, outputs, or source levels, and
the two `Rocket Thrusters` encrustments separately apply to hands and feet with
different outcomes.

The generic precedence resolver previously collapsed every repeated name. It
retained only losing provenance, so player facts disappeared from catalogues,
item backlinks, search, and planners. For example, seven of eight Aqua Vitae
ingredient alternatives were unavailable.

## Decision

- Treat normalized recipe and encrustment declarations with the same displayed
  name but different normalized facts as independent active entities.
- Keep the declaration selected by the former deterministic precedence rule on
  the existing unsuffixed entity identity and clean route. Give each additional
  declaration a deterministic identity suffix derived from its normalized
  declaration facts, excluding routes, provenance, diagnostics, and other
  resolution metadata.
- Coalesce only declarations whose normalized player/source facts are
  identical. Their source precedence and provenance continue to use the generic
  override contract because no distinct recipe or encrustment behavior is lost.
- Preserve displayed source names. Catalogue and detail presentation may add
  ingredients, applicability, or another contextual label to distinguish
  repeated names, but must not fabricate a source name.
- Link every active declaration independently. Item backlinks, structured
  search, dependency planners, catalogue counts, and static routes must cover
  the complete active declaration set.
- Treat a later semantic grouping of same-name declarations as a presentation
  enhancement. It must retain independently addressable declaration facts and
  must not restore name-based collapse.

## Consequences

### Positive

- Craft and Encrust data match the preserved declaration coverage.
- Alternative ingredients, outputs, tools, source levels, slots, and outcomes
  remain available to player-facing relationships and tools.
- Existing clean URLs continue to resolve to the declaration they represented
  before this correction.

### Negative

- Repeated names can produce multiple search results and collision-suffixed
  detail routes until a family presentation is designed.
- A declaration without a source ID changes identity if its normalized facts
  change. A future published route registry must explicitly preserve any such
  route before those facts change.
- Tests and diagnostics must distinguish same-name declarations by identity or
  provenance rather than assuming names are unique.

## Alternatives

- Keeping only the highest-precedence name was rejected because it demonstrably
  removes valid source declarations.
- Storing complete alternatives inside one family entity was deferred because
  it would require a larger artifact/search schema migration and special-case
  every existing relationship and planner. Independent entities restore
  correctness through the established contracts now and do not prevent later
  grouping.
- Using source line numbers as identities was rejected because unrelated XML
  edits would churn routes.

## Validation / follow-up

- Synthetic fixtures must cover same-name recipe and encrustment declarations
  with different facts, stable preferred routes, and independently linked
  alternatives.
- The official import must expose 435 recipes and 58 encrustments, including all
  eight Aqua Vitae recipes and both Rocket Thrusters declarations.
- Browser checks must verify alternative item backlinks and planner choices.
- Revisit compact family presentation only after complete declaration behavior
  is correct and owner-reviewed.
