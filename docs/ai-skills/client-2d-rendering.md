# WASD AI Skill: Client 2D Rendering & Interpolation

Purpose: Capture patterns for implementing smooth client-side rendering in the PixiJS-based 2D client (`apps/client-2d/`).

## Architecture Overview

The 2D client uses **PixiJS v7+** for rendering with a React UI overlay layer. Key files:
- `apps/client-2d/src/DeterministicWorldIsoApp.tsx` - Main game component
- `apps/client-2d/src/isometricProjection.ts` - Iso grid projection math
- `apps/client-2d/src/math/` - Utility math modules

## Decoupled Render Interpolation

### Problem
Server broadcasts positions at 10 Hz, but rendering runs at 60 FPS. Without interpolation, movement appears choppy/jittery.

### Solution: Stateless Determinism Pattern
1. **Server data is truth** - `entity.tx/tz` (kappa positions) are NEVER mutated by render code
2. **Visual layer is decoupled** - PixiJS ticker runs independently from network heartbeat
3. **Delta-time scaling** - Lerp factor multiplied by deltaTime for frame-rate independence

### Implementation Pattern

```typescript
// 1. Pure math lerp (no PixiJS imports)
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

// 2. Singleton manager for interpolation state
export class InterpolatedSpriteManager {
  private entities = new Map<string, InterpolatedEntity>();
  
  register(entityId: string, sprite: Container, initialX: number, initialY: number) {
    this.entities.set(entityId, { sprite, targetX: initialX, targetY: initialY });
  }
  
  setTarget(entityId: string, targetX: number, targetY: number) {
    // Store target, don't modify sprite yet
  }
  
  tick(deltaTime: number) {
    // Called by PIXI.Ticker every frame
    for (const entity of this.entities.values()) {
      const dist = distance2D(entity.sprite.x, entity.sprite.y, entity.targetX, entity.targetY);
      if (dist > 150) {
        // Teleport snap (>150px)
        entity.sprite.x = entity.targetX;
        entity.sprite.y = entity.targetY;
      } else if (dist < 0.5) {
        // Precision lock (<0.5px)
        entity.sprite.x = entity.targetX;
        entity.sprite.y = entity.targetY;
      } else {
        // Smooth lerp
        entity.sprite.x = lerp(entity.sprite.x, entity.targetX, LERP_SPEED * deltaTime);
        entity.sprite.y = lerp(entity.sprite.y, entity.targetY, LERP_SPEED * deltaTime);
      }
      entity.sprite.zIndex = Math.round(entity.sprite.y);
    }
  }
}
```

### Data Flow
```
WORLD_HEARTBEAT (10 Hz)          PIXI.TICKER (60 FPS)
─────────────────────            ─────────────────────
setActor() → entity.tx/tz       interp.tick(deltaTime)
         ↓                              ↓
interp.setTarget()               lerp sprite → target
```

### Key Constants
| Constant | Value | Purpose |
|----------|-------|---------|
| LERP_SPEED | 0.15 | Frame-rate normalized lerp factor |
| TELEPORT_SNAP_THRESHOLD_PX | 150 | Distance for instant snap |
| PRECISION_LOCK_THRESHOLD_PX | 0.5 | Distance for micro-jitter prevention |

## React UI Integration

### Pattern: useSyncExternalStore
```typescript
class InteractionUIManager {
  private state = { type: "NONE" };
  private listeners = new Set<() => void>();
  
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const interactionUI = new InteractionUIManager();

export function useInteractionUI() {
  return useSyncExternalStore(
    interactionUI.subscribe,
    interactionUI.getState,
    interactionUI.getState
  );
}
```

### Keyboard Shortcuts
Register in global keydown handler:
```typescript
window.addEventListener("keydown", (e) => {
  if (e.key === "c" || e.key === "C") {
    interactionUI.toggleCharacter();
  }
  if (e.key === "i" || e.key === "I") {
    interactionUI.toggleInventory();
  }
});
```

## WebSocket Event Handling

Listen on `wasd:network-packet` for non-world events:
```typescript
useEffect(() => {
  const handlePacket = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (detail?.event === "player_stats_snapshot") {
      characterStateStore.receiveSnapshot(detail.payload);
    }
  };
  window.addEventListener("wasd:network-packet", handlePacket);
  return () => window.removeEventListener("wasd:network-packet", handlePacket);
}, []);
```

Note: `wasd:world-packet` carries WORLD_HEARTBEAT and world_tick only.

## CSS Styling Guidelines

- Use native CSS files (e.g., `characterOverlay.css`)
- Avoid Tailwind in 2D client unless explicitly requested
- Sharp corners (no border-radius) for tank-style aesthetic
- Progress bars via inline `width` style from React

## File Structure
```
apps/client-2d/src/
├── math/
│   ├── lerp.ts                      # Pure lerp math
│   └── InterpolatedSpriteManager.ts # Interpolation singleton
├── ui/
│   ├── UIManager.tsx               # Overlay state machine
│   ├── CharacterOverlay.tsx         # Character sheet React UI
│   ├── characterOverlay.css         # Tank-style CSS
│   └── InventoryOverlay.tsx         # Inventory React UI
├── DeterministicWorldIsoApp.tsx    # Main game component
└── isometricProjection.ts           # Iso grid math
```
