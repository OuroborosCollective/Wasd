# Repository Audit Report - November 2026

## Status Quo
The repository is a large TypeScript monorepo using pnpm workspaces. It contains multiple applications (`apps/`), core logic packages (`packages/`), and specialized project modules (`projects/`). It uses a centralized `main-pipeline.yml` for CI/CD but suffers from historical baggage in the form of redundant workflow files and inconsistent dependency versions across packages.

## Kritische Fehler (Critical Errors)
1.  **Dependency Version Drift:** Severe version mismatches for `@types/node` (v22 vs v25) and React types (v18 vs v19). This can lead to subtle type-checking failures or runtime issues due to inconsistent type definitions.
2.  **TypeScript Reference Bypass:** Some packages (e.g., `apps/api`, `server`) use `paths` in `tsconfig.json` to point directly to source files of other packages, bypassing the intended project reference graph. This leads to slower builds and potential compilation issues.
3.  **CI/CD Redundancy:** Multiple overlapping workflows in `.github/workflows/` (e.g., `ci.yml`, `MMORPG Smart CI v5`) create confusion and waste CI resources.

## Optimierungspotenzial (Optimization Potential)
1.  **Strict Dependency Resolution:** Removing `shamefully-hoist=true` and switching to `node-linker=isolated` in `.npmrc` will enforce strict dependency boundaries and eliminate ghost dependencies.
2.  **Standardized Tooling:** Aligning all packages to use the same versions of TypeScript, React types, and Node types will simplify maintenance.
3.  **Modernized Production Runtime:** Updating to Node.js v22 and optimizing the Dockerfile healthcheck will improve performance and reliability.
4.  **Workflow Consolidation:** Consolidating all CI/CD logic into `main-pipeline.yml` and removing legacy files.

## Action Plan
1.  **Phase 1: Standardization**
    *   Update `.npmrc` to enforce strict linking.
    *   Synchronize core dependencies (`typescript`, `@types/*`, `react`, `three`) monorepo-wide via root overrides and package updates.
2.  **Phase 2: TypeScript Refactoring**
    *   Clean up `tsconfig.base.json`.
    *   Repair project references and remove redundant source-path aliases.
3.  **Phase 3: Infrastructure & CI/CD**
    *   Prune redundant `.github/workflows`.
    *   Modernize `Dockerfile` and deployment scripts.
4.  **Phase 4: Validation**
    *   Run full workspace build, type-check, and tests.
