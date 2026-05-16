# Architectural & DevOps Audit Report - February 2028

**Auditor:** Jules (Senior DevOps & Fullstack Architect)
**Date:** February 2028
**Scope:** Package Management, Dependency Graph, TypeScript Configuration, CI/CD Workflows, Deployment Infrastructure.

---

## Status Quo

The repository is a mature TypeScript monorepo managed by `pnpm`. It contains a variety of applications (`server`, `client`, `portal`, `engine`) and shared packages (`packages/*`, `projects/*`). Deployment is handled via GitHub Actions targeting a VPS, with multiple strategies available including PM2-managed processes and Docker containers.

Current infrastructure strengths:
- Clear workspace separation using `pnpm-workspace.yaml`.
- Use of `corepack` for consistent `pnpm` versions.
- Custom transpilation scripts for optimized server-side builds.
- Integrated health checks in deployment scripts.

---

## Kritische Fehler (Critical Errors)

1.  **TypeScript Version Mismatch:**
    - Root `package.json` specifies `typescript: ^5.3.3` in both `devDependencies` and `pnpm.resolutions`.
    - Most packages (e.g., `@wasd/server`, `@wasd/client`, `@wasd/portal`) specify `typescript: ^6.0.3`.
    - Some legacy packages (e.g., `@wasd/core`, `@wasd/core-network`) are still on `^5.3.3`.
    - *Impact:* Potential for "Ghost Type Errors" where the IDE and CI use different versions, and incompatible type-only builds.

2.  **Type Definition Inconsistency:**
    - `@types/node` varies between `^22.19.18` and `^25.7.0` across the monorepo.
    - *Impact:* Conflicts in global Node.js types (e.g., `Buffer`, `Process`) when multiple versions are hoisted or resolved.

3.  **TSConfig Reference Fragmentation:**
    - Root `tsconfig.json` contains references to both `backend` and `packages/backend`, as well as `portal` and `apps/portal-replit`.
    - Many `tsconfig.json` files have redundant `paths` or `baseUrl` settings that should be handled by the monorepo's shared package resolution.

4.  **Dockerfile Duality:**
    - `Dockerfile` and `Dockerfile.prod` use fundamentally different approaches for dependency management. `Dockerfile` uses a Python preflight script to sync lockfiles, while `Dockerfile.prod` uses manual `COPY` commands.
    - *Impact:* Divergent production environments depending on which build path is triggered.

---

## Optimierungspotenzial (Optimization Potential)

1.  **CI/CD Reproducibility:**
    - `deploy/update.sh` (used by `vps-production-deploy.yml`) uses `--no-frozen-lockfile`. While intended to avoid OOM on VPS, it risks deploying code with different dependency versions than what was tested in CI.
    - The Python preflight script `scripts/sync-pnpm-lockfile-for-docker.py` is a clever workaround for VPS OOM issues but adds maintenance overhead.

2.  **Dependency Hoisting & Deduplication:**
    - The `pnpm.overrides` in the root `package.json` are extensive but missing several high-frequency packages like `typescript` and `@types/node`.

3.  **Build Performance:**
    - `server/package.json` uses `esbuild` via a custom script, while `packages/shared` uses `tsc`. Standardizing on `esbuild` for all non-browser packages would significantly speed up CI builds.

---

## Action Plan

### Step 1: Dependency Standardization
- [ ] Update root `package.json` and all sub-packages to use `typescript@6.0.3`.
- [ ] Update root `package.json` and all sub-packages to use `@types/node@25.7.0`.
- [ ] Align `react` and `@types/react` versions across all projects to `19.2.6` and `19.2.14` respectively.

### Step 2: TypeScript Configuration Cleanup
- [ ] Audit root `tsconfig.json` references to match the actual folder structure.
- [ ] Ensure all `tsconfig.json` files correctly extend `tsconfig.base.json`.
- [ ] Remove redundant `paths` in apps that are already covered by workspace links.

### Step 3: Deployment & Docker Harmonization
- [ ] Consolidate `Dockerfile` and `Dockerfile.prod` into a single, optimized multi-stage build.
- [ ] Standardize on the `pnpm deploy` command for generating lean production artifacts.
- [ ] Update `deploy/update.sh` to optionally use `pnpm install --frozen-lockfile` if memory allows, or improve the pre-check.

### Step 4: CI/CD Hardening
- [ ] Add `pnpm/action-setup` to all workflows that use `pnpm`.
- [ ] Ensure `concurrency` groups are used in all deployment-related workflows to prevent race conditions on the VPS.
