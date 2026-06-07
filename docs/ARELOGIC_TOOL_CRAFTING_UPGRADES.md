# ARELOGIC: Tool Crafting & Upgrade Recipes

## 1. Summary

This document describes the tool crafting and upgrade system for Areloria. Players can upgrade their starter gathering tools (Tier 1) to more effective tools (Tier 2) by crafting at a workbench station.

**PR Context:** This feature follows after the resource processing economy loop (#1787) and processing stations POIs (#1788). It provides the progression motivation for players to gather, process, and craft better tools.

## 2. Why Tool Upgrades After Economy/POIs

The progression chain is intentional:

1. **Resource Gathering** (#1782) - Players can gather raw resources
2. **Tool Onboarding** (#1784) - Players receive starter tools
3. **Resource Processing** (#1787) - Players can process raw resources (wood → planks, ore → ingots)
4. **Processing Stations POIs** (#1788) - Workbench locations are now POIs on the map
5. **Tool Crafting/Upgrade** (this PR #1791) - Players can upgrade tools using processed resources
6. **POI Discovery + Map Fog** (#1792) - Players discover more workbenches
7. **Tool Durability/Repair** (#1794) - Tools become strategic resources

The tool upgrade gives purpose to the processing economy. Players who invest time in gathering and processing materials are rewarded with better tools.

## 3. Tool Item Definitions

### Tier 1 Starter Tools (Existing)

| ID | Name | Slot | Tier | XP Multiplier | Notes |
|---|---|---|---|---|---|
| `wooden_axe` | Wooden Axe | `woodcutting_tool` | 1 | 1100‰ | Craftable from wood_plank + copper_ingot |
| `copper_pickaxe` | Copper Pickaxe | `mining_tool` | 1 | 1100‰ | Craftable at workbench |
| `simple_fishing_rod` | Simple Fishing Rod | `fishing_tool` | 1 | 1100‰ | Craftable at workbench |

### Tier 2 Upgrade Tools (New)

| ID | Name | Slot | Tier | XP Multiplier | Notes |
|---|---|---|---|---|---|
| `copper_axe` | Copper Axe | `woodcutting_tool` | 2 | 1200‰ | Upgrade from wooden_axe |
| `reinforced_pickaxe` | Reinforced Pickaxe | `mining_tool` | 2 | 1200‰ | Upgrade from copper_pickaxe |
| `reinforced_fishing_rod` | Reinforced Fishing Rod | `fishing_tool` | 2 | 1200‰ | Upgrade from simple_fishing_rod |

**Note:** Upgrade tool IDs are intentionally different from starter tool IDs to avoid ID collisions. The naming convention uses different adjectives:
- `wooden_axe` → `copper_axe` (not `copper_wooden_axe`)
- `copper_pickaxe` → `reinforced_pickaxe` (not `copper_pickaxe_v2`)
- `simple_fishing_rod` → `reinforced_fishing_rod` (not `copper_fishing_rod`)

## 4. Upgrade Recipes

All upgrade recipes require the **workbench** station type. Players must be within station range to craft.

### Recipe: craft_copper_axe

```typescript
{
  id: "craft_copper_axe",
  title: "Craft Copper Axe",
  requiredLevel: 1,
  craftingXpReward: 45,
  craftTicks: 10,
  stationType: "workbench",
  ingredients: [
    { itemId: "wooden_axe", quantity: 1 },   // Starter tool (consumed)
    { itemId: "wood_plank", quantity: 2 },   // Processed resource
    { itemId: "copper_ingot", quantity: 1 }, // Processed resource
  ],
  outputs: [
    { itemId: "copper_axe", quantity: 1 },
  ],
}
```

### Recipe: craft_reinforced_pickaxe

```typescript
{
  id: "craft_reinforced_pickaxe",
  title: "Craft Reinforced Pickaxe",
  requiredLevel: 1,
  craftingXpReward: 50,
  craftTicks: 12,
  stationType: "workbench",
  ingredients: [
    { itemId: "copper_pickaxe", quantity: 1 }, // Starter tool (consumed)
    { itemId: "wood_plank", quantity: 1 },      // Processed resource
    { itemId: "copper_ingot", quantity: 2 },     // Processed resource
  ],
  outputs: [
    { itemId: "reinforced_pickaxe", quantity: 1 },
  ],
}
```

### Recipe: craft_reinforced_fishing_rod

```typescript
{
  id: "craft_reinforced_fishing_rod",
  title: "Craft Reinforced Fishing Rod",
  requiredLevel: 1,
  craftingXpReward: 40,
  craftTicks: 10,
  stationType: "workbench",
  ingredients: [
    { itemId: "simple_fishing_rod", quantity: 1 }, // Starter tool (consumed)
    { itemId: "wood_plank", quantity: 2 },          // Processed resource
    { itemId: "copper_ingot", quantity: 1 },        // Processed resource
  ],
  outputs: [
    { itemId: "reinforced_fishing_rod", quantity: 1 },
  ],
}
```

## 5. Station Requirement

Upgrade recipes require the player to be near a **workbench** station. The `stationType: "workbench"` is enforced by the crafting service:

- If player position is not provided: `missing_player_position` failure
- If player is not within station range: `station_too_far` failure
- If station exists but is wrong type: `station_type_mismatch` failure

The existing ProcessingStations system handles station proximity detection. Upgrade recipes only work at workbench stations (not campfire or furnace).

## 6. Tool Tier Gathering Bonus

### Bonus Rule: +1 Yield for Tier 2 Tools

When a player with a Tier 2 tool gathers a resource node:

1. Base yield is always 1 resource item
2. If equipped tool's tier >= 2, bonus yield is +1
3. Total yield = 1 + bonusYield = 2 resources

### Implementation

In `GatheringService.gather()`:

```typescript
// Tier 2 tools get +1 bonus yield
const bonusYield = bonus.tier >= 2 ? 1 : 0;

// Persist item reward to player inventory
if (result.itemRewardId) {
  const inventoryService = await getInventoryService();
  const totalQuantity = 1 + bonusYield;
  const inventoryResult = await inventoryService.addItem({
    playerId,
    itemId: result.itemRewardId,
    quantity: totalQuantity,
  });
}
```

### Bonus Fields in GatherResourceResult

```typescript
interface GatherResourceResult {
  // ... existing fields
  /** Bonus yield from Tier 2 tool (+1 quantity when applicable) */
  bonusYield?: number;
  /** Tier of the equipped tool that provided the bonus (2 if bonusYield > 0) */
  toolTier?: number;
}
```

### Tier 2 Bonus Summary

| Tool Type | Tier 1 Yield | Tier 2 Yield | Bonus |
|---|---|---|---|
| Woodcutting (trees) | 1 wood_log | 2 wood_log | +1 |
| Mining (ore nodes) | 1 copper_ore | 2 copper_ore | +1 |
| Fishing (fish spots) | 1 raw_fish | 2 raw_fish | +1 |

## 7. Server Authority Rules

1. **Server-authoritative crafting**: Client cannot create or consume items directly
2. **No Math.random()**: All recipe outcomes are deterministic
3. **No Date.now()**: Gameplay state uses server tick
4. **Fail-safe inventory**: If crafting fails, inventory is not mutated
5. **Tool IDs stable**: IDs do not change between sessions
6. **Station proximity required**: Crafting fails gracefully if not near workbench

### Crafting Flow

1. Player sends `POST /api/crafting/craft` with recipeId and playerPosition
2. Server validates:
   - Player identity (not anonymous)
   - Recipe exists
   - Player position is valid
   - Player is within workbench range (if stationType is workbench)
   - Player has required ingredients
3. If valid:
   - Consume ingredients from inventory
   - Add output items to inventory
   - Grant crafting XP to skill
4. If invalid:
   - Return failure reason without mutating inventory
5. Client shows toast notification for success/failure

## 8. Client UI

### CraftingWindow

- Shows all recipes including upgrade recipes
- Shows station requirement (`🛠 Workbench required`)
- Shows missing ingredients clearly
- Shows upgrade recipes alongside starter recipes

### GatheringToolsPanel

- Lists all tools (Tier 1 and Tier 2) in inventory
- Shows equipped tools with tier badge
- Tier badge shows "T2" for Tier 2 tools
- Upgrade tools display with same icons as starter tools

### Resource Gathering Feedback

When a player gathers with a Tier 2 tool and receives bonus yield, the client receives:
- `bonusYield: 1` in the gather result
- `toolTier: 2` in the gather result

The client can display a toast: "Gathered Copper Ore (+1 tool bonus)"

## 9. Known Limitations

This PR intentionally does NOT include:

- **Tool Durability**: Tools do not break (future: #1794)
- **Skill Level Requirements**: All recipes require level 1 (future: #1795)
- **Random Stats**: Tools have no random modifiers
- **Rarity/Roll System**: No chance-based tool generation
- **Combat Gear**: No weapons or armor
- **Tool Repair**: No durability repair system
- **Iron/Steel Tier Chain**: No Tier 3+ tools yet
- **Auto-equip**: Players must manually equip upgraded tools
- **Snapshot-v2**: Uses existing snapshot architecture

## 10. Next PRs

| PR | Title | Description |
|---|---|---|
| #1792 | POI Discovery + Map Fog | Discover workbenches on the map |
| #1793 | Camp NPC Gatherer Loop | NPCs that can gather resources |
| #1794 | Tool Durability / Repair | Tools break over time, can be repaired |
| #1795 | Skill Level Requirements | Require skill levels to craft advanced recipes |
| #1796 | Iron/Steel Tier Tools | Add Tier 3 and Tier 4 upgrade tools |
| #1797 | Multiple Workbenches | Different workbench tiers |

## 11. Files Changed

### Server

| File | Change |
|---|---|
| `src/inventory/InventoryTypes.ts` | Added `copper_axe`, `reinforced_pickaxe`, `reinforced_fishing_rod` to InventoryItemId and ITEM_DEFINITIONS |
| `src/equipment/EquipmentTypes.ts` | Added `tier` field to EquipmentItemDefinition, EquippedSlot, and EQUIPMENT_DEFINITIONS for upgrade tools |
| `src/equipment/EquipmentStore.ts` | Updated equipItem to include tier in equipped slot |
| `src/equipment/EquipmentBonus.ts` | Added tier to getGatheringToolBonus return type |
| `src/crafting/CraftingTypes.ts` | Added upgrade recipe IDs to RecipeId union |
| `src/crafting/UpgradeRecipes.ts` | New file: Contains upgrade recipe definitions |
| `src/crafting/StarterRecipes.ts` | Added ALL_CRAFTING_RECIPES combining starter + upgrade recipes |
| `src/crafting/CraftingService.ts` | Updated to use ALL_CRAFTING_RECIPES |
| `src/resources/ResourceTypes.ts` | Added `bonusYield` and `toolTier` to GatherResourceResult |
| `src/resources/GatheringService.ts` | Implemented bonus yield logic for Tier 2 tools |

### Client

| File | Change |
|---|---|
| `src/game/liveGameplaySnapshot.ts` | Added `tier` to EquippedSlotSnapshot, added `stationType` to CraftingRecipeSnapshot |
| `src/ui/windows/GatheringToolsPanel.tsx` | Added upgrade tool IDs to GATHERING_TOOL_IDS, added tier badge display |

### Tests

| File | Description |
|---|---|
| `src/tests/tool-crafting-upgrade.test.ts` | New test file covering upgrade tool definitions, recipes, tier bonuses, and determinism |

### Docs

| File | Description |
|---|---|
| `docs/ARELOGIC_TOOL_CRAFTING_UPGRADES.md` | This documentation file |