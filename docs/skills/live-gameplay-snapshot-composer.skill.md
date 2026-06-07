# Skill: Live Gameplay Snapshot Composer

## Purpose

Build a deterministic server-authoritative gameplay snapshot for the 2D client.

## Inputs

- playerId
- logicalIndex
- inventory source
- equipment source
- skill source
- resource node source

## Outputs

- stable LiveGameplaySnapshot
- sorted inventory
- sorted equipment
- sorted skills
- sorted resource nodes

## Determinism Rules

- No random output order.
- No mutation of source stores.
- No gameplay decision based on client state.
- No missing core arrays.
- 10 Hz tick metadata must be present.

## Used By

- `/api/gameplay/snapshot`
- Quest panel
- Inventory panel
- Skill panel
- Resource panel
- Map panel
- Future guild/faction panels

## Upgrade Path

Next skills should integrate:

1. Crafting consumption
2. Quest hooks
3. NPC dialogue state
4. Map/biome/chunk status
5. SelfHeal status projection

## Files

- `server/src/gameplay/LiveGameplaySnapshotTypes.ts` - Type definitions
- `server/src/gameplay/LiveGameplaySnapshotComposer.ts` - Composition logic
- `server/src/gameplay/adapters/InventorySnapshotAdapter.ts` - Inventory adapter
- `server/src/gameplay/adapters/EquipmentSnapshotAdapter.ts` - Equipment adapter
- `server/src/gameplay/LiveGameplaySnapshotComposer.test.ts` - Unit tests
- `server/src/gameplay/adapters/InventorySnapshotAdapter.test.ts` - Adapter tests
- `e2e/live-gameplay-snapshot.spec.ts` - E2E contract tests

## Test Commands

```bash
# Run unit tests
pnpm exec vitest run server/src/gameplay/LiveGameplaySnapshotComposer.test.ts
pnpm exec vitest run server/src/gameplay/adapters/InventorySnapshotAdapter.test.ts

# Run E2E tests
pnpm exec playwright test e2e/live-gameplay-snapshot.spec.ts
```