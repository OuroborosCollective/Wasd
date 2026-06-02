# WASD Client-2D Rendering Best Practices

<!--
type: guide
created: 2026-06-02
updated: 2026-06-02
owner: client-2d
-->

## Overview

This guide captures best practices for working with the client-2d (PixiJS) isometric renderer. It focuses on common pitfalls, debugging strategies, and patterns that prevent issues like chunk visibility failures.

## Core Architecture

### Entry Points

| Entry | File | Purpose |
|-------|------|---------|
| Main App | `DeterministicWorldIsoApp.tsx` | React + PixiJS integration |
| UI System | `UIManager.tsx` | React UI overlay |
| Rendering | PixiJS v7 | 60 FPS interpolated sprites |

### Coordinate Systems

Understanding the coordinate layers is critical:

```
KAPPA (millis)    → Internal units (1 tile = 1000 kappa)
  ↓ × 1000
TILE              → Grid position (0-15 within chunk)
  ↓ × chunkTiles
CHUNK             → Chunk coordinates (0_0, 0_1, etc.)
```

**Key conversions:**
```typescript
// Tile to Kappa
const kappa = tile * 1000;

// Kappa to chunk
const chunkX = Math.floor(kappa / (chunkTiles * 1000));

// Server position (tiles) to kappa
const playerKappa = {
  x: payloadCoord(self, "x") * 1000,
  z: payloadCoord(self, "z") * 1000
};
```

## Best Practices

### 1. Always Initialize on First Heartbeat

**Problem:** When player starts near (0,0), movement threshold checks fail.

**Pattern:**
```typescript
const hasInitializedVisibility = useRef(false);

// In heartbeat handler:
if (!hasInitializedVisibility.current || dx >= 500 || dz >= 500) {
  hasInitializedVisibility.current = true;
  lastPlayerKappa.current = playerKappa;
  chunkManagerRef.current?.updateVisibility(playerKappa);
}
```

**Why:** Prevents race condition where `lastPlayerKappa` matches `playerKappa` on first update.

### 2. Use Debug HUD for Development

**Always add debug instrumentation:**
```typescript
// In component state
const [debugHeartbeatReceived, setDebugHeartbeatReceived] = useState(false);
const [debugPlayerPos, setDebugPlayerPos] = useState<{ x: number; z: number } | null>(null);

// In heartbeat handler
setDebugHeartbeatReceived(true);
setDebugPlayerPos({ x: playerKappa.x, z: playerKappa.z });

// Console logging
console.log("[PlayerPosDebug]", { playerKappa, lastPlayerKappa });
```

**UI Integration:**
```typescript
<ArelorianStitchHud
  debugPlayerPos={debugPlayerPos ?? undefined}
  debugHeartbeatReceived={debugHeartbeatReceived}
  // ...
/>
```

### 3. Verify Server Payloads

Always validate the structure of server events:

```typescript
// WRONG: Assumes payload structure
const pos = event.payload.self;

// CORRECT: Defensive checking
if (event.payload?.self) {
  const self = event.payload.self;
  const playerKappa = {
    x: payloadCoord(self, "x") * 1000,
    z: payloadCoord(self, "z") * 1000,
  };
}
```

### 4. Throttle but Don't Block

**Problem:** Over-updating causes performance issues.

**Solution:** Use throttling but force initial update:
```typescript
updateVisibility(playerKappa, force?: boolean): void {
  const now = performance.now();
  if (!force && now - this.lastUpdateAt < this.config.throttleMs) {
    return;
  }
  // ... actual update
}
```

**Usage:**
```typescript
// Normal throttled update
chunkManager.updateVisibility(playerKappa);

// Force update (for testing or initial load)
chunkManager.updateVisibility(playerKappa, true);
```

### 5. ChunkManager Lifecycle

**Always initialize before use:**
```typescript
const chunkManagerRef = useRef<ChunkManager | null>(null);

// In useEffect or initialization
chunkManagerRef.current = new ChunkManager({
  worldSeed: "areloria:earth_1_1",
  biomeId: "forest_village",
  chunkTiles: 16,
  viewRadius: 1,  // 3x3 grid
  throttleMs: 500,
});

// Initialize with render context
chunkManagerRef.current.init(ctx);
```

**Cleanup:**
```typescript
// On unmount
chunkManagerRef.current?.destroy();
chunkManagerRef.current = null;
```

## Common Patterns

### Pattern: Entity Position Update

```typescript
function setActor(
  id: string,
  tileX: number,
  tileZ: number,
  name: string,
  isPlayer: boolean,
  characterVisualId: string | null,
  weaponVisualId: string | null
) {
  const existing = entities.current.get(id);
  if (!existing) {
    // Create new entity
    const entity = createEntity(id, name, isPlayer);
    entities.current.set(id, entity);
  }
  
  // Update logical position (in tiles)
  const entity = entities.current.get(id)!;
  entity.tx = tileX;
  entity.tz = tileZ;
  
  // Visual update is handled by InterpolatedSpriteManager
  // DO NOT directly set entity.root.x here
}
```

### Pattern: Follow Camera

```typescript
function followCamera(app: Application, deltaTime = 1) {
  const world = worldLayerRef.current;
  const self = entities.current.get("self");
  if (!world || !self) return;
  
  const targetX = app.screen.width / 2 - self.root.x;
  const targetY = app.screen.height / 2 - self.root.y - 18;
  
  // Smooth follow with easing
  const ease = Math.min(0.18 * deltaTime, 0.36);
  world.x += (targetX - world.x) * ease;
  world.y += (targetY - world.y) * ease;
}
```

### Pattern: Visibility Update Debounce

```typescript
const lastPlayerKappa = useRef({ x: 0, z: 0 });
const hasInitializedVisibility = useRef(false);

function onHeartbeat(event: any) {
  const playerKappa = {
    x: payloadCoord(event.payload.self, "x") * 1000,
    z: payloadCoord(event.payload.self, "z") * 1000,
  };
  
  const dx = Math.abs(playerKappa.x - lastPlayerKappa.current.x);
  const dz = Math.abs(playerKappa.z - lastPlayerKappa.current.z);
  
  if (!hasInitializedVisibility.current || dx >= 500 || dz >= 500) {
    hasInitializedVisibility.current = true;
    lastPlayerKappa.current = playerKappa;
    chunkManagerRef.current?.updateVisibility(playerKappa);
  }
}
```

## Debugging Checklist

When chunk visibility fails:

- [ ] Debug HUD visible? (Heartbeat status ✓/✗)
- [ ] Console shows `[PlayerPosDebug]` logs?
- [ ] Network tab shows `WORLD_HEARTBEAT` events?
- [ ] `payload.self` has valid `x` and `z` fields?
- [ ] `hasInitializedVisibility` set to `true`?
- [ ] `chunkManager.getActiveChunkCount()` > 0?

## Related Documentation

- [Manifest System](../MANIFEST_SYSTEM.md) - Server authority
- [AI Skill: Chunk Visibility](../ai-skills/wasd-client-2d-chunk-visibility.md) - Troubleshooting
- [AI Skill: WASD Typescript Troubleshooting](../ai-skills/wasd-typescript-troubleshooting.md) - Common errors