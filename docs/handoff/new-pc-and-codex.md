# New PC and Codex handoff

Updated: 2026-07-22

This is the durable handoff for moving Dredmorpedia to another computer or opening it in a new Codex task with no chat history. Canonical product and architecture documents remain authoritative; this guide summarizes the state needed to resume safely.

## Resume checklist for Codex

1. Read `AGENTS.md` completely and follow it.
2. Read `PROJECT.md`, the dated repository audit, modernization proposal, roadmap, data/asset policy, and ADRs 0001–0003.
3. Run `git status -sb`, `git log --oneline --decorate -5`, and `git remote -v` before changing anything.
4. Run `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/audit-legacy.ps1` to confirm the preserved baseline.
5. Install the pinned workspace and run `pnpm generate:check` plus `pnpm check`. Run `pnpm test:e2e` when Chromium is installed.
6. Ask the owner for the local game-installation path only if the next task needs read-only integration measurements. Do not assume the path from the previous computer still applies, and never commit it.

A useful first prompt on the new machine is:

> Read `AGENTS.md` and `docs/handoff/new-pc-and-codex.md` completely, inspect Git status, and continue from the documented next milestone. Treat the game installation as read-only and do not push or publish anything without my request.

## Repository identity and state

- Canonical GitHub repository: `https://github.com/dredmorpedia/dredmorpedia.git`.
- Working branch: `master`.
- The current recipe-backlink work follows `3e985d4` (`feat: add published route registry`). Use `git log` to confirm the latest live branch state.
- `ed71652` relocated all 1,450 tracked legacy files under `legacy/` as exact renames with no content changes.
- `4fa3d8a` added the modernization analysis, project/agent guidance, roadmap, ADR process, data policy, and repeatable audit.
- The transfer-handoff commit containing this document follows those commits. Use `git log` rather than relying on this document for its own hash.
- The modern workspace contains `apps/web`, `packages/domain`, `packages/data-pipeline`, and `fixtures/synthetic`. Tracked tests and public preview content use only independently authored fixtures.
- Dataset schema 3 separates normalized records from search schema 1; output-manifest schema 2 checksums normalized, search, and diagnostic outputs. Source-manifest schema 2 declares dataset/source versions, guarded patch overlays, and an optional version-scoped route registry. The web application has deterministic collision-safe item/stat/recipe/encrustment/skill/ability/spell/monster routes, registered historical aliases, source-ID aliases, versioned patch provenance, shareable project-owned search filters, item/stat/crafting/encrusting/loadout/spell/monster-family/drop backlinks, normalized item/ability/monster spell triggers, monster core profiles with local AI/sight/dig/dash/charge and sound/sprite presentation metadata plus direct drops, direct encrustment outcomes, a separately modeled shared instability-effect pool, and explicit missing-definition/reference/cycle states.
- Synthetic desktop/mobile keyboard and axe checks pass. Read-only full-dataset import/build/query measurements are recorded without the local installation path or official content.
- Generated artifacts remain ignored under `data/generated/`. Dependencies and Playwright browser downloads are local machine state and are not transferred through Git.
- The preserved application is served with `legacy/` as its document root and must remain runnable until parity is demonstrated.
- Recheck the working tree rather than assuming it is clean. Root-level `MANIFEST.txt` and `RESTORE.md` files extracted from a transfer package are ignored handoff artifacts; the canonical current handoff remains this tracked document. Keep the extracted files only while their old checksums or restore snapshot are useful, and do not treat them as current project documentation.

The local commits do not need to be pushed before transfer. A Git bundle includes them. Pushing to GitHub is a separate owner-approved action.

## Confirmed decisions from the owner conversation

