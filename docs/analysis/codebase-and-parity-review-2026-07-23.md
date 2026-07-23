# Codebase and parity review

Date: 2026-07-23

## Scope

This record captures a repository-wide review of the modern workspace (`apps/web`, `packages/domain`, `packages/data-pipeline`) and a legacy-to-rebuild parity audit, performed at commit `246a599` (`Add item trap metadata`). It is a findings record only: no source was changed, no publication of official-derived data or art is approved, and no disputed formula is settled here. The review covered five dimensions — pipeline determinism, untrusted-input security, domain correctness, the web application, and legacy parity — plus direct reading of the security- and determinism-critical core (`safe-path.ts`, `serialization.ts`, `output.ts`, `xml-adapter.ts`, `apps/web/src/lib/artifact.ts`, `identity.ts`, `resolution.ts`, `monster-derived-stats.ts`). No builds were run; all findings are static.

## Verdict

The codebase is disciplined. No critical or high-severity defect was found. The strongest findings are two mediums (route-slug stability under dataset change; ICU-dependent output ordering). The remainder are low-severity hardening items or product-scope parity gaps, several of which are correctly blocked on unresolved owner decisions rather than on engineering. The determinism strategy, the XML security posture, and the web trust boundary are well engineered and should be preserved.

## Priority findings

### 1. Canonical slug ownership is not stable under entity insertion or deletion — MEDIUM, confirmed

`packages/domain/src/identity.ts:137-148`. Within a slug-collision group the owner of the un-suffixed base slug is the collation-first entity (`compareEntities`: canonicalKey, then id). The collision *suffixes* are stable — `stableSlugSuffix` (`identity.ts:73-80`) is FNV-1a over each entity's own `id`, so a hashed slug is a pure function of that entity — but *ownership of the clean slug* is decided by group membership. Two entities can share a base slug while differing in `canonicalKey` (they differ only in characters that `slugify` strips but `canonicalKey` keeps, e.g. punctuation), so adding or removing a group member can move ownership.

Concrete scenario: an item `"Foo!"` (`canonicalKey "foo!"`, slug `foo`) initially owns `/items/foo`. A later source adds `"Foo"` (`canonicalKey "foo"`, slug `foo`). Because `"foo" < "foo!"`, `"Foo"` takes `/items/foo` and `"Foo!"` is displaced to `/items/foo-<hash>`. A previously published URL changed. Deletion is symmetric (removing the owner promotes the next member from a hashed slug to the bare slug).

Mitigation exists but is weak. The route registry pins owners via reservations (`packages/data-pipeline/src/route-registry.ts`), but it is optional and, in `resolveRouteRegistry` (`route-registry.ts:168-188`), **all** reservations are dropped with a `route_registry_scope_mismatch` issue when `datasetId`/`datasetVersion` do not match. A dataset-version bump without a regenerated registry therefore returns every route to collation-order allocation and can churn published URLs. This bears directly on product principle #5 ("Stable and shareable" URLs).

Coverage: the hazard is untested. `identity.test.ts` covers order-independence for a fixed set and the reservation-pinning path, but no test adds or removes a colliding entity and asserts that pre-existing slugs are unchanged.

### 2. Output ordering depends on ICU-version collation, and `--check` cannot detect divergence — MEDIUM, plausible cross-platform

Output-critical ordering uses `localeCompare(value, "en")` in roughly fifty sites (`serialization.ts:12`, `resolution.ts:69-79`, `identity.ts:87-88`, `search.ts:117-118`, and the relationship/patch comparators). Passing an explicit `"en"` locale is a real safeguard against host-locale drift, but `localeCompare` collation is defined by the ICU/CLDR version bundled with Node, not by the locale tag. Official same-version Node binaries collate identically across Windows and Linux, so same-version CI is safe; divergence is plausible when a distro `system-icu` Node build runs in CI or a Node major bump changes CLDR. Any such change can reorder data-derived strings (entity names, `sourceKey`s, slugs, alias arrays) and change artifact bytes.

