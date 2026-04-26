# Module Manifest (Live Runtime Focus)

This manifest lists the **actively wired** modules and entry points used by the current game runtime.
For exhaustive per-file discovery use `server/src/modules/**` directly.

## Core runtime

- `server/src/core/WorldTick.ts` — main simulation orchestrator (100ms tick)
- `server/src/core/ServerBootstrap.ts` — HTTP/WS bootstrap, route registration, static serving
- `server/src/networking/WebSocketServer.ts` — authoritative socket layer

## Gameplay systems

- `server/src/modules/player/PlayerSystem.ts`
- `server/src/modules/combat/CombatSystem.ts`
- `server/src/modules/quest/QuestEngine.ts`
- `server/src/modules/questline/questlineEngine.ts`
- `server/src/modules/inventory/InventorySystem.ts`
- `server/src/modules/crafting/CraftingSystem.ts`
- `server/src/modules/guild/GuildSystem.ts`
- `server/src/modules/economy/EconomySystem.ts`
- `server/src/modules/vote/VoteSystem.ts`
- `server/src/modules/warfront/WarfrontSystem.ts`

## NPC and autonomy

- `server/src/modules/npc/NPCSystem.ts`
- `server/src/modules/npc/NPCMemoryCache.ts`
- `server/src/modules/npc/NPCMemoryPersistence.ts`
- `server/src/modules/npc/NPCChatAgent.ts`
- `server/src/modules/npc/NPCRelationshipSystem.ts`
- `server/src/modules/ouroboros/OuroborosEngine.ts`
- `server/src/modules/playtester/AutonomousPlaytester.ts`

## Fusion integrations (new)

- `server/src/modules/gameplay/GameplayFusionDirector.ts` — combines:
  - quest echo beacons
  - adaptive scene/profile overrides
  - construction contracts from model-needs

## World and assets

- `server/src/modules/world/WorldSystem.ts`
- `server/src/modules/world/ChunkSystem.ts`
- `server/src/modules/world/WorldObjectSystem.ts`
- `server/src/modules/world/AssetPoolResolver.ts`
- `server/src/modules/asset-registry/GLBRegistry.ts`
- `server/src/modules/content/adminGlbModelNeeds.ts`

## Playtester monitor / WebRTC

- `server/src/modules/playtester/PlaytesterMonitorStream.ts`
- `server/src/modules/playtester/PlaytesterWebRTCSignaling.ts`
- `client/src/playtesterMonitorViewerMain.ts`
- `client/src/playtesterRenderPublisherMain.ts`

## Admin APIs

- `server/src/api/adminContentRoute.ts`
- `server/src/api/voteRoute.ts`
- `server/src/api/questlineRoute.ts`
- `server/src/api/leaderboardRoute.ts`
- `server/src/api/loreRoute.ts`
- `server/src/api/mcpRoute.ts`

## Historical / not canonical

Many additional files under `server/src/modules/` represent partial, experimental, or future systems.
Treat this document as the runtime-first map for operators and contributors.