| Area | Confirmed direction |
| --- | --- |
| Rebuild | Build the replacement from scratch; use legacy behavior and data rules as evidence, not as the target architecture. |
| Coverage | Complete useful legacy functional/content coverage before the project becomes primarily an improvement effort. Vertical slices are delivery steps, not a reduction of the parity target. |
| Official sources | Support the base game and all three official expansions first. Keep mod support architecturally possible, but broad mod support is the lowest initial priority. |
| Platform | Continue with the implemented pnpm/strict TypeScript spike, deterministic Node data pipeline, framework-independent domain layer, and Next.js App Router/React web app. ADRs 0001 and 0002 are technically validated but remain Proposed until the publication-policy gate passes. |
| Rendering/hosting | Start with static export and validate GitHub Pages as the leading free-hosting candidate without hard-coupling the project to it. |
| Styling/components | Use Tailwind CSS plus project-owned design tokens and selectively copied shadcn/ui components backed by Base UI. Create a modern interface rather than copying the legacy design, while retaining enough game-inspired character that approved official icons/images do not look out of place. Add only components required by a product slice and treat their source as maintained web-layer code. |
| Themes | Support light, dark, and system modes from the first real UI foundation. |
| Language | Ship in English initially. Do not add localized routes, translation catalogs, a language selector, or manually translated game content without a maintained source and plan. Keep canonical game text separate from interface copy so localization can be added later without changing record identity. |
| First improvements | After parity, prioritize richer filters (including crafting-skill level where relevant), explicit “used to craft” and “used to encrust” relationships, then consider tagging, favorites, and custom lists. |
| Persistence | Do not choose local storage, accounts, or a database prematurely. Favorites/lists need a later persistence and portability decision. |
| Community | No community or social features are planned for the initial project. |
| Live tracking | Potentially valuable, but it is a separate later research track. It must prove what game/save/runtime state is observable and remain read-only, safe, and privacy-preserving. |
| Collaboration | The owner intends to build the project with Codex over time. Keep decisions, commands, risks, and progress in the repository. For unresolved decisions, use focused Q&A and explain concerns/tradeoffs plainly. |

## Non-negotiable data boundary

The game installation is read-only. Inspection and hashing are allowed; editing, patching, formatting, renaming, moving, deleting, or writing inside it are not. Approved inputs may be copied into a separate gitignored workspace when a task requires it.

Do not commit or publish official databases/assets, local paths, generated derivatives with unresolved rights, credentials, or additional bundled-mod derivatives. The canonical measurement baseline is `1.1.5 public_beta`, Steam app `98800`, build `22934623`, internal branch key `public_beta`, with all three official expansions. The legal/publication boundary remains unresolved. The inherited code also lacks a root license, and bundled mods/assets do not have one obvious shared license.

The full policy is in `docs/data-and-assets-policy.md` and overrides any historical mutation instructions preserved under `legacy/`.

## Known baseline

The repeatable legacy audit should report:

- 1,450 files in `legacy/`;
- 19 first-party JavaScript files and 6,170 lines;
- 83 XML files: 82 valid and one known invalid file at `legacy/windmagic/mod/spellDB.xml`;
- 28 missing official database files in a clean checkout, which is expected because proprietary data is excluded.

The invalid Wind Magic XML and missing official databases are baseline evidence, not cleanup tasks. Strict audit switches intentionally fail for them.

## Immediate next milestone

Continue the first parity slice without assuming permission to publish official content:

1. Decide the generated-data/art publication boundary and inherited code/mod/asset license policy with the owner.
2. Accept or revise ADRs 0001 and 0002 after that decision.
3. Review and approve or revise `docs/product/first-parity-slice.md` plus ADR 0003 search response/relevance budgets.
4. Decide how official stat definitions are sourced or modeled: the measured build has item/spell stat references but no standalone `statDB.xml`. Do not invent descriptions or provenance.
5. Continue monster parity: static core-profile routes, inheritance, spell/on-hit hooks, direct drops, reciprocal spell/item backlinks, every measured official AI/sight/movement/presentation construct, on-death/dash/charge spell hooks, and the six independently evidenced primary attributes are implemented. Proceed with Life, Mana, secondary-stat, or damage formulas only after resolving the documented source conflicts against the canonical build.
6. Treat the current 2,679 unsupported/partially-supported element diagnostics and 19 dangling references as the measured compatibility backlog, not as silently completed parity. Items account for 1,510 unsupported entries and spells for 1,169; no measured official monster child element remains unsupported. Three dangling references are genuine monster spell names absent from the active spell dataset. All 49 named active monster drops and all 11 behavior-associated monster spell references resolve, while seven type-driven drops deliberately have no fabricated item. The 16-entry shared instability pool is implemented and fully resolves in the canonical dataset; its source does not define weights, per-encrustment assignments, trigger rules, or a complete risk formula.

Architecture and foundation results are in `docs/analysis/architecture-spike-2026-07-19.md` and `docs/analysis/first-parity-foundation-2026-07-19.md`. Generated official-derived output remains ignored and non-public.

## Item-quality review completed