The determinism guard cannot catch this. `--check` in `packages/data-pipeline/src/cli.ts:26-42` imports twice **in one process** and compares the in-memory serialized strings, so it shares one V8 build and one bundled ICU. It does re-read every input from disk, so it exercises torn-file and stale-content issues, but it is structurally blind to cross-process and cross-platform ordering differences.

Suggested direction: use code-unit comparison (`a < b ? -1 : a > b ? 1 : 0`) for output-critical key ordering, which is ICU-independent, and/or re-exec the CLI in a fresh process for `--check` while pinning or asserting the ICU version in CI.

### 3. `createSearchDocuments` omits the `id` tiebreaker used everywhere else — LOW to MEDIUM, trivial fix

`packages/domain/src/search.ts:115-119` sorts by `(kind, name)` only. Its sibling `querySearchDocuments` and every comparator in `identity.ts`, `resolution.ts`, and the relationship modules end on `|| left.id.localeCompare(right.id, "en")`. It is safe today because distinct active entities of one kind have distinct names (same name → same `canonicalKey` → deduped) and `Array.sort` is stable, and the web boundary re-derives and deep-compares this exact array (`apps/web/src/lib/artifact.ts:777-789`). But this array is serialized into `search.json`, it is the one place that deviates from the codebase's "always end on `id`" discipline, and a future change to pre-sort order would silently make it order-sensitive. Append the `id` tiebreaker and add a regression test. Flagged independently by the determinism and domain reviews.

### 4. Minor non-total comparators rely on stable-sort push order — LOW

`finalizeDiagnostics` (`packages/data-pipeline/src/import-dataset.ts:73-107`) orders by file/line/column/code/entityId/message but not `severity` or `details`; `resolveEntityCandidates` (`resolution.ts:67-80`) and the instability-effect sort (`import-dataset.ts:221-231`) stop at `line` and omit `column`. Ties fall to deterministic push order, so output is stable today, but the ordering is not self-contained. Adding the already-available fields (`details`, `column`) to the comparators removes the reliance on traversal order.

## Untrusted-input security

No exploitable defect found. Defenses actively tried and confirmed sound:

- XXE and entity expansion are closed twice over: `packages/data-pipeline/src/xml-adapter.ts:26-35` sets `processEntities: false`, and `parseXml` (`xml-adapter.ts:157`) hard-rejects any `<!DOCTYPE` before validation and parsing. Parse errors carry `sourceId`/`file`/`line`/`column`.
- Path traversal is defended on both POSIX and Windows in `packages/data-pipeline/src/safe-path.ts`: `assertSafeRelativePath` normalizes separators before rejecting `..`, absolute, and empty paths; `resolveWithin` re-checks containment after `path.resolve` (catching Windows drive-relative `C:foo`); `resolveExistingWithin` realpaths and re-checks to defeat symlink escapes. All manifest, patch, route-registry, and asset references flow through this.
- The web app renders untrusted source strings only as React text children (auto-escaped). There is no `dangerouslySetInnerHTML`/`innerHTML` anywhere in `apps/web/src`. Asset paths (`iconPath`, `originPath`, `spritePath`) appear only as escaped metadata text, never as `src`/`href`. Slugs are `[a-z0-9-]`, so no `javascript:` URL is expressible. No catastrophic-backtracking regex over untrusted input.
- Output writes are atomic with exclusive-create temp names, refuse to overlap any source root in either direction, and are read back and compared after writing (`output.ts:26-36`, `:97-107`, `:121-130`).

Hardening opportunities (none currently exploitable):

- The Zod boundary types `slug`, `slugAliases`, `url`, and `iconPath` as bare `z.string()`. A charset regex (`/^[a-z0-9-]+$/` on slugs, a `/^\/[a-z]+\/[a-z0-9-]+$/` shape on `url`) would make the boundary self-defending instead of relying on upstream invariants.
- `normalizeAssetPath` (`packages/data-pipeline/src/normalizers.ts:919-968`) performs its `..`/absolute rejection only inside the `for (const assetRoot of context.assetRoots)` loop; an empty `assetRoots` would skip validation and return the path unvalidated. Not reachable today (the caller always supplies at least one root, and the result is rendered as text), but `normalizeAssetReference` validates unconditionally and this should match it.
- An absolute `source.root` (`manifest.ts`) is accepted without a containment check, by design, to allow external game-install directories. This is safe only because the manifest is trusted operator configuration; a one-line comment noting the manifest as a trust anchor would document the assumption.

