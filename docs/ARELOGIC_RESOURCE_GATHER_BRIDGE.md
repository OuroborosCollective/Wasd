# ARELOGIC Resource Gather Bridge

## Overview

Resource gathering in Arelorian uses a server-authoritative bridge to prevent client-side cheating. The player's real position — derived from the server heartbeat — is published to a bridge that `ResourceNodeMarkerLayer` reads before sending a gather intent.

## Why the Bridge Exists

### PR #1777: ResourceGatherIntentAdapter (Merged)

Before this PR, `ResourceNodeMarkerLayer` sent gather requests **without** a player position. The server had no way to verify the player's distance to the resource node. This meant any gather attempt would succeed regardless of proximity — a trivially exploitable bug.

The `ResourceGatherIntentAdapter` was introduced to:
1. **Require** a player position in every gather intent
2. **Reject** intents that don't include a valid position (`missing_player_position`)
3. **Normalize** positions to safe, bounded values

However, the adapter only validated what it received — it still needed a **source** for the player's real position.

### PR #1778: PlayerPositionBridge (Merged + Extended)

Before this PR, `ArelorianStitchHud` received `debugPlayerPos` from the server heartbeat but never published it. The `PlayerPositionBridge` existed as a helper but was never wired up.

The bridge is now published in `ArelorianStitchHud` via:

```typescript
// ArelorianStitchHud.tsx
useEffect(() => {
  if (debugPlayerPos) {
    publishPlayerPositionBridge(debugPlayerPos);
  }
}, [debugPlayerPos?.x, debugPlayerPos?.z]);
```

And consumed in `ResourceNodeMarkerLayer`:

```typescript
// ResourceNodeMarkerLayer.tsx
const playerPosition = getPlayerPosition?.() ?? readPlayerPositionBridge();
const result = await dispatchGather({
  playerId: DEFAULT_GAMEPLAY_PLAYER_ID,
  nodeId,
  currentTick: snapshot.serverTick ?? 0,
  playerPosition: playerPosition ?? undefined,  // undefined → adapter rejects with missing_player_position
});
```

## Data Flow

```
Server Heartbeat (10 Hz)
  → debugPlayerPos { x: 460000, z: 500000 }  (kappa units)
    → publishPlayerPositionBridge({ x: 460000, z: 500000 })
      → sessionStorage: { x: 460, y: 500 }     (tile units, divided by 1000)
        → ResourceNodeMarkerLayer reads via readPlayerPositionBridge()
          → dispatchGather() with playerPosition: { x: 460, y: 500 }
            → ResourceGatherIntentAdapter normalizes
            → POST /api/resource/gather
              → GatheringService checks Math.hypot(playerPosition, nodePosition) ≤ radius
              → 200 OK with XP + item reward, or 409 with reason
                → snapshot refetch → UI update
```

## Determinism Rules

| Rule | Rationale |
|------|-----------|
| Client never mutates inventory | Server is source of truth |
| Client never uses node position as player position | Adapter requires playerPosition; missing → rejection |
| Server checks distance, not client | Prevents packet manipulation |
| No `Math.random()` for gather outcomes | Deterministic replay |
| No `Date.now()` for gameplay state | Tick-based determinism |
| Player position from server heartbeat, not client estimation | Prevents spoofing |

## Server-Side Validation

The `/api/resource/gather` route enforces:

1. **Valid nodeId** — safe identifier pattern, 1-96 chars
2. **Required playerPosition** — finite x/y in [-100_000, 100_000]
3. **Distance check** — `Math.hypot(playerPos - nodePos) ≤ node.radius`
4. **Depletion check** — node must not be depleted (based on `currentTick`)
5. **Skill level** — player must meet `requiredLevel`

If any check fails, the route returns `{ ok: false, result: { reason: "..." } }` with HTTP 409.

## Error Messages

The `ResourceNodeMarkerLayer` maps server reasons to human-readable messages:

| Server reason | User message |
|--------------|--------------|
| `missing_player_position` / `invalid_player_position` | "⚠ Move closer or wait for position sync" |
| `too_far` | "⚠ Too far from resource" |
| `node_depleted` | "⚠ Resource depleted — try again later" |
| `node_not_found` / `invalid_node_id` | "⚠ Resource node not found" |
| `level_too_low` | "⚠ Skill level too low" |
| `missing_tool` | "⚠ Missing required tool" |
| `cooldown` | "⚠ Resource not ready yet" |

## Known Limitations

- **Starter nodes are static** — defined in `STARTER_RESOURCE_NODES`, not procedurally generated
- **Tool requirements not enforced** — `missing_tool` is defined but not yet wired up in the gather flow (see `feat/resource-node-contract-v2`)
- **Worldgen resources** — future chunk-based resource spawning is out of scope for this bridge
- **SessionStorage as bridge** — not persistent; fine for UI-only bridge (no gameplay authority)

## Files Changed

| File | Role |
|------|------|
| `apps/client-2d/src/ArelorianStitchHud.tsx` | Publishes `debugPlayerPos` → `PlayerPositionBridge` |
| `apps/client-2d/src/ui/ResourceNodeMarkerLayer.tsx` | Reads bridge, dispatches gather, shows feedback |
| `apps/client-2d/src/game/PlayerPositionBridge.ts` | sessionStorage bridge (publish/read) |
| `apps/client-2d/src/game/ResourceGatherIntentAdapter.ts` | Validates and normalizes gather intent |
| `apps/client-2d/src/game/ResourceGatherIntentAdapter.test.ts` | Unit tests for adapter |
| `apps/client-2d/src/game/PlayerPositionBridge.test.ts` | Unit tests for bridge |
| `server/src/routes/resourceGatherRoute.ts` | Server gather endpoint with validation |
| `server/src/resources/ResourceNodeStore.ts` | Distance check, depletion, skill check |
| `server/src/resources/GatheringService.ts` | XP reward, inventory persistence |
| `docs/ARELOGIC_RESOURCE_GATHER_BRIDGE.md` | This document |

## Next Steps

See `feat/resource-node-contract-v2` for tool requirements and depletion enforcement.