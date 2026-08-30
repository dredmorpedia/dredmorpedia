# New PC and Codex handoff

Updated: 2026-08-30

This is the durable handoff for moving Dredmorpedia to another computer or opening it in a new Codex task with no chat history. Canonical product and architecture documents remain authoritative; this guide summarizes the state needed to resume safely.

## Resume checklist for Codex

1. Read `AGENTS.md` completely and follow it.
2. Read `PROJECT.md`, the dated repository audit, modernization proposal, roadmap, data/asset policy, and ADRs 0001–0007.
3. Run `git status -sb`, `git log --oneline --decorate -5`, and `git remote -v` before changing anything.
4. Run `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/audit-legacy.ps1` to confirm the preserved baseline.
5. Install the pinned workspace and run `pnpm generate:check` plus `pnpm check`. Run `pnpm test:e2e` when Chromium is installed.
6. Ask the owner for the local game-installation path only if the next task needs read-only integration measurements. Do not assume the path from the previous computer still applies, and never commit it.

A useful first prompt on the new machine is:

> Read `AGENTS.md` and `docs/handoff/new-pc-and-codex.md` completely, inspect Git status, and continue from the documented next milestone. Treat the game installation as read-only and do not push or publish anything without my request.

## Repository identity and state

- Canonical GitHub repository: `https://github.com/dredmorpedia/dredmorpedia.git`.
- Working branch: `master`.
- Latest parity checkpoint summarized by hash: `42db351` (`Model spell effect damage scaling`). The subsequent domain determinism/test hardening is described below; use `git log` to confirm the latest live branch state.
- `ed71652` relocated all 1,450 tracked legacy files under `legacy/` as exact renames with no content changes.
- `4fa3d8a` added the modernization analysis, project/agent guidance, roadmap, ADR process, data policy, and repeatable audit.
- The transfer-handoff commit containing this document follows those commits. Use `git log` rather than relying on this document for its own hash.
- The modern workspace contains `apps/web`, `packages/domain`, `packages/data-pipeline`, and `fixtures/synthetic`. Tracked tests and public preview content use only independently authored fixtures.
- Dataset schema 3 separates normalized records from search schema 3; search documents carry ordered route aliases for project-owned zero-result spelling suggestions plus exact nullable recipe/encrustment source skill for the shared crafting filter. Output-manifest schema 2 checksums normalized, search, and diagnostic outputs and is published last as the output-set commit marker. The web consumer verifies checksums, complete schemas, safe route/asset-reference shapes, unique same-kind canonical/alias ownership, search derivation, and diagnostic counts before rendering. Source-manifest schema 2 declares dataset/source versions, guarded patch overlays, and optional current/predecessor route registries. Route-registry schema 2 implements checksum-bound lineage, stable source-identity ownership, tombstones, reappearance, complete publication coverage, and atomic release failure. The web application has deterministic collision-safe item/stat/recipe/encrustment/skill/ability/spell/monster routes, bounded static browse catalogues for every kind, registered historical aliases, source-ID aliases, versioned patch provenance, shareable project-owned search across every generated entity kind with resilient debounced query URLs, canonical stat facets for direct item/ability/spell/encrustment declarations, a combined recipe/encrustment scope with inclusive maximum source-skill filtering, reusable project-owned URL views, bounded user-selected typo recovery, and shareable up-to-three-item comparison, item/stat/crafting/encrusting/loadout/spell/monster-family/drop backlinks, signed item damage/resistance/primary/secondary modifiers, loss-aware spell mana, root radius/wand/self/item-consumption, non-mana requirement, and buff parameters, buff-local descriptions/halos/invisibility/casting-prevention/wall-sensing/payback/zorkmid-absorption/polymorph declarations/AI hints, typed effect-list options, direct effect damage/scaling/Midas/created-object/dig-regeneration/buff-tag metadata, controls, and linked buff conditions, signed spell-buff direct and sight-radius modifiers, linked target/player hit and dodge buff event hooks, normalized item/ability/monster spell triggers, monster core profiles with local AI/sight/dig/dash/charge and sound/sprite presentation metadata plus direct drops, direct encrustment outcomes, a separately modeled shared instability-effect pool, and explicit missing-definition/reference/cycle states.
- The current validation checkpoint passes 330 unit/artifact tests, all 80
  desktop/mobile browser cases, deterministic official dataset and
  presented-asset generation, and the complete 3,731-page local official
  export. The ignored asset set covers item, skill, ability, root spell, and
  selected first-frame monster art plus three item-catalogue, 11 Encrust
  applicability, one Encrust instability, and 62 reviewed stat-icon identities;
  its schema-3 manifest binds the complete schema-2 catalog and declared UI ID
  set to the exact active artifact checksum. The canonical set contains 1,868
  mappings backed by 1,556 files with zero fallbacks. The official artifact
  contains 2,892 searchable entities, including 62 project-authored stat
  definitions, and all 4,309 modifier declarations link to those definitions
  by exact selector. Search offers 61 used stat facets across 1,350 item,
  ability, spell, and encrustment records plus seven crafting-tool categories
  across all 435 recipe declarations under 374 displayed names. Search schema 3 also preserves exact source skill
  across those declarations and all 58 encrustment declarations under 57 displayed names; the shared crafting level-2 view
  matches 165 records. Direct core navigation, `/tools/`, and the corrected
  31-category `/items/` catalogue provide preserved game order, compact and
  detailed category modes, static sort/page-size views, and verified imagery.
  The Phase 5 crafting and separately modeled encrustment tools expand exact
  recipe output declarations into dependency steps and combined shopping lists
  at `/tools/crafting-graph/` and `/tools/encrusting-plan/`; all quantities and
  editable yield choices are stored as dataset-local, shareable URL state.
  The verified search artifact is served separately at `/search-data.json`
  after the small interactive shell hydrates; its loading failure is explicit,
  and every accepted desktop/4x-CPU-mobile ADR 0003 budget passes.
  `/tools/item-compare/` preserves up to three ordered canonical items in URL
  state and keeps exact source fields, named stats, direct modifiers, and
  missing declarations distinct. The measured root spell audit is complete,
  and `/dataset/` exposes 5 ordered sources, 94 diagnostics, 45 affected
  records, and 71 override steps without exposing the local installation path.
