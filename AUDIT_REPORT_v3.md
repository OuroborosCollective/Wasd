# Comprehensive Repository Audit Report (v3)

**Date:** May 2024
**Auditor:** Jules (Senior DevOps & Fullstack Architect)

## Status Quo

The repository is structured as a **pnpm monorepo** containing a variety of services, libraries, and experimental projects.

- **Monorepo Structure:** Packages are spread across multiple directories (`client`, `server`, `shared`, `engine`, `portal`, `apps/*`, `packages/*`, and `projects/*`).
- **Package Management:** `pnpm` is used with `shamefully-hoist=true`. However, several maintenance scripts and CI workflows still reference `package-lock.json` or `yarn.lock`, indicating a partial or inconsistent transition from other package managers.
- **Dependency Management:** Significant version fragmentation exists for core dependencies. For example, `typescript` versions range from `5.0.0` to `5.7.3`, and `zod` versions are split between `3.22.x` and `3.23.x`.
- **TypeScript Configuration:** The monorepo uses a `tsconfig.base.json`, but inheritance is inconsistent. Some packages (`server`, `projects/eco-trader`) do not extend the base config, and many lack proper `references`, which defeats the purpose of TypeScript Project References for build optimization.
- **CI/CD:** There are multiple overlapping GitHub workflows (`main-pipeline.yml`, `ci.yml`, `deploy.yml`). The primary `main-pipeline.yml` is configured with `continue-on-error: true` for almost all steps, meaning failures in linting, typechecking, building, or testing do not stop the pipeline.
- **Deployment & Containerization:** A multi-stage `Dockerfile` exists but relies on hardcoded `COPY` commands for specific directories, making it fragile as new packages are added. Deployment scripts (`scripts/deploy-vps.sh` and `.github/workflows/deploy.yml`) use manual SSH commands and various "hacks" (like deleting directories or injecting CommonJS `package.json` files) to make the production environment work.

## Critical Errors

1. **CI/CD False Positives:** The `continue-on-error: true` setting in `main-pipeline.yml` is a critical failure. It allows code that fails tests or typechecking to be merged and potentially deployed, leading to a "broken" main branch.
2. **Broken Test Suite:** 15 out of 150 test files are currently failing (35 individual tests). These include:
   - **Environment Issues:** Many tests fail because `supabaseUrl` is missing, suggesting a lack of proper mocking or environment setup for tests.
   - **Logic Regressions:** `ChunkSystem` and `ObserverEngine` have several assertion failures (e.g., `expected undefined to be '2:3'`).
   - **Runtime Errors:** `process.chdir()` is used in tests but is not supported in Vitest worker threads.
3. **Dependency Version Mismatches:** Version collisions for `typescript`, `zod`, and `babylonjs` can lead to inconsistent behavior between local development, CI, and production, as well as potential type-checking errors that are currently being "bypassed."
4. **Fragile Deployment Hacks:** The deployment workflow's reliance on `node scripts/bypass-ts-errors.mjs` and manual directory removal (`rm -rf packages/client packages/server`) indicates a build system that is not properly configured for the target environment.

## Optimization Potential

1. **Dependency Standardization:** Aligning all packages to the same versions of core dependencies (e.g., TypeScript 5.7.3, Zod 3.23.8) will simplify the dependency graph and reduce the size of `node_modules`.
2. **TypeScript Project References:** Properly implementing Project References across the entire monorepo will significantly speed up build and type-check times by allowing TypeScript to only re-compile changed packages.
3. **CI/CD Consolidation:** Merging redundant workflows into a single, robust pipeline with proper caching and no `continue-on-error` will improve reliability and developer feedback.
4. **Docker Layer Caching:** Refining the `Dockerfile` to use a more generic approach to copying `package.json` files (e.g., using a recursive find and copy) will improve cache hits and maintainability.
5. **Environment Validation:** Implementing a centralized environment variable validation (using something like `t3-env` or a custom script) to ensure all required secrets and configs are present in every environment.

## Action Plan

### Step 1: Standardize Dependencies and Cleanup
- [ ] Run a monorepo-wide script to update `typescript`, `zod`, `vitest`, and other core libraries to their latest compatible versions.
- [ ] Remove all traces of `package-lock.json` and `yarn.lock` from scripts and `.gitignore`.
- [ ] Consolidate duplicate shared logic (e.g., move everything from `shared/` to `packages/shared/`).

### Step 2: Fix TypeScript and Build System
- [ ] Update all `tsconfig.json` files to extend `tsconfig.base.json`.
- [ ] Ensure every package has a `references` array pointing to its workspace dependencies.
- [ ] Remove `bypass-ts-errors.mjs` and fix the underlying type errors.

### Step 3: Harden CI/CD Pipeline
- [ ] Consolidate `ci.yml` and `main-pipeline.yml`.
- [ ] Remove `continue-on-error: true` from all critical CI steps.
- [ ] Add a "frozen-lockfile" check to the install step to ensure the lockfile is always up to date.

### Step 4: Fix and Stabilize Tests
- [ ] Mock external services (Supabase, Redis) in the global test setup to prevent environment-related failures.
- [ ] Refactor tests using `process.chdir()` to use absolute paths or relative path resolution.
- [ ] Address the logic regressions in `ChunkSystem` and `ObserverEngine`.

### Step 5: Modernize Deployment
- [ ] Update the `Dockerfile` to be more dynamic and robust for a monorepo.
- [ ] Replace manual SSH deployment "hacks" with a standardized deployment process (e.g., using Docker Compose on the VPS or a more modern deployment tool).
- [ ] Standardize the "CommonJS compatibility" for production in the build script itself, rather than during deployment.
