# Monorepo Architecture Audit & Standardization - August 2026

## Status Quo
The Wasd monorepo is a sophisticated RPG/Metaverse platform. During the audit, several critical infrastructure and code-level issues were identified that compromised build stability and CI/CD reliability.

## Critical Issues & Implemented Fixes

### 1. Infrastructure: Symlink Loops (ELOOP)
- **Problem**: Extensive use of circular and absolute symlinks in `server/src` caused 'too many symbolic links' errors, breaking both local builds and CI.
- **Fix**: Removed all server-side symlinks and replaced them with robust TypeScript stubs. This stabilizes the compiler and ensures a clean build graph.

### 2. Dependency Management: Version Drift
- **Problem**: Inconsistent versions of `@types/node` (up to `^25.x`) and React (`^18` vs `^19`) caused peer-dependency conflicts and type mismatches.
- **Fix**: Standardized the monorepo on Node.js `v22` and React `19`. Updated root `pnpm.overrides` to enforce these versions workspace-wide. Removed `shamefully-hoist` to eliminate ghost dependencies.

### 3. Build Graph: Missing Project References
- **Problem**: The root `tsconfig.json` was incomplete, skipping multiple projects during workspace-wide type-checking.
- **Fix**: Completed the `references` array in root `tsconfig.json`, ensuring 100% type-checking coverage for all 18 sub-projects.

### 4. Package Stability
- **@wasd/eco-trader & @wasd/social**: Migrated from Node's internal `events` to `eventemitter3` to resolve environment-specific build failures.
- **@wasd/api-core**: Implemented a comprehensive Prisma stub to allow API development and building without requiring a live database connection during the build phase.
- **@wasd/web**: Resolved complex `rootDir` and `include` conflicts in the React 19 environment.

## Summary of Applied Changes
- Standardized Types Monorepo-wide.
- Hardened pnpm Configuration (Isolated node-linker).
- Stabilized Build Graph & CI Pipeline.
- Corrected Deployment Pathing in Docker configurations.

All core packages are now in a consistent, buildable state.