- Playwright shuts down its loopback static server through an explicit bounded global-teardown handshake. This avoids an indefinite wait when Windows process-tree termination is denied; `pnpm test:e2e` must print its final pass summary and return to the prompt.
- Direct `summon` and `summonhostile` spell effects now preserve loss-aware `monsterType` targets. All 21 active official declarations resolve to normalized monsters with reciprocal backlinks; two additional summon-family effects intentionally omit a target and remain valid null records. Runtime availability, allegiance, placement, lifetime, AI state, selection, and spawning behavior remain uninterpreted.
- Direct `removebuffbyname` spell effects now preserve all 23 active named buff targets. Every target resolves to a normalized buff-bearing spell with reciprocal backlinks; removal eligibility, scope, timing, stack handling, and runtime success remain uninterpreted.
- Buff-local `<invisible>` elements now preserve all nine active declarations. Eight retain amount `1`, one validly omits the amount, and visibility strength, detection, actor scope, breaking, stacking, duration, targeting, AI, and runtime behavior remain uninterpreted.
- Buff-local `<mute>` elements now preserve all six active declarations. Three retain amount `1`, three validly omit the amount, and affected actors or spell categories, amount meaning, immunity, resistance, stacking, duration, removal, targeting, AI, and runtime behavior remain uninterpreted.
- Buff-local `<polymorph>` elements now preserve all four active named monster targets. Every target resolves with a reciprocal monster backlink; transformation duration, stat or ability replacement, equipment behavior, targeting, faction, reversibility, and runtime success remain uninterpreted.
- Item use metadata preserves Life/Mana recovery declarations, exact extra food source flags, wand charge ranges, and loss-aware trap activation/targeting/placement declarations; potion, mushroom, and trap leaves are fully validated. Armour metadata separately preserves loss-aware slot, level, and optional `randoms` declarations. Complete weapon leaves combine existing category/quality/fixed-damage/hit relationships with loss-aware floor-target and safe hidden thrown-presentation metadata. Recovery timing, charge consumption, trap runtime behavior, random-stat selection, equipment formulas, weapon recoverability/combat formulas, and neutral flag behavior remain deliberately uninterpreted.
- Generated datasets remain ignored under `data/generated/`; managed presented assets remain ignored under `apps/web/public/generated-assets/`. Dependencies and Playwright browser downloads are local machine state and are not transferred through Git.
- `pnpm dev`/`pnpm dev:synthetic` regenerate and serve the tracked synthetic fixture plus its deliberate item-icon fallback; `pnpm dev:official` regenerates and serves the ignored canonical artifact and referenced item PNG icons from the ignored local manifest. `pnpm generate:official:check` and `pnpm build:official` provide deterministic import-only and full-static-build verification for both output sets. `pnpm benchmark:search:official` additionally enforces ADR 0003's accepted transfer, parse, query, relevance, and desktop/4x-CPU-mobile browser budgets. Every official command enables the zero-error dataset gate and replaces only a managed asset directory. These root commands explicitly select matching outputs; optional direct web commands may use an ignored `apps/web/.env.local` copied from the tracked example.
- Existing machines run `pnpm migrate:official-manifest` idempotently. It preserves the four ignored game roots/files, adds the reviewed `1.1.5 public_beta (Steam build 22934623)` dataset/source provenance when needed, and adds the tracked versioned Dredmorpedia stat and engine-item references; official generation commands invoke it automatically.
- `pnpm audit:dependencies` checks the production dependency graph against the live advisory database. The current graph uses Next.js 16.2.12 plus reviewed PostCSS and Sharp overrides and reports no known vulnerabilities; weekly Dependabot updates and a separate scheduled dependency-audit workflow provide ongoing coverage.
- Development servers omit the production-only static-export mode so a stale URL from another selected dataset reaches the accessible dataset-neutral 404 page. Production and official builds still require `output: "export"` and prove every generated route statically.
- The preserved application is served with `legacy/` as its document root and must remain runnable until parity is demonstrated.
- Tool-owned auxiliary checkouts under `.claude/worktrees/` are excluded from both Git status and Prettier traversal. Run checks inside an auxiliary checkout when working there; the root `pnpm check` intentionally validates only the current checkout.
- Recheck the working tree rather than assuming it is clean. Root-level `MANIFEST.txt` and `RESTORE.md` files extracted from a transfer package are ignored handoff artifacts; the canonical current handoff remains this tracked document. Keep the extracted files only while their old checksums or restore snapshot are useful, and do not treat them as current project documentation.

The local commits do not need to be pushed before transfer. A Git bundle includes them. Pushing to GitHub is a separate owner-approved action.

## Confirmed decisions from the owner conversation

| Area | Confirmed direction |
| --- | --- |
| Rebuild | Build the replacement from scratch; use legacy behavior and data rules as evidence, not as the target architecture. |
| Coverage | Complete useful legacy functional/content coverage before the project becomes primarily an improvement effort. Vertical slices are delivery steps, not a reduction of the parity target. |
| Official sources | Use `1.1.5 public_beta` with the base game and all three official expansions for the MVP. Keep mod support architecturally possible, but broad mod support is the lowest initial priority. Postpone a dataset-version switcher until a second complete, verified dataset exists. |
| Platform | Continue with the implemented pnpm/strict TypeScript spike, deterministic Node data pipeline, framework-independent domain layer, and Next.js App Router/React web app. ADRs 0001–0007 are Accepted within the local-only product boundary. |
| Rendering/hosting | Start with static export and validate GitHub Pages as the leading free-hosting candidate without hard-coupling the project to it. |
| Styling/components | Use Tailwind CSS plus project-owned design tokens and selectively copied shadcn/ui components backed by Base UI. Create a modern interface rather than copying the legacy design, while retaining enough game-inspired character that approved official icons/images do not look out of place. Add only components required by a product slice and treat their source as maintained web-layer code. |
| Local assets | The first incremental, read-only slice copies referenced item PNG icons from captured source snapshots into an ignored, checksummed, managed output and renders them with a safe fallback. Extend it only for assets an implemented page presents; do not bulk-copy unrelated resources. |
| Publication | Build a locally complete product first. Official XML, generated official datasets, and copied official assets remain ignored and non-public while public-release permission is unresolved. Selected screenshots may support a permission request but do not grant publication rights. |
| Licensing | New modern-project material is intended to use MIT terms. `legacy/`, official content and derivatives, bundled mods, and inherited assets are excluded. Add scoped license files after the owner supplies exact copyright-holder wording. |
| Themes | Support light, dark, and system modes from the first real UI foundation. |
| Language | Ship in English initially. Do not add localized routes, translation catalogs, a language selector, or manually translated game content without a maintained source and plan. Keep canonical game text separate from interface copy so localization can be added later without changing record identity. |
| First improvements | Do not choose post-parity improvements yet. Revisit richer filters, technical-detail disclosure, tagging, favorites, and lists during parity polish against concrete pages. |
| Persistence | Do not choose local storage, accounts, or a database prematurely. Favorites/lists need a later persistence and portability decision. |
| Community | No community or social features are planned for the initial project. |
| Live tracking | Potentially valuable, but it is a separate later research track. It must prove what game/save/runtime state is observable and remain read-only, safe, and privacy-preserving. |
| Collaboration | The owner intends to build the project with Codex over time. Keep decisions, commands, risks, and progress in the repository. For unresolved decisions, use focused Q&A and explain concerns/tradeoffs plainly. |

## Non-negotiable data boundary

The game installation is read-only. Inspection and hashing are allowed; editing, patching, formatting, renaming, moving, deleting, or writing inside it are not. Approved inputs may be copied into a separate gitignored workspace when a task requires it.

Do not commit or publish official databases/assets, local paths, generated official derivatives, credentials, or additional bundled-mod derivatives. The canonical measurement baseline is `1.1.5 public_beta`, Steam app `98800`, build `22934623`, internal branch key `public_beta`, with all three official expansions. Local use is the accepted current boundary; any future public release still requires permission evidence. The intended MIT scope excludes inherited code, bundled mods/assets, and official content, whose provenance and license treatment remain separate.

The full policy is in `docs/data-and-assets-policy.md` and overrides any historical mutation instructions preserved under `legacy/`.

## Known baseline

The repeatable legacy audit should report:

- 1,450 files in `legacy/`;
- 19 first-party JavaScript files and 6,170 lines;
- 83 XML files: 82 valid and one known invalid file at `legacy/windmagic/mod/spellDB.xml`;
- 28 missing official database files in a clean checkout, which is expected because proprietary data is excluded.

The invalid Wind Magic XML and missing official databases are baseline evidence, not cleanup tasks. Strict audit switches intentionally fail for them.

## Immediate next milestone

Continue toward local parity without assuming permission to publish official content:

1. The first parity slice is complete from implementation and validation
   evidence; it requires no separate owner sign-off. Its completion record is
   `docs/product/first-parity-slice.md`, with review evidence in
   `docs/analysis/first-parity-acceptance-readiness-2026-08-11.md`.
