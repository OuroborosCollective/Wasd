# Audit Report - August 2027 - Senior DevOps & Fullstack Architect

## Status Quo
The repository is a TypeScript-based monorepo managed with **pnpm**. It utilizes an `isolated` node-linker (strict dependency boundaries) and is structured into `apps/`, `packages/`, and `projects/`. The ecosystem is currently transitioning to **React 19** and **TypeScript 6.0**.

## Critical Errors

### Fixed during this Audit:
1.  **Workspace Integrity (pnpm-workspace.yaml):** The `projects/` directory was incorrectly mapped as a single package instead of a glob (`projects/*`). This caused **18 projects** to be completely ignored by the pnpm workspace, leading to broken dependency links and missing build targets.
2.  **Dockerfile Syntax Error:** The production Dockerfile had a chained `RUN` command syntax error (`apk add ... RUN pnpm ...`) which would have caused immediate build failure in any CI/CD environment.
3.  **React Version Mismatch (apps/client-2d):** Found a critical conflict where `react@19` was paired with `react-dom@18` and React 18 type definitions. This would lead to runtime instability and hydration errors.
4.  **Deployment Port Mismatch:** The `vps-deploy.yml` workflow was checking port `3000` while `docker-compose.prod.yml` mapped the application to port `80`. This would cause the CI to report deployment failure even if the app was healthy.
5.  **Redundant Install Script:** The root `package.json` contained an `"install": "pnpm install -r"` script. This is dangerous in pnpm environments as it can cause recursive installation loops and ignores the `pnpm-lock.yaml` in CI.

### Identified (Pre-existing):
1.  **Build Blockers:** `@wasd/server` and `@arelorian/core-network` have extensive TypeScript errors (100+) that prevent a successful `pnpm build` across the monorepo. These range from missing module declarations to type mismatches in core logic.

## Optimization Potential
1.  **Dependency Synchronization:** While root `pnpm.overrides` are used, several sub-packages still define conflicting versions of core libraries (e.g., Vite, Vitest).
2.  **Docker Layer Caching:** The current `Dockerfile.prod` copies all source code before `pnpm install`. For larger monorepos, it is recommended to use `pnpm fetch` or copy only `package.json` files first to maximize cache hits.
3.  **CI Build Filtering:** The use of `--filter "...[origin/main]"` is efficient but relies heavily on correct `tsconfig` references. Some projects were missing from the root `tsconfig.json` references list.

## Action Plan (Completed & Recommended)

### Step 1: Core Infrastructure Fixes (COMPLETED)
- [x] Update `pnpm-workspace.yaml` with correct glob patterns.
- [x] Fix `Dockerfile.prod` syntax and update to `--frozen-lockfile`.
- [x] Correct health check ports in CI workflows.
- [x] Remove redundant scripts from root `package.json`.

### Step 2: Dependency Alignment (COMPLETED)
- [x] Synchronize React 19 and TS 6 across `apps/client-2d`.
- [x] Regenerate `pnpm-lock.yaml` with full workspace visibility.

### Step 3: Codebase Hardening (RECOMMENDED)
- [ ] **Fix @arelorian/core-network:** Resolve the `number | undefined` assignment error in `network.ts`.
- [ ] **Fix @wasd/server:** Address the bulk type errors in `OuroborosLoop.ts` and `QuestService.ts`.
- [ ] **Standardize UI Deps:** Align `@testing-library` and `vite` versions across `apps/web` and `apps/client-2d` to avoid peer dependency warnings.

### Step 4: Docker Optimization (RECOMMENDED)
- [ ] Transition to a `pnpm fetch` based install in `Dockerfile.prod` to reduce build times by ~40%.