## Web application

Static export is airtight: all nine dynamic routes declare `dynamicParams = false` with a complete `generateStaticParams` emitting canonical and alias slugs; there is no `middleware.ts`, `route.ts`, or server-only runtime API; `output: "export"` and `trailingSlash` are set. The artifact loader is exemplary (SHA-256 and byte-length verification against the manifest, search re-derivation via `isDeepStrictEqual`, diagnostic count and referential-integrity checks, strict Zod). Alias pages render canonical content with `robots: noindex` and a visible canonical link. Empty, dangling, and error states are explicit and not color-only.

Findings:

- Search input is URL-controlled with no debounce and no local buffer — MEDIUM. In `apps/web/src/components/search-explorer.tsx` the input is `value={query}` where `query` derives from `searchParams`, and each keystroke calls `router.replace` inside a transition. Fast typing can transiently reset the field when an in-flight transition commits with a stale value (dropped/reordered characters, cursor jump). The e2e uses one-shot `fill()`, so per-keystroke behavior is unverified. Prefer a local `useState` mirror plus `useDeferredValue`/debounce for the URL write.
- `/search` is a JS-only island with no progressive-enhancement fallback — MEDIUM (design). The exported `/search/index.html` contains only the Suspense fallback, so without JavaScript the page is a dead end, deep-linked filters are not reflected in static HTML, and there is a brief post-hydration content shift. The home page and all detail pages are fully static and work without JS.
- The "no horizontal overflow at 390px" claim is inaccurate and thinly checked — LOW (claims accuracy). The mobile Playwright project is the Pixel 7 profile (~412px CSS width, `playwright.config.ts:21`), not 390px, and the `scrollWidth <= clientWidth` assertion appears on only three routes; the nineteen-route axe loop does not check overflow. The underlying responsive CSS (`min()`, `clamp()`, `minmax(0,…)`, `overflow-x:auto`, `min-w-0` on the select trigger) is sound, so this is a coverage/wording gap, not a proven overflow.
- On alias detail pages an `<h2>` precedes the page `<h1>` in DOM order — LOW. Axe's `heading-order` does not flag a decrease, so the sweep passes; a heading-navigation user reaches the alias note before the document title.
- The first breadcrumb crumb and the header nav are always labeled "Items" and link to home, even on spell/monster/other pages — LOW (misleading label).
- No `error.tsx`/`global-error.tsx` boundary — LOW. An uncaught client error in an island would blank the region with no fallback; risk is low given how little client JS ships.
- `loadArtifact` asserts unique entity and search-document IDs but not unique slugs — LOW. Currently safe because tampering is caught by checksum and `allocateEntityRoutes` guarantees uniqueness, but there is no independent slug-uniqueness guard at the web boundary.
- `titleCase` is duplicated across roughly five route files with subtle divergence (the monster copy filters empty segments; others do not) — LOW, cosmetic.

## Domain correctness

Verified sound and, where noted, well tested:

- Monster inheritance (`inheritance.ts`) resolves multi-level chains, detects cycles via a visiting-stack DFS (each cycle member reported once, falls back to local-only), and handles missing parents without crashing.
- The monster primary-attribute coefficient table and arithmetic (`monster-derived-stats.ts`) are integer-clean; the per-attribute modifier is last-declaration-wins, consistent with the documented rule.
- The "exact one-in odds → rounded percentage" conversion lives in the pipeline, `normalizers.ts:3056` (`Math.round(100 / oneChanceIn)`), and is guarded against divide-by-zero because `oneChanceIn` parses with a minimum of 1.
- Relationship derivations match on resolved ids, correctly exclude dangling references from backlinks (dangling refs are diagnosed upstream, not silently dropped), and surface dangling targets as visible steps in spell traversal. Spell direct-effect traversal expands each spell once and marks cycles.
- No `as any` and no runtime non-null assertions in the domain layer; `noUncheckedIndexedAccess` is respected; the three casts in `patches.ts` are guarded by runtime validators; no function mutates its inputs (copy-before-sort throughout).