2. The preserved Meta view's **Required Armour by Monster** compatibility
   calculation is owner-approved and implemented under the exact legacy-facing
   name. Its evidence limits and possible future formula-verification work are
   in `docs/analysis/legacy-meta-required-armour-evidence-2026-08-11.md`.
   The navigation/tooltip mechanics inventory is also complete: all 435 canonical
   recipe declarations under 374 displayed names expose one of seven normalized tool categories in shareable search,
   and obsolete cloned-row hover/hash behavior is intentionally superseded.
   The navigation checkpoint, non-item art inventory, item/skill/ability/spell
   icons, first-frame monster art, and search filtering rework are complete.
   The first Phase 5 crafting and separately modeled encrustment dependency and
   shopping-list tools are complete. The first rich cross-list source-skill
   filter and project-authored reusable filter views are also complete. Item
   comparison is implemented for up to three canonical items. A later
   side-by-side review reopened player-experience parity because generic
   Browse/Search did not preserve enough direct, image-led discovery. The
   first correction implements direct core navigation, `/tools/`, and a
   category-first `/items/` catalogue. Its owner-reviewed polish is complete:
   compact categories by default, preserved game order, optional static
   sort/page-size views, better category representatives, small expansion
   markers, manifest-declared gold/quality imagery, and verified stat icon/value
   links. Item details retain visible stat names beside the same icons, and stat
   headers reuse them with text fallback. The Craft catalogue
   foundation has all 435 canonical recipe declarations under 374 displayed names across seven familiar tool routes,
   verified toolkit art, compact/detailed navigation, persisted display
   settings, a 36-recipe default plus 24/All views, and reusable summary cards.
   In Items and selected-tool Craft routes, the actual selected tab
   progressively becomes a compact upper-right return-to-chooser control after
   the chooser scrolls away. No-JavaScript navigation remains unchanged.
   Selected-tool cards hide repeated tool identity and the derived maximum-
   level footer. Whole-relationship mouse hover plus an icon-only
   focus/tap control now expose those cards while keeping direct links visible;
   toolkit art sits between ingredients and outputs in the preview. The
   Encrust catalogue now groups all 58 canonical declarations under 57 displayed names and five used
   toolkits, defaults to a complete game-order tool group, offers persisted
   compact/detailed and optional static ordering/page-size views, and exposes
   ingredient art, exact applicability labels with verified blue schematic
   icons, Craft-consistent source-level requirements, direct outcomes, and the
   exact signed instability value with its native 16-by-16 interface icon,
   without inferred formulas.
   Item catalogue and detail cards expose direct artifact declarations as
   **Artifact / Quality x**, separately from ordinary item quality and without
   inferring Archaeology or Museum behavior.
   Item catalogue/detail relationships now reuse accessible recipe and Encrust
   preview cards, **Crafted from** previews a recipe from its complete
   ingredient group plus one adjacent eye control without recipe-name rows or
   unit quantities, and native disclosure
   reveals every overflow relationship in place. Multiple applicability slots
   render as a complete compact icon stack rather than an arbitrary single
   icon. Item effect cards preserve explicit chance, verified spell icon,
   linked spell, and natural trigger context in one sentence, plus available qualifiers across weapon and non-weapon
   families; later effects use native disclosure. The Value/Quality row is
   centered against its imagery. Catalogue modifiers use preserved semantic
   rows for damage, resistance, primary, then secondary. The three non-zero
   armour random-stat declarations use their own final row. The 20 positive
   floor-target flags appear without the unsupported recoverability inference.
   All stat/modifier entries remain visible by default, including the 35
   official items with more than six entries. All 21 exact wand charge ranges
   now appear directly on catalogue cards without inferred consumption or
   recharge behavior. The preserved orphaned
   output `x` is not reproduced. Image-led Skills and Abilities follow.
   Hidden/expansion iconography and bounded build planning are postponed. See
   `docs/analysis/legacy-experience-parity-review-2026-08-15.md`.
3. Extend the local asset importer only when another implemented page needs
   concrete art; specialized sprite treatment remains page-specific.
4. Keep disputed monster Life, Mana, secondary-stat, and damage formulas unavailable until the documented source conflicts are resolved against the canonical build; all measured official monster child elements and the six independently evidenced primary attributes are already implemented.
5. No measured item, spell-child/effect, spell-requirement, or root spell compatibility diagnostic remains. The targeting-template family is complete with all 106 active references resolved; root radius, self, cooldown, melee-attack, mine, item-consumption, wand, and no-animation declarations are preserved through their loss-aware contracts. The three exact shield requirements, one exact weapon requirement, six exact booze requirements, and three exact zorkmid requirements are preserved. Treat the two reviewed `Spores` source-only records, one reviewed correction, 16 exact Lockpick links through ADR 0006's labelled engine-item reference, and four remaining dangling references as explicit parity evidence. No measured official skill/ability or monster child element remains unsupported.
6. ADR 0004 is implemented; keep `--publication-routes` off local official commands until content permission exists, and keep the version switcher deferred until a second complete dataset exists. Evidence is in `docs/analysis/published-route-registry-lifecycle-evidence-2026-08-09.md`.
7. ADR 0003 is accepted: `pnpm benchmark:search:official` enforces the transfer, parse, ordinary/suggestion query, concrete relevance, and desktop/4x-CPU-mobile browser budgets recorded in `docs/analysis/search-response-budgets-evidence-2026-08-09.md`.
8. The presented-asset set now maps all 764 canonical items, including the labelled Lockpick engine reference, while retaining official asset provenance and zero fallbacks; current measurements are in `docs/analysis/engine-item-reference-and-macguffin-catalogue-evidence-2026-08-22.md`.
   A 2026-08-24 read-only whole-installation follow-up also confirms the exact
   `Lucky Pick` direct-item link and supporting room, tweak,
   configuration-text, and literal executable evidence without expanding the
   generated item contract.
9. `/dataset/` exposes the active source order, grouped diagnostics, affected
   records, 71 canonical override steps, and reviewed patches from the verified
   artifact set. It is not a source selector or version switcher. Evidence is
   in `docs/analysis/dataset-health-and-source-decisions-evidence-2026-08-09.md`.
10. Cross-entity stat search covers direct item, ability, spell, and
   encrustment declarations through 61 active facets. Inherited monster bonuses
   remain on stat detail pages, and the preserved amount-ranking heuristic is
   not treated as a gameplay formula. Evidence is in
   `docs/analysis/cross-entity-stat-search-evidence-2026-08-09.md`.

Do not silently revise the Meta formula if later evidence conflicts with it;
record a separate product decision and migration.

Architecture and foundation results are in `docs/analysis/architecture-spike-2026-07-19.md` and `docs/analysis/first-parity-foundation-2026-07-19.md`. Generated official-derived output remains ignored and non-public.

Targeting-template parity now has static, searchable, accessible routes with strict grid-shape validation plus reciprocal spell relationships. Both measured template-ID casing forms and the loss-aware anchor-player flag are preserved; all 106 active references resolve. Evidence is in `docs/analysis/spell-targeting-template-evidence-2026-08-11.md`.

Root spell `self` parity preserves all three active strict source-binary flags:
two false and one true across missile, target, and self spell types. The web
labels the field as root metadata, keeps it distinct from buff/effect self
fields, and withholds actor, targeting, scope, timing, and runtime semantics.
The subsequent root no-animation slice completes the measured root audit.
Evidence is in `docs/analysis/spell-root-self-flag-evidence-2026-08-11.md` and
`docs/analysis/spell-root-no-animation-evidence-2026-08-11.md`.

## Buff-local effect slice completed

