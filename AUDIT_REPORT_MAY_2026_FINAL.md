# Comprehensive Repository Audit - May 2026 (Updated)

## Status Quo
The repository is a complex **pnpm monorepo** using `node-linker=isolated` (standard pnpm symlinking, not PnP). It contains games, web apps, and backend services orchestrated via TypeScript Project References. Deployment is handled via GitHub Actions targeting a VPS.

---

## 1. Package Management & PnP Audit
*   **Linker Settings**: `.npmrc` uses `node-linker=isolated`. This is correct for preventing ghost dependencies but confirms that **Plug'n'Play (PnP) is not enabled**.
*   **Workspace**: `pnpm-workspace.yaml` correctly includes all logical paths, but there is a structural split between root-level `backend/` and `packages/backend/`.

---

## 2. Dependency Graph Audit
*   **Critical Drift**:
    *   **Vite**: Significant gap between `v5.2.8` (portal) and `v8.0.13` (server).
    *   **BabylonJS**: Root overrides pin to `9.8.0`, while several packages use `^9.9.1`, causing lockfile drift and double-installs.
    *   **Postgres (pg)**: Drift between `^8.20.0` (root) and `^8.21.0` (server/backend).
*   **Guard Failures**: `pnpm guard:monorepo` fails due to lockfile misalignment for `@types/react` and `@babylonjs/*`.

---

## 3. TypeScript & Types Audit
*   **Project Reference Breakdown**: Core packages (`@wasd/server`, `@wasd/shared`, `@wasd/core-logic`) have `"composite": false`, breaking root orchestration.
*   **Path Mismatches**: Root `tsconfig.json` references `packages/backend` while `pnpm-workspace.yaml` points to root `backend/`.
*   **Consistency**: `@types/node` is well-standardized to `^25.9.1`.

---

## 4. Workflows & CI/CD Audit
*   **Security Risk**: `main-pipeline.yml` and `vps-docker-deploy.yml` use `sshpass` for password-based SSH. This is a high-risk legacy pattern.
*   **Race Conditions**: Well-mitigated via `concurrency` groups with `cancel-in-progress: true`.
*   **Optimization**: Caching is inconsistent; only `monorepo-guard.yml` implements proper pnpm store caching.

---

## 5. Deployment & Environments Audit
*   **Structure**: `docker-compose.yml` is robust and highly configurable.
*   **Build Optimization**: `Dockerfile.vps` uses a custom lockfile sync script which adds complexity. The build process currently generates artifacts even when some builds fail (e.g., using `|| true` in `Dockerfile.vps`).

---

## Action Plan

1.  **Repair TypeScript Structure**: Set `composite: true` across all packages and unify the `backend` directory path.
2.  **Align Dependencies**: Update root overrides for `babylonjs` (9.9.1), `vite` (6.4.2), and `pg` (8.21.0).
3.  **Harden CI/CD**: Migrate from `sshpass` to SSH keys and standardize `pnpm` caching across all workflows.
4.  **Validate**: Run `pnpm build` and `pnpm guard:monorepo` to ensure full alignment.
