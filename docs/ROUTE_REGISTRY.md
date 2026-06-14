# ROUTE_REGISTRY.md

## Overview

**⚠️ Important: This is a manually maintained registry validated by `scripts/audit-route-registry.mjs`.**
**This document is NOT auto-generated.**

This registry documents the known API routes in the Areloria server based on static analysis of `server/src/core/ServerBootstrap.ts`.

**Machine-Readable Registry:** `server/src/api/routeRegistry.ts`

**Limitations:**
- Static analysis cannot validate runtime behavior
- Routes may be conditionally mounted
- Express middleware may alter routing
- Runtime probes are needed for full validation

## Audit

Run `scripts/audit-route-registry.mjs` to validate:

- Route file exists
- Route imported and mounted in ServerBootstrap.ts
- Client references resolve
- Documentation entry exists

```bash
# Baseline mode (report without failing)
node scripts/audit-route-registry.mjs --baseline

# Strict mode (fail on findings)
node scripts/audit-route-registry.mjs --strict
```

## Runtime Probes

Verify route health at runtime with `scripts/probe-runtime-routes.mjs`:

```bash
# Probe live routes (requires running server)
node scripts/probe-runtime-routes.mjs --port 3001

# Baseline mode (report without failing)
node scripts/probe-runtime-routes.mjs --port 3001 --baseline
```

## Mounted Routes

All routes are mounted in `server/src/core/ServerBootstrap.ts`.

### Truth-Path Routes (Gameplay-Affecting)

These routes affect simulation state and require deterministic tick-safe behavior:

| Route | Source File | Purpose | Auth |
|-------|-------------|---------|------|
| `/api/quest` | `server/src/routes/questEventRoute.ts` | Quest events | No |
| `/api/skill` | `server/src/routes/skillEventRoute.ts` | Skill events | No |
| `/api/resource` | `server/src/routes/resourceGatherRoute.ts` | Resource gathering | No |
| `/api/inventory` | `server/src/routes/inventoryRoute.ts` | Inventory operations | No |
| `/api/crafting` | `server/src/routes/craftingRoute.ts` | Crafting system | No |
| `/api/equipment` | `server/src/routes/equipmentRoute.ts` | Equipment management | No |
| `/api/character` | `server/src/character/characterRoute.ts` | Character management | Yes |
| `/api/onboarding` | `server/src/routes/onboardingRoute.ts` | Player onboarding | No |
| `/api/economy` | `server/src/economy/economyRoute.ts` | Economy system | - |
| `/api/npc` | `server/src/npc/VendorRoutes.ts` | NPC vendor routes | - |
| `/api/npc` | `server/src/npc/CampNpcRoutes.ts` | Camp NPC routes | - |
| `/api/npc` | `server/src/npc/npcQuestRoute.ts` | NPC quest routes | - |
| `/api/quests` | `server/src/quests/npcQuestRoute.ts` | Quest routes | - |
| `/api/admin/loot` | `server/src/routes/lootRoutes.ts` | ARE loot machine | Yes |
| `/api/glb` | `server/src/api/glbUploadRoute.ts` | GLB marketplace | Yes |

**Note:** `/api/glb` is classified as active-truth-path because it mutates ownership, marketplace state, placement, and Matrix Energy. All mutating routes require authMiddleware.

### Side-Channel Routes (Non-Gameplay)

These routes are for observability/monitoring:

| Route | Source File | Purpose | Auth |
|-------|-------------|---------|------|
| `/health` | `server/src/api/healthRoutes.ts` | Health probes | No |
| `/api/are` | `server/src/routes/areHeartbeat.ts` | ARE telemetry heartbeat | No |
| `/api/are-shadow` | `server/src/api/areShadowLogRoute.ts` | ARE shadow logging | No |
| `/api/are/validation` | `server/src/api/areValidationRoute.ts` | ARE validation | No |
| `/api/are/replay` | `server/src/api/areReplayRoute.ts` | ARE replay system | No |
| `/api/gameplay` | `server/src/routes/gameplaySnapshot.ts` | Gameplay snapshots | No |
| `/api/self-healing` | `server/src/routes/selfHealWorkshopRoute.ts` | Self-healing dashboard | No |
| `/api/manifest` | `server/src/api/manifestResyncRoute.ts` | Manifest resync | No |
| `/api/leaderboard` | `server/src/api/leaderboardRoute.ts` | Leaderboard rankings | No |
| `/api/lore` | `server/src/api/loreRoute.ts` | Lore content | No |
| `/api/questlines` | `server/src/api/questlineRoute.ts` | Questlines | No |
| `/api/vote` | `server/src/api/voteRoute.ts` | Voting system | No |
| `/api/v1/warfront` | `server/src/api/warfrontRoute.ts` | Warfront combat | No |
| `/api/v1` | `server/src/api/scienceMascotRoute.ts` | Science mascot API | No |
| `/api/mcp` | `server/src/api/mcpRoute.ts` | MCP protocol | No |
| `/api/asset-brain` | `server/src/api/assetBrainRoute.ts` | Asset brain library | Yes |

### Admin Routes (Auth-Protected)

These routes require admin authentication:

