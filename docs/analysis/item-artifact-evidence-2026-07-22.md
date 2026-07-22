# Item artifact evidence

Date: 2026-07-22
Status: implemented and verified against the ignored canonical dataset

## Scope and behavioral reference

The preserved application treats each direct item `<artifact>` declaration as an item property and displays its `quality`. The rebuild now preserves those declarations in an ordered `artifacts` array rather than leaving the entire element as an unsupported diagnostic.

Each declaration has a loss-aware nullable non-negative integer quality. `null` distinguishes a declaration whose quality is absent or invalid from an item with no artifact declaration. Repeated declarations remain repeated because broad mod behavior has not been measured. Unknown attributes and nested elements remain source-located diagnostics; recognizing the verified `quality` field does not silently claim support for future content.

The item detail header displays artifact quality only when at least one declaration exists. An unavailable supplied value is shown as `Unavailable` rather than being converted to zero or hiding the declaration.

## Canonical aggregate measurement

Read-only inspection of the canonical `1.1.5 public_beta` base-plus-three-expansion source and ignored generated artifact found:

- 108 active items with artifact metadata;
- 108 total declarations, with at most one declaration on an item;
- exactly one measured attribute, `quality`, and no nested element content;
- 108 valid qualities spanning 1 through 27 across 12 distinct values; and
- no unavailable normalized quality values.

Normalizing the verified shape removes all 108 former unsupported `<artifact>` diagnostics. The deterministic canonical import now completes with 0 errors, 3,170 warnings, and 71 informational duplicate decisions. The measured unsupported/partially-supported item-and-spell backlog is 3,136 constructs: 803 item and 2,333 spell diagnostics. The separately tracked 15 spell-requirement diagnostics and 19 dangling references are unchanged.

The canonical normalized artifact is 5,380,731 bytes. Search remains 1,344,780 bytes because artifact quality is detail metadata and is not yet a structured search facet. These ignored local measurements do not authorize publication of the generated data.

## Regression evidence

- Focused importer coverage preserves valid, absent, invalid, repeated, and unknown-content declarations.
- The strict web artifact guard rejects negative or malformed artifact quality before rendering.
- Synthetic desktop/mobile browser coverage displays the active artifact quality while ordinary items retain the conditional empty state.
- Synthetic and canonical generation are byte-identical across repeated imports.
- The full synthetic check, browser suite, canonical import, and canonical static export pass without tracking official data or local paths.
