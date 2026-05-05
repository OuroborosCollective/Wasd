# Comprehensive Architectural & DevOps Audit Report - Wasd Monorepo

## Status Quo
The repository is a TypeScript-based monorepo managed with `pnpm` workspaces. It architecture comprises a main game client, a server, an engine, and several auxiliary applications and shared packages.

Current infrastructure highlights:
- **Package Manager:** `pnpm@9.1.0`
- **TypeScript:** Standardized on modern ESNext targets.
- **CI/CD:** GitHub Actions for build, test, and deployment.
- **Deployment:** Docker-based with Alpine/Node:20 base images.

---

## Kritische Fehler (Critical Errors)

### 1. Dependency Protocol Ambiguity (Registry 404 Risk)
**Issue:** Multiple packages (`areloria-client`, `@wasd/api`, `@wasd/web`) were referencing internal workspace packages using `*` or specific versions instead of the `workspace:*` protocol.
**Impact:** During fresh installs, `pnpm` might attempt to fetch these from the public npm registry. Since these are private packages, it results in `ERR_PNPM_FETCH_404`, breaking fresh environment setups and CI/CD pipelines.
**Resolution:** All internal references have been standardized to `workspace:*`.

### 2. Phantom Workspace Redundancy
**Issue:** `packages/client` and `apps/client` existed as redundant skeletons, causing confusion with the primary root `client` package. The deployment script even had manual `rm -rf` hacks to deal with this.
**Impact:** Non-deterministic build behavior and workspace naming collisions.
**Resolution:** Redundant skeleton directories have been removed.

### 3. CI/CD Tooling Mismatch
**Issue:** `deploy.yml` was configured to use `pnpm@8`, while the root `package.json` enforced `>=9.0.0`.
**Impact:** Lockfile inconsistencies and potential runtime failures in production due to different hoisting/resolution algorithms.
**Resolution:** Updated CI workflows to use `pnpm@9.1.0`.

### 4. Broken TypeScript Project Reference Chain
**Issue:** `packages/core-logic` was configured with `composite: false`, breaking incremental builds and project references for its dependents.
**Impact:** Slower build times and potential type-checking elision in large-scale refactors.
**Resolution:** Enabled `composite` and `incremental` modes for key packages.

---

## Optimierungspotenzial (Optimization Potential)

### 1. Testing Environment Fragmentation
**Issue:** `vitest` versions were fragmented (ranging from 1.3.1 to 4.1.0).
**Improvement:** Synchronized all workspace test runners to `vitest@4.1.0` to ensure feature parity and consistent snapshot/assertion behavior.

### 2. Hoisting Predictability
**Issue:** No explicit `.npmrc` was defined, leaving hoisting behavior to pnpm's default (which can vary).
**Improvement:** Added `.npmrc` with `shamefully-hoist=true` to ensure legacy compatibility while transitioning to stricter monorepo patterns.

### 3. Missing Build Artifact Exclusion
**Issue:** `.tsbuildinfo` files were being tracked in git.
**Improvement:** Added `*.tsbuildinfo` to `.gitignore` to prevent repository bloat and transient merge conflicts.

---

## Action Plan (Completed)

1. **Workspace Consolidation:** Removed redundant `packages/client` and `apps/client`.
2. **Dependency Fix:** Standardized all `@wasd/*` dependencies to `workspace:*`.
3. **Tooling Alignment:** Synchronized pnpm versions in `.github/workflows/deploy.yml`.
4. **TS Configuration:** Enabled `composite` builds for `core-logic` and aligned `moduleResolution` for `eco-trader`.
5. **Testing Sync:** Unified `vitest` versions across the monorepo.
6. **Hardening:** Created root `.npmrc` and updated `.gitignore`.
7. **Validation:** Successfully verified monorepo build and test integrity.

---
**Audit performed by: Jules (Senior DevOps & Fullstack Architect)**
