# WASD Runtime Stability Audit — 2026-05-16

## Scope

This audit targeted the production-critical WASD/Areloria flow rather than general style cleanup:

- pnpm monorepo Docker build path
- VPS Docker deployment
- runtime secrets propagation
- Supabase / Redis / Soketi Docker DNS
- monitor-bridge health behavior
- Nginx/domain routing assumptions
- ARE determinism risk scan
- stale pull requests that can regress the stabilized deployment path

## Immediate fixes applied in this audit branch

### 1. Docker runtime environment surface completed

`docker-compose.yml` now exposes the full runtime env surface needed by the server container:

- `DATABASE_URL`
- `DIRECT_URL`
- `POSTGRES_PASSWORD`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `SOKETI_APP_ID`
- `SOKETI_APP_KEY`
- `SOKETI_APP_SECRET`
- `PUSHER_APP_ID`
- `PUSHER_APP_KEY`
- `PUSHER_APP_SECRET`

It keeps existing safe internal Docker DNS defaults:

- `SUPABASE_URL=http://supabase-kong:8000`
- `POSTGRES_HOST=supabase-db`
- `REDIS_HOST=redis-comn-redis-1`
- `SOKETI_URL=http://soketi-9eoa-soketi-1:6001`

### 2. VPS workflow writes `.env.docker`

The VPS deploy workflow now writes runtime secrets to `.env.docker` on the VPS and runs the deploy script with `ARELORIAN_ENV_FILE=.env.docker`.

Reason:

- GitHub Actions secrets do not magically travel into Docker containers.
- Docker Compose only sees them if the workflow explicitly forwards them.
- A dedicated env file is easier to audit and preserves runtime settings across `git clean`.

The deploy script already preserves `.env.docker` during cleanup and uses `docker compose --env-file` when the file exists.

### 3. Monitor bridge healthcheck fixed separately

PR #758 fixed `Dockerfile.monitor` by installing `procps`, because the monitor container healthcheck uses `pgrep` and `python:3.12-slim` does not include `pgrep` by default.

That was the root cause of the monitor container reporting unhealthy even after runtime had started.

### 4. Monitor readiness hardened separately

PR #755 made `monitor.py` tolerate startup initialization:

- default port 3001
- checks `/health` and `/client-config.json`
- treats `/health` 503 during startup grace as initializing
- configurable `STARTUP_GRACE_SECONDS`, `REQUEST_TIMEOUT_SECONDS`, `READINESS_PATHS`

## Findings not auto-fixed in this audit

### A. Nginx is present as configuration, not as a Docker service

Current Docker Compose contains `arelorian-engine` and `monitor-bridge`, not Nginx. This is intentional for now because the host VPS Nginx should remain the public edge for `arelorian.de`, while Docker binds the engine only on `127.0.0.1:3001`.

Recommended next PR:

- add a host-Nginx installer/update script
- write `/etc/nginx/sites-available/arelorian.de`
- run `nginx -t`
- reload Nginx only when config is valid

Do not place this in the same PR as Docker/runtime secrets.

### B. ARE determinism scan found broad `Math.random` / `Date.now` usage

The scan found many occurrences across UI, docs, demos, legacy services and server modules.

This is not safe to auto-rewrite blindly.

Recommended next PR:

- add a deterministic gate script that fails only on ARE-critical paths first, e.g.:
  - `packages/core-logic/src/**`
  - `server/src/core/**`
  - `server/src/modules/loot/**`
  - `server/src/modules/warfront/**`
  - `server/src/modules/oracle/**`
- allow UI animation randomness in client/portal unless it feeds back into world state
- document allowed entropy boundaries

### C. Stale PRs should not be merged directly

PR #749 is not merge-ready because it is behind `main`, modifies high-risk deployment files, removes `Dockerfile.vps`, and rewrites `ServerBootstrap.ts` heavily.

PR #741 is draft, behind `main`, and pulls lockfile/core-logic changes into a Portal accessibility PR.

Recommendation:

- close both stale PRs as not planned
- recreate useful changes as small current-main PRs

## Operational result expected after this branch merges

After merge and a new VPS Docker Deploy run:

- Docker Compose sees Supabase/Redis/Soketi runtime values via `.env.docker`
- Areloria remains on `127.0.0.1:3001`
- Supabase remains free on its own stack/ports
- monitor bridge has procps/pgrep and more tolerant readiness behavior
- env fields needed by future billing, Supabase, Redis and Soketi integrations are present but not hardcoded

## Next recommended audit PRs

1. `audit/nginx-host-gateway`
   - host Nginx automation for `arelorian.de`, `/portal/`, `/2d/`, `/3d/`, `/api/`, `/ws`

2. `audit/determinism-gate`
   - fail CI when forbidden entropy appears in ARE-critical paths

3. `audit/workspace-lock-consistency`
   - ensure all active package.json importers exist in `pnpm-lock.yaml`
   - ensure SDK examples do not pollute VPS server image builds

4. `audit/stale-root-scripts`
   - classify legacy root scripts and old deploy docs
   - avoid old 3000-era docs confusing future agents