All 26 active effects nested directly in 11 spell buffs now retain their
declared scope while using the same strict normalized shape and relationship
linker as direct effects. The 15 nested spell targets and one named
buff-removal target resolve; domain chains and reciprocal backlinks include
both scopes; and nine effects preserve safe hidden presentation metadata,
including one large/small icon pair. The spell page exposes these declarations
inside their owning buff without inferring scheduling, trigger order, buff
lifetime, tick timing, eligibility, or runtime success. This removes all 11
former nested-effect diagnostics and leaves 21 spell compatibility constructs,
13 separately tracked spell requirements, and 23 dangling references. Evidence
is recorded in
`docs/analysis/spell-buff-effect-evidence-2026-07-29.md`.

## Spell environmental-effect metadata slice completed

All six active `objectSprite` references on `create` effects and all four
active `regengfx` flags on `dig` effects now use separate loss-aware normalized
fields. The three unique concrete references are safe, available, and
registered as deterministic inputs; all graphics flags are explicit true
values. The page discloses reference availability and exact flags while
hiding paths and withholding created-object lifetime, terrain changes, redraw
timing, placement, persistence, and runtime success. This removes all ten
former diagnostics and leaves 11 spell compatibility constructs, 13
separately tracked spell requirements, and 23 dangling references. Evidence
is recorded in
`docs/analysis/spell-effect-environment-metadata-evidence-2026-07-29.md`.

## Spell damage-effect Midas slice completed

All four active `midas` attributes now preserve exact loss-aware booleans on
their direct `damage` effects. Every canonical declaration comes from the base
game and is explicit true. The page exposes the source flag while withholding
gold conversion eligibility or value, target transformation, drops,
persistence, and runtime success. This removes all four former diagnostics and
leaves seven spell compatibility constructs, 13 separately tracked spell
requirements, and 23 dangling references. Evidence is recorded in
`docs/analysis/spell-effect-midas-evidence-2026-07-29.md`.

## Spell buff wall-sensing slice completed

The one active `senseWallsFlag` declaration now preserves its exact
game-boolean source flag in an ordered buff-local array. Missing, malformed,
and extended declarations are diagnosed, and the strict web artifact boundary
rejects invalid normalized shapes. The spell page exposes the source value
without inferring detection range, revealed terrain, actor scope, interaction
with sight modifiers, stacking, duration, or runtime success. This removes the
former `senseWallsFlag` diagnostic and leaves six spell compatibility
constructs, 13 separately tracked requirements, and 23 dangling references.
Evidence is recorded in
`docs/analysis/spell-buff-sense-walls-evidence-2026-08-05.md`.

## Spell buff dodge-hook slice completed

The one active lowercase `dodgebuff` declaration now extends the existing buff
event-hook relationship contract with a `dodge` kind. Its 100-percent source
chance and named target are retained, the target resolves with a reciprocal
spell backlink, and missing, malformed, or extended records remain
source-located diagnostics. The installed validation schema and preserved
application use the `dodgeBuff` casing and establish the required
percentage/name shape plus the `you dodge` label, but the modern page does not
infer event eligibility, evaluation order, cooldown interaction, timing,
target selection, or runtime success. This removes the former `dodgebuff`
diagnostic and leaves five spell compatibility constructs, 13 separately
tracked requirements, and 23 dangling references. Evidence is recorded in
`docs/analysis/spell-buff-dodge-hook-evidence-2026-08-05.md`.

## Spell buff payback slice completed

The one active `<payback>` declaration now preserves its required
`secondaryScale` game-boolean flag and `paybackF` decimal as an ordered,
loss-aware buff-local record. Missing, malformed, and extended declarations
remain source-located diagnostics, and the strict web artifact boundary rejects
invalid normalized shapes. The spell page exposes the direct values without
inferring a base amount or source stat, health relationship, damage return,
trigger or event timing, caps, stacking, eligibility, or final formula, and it
does not fabricate a link to the separate spell named `Payback`. This removes
the former `payback` diagnostic and leaves four spell compatibility constructs,
13 separately tracked requirements, and 23 dangling references. Evidence is
recorded in
`docs/analysis/spell-buff-payback-evidence-2026-08-05.md`.

## Spell buff zorkmid-absorption slice completed

The one active `<zorkmidAbsorption>` declaration now preserves its required
signed-byte `zorkmidsPerDamage` and `damageCap` values plus decimal `maxRatio`
as an ordered, loss-aware buff-local record. Missing, malformed, out-of-range,
and extended declarations remain source-located diagnostics, and the strict
web artifact boundary rejects invalid normalized shapes. The spell page
exposes the direct values without deriving a currency cost or
damage-mitigation formula, cap application, target, timing, eligibility,
stacking, duration, or runtime success. This removes the former
`zorkmidAbsorption` diagnostic and leaves three spell compatibility attributes,
13 separately tracked requirements, and 23 dangling references. Evidence is
recorded in
`docs/analysis/spell-buff-zorkmid-absorption-evidence-2026-08-06.md`.

## Spell effect buff-tag slice completed

The one active `buffTag` attribute now preserves its exact non-blank source
token on every direct or buff-local effect through a required nullable field.
Blank supplied values remain source-located diagnostics, and the strict web
artifact boundary rejects missing, blank, or malformed normalized shapes. The
spell page exposes the token without creating a link or inferring tag matching,
buff or curse selection, removal behavior, target scope, evaluation order,
timing, or runtime success. This removes the former `buffTag` diagnostic and
leaves two compatibility attributes, both `level` on spell requirements, plus
13 separately tracked requirements and 23 dangling references. Evidence is
recorded in
`docs/analysis/spell-effect-buff-tag-evidence-2026-08-06.md`.

## Spell requirement-level slice completed

The two active `level="1"` attributes on Oil Slick and Oil Slick2 mana
declarations now normalize as nullable signed-byte `sourceLevel` values.
Malformed or out-of-range supplied values remain unavailable with
source-located diagnostics, and the strict web artifact boundary rejects
invalid normalized shapes. The installed validation schema establishes the
optional signed-byte source shape, while the preserved application ignores the
attribute. The spell page exposes the exact source value without inferring an
actor, unlock, eligibility, progression, or other engine rule. This removes the
final two compatibility diagnostics. Thirteen non-mana spell requirements and
23 dangling references remain explicit. Evidence is recorded in
`docs/analysis/spell-requirement-level-evidence-2026-08-06.md`.

## Spell shield-requirement slice completed

The three active exact `shield="1"` declarations on Tortoise Maneuver,
Defensive Bash, and Duck And Cover! now normalize as ordered nullable
`shieldRequirements` source flags. Malformed values remain unavailable with
source-located diagnostics, and the strict web artifact boundary rejects
non-boolean normalized shapes. The installed validation schema restricts
`dredbool` to `0` and `1`, while the preserved application ignores the shield
attribute. The spell page exposes the exact flag without inferring an actor,
equipment state, eligibility rule, timing, or runtime success. Ten non-mana
spell requirements and 23 dangling references remain explicit. Evidence is
recorded in
`docs/analysis/spell-shield-requirement-evidence-2026-08-06.md`.

## Spell weapon-requirement slice completed

The one active exact `weapon="0"` declaration on Liechtenauer's Overhau now
normalizes as an ordered nullable `weaponRequirements` source flag. Malformed
values remain unavailable with source-located diagnostics, and the strict web
artifact boundary rejects non-boolean normalized shapes. The installed
validation schema restricts `dredbool` to `0` and `1`, while the preserved
application ignores the weapon attribute. The spell page exposes the exact
flag without inferring an actor, equipped item state, weapon category,
eligibility rule, timing, or runtime success. Nine non-mana spell requirements
and 23 dangling references remain explicit. Evidence is recorded in
`docs/analysis/spell-weapon-requirement-evidence-2026-08-06.md`.

## Spell booze-requirement slice completed

