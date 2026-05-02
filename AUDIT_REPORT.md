# Repository Audit Report - WASD Monorepo

## Status Quo
The repository is a TypeScript monorepo using **pnpm** (v9.1.0) as the package manager. It contains several components distributed across `apps/`, `packages/`, `projects/`, and top-level directories like `server/`, `client/`, and `shared/`. The build system uses TypeScript Project References, and CI/CD is handled via GitHub Actions.

## Kritische Fehler
1. **Broken Docker Build:** The root `Dockerfile` uses `npm ci`, which is incompatible with the pnpm workspace and will fail to resolve internal `@wasd/*` dependencies. Additionally, it uses `node:25-alpine`, while the project specifies Node 20.
2. **Incomplete CI Triggers:** The `main-pipeline.yml` does not trigger on changes in core directories like `server/`, `client/`, `shared/`, `projects/`, and `engine/`. This means a large portion of the codebase is unverified by CI on push/PR.
3. **Ghost Dependencies & Configuration Conflicts:** Presence of legacy `.pnp.cjs`, `.yarnrc.yml`, and `package-lock.json` creates confusion and potential resolution conflicts with pnpm.

## Optimierungspotenzial
1. **Dependency Synchronization:** Wide variance in versions for `typescript`, `@types/node`, and `vitest` across packages. Synchronizing these will reduce bundle size and build times.
2. **TypeScript Integrity:** The root `tsconfig.json` only references about 20% of the actual workspace packages. Fully populating `references` will enable proper incremental builds and IDE support across the entire monorepo.
3. **CI/CD Efficiency:** Redundant caching in GitHub Actions (both `setup-node` and manual `actions/cache`). Consolidating this will speed up the pipeline.
4. **Internal Naming Consistency:** Packages are inconsistently named (e.g., `@wasd/shared` vs `@wasd/shared-lib`).

## Action Plan
1. **Clean Workspace:** Remove legacy configuration files (`.pnp.cjs`, `.yarnrc.yml`, `package-lock.json`).
2. **Standardize Dependencies:** Align versions of common dev dependencies (TS, Vitest, @types) across all `package.json` files.
3. **Repair TypeScript Project References:** Update root `tsconfig.json` to include all workspace packages.
4. **Fix CI/CD Triggers:** Update workflow path triggers to cover all relevant directories.
5. **Modernize Dockerfile:** Refactor to use `pnpm`, multi-stage builds that handle workspaces correctly, and the correct Node.js base image.
6. **Workspace Validation:** Run recursive build and test to ensure stability.
