# Repository Audit Report - August 2026

## Status Quo
The repository is a sophisticated **pnpm monorepo** containing multiple applications (`apps/`, `client/`, `server/`, `engine/`, `portal/`), shared internal packages (`packages/`), and various specialized projects (`projects/`). It uses TypeScript across the board and leverages `pnpm` workspaces for dependency management.

## 1. Package Management & PnP
- **Current State**: Standard `node_modules` structure with `shamefully-hoist=true`. `pnpm@9.12.2` is the primary version used, though some CI workflows use `v10`.
- **Issues**:
    - **Workspace Cleanup**: `pnpm-workspace.yaml` references a non-existent `tooling/*` directory.
    - **Hoisting Risks**: `shamefully-hoist=true` is active, which can lead to ghost dependencies and masks missing dependency declarations.

## 2. Dependency Graph
- **Current State**: Standardized on many core versions, but drift persists.
- **Issues**:
    - **React Version Drift**: `client/` uses React 18, while `apps/web/` and others use React 19.
    - **Inconsistent CI Environments**: Different pnpm versions across workflows can lead to subtle lockfile discrepancies.

## 3. TypeScript & Types
- **Current State**: Root-level project references are used to manage the build graph.
- **Issues**:
    - **Incomplete Build Graph**: Several packages/apps (`portal`, `apps/portal-replit`, many `projects/*`) are missing from the root `tsconfig.json` references.
    - **Architectural Debt in Client**: `client/tsconfig.json` uses direct path aliases to `../packages/shared/src/*`. This bypasses the project reference system and forces re-compilation of shared code instead of using its built artifacts.

## 4. Workflows & CI/CD
- **Current State**: Multiple overlapping workflows (`ci.yml`, `main-pipeline.yml`).
- **Issues**:
    - **Security Risk**: Hardcoded IP address `46.202.154.25` in `main-pipeline.yml`.
    - **Inefficiency**: `ci.yml` has a redundant `install` job that doesn't share artifacts effectively with subsequent jobs.

## 5. Deployment & Environments
- **Current State**: Multi-stage Docker builds and shell-based VPS deployment.
- **Issues**:
    - **Fragile Deployment Script**: `scripts/deploy-vps.sh` lacks error handling (`set -e`) and uses hardcoded placeholders.

---

## Kritische Fehler (Critical Errors)
1. **Hardcoded Infrastructure IP**: Potential security and maintenance risk.
2. **Broken TypeScript Graph**: Incomplete references in root `tsconfig.json` prevent reliable `tsc --build` execution.

## Optimierungspotenzial (Optimization Potential)
1. **CI Consolidation**: Streamline CI workflows to reduce execution time and credit usage.
2. **Path Alias Refactoring**: Move from source-level aliases to proper project references for internal package consumption.

---

## Action Plan
1. **Cleanup Configuration**: Remove invalid workspace entries.
2. **Standardize CI**: Align Node/pnpm versions and secure infrastructure details via secrets.
3. **Dependency Sync**: Update `client` to React 19 and harmonize Vitest versions.
4. **TS Graph Repair**: Complete root `tsconfig.json` references and fix `client/tsconfig.json`.
5. **Deployment Hardening**: Improve robustness of `deploy-vps.sh`.
6. **Full Validation**: Run monorepo-wide build and test suites.
