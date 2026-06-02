# Client-2D Chunk Visibility Troubleshooting Skill

## Overview

This skill helps diagnose and fix chunk visibility issues in the client-2d (PixiJS) renderer. Common symptoms include the player seeing only the initial start village without dynamic chunk loading around them.

## Quick Reference

| Issue | Symptom | Likely Cause |
|-------|---------|--------------|
| No chunk loading | Only start village visible | `updateVisibility()` not called |
| Static world | Outside areas look "dead" | Server `self` position not updating |
| Chunks not updating | Player moved but world stayed | `hasInitializedVisibility` flag stuck |

## Common Tasks

### Task 1: Diagnose Chunk Visibility Issues

When the client shows only the start village and doesn't load chunks around the player:

**Step 1: Check the Debug HUD**
- Open the game and look for the "POSITION DEBUG" panel in the bottom-right corner
- If visible, check these indicators:
  - `Heartbeat: ✗` → No server heartbeat received
  - `Initialized: ✗` → `updateVisibility()` never called
  - `Player Pos: ---` → No position data

**Step 2: Check Console Logs**
- Open browser DevTools (F12) → Console tab
- Look for `[PlayerPosDebug]` logs
- These show: `playerKappa`, `lastPlayerKappa`, `chunkX`, `chunkZ`

**Step 3: Check Network Tab**
- Filter for WebSocket frames
- Look for `WORLD_HEARTBEAT` events
- Verify `payload.self` contains valid `x` and `z` coordinates

### Task 2: Fix Initial Visibility Update

The most common issue is that `updateVisibility()` is never called for players starting near position (0,0).

**Location:** `apps/client-2d/src/DeterministicWorldIsoApp.tsx`

**Symptoms:**
- Player starts at (0,0) or near it
- `lastPlayerKappa` is `{ x: 0, z: 0 }`
- Server reports player position with dx/dz < 500
- `updateVisibility()` condition `dx >= 500 || dz >= 500` is never true

**Fix:**
```typescript
// Add this ref near other useRef declarations
const hasInitializedVisibility = useRef(false);

// In the WORLD_HEARTBEAT handler, modify the condition:
// BEFORE (broken):
if (dx >= 500 || dz >= 500) {
  lastPlayerKappa.current = playerKappa;
  chunkManagerRef.current?.updateVisibility(playerKappa);
}

// AFTER (fixed):
if (!hasInitializedVisibility.current || dx >= 500 || dz >= 500) {
  hasInitializedVisibility.current = true;
  lastPlayerKappa.current = playerKappa;
  chunkManagerRef.current?.updateVisibility(playerKappa);
}
```

### Task 3: Verify Server `self` Position

The server sends `payload.self` in `WORLD_HEARTBEAT` events.

**Expected format:**
```typescript
{
  x: number,    // tile position (0-15 range within chunk)
  z: number,     // tile position
  name: string,
  weaponVisualId?: string
}
```

**If missing:**
1. Check server `WorldStateManager` sends `self` in heartbeat
2. Verify `payloadCoord()` helper is extracting correctly
3. Check for axis swap (x vs z confusion)

### Task 4: Check ChunkManager Configuration

**Location:** `apps/client-2d/src/world/ChunkManager.ts`

**Key settings:**
```typescript
const DEFAULT_CONFIG = {
  chunkTiles: 16,      // tiles per chunk (16x16 grid)
  viewRadius: 1,       // 1 = 3x3 grid, 2 = 5x5, etc.
  throttleMs: 500,      // minimum ms between updates
  // ...
};
```

**Common issues:**
- `throttleMs` too high → updates too infrequent
- `viewRadius` too small → too few chunks visible
- `chunkTiles` mismatch with server

## Troubleshooting

### Q: Debug HUD not showing
A: Make sure props are passed from `DeterministicWorldIsoApp.tsx`:
```typescript
<ArelorianStitchHud
  // ... other props
  debugPlayerPos={debugPlayerPos ?? undefined}
  debugChunkCoords={debugChunkCoords ?? undefined}
  debugVisibleChunks={debugVisibleChunks ?? undefined}
  debugHeartbeatReceived={debugHeartbeatReceived}
  debugInitialized={hasInitializedVisibility.current}
/>
```

### Q: Console logs not appearing
A: Check that `console.log("[PlayerPosDebug]", ...)` is inside the `if (event.payload?.self)` block in the heartbeat handler.

### Q: Chunks load but don't update
A: This is likely a throttling issue. Check `throttleMs` in ChunkManager config. For debugging, call `updateVisibility(playerKappa, true)` with `force=true`.

### Q: Server position seems wrong (axes swapped?)
A: Check `payloadCoord()` function. Is it reading `payload.x` and `payload.z` correctly? Server might be sending `gridX`/`gridZ` or `tileX`/`tileZ`.

## Related Files

| File | Purpose |
|------|---------|
| `apps/client-2d/src/DeterministicWorldIsoApp.tsx` | Main app, chunk visibility logic |
| `apps/client-2d/src/world/ChunkManager.ts` | Chunk loading/unloading |
| `apps/client-2d/src/ArelorianStitchHud.tsx` | Debug HUD UI |
| `apps/client-2d/src/kenneyUiLiveSkin.css` | Debug HUD styling |

## Console Commands

Enable verbose logging:
```javascript
// In browser console
localStorage.setItem('wasd:2d:debug', 'true');
location.reload();
```

## Prevention

Best practices to avoid chunk visibility issues:

1. **Always test with different start positions** - Not just (0,0)
2. **Use the debug HUD** during development
3. **Add debug logging early** - Don't wait until users report issues
4. **Document coordinate systems** - Kappa vs tile vs chunk coordinates