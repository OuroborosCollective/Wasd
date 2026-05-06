# Comprehensive Monorepo & Architecture Audit Report - May 2026 (v9)

## Status Quo
The repository is a TypeScript-based monorepo using **pnpm workspaces**. It has evolved to include a significant number of packages across `apps/`, `packages/`, and `projects/`, as well as root-level project directories.
- **Package Management:** pnpm 9.12.2 is now standardized across `package.json`, `Dockerfile`, and GitHub workflows.
- **Workspace Configuration:** `pnpm-workspace.yaml` has been restored to include `client`, `server`, `engine`, `portal`, and the `projects/` folder.
- **TypeScript:** Adoption of `tsconfig.base.json` is improved. Project References are corrected with `composite: true` where necessary.
- **CI/CD:** Deployment paths in `deploy.yml` have been corrected to match the actual directory structure.

## Kritische Fehler (Blocking) - REPOSSESSED & FIXED
1. **Broken Workspace Graph:** FIXED. `pnpm-workspace.yaml` updated.
2. **TypeScript Composite Mismatch:** FIXED. `server/tsconfig.json` and others corrected.
3. **Deployment Path Mismatches:** FIXED. `deploy.yml` updated with correct paths.
4. **Bypassing Type Safety:** FIXED. Removed `bypass-ts-errors.mjs` from pipelines.

## Optimierungspotenzial
1. **Dependency Alignment:**
   - `typescript`: Unified to `^5.7.3`.
   - `vitest`: Unified to `^4.1.5`.
   - `zod`: Unified to `^3.23.8`.
2. **Docker Efficiency:** `Dockerfile` updated to pnpm 9.12.2. Further optimization with `pnpm deploy` is recommended for future phases.
3. **CI/CD Caching:** `main-pipeline.yml` verified for caching efficiency.

## Action Plan (Completed)

### Step 1: Workspace & Dependency Restoration
- [x] Update `pnpm-workspace.yaml` to include `client`, `server`, `engine`, `portal`, and `projects/*`.
- [x] Convert all internal references in `package.json` to use the `workspace:*` protocol.
- [x] Align `typescript` to `^5.7.3`, `vitest` to `^4.1.5`, and `zod` to `^3.23.8` monorepo-wide.

### Step 2: TypeScript & Type-Safety Hardening
- [x] Set `composite: true` in `server/tsconfig.json` and ensure all packages have `declaration: true`.
- [x] Update packages to extend `tsconfig.base.json` where missing.
- [x] Remove `scripts/bypass-ts-errors.mjs` from build pipelines.

### Step 3: CI/CD & Deployment Fixes
- [x] Update `deploy.yml` with correct paths (`client/dist` and `server/dist`).
- [x] Synchronize pnpm versions across `Dockerfile`, `package.json`, and all GitHub workflows to `9.12.2`.
- [x] Re-establish `--frozen-lockfile` for production builds.

### Step 4: Verification
- [x] Run `pnpm install` to regenerate the lockfile with the expanded workspace.
- [x] Run `pnpm build` and `pnpm test` to ensure all projects are correctly linked and functional.
