# API Surface Documentation

## Overview

This document provides a high-level overview of the HTTP API surface for the Areloria MMORPG server. It lists all actively used HTTP routes and service endpoints.

**Machine-Readable Version:** `server/src/api/routeRegistry.ts`

## Classification Categories

- **active-truth-path**: Routes that mutate simulation state (ownership, marketplace, Matrix Energy, placement)
- **active-side-channel**: Routes for observability/monitoring (no gameplay mutation)
- **legacy**: Routes with implementation but not mounted
- **delete-candidate**: Stubs or dead code

## Core HTTP Endpoints

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `GET /health` | GET | Health check probes | No |
| `GET /client-config.json` | GET | Client configuration | No |
| `GET /world-assets/*` | GET | Legacy static world assets | No |
| `GET /world/*` | GET | Active content world files | No |

## Truth-Path Routes (Gameplay-Affecting)

These routes modify simulation state. Auth is required for identity verification.

| Endpoint | Method | Classification | Notes |
|----------|--------|---------------|-------|
| `POST /api/quest` | POST | active-truth-path | Quest event processing |
| `POST /api/skill` | POST | active-truth-path | Skill event processing |
| `POST /api/resource` | POST | active-truth-path | Resource gathering |
| `GET/POST /api/inventory` | GET/POST | active-truth-path | Inventory operations |
| `POST /api/crafting` | POST | active-truth-path | Crafting operations |
| `GET/POST /api/equipment` | GET/POST | active-truth-path | Equipment management |
| `GET/POST /api/character` | GET/POST | active-truth-path | Character management, auth required |
| `POST /api/onboarding` | POST | active-truth-path | Player onboarding |
| `GET/POST /api/economy` | GET/POST | active-truth-path | Economy operations |
| `GET/POST /api/npc` | GET/POST | active-truth-path | NPC interactions |
| `GET/POST /api/quests` | GET/POST | active-truth-path | Quest operations |

## GLB Marketplace Routes (PR #2008)

**Mounted boundary:** read routes are live; mutating routes are explicitly disabled with `503 GLB_MUTATIONS_DISABLED` until a dedicated transaction-safe GLB write PR adds atomic DB transactions, idempotency, and rollback-safe file handling.

| Endpoint | Method | Auth | Classification | Notes |
|----------|--------|------|---------------|-------|
| `GET /api/glb/marketplace` | GET | No | Public read-only | Browse marketplace |
| `GET /api/glb/land/:playerId` | GET | No | Public read-only | Get placed models |
| `GET /api/glb/my-models` | GET | Yes | Auth read-only | List player's models |
| `GET /api/glb/subscription-status` | GET | Yes | Auth read-only | Check subscription and Matrix Energy |
| `POST /api/glb/upload` | POST | Yes | Disabled truth-path | Returns 503 until transaction-safe writes exist |
| `DELETE /api/glb/:modelId` | DELETE | Yes | Disabled truth-path | Returns 503 until transaction-safe writes exist |
| `POST /api/glb/place` | POST | Yes | Disabled truth-path | Returns 503 until transaction-safe writes exist |
| `DELETE /api/glb/place/:placeId` | DELETE | Yes | Disabled truth-path | Returns 503 until transaction-safe writes exist |
| `POST /api/glb/marketplace/list` | POST | Yes | Disabled truth-path | Returns 503 until transaction-safe writes exist |
| `POST /api/glb/marketplace/buy` | POST | Yes | Disabled truth-path | Returns 503 until transaction-safe writes exist |

**Security Note:** Mutating GLB endpoints do not return fake success. They require auth first and then fail closed with 503 until transaction-safe ownership/economy writes are implemented.

## Asset Brain Routes

**Classification: active-side-channel** (no gameplay mutation)

| Endpoint | Method | Auth | Notes |
|----------|--------|------|-------|
| `POST /api/asset-brain/generate` | POST | Yes | Generate asset specification |
| `GET /api/asset-brain/my-specs` | GET | Yes | User's specifications |
| `GET /api/asset-brain/specs/:id` | GET | Yes | Specification details |
| `GET /api/asset-brain/variants/:id` | GET | Yes | Specification variants |
| `GET /api/asset-brain/search` | GET | No | Search specifications (public read-only) |
| `GET /api/asset-brain/library` | GET | No | Browse asset library (public read-only) |
| `POST /api/asset-brain/batch` | POST | Yes | Start batch job |
| `GET /api/asset-brain/batch/:id` | GET | Yes | Batch job status |

