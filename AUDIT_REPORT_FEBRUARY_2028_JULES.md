# Monorepo Audit Report - February 2028

**Auditor:** Jules (Senior DevOps & Fullstack Architect)
**Date:** February 2028

## Status Quo
The repository is a complex monorepo using **pnpm v11** with the `isolated` node-linker. It follows a composite TypeScript project structure and centralizes dependency management through root-level `overrides` and `allowBuilds`. The deployment pipeline supports both Docker-based (VPS) and direct SSH-based deployments via PM2.

*   **Package Management:** Uses `pnpm`. Root `package.json` specifies `pnpm@11.2.2`, but `devDependencies` lists `pnpm@11.5.0`.
*   **TypeScript:** Root `tsconfig.json` uses Project References, but many sub-packages are not correctly configured as composite projects.
*   **Deployment:** `Dockerfile.prod` and `deploy/update.sh` are currently pinned to `pnpm@9.12.2`, creating a version mismatch with the monorepo configuration.

## Kritische Fehler (Critical Errors)
1.  **TypeScript Reference Breakdown:** `projects/health-tech` is referenced in the root `tsconfig.json` but lacks a `tsconfig.json` file, which will cause `tsc --build` to fail.
2.  **Composite Configuration Mismatch:** Multiple packages (e.g., `server`, `packages/shared`, `apps/web`) are referenced in the root but lack `composite: true`. This breaks the TypeScript build graph and incremental compilation.
3.  **pnpm Version Conflict:** The monorepo configuration (overrides, etc.) is tailored for pnpm v11, but deployment scripts still use pnpm v9. This can lead to lockfile resolution errors during deployment.

## Optimierungspotenzial (Optimization Potential)
1.  **Version Standardization:** Unified pnpm version (11.5.0) across `package.json`, Dockerfiles, and CI/CD workflows.
2.  **Deployment Stability:** Switch to `--frozen-lockfile` in `deploy/update.sh` to ensure the production environment exactly matches the development lockfile.
3.  **Build Performance:** Fully enabling `composite` and `incremental` across all packages will significantly reduce CI/CD build times by allowing TypeScript to skip unchanged packages.

## Action Plan
1.  **Package Management Alignment:**
    *   Update root `packageManager` to `pnpm@11.5.0`.
    *   Align `Dockerfile.prod` and `deploy/update.sh` to `pnpm@11.5.0`.
    *   Enforce `--frozen-lockfile` in production deployment scripts.
2.  **TypeScript Hardening:**
    *   Systematically enable `composite: true`, `declaration: true`, and `incremental: true` for all internal packages.
    *   Create missing `tsconfig.json` for `projects/health-tech`.
    *   Verify the entire graph with `pnpm exec tsc --build`.
3.  **Dependency Synchronization:**
    *   Align `@babylonjs/*` and `pg` versions in `apps/web` and `server` with the root `overrides` to prevent ghost dependency issues and ensure runtime stability.
4.  **Verification:**
    *   Run `pnpm guard:monorepo` to validate lockfile and override consistency.
    *   Execute full test suite and build verification.
