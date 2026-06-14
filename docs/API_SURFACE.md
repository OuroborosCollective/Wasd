# API Surface Documentation

## Overview

This document provides a high-level overview of the HTTP API surface for the Areloria MMORPG server. It lists all actively used HTTP routes and service endpoints.

**Machine-Readable Version:** `server/src/api/routeRegistry.ts`

## Core HTTP Endpoints

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `GET /health` | GET | Health check probes | No |
| `GET /client-config.json` | GET | Client configuration | No |
| `GET /world-assets/*` | GET | Legacy static world assets | No |
| `GET /world/*` | GET | Active content world files | No |

## Gameplay / Public API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /api/vote/*` | POST | Voting system |
| `GET /api/leaderboard/*` | GET | Leaderboard rankings |
| `GET/POST /api/questline/*` | GET/POST | Questline content |
| `GET /api/lore/*` | GET | Lore content delivery |

## Truth-Path Routes (Gameplay-Affecting)

These routes modify simulation state and require deterministic tick-safe behavior:

| Endpoint | Method | Description | Tick-Safe |
|----------|--------|-------------|-----------|
| `POST /api/quest` | POST | Quest event processing | ✅ |
| `POST /api/skill` | POST | Skill event processing | ✅ |
| `POST /api/resource` | POST | Resource gathering | ✅ |
| `GET/POST /api/inventory` | GET/POST | Inventory operations | ✅ |
| `POST /api/crafting` | POST | Crafting operations | ✅ |
| `GET/POST /api/equipment` | GET/POST | Equipment management | ✅ |
| `GET/POST /api/character` | GET/POST | Character management | ✅ |
| `POST /api/onboarding` | POST | Player onboarding | ✅ |
| `GET/POST /api/economy` | GET/POST | Economy operations | - |
| `GET/POST /api/npc` | GET/POST | NPC interactions | - |
| `GET/POST /api/quests` | GET/POST | Quest operations | - |

## Side-Channel Routes (Observability)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /api/are` | GET | ARE telemetry heartbeat |
| `GET /api/are/validation` | GET | ARE validation |
| `GET /api/are/replay` | GET | ARE replay system |
| `GET /api/gameplay` | GET | Gameplay snapshots |
| `GET /api/self-healing` | GET | Self-healing dashboard |
| `GET /api/manifest` | GET | Manifest resync |
| `GET /api/are-shadow` | GET | ARE shadow logging |

## Admin Content API

**Base Path:** `/api/admin/content/*`

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `GET /meta` | GET | Content metadata | Token |
| `GET /choices` | GET | Content choices | Token |
| `GET /model-path-audit` | GET | Model path audit | Token |
| `GET /model-needs` | GET | Model needs | Token |
| `GET /glb-gallery-tree` | GET | GLB gallery tree | Token |
| `GET /glb-links` | GET | GLB links | Token |
| `POST /glb-links` | POST | Create GLB link | Token |
| `DELETE /glb-links` | DELETE | Delete GLB link | Token |
| `POST /glb-upload` | POST | Upload GLB | Token |
| `POST /glb-smart-upload` | POST | Smart GLB upload | Token |
| `POST /validate-preview` | POST | Validate preview | Token |
| `POST /publish-pack` | POST | Publish content pack | Token |

**Auth:** `ADMIN_PANEL_TOKEN` header or `X-Admin-Token` header, or Supabase bearer identity + allowlist.

## Asset Management (PR #2008)

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `POST /api/asset-brain/generate` | POST | Generate asset specification | Yes |
| `GET /api/asset-brain/my-specs` | GET | User's specifications | Yes |
| `GET /api/asset-brain/specs/:id` | GET | Specification details | Yes |
| `GET /api/asset-brain/variants/:id` | GET | Specification variants | Yes |
| `GET /api/asset-brain/search` | GET | Search specifications | Yes |
| `GET /api/asset-brain/library` | GET | Browse asset library | Yes |
| `POST /api/asset-brain/batch` | POST | Start batch job | Yes |
| `GET /api/asset-brain/batch/:id` | GET | Batch job status | Yes |
| `POST /api/glb/upload` | POST | Upload GLB model | Yes |
| `GET /api/glb/my-models` | GET | List player's models | Yes |
| `DELETE /api/glb/:modelId` | DELETE | Delete model | Yes |
| `GET /api/glb/marketplace` | GET | Browse marketplace | Yes |
| `POST /api/glb/marketplace/list` | POST | List model for sale | Yes |
| `POST /api/glb/marketplace/buy` | POST | Buy from marketplace | Yes |

## Finance / Payment

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `POST /api/finance/paypal/checkout` | POST | Create PayPal checkout | No |
| `POST /api/finance/paypal/verify` | POST | Verify transaction | No |
| `POST /api/finance/paypal/webhook` | POST | PayPal webhook | No |

## Playtester Monitor

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `GET /playtester-monitor.html` | GET | Monitor UI | Token |
| `GET /playtester-render-publisher.html` | GET | Publisher UI | Token |
| `GET /api/playtester/debug-log` | GET | Debug log data | Token |
| `WS /playtester-monitor` | WS | Monitor stream | Token |
| `WS /playtester-monitor-signal` | WS | WebRTC signaling | Token |

## MCP Protocol

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /api/mcp/messages` | GET | MCP messages |
| `POST /api/mcp/*` | POST | MCP protocol commands |

## Legacy / Deprecated Endpoints

| Endpoint | Status | Notes |
|----------|--------|-------|
| `/api/art/ws` | Deprecated | No server implementation - marked @deprecated |
| `/api/check` | Placeholder | Not an actual endpoint - example URL in UI |

## Static Asset Paths

| Path | Type | Description |
|------|------|-------------|
| `/2d/*` | Static | 2D client assets |
| `/3d/*` | Static | 3D client assets |
| `/portal/*` | Static | Portal application |
| `/itch/*` | Static | Itch.io client |
| `/world-assets/*` | Static | Mirrored world assets |
| `/world/*` | Static | Content world files |
| `/client2d-assets/*` | Static | GraphicRiver ISO assets |
| `/agora` | Router | Agora video integration |

## Response Format

All API responses are JSON with the following structure:

**Success:**
```json
{
  "ok": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "ok": false,
  "error": "error_code",
  "message": "Human readable message"
}
```

## Authentication

Routes marked with `Auth: Yes` require one of:

1. **Admin Token:** `X-Admin-Token` or `ADMIN_PANEL_TOKEN` header
2. **Supabase Bearer:** `Authorization: Bearer <token>` with valid Supabase JWT
3. **Player ID Header:** `x-player-id` header for player-specific routes

## Rate Limiting

Admin routes are protected by `adminRateLimiter` middleware.

## References

- `server/src/api/routeRegistry.ts` - Machine-readable route manifest
- `scripts/audit-route-registry.mjs` - Static route audit tool
- `scripts/probe-runtime-routes.mjs` - Runtime route probe tool
- `docs/ROUTE_REGISTRY.md` - Detailed route registry
