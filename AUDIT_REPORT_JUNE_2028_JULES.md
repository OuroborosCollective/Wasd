# Comprehensive DevOps & Architecture Audit Report - June 2028

## Status Quo
The repository is a TypeScript-based monorepo managed by **pnpm** (v9+). It uses an **isolated node-linker** (`.npmrc`), which is a robust choice for avoiding ghost dependencies in large monorepos, though it differs from the PnP approach mentioned in the initial prompt. The project structure is clearly divided into `apps/`, `packages/`, `projects/`, and top-level service directories (`server/`, `portal/`, `engine/`).

Deployment is currently in a transition phase between **legacy PM2-based SSH deploys** (`deploy/update.sh`) and a modern **Docker-based workflow** (`Dockerfile.vps`, `vps-docker-deploy.yml`).

## Kritische Fehler
1.  **TypeScript Project Reference Conflict:** `@wasd/database` had `noEmit: true` while being a dependency for other packages. This prevents `tsc --build` from generating the necessary declaration files, breaking the chain of project references. *(Fixed during audit)*
2.  **Vite/Vitest Version Drift:** Significant version mismatches (Vite v5 to v8, Vitest v1 to v4) across packages could lead to non-deterministic test results and build failures due to incompatible plugin APIs. *(Standardized to Vite ^6.4.2 and Vitest ^4.1.6 during audit)*
3.  **Missing `tsconfig` Inheritance:** The `portal` package was not extending the root `tsconfig.base.json`, leading to inconsistent strictness and environment globals. *(Fixed during audit)*

## Optimierungspotenzial
1.  **CI/CD Caching:** Several workflows (e.g., `replit-sdk-smoke.yml`, `vps-docker-deploy.yml`) lack consistent pnpm caching or use redundant `pnpm install` calls without frozen lockfiles.
2.  **Deployment Redundancy:** There are at least three active ways to deploy to the VPS (legacy `update.sh`, `jules_atomic_deploy.yml`, and `vps-docker-deploy.yml`). This increases maintenance overhead and the risk of environment drift.
3.  **Docker Build Pressure:** The `Dockerfile.vps` performs builds of all apps sequentially. While this prevents OOM on small VPS instances, it significantly increases CI/CD turnaround time.
4.  **Peer Dependency Alignment:** Packages like `@wasd/database` have peer dependencies (`pg`, `zod`) that were slightly out of sync with the root overrides.

## Action Plan

### Step 1: Finalize Dependency Standardization
- [x] Align all `vite` and `vitest` versions to the monorepo baseline.
- [ ] Move common devDependencies (eslint, prettier, typescript) exclusively to the root `package.json` to reduce noise in sub-packages.

### Step 2: Harden TypeScript & Build Pipeline
- [x] Ensure all packages extend `tsconfig.base.json`.
- [x] Fix `noEmit` settings in composite packages to support incremental builds.
- [ ] Implement a root-level `typecheck` script that leverages `tsc --build` for faster validation.

### Step 3: CI/CD & Deployment Consolidation
- [ ] **Deprecate Legacy Deployments:** Remove `deploy/update.sh` and legacy workflows once the Docker path is fully verified.
- [ ] **Standardize Caching:** Update all `.github/workflows` to use `actions/setup-node` with `cache: 'pnpm'`.
- [ ] **Docker Layer Optimization:** Refactor `Dockerfile.vps` to better utilize layer caching for `node_modules` before copying source code.

### Step 4: Environment & Secrets Management
- [ ] Centralize environment variable templates. Currently, `.env.example`, `.env.production.template`, and `docker-compose.yml` defaults are disconnected.
- [ ] Implement a secret rotation policy for the VPS SSH keys and database credentials.

---
*Audit performed by Jules - Senior DevOps & Fullstack Architect*
