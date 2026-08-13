# Monster art rendering and palette evidence

Date: 2026-08-12
Status: implemented and canonically verified

## Scope and decision

Monster detail pages now present one static piece of entity art: the first
frame of the active monster's downward idle sprite. This matches the useful
scope of the preserved encyclopedia without copying complete animation sets or
running an animation/tinting library in the browser.

The implementation uses the source contract rather than the preserved page's
filename-replacement shortcut:

- animation XML is parsed as untrusted input and its first nonblank `<frame>`
  is resolved relative to the wrapper, with traversal and real-path containment
  checks;
- binary `.spr` input is decoded from its measured fixed frame structure, but
  only the first frame is emitted;
- numeric palette tints are applied once to the indexed palette during
  generation using the preserved CamanJS HSV hue rotation;
- an exact 768-byte named `.pal` replaces the `.spr` palette before any hue
  rotation; and
- output is a deterministic, content-addressed PNG in the existing ignored
  presented-asset set.

The two named-palette declarations are meaningful source data. The preserved
page ignored them and therefore rendered Megadeth and Red Deth from the same
base palette. Applying their measured 256-color palettes is a narrow,
source-backed correctness fix, not an inferred game formula.

## Measured contracts

The canonical dataset contains 183 monster icon mappings over 47 source sprite
references:

- 96 entity mappings use 25 unique binary `.spr` files;
- 87 entity mappings use 22 unique animation-XML wrappers;
- 129 monsters declare a numeric hue tint; and
- Megadeth and Red Deth declare the two 768-byte named palettes.

Every measured binary idle sprite has:

1. the ASCII `SPR` signature;
2. one frame-count byte;
3. big-endian 16-bit width and height;
4. for each frame, a big-endian 16-bit delay, 256 RGB palette entries, and one
   palette-index byte per pixel; and
5. one final zero sentinel byte.

The importer rejects invalid signatures, zero or excessive dimensions,
inconsistent lengths, invalid sentinels, and invalid named-palette lengths.
Generated indexed PNGs preserve palette index zero as transparent. The 22
canonical XML first-frame PNGs are non-interlaced 8-bit indexed images, so hue
rotation changes only their checked `PLTE` chunk and leaves compressed pixels
and transparency intact.

## Snapshot and publication boundary

The XML wrapper, its selected first frame, and a referenced `.pal` are
registered on their first read. Presented-asset generation consumes those
captured bytes and never rereads the installation. The installation remains
read-only, outputs remain under the managed gitignored web asset directory,
and neither source paths nor generated proprietary images enter Git.

Malformed wrappers, missing frames or palettes, unsupported formats, corrupt
PNG chunks, and malformed `.spr` files produce a per-monster fallback outcome.
The web continues to require exactly one verified asset or diagnostic outcome
for every active presented reference. A subsequent full-project review also
bound the schema-2 presented-asset manifest to the exact `artifact.json`
checksum, retained the declaring source for inherited monster appearance,
applied exact named palettes to XML-backed PNG frames as well as direct SPR
frames, and upgraded every copied PNG from signature-only acceptance to bounded
chunk, checksum, header, and compressed-scanline validation.

## Canonical result

Deterministic official generation produces:

- 183 monster mappings backed by 167 unique rendered PNGs;
- 1,790 total item/skill/ability/spell/monster mappings;
- 1,479 unique content-addressed PNG files across those mappings; and
- zero presented-asset fallback diagnostics.

The full canonical relationship diagnostics remain unchanged at zero errors,
four warnings, and 90 informational decisions. The source bytes and generated
asset set are byte-identical across the repeated generation pass.

## Validation

- focused monster-art, presented-asset, and web asset-loader tests;
- strict wrapper containment, malformed-SPR, inherited cross-source appearance,
  XML-backed named-palette, tint, transparency, complete PNG, exact-artifact
  binding, and deterministic-output coverage;
- data-pipeline and web type checks plus lint;
- deterministic synthetic and canonical generation checks with the canonical
  zero-error gate;
- complete repository format, lint, type, unit, synthetic-export, and official
  static-export checks; and
- the desktop/mobile Playwright suite, including the accessible synthetic
  fallback.

The local in-app browser security boundary did not permit automated navigation
to `localhost`; the repository's canonical build and browser suites provide the
recorded page validation. Owner-facing routes are listed in the handoff.

## Explicit exclusions

- No attack, hit, death, cast, beam, morph, or dig animations are copied or
  rendered.
- No client-side CamanJS, canvas mutation, or guessed `_00.png` filename is
  used.
- No sprite timing, runtime animation order, palette-selection rule beyond the
  explicit declarations, or other engine behavior is inferred.
- The preserved application remains until a separate archival decision.