## Side-Channel Routes (Observability)

These routes do not affect gameplay state:

| Endpoint | Method | Auth | Notes |
|----------|--------|------|-------|
| `GET /api/are` | GET | No | ARE telemetry heartbeat |
| `GET /api/are/validation` | GET | No | ARE validation |
| `GET /api/are/replay` | GET | No | ARE replay system |
| `GET /api/gameplay` | GET | No | Gameplay snapshots |
| `GET /api/self-healing` | GET | No | Self-healing dashboard |
| `GET /api/manifest` | GET | No | Manifest resync |
| `GET /api/are-shadow` | GET | No | ARE shadow logging |
| `GET /api/leaderboard` | GET | No | Leaderboard rankings |
| `GET /api/lore` | GET | No | Lore content |
| `GET/POST /api/questline` | GET/POST | No | Questlines |
| `POST /api/vote` | POST | No | Voting system |
| `GET /api/v1/warfront` | GET | No | Warfront combat |
| `GET /api/v1` | GET | No | Science mascot API |
| `GET/POST /api/mcp` | GET/POST | No | MCP protocol |

## Admin Content API

**Base Path:** `/api/admin/content/*`

| Endpoint | Method | Auth | Notes |
|----------|--------|------|-------|
| `GET /meta` | GET | Token | Content metadata |
| `GET /choices` | GET | Token | Content choices |
| `GET /model-path-audit` | GET | Token | Model path audit |
| `GET /model-needs` | GET | Token | Model needs |
| `GET /glb-gallery-tree` | GET | Token | GLB gallery tree |
| `GET /glb-links` | GET | Token | GLB links |
| `POST /glb-links` | POST | Token | Create GLB link |
| `DELETE /glb-links` | DELETE | Token | Delete GLB link |
| `POST /glb-upload` | POST | Token | Upload GLB |
| `POST /glb-smart-upload` | POST | Token | Smart GLB upload |
| `POST /validate-preview` | POST | Token | Validate preview |
| `POST /publish-pack` | POST | Token | Publish content pack |

**Auth:** `ADMIN_PANEL_TOKEN` or `X-Admin-Token` header, or Supabase bearer + allowlist.

## Finance / Payment

| Endpoint | Method | Auth | Notes |
|----------|--------|------|-------|
| `POST /api/finance/paypal/checkout` | POST | No | Create PayPal checkout |
| `POST /api/finance/paypal/verify` | POST | No | Verify transaction |
| `POST /api/finance/paypal/webhook` | POST | No | PayPal webhook |

## Playtester Monitor

| Endpoint | Method | Auth | Notes |
|----------|--------|------|-------|
| `GET /playtester-monitor.html` | GET | Token | Monitor UI |
| `GET /playtester-render-publisher.html` | GET | Token | Publisher UI |
| `GET /api/playtester/debug-log` | GET | Token | Debug log data |
| `WS /playtester-monitor` | WS | Token | Monitor stream |
| `WS /playtester-monitor-signal` | WS | Token | WebRTC signaling |

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

All API responses are JSON:

**Success:**
```json
{ "ok": true, "data": { ... } }
```

**Error:**
```json
{ "ok": false, "error": "error_code", "message": "Human readable message" }
```

## Authentication

Routes marked "Auth: Yes" require one of:

1. **Admin Token:** `X-Admin-Token` or `ADMIN_PANEL_TOKEN` header
2. **Supabase Bearer:** `Authorization: Bearer <token>` with valid JWT
3. **Auth Middleware:** `authMiddleware` derives `userId`/`playerId` from JWT

**Important:** Do NOT trust `x-player-id` header alone for identity.

## Rate Limiting

Admin routes are protected by `adminRateLimiter` middleware.

## References

- `server/src/api/routeRegistry.ts` - Machine-readable route manifest
- `scripts/audit-route-registry.mjs` - Static route audit
- `scripts/probe-runtime-routes.mjs` - Runtime probe (validates auth boundaries)
- `docs/ROUTE_REGISTRY.md` - Detailed route registry
