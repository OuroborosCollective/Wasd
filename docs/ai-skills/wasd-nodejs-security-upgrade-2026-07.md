# WASD Node.js Security Upgrade — July 2026

## Overview

This document tracks the Node.js security upgrade from unpinned/patched versions to the specific security-patched version **22.23.2** (and aligned variants).

**Date**: July 2026  
**Security Release**: https://nodejs.org/uk/blog/vulnerability/july-2026-security-releases  
**Primary CVEs Addressed**: CVE-2026-56846, CVE-2026-56848, CVE-2026-58043

## CVEs Fixed in 22.23.2

| CVE | Severity | Description |
|-----|----------|-------------|
| CVE-2026-56846 | HIGH | HTTP/2 Memory Exhaustion |
| CVE-2026-56848 | HIGH | HTTP/2 Heap-use-after-free |
| CVE-2026-58043 | HIGH | Permission Model over-authorization |

**Additional issues fixed:**
- mTLS problem
- Request-Smuggling parser error

## Version Migration Map

### Before → After

| Location | Before | After |
|----------|--------|-------|
| `Dockerfile` (lines 6, 118) | `node:22-alpine` | `node:22.23.2-alpine` |
| `docker/Dockerfile.alpine` (line 1) | `node:22-alpine` | `node:22.23.2-alpine` |
| `docker/Dockerfile.production` (lines 1, 21) | `node:20-slim` | `node:22.23.2-slim` |
| `.github/workflows/*` | `node-version: '22'` | `node-version: '22.23.2'` |
| `.github/workflows/minimax-autonomous-agent.yml` | `NODE_VERSION: '22'` | `NODE_VERSION: '22.23.2'` |
| `.github/workflows/wiki-engine.yml` | `NODE_VERSION: "22"` | `NODE_VERSION: "22.23.2"` |

## Files Changed

```bash
Dockerfile
docker/Dockerfile.alpine
docker/Dockerfile.production
.github/workflows/safe-test-lab.yml
.github/workflows/architecture-lint.yml
.github/workflows/import-kenney-ui-pack.yml
.github/workflows/runtime-version-lock.yml
.github/workflows/dependabot-checker.yml
.github/workflows/pixi-asset-plan.yml
.github/workflows/jules_deterministic_audit.yml
.github/workflows/biome-atlas-assets.yml
.github/workflows/weapon-assets.yml
.github/workflows/simulation_test.yml
.github/workflows/stateless-hardcode-audit.yml
.github/workflows/client-2d-render-check.yml
.github/workflows/asset-inbox-stitch-import.yml
.github/workflows/ast-self-healing.yml
.github/workflows/stitch-atlas-intake.yml
.github/workflows/vps-docker-deploy-on-merge.yml
.github/workflows/minimax-autonomous-agent.yml
.github/workflows/import-stitch-release-assets.yml
.github/workflows/import-forest-biome-pack.yml
.github/workflows/import-stitch-atlases.yml
.github/workflows/wiki-engine.yml
.github/workflows/client-2d-itch-export.yml
.github/workflows/portal-smoke.yml
.github/workflows/sync-wiki.yml
.github/workflows/vps-docker-deploy.yml
.github/workflows/are-determinism-gate.yml
.github/workflows/deploy.yml
.github/workflows/monorepo-guard.yml
.github/workflows/client2d-tile-render-patch.yml
.github/workflows/client-2d-smoke.yml
```

## Validation

### Local Build Validation

```bash
# TypeScript check
npx tsc --noEmit

# ESLint check
npx eslint server/src apps/client-2d/src

# Unit tests
npx vitest run

# Full build
pnpm run build
```

### ARE Determinism Gates

The upgrade must pass the existing ARE determinism gates to ensure no regression in truth-path behavior.

See: `docs/ai-skills/wasd-are-system.md`

### Build Artifact Comparison

For immutable evidence, compare build artifact hashes before and after upgrade:

```bash
# Before upgrade (baseline)
git stash
pnpm run build
sha256sum apps/client-2d/dist/**/*.js  # capture hashes
git stash pop

# After upgrade
pnpm run build
sha256sum apps/client-2d/dist/**/*.js  # compare hashes
```

## Rollback Plan

If any validation fails:

```bash
# Revert Dockerfiles
git checkout Dockerfile docker/Dockerfile.alpine docker/Dockerfile.production

# Revert workflows
git checkout .github/workflows/

# Re-pin to previous versions:
# - Dockerfile: node:22-alpine → node:22-alpine (no change needed)
# - docker/Dockerfile.production: node:22.23.2-slim → node:20-slim (or latest LTS)
```

## Notes

- The `package.json` `engines` field was NOT changed (kept broad at `>=18`)
- Node.js 24.18.1 and 26.5.1 were also released but are not used in this project
- All workflows use GitHub-hosted runners (`ubuntu-latest`) — no self-hosted runner policy applies
