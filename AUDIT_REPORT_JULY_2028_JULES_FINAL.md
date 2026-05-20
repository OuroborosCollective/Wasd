# Comprehensive Monorepo Audit Report - July 2028

## Status Quo
The repository is a complex TypeScript monorepo using **pnpm workspaces**. It consists of several apps (web, client-2d, portal), a game server, and multiple shared packages. The architecture follows a Level-A (deterministic simulation) and Level-C (view/visuals) separation.

### Current Stack
- **Package Manager:** pnpm 10.x (now upgraded to 11.1.1)
- **Runtime:** Node.js 22.x
- **Build Tooling:** Vite 6.4.2, Vitest 4.1.6, tsup
- **CI/CD:** GitHub Actions (manual and automated Docker-based VPS deployment)

---

## Critical Errors & Risks (Remediated)

1. **Build-Blocking TypeScript Errors:**
   - **Issue:** `packages/core-network/src/network.ts` had a TS2322 error due to `ManagerOptions` type mismatch with `socket.io-client`.
   - **Impact:** Blocked full monorepo builds.
   - **Fix:** Corrected type definition using `Partial<ManagerOptions & SocketOptions>`.

2. **Ghost Dependencies:**
   - **Issue:** `@wasd/server` used `@supabase/supabase-js` without declaring it in `package.json`.
   - **Impact:** Unreliable builds depending on hoisting behavior.
   - **Fix:** Explicitly added to `server/package.json`.

3. **Inconsistent pnpm Configuration:**
   - **Issue:** Redundancy between `pnpm.onlyBuiltDependencies` (deprecated/legacy) and `allowBuilds`.
   - **Impact:** Potential security/functionality breakage upon upgrading to pnpm 11.
   - **Fix:** Migrated to `pnpm.trustedDependencies` standard.

4. **Recursive Build Side-Effects:**
   - **Issue:** `apps/client-2d` prebuild script was extracting assets into the repository root, overwriting files like `README.md`.
   - **Impact:** Corrupted repository metadata during local development and builds.
   - **Fix:** Redirected extraction to `apps/client-2d/public/2d-assets/`.

---

## Optimization Potential

### CI/CD & Deployment
- **Docker Build Memory:** Reduced `NODE_OPTIONS` to `5120MB` (from 6GB) to safely build on 8GB VPS hosts without triggering OOM-killer, while maintaining enough headroom for heavy TypeScript compilation.
- **Dependency Standardization:** Versions for `vite`, `vitest`, and `typescript` were aligned across the workspace to reduce the dependency graph size and avoid "Multiple versions of X" bloat.

### TypeScript
- **Inheritance:** Standardized `tsconfig.json` inheritance across apps (e.g., `client-2d`) to ensure consistent strictness and module resolution settings.

---

## Action Plan (Completed)

1. **[X] Alignment:** Synchronized pnpm versions (11.1.1) across root and Docker configurations.
2. **[X] Security:** Migrated native dependency trust to `trustedDependencies`.
3. **[X] Structural Integrity:** Fixed `extract-2d-weapon-pool.mjs` to protect root metadata.
4. **[X] Type Safety:** Resolved core network build errors without resorting to `any`.
5. **[X] Memory Tuning:** Optimized Dockerfile for VPS constraints.

---
**Auditor:** Jules (Senior DevOps & Fullstack Architect)
**Date:** July 2028
**Branch:** `⚖️ Jules: [Causality/Architecture Improvement]`
