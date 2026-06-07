# ARELogic Live Gameplay Snapshot Integration

## Status

This document defines the first deterministic integration layer for reducing PARTIAL gameplay modules.

## Scope

This integration covers:

- LiveGameplaySnapshotComposer
- Inventory snapshot projection
- Equipment snapshot projection
- Resource gathering projection
- Skill XP projection
- Snapshot endpoint validation

## Deterministic Rules

1. Server is authoritative.
2. Client renders snapshots only.
3. Snapshot data is read-only output.
4. Gameplay rewards are not decided by the client.
5. Gameplay logic must not use `Math.random()`.
6. Gameplay logic must not use wall-clock time for outcome decisions.
7. Arrays in snapshots must be sorted deterministically.
8. Empty arrays are preferred over missing fields.
9. The snapshot contract must remain backward-compatible.
10. The 10 Hz / 100 ms tick contract must be visible in the snapshot.

## Snapshot Contract

```ts
schemaVersion: "live-gameplay-snapshot.v1"
tickRateHz: 10
tickMs: 100
inventory: []
equipment: []
skills: []
resourceNodes: []
```

## First Integration Target

The first completed vertical gameplay loop is:

```
Resource Node
  -> Gather Action
    -> Skill XP
      -> Inventory Reward
        -> LiveGameplaySnapshot
          -> Client Panel Visibility
```

## Key Components

### LiveGameplaySnapshotTypes.ts

Defines the stable types for the snapshot contract:

- `LiveGameplayInventoryItem`
- `LiveGameplayEquipmentSlot`
- `LiveGameplaySkillState`
- `LiveGameplayResourceNode`
- `LiveGameplaySnapshot`

### LiveGameplaySnapshotComposer.ts

Composes deterministic snapshots from source services:

```ts
const composer = new LiveGameplaySnapshotComposer({
  getInventoryItems,
  getEquipmentSlots,
  getSkillStates,
  getResourceNodes,
});

const snapshot = await composer.compose(playerId, logicalIndex);
```

### InventorySnapshotAdapter.ts

Converts various inventory formats to `LiveGameplayInventoryItem[]`:

```ts
const items = toLiveInventoryItems(sourceSlots);
```

### EquipmentSnapshotAdapter.ts

Converts various equipment formats to `LiveGameplayEquipmentSlot[]`:

```ts
const slots = toLiveEquipmentSlots(sourceSlots);
```

## Gathering Flow

```
Client sends POST /api/resource/gather
  -> GatheringService.gather()
    -> ResourceNodeStore.gather() [deterministic check]
      -> SkillProgressionService.applyEvent() [XP]
        -> InventoryService.addItem() [item reward]
    -> Returns GatherResourceResult
      -> Client reads via GET /api/gameplay/snapshot
```

## Done Criteria

- [x] Unit tests pass
- [x] E2E snapshot test passes
- [x] Gathering test proves item + XP visibility
- [x] No placeholder response is used for gameplay snapshot
- [x] No direct client authority is introduced

## Not Included

- Full crafting economy
- Guild/faction integration
- Combat integration
- Procedural resource placement

## Next Steps

Next skills should integrate:

1. Crafting consumption
2. Quest hooks
3. NPC dialogue state
4. Map/biome/chunk status
5. SelfHeal status projection