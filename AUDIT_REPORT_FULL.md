# Comprehensive Repository Audit Report - August 2028

## Status Quo
The repository is a large-scale TypeScript monorepo managed with **pnpm 11.1.1**. It consists of:
- **Apps**: `apps/web`, `apps/client-2d`, `apps/api`.
- **Packages**: Core logic, database, network, and UI components in `packages/`.
- **Projects**: Specialized simulation and logic modules in `projects/`.
- **Core Services**: Root-level directories for `server`, `client` (3D), `engine`, and `portal`.

The build system leverages TypeScript project references for incremental builds, and the deployment is centered around Docker and PM2 for VPS environments.

---

## Critical Errors (Resolved during Audit)
1. **pnpm Version Fragmentation**:
   - *Issue*: Different pnpm versions (9.12.2 and 11.1.1) were used across CI workflows, `Dockerfile.vps`, and local development. This risks lockfile drift and non-deterministic builds.
   - *Fix*: Standardized all infrastructure to pnpm **11.1.1**.
2. **Peer Dependency Mismatches**:
   - *Issue*: `@wasd/database` had outdated peer dependencies for `pg` and `zod` compared to the actual versions used in the workspace.
   - *Fix*: Aligned peer dependencies in `packages/database/package.json`.
3. **TypeScript Composite Inconsistency**:
   - *Issue*: `server/tsconfig.json` had `composite: false`, which is invalid for a project intended to be used as a project reference in the root `tsconfig.json`.
   - *Fix*: Enabled `composite: true` and added declaration emission.
4. **Docker Lockfile Sync Drift**:
   - *Issue*: `scripts/sync-pnpm-lockfile-for-docker.py` was missing the `typescript` override present in the root `package.json`, potentially causing `frozen-lockfile` failures in Docker builds.
   - *Fix*: Synchronized overrides.

---

## Optimization Potential
1. **TypeScript Standardization**:
   - Ensure all packages use `moduleResolution: "bundler"` to align with modern ESM practices and Vite/Esbuild requirements.
2. **CI/CD Concurrency**:
   - Standardize all workflows to use `concurrency` groups to prevent race conditions during multiple pushes.
3. **Deployment Script Consolidation**:
   - There are multiple overlapping deploy scripts (`deploy/update.sh`, `scripts/deploy-vps-docker.sh`, etc.). Consolidating these into a single unified entry point would reduce maintenance overhead.
4. **Ghost Dependency Guarding**:
   - The `scripts/monorepo-guard.mjs` is an excellent tool; expanding it to check for ghost dependencies (packages used in code but not listed in `package.json`) would further harden the repo.

---

## Action Plan (Completed & Ongoing)
1. [x] **Standardize pnpm**: Align all `yaml`, `Dockerfile`, and `sh` scripts to version 11.1.1.
2. [x] **Align Dependencies**: Synchronize `package.json` peer dependencies and Docker sync scripts.
3. [x] **TypeScript Fixes**: Enable `composite` mode for referenced projects and standardize `moduleResolution`.
4. [ ] **Prune Redundancies**: Audit `deploy/` directory and remove legacy scripts (e.g., `deploy-v2.sh` vs `update.sh`).
5. [ ] **Type-Safety Audit**: Conduct a deep dive into `packages/types` to ensure no overlapping or conflicting definitions across the monorepo.

---
*Audit conducted by Jules (Senior DevOps & Fullstack Architect)*
