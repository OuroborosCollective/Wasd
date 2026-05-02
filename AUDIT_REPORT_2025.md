# Repository Audit Report 2025

## Status Quo
The repository is structured as a TypeScript monorepo using **pnpm** as the primary package manager. It contains a mix of core libraries, applications, and experimental projects. However, the monorepo is currently in a "hybrid" state with remnants of Yarn PnP and npm, leading to configuration drift and potential build failures.

- **Package Management:** `pnpm-workspace.yaml` is present, but `package-lock.json` and `.pnp.cjs` files exist in several directories.
- **Project Structure:** Redundant directory structures exist (e.g., `server/` at root vs `apps/server/` vs `packages/server/`).
- **TypeScript:** Versions range from 5.0.0 to 6.0.0 across different packages, and `tsconfig` inheritance is inconsistent.
- **CI/CD:** Multiple overlapping workflows (`ci.yml`, `main-pipeline.yml`, `deploy.yml`) with varying levels of maturity.
- **Deployment:** The `Dockerfile` uses `npm` and references `node:25-alpine`, while the rest of the ecosystem targets Node 20.

## Kritische Fehler (Critical Errors)
1. **Workspace Fragmentation:** Overlapping workspace definitions in `pnpm-workspace.yaml` and root `package.json` cause name collisions (e.g., `@wasd/client-app` vs `@wasd/client-pkg`).
2. **Lockfile Conflicts:** Presence of `package-lock.json` and `pnpm-lock.yaml` creates "ghost dependencies" and non-deterministic builds.
3. **Broken Deployment Path:** The root `Dockerfile` is a single-stage-style build that does not account for workspace dependencies, making it impossible to build the `server` or `client` without the `shared` library being correctly linked.
4. **Environment Mismatch:** CI/CD uses Node 20, but the Dockerfile targets Node 25 (experimental), and the root `engines` field specifies `^20.0.0`.
5. **Legacy PnP Artifacts:** `.pnp.cjs` and `.yarnrc.yml` interfere with standard Node.js module resolution when tools don't explicitly support PnP.

## Optimierungspotenzial (Optimization Potential)
1. **Dependency Standardization:** Synchronize all packages to TypeScript `^5.7.3` and use the `workspace:*` protocol for internal dependencies.
2. **Unified Workspace Config:** Consolidate `package.json` `workspaces` and `pnpm-workspace.yaml`.
3. **Multi-stage Docker Builds:** Implement a monorepo-aware Dockerfile that leverages `pnpm fetch` for better layer caching.
4. **Pruning:** Remove redundant root-level directories (`client/`, `server/`, `shared/`) in favor of the `apps/` and `packages/` structure.

## Action Plan
1. **Cleanup Phase:**
   - Delete all `package-lock.json` files.
   - Delete `.pnp.cjs`, `.pnp.loader.mjs`, and `.yarnrc.yml`.
2. **Standardization Phase:**
   - Update root `package.json` "workspaces" to match `pnpm-workspace.yaml`.
   - Update all `package.json` files to TypeScript `^5.7.3`.
   - Resolve package name collisions (standardize on `@wasd/` prefix).
3. **Infrastructure Phase:**
   - Refactor `Dockerfile` to use `pnpm` and Node 20-alpine.
   - Update GitHub Actions to use optimized `pnpm` caching.
4. **Verification Phase:**
   - Run `pnpm install` to stabilize the lockfile.
   - Execute `pnpm -r build` and `pnpm -r test` to ensure monorepo integrity.
