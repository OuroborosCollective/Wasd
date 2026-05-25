# Bolt Learnings - Auditor Module

## Dependency Tracker Cleanup
- **Unused Imports**: Symbols `SourceFile` and `ImportDeclaration` from `ts-morph` were imported but not used as types or values in `src/auditor/dependency_graph.ts`.
- **Verification**: While global `tsc` in this monorepo has pre-existing configuration/reference errors, surgical validation with `eslint` and manual symbol tracking confirms these removals are safe.
- **Monorepo Guard**: The repository enforces strict versioning for BabylonJS and Supabase dependencies via `scripts/monorepo-guard.mjs`. Pre-existing drifts in `pnpm-lock.yaml` should be noted but do not block surgical code health fixes in unrelated modules.

## 2026-05-25 - Bulk Insert Optimization for Postgres Persistence
**Learning:** Sequential `INSERT` operations in a loop cause significant performance overhead due to database round-trip latency. In `PostgresPersistenceBackend`, saving 100 players previously required 100 separate `INSERT` calls.
**Action:** Implemented bulk `INSERT ... ON CONFLICT` with row chunking (200 rows per chunk) in `save` and `saveWorldObjects` methods. This reduces N queries to ~1 per save cycle, dramatically improving persistence throughput during world snapshots or player syncs.
