# Spell targeting-template and root-attribute evidence

Date: 2026-08-11

## Scope

The preserved application treats `type="template"` spells as area effects,
reads a `templateID` source reference, and preserves whether the template is
anchored to the player. The modern importer previously retained only the spell
type and icon and did not audit other attributes on the root `<spell>` element.
That made targeting templates standalone pages and made the reported zero spell
compatibility backlog incomplete.

This slice adds a strict root spell attribute audit and models only the measured
targeting-template family. It does not suppress or interpret any other newly
visible root metadata.

## Contract

- Template spells preserve the exact source template token from the canonical
  `templateID` spelling or the one measured lowercase `templateid` spelling.
  If both occur, the canonical spelling wins and a conflict diagnostic is
  emitted.
- The template token receives a canonical lookup key and an optional resolved
  normalized template ID. Missing targets remain loss-aware and emit ordinary
  dangling-reference diagnostics.
- The optional `anchored` value accepts only exact source `0` or `1` values and
  remains `null` when absent or invalid.
- Non-template spells do not acquire targeting-template semantics merely by
  carrying similarly named attributes; those attributes remain explicit
  compatibility diagnostics.
- The spell and template pages link in both directions. The UI exposes the
  source template token and anchor-player flag without inferring target
  selection, rotation, placement, obstruction rules, or runtime success.

## Canonical read-only measurement

The ignored `1.1.5 public_beta` base-plus-three-expansion dataset contains 106
active template spells. The source uses 105 canonical `templateID` declarations
and one lowercase `templateid` declaration. All 106 resolve to one of the 35
normalized targeting templates. Their anchor-player source values are:

- 35 explicit true declarations;
- 7 explicit false declarations; and
- 64 absent declarations.

The corrected root audit also exposes 1,092 still-unmodeled spell attributes
across 21 attribute names. These remain warnings for later feature-by-feature
classification. Together with the four previously reviewed unresolved
relationships, the deterministic official import now reports 0 errors, 1,096
warnings, and 90 informational records. It produces 2,829 search documents, a
9,064,735-byte normalized artifact, and an unchanged 1,477,801-byte search
artifact.

These are aggregate local measurements only. No official XML, names, source
paths, generated artifact, or asset is committed or approved for publication.

The subsequent cooldown slice removes all 133 `downtime` warnings. Its current
measurement and semantic boundary are recorded in
[`spell-cooldown-evidence-2026-08-11.md`](spell-cooldown-evidence-2026-08-11.md).

## Verification

- Focused importer tests cover canonical and lowercase aliases, simultaneous
  alias conflicts, true/false/invalid/absent anchor values, exact and dangling
  template references, and unsupported attributes on non-template spells.
- The web artifact boundary accepts the complete normalized declaration and
  rejects invalid anchor values.
- The synthetic browser flow navigates keyboard-first from a template backlink
  to its spell and verifies the reciprocal resolved template link and absence
  of an unresolved state.
- Repeated synthetic and official generation remains byte-identical.