The six active exact `booze="..."` declarations now normalize as ordered
nullable signed-byte `boozeRequirements` source values. Malformed, empty, or
out-of-range values remain unavailable with requirement-located diagnostics,
and the strict web artifact boundary rejects invalid normalized shapes. The
installed schema establishes only the signed-byte source shape, while the
preserved application ignores the attribute. The spell page exposes each
exact value without inferring an actor, inventory or consumption state,
eligibility rule, timing, or runtime success. Three zorkmid requirement
diagnostics and 23 dangling references remain explicit. Evidence is recorded
in `docs/analysis/spell-booze-requirement-evidence-2026-08-09.md`.

## Spell zorkmid-requirement slice completed

The three active zorkmid-family declarations now normalize as ordered
loss-aware `zorkmidRequirements` records. Each record preserves a nullable
positive-integer `zorkmids` source value plus nullable decimal
`zorkmidScaleF` and `savvyBonus` source values. Empty, malformed, or
non-positive supplied values remain unavailable with requirement-located
diagnostics, and the strict web artifact boundary rejects malformed normalized
shapes. The installed schema establishes the source types, while the preserved
application does not read the currency fields or establish a usable cost
formula. The spell page exposes the exact values without combining them into a
cost or Savvy formula or inferring an actor, available currency, payment,
eligibility, timing, or runtime success. No unsupported spell requirement
remains; the canonical warning set is exactly 23 dangling references. Evidence
is recorded in
`docs/analysis/spell-zorkmid-requirement-evidence-2026-08-09.md`.

## Dangling-reference classification and reviewed resolutions completed

The canonical 23 `dangling_reference` warnings are now measured as 23 source
declarations, nine owner/reference pairs, and seven distinct labels. Sixteen
`lockpick` skill loadouts and two `Spores` spell-list options were
engine/source-only candidates. `Acidium Salis` is a probable source typo for
the active `Acidum Salis` item. The Satanic Locator spell label is a deliberate
placeholder. Tougher Lord Dredmor's two `Strong Lingering ...` labels and Deep
Raven's `Eye Lasers` spell label remain ambiguous. The owner approved the
source-only class: the 18 declarations now carry reviewed status and
informational audit records without an entity, alias, route, or backlink. The
owner also approved the exact `Acidium Salis` relationship as a reviewed
correction to `Acidum Salis`; it retains the source label and stable review ID,
creates the resolved backlink, and does not patch game data or create a global
alias. Four dangling warnings remain. Keep the placeholder and ambiguous spells
unresolved absent new evidence. Details are in
`docs/analysis/relationship-reviewed-correction-evidence-2026-08-09.md`.

The generic loss-aware relationship-resolution contract is now implemented
and integrated for named skill loadouts and named spell item-list options. It distinguishes exact links,
reviewed corrections, reviewed source-only labels, and unresolved targets,
always retaining the original label; both reviewed states require a stable
review ID. The canonical split is 47 exact plus 16 source-only named loadouts,
13 type-only declarations, and 189 exact plus one reviewed correction plus two
source-only item-list options. The diagnostic set is 0 errors, 4 warnings, and
90 info. Evidence is in
`docs/analysis/relationship-reviewed-correction-evidence-2026-08-09.md`.

## Item-quality review completed

The item-quality slice passed its separate code review on 2026-07-21. Read-only comparison against all 763 official item records found zero mismatches: 257 weapon records use root `level`, 268 armour records use nested `<armour level>`, 54 trap records use nested `<trap level>`, and 184 other records use zero. The last group includes 68 food/potion records with unrelated root levels that must not be displayed as quality. Patch validation now permits only non-negative integers, current web consumers reject stale schema 3 artifacts without valid quality, and the reviewed card/detail layouts have no horizontal overflow at desktop or 390-pixel mobile widths. Synthetic generation, full workspace checks, desktop/mobile Playwright flows, and axe checks remain the repeatable regression evidence.

## Item stat modifier slice completed

Item records now preserve fixed weapon damage and direct damage/resistance/primary/secondary modifier declarations in the shared finite signed-modifier shape. Item pages separate named stats from direct modifiers, numeric primary/secondary IDs remain explicit rather than fabricated definitions, and structured search exposes collision-safe modifier facets. The ignored canonical artifact contains 1,584 modifiers across 506 of 763 active items: 480 damage, 255 resistance, 122 primary, and 727 secondary, with at most 12 per item. Supporting the four direct modifier-element families removes 599 former diagnostics, reducing the measured compatibility backlog to 911 item plus 2,333 spell constructs. Damage factors and item effect semantics remain diagnosed and unavailable. Evidence is recorded in `docs/analysis/item-stat-modifier-evidence-2026-07-22.md`.

## Item category slice completed

Item category facets now derive from verified source shapes rather than exposing the overloaded root XML type. Stable keys have project-owned display labels on home, search, and detail routes. The ignored canonical artifact classifies all 763 active items into 31 meaningful categories with no bare numeric or `unknown` category values, and every item search document matches its normalized record. Category derivation does not suppress diagnostics for unmodeled fields inside partially supported item elements. Evidence is recorded in `docs/analysis/item-category-evidence-2026-07-22.md`.

## Item artifact slice completed

Direct item artifact declarations now preserve ordered, loss-aware non-negative qualities. The item page displays the declaration only when present, while invalid or missing supplied quality remains visibly unavailable and diagnosed. The ignored canonical artifact contains 108 valid declarations across 108 active items, spanning qualities 1 through 27. Supporting this verified shape removes all 108 former unsupported `<artifact>` diagnostics and reduces the measured compatibility backlog to 803 item plus 2,333 spell constructs. Evidence is recorded in `docs/analysis/item-artifact-evidence-2026-07-22.md`.

## Item direct-trigger slice completed

Direct item melee-target, melee-self, crossbow, thrown, and kill hooks are now fully normalized with both measured target/self casing forms. The shared item/ability trigger contract preserves ordered exact source flags, and item/ability pages display them without assigning engine timing semantics. The ignored canonical artifact contains 77 fully resolved direct hooks within 230 total item triggers; three formerly ignored lowercase aliases now resolve, and one kill hook retains `after=1`. Supporting the verified leaves removes all 74 associated compatibility diagnostics and reduces the measured backlog to 729 item plus 2,333 spell constructs. Evidence is recorded in `docs/analysis/item-direct-trigger-evidence-2026-07-23.md`.

## Item use metadata slice completed

Item pages now expose ordered, loss-aware Life/Mana recovery source values and wand minimum/maximum charge ranges, while exact extra food flags remain neutral key/value metadata. Food, wand, potion, mushroom, and mushroom-associated casts leaves are fully validated. The ignored canonical artifact contains 49 recovery declarations, 21 valid charge ranges, and 64 fully resolved related item triggers. Supporting these leaves removes 120 former compatibility diagnostics and reduces the measured backlog to 609 item plus 2,333 spell constructs. Recovery timing, charge consumption, and `meat` behavior remain explicitly uninterpreted. Evidence is recorded in `docs/analysis/item-use-metadata-evidence-2026-07-23.md`.

## Item trap metadata slice completed

Item pages now expose loss-aware trap activation, level, caster-targeting, and placement-source coverage while retaining the existing stepped-on spell relationship. Raw origin asset paths remain in ignored artifacts and are summarized rather than rendered. The ignored canonical artifact contains 54 active declarations: 45 `once`, 9 `always`, 2 caster-targeting flags, 9 safe origin references, and 54 fully resolved spell links. Supporting the complete verified leaf removes all 54 former trap diagnostics and reduces the measured backlog to 555 item plus 2,333 spell constructs. Reset timing, target selection, and placement behavior remain explicitly uninterpreted. Evidence is recorded in `docs/analysis/item-trap-metadata-evidence-2026-07-23.md`.

## Item gem marker slice completed

