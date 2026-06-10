# Chunk Radius Conflict Resolution

## Problem

There is a chunk radius conflict between:
- `ObserverEngine.viewDistanceChunks = 2` (5×5 grid, 128 tile radius)
- `SpatialBroadcastGrid` (3×3 grid, 64 tile radius)

This was identified in the Core Reality Alignment Audit.

## Solution

Use the `UnifiedChunkContract` as the single source of truth for chunk radii.

### Current Architecture

```typescript
// server/src/modules/observer/ObserverEngine.ts
private viewDistanceChunks = 2; // HARDCODED - conflict source

// server/src/core/are/SpatialBroadcastTickSystem.ts
// Uses UnifiedChunkContract.broadcastRadiusChunks = 1
```

### Resolution

The `ObserverEngine` should reference the `UnifiedChunkContract` instead of hardcoding its radius.

### Migration Steps

1. **Update ObserverEngine to use UnifiedChunkContract**

```typescript
// BEFORE (hardcoded)
private viewDistanceChunks = 2;

// AFTER (uses contract)
import { UNIFIED_CHUNK_CONTRACT } from '../../core/spatial/UnifiedChunkContract.js';

private get viewDistanceChunks() {
  return UNIFIED_CHUNK_CONTRACT.simulationRadiusChunks;
}
```

2. **Verify SpatialBroadcastGrid uses broadcastRadiusChunks**

The SpatialBroadcastTickSystem already uses `UNIFIED_CHUNK_CONTRACT.broadcastRadiusChunks = 1` (3×3 grid).

### UnifiedChunkContract Values

```typescript
export const UNIFIED_CHUNK_CONTRACT: UnifiedChunkContract = {
  chunkSizeTiles: 64,
  simulationRadiusChunks: 2,  // 5×5 = ObserverEngine
  broadcastRadiusChunks: 1,   // 3×3 = SpatialBroadcastGrid
};
```

- **simulationRadiusChunks (2)**: Used for AI/NPC perception range
- **broadcastRadiusChunks (1)**: Used for network broadcast to clients

### Why Different Radii?

- **5×5 (simulation)**: NPCs need to perceive players 2 chunks away for AI decision-making
- **3×3 (broadcast)**: Clients only need entities within immediate vicinity for rendering

This is intentional architecture - the contract formalizes the difference between simulation and broadcast needs.

## Status

| Component | Current | Should Be | Status |
|-----------|---------|-----------|--------|
| ObserverEngine | Hardcoded 2 | `simulationRadiusChunks` | ⏳ Pending |
| SpatialBroadcastTickSystem | Uses contract | Uses contract | ✅ OK |

## Files to Modify

1. `server/src/modules/observer/ObserverEngine.ts` - Replace hardcoded `viewDistanceChunks` with contract reference