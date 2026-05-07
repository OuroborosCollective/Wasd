# Comprehensive Repository Audit - May 2026

## Status Quo
The repository is a sophisticated **pnpm monorepo** structured with a clear separation between `apps`, `packages`, `projects`, and core services (`client`, `server`, `engine`, `portal`). It leverages TypeScript with project references and GitHub Actions for CI/CD. The deployment strategy uses Docker for the server and a shell script for VPS deployment.

## 1. Package Management & PnP
- **Current State**: Uses `pnpm@9.12.2` with `shamefully-hoist=true` in `.npmrc`.
- **Findings**:
    - **PnP Status**: Plug'n'Play (PnP) is **disabled**. The `shamefully-hoist=true` setting indicates a reliance on a flat `node_modules` structure, which can lead to "ghost dependencies".
    - **Workspace Configuration**: `pnpm-workspace.yaml` is well-defined but the monorepo is large, making ghost dependencies a significant risk with hoisting enabled.
- **Verdict**: Functional but not optimized for strict dependency isolation.

## 2. Dependency Graph
- **Current State**: Managed via a central `pnpm-lock.yaml`.
- **Findings**:
    - **React Version Drift**: `client` is on React 18, while `apps/web` and `packages/spatial-hub` have moved to React 19. This causes mismatch in `@types/react`.
    - **NestJS Inconsistency**: `server` uses NestJS v10, while `projects/api` (api-core) uses v11.
    - **Database Types**: `@types/pg` varies between `8.10.9` and `8.11.5` across packages.
    - **Tooling Drift**: `rimraf` and `tsup` versions are slightly inconsistent across the workspace.
- **Verdict**: High risk of runtime issues due to version mismatches in core libraries.

## 3. TypeScript & Types
- **Current State**: Root `tsconfig.json` manages project references.
- **Findings**:
    - **Missing References**: Only 1 out of ~15 packages in `projects/` is referenced in the root `tsconfig.json` (`projects/eco-trader`). This prevents `tsc --build` from validating the entire repository.
    - **Type Consistency**: `@types/node` is standardized to `^22.13.1` in most places, which is good, but React types are drifting as noted above.
- **Verdict**: The TypeScript project graph is incomplete, leading to "hidden" build errors in unreferenced projects.

## 4. Workflows & CI/CD
- **Current State**: `main-pipeline.yml` handles the bulk of validation.
- **Findings**:
    - **Hardcoded Infrastructure**: The pipeline contains a hardcoded IP address (`46.202.154.25`) for health checks.
    - **Health Check Logic**: The "Wait-for-it Health Check" is baked into the main pipeline, which might fail if the production server is temporarily down, blocking CI for unrelated code changes.
    - **Redundancy**: The pipeline builds the entire monorepo (`pnpm -r run build`) but then manually merges `dist` folders into `dist-merged`, which seems redundant given the artifacts are also uploaded individually.
- **Verdict**: Fragile due to hardcoded values and tight coupling with production health.

## 5. Deployment & Environments
- **Current State**: Multi-stage `Dockerfile` and basic `deploy-vps.sh`.
- **Findings**:
    - **Docker Optimization**: The `Dockerfile` correctly uses `pnpm deploy`, which is an excellent practice for monorepos.
    - **Deployment Script**: `scripts/deploy-vps.sh` is extremely primitive, lacks error handling (`set -e`), and has a hardcoded SSH target.
    - **Environment Variables**: The `Dockerfile` sets `NODE_ENV=production`, but the deployment script doesn't seem to manage secrets or environment-specific configs beyond what's in the repo.
- **Verdict**: Server deployment is modern (Docker), but the orchestration/automation (vps script) is a weak link.

## Kritische Fehler (Critical Errors)
1. **Broken TypeScript Graph**: Missing `projects/*` in root `tsconfig.json` means a large portion of the codebase is not being type-checked during `tsc --build`.
2. **Hardcoded IP in CI**: Security and maintainability risk.
3. **React 18/19 Conflict**: Mixed versions in a monorepo often lead to `Invalid Hook Call` or type errors when packages are shared.

## Optimierungspotenzial (Optimization Potential)
1. **Remove `shamefully-hoist=true`**: Transition to strict pnpm mode to catch ghost dependencies early.
2. **Standardize Core Versions**: Align React, NestJS, and Three.js versions across all packages.
3. **Refactor CI Health Checks**: Move production health checks to a separate "Smoke Test" workflow that doesn't block the main build/test pipeline.
4. **Hardened Deployment**: Update `deploy-vps.sh` with better error handling and parameterization.

## Action Plan
1. **[IMMEDIATE]** Update root `tsconfig.json` with all missing `projects/*` references.
2. **[IMMEDIATE]** Replace hardcoded IP in `main-pipeline.yml` with a GitHub Secret (`secrets.PRODUCTION_IP`).
3. **[SHORT-TERM]** Synchronize React and `@types/react` versions to `^19.0.0` or stick to `^18.0.0` globally.
4. **[SHORT-TERM]** Harden `scripts/deploy-vps.sh` with `set -euo pipefail` and variable-based configuration.
5. **[MID-TERM]** Remove `shamefully-hoist=true` and fix resulting missing dependency errors.