The pipeline now strictly validates `<gem>` as an empty item-classification leaf while keeping the existing `gem` category as its complete normalized representation. All 20 canonical markers match that shape, so the slice removes all 20 former gem diagnostics and reduces the measured backlog to 535 item plus 2,335 spell constructs. Unexpected attributes or children remain diagnosed, and no additional gem behavior is inferred. The full synthetic, desktop/mobile browser, and ignored official-build checks pass. Evidence is recorded in `docs/analysis/item-gem-marker-evidence-2026-07-28.md`.

## Item armour declaration slice completed

Items now preserve ordered, loss-aware armour slot, level, and optional `randoms` source values. The item page exposes those direct declarations while withholding random-stat selection and equipment formulas, and the strict importer/artifact boundary diagnoses malformed or extended shapes. All 268 canonical declarations satisfy the contract, removing all 268 former armour compatibility diagnostics and reducing the measured backlog to 267 item plus 2,335 spell constructs. Evidence is recorded in `docs/analysis/item-armour-declaration-evidence-2026-07-28.md`.

## Item weapon declaration slice completed

All 257 canonical weapon leaves are now complete across semantic category, root quality, 452 fixed damage values, 35 resolved hit triggers, and ordered loss-aware weapon declarations for 20 floor-target flags and 28 safe hidden presentation references. The strict importer accepts both measured floor-target spellings and diagnoses invalid booleans, unsafe paths, text, nested content, and scaling/extension attributes. The item page discloses direct floor-target/reference coverage without showing raw paths or inferring recoverability or combat formulas. This removes all 257 former weapon compatibility diagnostics and reduces the measured backlog to 10 item plus 2,335 spell constructs. Evidence is recorded in `docs/analysis/item-weapon-declaration-evidence-2026-07-28.md`.

## Item macguffin declaration slice completed

Both canonical macguffin leaves now preserve ordered loss-aware spell, item-class-name, and consumable source values. Resolved spells link both ways; the source's `non-existant-spell` target remains visible and raises the measured dangling-reference count to 20. Strict importer and web schemas diagnose malformed or extended shapes, while item pages explicitly withhold activation, targeting, and actual-consumption claims. This removes both former macguffin compatibility diagnostics and leaves 8 `toolkit` plus 2,335 spell constructs. Evidence is recorded in `docs/analysis/item-macguffin-declaration-evidence-2026-07-28.md`.

## Item toolkit declaration slice completed

All eight canonical toolkit leaves now preserve ordered loss-aware crafting tags, slot counts, sound cues, safe presentation references, layout rectangles, controls, and close positions. Matching tags link toolkit items bidirectionally with all 374 recipes and 57 encrustments, while detailed cue IDs, raw references, and old game-interface coordinates remain hidden and do not control the modern UI. Strict importer and web schemas diagnose malformed or extended shapes. This removes the final eight item compatibility diagnostics and leaves 2,335 spell constructs. Evidence is recorded in `docs/analysis/item-toolkit-declaration-evidence-2026-07-28.md`.

Spell buff descriptions, buff halos, and spell/buff AI hints are now strict ordered metadata families. Spell effect-list options subsequently preserve all 276 measured declarations under 45 typed list effects: 192 item options and 84 spell options. All spell options and 189 item declarations resolve; three item declarations remain visibly dangling. Reciprocal spell/item links are exposed without inferring selection or runtime behavior. This removes the 45 former nested `<option>` diagnostics and leaves 2,158 spell compatibility constructs, 13 separately tracked spell requirements, and 23 dangling references. Evidence is recorded in `docs/analysis/spell-effect-list-option-evidence-2026-07-28.md`.

Direct spell-effect controls now preserve 795 active chance, caster/self/corpse, resistance, burn, and taxonomy values across 711 effects and 403 spells. Both measured chance and caster aliases normalize loss-aware; explicit false and 100-percent values are retained, malformed or simultaneous aliases remain diagnosed, and the UI does not combine the fields into targeting, resistance, ignition, or runtime probability behavior. This removes 799 source-candidate effect-attribute diagnostics and leaves 1,359 spell compatibility constructs, 13 separately tracked spell requirements, and 23 dangling references. Evidence is recorded in `docs/analysis/spell-effect-control-evidence-2026-07-28.md`.

Direct trigger/damage-over-time buff conditions now preserve 16 active source-buff requirements, 49 required named-buff pairs, and eight forbidden named-buff pairs across 73 effects and 38 spells. Both measured source-buff casing aliases normalize loss-aware; all 57 named targets resolve with reciprocal backlinks, while malformed pairs and unsupported effect types remain diagnosed. This removes 130 former direct-effect attribute diagnostics and leaves 1,229 spell compatibility constructs, 13 separately tracked spell requirements, and 23 dangling references without inferring buff-presence evaluation, trigger eligibility, duration, consumption, or timing. Evidence is recorded in `docs/analysis/spell-effect-buff-condition-evidence-2026-07-28.md`.

Direct spell-effect damage/scaling metadata now preserves 605 active damage declarations across 433 effects: 586 base amounts, 294 factor coefficients, and 19 factor-only declarations. It also preserves 15 amount factors, two floor factors, 23 primary source IDs, and 67 secondary source IDs across 106 effects. Strict type-specific normalization supports both measured primary-selector casing forms, preserves malformed declarations loss-aware, and does not combine the fields with undeclared defaults or infer final damage, healing, mana, spawn, resistance, armour, or rounding formulas. This removes 990 former effect-attribute diagnostics and leaves 239 spell compatibility constructs, 13 separately tracked spell requirements, and 23 dangling references. The full workspace passes 123 unit/artifact tests, all 34 desktop/mobile browser cases, byte-identical synthetic and official generation, the 43-page synthetic export, and the 2,857-page official local export. Evidence is recorded in `docs/analysis/spell-effect-damage-scaling-evidence-2026-07-28.md`.

Direct spell-effect duration metadata now preserves all 69 active `turns`
declarations across 69 effects and 68 spells. Strict loss-aware normalization
and the web artifact guard accept non-negative integers and reject malformed
values; the page discloses source turn counts without inferring countdown,
stacking, refresh, removal, or scheduling behavior. This removes 69 former
effect-attribute diagnostics and leaves 170 spell compatibility constructs, 13
separately tracked spell requirements, and 23 dangling references. The full
workspace passes 143 unit/artifact tests, all 34 desktop/mobile browser cases,
byte-identical synthetic and official generation, the 43-page synthetic
export, and the 2,857-page official local export. Evidence is recorded in
`docs/analysis/spell-effect-duration-evidence-2026-07-29.md`.

Direct spell-effect `after` metadata now preserves all 16 active declarations
as loss-aware booleans. Explicit false remains distinct from absence, and the
spell page discloses the direct flag without inferring evaluation order, delay,
scheduling, or trigger timing. This removes all 16 former `after` diagnostics
and leaves 154 spell compatibility constructs, 13 separately tracked spell
requirements, and 23 dangling references. Evidence is recorded in
`docs/analysis/spell-effect-after-flag-evidence-2026-07-29.md`.

Direct spell-effect `bleed` metadata now preserves all 12 active declarations
as loss-aware booleans on damage effects. The page uses the preserved
application's "Starts bleeding" wording for the direct flag and the nine
standalone bleed effects without inferring damage, duration, stacking,
resistance, target selection, or other runtime behavior. This removes all 12
former `bleed` diagnostics and leaves 142 spell compatibility constructs, 13
separately tracked spell requirements, and 23 dangling references. Evidence is
recorded in `docs/analysis/spell-effect-bleed-evidence-2026-07-29.md`.

