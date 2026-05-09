# Repository Audit Report - August 2026

## Status Quo
The repository is a large TypeScript monorepo managed with `pnpm`. It contains various applications (`apps/`), shared packages (`packages/`), and multiple specialized projects (`projects/`).
- **Package Management:** Uses `pnpm` workspaces. `shamefully-hoist=true` was enabled, which can lead to "ghost dependencies".
- **Dependency Graph:** Significant version drift was observed, specifically with `@types/node` (versions like `^25.x` which are likely future-dated or incorrect) and React (versions `^18.x` mixed with `^19.x`).
- **TypeScript:** The workspace uses project references, but many projects were missing from the root `tsconfig.json`, leading to incomplete type-checking coverage.
- **CI/CD:** Multiple redundant workflows existed (`ci.yml`, `MMORPG Smart CI v5`), while the `main-pipeline.yml` is the primary intended orchestrator.
- **Deployment:** `docker-compose.prod.yml` had a mismatch in the Dockerfile path.

## Kritische Fehler (Critical Errors)
1. **Invalid @types/node Versions:** Multiple packages referenced `@types/node: ^25.6.2`, which is invalid for the current ecosystem and causes resolution issues.
2. **Broken Deployment Path:** `docker-compose.prod.yml` pointed to `Dockerfile.prod` which did not exist (the actual file is at `docker/Dockerfile.production`).
3. **Incomplete Build Graph:** Missing references in root `tsconfig.json` meant that many projects were not being type-checked during a full workspace check.
4. **Redundant CI Workflows:** Multiple workflows attempting to do the same thing lead to race conditions and wasted CI minutes.

## Optimierungspotenzial (Optimization Potential)
1. **Isolated Node-Linker:** Removing `shamefully-hoist` forces packages to declare all their dependencies, preventing runtime errors due to missing packages that were previously "hoisted" by accident.
2. **Standardized Tooling:** Aligning all packages to use React 19 and a consistent `@types/node` version (`^22.19.18`) ensures better compatibility and fewer peer-dependency warnings.
3. **CI Consolidation:** Consolidating all logic into `main-pipeline.yml` and enforcing `--frozen-lockfile` ensures reproducible builds.

## Action Plan (Implemented Fixes)
1. **[FIXED] Package Management:** Removed `shamefully-hoist=true` from `.npmrc`.
2. **[FIXED] Dependency Graph:**
   - Standardized `@types/node` to `^22.19.18` monorepo-wide.
   - Standardized `@types/react` and `@types/react-dom` to `^19.0.0`.
   - Updated root `pnpm.overrides` for strict version enforcement.
3. **[FIXED] TypeScript:**
   - Updated root `tsconfig.json` to include all workspace projects in `references`.
   - Fixed `portal` build by adding missing `lucide-react` dependency and fixing a `useRef` type error.
4. **[FIXED] CI/CD:** Deleted redundant `ci.yml` and `MMORPG Smart CI v5` workflows.
5. **[FIXED] Deployment:** Corrected Dockerfile path in `docker-compose.prod.yml`.
6. **[FIXED] Code Integrity:** Verified that core packages (`@wasd/shared`, `@wasd/engine`, `@wasd/portal`) build and pass type-checking.
