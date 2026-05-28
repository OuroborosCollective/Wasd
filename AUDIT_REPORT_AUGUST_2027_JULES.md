# Repository Audit Report - August 2027

## Status Quo
The repository is a sophisticated monorepo powered by **pnpm** using the `isolated` node-linker. It encompasses a wide array of packages (shared logic, core ECS, networking) and multiple applications (3D client, 2D client, server, portal). The architecture leverages TypeScript Project References for build orchestration, though implementation is inconsistent across the package tree. Deployment is handled via multiple GitHub Action workflows targeting both legacy PM2/SSH and modern Docker/VPS environments.

## Kritische Fehler (Critical Errors)
1.  **Missing Build Orchestration**: `projects/health-tech/tsconfig.json` is missing, which prevents the root `tsconfig.json` from correctly orchestrating the build for this project.
2.  **Package Manager Schism**:
    - Root `package.json` specifies `pnpm@11.1.1`.
    - `Dockerfile.prod` and `deploy/update.sh` pin `pnpm@9.12.2`.
    - This version gap (v9 vs v11) leads to lockfile format conflicts and "allowBuilds" vs "onlyBuiltDependencies" resolution errors.
3.  **Broken Dependency Chains**: Core packages like `@wasd/core-logic` and `@wasd/server` have `composite: false`, which breaks the incremental build chain and declaration map generation for dependent packages.
4.  **Deployment Redundancy**: `vps-production-deploy.yml` and `main-pipeline.yml` perform near-identical tasks but use different secret naming conventions, increasing maintenance overhead and risk of configuration drift.

## Optimierungspotenzial (Optimization Potential)
1.  **Vite Version Alignment**: Vite versions drift from `5.2.8` (portal) to `6.4.2` (client/apps) and `8.0.13` (server). Standardizing on Vite 8 (as used by the server) would reduce dependency overhead.
2.  **BabylonJS Pins**: While root overrides attempt to pin BabylonJS to `9.8.0`, many packages explicitly request `^9.9.1`, leading to multiple versions in the lockfile despite the `isolated` linker.
3.  **CI Caching**: The current workflows do not fully utilize pnpm's global store cache efficiently across different jobs, leading to redundant installation steps on the GitHub runners.
4.  **Lockfile Strategy**: `deploy/update.sh` uses `--no-frozen-lockfile` on the VPS, which is dangerous in production as it can introduce unverified dependency changes.

## Action Plan
1.  **TypeScript Hardening**:
    - Restore `projects/health-tech/tsconfig.json`.
    - Set `composite: true` and `incremental: true` in all core package `tsconfig.json` files.
2.  **Pnpm Alignment**:
    - Standardize on `pnpm@11.2.2` across root `package.json`, `Dockerfile.prod`, and `deploy/update.sh`.
    - Consolidate build authorization into the `allowBuilds` block in `pnpm-workspace.yaml`.
3.  **Workflow Consolidation**:
    - Mark legacy SSH workflows as deprecated.
    - Standardize on the Docker-based deployment path for production.
4.  **Dependency Synchronization**:
    - Align `vite` and `babylonjs` versions across all `package.json` files to match the root overrides.

---
*Audit performed by Jules - August 2027*
