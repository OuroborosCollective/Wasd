# WASD AI Skill: Storage UI & Entity Transfer System

**Purpose**: Guide future agents implementing server-authoritative storage/transfer UIs following Ouroboros axioms.

**Context**: Built in Session #2026-05-31 for the StorageOverlay feature.

---

## Core Axioms

1. **Server Authority**: Client NEVER modifies state locally. Only sends intents.
2. **Stateless Determinism**: UI blocks optimistically, updates on server snapshot.
3. **Brutalist UI**: Pure native CSS, no Tailwind, dark military aesthetic.
4. **KAPPA-Interaction**: Fat-finger-safe pointertap events (24px+ padding).

---

## Architecture Overview

```
Client Actions                    Server Processing                  Client Update
─────────────                    ────────────────                  ────────────
wasd:client-action ──────────► handlePlayerMessage ──────────────► ws.sendToPlayer
  { action: "transfer_item",       open_storage handler             { type: "storage_snapshot" }
   payload: { fromStorageId,         transfer_item handler           OR
             toStorageId,           close_storage handler           { type: "inventory_snapshot" }
             fromSlotIndex,                                              
             toSlotIndex } }                                       
```

---

## Implementation Checklist

### 1. StorageOverlay.tsx (React UI)

```tsx
// Key patterns:
- StorageStateStore: useSyncExternalStore for server sync
- dispatchTransfer(): Fire intent, block UI immediately
- receiveStorageSnapshot(): Update state from server
- clearPending(): On error or success
```

**Required exports**:
- `storageStateStore` (singleton)
- `openStorageOverlay(snapshot)` 
- `closeStorageOverlay()`
- `StorageSnapshot` type

### 2. storageOverlay.css (Brutalist Theme)

```css
/* Required patterns */
.storage-overlay { z-index: 200; }
.storage-header { border: 1px solid rgba(0, 204, 255, 0.25); }
.storage-slot { border-radius: 0; } /* NO rounded corners */
.storage-slot.blocked { opacity: 0.45; pointer-events: none; }
```

**Color palette**:
- Primary: `#00ccff` (neon cyan)
- Background: `#0d1017` → `#07090d`
- Borders: `rgba(0, 204, 255, 0.25)`

### 3. UIManager.tsx Integration

```tsx
type ActiveOverlay = 
  | { type: "STORAGE"; storageSnapshot: StorageSnapshot }
  // ...

openStorage(storageSnapshot: StorageSnapshot): void {
  this.state = { type: "STORAGE", storageSnapshot };
  openStorageOverlay(storageSnapshot);
  this.notify();
}
```

### 4. WorldTick.ts Server Handlers

```typescript
// Required handlers:
- "open_storage": Validate, lock, send storage_snapshot
- "close_storage": Unlock storage
- "transfer_item": Move items, send both snapshots
```

---

## Transfer Intent Flow

```
1. User clicks slot in player panel
2. Client: dispatchTransfer({ fromStorageId: 'player', toStorageId: 'chest:123', ... })
3. Client: window.dispatchEvent(CustomEvent("wasd:client-action", { action: "transfer_item", payload: intent }))
4. Server: handlePlayerMessage receives msg.type === "transfer_item"
5. Server: Validates source/dest, performs transfer
6. Server: ws.sendToPlayer(id, { type: "storage_snapshot", payload: snapshot })
7. Client: handleNetworkPacket sees "storage_snapshot"
8. Client: storageStateStore.receiveStorageSnapshot(snapshot)
9. React re-renders with new state
```

---

## Key Files

| File | Purpose |
|------|---------|
| `apps/client-2d/src/ui/StorageOverlay.tsx` | React UI component |
| `apps/client-2d/src/ui/storageOverlay.css` | Brutalist styling |
| `apps/client-2d/src/ui/UIManager.tsx` | Overlay state machine |
| `server/src/core/WorldTick.ts` | Server handlers |
| `server/src/modules/structure/StorageEntity.ts` | Entity definitions |

---

## Related Patterns

- See `InventoryOverlay.tsx` for similar pessimistic UI pattern
- See `InventoryStateStore` for server sync hookup

---

## Commit Style

```
feat(client-2d): Add StorageOverlay UI for entity item transfers
```

---

*Created: 2026-05-31 | Session: Storage Overlay Implementation*
