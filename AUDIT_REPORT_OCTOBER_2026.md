# Repository Audit Report - October 2026

## Status Quo
The repository is a complex monorepo managed with `pnpm`, containing over 40 packages across several directories (`apps/`, `packages/`, `projects/`, etc.).
- **Package Management:** Currently uses `shamefully-hoist=true`, which promotes ghost dependencies.
- **Dependency Graph:** Significant version drift is present in core dependencies like `@babylonjs/core`, `@types/node`, and `three`.
- **TypeScript:** The root `tsconfig.json` only references a subset of the actual packages. Inheritance from `tsconfig.base.json` is inconsistent.
- **CI/CD:** Multiple overlapping workflows are present, leading to redundant execution and maintenance overhead.
- **Deployment:** The `Dockerfile` is still using Node.js 20, whereas some packages are already targeting Node.js 22 standards.

## Kritische Fehler (Critical Errors)
1. **Dependency Drift:** `@types/node` is inconsistently versioned (`^22.19.18` vs `^25.6.2`), causing potential type-checking failures in different environments.
2. **Incomplete Build Graph:** The root `tsconfig.json` is missing more than half of the workspace packages in its `references` array.
3. **Ghost Dependencies:** `shamefully-hoist=true` in `.npmrc` allows packages to access dependencies not explicitly declared in their `package.json`.

## Optimierungspotenzial (Optimization Potential)
1. **Infrastructure Standardization:** Align all environments (CI, Docker, Local) to Node.js v22 and `pnpm@9.12.2`.
2. **Workflow Consolidation:** Remove redundant `.yml` files in `.github/workflows` to simplify the CI pipeline.
3. **Strict Dependency Linking:** Switch to `node-linker=isolated` to enforce explicit dependency declarations.
4. **Centralized Versioning:** Use `pnpm.overrides` in the root `package.json` to force consistent versions of core libraries across the entire monorepo.

## Action Plan & Results
1. **Standardize Dependencies (DONE):** Unified `@types/node`, `@types/react`, `@babylonjs/core`, and `three` via root overrides.
2. **Repair TypeScript Graph (DONE):** Root `tsconfig.json` now includes all 37 workspace packages.
3. **Clean Workflows (DONE):** Redundant workflows removed; `main-pipeline.yml` is the sole source of truth.
4. **Harden Environment (IN PROGRESS):** `Dockerfile` updated to Node.js v22. `.npmrc` currently remains on `shamefully-hoist=true` to maintain compatibility with legacy packages, but the goal remains a transition to `node-linker=isolated`.
5. **Validation (DONE):** Core packages, API, and Client are now building and passing tests. Extensive pre-existing errors in the `server` package were identified and documented for future refactoring.
