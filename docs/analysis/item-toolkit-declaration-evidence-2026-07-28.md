# Item toolkit declaration evidence

Date: 2026-07-28

Canonical source: Dungeons of Dredmor `1.1.5 public_beta`, Steam build
`22934623`, base game plus all three official expansions

## Scope and legacy behavior

The preserved item parser classifies an alchemical item containing `<toolkit>`
as a toolkit but otherwise uses its generic item parser. Craft and encrust
parsers separately map source tool tags through hard-coded tables. Those tables
cover the seven ordinary crafting tags but do not preserve the nested toolkit
interface declaration and omit the unused Lutefisk tag.

The rebuild uses the declaration's source tag instead of a hard-coded item-name
map. Matching tags now link toolkit items bidirectionally with recipes and
encrustments. Old game-interface references and coordinates remain direct
source metadata: they do not control the modern web layout and do not establish
a complete crafting runtime formula.

## Canonical measurement

Read-only inspection found exactly eight active `<toolkit>` declarations, all
in the base game:

- one declaration per item, with no nested elements or text;
- all eight supply a non-empty tag, non-negative slot count, symbolic sound
  cue, and safe background reference;
- slot counts are 0 on one declaration, 1 on one, 2 on one, and 4 on five;
- seven declarations provide 21 missing/present/active state references;
- six declarations provide 19 complete slot rectangles;
- seven provide a complete output rectangle and close position;
- six provide craft and recipe controls, while five also provide autofill
  controls, for 17 complete control groups; and
- no other attributes occur.

Seven tags cover all 374 active recipes. Five tags cover all 57 active
encrustments. The eighth tag legitimately has no matching recipe or
encrustment, so an empty relationship state is not treated as a dangling
reference.

The ordered `toolkitDeclarations` array preserves:

- nullable normalized tag, non-negative slot count, and symbolic sound cue;
- safe nullable missing/present/active/background presentation references;
- ordered numbered slot rectangles and an output rectangle;
- safe craft/recipe/autofill control references with source positions; and
- the source close position.

Missing required tags/slot counts, empty text values, invalid coordinates,
partial bounds/controls/state references, coordinates beyond the declared slot
count, unsafe paths, unknown attributes, nested content, and text remain
diagnostics. Repeated declarations remain repeated.

## Consumer boundary

The strict web artifact schema requires every declaration and nested metadata
field and rejects invalid slot indices, numbers, empty paths, and extended
objects. Item pages show the tag, slot count, and bounded metadata-coverage
summaries without rendering sound cue IDs, raw paths, or coordinates. Recipe
and encrustment pages link back to every matching toolkit item, while toolkit
pages list the matching recipes and encrustments.

Toolkit tags and sound cues contribute to deterministic search text. Consumers
must not use source interface coordinates to lay out the modern site or infer
ingredient placement, item consumption, button behavior, sound timing, or a
complete crafting formula.

## Diagnostic and artifact result

Deterministic canonical generation reports:

- 0 errors, 2,368 warnings, and 71 informational decisions;
- 8 normalized toolkit declarations with no toolkit compatibility diagnostic;
- no remaining item compatibility diagnostic;
- 2,335 spell compatibility diagnostics and 13 separately tracked spell
  requirement diagnostics;
- 20 dangling references, unchanged by this slice;
- a 5,607,231-byte normalized artifact;
- a 1,344,961-byte search artifact; and
- a 1,331,767-byte diagnostics artifact.

This removes the final eight item compatibility warnings. The remaining
compatibility backlog is entirely spell-side.

## Verification

- Focused pipeline coverage passes 27 importer tests, including complete,
  empty, invalid, partial, overflow, unsafe, repeated, extended, nested, and
  text shapes.
- All 52 domain tests pass, including deterministic tag relationships and
  missing-tag behavior.
- The strict web artifact suite passes 16 tests, including malformed toolkit
  metadata rejection; all 19 web unit/artifact tests pass.
- `pnpm.cmd generate:official:check` produces byte-identical canonical outputs
  and the zero-error publication gate passes.
- `pnpm.cmd check` passes formatting, lint, type checking, all 109
  unit/artifact tests, deterministic generation, and the 43-page synthetic
  static export.
- `pnpm.cmd test:e2e` passes all 34 desktop/mobile browser tests, including
  toolkit disclosure, reciprocal recipe/encrustment navigation, keyboard
  focus, responsive overflow, and representative axe scans.
- `pnpm.cmd build:official` repeats the deterministic zero-error canonical
  import and exports all 2,857 local static pages.
