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
pnpm generate:check
pnpm check
```

`pnpm check` runs formatting, linting, strict type checks, unit/integration tests, deterministic artifact generation, and the production static build. Browser checks are separate because they require a downloaded test browser:

```powershell
pnpm --filter @dredmorpedia/web exec playwright install chromium
pnpm test:e2e
```

`pnpm test:e2e` first builds the production static export, then serves it on isolated port 3100. It can run while `pnpm dev` is already using port 3001.

Start synthetic local development with `pnpm dev` (an alias for `pnpm dev:synthetic`), then open `http://localhost:3001/`. It regenerates the legal synthetic spike artifact before starting the Next.js application on port 3001.

When the ignored `data/raw/local-official-manifest.json` has been configured for the approved read-only installation, use the equivalent official-data commands:

```powershell
pnpm dev:official
pnpm generate:official:check
pnpm build:official
```

`pnpm dev:official` regenerates `data/generated/official-local/` before starting, so it does not silently serve a stale local artifact. The deterministic generate/check command does the same import twice without starting the app, while the build command additionally verifies the full static export. Official inputs and generated output remain ignored and non-public.

The root development, build, and browser-test commands set `DREDMORPEDIA_ARTIFACT_DIRECTORY` only for their web subprocess and explicitly select synthetic or official output. For optional direct commands inside `apps/web`, copy `apps/web/.env.example` to the ignored `apps/web/.env.local` and uncomment its artifact-directory setting. Relative values there resolve from `apps/web`; point only to generated output, never to the game installation. A configured path is strict: missing files fail with an actionable error instead of falling back to synthetic data.

Generated output under `data/generated/` is ignored and must remain outside source roots. Stop and restart the dev server when switching datasets because loaded artifacts are cached for that process.

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
