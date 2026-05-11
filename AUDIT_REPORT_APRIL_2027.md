# Repository Audit Report - April 2027

## Status Quo
The repository is a complex monorepo managed with **pnpm** using the `node-linker=isolated` setting to ensure strict dependency boundaries. It consists of multiple domains:
- **Apps:** `api`, `web`, `client-2d`
- **Packages:** Core logic, types, networking, and shared utilities.
- **Projects:** Various domain-specific logic packages (e.g., `eco-trader`, `social-sim`).
- **Server/Client:** The core game engine and client.

The infrastructure uses **GitHub Actions** for CI/CD and **Docker** for containerized deployment.

## Critical Errors
1.  **Dockerfile Syntax Error:** `Dockerfile.prod` contained a malformed `RUN` command. Fixed by separating `apk` and `pnpm` commands.
2.  **TypeScript Version Drift:** Standardized to `^6.0.3` across the workspace.
3.  **React Version Inconsistency:** Aligned `apps/client-2d` to monorepo standard (v19).
4.  **Lockfile Desync:** The `node-linker=isolated` mode caused CI failure when `package.json` was updated without a corresponding `pnpm-lock.yaml` update. Resolved by running local install.
5.  **Unresponsive VPS Trigger:** `git-to-lore.yml` lacked timeouts, causing CI to hang and fail on network latency. Fixed with `curl` timeout flags.

## Optimization Potential
1.  **CI Concurrency:** Added concurrency groups to `main-pipeline.yml`.
2.  **Leaner Docker Images:** Refactored `Dockerfile.prod` to use `pnpm deploy`.
3.  **TypeScript Inheritance:** Ensured `eco-trader` and `ui` packages extend `tsconfig.base.json`.

## Action Plan (Completed)
1.  **Harmonize Dependencies:** Aligned versions and fixed `@types/node` missing in `packages/types`.
2.  **Standardize TS Configs:** Extended base configs and updated root references.
3.  **Harden Workflows:** Added concurrency and timeout resilience.
4.  **Validate:** Performed builds and synchronization.
