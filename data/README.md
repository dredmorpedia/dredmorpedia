# Local and generated data

This directory enforces the boundary described in `docs/data-and-assets-policy.md`.

- `raw/` is gitignored and may contain approved copies of read-only local inputs.
- `generated/` is gitignored and contains deterministic pipeline output. Generated output is not approved for publication merely because it is transformed.
- `patches/` is reserved for small, reviewed, versioned corrections with documented provenance.

The committed application reads only `fixtures/synthetic/` by default and writes versioned `artifact.json`, `search.json`, `diagnostics.json`, and `manifest.json` files to `data/generated/spike/`. It never requires or modifies a game installation.

Read-only integration measurements may use a machine-specific manifest under ignored `raw/`. Absolute source roots are allowed there, but generated provenance is sanitized to source-relative paths. Official-derived artifacts must remain under ignored `generated/` until the publication policy changes.

When that ignored manifest exists, the deterministic local measurement command is:

```powershell
pnpm --filter @dredmorpedia/data-pipeline exec tsx src/cli.ts --check --manifest data/raw/local-official-manifest.json --output data/generated/official-local
```
