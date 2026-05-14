# Areloria Deployment Guide (VPS + PM2)

This guide reflects the current live architecture:

- Server: Node + Express + WebSocket (`/ws`)
- Client: Vite build served by the same server
- Auth: Supabase-first (optional guest/dev)
- Persistence: Postgres or file fallback via `PERSISTENCE_DRIVER`

## 1) One-time VPS setup

1. Clone repository:
   - `git clone https://github.com/OuroborosCollective/Wasd.git /opt/areloria`
2. Install runtime requirements (Node 22 + pnpm).
3. Configure environment:
   - Copy `deploy/.env.production.template` to `/opt/areloria/.env`
   - Fill all required variables (see `deploy/ENV_SETUP.md`)

## 2) Build + start

From `/opt/areloria`:

- `bash deploy/deploy.sh`

The deploy script installs dependencies, builds client + server, and (re)starts PM2.

## 3) Update after new `main` commits

From `/opt/areloria`:

- `bash deploy/update.sh` (empfohlen: lädt `.env` für Vite-Build-Variablen, baut Client + Server, startet PM2 neu)

Alternativ (ohne `.env`-Sourcing im Skript — nur sinnvoll, wenn die Shell schon exportiert hat):

- `bash deploy/pull-and-deploy.sh`

Or CI can deploy automatically on push to `main` (see `.github/workflows/deploy.yml`).

## 4) Verify runtime

Local on VPS:

- `curl -s http://127.0.0.1:3000/health`

Expect at least:

- `ok: true`
- `persistence.persistenceDriver` in `{auto,file,postgres}`
- `auth.useSupabaseWsLogin` and related auth flags
- `content.mode` and `content.root`
- `playtester` block with monitor mode/path information

Optional helper:

- `bash deploy/verify-vps-local.sh`

## 5) Important production notes

- Do not commit secrets into git.
- Keep `/opt/areloria/.env` as runtime source of truth.
- If `PERSISTENCE_DRIVER=auto`, DB config presence controls whether Postgres or file backend is used.
- `PUBLIC_WEBSOCKET_URL` must point to your external websocket endpoint (`wss://.../ws`).
- For Playtester monitor in production, set `PLAYTESTER_MONITOR_TOKEN`.

## 6) Documentation links

- Env setup: `deploy/ENV_SETUP.md`
- Env template: `deploy/.env.production.template`
- CI + VPS runbook: `docs/CI_VPS_RUNBOOK.md`
- Project status: `docs/PROJECT_STATUS_2026.md`
