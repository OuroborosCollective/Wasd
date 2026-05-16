# WASD Runtime Stability Audit — 2026-05-16

## Scope

This audit focused on production stability for the WASD/Areloria flow:

- pnpm monorepo Docker build path
- VPS Docker deployment
- runtime configuration surface
- Supabase, Redis and Soketi Docker DNS
- monitor-bridge readiness behavior
- Nginx/domain routing assumptions
- ARE determinism risk scan
- stale pull requests that could regress deployment

## Fixes applied in this branch

### Docker runtime configuration surface

`docker-compose.yml` now exposes missing runtime fields used by the current and planned server stack:

- database connection fields
- Supabase public and service fields
- Redis fields
- Soketi and Pusher-compatible fields
- JWT field

Internal Docker DNS defaults remain aligned with the VPS stack:

- Supabase gateway: `supabase-kong:8000`
- Supabase database: `supabase-db:5432`
- Redis: `redis-comn-redis-1:6379`
- Soketi: `soketi-9eoa-soketi-1:6001`

### Monitor bridge readiness

`docker-compose.yml` now makes monitor readiness settings explicit:

- `ENGINE_URL=http://arelorian-engine:3001`
- `CHECK_INTERVAL=60`
- `STARTUP_GRACE_SECONDS=360`
- `READINESS_PATHS=/health,/client-config.json`

This matches the hardened monitor behavior already merged in PR #755.

### Stale PR cleanup

Closed without merge:

- PR #749: too broad and stale; touched high-risk deploy files.
- PR #741: draft, stale, and mixed Portal UX with lockfile/core changes.

## Findings for follow-up PRs

### Workflow runtime configuration transport

The VPS workflow should be simplified in a dedicated PR so runtime values are written once to a local runtime env file and then loaded by Docker Compose. This should not be mixed with unrelated Docker or server changes.

### Nginx host gateway

Nginx is not a Docker service in the current stack. It should remain the host edge service for `arelorian.de`, proxying to `127.0.0.1:3001` for the engine. Add a separate small PR for host-Nginx install/update automation.

### ARE determinism gate

Search found broad `Math.random` and `Date.now` usage across UI, docs, demos, legacy services and server modules. These must not be blindly rewritten. Add a targeted CI gate for ARE-critical paths first:

- `packages/core-logic/src/**`
- `server/src/core/**`
- `server/src/modules/loot/**`
- `server/src/modules/warfront/**`
- `server/src/modules/oracle/**`

### Legacy 3000-era references

Old docs and scripts still reference port 3000. They should be marked legacy or updated so future agents do not confuse Supabase/Kong with the Areloria engine port.

## Expected result after merge

- Areloria remains on host port `127.0.0.1:3001`.
- Runtime env slots are complete for Supabase, Postgres, Redis and Soketi.
- Monitor startup behavior is explicit and less noisy.
- The active deployment path stays small and protected from stale PR drift.

## Recommended next order

1. Workflow runtime env-file hardening
2. Host Nginx gateway automation
3. ARE determinism gate
4. Legacy deploy-doc cleanup
