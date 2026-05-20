# Monorepo Audit Report - August 2028

## Status Quo
The repository is a sophisticated TypeScript monorepo managed by `pnpm` (v11.1.1) with an `isolated` node-linker. It follows a "logic-first server" and "stateless client" architecture. Dependency management is centralized through root overrides, and build integrity is guarded by custom scripts (`monorepo-guard.mjs`). Deployment is containerized via Docker for VPS environments.

## Kritische Fehler (Critical Findings)
1.  **TypeScript Project Reference Breakage**: `server/tsconfig.json` had `composite: false`, breaking the project reference chain from the root `tsconfig.json`. This prevents correct incremental builds and type-checking across the workspace.
2.  **CI/CD Version Mismatch**: GitHub Actions workflows were hardcoded to use `pnpm@9.12.2`, while the monorepo has transitioned to `pnpm@11.1.1`. This can lead to lockfile drift and "Frozen lockfile" installation failures in CI.
3.  **Peer Dependency Mismatch**: `packages/database` required `pg: ^8.11.5` as a peer dependency, but the workspace is standardized on `^8.20.0`.

## Optimierungspotenzial (Optimizations)
-   **Package Manager Enforcement**: Missing `packageManager` field in root `package.json` prevents tools from automatically picking up the correct `pnpm` version.
-   **TypeScript Configuration Alignment**: `packages/core` was using `moduleResolution: node`, deviating from the workspace standard `bundler`, which can cause resolution discrepancies between local dev and build artifacts.
-   **Centralized Versioning**: While many versions are overridden at the root, some packages still have slight drifts in devDependencies that could be further pruned.

## Action Plan
1.  **Standardize Tooling**: Add `packageManager` to root `package.json` and update all GitHub Workflows to use `pnpm@11.1.1`.
2.  **Repair TS References**: Enable `composite: true` and appropriate declaration flags in `server/tsconfig.json`.
3.  **Align Module Resolution**: Update `packages/core` to use `moduleResolution: bundler`.
4.  **Synchronize Dependencies**: Update `packages/database` peer dependencies to match the monorepo standard.
5.  **Verify Integrity**: Run `monorepo-guard` and full workspace typechecks to ensure all references are correctly resolved.

---
*Audited by Jules (Senior DevOps & Fullstack Architect)*
