# ROUTE_REGISTRY.md

## Overview

This document is the authoritative registry of all API routes in the Areloria server. It is generated from `server/src/core/ServerBootstrap.ts` and serves as the single source of truth for route validation.

## Audit

Run `scripts/audit-route-registry.mjs` to validate:

- Route file exists
- Route mounted in ServerBootstrap.ts
- Client references resolve
- Documentation entry exists

## Mounted Routes

All routes are mounted in `server/src/core/ServerBootstrap.ts`.

| Route | Source File | Purpose |
|-------|-------------|---------|
| `/health` | `server/src/api/healthRoutes.js` | Health probes |
| `/agora` | `server/src/api/agoraRoute.js` | Agora integration |
| `/api/mcp` | `server/src/api/mcpRoute.js` | MCP protocol |
| `/api/v1/*` | `server/src/api/scienceMascotRoute.js` | Science mascot API |
| `/api/client2d-assets` | `server/src/api/client2dAssetUploadRoute.js` | Asset uploads |
| `/api/leaderboard` | `server/src/api/leaderboardRoute.js` | Leaderboard data |
| `/api/questlines` | `server/src/api/questlineRoute.js` | Questlines |
| `/api/lore` | `server/src/api/loreRoute.js` | Lore content |
| `/api/v1/warfront` | `server/src/api/warfrontRoute.js` | Warfront combat |
| `/api/are/validation` | `server/src/api/areValidationRoute.js` | ARE validation |
| `/api/are/replay` | `server/src/api/areReplayRoute.js` | ARE replay |
| `/api/are` | `server/src/routes/areHeartbeat.js` | ARE heartbeat |
| `/api/gameplay` | `server/src/routes/gameplaySnapshot.js` | Gameplay snapshots |
| `/api/quest` | `server/src/routes/questEventRoute.js` | Quest events |
| `/api/skill` | `server/src/routes/skillEventRoute.js` | Skill events |
| `/api/resource` | `server/src/routes/resourceGatherRoute.js` | Resource gathering |
| `/api/inventory` | `server/src/routes/inventoryRoute.js` | Inventory operations |
| `/api/crafting` | `server/src/routes/craftingRoute.js` | Crafting system |
| `/api/equipment` | `server/src/routes/equipmentRoute.js` | Equipment management |
| `/api/character` | `server/src/character/characterRoute.js` | Character management |
| `/api/onboarding` | `server/src/routes/onboardingRoute.js` | Player onboarding |
| `/api/economy` | `server/src/economy/economyRoute.js` | Economy system |
| `/api/npc/*` | `server/src/npc/VendorRoutes.js` | NPC vendor routes |
| `/api/npc/*` | `server/src/npc/CampNpcRoutes.js` | Camp NPC routes |
| `/api/npc/*` | `server/src/quests/npcQuestRoute.js` | NPC quest routes |
| `/api/quests` | `server/src/quests/npcQuestRoute.js` | Quest routes |
| `/api/self-healing` | `server/src/routes/selfHealWorkshopRoute.js` | Self-healing dashboard |
| `/api/manifest` | `server/src/api/manifestResyncRoute.js` | Manifest resync |
| `/api/finance` | `server/src/api/financeRoute.js` | Finance integration |
| `/api/are-shadow` | `server/src/api/areShadowLogRoute.js` | ARE shadow logging |
| `/api/sovereign/deploy` | `server/src/api/sovereignDeployRoute.js` | Sovereign deployment |
| `/api/admin/content` | `server/src/api/adminContentRoute.js` | Admin content |
| `/api/vote` | `server/src/api/voteRoute.js` | Voting system |
| `/api/playtester/debug-log` | Inline (ServerBootstrap.ts) | Playtester debug |

## Static Routes

| Route | Type | Purpose |
|-------|------|---------|
| `/2d/*` | Static | 2D client assets |
| `/3d/*` | Static | 3D client assets |
| `/portal/*` | Static | Portal application |
| `/itch/*` | Static | Itch.io client |
| `/world-assets/*` | Static | World assets |
| `/world/*` | Static | World content |
| `/client2d-assets/*` | Static | GraphicRiver ISO assets |

## Route Categories

### Truth-Path Routes

These routes affect simulation state:

- `/api/quest` - Quest events modify game state
- `/api/skill` - Skill events affect gameplay
- `/api/resource` - Resource gathering changes world
- `/api/inventory` - Inventory changes affect gameplay
- `/api/crafting` - Crafting modifies inventory

### Side-Channel Routes

These routes are for observability/monitoring:

- `/api/are` - ARE heartbeat (telemetry)
- `/api/are-shadow` - Shadow logging
- `/api/leaderboard` - Rankings (analytics)
- `/api/self-healing` - Health monitoring
- `/health` - Health probes

### Admin Routes

These routes require admin authentication:

- `/api/sovereign/deploy` - Deployment control
- `/api/admin/content` - Content management
- `/api/client2d-assets` - Asset uploads

## Potential Failure Modes

### Dead Path

```
Route exists
        ↓
Not mounted
        ↓
Client still references endpoint
        ↓
Silent dead path
```

### Detection

Run the audit script:

```bash
node scripts/audit-route-registry.mjs
```

Output:

```json
{
  "mounted": [...],
  "orphaned": [...],
  "undocumented": [...],
  "deadClientReferences": [...]
}
```

## Validation Checklist

For each new route:

- [ ] Route file created in `server/src/routes/` or `server/src/api/`
- [ ] Route exported as router function
- [ ] Router imported in `ServerBootstrap.ts`
- [ ] Route mounted via `app.use()`
- [ ] Client references point to mounted route
- [ ] Documentation entry added to this file
- [ ] Health probe capability verified

## References

- ARE_RUNTIME_CONTRACT.md - Master runtime contract
- WEBSOCKET_TRUTH_PATH.md - Network truth path