Direct spell-effect skip-animation metadata now preserves all five active
lowercase declarations and accepts the installed validation schema's
camel-cased alias. The page discloses the loss-aware source flag without
inferring animation order, timing, synchronization, target selection, or which
presentation sequence the engine suppresses. This removes all five former
`skipanimation` diagnostics and leaves 137 spell compatibility constructs, 13
separately tracked spell requirements, and 23 dangling references. Evidence is
recorded in
`docs/analysis/spell-effect-skip-animation-evidence-2026-07-29.md`.
The full workspace passes 153 unit/artifact tests, all 36 desktop/mobile browser
cases, byte-identical synthetic and official generation, the 43-page synthetic
export, and the 2,857-page official local export.

Direct spell-effect presentation now preserves all 33 active `sprite`,
`frames`, `framerate`, `centerEffect`, and `sfx` attributes across 15 effects.
Safe sprite/reference coverage and direct frame/center values are visible
without exposing raw sprite or sound identifiers or assigning timing,
placement, playback, synchronization, or other runtime semantics. This removes
all 33 former direct-effect presentation diagnostics and leaves 104 spell
compatibility constructs, 13 separately tracked spell requirements, and 23
dangling references. Evidence is recorded in
`docs/analysis/spell-effect-presentation-evidence-2026-07-29.md`. The full
workspace passes 155 unit/artifact tests, all 36 desktop/mobile browser cases,
byte-identical synthetic and official generation, the 43-page synthetic
export, and the 2,857-page official local export.

The review-hardening checkpoints give generated search documents a total `(kind, name, id)` order; cover equal-precedence source resolution, missing monster parents, three-level inheritance, and genuinely negative derived primary totals; replace all 94 domain/pipeline locale-collation calls with one fixed UTF-16 code-unit comparator; complete the remaining diagnostic, source-resolution, and instability-effect tiebreakers; validate normalized asset paths before root probing, including the future empty-root caller edge; make path rejection host-independent for POSIX absolute, Windows absolute/drive-relative, and traversal forms; enforce safe route/asset-reference shapes plus unique same-kind canonical/alias ownership at the web boundary; and document the trusted source-manifest root exception with a paired containment regression. Locale-aware ordering remains only in web presentation. `pnpm.cmd check` passes all 142 unit/artifact tests and the 43-page synthetic export; the byte-identical ignored canonical dataset passes deterministic generation with 763 items, 2,767 search documents, 0 errors, 275 warnings, and 71 informational decisions. Route-registry lifecycle policy is the review's only remaining medium finding. Evidence is recorded in `docs/analysis/icu-independent-output-ordering-evidence-2026-07-28.md`, `docs/analysis/comparator-totality-evidence-2026-07-29.md`, `docs/analysis/asset-path-validation-evidence-2026-07-29.md`, `docs/analysis/web-route-artifact-boundary-evidence-2026-07-29.md`, `docs/analysis/asset-reference-artifact-boundary-evidence-2026-07-29.md`, and `docs/analysis/source-root-trust-boundary-evidence-2026-07-29.md`.

The source-manifest trust assumption is explicit: a trusted local manifest may
name an absolute external read-only game-installation root, while each declared
database path remains real-path-contained beneath it and generated output
sanitizes the machine-local root.

All nine entity alias routes now keep the detail-header `<h1>` before the
alias-note `<h2>` in document order. The canonical-link notice and `noindex`
metadata remain unchanged, and the alias browser flow guards the heading
sequence.

All source-token title casing in item, recipe, encrustment, skill, spell,
monster, and stat-modifier presentation now uses one focused, tested web
helper. Repeated separators and surrounding whitespace no longer produce
route-specific label differences. The full workspace and all 34
desktop/mobile browser cases pass.

## Spell relationship slice completed

Static spell details now expose loss-aware mana-cost source formulas, ordered animation and impact source metadata, ordered buff declarations with lifecycle/stacking parameters, signed direct and sight-radius modifiers, buff-local invisibility, casting-prevention, and named polymorph declarations, target/player hit event hooks, direct effects, resolved or dangling spell/stat targets, provenance, diagnostics, and deterministic backlinks from spells, buff hooks, items, abilities, monsters, and the shared instability pool. Mana declarations preserve base cost, both measured Savvy-coefficient casing variants, and optional minimum cost; non-mana requirement shapes stay explicitly diagnosed, and final runtime rounding is not inferred. Animation and impact declarations remain separate while preserving safe sprite prefixes, optional frame parameters, centering/synchronization flags, and symbolic sound cues without assigning timing units or rendering detailed references. Buff declarations preserve measured attribute/element casing aliases, presentation paths, exact additional source flags, numeric primary/secondary IDs, signed sight-radius declarations, conditional hook percentages, ordered invisibility and casting-prevention amounts, and paired polymorph monster targets without inferring stacking, visibility strength, detection, affected actors or spell categories, amount meaning, immunity, resistance, breaking, darkness, transformation duration, stat or ability replacement, equipment behavior, targeting, faction, reversibility, removal, timing, trigger, currency, AI, or combat formulas. Other unsupported nested buff mechanics remain diagnosed. The pure domain traversal records every direct-effect edge, expands each resolved spell once, and marks cycles or repeated branches where recursion stops; conditional buff hooks and polymorph links remain separate relationships with reciprocal backlinks. Synthetic desktop/mobile and axe coverage includes animation/impact metadata plus hidden-reference assertions, a mana formula, complete buff parameters and modifiers, invisibility, casting-prevention, and polymorph declarations, a signed sight modifier, resolved and dangling buff hooks, explicit empty states, an unsupported non-mana requirement, a deliberate two-spell cycle, and a dangling direct-effect target. The ignored official dataset builds 951 spell routes; all 807 official direct spell-reference edges, all 61 buff event hooks, and all four named polymorph targets resolve, and the measured maximum shortest-path depth is 7.

Read-only canonical item measurement found 1,584 fixed modifiers across 506 active items: 480 damage, 255 resistance, 122 primary, and 727 secondary. Spell measurement found 104 active spells with one mana declaration each. All 104 have valid base costs from 1 through 60, 98 include Savvy coefficients from 0.09 through 0.7, and 77 include minimum costs from 1 through 15. It found 661 active spells with one animation declaration each: every declaration has a safe sprite prefix, 656 supply frame counts from 0 through 18, 612 supply source frame rates from 5 through 250, 30 supply first-frame values from 0 through 2, and 594 supply symbolic sound cues. It also found 70 active spells with one impact declaration each: all have safe sprite prefixes, frame counts from 3 through 10, and source frame-rate values from 50 through 180; one supplies first-frame 0 and 65 supply symbolic sound cues. It found 266 active spells with one buff declaration each and 795 normalized direct buff modifiers: 38 damage, 189 resistance, 215 primary, and 353 secondary. Eighteen spells contain one valid signed sight-radius modifier each, spanning -3 through +3. Forty-two spells contain 61 buff event hooks: 43 target-hit and 18 player-hit declarations, all with valid 2–100 percentages and resolved spell targets; one preserves an additional `after` source flag. Thirteen non-mana requirement declarations remain explicit diagnostics, as do two unrelated `level` attributes. The deterministic import completes with no errors, 3,278 warnings, and 71 informational duplicate decisions; the compatibility subset is 911 item plus 2,333 spell diagnostics, with the 15 requirement diagnostics and 19 dangling references tracked separately. Detailed evidence is recorded in `docs/analysis/item-stat-modifier-evidence-2026-07-22.md`, `docs/analysis/spell-mana-cost-evidence-2026-07-22.md`, `docs/analysis/spell-animation-evidence-2026-07-22.md`, `docs/analysis/spell-impact-evidence-2026-07-22.md`, `docs/analysis/spell-buff-evidence-2026-07-22.md`, `docs/analysis/spell-buff-event-hook-evidence-2026-07-22.md`, `docs/analysis/spell-buff-sight-evidence-2026-07-22.md`, and `docs/analysis/general-project-review-hardening-2026-07-22.md`.

