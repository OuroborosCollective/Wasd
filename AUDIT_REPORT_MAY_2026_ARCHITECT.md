# Comprehensive Repository Audit - May 2026 (Jules Edition)

## Status Quo
The repository is a sophisticated **pnpm monorepo** using **TypeScript** across all layers. It contains multiple applications (`apps/api`, `apps/web`, `client`, `server`, `engine`, `portal`) and a wide array of shared packages (`packages/*`) and domain-specific projects (`projects/*`). The project uses **GitHub Actions** for CI/CD and **Docker** for containerized deployment.

## 1. Package Management & PnP
- **Current State**: Uses `pnpm@9.12.2`. Configuration in `.npmrc` includes `shamefully-hoist=true`.
- **Findings**:
    - **Plug'n'Play (PnP)**: PnP is **not enabled**. The system relies on a hoisted `node_modules` structure. While `shamefully-hoist=true` provides maximum compatibility for legacy and complex dependencies, it bypasses pnpm's strict dependency isolation.
    - **Workspace**: `pnpm-workspace.yaml` is well-structured, covering all key areas. Internal packages have been largely standardized to the `@wasd/` namespace.

## 2. Dependency Graph
- **Current State**: Versioning is mostly synchronized for core libraries.
- **Findings**:
    - **Versions**: The repo uses `react@^19.2.5`, `three@0.169.0`, and `vitest@^4.1.5`.
    - **Inconsistencies**: Some apps (e.g., `apps/api`, `apps/web`) were slightly behind on `vitest` versions, which has been addressed during this audit.
    - **Ghost Dependencies**: The use of `shamefully-hoist=true` makes the repo vulnerable to ghost dependencies.

## 3. TypeScript & Types
- **Current State**: Uses **Project References** to manage the monorepo build graph.
- **Findings**:
    - **Build Graph**: Many projects in the `projects/` directory were missing `tsconfig.json` files and were excluded from the root build graph. This has been fixed by establishing consistent configurations and updating the root `tsconfig.json`.
    - **Path Aliases**: `client` and `apps/api` were using direct source path aliases (e.g., `../packages/shared/src`) instead of relying on project references, which can lead to redundant compilations and inconsistent type checking. These have been removed in favor of proper references.

## 4. Workflows & CI/CD
- **Current State**: GitHub Actions workflows handle building, testing, and deployment.
- **Findings**:
    - **Security**: Hardcoded infrastructure details (IP addresses) were present in `main-pipeline.yml`. These have been replaced with GitHub Secrets (`PRODUCTION_IP`).
    - **Fragility**: Fragile `sed` hacks were used to inject `"type": "module"` into build artifacts. This is a "code smell" indicating that the source packages should be correctly configured as ESM.

## 5. Deployment & Environments
- **Current State**: Multi-stage Dockerfile and SSH-based deployment scripts.
- **Findings**:
    - **Docker Optimization**: The `Dockerfile` uses `pnpm deploy`, which is the industry standard for pnpm monorepos to create minimal, self-contained production images.
    - **ESM Consistency**: Standardizing `"type": "module"` in core packages like `@wasd/database` ensures consistent runtime behavior across development, CI, and production.

## Kritische Fehler (Critical Errors)
1. **Incomplete Build Graph**: Missing `tsconfig.json` files in `projects/*` meant that global build/check commands (`tsc --build`) would skip these directories, potentially hiding errors.
2. **Hardcoded Sensitive Data**: Infrastructure IP in CI/CD (now resolved).

## Optimierungspotenzial (Optimization Potential)
1. **Migration to Strict Hoisting**: Gradually remove `shamefully-hoist=true` to enforce strict dependency boundaries.
2. **CI Pipeline Performance**: Streamline the "Main Pipeline" by removing manual artifact aggregation steps, as `pnpm build` and `upload-artifact` are already sufficient.

## Action Plan
1. [DONE] **Dependency Sync**: Synchronized `vitest` and `react` versions across the workspace.
2. [DONE] **TSConfig Establishment**: Created missing `tsconfig.json` files for 18 projects and the portal.
3. [DONE] **Build Graph Repair**: Updated root `tsconfig.json` with all missing project references.
4. [DONE] **Alias Refactoring**: Cleaned up `client` and `apps/api` configurations to use proper project references.
5. [DONE] **CI/CD Hardening**: Secured infrastructure secrets and removed ESM build hacks.
6. [DONE] **Package Standardization**: Added `"type": "module"` to core packages like `@wasd/database`.
