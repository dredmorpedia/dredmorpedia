# Source-root trust-boundary evidence

Date: 2026-07-29
Status: implemented and verified

## Scope

The source manifest is trusted operator configuration. Its source `root` may be
absolute so a local import can read a game installation outside the repository.
This exception does not grant declared database paths unrestricted filesystem
access and does not make the manifest suitable for untrusted uploads.

## Enforced boundary

- Absolute and manifest-relative source roots are canonicalized to existing real
  paths.
- Every `sources[].files[].path` remains a safe relative path and is resolved
  through the existing real-path containment check beneath its source root.
- Traversal, absolute file paths, Windows drive-relative paths, and symbolic-link
  escapes remain rejected.
- Patch and route-registry paths remain repository-relative and
  repository-contained.
- Generated provenance and manifests use sanitized display paths and do not
  expose machine-local source roots.

The assumption is recorded beside `resolveSourceRoot` and in the source-manifest
contract and data policy.

## Regression

The focused safety regression creates a synthetic source outside a temporary
repository. It first proves that the trusted absolute root loads, then replaces
the declared database path with a traversal value and proves manifest loading
rejects it before reading outside the source boundary.

No proprietary input or machine-local installation path is recorded by this
evidence.

## Validation

The focused safety test passes with one selected regression and 12 unrelated
cases skipped. `pnpm.cmd check` passes formatting, lint, type checking, all 142
unit/artifact tests, byte-identical synthetic generation, and the 43-page
synthetic static export.

`pnpm.cmd generate:official:check` also remains byte-identical with 763 items,
2,767 search documents, 0 errors, 275 warnings, and 71 informational decisions.
The official source stays read-only and its ignored generated artifact is not
published.