## Skill and ability parity slice completed

Static skill and ability details now expose archetype, complete named/generic starting loadouts, always/optional quantities, ordered progression, signed damage/resistance/primary/secondary modifiers, source flags, progression tags, recovery/currency source values, supported spell-trigger events, provenance, and diagnostics. Resolved items and spells link both ways; dangling names stay visible without fabricated routes. Synthetic desktop/mobile and axe coverage follows item→skill→ability→spell navigation and includes generic/dangling loadouts, signed modifier values, numeric stat-ID disclosure, neutral source-metadata disclosure, a dodge hook, and a dangling ability spell. The ignored official dataset contains 52 skills, 352 linked abilities, 76 loadout definitions, 264 fully resolved ability triggers, and 473 direct modifiers across 217 abilities. It also preserves 11 flag values, 4 progression tags, 10 recovery amounts, and 1 currency percent; no measured skill/ability child elements remain unsupported. Sixteen named loadouts remain genuinely unresolved.

## Monster profile, movement, presentation, spell-hook, and drop slices completed

Feature review status: the monster-drop/item-backlink and initial aggressiveness/span/invisible AI source-metadata slices passed separate feature code review on 2026-07-21. The sight, movement, presentation, and primary-attribute formula slices passed separate feature code review on 2026-07-22. The reviews made named and type-driven drops an exclusive domain union enforced by the web artifact guard, added adversarial malformed-shape coverage, established the loss-aware flag pattern used by every measured boolean AI and movement attribute, changed invalid boolean tokens from silent disabled values to diagnosed unavailable values, rejected unexpected nested leaf content, kept raw engine references out of the browser, and made duplicate local monster bonuses diagnose and resolve with the preserved last-declaration-wins rule before inheritance and calculation.

Static monster details now expose taxonomy, dungeon-depth/special classification, fighter/rogue/wizard source levels, experience, palette metadata, effective inherited stat bonuses and AI casting chance, the six verified primary attributes, local loss-aware aggressiveness/span/invisible/chicken/charm/paralyze/steal, sight cone/modifier, dig/dash/charge source metadata, and safe sound/sprite coverage summaries, resolved or dangling on-hit/cast/on-death/dash/charge spell hooks, direct named/type-driven drops, parent/direct-variant navigation, provenance, and diagnostics. Primary values come from a pure domain coefficient table and add effective inherited primary bonuses. Exact one-in odds are retained alongside a rounded display percentage; resolved spells and named items link both ways. Drops, AI/sight/movement/presentation metadata, and hook declarations remain local to the declaring monster, and type-driven drops do not fabricate items. Detailed engine references are retained in local generated artifacts but not rendered while asset publication remains unresolved. Life, Mana, secondary combat totals, and complete AI/movement formulas remain explicitly unavailable because the researched sources conflict. Synthetic desktop/mobile, keyboard, and axe coverage follows a child to its parent, spell, and drop item, verifies reciprocal backlinks and inherited/overridden fields, exercises a generic artifact drop, displays a primary total with a source bonus plus enabled, disabled, numeric, invalid-fallback, and absent AI/sight/movement/presentation values without claiming behavior formulas, and exposes dangling spell/item names without fabricating routes. Focused importer tests cover absent/disabled/enabled AI states, both measured percentage casing variants, supplied/absent/invalid sight and movement values, boolean movement flags, resolved/dangling behavior spells, all measured sound/sprite shapes, local presentation non-inheritance, and unknown-attribute diagnostics. Formula evidence and exclusions are recorded in `docs/analysis/monster-derived-stat-evidence-2026-07-22.md`.

The ignored official dataset contains 183 monsters: 132 inherit, 23 are special, all 183 resolve a dungeon depth, 177 supply experience, and 131 supply palette metadata. Inheritance produces 1,331 effective modifiers (458 damage, 486 resistance, 12 primary, and 375 secondary). AI metadata contains 108 aggressiveness/span pairs; invisible has 5 enabled/1 disabled values, chicken has 17 enabled/10 disabled values, charm and paralyze have 4 and 3 explicit disabled values, steal-gold has 1 enabled value, and steal percentage has 2 values (20 and 50). All measured official AI attributes are normalized. Sight metadata is present on 55 monsters with no diagnostics: cones are 90 (28), 270 (23), or 360 (4), and modifiers span 0.65 through 3.2. Movement metadata is present as 6 dig, 4 dash, and 2 charge declarations. All 4 dash records enable interruptible; both charge records enable interruptible/blocks-action and disable targets-self. The 11 associated on-death/dash/charge spell hooks all resolve. The earlier 274 hooks remain (223 aware-casting and 51 on-hit); 271 resolve and three remain explicit dangling references, with at most 16 hooks on one monster. Fifty-six direct drops normalize across 15 monsters: all 49 named items resolve, and six `artifact` plus one `zorkmids` type-driven drops remain explicit, with at most 12 drops on one monster. Presentation metadata contains 60 sound declarations with 242 symbolic cue IDs plus 54 attack, 52 hit, 52 death, 27 cast, 2 beam, 1 morph, and 1 dig animation declarations with 519 validated sprite references. No measured official monster child element remains unsupported; the only monster diagnostics are the three genuine dangling spell references. All 183 routes export within 2,824 static pages.

The verified primary calculation covers all 183 ignored official monsters. Eight have 12 effective primary modifiers; totals span 0–154 Burliness, 0–190 Sagacity, 0–140 Nimbleness, 0–173 Caddishness, 0–223 Stubbornness, and 0–209 Savvy. These are aggregate read-only measurements, not permission to publish the artifact.

## Targeting template slice completed

Static template routes now render the ordered `.`/`@`/`#` targeting grid with a visible legend, a concise assistive label, anchor inclusion, dimensions, provenance, canonical/alias routing, and an explicit empty-pattern state. Templates are included in the structured search route and can be selected by entity type. The current web artifact guard rejects malformed template rows before static generation. Synthetic desktop/mobile browser coverage follows the keyboard path from filtered search to the template page and includes the route in axe scans. Read-only aggregate inspection found 35 templates in the ignored canonical artifact, all using only the verified three-character alphabet; no official names or row data are recorded here.

## Static all-entity discovery completed

The server-rendered `/browse/` directory exposes all nine entity kinds and links to 100-record static catalogue pages. Primary navigation, detail breadcrumbs, home item discovery, and the dataset-neutral 404 now lead into this surface. Desktop and mobile Playwright coverage disables JavaScript, keyboard-navigates through a kind catalogue into a detail route, checks responsive overflow, and includes browse pages in the representative axe sweep. The ignored canonical artifact's 2,767 records produce 32 bounded kind pages plus the directory, bringing the complete local export to 2,857 pages without publishing any generated official content. Detailed evidence is in `docs/analysis/static-browse-evidence-2026-07-27.md`.

## Open decisions and blockers

- Permission evidence for publishing normalized official data and art beyond the accepted local-only boundary.
- Exact modern-project MIT copyright-holder wording and provenance/license treatment for excluded inherited code, historical mods, and assets.
- The crafting and separately modeled encrustment dependency/shopping-list
  tools plus the shared recipe/encrustment source-skill filter, reusable URL
  views, and up-to-three-item comparison are implemented. Active work returns
  to direct, image-led parity catalogues. The completed Items slice has its
  owner-reviewed display polish, and the Craft and Encrust catalogue
  foundations now group all canonical records by familiar tool. Accessible
  item-relationship recipe previews and exact wand-charge summaries are
  complete; image-led Skills and Abilities are next. A bounded build-planning model is
  postponed. Extra
  technical-detail presentation remains a page-specific polish decision.
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
