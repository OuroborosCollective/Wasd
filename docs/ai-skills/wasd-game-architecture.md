# WASD AI Skill: Ouroboros Game System Architecture

Purpose: Capture the core architectural decisions and system design principles of the Ouroboros/Areloria game engine for future development.

## Core Systems

### 1. ARE Engine (Areloria Runtime Engine)
The deterministic core of the game world. Every tick produces deterministic output based on world state and input events.

**Key characteristics:**
- Deterministic tick loop (typically 10 ticks/second)
- World hash snapshots for state verification
- Electroweak pruning for loot/decay
- Oracle prophecy system for future events

**Files:**
- `server/src/are/` - ARE implementation
- `server/src/core/WorldTick.ts` - Main tick loop

### 2. Dual Inventory System
Two inventory types coexist:
- **Stack inventory**: Traditional stackable items (consumables, materials)
- **Gear inventory**: UID-bound items with stats (Diablo-style)

**Persistence:**
- Player inventory lives on `player.inventory` (stack)
- Gear inventory lives on `player.gearInventory` (gear items)
- Equipment state on `player.equipment`

### 3. WebSocket Communication
Server ↔ Client communication via WebSocket:

**Client → Server:**
```typescript
// Fire intent
window.dispatchEvent(new CustomEvent("wasd:client-action", {
  detail: { action: "move_intent", payload: { dx, dy } }
}));

// networkClient.ts sends via WebSocket
socket.send(JSON.stringify({ type: action, payload }));
```

**Server → Client:**
```typescript
// Broadcast
ws.broadcast({ type: "world_tick", ... });

// Single player
ws.sendToPlayer(socketId, { type: "inventory_snapshot", payload: {...} });
```

### 4. World Heartbeat
Server broadcasts world state every ~1 second:

```typescript
{
  type: "WORLD_HEARTBEAT",
  payload: {
    players: {...},
    npcs: [...],
    loot: [...],
    emergence: {...},
    are: {...},
    warfront: {...}
  }
}
```

## Key Patterns

### Pessimistic UI Pattern
Client shows optimistic UI but immediately blocks on user action. State only updates after server confirmation.

```typescript
// 1. User clicks "Equip"
// 2. UI enters blocked state (opacity, spinner)
// 3. Fire intent to server
dispatchEvent("wasd:client-action", {...});
// 4. Wait for server broadcast
// 5. Update UI only when server confirms
```

### Event Bus Pattern
Custom events bridge between modules:

```typescript
// Define event
window.dispatchEvent(new CustomEvent("wasd:client-action", { detail }));

// Listen for event
window.addEventListener("wasd:client-action", handler);
```

### Atomic Mutation Pattern
Server mutations are atomic:

```typescript
// WRONG: Multiple steps
player.equipment.weapon = item;
save();

// CORRECT: Single atomic operation
const result = inventoryDirector.processIntent(player, intent);
// Result already applied to player state
save();
```

## Module Organization

### Server Modules
Located in `server/src/modules/`:

| Module | Purpose |
|--------|---------|
| `inventory/` | Item management |
| `combat/` | Combat system |
| `npc/` | NPC AI and behavior |
| `quest/` | Quest engine |
| `chat/` | Chat channels |
| `world/` | World generation |
| `auth/` | Authentication |

### Client UI
Located in `apps/client-2d/src/ui/`:

- React overlays with `useSyncExternalStore`
- CSS modules for styling
- Pixi.js for game rendering

## Common Tasks

### Adding a new module
1. Create module in `server/src/modules/<module>/`
2. Create index.ts barrel export
3. Wire into WorldTick constructor
4. Add types to shared package if needed

### Adding inventory intent
1. Define intent type in `packages/shared/src/items/types.ts`
2. Add handler in `InventoryDirector.ts`
3. Wire in `WorldTick.handlePlayerMessage()`
4. Add UI handler in `InventoryOverlay.tsx`

### Adding WebSocket message
1. Define in `packages/shared/src/types/protocol.ts`
2. Server sends in appropriate handler
3. Client listens in network handler

## Architecture Rules

1. **Server authoritative**: Server is source of truth for all game state
2. **Deterministic where possible**: Same input → same output
3. **Atomic mutations**: Never split state changes across multiple saves
4. **Fail safe**: Validate before mutation, reject invalid input
5. **Minimal UI state**: Client derives what it can from server state

## Testing

```bash
# Run tests
pnpm vitest run

# Run specific test
pnpm vitest run server/src/tests/inventory-equip.test.ts
```

## Build Pipeline

```
pnpm build
  ├── packages/shared (must build first)
  ├── server
  ├── client-2d
  └── portal
```
