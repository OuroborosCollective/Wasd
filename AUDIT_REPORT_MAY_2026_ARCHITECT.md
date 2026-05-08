# Senior DevOps & Fullstack Architect Audit Report - May 2026

## Status Quo
The repository is a large pnpm monorepo containing multiple applications (`apps/api`, `apps/web`, `client`, `server`, `engine`, `portal`) and a wide array of shared library packages (`packages/*`). It also includes various experimental or sub-projects in `projects/`. The codebase primarily uses TypeScript and React 19.

## 1. Package Management & PnP
- **Current Configuration**: Uses `pnpm@9.12.2` with `shamefully-hoist=true`.
- **Finding**: Plug'n'Play (PnP) is not enabled. The project relies on hoisted `node_modules`. While PnP offers stricter dependency management, the current complexity and reliance on various build tools (`tsup`, `vite`, `tsc`) make the hoisted approach more stable for now, provided it's managed correctly.
- **Improvements**: Standardized `pnpm.overrides` in the root `package.json` to enforce consistent type versions across the entire workspace.

## 2. Dependency Graph
- **Current State**: Significant version drift was observed for core dependencies (React, Vitest, @types/node).
- **Critical Errors Resolved**:
    - Fixed invalid `@types/node` versions (previously `^25.6.0`, corrected to `^22.13.1`).
    - Synchronized `vitest` to `^4.1.5` workspace-wide.
    - Unified `react` and `react-dom` to `^19.2.5` in frontend packages (`client`, `apps/web`).
    - Enforced `@types/react` and `@types/react-dom` to `^18.3.7` via root overrides to resolve React 19 / Lucide-React type compatibility issues.

## 3. TypeScript & Types
- **Current State**: Root `tsconfig.json` was missing several package and project references, breaking incremental build support (`tsc --build`).
- **Remediation**:
    - Added all missing `packages/` (logger, redis, types) to root `tsconfig.json`.
    - Added all valid `projects/` and `portal` to root `tsconfig.json`.
    - Fixed `client/tsconfig.json` by removing redundant path aliases for `@wasd/shared`, ensuring it uses the proper project reference from `packages/shared`.
    - Established a valid entry point for `@wasd/types` (`packages/types/src/index.ts`).

## 4. Workflows & CI/CD
- **Finding**: Hardcoded production infrastructure details (IP addresses) were present in the main pipeline.
- **Remediation**:
    - Replaced the hardcoded IP `46.202.154.25` in `.github/workflows/main-pipeline.yml` with the secret `${{ secrets.PRODUCTION_IP }}`.
    - Verified that caching for pnpm is correctly configured in the workflow.

## 5. Deployment & Environments
- **Finding**: Deployment scripts and Dockerfiles are functional but could be further optimized for image size.
- **Action Taken**: Ensured `NODE_ENV=production` is used during builds. Recommended further move towards `pnpm deploy` for isolated package deployments.

## Kritische Fehler (Resolved)
1. **Invalid Dependency Versions**: Corrected `@types/node` from non-existent `^25.6.x` to `^22.13.1`.
2. **Broken Build Graph**: Restored missing TypeScript project references, allowing `tsc` to correctly resolve internal dependencies.
3. **Security/Maintenance Risk**: Removed hardcoded IP from CI/CD pipeline.
4. **Missing Entry Points**: Fixed `@wasd/types` missing source files which caused resolution errors in dependent packages.

## Optimierungspotenzial
1. **ESM Transition**: The `server` package and some `apps/` still face ESM-related import issues (missing file extensions). A systematic migration to full ESM compliance is recommended.
2. **Prisma Synchronization**: Ensure Prisma schemas are centralized or better synchronized between `packages/database` and `apps/api`.
3. **PnP Migration**: While currently hoisted, a long-term goal should be moving to a strict PnP setup to eliminate "ghost dependencies" once the build toolchain is fully compatible.

## Action Plan (Completed)
1. ✅ **Update Root Configuration**: Implemented `pnpm.overrides`.
2. ✅ **Synchronize Dependencies**: Updated all `package.json` files for core apps and shared packages.
3. ✅ **Repair TS Build Graph**: Updated root `tsconfig.json` and client config.
4. ✅ **Secure CI/CD**: Migrated to secrets for sensitive infrastructure data.
5. ✅ **Establish Package Integrity**: Fixed `@wasd/types` entry point.
6. ✅ **Verify & Test**: Confirmed successful builds for core packages and passed all client-side regression tests.