Test coverage is thin on four edges, in priority order: route-slug stability under insertion/deletion (finding 1, entirely untested); the missing-parent inheritance path; equal-precedence resolution ties (`resolution.test.ts` uses only distinct precedences); and three-level transitive inheritance plus negative attribute totals (behavior appears correct but is unexercised).

## Legacy parity

The rebuild is deeper per record than legacy — richer normalized fields, provenance, diagnostics, two-way backlinks, and deterministic slugs/aliases in place of legacy's ephemeral per-load `genId()` hashes — but shallower in reach. Every detail page it covers meets or exceeds legacy; the debt is in discovery surface, within-record effect fidelity, and whole auxiliary sections.

Highest-impact gaps, ranked:

1. No browse/index surface for spells, monsters, skills, abilities, recipes, or encrustments. Only Items is browsable; the others are reachable only via cross-links or a typed slug. The search artifact already contains every kind, but the UI filters to items/stats/templates via a hardcoded allow-list at `apps/web/src/app/search/page.tsx:49-54` and `kindOptions` at `apps/web/src/components/search-explorer.tsx:34-39`. Widening that list (and/or adding per-kind index routes and nav) is the cheapest high-impact parity move and needs no new data work.
2. Spell effect fidelity. Effects render as a generic `type` plus amount, and the documented compatibility backlog (per the 2026-07-23 handoff: 609 item plus 2,333 spell constructs) is dominated by spell effects. This is the largest content gap.
3. The Meta/analytics section is entirely absent. It was low-fidelity in legacy and its one table depends on disputed monster formulas the rebuild deliberately withholds.
4. Game art is not rendered; pages show "reference supplied/not supplied" text. Blocked on the asset-publication decision.
5. Search breadth and by-stat coverage regress against legacy (which searched items/skills/spells by name and ranked items/abilities/spells by stat magnitude).
6. Templates are effectively orphan pages: `SpellEffect` carries no template key, so the legacy spell→AOE-grid relationship is not modeled.
7. Stat definitions render "unavailable" because the canonical build has no `statDB.xml`; needs an approved source (see traps below).

Legacy behaviors that are traps and should not be replicated: the Flash/Downloadify `itemDB.xml` export (`legacy/js/tool.js`); ephemeral `genId()` hash routing plus cookie-and-reload state; the Meta analytic's monster melee/armour formulas (the disputed formulas the handoff withholds); the hardcoded proprietary stat descriptions in `legacy/js/dredmor-stat.js`; and CamanJS runtime sprite tinting plus filesystem path-guessing image recovery.

## Housekeeping

- No `LICENSE` file exists at the repository root or under `legacy/`. This matches the still-open license/provenance decision and remains a publication blocker.
- Stale documentation: `docs/analysis/repository-audit-2026-07-19.md:58` states the skills importer "still has a `TODO` for a formal link pass." That is outdated; `linkSkills` in `import-dataset.ts` performs the link pass via the domain skill-ability relationships, and no such TODO exists in the code.

## Recommended actions

Independent of the blocked owner decisions and safe to implement as small vertical slices (change plus test plus doc note):

1. Append the `id` tiebreaker to `createSearchDocuments` and add a regression test (finding 3).
2. Add a slug-stability test that inserts and removes a colliding entity and asserts pre-existing slugs are unchanged, then decide whether the route registry should be mandatory and whether a `datasetVersion` mismatch should void reservations silently (finding 1).
3. Widen the search kind allow-list to expose all entity kinds, and consider per-kind index routes plus nav (parity gap 1).
4. Optional hardening: code-unit comparison for output-critical ordering (finding 2), Zod charset regexes at the web boundary, and completing the non-total comparators (finding 4).

Blocked on owner decisions (restated for continuity, tracked in `docs/handoff/new-pc-and-codex.md` and `PROJECT.md`): publication rights for normalized official data and art; the inherited-code/mod/asset license policy; an approved source for stat definitions absent from the canonical build; and the treatment of disputed monster Life/Mana/secondary/damage formulas. Do not resolve these by assumption.
