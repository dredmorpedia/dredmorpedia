# Versioned patches

Place only small, reviewed patch definitions here. Every patch must identify the exact dataset and source versions, explain why it exists, declare the expected old value, and preserve before/after values in artifact provenance. Patch paths are declared explicitly by source manifest schema version 2; directory enumeration never activates a patch.

The executable format and atomic failure behavior are documented in [`../../docs/contracts/source-manifest-and-patches.md`](../../docs/contracts/source-manifest-and-patches.md). The synthetic fixture keeps its example beside the fixture manifest rather than in this production patch area.
