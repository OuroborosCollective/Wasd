# Comprehensive Repository Audit - May 2026

## Status Quo
The repository is structured as a **pnpm monorepo** containing several applications (`apps/api`, `apps/web`, `client`, `server`, `engine`, `portal`) and shared packages (`packages/*`). It utilizes TypeScript for type safety across the entire stack. CI/CD is managed via GitHub Actions, and deployment is handled through Docker and a VPS-targeted deployment script.

## 1. Package Management & PnP
- **Current State**: Uses `pnpm@9.12.2` with `shamefully-hoist=true` in `.npmrc`.
- **Issues**:
    - **PnP Configuration**: Plug'n'Play (PnP) is **not** enabled. The presence of `shamefully-hoist=true` indicates a standard `node_modules` structure with flat dependencies, which contradicts a strict PnP setup.
    - **Ghost Dependencies**: Hoisting increases the risk of "ghost dependencies" (using packages not explicitly declared in `package.json`).
    - **Workspace Scope**: `pnpm-workspace.yaml` correctly identifies the directories, but naming conventions for internal packages are inconsistent.

## 2. Dependency Graph
- **Current State**: Packages use multiple namespaces: `@wasd`, `@areloria`, `@app`, and `@are-logic`.
- **Issues**:
    - **Namespace Collision**: Inconsistent naming makes the dependency graph harder to manage and reason about.
    - **Invalid Versions**: Multiple packages (e.g., `packages/database`, `packages/shared`) specify `@types/node: ^25.6.0`, which is an **invalid version** (the current major is 22 or 23).
    - **Version Drift**:
        - `three` is used as `0.169.0` in core but `^0.162.0` in `rendering-bridge`.
        - `react` versions vary between `^18.2.0` and `^19.2.5`.
        - `vitest` versions vary between `^3.0.5` and `^4.1.5`.

## 3. TypeScript & Types
- **Current State**: Root `tsconfig.json` uses project references. Packages extend `tsconfig.base.json`.
- **Issues**:
    - **Missing References**: Root `tsconfig.json` is missing references for `packages/logger`, `packages/redis`, and `packages/types`.
    - **Direct Source Inclusion**: `client/tsconfig.json` includes `../packages/shared/src/**/*` directly in its `include` array and uses a path alias instead of relying on the compiled output of the shared package via project references. This breaks the "build once, use many" principle of monorepos.
    - **Inconsistent Resolution**: `moduleResolution` varies between `bundler`, `NodeNext`, and `Node`.

## 4. Workflows & CI/CD
- **Current State**: `main-pipeline.yml` and `deploy.yml` handle build, test, and deployment.
- **Issues**:
    - **Manual ESM Hacks**: `main-pipeline.yml` contains a `sed` command to manually overwrite `package.json` in `dist` folders to set `"type": "module"`. This is a fragile workaround for incorrect build configurations.
    - **Hardcoded Values**: `deploy.yml` contains a hardcoded IP address (`46.202.154.25`) for health checks, which should be a secret.
    - **Redundant Steps**: Multiple workflows manually install `pnpm` and setup Node, which could be streamlined or cached more effectively.

## 5. Deployment & Environments
- **Current State**: `Dockerfile` uses a multi-stage build but relies on manual `cp` commands.
- **Issues**:
    - **Suboptimal Dockerfile**: The `Dockerfile` manually copies `server/dist`, `node_modules`, and `package.json`. It doesn't leverage `pnpm deploy --filter`, which is the best practice for creating lean production images from a pnpm monorepo.
    - **Environment Consistency**: `NODE_ENV` is set to `production` only in the runner stage of the Dockerfile, but not necessarily during the build stage where some optimizations (like minification) might depend on it.

## Kritische Fehler (Critical Errors)
1. **Invalid @types/node version (25.6.0)**: This will cause installation or type-checking failures in clean environments.
2. **Broken Project References**: Missing references in the root `tsconfig.json` prevent `tsc --build` from working correctly across the whole monorepo.
3. **Hardcoded IP in CI**: Exposes infrastructure details and makes the pipeline rigid.

## Optimierungspotenzial (Optimization Potential)
1. **Enable PnP or Strict Hoisting**: Move away from `shamefully-hoist=true` to ensure dependency boundaries are respected.
2. **Standardize Build Output**: Configure `tsc` or `tsup` correctly to emit ESM so that manual `sed` hacks are no longer necessary.
3. **Pnpm Deploy**: Use `pnpm deploy` in the Dockerfile to significantly reduce image size and build complexity.

## Action Plan
1. **Standardize Namespaces**: Rename all internal packages to use the `@wasd/` prefix.
2. **Fix Dependency Versions**: Correct `@types/node` and synchronize core library versions (React, Vitest, Three.js).
3. **Repair TypeScript Graph**: Update root `tsconfig.json` and package-level configs to use proper project references.
4. **Refactor Workflows**: Clean up `main-pipeline.yml`, remove `sed` hacks, and use secrets for infrastructure details.
5. **Modernize Dockerfile**: Rebuild the Dockerfile using `pnpm deploy`.
6. **Verification**: Run `pnpm run build` and `pnpm -r run test` to ensure monorepo integrity.
