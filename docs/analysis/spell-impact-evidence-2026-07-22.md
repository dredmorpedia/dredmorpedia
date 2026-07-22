# Spell impact source-metadata evidence

Date: 2026-07-22

This note records the evidence and boundary for normalizing root-level spell `<impact>` declarations from the canonical read-only `1.1.5 public_beta` base-plus-three-expansion source. Official XML, spell names, sprite prefixes, sound cue IDs, and generated official artifacts remain ignored and non-public.

## Source shape and contract

The active declarations use a sprite prefix, frame count, source frame-rate value, optional first-frame value, optional centered-effect flag, optional synchronization flag, and optional symbolic sound cue. The measured source uses both `centerEffect` and `centereffect`. The adapter accepts the same measured frame aliases as `<anim>` and normalizes both elements into equivalent loss-aware frame-presentation records while retaining separate `animations` and `impacts` arrays.

Sprite values identify frame families rather than concrete files. Impact sprite values therefore receive separator normalization and the existing absolute/traversal safety check without a fabricated file-existence check. Missing sprites, unsafe paths, invalid non-negative integers, invalid booleans, unknown attributes, and nested content are independently diagnosed. Ordered declarations remain ordered.

## Canonical aggregate measurement

The active dataset contains 951 spells and 70 impact declarations across 70 spells, with at most one active declaration per spell:

- all 70 declarations supply a safe sprite prefix;
- all 70 supply frame counts from 3 through 10;
- all 70 supply source frame-rate values from 50 through 180;
- one supplies a first-frame value of 0;
- 65 supply symbolic sound cues;
- centered-effect flags are 10 enabled, 41 disabled, and 19 absent;
- synchronization is enabled on one declaration, disabled on none, and absent on 69.

Two deterministic imports are byte-identical and complete with no errors, 3,877 warnings, and 71 informational duplicate decisions. Supporting `<impact>` removes 71 former `unknown_element` diagnostics across active and overridden records. Excluding the 15 separately tracked non-mana/extra-attribute requirement diagnostics, the current item/spell compatibility backlog is 3,843 constructs: 1,510 item and 2,333 spell diagnostics. Nineteen dangling references remain separately reported.

## Presentation and publication boundary

The spell page shows separate animation and impact counts, labels each declaration kind, displays loss-aware numeric and boolean parameters, and reports whether sprite and sound references were supplied. It does not render detailed sprite prefixes or sound cue IDs. Frame-rate values remain source metadata without an inferred timing unit, and the UI does not infer impact targeting or effect-resolution behavior.

Synthetic coverage includes populated animation and impact records, both centered-effect casing variants, malformed numbers and booleans, unsafe and missing sprite references, unknown attributes, nested unknown content, and an explicit empty presentation state. The strict web artifact guard rejects malformed impact values before static generation. Desktop/mobile browser coverage verifies both declaration kinds and asserts that unique raw impact references are absent from rendered content. A case-sensitive scan of the complete synthetic static export also confirms that neither unique impact reference is emitted.
