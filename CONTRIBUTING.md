# Contributing to Dredmorpedia

The repository is currently in the foundation phase of a clean rebuild. The intact legacy site lives under `legacy/` as the reference implementation; new architecture must not be introduced inside it.

## Start here

Read `PROJECT.md`, `AGENTS.md`, `docs/README.md`, and any decision record relevant to your change. Check `docs/roadmap.md` before creating a new workstream. Read `docs/data-and-assets-policy.md` before accessing game files or adding data/assets.

## Workspace setup and checks

Use Node.js 24 LTS; the exact development version is pinned in `.node-version`. The repository pins pnpm through `packageManager` and commits its lockfile.

```powershell
corepack enable
corepack prepare pnpm@11.15.0 --activate
pnpm install --frozen-lockfile
pnpm audit:dependencies
pnpm generate:check
pnpm check
```

`pnpm audit:dependencies` checks the production dependency graph against the
current registry advisory database and fails on high-severity findings. It
requires registry access and also runs in the scheduled dependency-audit
workflow; ordinary pull-request CI remains deterministic when the advisory
service is temporarily unavailable. Narrow root overrides keep Next.js
transitive dependencies on patched releases when its declared ranges cannot
select them; remove an override once an upgraded direct dependency does so.

`pnpm check` runs formatting, linting, strict type checks, unit/integration tests, deterministic artifact generation, and the production static build. Browser checks are separate because they require a downloaded test browser:

```powershell
pnpm --filter @dredmorpedia/web exec playwright install chromium
pnpm test:e2e
```

`pnpm test:e2e` first builds the production static export, then serves it on isolated port 3100. It can run while `pnpm dev` is already using port 3001.

Start synthetic local development with `pnpm dev` (an alias for `pnpm dev:synthetic`), then open `http://localhost:3001/`. It regenerates the legal synthetic spike artifact and its ignored presented-asset set before starting the Next.js application on port 3001. The tracked SVG icon is intentionally unsupported by the initial PNG-only importer, so synthetic item pages exercise the graceful icon fallback.

When the ignored `data/raw/local-official-manifest.json` has been configured for the approved read-only installation, use the equivalent official-data commands:

```powershell
pnpm migrate:official-manifest
pnpm dev:official
pnpm generate:official:check
pnpm build:official
pnpm benchmark:search:official
```

`pnpm migrate:official-manifest` is an idempotent compatibility command for the
canonical ignored manifest. It preserves all four ignored game source roots and
file declarations, adds reviewed dataset/source version metadata when migrating
schema 1, and adds the tracked versioned Dredmorpedia stat reference to schema 1
or earlier schema-2 configurations. Official generate/dev/build commands run it
automatically. It refuses unexpected game scope or conflicting schema-2
metadata. New manifests should be created directly as schema 2.

`pnpm dev:official` regenerates `data/generated/official-local/` plus the matching item-icon set under `apps/web/public/generated-assets/current/` before starting, so it does not silently serve stale or mismatched local output. The importer copies only supported PNG icons referenced by normalized items, from the exact first-registration byte snapshots; it content-addresses and checksums the copies, records fallback diagnostics, atomically replaces its managed directory, and never writes to the installation. The deterministic generate/check command performs the same import twice without starting the app, while the build command additionally verifies the full static export. All three official commands enable the dataset pipeline's `--fail-on-errors` gate: an import with any error diagnostic exits unsuccessfully before replacing the last published dataset output set. Synthetic commands do not enable the gate because their legal fixture deliberately exercises one invalid XML input. Official inputs and both generated output locations remain ignored and non-public.

`pnpm benchmark:search:official` runs that deterministic official build before
enforcing ADR 0003's artifact compression, parse, query, relevance, and
production-static desktop/slowed-mobile Chromium budgets. It needs the ignored
official manifest and installed Chromium, and it never commits or publishes the
measured artifact.

The pipeline-only `--publication-routes` flag is reserved for an intentionally
shared dataset release. It requires a complete schema-2 registry with explicit
root or checksum-bound inherited lineage, stable source-identity entries, and
valid tombstones. Missing, mismatched, stale, incomplete, or conflicting state
fails before output publication. Do not add this flag to the local official
commands until publication permission exists; the flag is an engineering URL
continuity gate, not permission to publish official-derived content.

The root development, build, and browser-test commands set `DREDMORPEDIA_ARTIFACT_DIRECTORY`, `DREDMORPEDIA_ASSET_DIRECTORY`, and the safe public asset base path only for their web subprocess and explicitly select matching output. For optional direct commands inside `apps/web`, copy `apps/web/.env.example` to the ignored `apps/web/.env.local` and uncomment its generated-output settings. Relative filesystem values there resolve from `apps/web`; point only to generated output, never to the game installation. A configured path is strict: missing, mismatched, or checksum-invalid files fail with an actionable error instead of falling back to another dataset.

Generated output under `data/generated/` and `apps/web/public/generated-assets/` is ignored and must remain outside source roots. The asset writer refuses to replace an existing directory without its ownership marker. Stop and restart the dev server when switching datasets because loaded artifacts and asset mappings are cached for that process.

Audit the committed legacy baseline with:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/audit-legacy.ps1
```

The equivalent canonical command is `pnpm audit:legacy`. Use the script's `-Json` switch for machine-readable output. `-FailOnInvalidXml` and `-FailOnMissingGameData` are opt-in because the committed baseline intentionally lacks proprietary game data and contains one known invalid historical mod XML file.

Serve `legacy/` as the document root for manual behavioral checks. Never point mutation, formatting, patching, or cleanup commands at a local game installation.

## Change expectations

- Keep changes focused and preserve unrelated work.
- Add tests with new domain or pipeline behavior.
- Use synthetic fixtures unless redistribution rights are explicit.
- Add an architecture decision record for durable choices with meaningful alternatives or migration cost.
- Update the project docs and canonical commands in the same change that makes them stale.
- Do not silently drop unknown XML tags, missing references, duplicate entities, or parse errors. Emit actionable diagnostics.
- Keep official data, local installation paths, and generated artifacts with unresolved publication rights out of commits and logs.

## Commit and review shape

Prefer reviewable vertical slices: data contract and fixture, implementation, tests, and one user-facing path. Separate mechanical asset moves or generated changes from behavioral changes when practical.
