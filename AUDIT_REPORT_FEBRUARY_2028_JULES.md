# Monorepo Audit Report - February 2028

**Auditor:** Jules (Senior DevOps & Fullstack Architect)
**Status:** Completed

## Status Quo
The repository is a large-scale pnpm monorepo using **pnpm v11.5.0**. It follows an isolated node-linker pattern (standard for pnpm v11) and manages a complex dependency graph across `apps/`, `packages/`, and `projects/`. The core simulation (ARE) is deterministic, and the build system is orchestrated via pnpm workspace filters.

## Kritische Fehler
1.  **Tooling Version Drift (Resolved):** Multiple Dockerfiles (`Dockerfile.prod`, `Dockerfile.vps`) and deployment scripts (`deploy/update.sh`) were hardcoded to use `pnpm@9.12.2`, while the root `package.json` enforced `11.5.0`. This created non-deterministic builds and potential lockfile corruption on the VPS.
2.  **Vite Version Fragmentation (Resolved):** Outlier packages (`portal`, `sdk-replit-demo`) were using older Vite versions (v5/v6), creating inconsistency with the core client's Vite v8 toolchain.
3.  **Security/Build Risk (Resolved):** Redundant `allowBuilds=true` in `.npmrc` bypassed the explicit security list in `pnpm-workspace.yaml`.

## Optimierungspotenzial
1.  **TypeScript Build Graph:** While `packages/shared` is hardened, the `server` package currently cannot use `composite: true` without significant refactoring of Express route type definitions to resolve TS2883 (portable type errors).
2.  **Deployment Speed:** The `deploy/update.sh` script relies on a full `pnpm install` on the VPS. Moving towards a full Docker-based deployment (already supported by `vps-docker-deploy.yml`) will leverage layer caching more effectively.
3.  **Dependency Redundancy:** Identified and removed redundant `typescript` peerDependencies in `packages/shared`.

## Action Plan (Executed)
1.  **Standardize pnpm:** Synchronized `pnpm@11.5.0` across all Dockerfiles, CI workflows, and deployment scripts.
2.  **Align Vite:** Standardized Vite at `8.0.14` across all workspace packages.
3.  **Harden pnpm Config:** Consolidated `allowBuilds` into `pnpm-workspace.yaml` and ensured explicit boolean `true` values are used.
4.  **Clean Workspace:** Removed duplicate dependency declarations in `packages/shared`.
5.  **Verify Core Logic:** Confirmed that Level-A simulation tests (`npc-heuristics`, `warfront-system`) remain stable after toolchain alignment.

---
*Verified by ARE Invariant Guard.*
