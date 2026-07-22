# Item direct-trigger evidence

Date: 2026-07-23
Status: implemented and verified against the ignored canonical dataset

## Scope and behavioral reference

The preserved application presents direct item hit hooks as conditional spell effects: melee target, melee self, crossbow, thrown, and kill events. The rebuild already linked the common camel-case forms, but it still marked them partially supported and ignored three measured lowercase target/self aliases.

The importer now recognizes both measured casing forms, strictly validates direct trigger leaves, and preserves chance, taxonomy, resistance, delay/duration, and exact additional source flags. The measured `after` flag remains neutral source metadata; the artifact and UI do not infer its timing semantics. Missing or invalid booleans remain distinguishable through diagnostics rather than silently becoming enabled behavior.

The shared item/ability trigger contract now requires a deterministic `sourceFlags` array. Item and ability pages display any retained flag as an exact key/value pair. Unknown attributes and nested content remain source-located diagnostics.

## Canonical aggregate measurement

Read-only inspection of the canonical `1.1.5 public_beta` base-plus-three-expansion source and ignored generated artifact found 77 active direct item triggers:

| Trigger event   | Declarations |
| --------------- | -----------: |
| Melee target    |           50 |
| Melee self      |           16 |
| Crossbow target |            6 |
| Thrown target   |            3 |
| Kill target     |            2 |

Every declaration supplies a spell name and percentage, one supplies taxonomy, one supplies the exact `after` source flag, and none has nested element content. Three declarations use the measured lowercase target/self element aliases. All 77 spell references resolve in the active dataset.

The completed alias handling raises total normalized active item triggers from 227 to 230. Fully supporting the direct elements removes all 74 associated compatibility diagnostics. The deterministic canonical import now completes with 0 errors, 3,096 warnings, and 71 informational duplicate decisions. The measured unsupported/partially-supported item-and-spell backlog is 3,062 constructs: 729 item and 2,333 spell diagnostics. The separately tracked 15 spell-requirement diagnostics and 19 dangling references are unchanged.

The canonical normalized artifact is 5,393,383 bytes. Search remains 1,344,780 bytes because trigger source flags are relationship detail rather than a structured search facet. These ignored local measurements do not authorize publication of the generated data.

## Regression evidence

- Focused importer coverage exercises camel-case and lowercase target/self hooks, every active direct event family, exact `after` preservation, invalid resistance input, and unknown leaf content.
- The strict web artifact guard rejects malformed trigger source flags before rendering.
- Synthetic desktop/mobile browser coverage displays the lowercase self hook, kill hook, and exact `after=1` source flag.
- Synthetic and canonical generation are byte-identical across repeated imports.
- The full synthetic check, browser suite, canonical import, and canonical static export pass without tracking official data or local paths.
