# Comprehensive Architectural Audit Report - January 2027

## Status Quo
The repository is a large-scale monorepo utilizing **pnpm (v9.12.2)** for package management. It encompasses several application domains (`apps/`), shared libraries (`packages/`), and specialized logic modules (`projects/`).

### Core Infrastructure
- **Package Management:** Standardized on `pnpm` with a strict `node-linker=isolated` configuration (updated during this audit) to eliminate ghost dependencies.
- **TypeScript:** A centralized `tsconfig.base.json` provides shared compiler options, with sub-packages extending it and using Project References for build graph integrity.
- **CI/CD:** Centralized logic in `.github/workflows/main-pipeline.yml`, executing build, lint, and test suites. Redundant workflows have been purged.
- **Deployment:** Docker-based deployments for the core engine and a hardened VPS deployment script for rapid iteration.

---

## Critical Errors

### 1. Ghost Dependencies (Strict Linker Conflict)
The transition from `shamefully-hoist=true` to `node-linker=isolated` revealed several packages relying on undeclared dependencies:
- **`@wasd/social`**: Fails type-checking due to missing `eventemitter3`.
- **UI Components**: Several components fail to find `lucide-react` or `@types/react` because they were previously hoisted from the root or other packages.

### 2. Dependency Version Drift
Significant version drift was observed before standardization:
- **NestJS**: Versions varied between `^10.x` and `^11.x` across different apps.
- **Type Definitions**: `@types/node` and `@types/react` were inconsistent, leading to potential runtime and build-time mismatches.
- **BabylonJS**: Core rendering packages were drifting, which is critical for 3D engine stability.

### 3. Build Graph Inconsistencies
Some packages (e.g., `packages/types`) were marked as `noEmit: true`, preventing them from generating artifacts required by other packages in the build graph when using Project References.

---

## Optimization Potential

### 1. Docker Build Performance
The current `Dockerfile` copies the entire repository before running `pnpm install`.
**Improvement:** Implement multi-stage builds that copy only `pnpm-lock.yaml`, `pnpm-workspace.yaml`, and `package.json` files first to maximize layer caching.

### 2. CI/CD Granularity
The `main-pipeline.yml` uses path-based filters for the entire job.
**Improvement:** Use `pnpm --filter "...[origin/main]"` more effectively to run tests only for changed packages and their dependents, rather than the entire workspace when possible.

### 3. Security Hardening
The `scripts/deploy-vps.sh` handles credentials via environment variables.
**Improvement:** Transition to a more robust secret management system or use GitHub Environments with required reviewers for production deployments.

---

## Action Plan

### Step 1: Resolve Ghost Dependencies
- [ ] Explicitly add `eventemitter3` to `projects/social/package.json`.
- [ ] Audit all UI packages and add `lucide-react`, `framer-motion`, and `zustand` where they are directly imported.
- [ ] Run `pnpm -r exec tsc --noEmit` to verify resolution.

### Step 2: Optimize Docker Artifacts
- [ ] Refactor root `Dockerfile` to use a "teleport" pattern for `package.json` files to optimize `pnpm install` caching.
- [ ] Ensure the `prod-server` deployment uses `pnpm deploy` correctly to minimize image size.

### Step 3: Standardize Workspace Types
- [ ] Ensure all `tsconfig.json` files include `"types": ["node"]` where Node.js APIs are used (e.g., `eco-trader`).
- [ ] Maintain the root `pnpm.overrides` to prevent future version drift of core libraries (React, Three.js, BabylonJS).

### Step 4: Continuous Monitoring
- [ ] Integrate a dependency graph visualizer (e.g., `pnpm-dependency-graph`) into the CI pipeline to catch circular dependencies early.
