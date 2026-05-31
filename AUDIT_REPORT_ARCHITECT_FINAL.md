# Comprehensive Monorepo Audit Report - February 2028
**Role:** Senior DevOps & Fullstack Architect
**Status:** FINAL

## 1. Status Quo
The repository is a complex monorepo utilizing **pnpm v11** with an **isolated node-linker**. It contains over 40 workspace packages across `apps/`, `packages/`, `projects/`, and dedicated core directories (`server`, `client`, `portal`, `engine`). The architecture relies on TypeScript Project References for build orchestration and uses Docker/PM2 for VPS deployments. Core simulation logic is deterministic and verified by a specialized "ARE Determinism Gate".

## 2. Kritische Fehler (Critical Errors)
These issues may cause build failures, deployment instability, or security risks.

*   **Pnpm Configuration Breakage:** The root `package.json` contains a `pnpm` block with `overrides` and `onlyBuiltDependencies`. **Pnpm v11 ignores this block.** This means dependency overrides (e.g., forcing React 19 or BabylonJS 9.8.0) and build permissions are currently inactive, leading to potential supply-chain risks and version drift.
*   **Pnpm Version Inconsistency:**
    *   Root/Local: `11.5.0`
    *   `Dockerfile.prod` & `deploy/update.sh`: `9.12.2`
    *   `Dockerfile.vps` & `vps-docker-deploy.yml`: `11.1.1`
    *   *Impact:* Lockfile resolution differences and potential `frozen-lockfile` failures across environments.
*   **Broken TypeScript Graph:** `projects/health-tech` is referenced in the root `tsconfig.json` but lacks a `tsconfig.json` file. This prevents global type-checking (`tsc -b`) from completing successfully.
*   **Missing Composite Settings:** Core packages (`server`, `packages/shared`, `packages/core-logic`) have `composite: false`. This defeats the purpose of TypeScript Project References, causing unnecessary re-builds and potential emission issues in the monorepo graph.

## 3. Optimierungspotenzial (Optimization Potential)
*   **CI/CD Caching:** `vps-docker-deploy.yml` manually configures a `.pnpm-store`. Switching to `actions/setup-node` with `cache: 'pnpm'` (as seen in `monorepo-guard.yml`) would simplify the workflow and improve reliability.
*   **Deployment Consistency:** `Dockerfile.vps` implements a complex `/3d/` route prefix and normalization logic that is missing from `deploy/update.sh`. This results in "Production Drift" depending on whether the app is deployed via Docker or the raw update script.
*   **Strictness:** `server/tsconfig.json` has `strict: false`, which allows unsafe code in the most critical backend component, despite the root `tsconfig.base.json` aiming for strictness.
*   **Dependency Deduplication:** There is significant version drift for `vite` (v5, v6, v8) and `zod`. Standardizing on a single version across the monorepo would reduce the `node_modules` size and prevent runtime type-compatibility issues.

## 4. Action Plan

### Step 1: Fix Pnpm Configuration (Highest Priority)
1.  Move `overrides` and `onlyBuiltDependencies` from the root `package.json` `pnpm` block to the appropriate configuration for pnpm v11 (either in `pnpm-workspace.yaml` or verifying the new schema requirements).
2.  Standardize pnpm version to `11.5.0` in all files:
    *   `Dockerfile.prod`
    *   `Dockerfile.vps`
    *   `deploy/update.sh`
    *   `.github/workflows/vps-docker-deploy.yml`

### Step 2: Repair TypeScript Graph
1.  Create `projects/health-tech/tsconfig.json` extending `../../tsconfig.base.json`.
2.  Update `server/tsconfig.json`, `packages/shared/package.json`, and `packages/core-logic/package.json` to include:
    ```json
    "compilerOptions": {
      "composite": true,
      "declaration": true,
      "declarationMap": true
    }
    ```
3.  Enable `strict: true` in `server/tsconfig.json` and resolve resulting type errors.

### Step 3: Align Deployment Logic
1.  Decide on a single source of truth for route assembly (`/2d/`, `/3d/`, `/portal/`).
2.  Update `deploy/update.sh` to match the robust `Dockerfile.vps` logic, or migrate VPS deployments exclusively to Docker to eliminate drift.

### Step 4: Dependency Cleanup
1.  Run `pnpm up -r vite@latest zod@latest` to align core dependencies.
2.  Standardize `@types/node` and `@types/react` across all `package.json` files using the root `overrides` (once Step 1 is fixed).

### Step 5: CI/CD Refinement
1.  Update all workflows to use `actions/setup-node@v4` with `cache: 'pnpm'`.
2.  Remove manual `.pnpm-store` configurations to leverage standard GitHub Actions caching.
