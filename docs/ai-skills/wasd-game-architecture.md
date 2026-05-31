# WASD AI Skill: Ouroboros Game System Architecture

Purpose: Core architectural decisions and system design principles.

## Core Systems

### ARE Engine (Areloria Runtime Engine)
Deterministic tick loop (~10 ticks/second) with world hash snapshots.

Files: `server/src/are/`, `server/src/core/WorldTick.ts`

### Dual Inventory System
- **Stack inventory**: Traditional items (`player.inventory`)
- **Gear inventory**: UID-bound items (`player.gearInventory`)
- **Equipment**: Active equipment (`player.equipment`)

### WebSocket Communication

**Client → Server:**
```typescript
window.dispatchEvent(new CustomEvent("wasd:client-action", {
  detail: { action: "move_intent", payload: { dx, dy } }
}));
```

**Server → Client:**
```typescript
ws.broadcast({ type: "world_tick", ... });
ws.sendToPlayer(socketId, { type: "inventory_snapshot", payload: {...} });
```

## Key Patterns

### Pessimistic UI
1. User clicks action
2. UI enters blocked state
3. Fire intent to server
4. Wait for server broadcast
5. Update UI only when confirmed

### Atomic Mutation
Server mutations are atomic - never split state changes.

### Event Bus
Custom events bridge modules:
```typescript
window.dispatchEvent(new CustomEvent("wasd:client-action", { detail }));
```

## Module Organization

| Type | Location |
|------|----------|
| Server modules | `server/src/modules/` |
| Client UI | `apps/client-2d/src/ui/` |
| Shared types | `packages/shared/src/` |

## Testing

```bash
pnpm vitest run
```
