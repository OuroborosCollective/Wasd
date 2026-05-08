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
    - **Invalid Versions**: Several packages specified `@types/node: ^25.6.1`, which is an invalid/hallucinated major version. The correct version should be `^22.x`.
    - **Ghost Dependencies**: The use of `shamefully-hoist=true` makes the repo vulnerable to ghost dependencies.

## 3. TypeScript & Types
- **Current State**: Uses **Project References** to manage the monorepo build graph.
- **Findings**:
    - **Build Graph**: Many projects in the `projects/` directory were missing `tsconfig.json` files and were excluded from the root build graph.
    - **Path Aliases**: `client` and `apps/api` were using direct source path aliases (e.g., `../packages/shared/src`) instead of relying on project references, which can lead to redundant compilations.

## 4. Workflows & CI/CD
- **Current State**: GitHub Actions workflows handle building, testing, and deployment.
- **Findings**:
    - **Security**: Hardcoded infrastructure details (IP addresses) were present in `main-pipeline.yml`.
    - **Fragility**: Fragile `sed` hacks were used to inject `"type": "module"` into build artifacts instead of declaring it in source.

## 5. Deployment & Environments
- **Current State**: Multi-stage Dockerfile and SSH-based deployment scripts.
- **Findings**:
    - **Docker Optimization**: The `Dockerfile` uses `pnpm deploy`, which is the industry standard for pnpm monorepos to create minimal, self-contained production images.

## Kritische Fehler (Critical Errors)
1. **Invalid Dependency Versions**: `@types/node` versions in the 25.x range will fail to resolve in clean environments.
2. **Incomplete Build Graph**: Missing `tsconfig.json` files in `projects/*` meant that global build/check commands (`tsc --build`) would skip these directories.
3. **Hardcoded Sensitive Data**: Infrastructure IP in CI/CD.

## Optimierungspotenzial (Optimization Potential)
1. **Migration to Strict Hoisting**: Gradually remove `shamefully-hoist=true` to enforce strict dependency boundaries.
2. **CI Pipeline Performance**: Streamline the "Main Pipeline" by removing manual artifact aggregation steps.

## Action Plan
1. **Dependency Sync**: Correct `@types/node` versions and synchronize `vitest` across the workspace.
2. **TSConfig Establishment**: Create missing `tsconfig.json` files for 18 projects and the portal.
3. **Build Graph Repair**: Update root `tsconfig.json` with all missing project references.
4. **Logic & Frontend Fixes**: Resolve `NewHud.tsx` state regressions and `card-logic` type errors.
5. **CI/CD Hardening**: Secure infrastructure secrets and remove ESM build hacks.
