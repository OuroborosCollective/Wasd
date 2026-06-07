# ARELogic Resource Node Contract V2

## Overview

PR #1781 enforces the resource node contract with tool requirements and proper depletion handling. This builds on PRs #1777 (Resource Gather Intent Adapter) and #1780 (Resource Gather Position Bridge).

## Summary of Changes

| Component | Change |
|---|---|
| `ResourceTypes.ts` | Added `missing_tool` reason, `requiredTool` field |
| `StarterResourceNodes.ts` | Ore requires `mining_tool`, Fish requires `fishing_tool`, Tree is hand-gatherable |
| `GatheringService.ts` | Tool check before gather, returns `requiredTool` on failure |
| `ResourceNodeStore.ts` | Added `requiredTool` to snapshot |
| Client feedback | `missing_tool` shows specific tool name (Pickaxe/Rod/Axe) |

## Server-Authoritative Gather Contract

```
Client Intent (playerPosition from server heartbeat)
  └─> POST /api/resource/gather
        └─> GatheringService.gather()
              ├─> Tool Check (missing_tool if not equipped)
              ├─> Distance Check (too_far if beyond radius)
              ├─> Depletion Check (node_depleted if depletedUntilTick > currentTick)
              ├─> Skill Level Check (level_too_low if insufficient)
              └─> Success: Inventory + XP + Deplete Node
```

## Tool Requirements

| Node Kind | Required Tool Slot | Starter Node |
|---|---|---|
| Tree | `woodcutting_tool` (optional) | `starter_tree_001` — hand gather allowed |
| Ore | `mining_tool` | `starter_ore_001` |
| Fish Spot | `fishing_tool` | `starter_fish_001` |

### Hand-Gather MVP Exception

**`starter_tree_001` (Young Pine)** has no `requiredTool` — players can gather it bare-handed. This is an intentional MVP relaxation to give new players a frictionless first experience.

All other tree nodes (future procedural trees) will require `woodcutting_tool`.

### Tool Slot to Display Name Mapping

| Slot ID | Display Name |
|---|---|
| `woodcutting_tool` | Axe |
| `mining_tool` | Pickaxe |
| `fishing_tool` | Fishing Rod |

## Depletion / Respawn by Tick

### Rules

1. **Tick-based, not time-based**: No `Date.now()` for depletion state
2. **Deterministic respawn**: `depletedUntilTick = currentTick + respawnTicks`
3. **No random variance**: All nodes respawn at exact tick

### Respawn Contracts

| Node | Respawn Ticks | Depleted Until Tick |
|---|---|---|
| `starter_tree_001` | 30 | `gatherTick + 30` |
| `starter_ore_001` | 40 | `gatherTick + 40` |
| `starter_fish_001` | 25 | `gatherTick + 25` |

### Snapshot Status

```
Available: status="available", depletedUntilTick=null, remainingTicks=0
Depleted:  status="depleted",  depletedUntilTick=<tick>, remainingTicks=<countdown>
```

## Quest Progress Source of Truth

Quest objective `current` values are derived from **real inventory state**, not hardcoded values.

### Start Path Quests

| Archetype | Item Tracked | Objective |
|---|---|---|
| Forager | `wood_log` | `collect_wood_logs` |
| Miner | `copper_ore` | `collect_copper_ore` |
| Angler | `raw_fish` | `catch_raw_fish` |
| Artisan | `wood_plank` | `craft_wood_plank` |
| Wanderer | `cooked_fish` | `secure_basic_supplies` |

### No Hardcoded 2/3

The bug where fish objective showed "2/3" regardless of actual inventory is fixed. Progress now comes from:

```typescript
const current = clampObjectiveCurrent(inventoryQuantity(inventory, "raw_fish"), required);
```

Where `inventoryQuantity` reads the actual slot quantity from `PlayerInventoryState`.

## Failure Reasons

| Reason | Condition | Mutates State? |
|---|---|---|
| `node_not_found` | Unknown node ID | No |
| `node_depleted` | `currentTick < depletedUntilTick` | No |
| `too_far` | Distance > node radius | No |
| `level_too_low` | `playerSkillLevel < requiredLevel` | No |
| `missing_tool` | Required tool slot not equipped | No |
| `invalid_player` | Empty/anonymous player ID | No |
| `gathered` | All checks passed | **Yes** (deplete, XP, inventory) |