The item-quality slice passed its separate code review on 2026-07-21. Read-only comparison against all 763 official item records found zero mismatches: 257 weapon records use root `level`, 268 armour records use nested `<armour level>`, 54 trap records use nested `<trap level>`, and 184 other records use zero. The last group includes 68 food/potion records with unrelated root levels that must not be displayed as quality. Patch validation now permits only non-negative integers, current web consumers reject stale schema 3 artifacts without valid quality, and the reviewed card/detail layouts have no horizontal overflow at desktop or 390-pixel mobile widths. Synthetic generation, full workspace checks, desktop/mobile Playwright flows, and axe checks remain the repeatable regression evidence.

## Spell relationship slice completed

Static spell details now expose direct effects, resolved or dangling spell/stat targets, provenance, diagnostics, and deterministic backlinks from spells, items, abilities, and the shared instability pool. The pure domain traversal records every direct edge, expands each resolved spell once, and marks cycles or repeated branches where recursion stops. Synthetic desktop/mobile and axe coverage includes a deliberate two-spell cycle and dangling target. The ignored official dataset builds 951 spell routes within 2,150 static pages; all 807 official spell-reference edges resolve, and the measured maximum shortest-path depth is 7.

## Skill and ability parity slice completed

Static skill and ability details now expose archetype, complete named/generic starting loadouts, always/optional quantities, ordered progression, signed damage/resistance/primary/secondary modifiers, source flags, progression tags, recovery/currency source values, supported spell-trigger events, provenance, and diagnostics. Resolved items and spells link both ways; dangling names stay visible without fabricated routes. Synthetic desktop/mobile and axe coverage follows item→skill→ability→spell navigation and includes generic/dangling loadouts, signed modifier values, numeric stat-ID disclosure, neutral source-metadata disclosure, a dodge hook, and a dangling ability spell. The ignored official dataset contains 52 skills, 352 linked abilities, 76 loadout definitions, 264 fully resolved ability triggers, and 473 direct modifiers across 217 abilities. It also preserves 11 flag values, 4 progression tags, 10 recovery amounts, and 1 currency percent; no measured skill/ability child elements remain unsupported. Sixteen named loadouts remain genuinely unresolved.

## Monster profile, movement, presentation, spell-hook, and drop slices completed

Feature review status: the monster-drop/item-backlink and initial aggressiveness/span/invisible AI source-metadata slices passed separate feature code review on 2026-07-21. The sight, movement, presentation, and primary-attribute formula slices passed separate feature code review on 2026-07-22. The reviews made named and type-driven drops an exclusive domain union enforced by the web artifact guard, added adversarial malformed-shape coverage, established the loss-aware flag pattern used by every measured boolean AI and movement attribute, changed invalid boolean tokens from silent disabled values to diagnosed unavailable values, rejected unexpected nested leaf content, kept raw engine references out of the browser, and made duplicate local monster bonuses diagnose and resolve with the preserved last-declaration-wins rule before inheritance and calculation.

Static monster details now expose taxonomy, dungeon-depth/special classification, fighter/rogue/wizard source levels, experience, palette metadata, effective inherited stat bonuses and AI casting chance, the six verified primary attributes, local loss-aware aggressiveness/span/invisible/chicken/charm/paralyze/steal, sight cone/modifier, dig/dash/charge source metadata, and safe sound/sprite coverage summaries, resolved or dangling on-hit/cast/on-death/dash/charge spell hooks, direct named/type-driven drops, parent/direct-variant navigation, provenance, and diagnostics. Primary values come from a pure domain coefficient table and add effective inherited primary bonuses. Exact one-in odds are retained alongside a rounded display percentage; resolved spells and named items link both ways. Drops, AI/sight/movement/presentation metadata, and hook declarations remain local to the declaring monster, and type-driven drops do not fabricate items. Detailed engine references are retained in local generated artifacts but not rendered while asset publication remains unresolved. Life, Mana, secondary combat totals, and complete AI/movement formulas remain explicitly unavailable because the researched sources conflict. Synthetic desktop/mobile, keyboard, and axe coverage follows a child to its parent, spell, and drop item, verifies reciprocal backlinks and inherited/overridden fields, exercises a generic artifact drop, displays a primary total with a source bonus plus enabled, disabled, numeric, invalid-fallback, and absent AI/sight/movement/presentation values without claiming behavior formulas, and exposes dangling spell/item names without fabricating routes. Focused importer tests cover absent/disabled/enabled AI states, both measured percentage casing variants, supplied/absent/invalid sight and movement values, boolean movement flags, resolved/dangling behavior spells, all measured sound/sprite shapes, local presentation non-inheritance, and unknown-attribute diagnostics. Formula evidence and exclusions are recorded in `docs/analysis/monster-derived-stat-evidence-2026-07-22.md`.