| Route | Source File | Purpose | Auth |
|-------|-------------|---------|------|
| `/api/admin/content` | `server/src/api/adminContentRoute.ts` | Content admin | Yes |
| `/api/client2d-assets` | `server/src/api/client2dAssetUploadRoute.ts` | Asset uploads | Yes |
| `/api/sovereign/deploy` | `server/src/api/sovereignDeployRoute.ts` | Deployment control | Yes |
| `/api/finance` | `server/src/api/financeRoute.ts` | Finance (PayPal) | - |

### Inline Routes

| Route | Source | Purpose | Auth |
|-------|--------|---------|------|
| `/api/playtester/debug-log` | ServerBootstrap.ts:241 | Playtester debug | Yes |
| `/playtester-monitor.html` | ServerBootstrap.ts | Monitor UI | Yes |
| `/playtester-render-publisher.html` | ServerBootstrap.ts | Publisher UI | Yes |

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
| `/agora` | Router | Agora video integration |

## GLB Marketplace Routes (PR #2008)

The `/api/glb` router has the following sub-routes:

| Sub-Route | Method | Auth | Classification | Notes |
|-----------|--------|------|---------------|-------|
| `/marketplace` | GET | No | Public (read-only) | Browse marketplace listings |
| `/land/:playerId` | GET | No | Public (read-only) | Get placed models on land |
| `/upload` | POST | Yes | active-truth-path | Upload GLB (subscription required) |
| `/my-models` | GET | Yes | active-truth-path | List player's models |
| `/:modelId` | DELETE | Yes | active-truth-path | Delete owned model |
| `/place` | POST | Yes | active-truth-path | Place model on land |
| `/place/:placeId` | DELETE | Yes | active-truth-path | Remove placed model |
| `/marketplace/list` | POST | Yes | active-truth-path | List model for sale |
| `/marketplace/buy` | POST | Yes | active-truth-path | Buy model (transfers Matrix Energy) |
| `/subscription-status` | GET | Yes | active-truth-path | Check subscription status |

**Important:** All mutating routes use `authMiddleware` to derive player identity, not `x-player-id` header alone.

## Legacy/Orphaned Routes

Routes with real implementation but no current mount point. See `server/src/api/routeRegistry.ts` for full classification.

### Active Side-Channel (Not Mounted)

| Source File | Notes |
|-------------|-------|
| `server/src/routes/AIService.ts` | Internal AI service, used by routes/api.ts |
| `server/src/routes/OracleEndpoint.ts` | Ouroboros sync, used by routes/api.ts |
| `server/src/routes/WorldEventBus.ts` | Event bus, has tests |
| `server/src/api/dudenReportRoute.ts` | Duden telemetry |
| `server/src/api/sdkBillingRoute.ts` | Billing diagnostics, admin key |
| `server/src/api/worldHeartRoute.ts` | Shadow log adapter |

### Legacy Routes (Need Integration)

| Source File | Notes |
|-------------|-------|
| `server/src/api/areOracleRoute.ts` | ARE oracle, needs mount |
| `server/src/api/assetPipelineRoute.ts` | 3D asset pipeline, needs auth |
| `server/src/api/collectiveIngressRoute.ts` | Sovereign identity |
| `server/src/api/landRoute.ts` | Land ownership, client refs exist |
| `server/src/api/worldRoutes.ts` | World snapshot |
| `server/src/api/chatRoute.ts` | Chat system, dead export |
| `server/src/api/v1/b2b/trading.ts` | B2B trading |

### Delete Candidates (Stubs/Dead Code)

| Source File | Reason |
|-------------|--------|
| `server/src/api/index.ts` | Dead bundle - exports never imported |
| `server/src/api/oracleRoute.ts` | STUB - no implementation |
| `server/src/api/admin/editorRoutes.ts` | STUB - minimal class |
| `server/src/api/rest/playerRoutes.ts` | STUB - no implementation |
| `server/src/api/rest/worldRoutes.ts` | STUB - no implementation |
| `server/src/api/editorRoutes.ts` | STUB - requires options |
| `server/src/api/authRoute.ts` | Dead export |
| `server/src/api/auctionRoute.ts` | Dead export |
| `server/src/api/mailRoute.ts` | Dead export |
| `server/src/api/playerRoutes.ts` | Dead export |
| `server/src/api/adminRoute.ts` | Dead export |

## Deprecated Client References

| File | Path | Status | Action |
|------|------|--------|--------|
| `client/src/projects/art/SocketService.ts` | `/api/art/ws` | Deprecated | Marked @deprecated - no server endpoint |
| `client/src/ui/voteAdminPanel.ts` | `/api/check` | Placeholder | Not an actual call - example URL |

## Validation Checklist

For each new route:

- [ ] Route file created in `server/src/routes/` or `server/src/api/`
- [ ] Route exported as router function
- [ ] Router imported in `ServerBootstrap.ts`
- [ ] Route mounted via `app.use()`
- [ ] Client references point to mounted route
- [ ] Classification added to `server/src/api/routeRegistry.ts`
- [ ] Auth middleware added if route mutates state
- [ ] Runtime probe added to `scripts/probe-runtime-routes.mjs`

## References

- `server/src/api/routeRegistry.ts` - Machine-readable route manifest
- `scripts/audit-route-registry.mjs` - Static route audit
- `scripts/probe-runtime-routes.mjs` - Runtime route probe
- ARE_RUNTIME_CONTRACT.md - Master runtime contract
- WEBSOCKET_TRUTH_PATH.md - Network truth path
