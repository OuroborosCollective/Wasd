# WASD AI Skill: Ouroboros Modular Inventory System

Purpose: Document the modular loot, equip, and inventory system architecture for future agents.

## Architecture Overview

The system follows **Deterministic Stateless Architecture** with **Server-Authoritative State**:

```
┌─────────────────────────────────────────────────────────────────┐
│ CLIENT (React + Pixi)                                           │
│  ┌──────────────────┐    ┌─────────────────────────────────┐   │
│  │ InventoryOverlay │───▶│ inventoryStateStore             │   │
│  │ (React DOM)      │    │ (useSyncExternalStore)          │   │
│  └──────────────────┘    └──────────────┬──────────────────┘   │
└─────────────────────────────────────────┼───────────────────────┘
                                          │ wasd:client-action
                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ SERVER (WorldTick + InventoryDirector)                           │
│  ┌──────────────────┐    ┌─────────────────────────────────┐   │
│  │ WebSocketServer │───▶│ inventoryDirector.processIntent │   │
│  │                 │    │ (ATOMIC MUTATION)              │   │
│  └──────────────────┘    └──────────────┬──────────────────┘   │
└─────────────────────────────────────────┼───────────────────────┘
                                          │ wasd:network-packet
                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ CLIENT (NetworkClient)                                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ dispatchNetworkPacket → wasd:network-packet             │   │
│  │ handleNetworkPacket → receiveSnapshot / receiveEvent     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Key Principles

### 1. Axiom der Erhaltung (Conservation Axiom)
- Items NEVER duplicated
- Server is sole source of truth
- Every equip/unequip/move is an ATOMIC TRANSACTION
- Client NEVER modifies inventory state locally

### 2. Deterministic Itemization
- Items identified by `ItemSignature` string, not mutable IDs
- Signature format: `base:blade_3|hilt_12|material_iron|prefix_swift|suffix_bane`
- 30,000+ weapon permutations from 64 modular components
- Client derives visuals/stats from signature (no download needed)

### 3. Pessimistic UI
- UI immediately enters "blocked" state when action dispatched
- Visual: opacity 0.45, spinner, cursor: wait
- Blocked only cleared when server broadcasts `inventory_snapshot`

## Event Bus Architecture

### Outbound (Client → Server)
```typescript
// Fire intent via event bus
window.dispatchEvent(new CustomEvent("wasd:client-action", {
  detail: { action: "inventory_intent", payload: intent }
}));

// networkClient.ts listens and sends via WebSocket
```

### Inbound (Server → Client)
```typescript
// IMPORTANT: Use wasd:network-packet, NOT wasd:world-packet
// wasd:world-packet only carries WORLD_HEARTBEAT and world_tick

window.addEventListener("wasd:network-packet", (event) => {
  const detail = event.detail;
  if (detail.event === "inventory_snapshot") {
    inventoryStateStore.receiveSnapshot(detail.payload);
  }
  if (detail.event === "inventory_event") {
    inventoryStateStore.receiveEvent(detail.payload);
  }
  if (detail.event === "inventory_error") {
    inventoryStateStore.clearPending(); // CRITICAL: clear blocked state
  }
});
```

## Intent Types

```typescript
type InventoryIntent =
  | { intent: "equip"; inventorySlotIndex: number; targetEquipSlot: EquipSlot }
  | { intent: "unequip"; equipSlot: EquipSlot; targetInventorySlotIndex: number }
  | { intent: "move"; fromSlot: number; toSlot: number }
  | { intent: "drop"; inventorySlotIndex: number };
```

## Equip Slots

```typescript
type EquipSlot = 
  | "HEAD" 
  | "CHEST" 
  | "MAIN_HAND" 
  | "OFF_HAND" 
  | "RING_1" 
  | "RING_2" 
  | "BOOTS" 
  | "GLOVES";
```

## Known Issues & Fixes

### Issue: UI stuck in "Waiting for server..." forever
**Cause**: Listening on wrong event bus (`wasd:world-packet` instead of `wasd:network-packet`)
**Fix**: Always use `wasd:network-packet` for inventory messages

### Issue: Blocked slots never clear after rejection
**Cause**: `inventory_error` not handled
**Fix**: Add `clearPending()` call on `inventory_error` event

### Issue: Unequip corrupts equipment with random item
**Cause**: Swapping arbitrary item into equipment slot when target is occupied
**Fix**: Require empty target slot, reject with `TARGET_SLOT_OCCUPIED`

## Module Locations

| Component | Path |
|-----------|------|
| Shared Types | `packages/shared/src/items/` |
| Item Signature Parser | `packages/shared/src/items/itemSignature.ts` |
| Server Director | `server/src/modules/inventory/InventoryDirector.ts` |
| React Overlay | `apps/client-2d/src/ui/InventoryOverlay.tsx` |
| CSS Styling | `apps/client-2d/src/ui/inventoryOverlay.css` |
| UIManager | `apps/client-2d/src/ui/UIManager.tsx` |

## Build Commands

```bash
# Build shared package (required first)
pnpm -C packages/shared build

# Typecheck server
pnpm --filter @wasd/server exec tsc --noEmit

# Build client
pnpm --filter @wasd/client-2d build
```

## Import Patterns

```typescript
// Server imports from @wasd/shared
import { InventoryIntent, EquipSlot } from "@wasd/shared";

// Client imports from @wasd/shared (via vite alias)
import { parseItemSignature } from "@wasd/shared";
```

## Keyboard Shortcuts

- `I` or `Tab`: Toggle inventory overlay
- `Escape`: Close overlay

## CSS Classes

| Class | Purpose |
|-------|---------|
| `.inventory-overlay` | Fullscreen overlay container |
| `.inventory-slot` | Grid cell in backpack |
| `.equip-slot` | Single equipment slot |
| `.inventory-slot.blocked` | Pending server confirmation |
| `.slot-spinner` | Rotating amber spinner |
| `.rarity-legendary` | Legendary glow effect |