The ignored official dataset contains 183 monsters: 132 inherit, 23 are special, all 183 resolve a dungeon depth, 177 supply experience, and 131 supply palette metadata. Inheritance produces 1,331 effective modifiers (458 damage, 486 resistance, 12 primary, and 375 secondary). AI metadata contains 108 aggressiveness/span pairs; invisible has 5 enabled/1 disabled values, chicken has 17 enabled/10 disabled values, charm and paralyze have 4 and 3 explicit disabled values, steal-gold has 1 enabled value, and steal percentage has 2 values (20 and 50). All measured official AI attributes are normalized. Sight metadata is present on 55 monsters with no diagnostics: cones are 90 (28), 270 (23), or 360 (4), and modifiers span 0.65 through 3.2. Movement metadata is present as 6 dig, 4 dash, and 2 charge declarations. All 4 dash records enable interruptible; both charge records enable interruptible/blocks-action and disable targets-self. The 11 associated on-death/dash/charge spell hooks all resolve. The earlier 274 hooks remain (223 aware-casting and 51 on-hit); 271 resolve and three remain explicit dangling references, with at most 16 hooks on one monster. Fifty-six direct drops normalize across 15 monsters: all 49 named items resolve, and six `artifact` plus one `zorkmids` type-driven drops remain explicit, with at most 12 drops on one monster. Presentation metadata contains 60 sound declarations with 242 symbolic cue IDs plus 54 attack, 52 hit, 52 death, 27 cast, 2 beam, 1 morph, and 1 dig animation declarations with 519 validated sprite references. No measured official monster child element remains unsupported; the only monster diagnostics are the three genuine dangling spell references. All 183 routes export within 2,789 static pages.

The verified primary calculation covers all 183 ignored official monsters. Eight have 12 effective primary modifiers; totals span 0–154 Burliness, 0–190 Sagacity, 0–140 Nimbleness, 0–173 Caddishness, 0–223 Stubbornness, and 0–209 Savvy. These are aggregate read-only measurements, not permission to publish the artifact.

## Open decisions and blockers

- Rights and policy for publishing normalized official data and art.
- License/provenance treatment for inherited code, historical mods, and assets.
- Approval or revision of the drafted first parity-slice acceptance statement.
- Search response-time and relevance acceptance criteria for ADR 0003.
- Approved source/model for stat definitions absent from the canonical installed build.
- Priority among the recorded post-parity quality-of-life candidates.
- Technical feasibility of live progress tracking, deliberately deferred.

Do not resolve these by assumption. Ask the owner when a choice would materially change the implementation or publication boundary.

## Safe transfer package

Run from the clean repository on the old PC:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/create-transfer-package.ps1
```

The script creates `dredmorpedia-transfer-<timestamp>.zip` beside the repository. It contains:

- `dredmorpedia.bundle` — all committed Git refs and history, including local unpushed commits;
- `RESTORE.md` — a copy of this guide;
- `MANIFEST.txt` — source branch/commit, remote, creation time, and checksums.

Because the package is built from committed Git objects, it excludes ignored/untracked official data, generated output, credentials, editor state, and machine-specific files. The script refuses to package a dirty working tree, refuses to write inside the repository, does not overwrite an existing archive, verifies the bundle, and validates the ZIP contents.

### Restore on the new PC

1. Copy the ZIP through Google Drive and verify its SHA-256 against the value printed by the packaging script or recorded separately.
2. Extract the ZIP to a temporary folder.
3. Clone the bundled history:

```powershell
git clone .\dredmorpedia.bundle dredmorpedia
Set-Location dredmorpedia
git remote set-url origin https://github.com/dredmorpedia/dredmorpedia.git
git status -sb
git log --oneline --decorate -5
```

4. Configure the preferred repository-local Git author identity on the new computer; local Git configuration is intentionally not transferred by the bundle.
5. Open the restored folder in Codex and use the resume prompt above.
6. Provide the new machine's game-installation path only when a read-only integration task needs it.

The Codex chat transcript, local game installation, ignored data, local Git configuration, credentials, editor extensions/settings, dependency caches, and generated artifacts are not transferred. This document is the intentional substitute for relying on the old chat transcript.

## Why not zip the working folder directly?

A whole-folder ZIP can include ignored proprietary/generated files because `.gitignore` does not affect archive tools. Some Windows ZIP workflows also omit hidden files such as `.git`, which would lose local history and unpushed commits. A raw ZIP is acceptable only after independently verifying its complete contents and exclusions; the bundle-based package is the canonical transfer method for this repository.
