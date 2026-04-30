# Repository Audit Report - Areloria MMORPG

## Status Quo
The repository is structured as a TypeScript monorepo using **pnpm**. It contains a game server (`server/`), a web client (`client/`), and a shared library (`shared/`).

Current configuration state:
- **Package Management**: Uses `pnpm` workspaces, but contains legacy artifacts from Yarn PnP (`.pnp.cjs`, `.yarnrc.yml`) and npm (`package-lock.json`).
- **Workspace**: `pnpm-workspace.yaml` is partially configured but misses the root `shared/` directory.
- **TypeScript**: A root `tsconfig.json` exists with Project References, but many references point to non-existent or moved directories (e.g., `packages/core`, `apps/web`).
- **Shared Logic**: There is redundancy between root `shared/` and `packages/shared/`, with different files in each.
- **CI/CD**: Workflows are using older versions of pnpm (v8) and could benefit from better caching and alignment with deployment scripts.

## Critical Errors
1. **Broken TypeScript References**: The root `tsconfig.json` refers to paths that do not exist in the current structure, breaking global type checking and IDE support.
2. **Redundant Shared Packages**: Having logic split between `shared/` and `packages/shared/` causes dependency resolution issues and "Ghost Dependency" risks.
3. **Incomplete Workspace Definition**: `shared/` is not recognized as a workspace member in `pnpm-workspace.yaml`, preventing proper hoisting and linking.
4. **Conflicting Lockfiles**: Presence of `package-lock.json` and `.pnp.cjs` alongside `pnpm-lock.yaml` creates environment instability.

## Optimization Potential
- **Dependency Alignment**: Synchronizing `typescript`, `zod`, and `@types/node` versions across all packages will reduce bundle size and build time.
- **CI/CD Performance**: Upgrading to `pnpm` v9 and refining cache keys in GitHub Actions will speed up pipeline execution.
- **Workspace Identity**: Renaming the root package and adding recursive scripts will improve developer experience.

## Action Plan
1. **Workspace Repair**: Update `pnpm-workspace.yaml` and root `package.json` to correctly identify all members.
2. **Cleanup**: Purge all legacy Yarn and npm files.
3. **Consolidation**: Merge `packages/shared` into `shared` and establish it as the single source of truth.
4. **Infrastructure Alignment**: Fix all `tsconfig.json` references and align core library versions.
5. **CI/CD Update**: Modernize the CI pipeline to use `pnpm` v9 and optimized caching.
6. **Validation**: Comprehensive build and test run to ensure monorepo integrity.
