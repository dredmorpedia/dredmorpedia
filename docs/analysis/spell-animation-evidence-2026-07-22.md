# Spell animation source-metadata evidence

Date: 2026-07-22

Later note: the subsequent spell-impact slice added the sibling `<impact>` presentation shape. Current diagnostic totals and impact measurements are recorded in [`spell-impact-evidence-2026-07-22.md`](spell-impact-evidence-2026-07-22.md).

This note records the evidence and boundary for normalizing root-level spell `<anim>` declarations from the canonical read-only `1.1.5 public_beta` base-plus-three-expansion source. Official XML, spell names, sprite prefixes, sound cue IDs, and generated official artifacts remain ignored and non-public.

## Source shape and contract

The measured declarations use a sprite prefix plus optional frame count, source frame-rate value, first-frame value, centered-effect flag, synchronization flag, and symbolic sound cue. The source also contains the aliases `num` for frame count, `first` for first frame, and `centereffect` for `centerEffect`. Those aliases normalize to one loss-aware domain shape without assigning engine units or behavior.

Sprite values identify frame families rather than one concrete file. The adapter therefore normalizes separators and applies the existing absolute/traversal safety rule, but does not fabricate a file-existence check for the prefix. Missing sprite references, unsafe paths, invalid non-negative integers, invalid booleans, unknown attributes, and nested content are independently diagnosed. Ordered declarations remain ordered.

## Canonical aggregate measurement

The active dataset contains 951 spells and 661 animation declarations across 661 spells, with at most one active declaration per spell:

- all 661 declarations supply a safe sprite prefix;
- 656 supply frame counts from 0 through 18;
- 612 supply source frame-rate values from 5 through 250;
- 30 supply first-frame values from 0 through 2;
- 594 supply symbolic sound cues;
- centered-effect flags are 282 enabled, 176 disabled, and 203 absent;
- synchronization flags are 15 enabled, 0 disabled, and 646 absent.

At completion of this slice, two deterministic imports were byte-identical and completed with no errors, 3,948 warnings, and 71 informational duplicate decisions. Supporting `<anim>` removed 666 former `unknown_element` diagnostics across active and overridden records. The compatibility backlog at that point was 3,914 item/spell constructs: 1,510 item and 2,404 spell diagnostics. Fifteen non-mana or extra-attribute spell-requirement diagnostics and 19 dangling references remained tracked separately.

## Presentation and publication boundary

The spell page shows declaration count, loss-aware numeric and boolean parameters, and whether sprite/sound references were supplied. It does not render the detailed sprite prefixes or sound cue IDs. It labels frame rate as a source value and does not call it frames per second, milliseconds, or any other inferred unit.

Synthetic browser coverage verifies the populated and empty states and asserts that the raw sprite and sound values are absent from rendered presentation content. A case-sensitive scan of the complete synthetic static export also confirms that neither unique raw reference is emitted. The runtime artifact guard rejects negative animation parameters and unknown record fields before static generation.
