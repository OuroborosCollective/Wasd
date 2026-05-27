# Monorepo Architectural Audit Report - May 2026

## Status Quo
The repository is a complex monorepo using **pnpm** with the `isolated` node-linker (PnP is currently disabled). It encompasses multiple applications (`apps/`), packages (`packages/`), and research projects (`projects/`). The architecture follows a logic-first design principle, with a clear separation between core simulation logic (ARE Level-A) and visual clients.

### Dependency Landscape
- **Vite:** Currently suffers from significant version drift:
  - `portal`: v5.2.8
  - `apps/web`: v6.4.2
  - `apps/client-2d`: v6.4.2
  - `server`: v8.0.13
- **BabylonJS:** Monorepo-wide overrides pin v9.8.0, but several packages (`apps/web`, `packages/shared`) request ^9.9.1.
- **TypeScript:** Configured with project references. Root `tsconfig.json` orchestrates 40+ sub-projects.

### CI/CD & Deployment
- Deployment is fragmented across four distinct workflows using three different strategies (Docker, PM2, Azure/SCP).
- Primary production deployment is now Docker-based via `vps-docker-deploy.yml`.

---

## Critical Errors (Resolved)
1. **TypeScript Reference Mismatch:** `projects/health-tech` was referenced in the root `tsconfig.json` but lacked its own `tsconfig.json`, breaking root-level `tsc` orchestration.
   - **Status:** FIXED. Created `projects/health-tech/tsconfig.json`.
2. **Duplicate Component Exports:** `ResonanceVisualizer.tsx` used both inline `export const` and a bottom-level `export {}` block for the same variables, causing "Cannot redeclare exported variable" errors.
   - **Status:** FIXED.
3. **Lockfile Drift Risk:** `deploy.yml` and `deploy/update.sh` were found to use `--no-frozen-lockfile` in some contexts, which can lead to non-deterministic production environments.

---

## Optimization Potential

### 1. Dependency Alignment
- **Vite Unification:** Aligning all packages to Vite v6.x (or v8.x where supported) would reduce the dependency graph complexity and ensure consistent plugin behavior.
- **BabylonJS Alignment:** Update root overrides to `9.9.1` to match package manifests and leverage the latest stability fixes.

### 2. CI/CD Streamlining
- **Workflow Deprecation:** `main-pipeline.yml`, `deploy.yml`, and `vps-production-deploy.yml` should be archived in favor of a single, robust Docker-based pipeline.
- **Build Caching:** Most workflows lack GitHub Actions caching for pnpm stores, leading to longer build times.
- **CI Build Strategy:** Moving the Docker build from the VPS to GitHub Actions (using `docker/build-push-action`) would prevent the frequent OOM (Out-of-Memory) errors on the 16GB VPS during the Vite/TypeScript build phase.

### 3. Structural Consistency
- **Backend Split:** There is a structural ambiguity between root-level `backend/` and `packages/backend/`. These should be merged or clearly delineated.

---

## Action Plan

### Step 1: Secure the Foundation (Completed)
- [x] Fix missing `projects/health-tech/tsconfig.json`.
- [x] Resolved redundant exports in `ResonanceVisualizer.tsx` breaking builds.
- [x] Verify lockfile integrity with `monorepo-guard.mjs`.

### Step 2: Dependency Synchronization
- [ ] Upgrade `portal` from Vite 5 to Vite 6.
- [ ] Update root `package.json` overrides for `@babylonjs/*` to `9.9.1`.
- [ ] Run `pnpm install` to update the lockfile and verify with `pnpm -r build`.

### Step 3: CI/CD Modernization
- [ ] Implement `pnpm/action-setup` caching in all active workflows.
- [ ] Enforce `--frozen-lockfile` in all deployment scripts.
- [ ] Refactor `vps-docker-deploy.yml` to use a Docker Registry instead of building on the target host.

### Step 4: Architectural Cleanup
- [ ] Merge `backend/` and `packages/backend/` into a single workspace package.
- [ ] Remove unused deployment workflows (`deploy.yml`, etc.).