## Fail Does Not Mutate

When gather fails (any reason except `gathered`):
- Inventory stays unchanged
- XP stays unchanged
- Quest progress stays unchanged
- Node state stays unchanged (except internal respawn tracking)

This is enforced by the GatheringService structure: mutations only happen after `result.ok` is confirmed.

## Determinism Rules

1. **No Math.random()** in any gameplay logic
2. **No Date.now()** for gameplay state (only for logging/debug)
3. **Same inputs → same outputs**: Gather at tick 100 always produces same result
4. **Stable ordering**: Snapshots sorted by node ID for deterministic iteration

## Snapshot Structure

```typescript
interface ResourceNodeSnapshot {
  id: string;
  kind: "tree" | "ore" | "fish_spot";
  title: string;
  skillId: "woodcutting" | "mining" | "fishing";
  requiredLevel: number;
  xpReward: number;
  itemRewardId: string;
  itemRewardName: string;
  position: { x: number; y: number };
  radius: number;
  status: "available" | "depleted" | "locked";
  depletedUntilTick: number | null;
  remainingTicks: number;
  requiredTool?: "woodcutting_tool" | "mining_tool" | "fishing_tool";
}
```

## Known Limitations

1. **Starter nodes are static** — no procedural generation of resources yet
2. **No tool crafting/equipment onboarding** — players need to obtain tools somehow
3. **No chunk-based resource spawning** — resources don't spawn dynamically based on player position
4. **Single-player gather intent** — no multiplayer simultaneous gather coordination
5. **Tool acquisition path unclear** — how do players get their first axe/pickaxe/rod?

## Next PRs

| PR | Title | Description |
|---|---|---|
| #1782 | Procedural chunk resource spawning | Spawn resources based on chunk, not static definitions |
| #1783 | Tool crafting/equipment onboarding | Players can craft or receive their first tools |
| #1784 | NPC resource economy loop | NPCs buy/sell resources, creating economic cycle |
| #1785 | World generation outside village | Resources spawn in new areas beyond starter zone |

## Files Changed

### Server

| File | Changes |
|---|---|
| `server/src/resources/ResourceTypes.ts` | Added `missing_tool` reason, `RequiredToolSlot`, `requiredTool` field |
| `server/src/resources/StarterResourceNodes.ts` | Added `requiredTool` to ore/fish, documented tree exception |
| `server/src/resources/ResourceNodeStore.ts` | Added `requiredTool` to snapshot |
| `server/src/resources/GatheringService.ts` | Tool check before gather, `requiredTool` in result |
| `server/src/tests/gathering-service-contract.test.ts` | New test file for contract verification |
| `server/src/tests/start-path-quest-progress.test.ts` | New test file for quest progress |

### Client

| File | Changes |
|---|---|
| `apps/client-2d/src/game/gameplayActions.ts` | Added `requiredTool` to `ActionResult` |
| `apps/client-2d/src/ui/ResourceNodeMarkerLayer.tsx` | Updated `humanReadableGatherError` for tool-specific messages |

## Testing

```bash
# Run resource node store tests
pnpm --filter @wasd/server test -- --run src/tests/resource-node-store.test.ts

# Run gathering service contract tests
pnpm --filter @wasd/server test -- --run src/tests/gathering-service-contract.test.ts

# Run quest progress tests
pnpm --filter @wasd/server test -- --run src/tests/start-path-quest-progress.test.ts

# Typecheck
pnpm --filter @wasd/server typecheck
pnpm --filter @wasd/client-2d typecheck
```

## Live Verification Steps

1. Load character, wait for heartbeat OK
2. Position debug shows real coords
3. Resource markers visible
4. **Ore without Pickaxe**: Expect `missing_tool` error
5. **Fish without Rod**: Expect `missing_tool` error
6. **Tree with/without Axe**: `starter_tree_001` allows hand gather
7. After successful gather: Node shows depleted, second tap fails
8. After respawn tick: Node available again
9. Fish objective: Shows actual `raw_fish` count, not hardcoded `2/3`