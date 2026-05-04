# Areloria Monorepo Architectural Audit Report (v4)

## Status Quo
The repository is a TypeScript-based monorepo managed by **pnpm**. It contains a diverse set of applications (`client`, `server`, `portal`) and libraries (`packages/*`). While the structure is intended to be modular, several architectural regressions have accumulated:
- **Redundant Structure:** A legacy `shared/` directory exists in the root, duplicating much of the logic found in `packages/shared/`.
- **Conflicting Configs:** The root `package.json` contains a `workspaces` field that overlaps with `pnpm-workspace.yaml`, leading to resolution warnings.
- **Hoisting Issues:** `.npmrc` uses `shamefully-hoist=true`, which masks missing dependencies and contradicts the strictness of pnpm.
- **Fragmented Tooling:** TypeScript versions range from 5.0.0 to 5.7.3, and module systems are mixed (CommonJS and NodeNext/ESM).

---

## Critical Errors
1. **Broken Build (Server):** The `@wasd/server` package uses `moduleResolution: NodeNext`, which requires explicit `.js` extensions in imports. Currently, most imports lack these, causing `tsc` to fail.
2. **Ghost Failures in CI/CD:** The `main-pipeline.yml` utilizes `continue-on-error: true` for linting, type-checking, building, and testing. This allows the pipeline to appear successful even when the codebase is fundamentally broken.
3. **Vitest Misconfiguration:** Sub-package test configurations (e.g., in `packages/shared`) reference paths like `server/src/tests/` which do not exist within their local context, resulting in "No test files found" and failing test runs.
4. **Naming Collision:** `@wasd/shared` (root legacy) and `@wasd/shared-lib` (packages/shared) are both being referenced in the workspace, causing `EDUPLICATEWORKSPACE` errors.
5. **NPC Logic Regressions:** Several modules in the server (`NPCHeuristics`, `NPCMemoryPersistence`) reference properties on `NPCMemoryCache` that do not exist in its current implementation, halting the build.

---

## Optimization Potential
1. **Docker Modernization:** The current `Dockerfile` uses a fragile manual multi-stage approach with `find` commands to prune `package.json` files. This should be replaced with `pnpm deploy --filter @wasd/server` for a leaner and more robust image.
2. **TypeScript Project References:** Project references are incomplete. Fully implementing them across all packages will enable incremental builds and better IDE performance.
3. **Dependency Alignment:** Synchronizing `typescript`, `zod`, and `@babylonjs/*` versions across the monorepo will prevent runtime bugs and reduce bundle sizes.
4. **CI/CD Consolidation:** Merging `ci.yml` and `main-pipeline.yml` into a single, authoritative workflow with optimized pnpm store caching.

---

## Action Plan

### Phase 1: Workspace & Structure Cleanup
- **Step 1:** Merge root `shared/` into `packages/shared/`.
- **Step 2:** Standardize naming to `@wasd/shared` in `packages/shared/package.json`.
- **Step 3:** Remove `workspaces` from root `package.json`.
- **Step 4:** Remove `shamefully-hoist=true` from `.npmrc` and resolve resulting dependency errors.

### Phase 2: Tooling & Build Restoration
- **Step 5:** Align all packages to TypeScript `^5.7.3`.
- **Step 6:** Fix server imports by adding `.js` extensions or switching to a more permissive `moduleResolution`.
- **Step 7:** Update Vitest configs in `packages/*` to correctly locate local test files.
- **Step 8:** Repair logical mismatches in `NPCMemoryCache` and related server modules.

### Phase 3: CI/CD & Deployment Hardening
- **Step 9:** Consolidate GitHub Workflows and remove `continue-on-error: true`.
- **Step 10:** Refactor `Dockerfile` to use `pnpm deploy`.
- **Step 11:** Synchronize environment variable handling between `deploy.sh` and `deploy-vps.sh`.
