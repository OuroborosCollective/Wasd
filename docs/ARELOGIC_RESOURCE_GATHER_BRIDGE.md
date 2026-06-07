# ARELogic Resource Gather Bridge

## Overview

Resource gathering in the 2D client is a server-authoritative, position-validated interaction. The bridge connects server heartbeat position data to client-side UI for resource node interaction.

## Why This Bridge Exists

### Problem: Fake Gather (#1777)

Before this bridge, the client could send a gather intent without a real player position. The `ResourceGatherIntentAdapter` would accept `undefined` player position, and the server had no way to verify the player was actually near the resource node.

This meant:
- Any marker could be clicked from anywhere → items generated from thin air
- No distance validation → fake gathering
- Client could mutate inventory without server consent

**PR #1777** fixed the client-side adapter to require a valid `playerPosition` — but the client still had no way to obtain the real player position from the server heartbeat.

### Solution: PlayerPositionBridge (#1778)

**PR #1778** introduced a `PlayerPositionBridge` that:
1. Receives `debugPlayerPos` (Kappa-position from server heartbeat) in `ArelorianStitchHud`
2. Publishes it via `publishPlayerPositionBridge()` to `sessionStorage`
3. `ResourceNodeMarkerLayer` reads it via `readPlayerPositionBridge()`
4. The position flows into `dispatchGather()` → server validates distance

## Data Flow

```
Server Heartbeat (kappa x/z units)
  └─> ArelorianStitchHud.debugPlayerPos
        └─> publishPlayerPositionBridge(debugPlayerPos)
              └─> sessionStorage["wasd:2d:player-position:v1"]
                    └─> ResourceNodeMarkerLayer.handleGather
                          └─> readPlayerPositionBridge()
                                └─> dispatchGather(playerPosition)
                                      └─> POST /api/resource/gather
                                            └─> GatheringService.gather()
                                                  └─> ResourceNodeStore.gather(distance check)
                                                        └─> snapshot refresh → UI update
```

## Key Architecture Decisions

### 1. SessionStorage as UI Bridge (Not Gameplay State)

`PlayerPositionBridge` uses `sessionStorage` as a bridge between React components, NOT as gameplay state. The bridge:
- Is read-only for UI (markers read it)
- Is written only by the HUD (which receives server heartbeat)
- Has no gameplay authority — the server always validates

### 2. Kappa → World Unit Conversion

Server heartbeat sends position in **Kappa units** (e.g., `460000`). Starter resource nodes are defined in **world units** (e.g., `460`). The bridge divides by 1000:

```typescript
// publishPlayerPositionBridge stores:
{ x: x / 1000, y: z / 1000 }

// readPlayerPositionBridge returns world units
```

This matches the coordinate system used in `StarterResourceNodes.ts`.

### 3. Server-Authoritative Distance Check

The server route `/api/resource/gather` validates:
- `playerPosition` is required (400 error if missing)
- Position must be finite and within bounds
- Distance from player to node must be ≤ `node.radius`
- Node must not be depleted

The client CANNOT fake gathering by sending node position as player position — the bridge only provides the server-provided heartbeat position.

### 4. No Client Inventory Mutation

The client:
1. Sends `dispatchGather()` with player position
2. Server validates and mutates inventory/skill XP
3. Server responds with result
4. Client refetches `LiveGameplaySnapshot`
5. UI updates from server state

No `Math.random()` for gameplay, no `Date.now()` for game state.

## Gather Error Feedback

When gather fails, the player sees a human-readable message:

| Server Reason | User Message |
|---|---|
| `missing_player_position` | "Move closer — waiting for position sync" |
| `invalid_player_position` | "Position sync missing" |
| `node_not_found` | "Resource node not found" |
| `too_far` | "Too far from resource" |
| `node_depleted` | "Resource depleted" |
| `level_too_low` | "Skill level too low" |
| `inventory_full` | "Inventory full" |

## Known Limitations

1. **Starter nodes are static** — no procedural generation of resources yet
2. **Tool requirements not yet enforced** — ore/tree/fish don't require tools (axe/pickaxe/rod)
3. **No dynamic resource spawning** — resources respawn deterministically by tick, but no chunk-based generation
4. **Single-player gather intent** — no multiplayer simultaneous gather coordination

## Files

| File | Role |
|---|---|
| `apps/client-2d/src/ArelorianStitchHud.tsx` | Publishes `debugPlayerPos` to bridge |
| `apps/client-2d/src/game/PlayerPositionBridge.ts` | sessionStorage bridge for player position |
| `apps/client-2d/src/ui/ResourceNodeMarkerLayer.tsx` | Reads bridge, triggers gather, shows feedback |
| `apps/client-2d/src/game/gameplayActions.ts` | `dispatchGather()` → server API call |
| `apps/client-2d/src/game/ResourceGatherIntentAdapter.ts` | Validates intent before sending |
| `server/src/routes/resourceGatherRoute.ts` | HTTP endpoint, validates position |
| `server/src/resources/GatheringService.ts` | Gathering logic, XP/inventory mutation |
| `server/src/resources/ResourceNodeStore.ts` | Node state, distance check, depletion |
| `server/src/resources/StarterResourceNodes.ts` | Static node definitions |

## Testing

- `PlayerPositionBridge.test.ts` — unit tests for publish/read/edge cases
- `ResourceGatherIntentAdapter.test.ts` — unit tests for adapter validation
- Server distance checks verified by code review (no mocking)

## Next Steps (PR after #1778)

See `feat/resource-node-contract-v2`:
- Tool requirements (axe/pickaxe/rod)
- Node depletion enforcement
- Quest progress from real server state
- Deterministic gather tests