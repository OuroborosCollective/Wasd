# Repository Audit Report - October 2027

## Status Quo
The repository is a complex monorepo using **pnpm** for package management and **TypeScript Project References** for build orchestration. It contains approximately 40 projects across `apps/`, `packages/`, `projects/`, and several root-level service directories. The build system is integrated with GitHub Actions for CI/CD, deploying via Docker to a VPS environment.

## 1. Package Management & PnP
*   **Current State:** Uses `node-linker=isolated` in `.npmrc`. This provides strict dependency boundaries (preventing ghost dependencies) but is not full PnP.
*   **Findings:** The `pnpm-workspace.yaml` correctly identifies the package structure, but several internal dependencies were using inconsistent versioning.
*   **Audit Result:** Generally healthy, but required synchronization of core versions to ensure runtime stability across project boundaries.

## 2. Dependency Graph
*   **Critical Issues:** Significant version mismatches were found for `typescript`, `zod`, `react`, and `@babylonjs` components.
*   **Redundancies:** Multiple packages were re-declaring devDependencies that should be managed at the root level or via overrides.
*   **Fixes Applied:** Implemented root `pnpm.overrides` to pin `typescript@6.0.3`, `react@19.2.6`, and other core libraries monorepo-wide.

## 3. TypeScript & Types
*   **Findings:**
    *   `apps/client-2d` and `packages/core-network` were missing from the root `tsconfig.json` references, breaking the full build graph.
    *   Inconsistent `tsconfig.json` configurations across sub-packages.
*   **Fixes Applied:**
    *   Restored build graph integrity by adding missing references.
    *   Standardized sub-package configurations to extend `tsconfig.base.json`.

## 4. Workflows & CI/CD
*   **Findings:**
    *   CI triggers (`paths`) in `main-pipeline.yml` were missing the `projects/` directory, meaning logic changes in those modules wouldn't trigger tests.
    *   The VPS deployment workflow lacked strict path-based execution, potentially leading to unnecessary deployments.
*   **Fixes Applied:** Updated all workflow triggers to include all workspace paths.

## 5. Deployment & Environments
*   **Findings:**
    *   The production `Dockerfile.prod` was using a single-stage build with `tsx` (TypeScript Execute), which is inefficient for production performance and image size.
    *   Missing `.dockerignore` led to large image contexts.
*   **Fixes Applied:**
    *   Created a robust multi-stage `Dockerfile.prod`.
    *   Added a comprehensive `.dockerignore`.
    *   Standardized the runner to use compiled JavaScript (`node server/dist/index.js`) for better performance.

## Critical Errors (Resolved)
1.  **Broken Build Graph:** Missing project references in `tsconfig.json` prevented incremental builds from seeing the full dependency tree.
2.  **Dependency Fragmentation:** Mismatched versions of `typescript` and `zod` across packages could lead to "type-drift" and runtime validation errors.
3.  **Insecure Build Process:** The previous Docker build ignored failures (`|| true`), which has been corrected to ensure only passing code is deployed.

## Optimization Potential
*   **PnP Transition:** Consider moving to full `pnpm` PnP for even stricter dependency management and faster installs.
*   **Turbo/Nx:** As the number of projects (40+) grows, implementing a high-level build orchestrator like Turborepo would significantly improve local development and CI speeds by using remote caching.
*   **ESM Consolidation:** While most packages use `type: module`, some legacy configurations remain. A unified ESM approach would simplify the toolchain.

## Action Plan (Completed)
1.  [x] Standardize root `tsconfig.json` and sub-package inheritance.
2.  [x] Implement monorepo-wide dependency overrides.
3.  [x] Refactor production Docker container for performance and security.
4.  [x] Harden CI/CD triggers to cover the entire workspace.
5.  [x] Verify workspace integrity via `pnpm install` and `tsc --build`.
