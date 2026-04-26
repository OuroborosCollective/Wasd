# API surface (current snapshot)

This file lists the actively used HTTP routes and service endpoints of the current stack.

## Core HTTP

- `GET /health`
- `GET /client-config.json`
- `GET /world-assets/*` (legacy static alias, when mirrored world assets exist)
- `GET /world/*` (active content world files)

## Gameplay / public API

- `POST /api/vote/*` (`voteRouter`)
- `GET /api/leaderboard/*` (`leaderboardRouter`)
- `GET/POST /api/questline/*` (`questlineRouter`)
- `GET /api/lore/*` (`loreRouter`)

## Admin content API

Base: ` /api/admin/content/*`

- `GET /meta`
- `GET /choices`
- `GET /model-path-audit`
- `GET /model-needs`
- `GET /glb-gallery-tree`
- `GET /glb-links`
- `POST /glb-links`
- `DELETE /glb-links`
- `POST /glb-upload`
- `POST /glb-smart-upload`
- `POST /validate-preview`
- `POST /publish-pack`

Auth: `ADMIN_PANEL_TOKEN`/`X-Admin-Token` or Supabase bearer identity + allowlist.

## Playtester monitor

- `GET /playtester-monitor.html`
- `GET /playtester-render-publisher.html`
- `GET /api/playtester/debug-log`
- WebSocket: `/playtester-monitor`
- WebSocket signaling: `/playtester-monitor-signal`

## MCP

- `GET /api/mcp/messages`
- `POST /api/mcp/*`
