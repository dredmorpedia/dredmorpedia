# Asset-path validation evidence

Date: 2026-07-29

## Scope

This checkpoint closes the repository review's low-severity empty-root asset-path gap. It changes only the untrusted-input boundary in the data pipeline; normalized schemas, valid asset values, generated output, and web behavior are unchanged.

## Contract

`normalizeAssetPath` now validates a normalized asset value with `assertSafeRelativePath` before it examines any configured asset root. Traversal segments, absolute paths, and empty unsafe forms therefore produce an `unsafe_asset_path` error and an unavailable normalized value even if a future caller supplies no lookup roots.

Root probing remains responsible only for locating and registering a safe relative asset. A safe but absent asset still produces the existing `missing_asset` warning.

## Regression coverage

The focused safety regression parses a valid item database through `parseDatabase` with an intentionally empty `assetRoots` list and an `../outside.svg` icon. It proves that:

- the icon is normalized as unavailable;
- one source-located `unsafe_asset_path` error is emitted; and
- input registration is never reached.

This edge is not reachable through today's dataset importer, which always includes the current source root. Covering it at the normalizer boundary keeps that safety invariant independent of caller construction.

## Validation

- `pnpm.cmd --filter @dredmorpedia/data-pipeline test -- safety.test.ts`
- `pnpm.cmd --filter @dredmorpedia/data-pipeline typecheck`
- `pnpm.cmd --filter @dredmorpedia/data-pipeline lint`
- `pnpm.cmd check`
- `pnpm.cmd generate:official:check`

All checks pass. The full workspace has 135 unit/artifact tests and exports the 43-page synthetic site. Official generation remains byte-identical with 763 items, 2,767 search documents, 0 errors, 275 warnings, and 71 informational decisions.

No browser suite is required because this checkpoint changes neither generated contracts nor UI/routes/interactions.
