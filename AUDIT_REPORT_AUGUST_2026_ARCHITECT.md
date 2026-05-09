# Architectural & DevOps Audit Report - August 2026

## Status Quo
The repository is a sophisticated monorepo powered by **pnpm workspaces**, containing a mix of core packages, shared utilities, and specialized applications (3D rendering client, authoritative server, and various project simulations). The architecture follows a "Logic First" approach with clear separation between engine, client, and server logic.

### Current Stack:
- **Node.js:** Standardized to **v22.x** (LTS/Stable)
- **Package Manager:** pnpm v9.12.2
- **Frontend:** React 19, Babylon.js, Three.js, Vite
- **Backend:** NestJS (in apps/api), Express (in server/), Prisma, Redis, PostgreSQL
- **Language:** TypeScript 6.0.3

---

## Kritische Fehler (Korrektur-Status: BEHOBEN)
1.  **Invalid `@types/node` Versions:** FIXED. All packages standardized to `@types/node: ^22.19.18`.
2.  **TypeScript Path Alias Bypass:** FIXED. `apps/api/tsconfig.json` and others refactored to use standard workspace resolution. Removed direct source path aliases.
3.  **Environment Version Drift:** FIXED. Standardized all CI/CD (GitHub Actions), Docker containers (`Dockerfile`, `Dockerfile.production`), and deployment scripts to **Node.js 22**.
4.  **React 19 vs. React 18 Type Conflicts:** FIXED. Root `package.json` overrides updated to `@types/react: ^19.0.0` and `@types/react-dom: ^19.0.0`.

---

## Optimierungspotenzial (Status: IMPLEMENTIERT)
1.  **Strict Dependency Isolation:** IMPLEMENTED. `.npmrc` has been cleaned of all hoisting overrides (`shamefully-hoist`, `node-linker`). pnpm now uses the default **isolated** linker, preventing ghost dependencies and ensuring build reproducible.
2.  **Workflow Consolidation:** IMPLEMENTED. Redundant `ci.yml` has been removed. All CI/CD logic is now centralized in `main-pipeline.yml`, featuring optimized caching and database health checks.
3.  **Docker Build Efficiency:** Multi-stage builds are used in the production Dockerfiles, synchronized with the standardized Node.js version.
4.  **Standardized ESM/CJS Interop:** Standardized on `moduleResolution: bundler` for cross-package consistency within the workspace.

5.  **Circular Symbolic Links:** FIXED. Cleaned up redundant and circular symbolic links in `server/src` that were causing `ELOOP` (too many symbolic links) errors during CI stat operations.
6.  **Missing Direct Dependencies:** FIXED. Explicitly added `node-fetch`, `@types/node-fetch`, and `vite` to `server/package.json`. The switch to pnpm's **isolated** linker correctly identified these as missing direct dependencies (they were previously "ghosted" through hoisting).

---

## Action Plan (Finaler Status)

### Step 1: Dependency Harmonization
- [x] Update all `package.json` files to use `@types/node@^22.19.18`.
- [x] Synchronize React types to React 19.
- [x] Remove hoisting from `.npmrc`.

### Step 2: TypeScript Architecture Repair
- [x] Refactor `tsconfig.json` files to remove source path aliases.
- [x] Ensure all workspace packages are correctly listed in `tsconfig.json` `references`.

### Step 3: Infrastructure Alignment
- [x] Update root `Dockerfile` and `deploy.yml` to use **Node 22-alpine**.
- [x] Consolidate CI workflows.

### Step 4: Verification
- [x] Run `pnpm install` to regenerate lockfile.
- [x] Run `pnpm run build` monorepo-wide.
- [x] Run `pnpm run test` to ensure no regressions.
