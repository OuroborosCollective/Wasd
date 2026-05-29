# WASD Monorepo Architectural Audit Report (August 2027)

## Status Quo
The repository is a multi-layered MMORPG monorepo utilizing **pnpm v11** with an isolated node-linker. The architecture is built on **BabylonJS 9.8.0**, **Vite 8**, and **TypeScript 6**. Deployment logic is split between high-performance Docker images for production and memory-optimized Dockerfiles for 16GB VPS environments.

The monorepo uses a **Watchdog-Brain-Plexity** pattern for simulation logic, with strict **ARE-Axiom** compliance enforced via a custom determinism gate.

## Kritische Fehler (Critical Errors)
1.  **CI/CD Pipeline Breakdown:** A syntax error in `.github/workflows/monorepo-guard.yml` (malformed `setup-node` nesting) disabled the primary safety checks for lockfile integrity and architectural linting.
2.  **pnpm Version Fragmentation:** Significant drift between the root `packageManager` (v11.1.1), `Dockerfile.prod` (v9.12.2), and `deploy/update.sh` (v9.12.2). This causes inconsistent resolution of the `pnpm-workspace.yaml` `allowBuilds` field, leading to build failures for native dependencies like `sharp` and `cpu-features`.
3.  **Broken TypeScript Compilation:** Several core packages had `composite: false` but were referenced as project dependencies, and some lacked `declaration: true` while attempting to emit composite metadata.

## Optimierungspotenzial (Optimization Potential)
1.  **Vite/React Engine Alignment:** Upgrading all client workspaces to **Vite 8** provides significant build speed improvements and better integration with the ESM-only `server/` architecture.
2.  **BabylonJS Dependency Lock:** Consolidating `@babylonjs/*` versions to **9.8.0** across all manifests prevents "ghost dependency" issues and ensures that the rendering bridge remains compatible with the server-side simulation.
3.  **Build Permission Consolidation:** Centralizing native build authorizations in `pnpm-workspace.yaml` instead of deprecated `package.json` fields improves security and build reproducibility.

## Action Plan (Completed in this PR)
1.  **Standardized pnpm to v11.2.2** across the entire stack (root, Dockerfiles, deploy scripts).
2.  **Fixed CI Workflow syntax** to restore the Monorepo Guard.
3.  **Harmonized Vite 8 and BabylonJS 9.8.0** across all 4 frontend applications.
4.  **Hardened TypeScript Project References** by enabling `composite`, `incremental`, and `declaration` emitting in `server` and `core-logic`.
5.  **Updated pnpm-workspace.yaml** with a complete `allowBuilds` list (adding `sharp` and `cpu-features`).

## Verification
- [x] `pnpm guard:monorepo` passed.
- [x] `node scripts/check-are-determinism.mjs` (93 files) passed.
- [x] `vitest server/src/tests/economy.test.ts` passed.

**Report Date:** 2027-08-29
**Auditor:** Jules (Senior DevOps & Fullstack Architect)
