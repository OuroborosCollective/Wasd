# WASD AI Skill: Ouroboros Modular Inventory System

Purpose: Document the modular loot, equip, and inventory system architecture.

## Architecture Overview

The system follows **Deterministic Stateless Architecture** with **Server-Authoritative State**:

```
CLIENT (React) ──▶ Event Bus ──▶ SERVER (WorldTick + InventoryDirector)
                              │
                              ▼
                     wasd:network-packet
```

## Key Principles

### 1. Axiom der Erhaltung (Conservation Axiom)
- Items NEVER duplicated
- Server is sole source of truth
- Every equip/unequip/move is an ATOMIC TRANSACTION
- Client NEVER modifies inventory state locally

### 2. Deterministic Itemization
- Items identified by `ItemSignature` string
- Format: `base:blade_3|hilt_12|material_iron|prefix_swift|suffix_bane`
- 30,000+ permutations from 64 modular components

### 3. Pessimistic UI
- UI immediately enters "blocked" state on action
- Visual: opacity 0.45, spinner, cursor: wait
- Blocked only cleared when server broadcasts `inventory_snapshot`

## Event Bus Architecture

### Outbound (Client → Server)
```typescript
window.dispatchEvent(new CustomEvent("wasd:client-action", {
  detail: { action: "inventory_intent", payload: intent }
}));
```

### Inbound (Server → Client)
```typescript
// IMPORTANT: Use wasd:network-packet, NOT wasd:world-packet
window.addEventListener("wasd:network-packet", (event) => {
  const detail = event.detail;
  if (detail.event === "inventory_snapshot") {
    inventoryStateStore.receiveSnapshot(detail.payload);
  }
  if (detail.event === "inventory_event") {
    inventoryStateStore.receiveEvent(detail.payload);
  }
  if (detail.event === "inventory_error") {
    inventoryStateStore.clearPending();
  }
});
```

## Module Locations

| Component | Path |
|-----------|------|
| Shared Types | `packages/shared/src/items/` |
| Item Signature Parser | `packages/shared/src/items/itemSignature.ts` |
| Server Director | `server/src/modules/inventory/InventoryDirector.ts` |
| React Overlay | `apps/client-2d/src/ui/InventoryOverlay.tsx` |
| CSS Styling | `apps/client-2d/src/ui/inventoryOverlay.css` |

## Build Commands

```bash
pnpm -C packages/shared build
pnpm --filter @wasd/server exec tsc --noEmit
pnpm --filter @wasd/client-2d build
```

## Known Fixes

- **Wrong event bus**: Always use `wasd:network-packet` for inventory
- **Stuck pending state**: Handle `inventory_error` with `clearPending()`
- **Unequip corruption**: Require empty target slot