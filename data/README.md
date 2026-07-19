# Local and generated data

This directory enforces the boundary described in `docs/data-and-assets-policy.md`.

- `raw/` is gitignored and may contain approved copies of read-only local inputs.
- `generated/` is gitignored and contains deterministic pipeline output. Generated output is not approved for publication merely because it is transformed.
- `patches/` is reserved for small, reviewed, versioned corrections with documented provenance.

The committed architecture spike reads only `fixtures/synthetic/` and writes its artifacts to `data/generated/spike/`. It never requires or modifies a game installation.
