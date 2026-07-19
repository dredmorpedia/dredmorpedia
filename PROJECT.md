# Dredmorpedia project brief

## Product statement

Dredmorpedia should become the definitive, maintainable reference and planning toolkit for Dungeons of Dredmor: useful to players looking up facts, theorycrafters comparing choices, and mod authors inspecting how game data connects.

The project is a clean rebuild informed by the legacy application. It is not a visual reskin or an incremental jQuery upgrade.

## Primary audiences

- Players who need fast, trustworthy item, skill, spell, monster, stat, crafting, and encrusting information.
- Theorycrafters who want comparisons, build planning, calculations, and shareable results.
- Mod users who want to understand what a mod adds or overrides.
- Mod authors who need validation, provenance, cross-reference, and schema diagnostics.
- Maintainers working with coding agents who need reproducible commands and durable project context.

## Product principles

1. **Correct before clever.** Derived values and relationships must be explainable from source data.
2. **Provenance is a feature.** Users should be able to see which game version, expansion, mod, and file produced a record.
3. **Static by default.** Core reference content should remain usable on inexpensive static hosting and without an account.
4. **Progressive interactivity.** Search, filters, comparisons, planners, and local preferences add value without forcing the whole application into a client-only runtime.
5. **Stable and shareable.** Entity URLs and tool configurations should be deterministic and durable.
6. **Accessible and responsive.** Mobile, keyboard, reduced-motion, contrast, and semantic structure are baseline requirements.
7. **Legal boundaries are explicit.** The code, game data, mod data, and art assets may have different redistribution rights.

## Initial success criteria

- A contributor can clone the repository, install one documented toolchain, and run checks without proprietary data.
- A local game-data import produces a deterministic normalized dataset and a useful diagnostics report.
- The replacement exposes stable pages for the legacy core entities and preserves their important relationships.
- Search and filters return useful results before every entity has been hydrated into the DOM.
- The site works at mobile and desktop widths and meets an agreed accessibility baseline.
- CI verifies formatting, linting, types, unit tests, fixture parsing, build output, and a small browser smoke suite.

## Current scope

The first release target is complete functional and content coverage of the useful legacy application, not merely a showcase slice. The parity baseline includes items, crafts, encrusts, skills/abilities, spells/effects, monsters, stats, templates, source selection, cross-links, search, and derived/meta views. The rebuild may deliver these incrementally and reorganize them into routes and tools rather than reproducing the old tab layout.

The initial canonical source scope is the base game plus all three official expansions. General mod support remains an architectural capability, but implementing broad mod compatibility is a lower priority than official-content parity.

## Confirmed product direction

- Use a modern visual interpretation rather than copying the legacy layout.
- Keep enough Dungeons of Dredmor-inspired character that official icons and imagery feel at home, subject to asset rights.
- Use Tailwind CSS with project-owned design tokens and selectively adopt shadcn/ui components backed by Base UI. Keep the component source in the project and adapt it to the Dredmorpedia visual language rather than accepting a generic theme unchanged.
- Support light, dark, and system color modes from the first real UI foundation.
- Ship the initial application in English only. Keep imported game text distinct from application interface copy so later interface localization or translated-content overlays remain possible without changing canonical records.
- Keep the first deployment compatible with free static hosting; GitHub Pages is the leading initial candidate.
- Complete legacy coverage before treating quality-of-life additions as the main delivery phase.
- Prioritize richer filters, crafting/encrusting backlinks, and eventually tagging, favorites, and lists among the first improvements after parity.
- Treat live game-progress tracking as a separate later research project; do not constrain the initial architecture around an unproven integration.

## Out of scope until explicitly approved

- Editing or redistributing a user's installed game files.
- Public accounts, social features, or paid infrastructure.
- Community features and synchronized user data.
- A language selector, translated routes, or manually translated game content without an approved translation source and maintenance plan.
- A general-purpose mod IDE.
- Reproducing every historical visual or obsolete Flash-era tool.
- Publishing bundled game/mod assets before a license and provenance audit.

## Open product decisions

- Which exact installed game build/version defines the canonical base-and-DLC dataset?
- May the public deployment host derived game data and art, or must users import data locally?
- What licenses and attribution obligations apply to the inherited code, bundled mods, and historical assets?
- Which quality-of-life feature should be implemented first after parity?
- Can game progress be observed reliably and safely without modifying the game installation or requiring invasive tooling?
