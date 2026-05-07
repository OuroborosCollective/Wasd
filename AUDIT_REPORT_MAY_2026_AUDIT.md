# Comprehensive Monorepo Audit Report - May 2026

## Status Quo
The repository is a sophisticated pnpm-based monorepo containing a browser-based Android MMORPG. It is structured into `apps/`, `packages/`, `projects/`, and core `client`/`server` directories.
- **Package Management:** pnpm@9.12.2 with `shamefully-hoist=true`.
- **Frontend:** Babylon.js 9.5.2, React (split between 18 and 19), Three.js 0.169.0.
- **Backend:** Node.js 20+, Express, NestJS (split between 10 and 11), PostgreSQL (Supabase), Redis.
- **Infrastructure:** Dockerized production builds, GitHub Actions CI/CD pipelines, PM2 for VPS deployment.
- **TypeScript:** Utilizes project references, but implementation is incomplete across `projects/`.

---

## Kritische Fehler
1. **Dependency Version Drift:**
   - **React:** `@wasd/client` is on `^18.2.0`, while `@wasd/web` and several packages are on `^19.2.5`. This causes significant type conflicts and potentially incompatible runtime behavior in shared components.
   - **NestJS:** `@wasd/server` uses `^10.3.3`, whereas `@wasd/api-core` uses `^11.0.10`.
   - **@types:** Inconsistent `@types/react` versions (18 vs 19) lead to build-time errors when cross-referencing packages.

2. **Broken Build Graph:**
   - Most directories in `projects/` (e.g., `projects/eco-trader`, `projects/arena`, etc.) lack `tsconfig.json` files or are not included in the root `tsconfig.json` `references`. This prevents `tsc -b` from correctly validating or building the entire monorepo.
   - `@wasd/types` lacks `main` and `types` entries in its `package.json`, making it unusable by other packages without direct path imports.

3. **CI/CD Security:**
   - (Resolved during audit) Hardcoded IP address `46.202.154.25` was present in `main-pipeline.yml`.

---

## Optimierungspotenzial
1. **Package Management & PnP:**
   - `shamefully-hoist=true` is currently necessary due to ghost dependencies but should be phased out in favor of strict dependency declarations to enable a move towards Plug'n'Play (PnP) or `node-linker=hoisted` without shame.
   - Some packages (`@wasd/logger`, `@wasd/redis`) point their `main` entry directly to `.ts` source files. This works in dev but can cause issues in production if not handled by a bundler.

2. **CI/CD Efficiency:**
   - The "Wait-for-it Health Check" in `main-pipeline.yml` is essentially a 300s polling loop that can block the pipeline for long durations. A more targeted health check or a "deploy-and-verify" strategy in a separate job would be more efficient.
   - Standardize Node.js and pnpm versions across all workflow files (some still use older patterns).

3. **TypeScript Strictness:**
   - `tsconfig.json` in `server/` has `strict: false`. Standardizing on `strict: true` across the entire monorepo would significantly reduce runtime bugs.

---

## Action Plan

### Step 1: Dependency Synchronization
- Update all packages to `react@^19.2.5` and `@types/react@^19.2.14`.
- Update `@wasd/server` to NestJS 11 to match `@wasd/api-core`.
- Synchronize `three` and `@babylonjs/core` to exact versions (0.169.0 and 9.5.2) across the workspace.

### Step 2: Build Graph Completion
- Generate missing `tsconfig.json` files for all sub-packages.
- Update the root `tsconfig.json` to include all workspace members in the `references` array.
- Fix `package.json` entry points for `@wasd/types`, `@wasd/logger`, and `@wasd/redis`.

### Step 3: CI/CD Robustness
- Move the production IP and other environment-specific values to GitHub Secrets.
- Optimize the `Dockerfile` by using a multi-stage build that properly leverages pnpm's `deploy` command for each specific application.
- Implement automated dependency drift detection in CI.

### Step 4: Governance
- Remove `shamefully-hoist=true` and resolve the resulting "module not found" errors by explicitly adding missing peer dependencies.
- Enforce the use of `workspace:*` for all internal package references.
