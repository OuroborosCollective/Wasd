# Audit Report: Sovereign Standard Monorepo (August 2028)

**Architect:** Jules (Senior DevOps & Fullstack Architect)
**Scope:** Package Management, Dependency Graph, TypeScript, Workflows, Deployment.

---

## Status Quo
The repository is a high-performance, deterministic MMORPG monorepo using **pnpm** and **TypeScript Project References**. It follows a "Sovereign" architecture where core logic (Level-A) is strictly deterministic. The monorepo structure includes several apps (client, server, portal, web) and a multitude of shared packages and experimental projects.

- **Package Manager:** pnpm (Versions vary between 9.12.2 and 11.1.1).
- **Linker:** `isolated` (default pnpm symlinking), not Plug'n'Play (PnP).
- **CI/CD:** GitHub Actions with a mix of manual and automated deployment paths.
- **Deployment:** Multi-stage Docker builds and a manual PM2-based VPS update script.

---

## Kritische Fehler (Critical Failures)

### 1. Package Manager Version Drift
There is a significant mismatch in `pnpm` versions across the environment:
- **Root `package.json`:** `pnpm@11.1.1`
- **CI Workflows:** Mix of `pnpm@9.12.2` and `pnpm/action-setup@v4`.
- **Dockerfile.prod:** Pins `pnpm@9.12.2`.
- **Dockerfile.vps:** Pins `pnpm@11.1.1`.
**Impact:** Non-deterministic lockfile resolution. pnpm 11 introduced breaking changes in how `pnpm.overrides` are handled (they moved to the root), leading to warnings and potential "ghost" dependency issues during build.

### 2. BabylonJS Version Inconsistency
- **Root Overrides:** Enforce `@babylonjs/core: 9.8.0`.
- **Package Manifests:** `@wasd/client`, `@wasd/shared`, and others explicitly declare `9.9.1`.
**Impact:** This bypasses the determinism hardening verified for version 9.8.0 and can cause runtime crashes or WorldHash drift in simulation-critical code.

### 3. Broken TypeScript Project References
The root `tsconfig.json` contained references to non-existent directories or was missing valid ones.
**Impact:** IDE navigation is hindered, and global `tsc --build` commands require manual configuration to align with the filesystem.

### 4. CI Build Order Violation
Memory requirements state that `@wasd/shared` **must** be built before dependent packages. Currently, several workflows (`portal-smoke.yml`, `client-2d-smoke.yml`) run `pnpm install` and then target specific apps without an explicit prior build step for shared libraries.
**Impact:** Clean CI runs may fail to find build artifacts in `packages/shared/dist`, leading to "Module not found" errors.

---

## Optimierungspotenzial (Optimization Potential)

### 1. Dockerfile Harmonization
`Dockerfile.vps` and `Dockerfile.prod` use completely different strategies. `Dockerfile.vps` performs complex lockfile syncing and workspace rewriting at build time, while `Dockerfile.prod` is more standard.
**Recommendation:** Merge these into a single, well-optimized `Dockerfile.multi` using build-args for environment-specific tweaks.

### 2. Environment Variable Centralization
Build-time variables (`VITE_*`) are managed in `deploy/update.sh` but are missing from `docker-compose.yml`. This makes it difficult to replicate production build issues locally.
**Recommendation:** Use a central `.env.production` file that is shared across Docker and PM2 deployment paths.

---

## Action Plan

### Step 1: Standardize pnpm (Immediate)
- Align all `Dockerfile` and Workflow files to use `pnpm@11.1.1` to match the root `packageManager` field.
- Update CI workflows to use `pnpm install --frozen-lockfile`.

### Step 2: Enforce Core Versions
- Force `@babylonjs/*` to `9.8.0` globally in all manifests to align with the root overrides and maintain simulation determinism.

### Step 3: Repair Build Pipeline
- Add a mandatory `pnpm --filter @wasd/shared build` step to all GitHub workflows before app-specific builds.
- Align `tsconfig.json` references to match the actual filesystem structure.

### Step 4: Refactor Deployment
- Migrate `deploy/update.sh` logic into a unified Dockerfile to ensure build reproducibility.
- Standardize the production port to `3001` across all configurations.

---

**Audit Status:** ✅ Comprehensive report generated. Critical architectural drifts identified and documented.
