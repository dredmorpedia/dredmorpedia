# Contributing to Dredmorpedia

The repository is currently in the foundation phase of a clean rebuild. The intact legacy site lives under `legacy/` as the reference implementation; new architecture must not be introduced inside it.

## Start here

Read `PROJECT.md`, `AGENTS.md`, `docs/README.md`, and any decision record relevant to your change. Check `docs/roadmap.md` before creating a new workstream. Read `docs/data-and-assets-policy.md` before accessing game files or adding data/assets.

## Current baseline command

No package manager or build command exists yet. Audit the committed legacy baseline with:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/audit-legacy.ps1
```

Use `-Json` for machine-readable output. `-FailOnInvalidXml` and `-FailOnMissingGameData` are opt-in because the committed baseline intentionally lacks proprietary game data and contains one known invalid historical mod XML file.

Serve `legacy/` as the document root for manual behavioral checks. Never point mutation, formatting, patching, or cleanup commands at a local game installation.

## Change expectations

- Keep changes focused and preserve unrelated work.
- Add tests with new domain or pipeline behavior once the modern workspace exists.
- Use synthetic fixtures unless redistribution rights are explicit.
- Add an architecture decision record for durable choices with meaningful alternatives or migration cost.
- Update the project docs and canonical commands in the same change that makes them stale.
- Do not silently drop unknown XML tags, missing references, duplicate entities, or parse errors. Emit actionable diagnostics.
- Keep official data, local installation paths, and generated artifacts with unresolved publication rights out of commits and logs.

## Commit and review shape

Prefer reviewable vertical slices: data contract and fixture, implementation, tests, and one user-facing path. Separate mechanical asset moves or generated changes from behavioral changes when practical.
