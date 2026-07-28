# Item weapon declaration evidence

Date: 2026-07-28

Canonical source: Dungeons of Dredmor `1.1.5 public_beta`, Steam build `22934623`, base game plus all three official expansions

## Scope and legacy behavior

The preserved item parser classifies a record with `<weapon>` from the item's root `type`, reads quality from the root `level`, links the weapon's `hit` spell, and presents a supplied `canTargetFloor` flag as floor targeting plus non-recoverability. The shared legacy stat parser also reads fixed named damage attributes from `<weapon>`. It has generic support for damage-factor attributes, but no such factor occurs on a canonical weapon declaration.

The rebuild already represented weapon class as the semantic item `category`, root level as `quality`, fixed named damage in `modifiers`, and `hit` as an `item-hit` trigger. The remaining root compatibility warning therefore covered only the direct floor-target flag, the thrown-presentation reference, and strict validation of the complete leaf.

The modern contract does not copy the legacy non-recoverability assertion. The source flag directly establishes floor targeting, but it does not independently encode recovery behavior. The `thrown` value is retained as a safe presentation reference and summarized without exposing its path while publication rights remain unresolved.

## Canonical measurement

Read-only inspection found exactly 257 active weapon items and 257 declarations:

- 199 in the base game, 29 in Realm of the Diggle Gods, 10 in You Have To Name The Expansion Pack, and 19 in Conquest of the Wizardlands;
- one declaration per weapon item, with no nested elements or text;
- 452 fixed named damage values across the 257 declarations;
- 35 `hit` spell references, all already represented by resolved item triggers;
- 28 `thrown` presentation references;
- 20 enabled floor-target flags, including one measured lowercase `cantargetfloor` spelling; and
- no explicit false floor-target values, damage-factor attributes, scaling selectors, or other attributes.

The new ordered `weaponDeclarations` array preserves the two remaining values loss-aware:

- `canTargetFloor` is `true`, `false`, or `null` when absent or invalid;
- `thrownPath` is a safe normalized relative reference or `null`.

Both measured floor-target spellings normalize identically. Repeated declarations remain repeated. Invalid booleans and unsafe paths become unavailable with diagnostics; unknown attributes, nested content, and text remain explicit. Damage-factor or scaling extensions remain unsupported rather than being mistaken for fixed damage.

## Consumer boundary

The strict web artifact schema requires both fields on every declaration and rejects empty presentation paths or malformed booleans. Item pages show:

- the direct floor-target value;
- whether a thrown presentation source was supplied;
- fixed damage in the existing modifier section; and
- the linked hit spell in the existing trigger section.

Raw presentation paths are not rendered. The page explicitly withholds recoverability and combat-formula claims.

## Diagnostic and artifact result

Deterministic canonical generation reports:

- 0 errors, 2,377 warnings, and 71 informational decisions;
- 257 normalized weapon declarations, 28 safe presentation references, and 20 enabled floor-target flags;
- no remaining weapon compatibility diagnostic;
- 10 remaining item compatibility diagnostics: 8 `toolkit` and 2 `macguffin`;
- 2,335 spell compatibility diagnostics, 13 separately tracked spell-requirement diagnostics, and 19 dangling references;
- a 5,540,235-byte normalized artifact;
- an unchanged 1,344,780-byte search artifact; and
- a 1,335,673-byte diagnostics artifact.

This removes exactly the former 257 `<weapon>` compatibility warnings without suppressing unsupported extensions or changing search derivation.

## Verification

- Focused pipeline coverage passes 36 tests, including complete, empty, lowercase, explicit-false, invalid, unsafe, repeated, extended, nested, and text weapon shapes.
- Focused domain and web typechecks pass.
- The strict web artifact suite passes 17 tests, including malformed weapon metadata rejection.
- `pnpm.cmd generate:official:check` produces byte-identical canonical outputs and the zero-error publication gate passes.
- `pnpm.cmd check` passes formatting, lint, type checking, all 103 unit/artifact tests, deterministic generation, and the 41-page synthetic static export.
- `pnpm.cmd test:e2e` passes all 30 desktop/mobile browser tests, including weapon disclosure, responsive overflow, keyboard flows, and representative axe scans.
- `pnpm.cmd build:official` repeats the deterministic zero-error canonical import and exports all 2,857 local static pages.
