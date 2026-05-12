# Repository Audit Report - July 2027

## Status Quo
The repository is a complex monorepo using `pnpm` with the `isolated` node-linker. It contains various applications (`apps/`), shared packages (`packages/`), and specialized projects (`projects/`). The build system relies on TypeScript Project References for incremental builds and consistency. CI/CD is handled via GitHub Actions, primarily through `main-pipeline.yml` for testing and `vps-deploy.yml` for Docker-based deployment.

## Critical Errors (Resolved)
1.  **Workspace Indexing Issue:** The `pnpm-workspace.yaml` was using `projects/` instead of `projects/*`, which meant sub-projects in that directory were not being correctly indexed as workspace members. This could lead to local dependency resolution failures.
2.  **Dockerfile Syntax Error:** `Dockerfile.prod` had a syntax error in a chained `RUN` command (`RUN apk add ... RUN pnpm install ...`), which would cause the build to fail.
3.  **Dependency Version Drift:** `apps/client-2d` was using `react-dom@18` while `react` was at `v19`, and an older version of TypeScript. This causes type incompatibilities and potential runtime issues.
4.  **TypeScript Inconsistency:** Multiple packages (`core-network`, `shared`) had outdated TypeScript version specifications in their `package.json` or `peerDependencies`, diverging from the monorepo standard (v6.0.3).
5. **Workflow Stability**: The `Narrative-Engine` workflow was failing due to connection timeouts (exit code 28) when hitting the VPS endpoint. Additionally, the `Jules Deterministic Audit` was failing due to runner OOM (lost communication).

## Optimization Potential
1.  **CI Caching:** While `pnpm` caching is enabled in workflows, the `Dockerfile.prod` could be further optimized using a multi-stage "Teleport" pattern to stage only `package.json` files for better layer caching (partially addressed by ensuring `--frozen-lockfile`).
2.  **Redundant Deployment Scripts:** There is some overlap between `vps-deploy.yml` (Docker-based) and `scripts/deploy-vps.sh` (Git/PM2-based). Standardizing on the Docker-based approach is recommended for consistency across environments.
3.  **Ghost Dependencies:** With `node-linker=isolated`, every package must explicitly declare its dependencies. Continuous monitoring of missing declarations is required to avoid build failures in clean environments.

## Action Plan (Completed & Ongoing)
1.  **Index Correction:** Updated `pnpm-workspace.yaml` to use glob patterns for all project directories.
2.  **Version Harmonization:** Synchronized React and TypeScript versions across `apps/client-2d`, `packages/core-network`, and `packages/shared`.
3. **Build Pipeline Fix:** Corrected the `Dockerfile.prod` syntax, updated `pnpm-lock.yaml`, and enforced strict lockfile usage.
4. **Workflow Hardening**: Added retry logic and timeout handling to the `Narrative-Engine` workflow. Stabilized `Jules Deterministic Audit` by adding concurrency groups, reducing `max-old-space-size` to `2560MB`, and lowering pnpm log verbosity.
4.  **Future Recommendation:** Deprecate `scripts/deploy-vps.sh` in favor of the more robust Docker-based deployment defined in `vps-deploy.yml`.
5.  **Future Recommendation:** Implement a centralized `@wasd/tsconfig` package if inheritance becomes too complex.
