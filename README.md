# Areloria / Ouroboros (Wasd)

Browser MMORPG monorepo with authoritative server simulation and Babylon.js client rendering.

## Quick start

1. Install dependencies:
   - `pnpm install`
2. Optional env:
   - `cp .env.example .env`
3. Start development:
   - `pnpm run dev`
4. Open:
   - `http://localhost:3000`

## Technology stack (current)

- Client: Vite + TypeScript + Babylon.js
- Server: Node.js + Express + WebSocket (`ws`)
- Auth/runtime identity: Supabase JWT verification (optional in dev), guest/dev fallback via env flags
- Persistence: `PERSISTENCE_DRIVER=auto|postgres|file` (`auto` => Postgres if configured, else file)
- Optional infra: Redis (chat relay/cache), OpenTelemetry/PostHog tracing, MCP admin endpoint
- Tests: Vitest + Playwright

## Repository structure

- `client/` — Babylon/Vite frontend and HUD/UI
- `server/` — Express + WS server, simulation (`WorldTick`)
- `game-data/` — live content definitions (quests, npcs, dialogue, world, scenes)
- `world-assets/` — source assets mirrored into client public model paths
- `docs/` — architecture, systems, runbooks, status docs
- `deploy/` — deployment scripts and env templates

## Core runtime systems

- Authoritative tick loop (`server/src/core/WorldTick.ts`) at 100ms
- Player/NPC sync over WebSocket
- Quests, combat, loot, inventory, skills
- NPC autonomy + chat + relationship/memory systems
- Warfront, world boss, vote, questline systems
- Playtester automation + monitor stream
- Admin content API (`/api/admin/content/*`) for GLB and content operations
- Gameplay Fusion Director (quest echoes + adaptive profiles + construction contracts)

## Key docs

- `docs/PROJECT_STATUS_2026.md` — authoritative implementation snapshot
- `docs/ROADMAP_TO_RELEASE.md` — remaining scope
- `docs/DOCUMENTATION_INDEX.md` — doc map + active vs historical
- `DEPLOYMENT.md` — VPS deployment flow
- `deploy/ENV_SETUP.md` — production env setup
- `AGENTS.md` — agent-specific operational guidance

## Deployment (VPS)

- Standard update flow:
  - `cd /opt/areloria && bash deploy/pull-and-deploy.sh`
- PM2 process is managed by project deploy scripts/config.
- Optional CI post-deploy verification via `DEPLOY_VERIFY_BASE_URL`.

## Documentation policy

When behavior changes, update:

1. `docs/PROJECT_STATUS_2026.md`
2. `docs/ROADMAP_TO_RELEASE.md` (if release scope changed)
3. Any affected runbook/API docs
