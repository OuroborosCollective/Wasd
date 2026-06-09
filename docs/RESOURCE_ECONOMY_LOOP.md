# Resource Economy Loop

> Documentation Date: 2026-06-09
> Branch: `feat/live-resource-economy-loop`

## Overview

The live resource economy loop is a server-authoritative gameplay system that allows players to:
1. **Gather** raw resources from resource nodes
2. **Process** raw resources into refined materials at stations
3. **Sell** processed goods to vendors for coins
4. **Progress** skills and equipment through gathered XP

## Core Loop

```
Gather Resource
  → receive inventory item (server-authoritative)
  → equipmentStats affects gathering yield/XP
  → skill XP applied

Process/Craft at Station
  → consume ingredients (server validates)
  → add outputs to inventory
  → crafting XP applied

Sell to Vendor
  → remove items from inventory
  → add coins to wallet
  → dynamic pricing based on stock/demand

Wallet Update
  → LiveGameplaySnapshot reflects new balance

Skill Progress
  → XP from gathering/crafting updates skill levels
  → visible in SkillProgressionPanel

LiveGameplaySnapshot Updates
  → inventory, wallet, skills, equipmentStats, vendorEconomy, resourceNodes, processingStations
  → client UI shows the result via reactive snapshot
```

## Server-Authoritative Contract

Client must never mutate inventory, wallet, XP, crafting, or vendor state directly.

Client sends **intent only**:
- `POST /api/resource/gather` - Request gather from node
- `POST /api/crafting/craft` - Request craft a recipe
- `POST /api/economy/sell-resource` - Request sell items
- `POST /api/economy/sell-all-resources` - Request sell all resources

Server validates and mutates state. Failed validation does not mutate state.

## ActionResult Shape

All API responses use the `ActionResult<T>` pattern:

```typescript
export type ActionResult<T> =
  | { ok: true; result: T }
  | { ok: false; reason: string; details?: Record<string, unknown> };
```

## Resources

### Supported Resources

| Resource ID | Type | Gathered From | Skill |
|-------------|------|--------------|-------|
| `wood_log` | Raw | Tree nodes | Woodcutting |
| `copper_ore` | Raw | Ore nodes | Mining |
| `raw_fish` | Raw | Fish spots | Fishing |

### Resource Node IDs

| Node ID | Resource | Position |
|---------|----------|----------|
| `starter_tree_001` | wood_log | Near starter village |
| `starter_tree_002` | wood_log | Near starter village |
| `starter_ore_001` | copper_ore | Near starter village |
| `starter_ore_002` | copper_ore | Near starter village |
| `starter_fish_001` | raw_fish | Near starter village |

## Processing Recipes

### Processing Stations

| Station ID | Type | Position | Interaction Radius |
|-----------|------|----------|-------------------|
| `workbench_001` | workbench | (468, 500) | 32 |
| `furnace_001` | furnace | (470, 506) | 32 |
| `campfire_001` | campfire | (465, 506) | 32 |

### Recipes

| Recipe ID | Input | Output | Station | XP |
|-----------|-------|--------|---------|-----|
| `craft_wood_plank` | 2x wood_log | 1x wood_plank | workbench | 20 |
| `smelt_copper_ingot` | 2x copper_ore | 1x copper_ingot | furnace | 30 |
| `cook_raw_fish` | 1x raw_fish | 1x cooked_fish | campfire | 15 |

## Vendor Economy

### Village Trader

| Vendor ID | Name | Position | Interaction Radius |
|-----------|------|----------|-------------------|
| `village_trader_001` | Mira the Quartermaster | (462, 503) | 32 |

### Sell Prices

| Item ID | Type | Price (coins) | Notes |
|---------|------|---------------|-------|
| `wood_log` | Raw | 1 | Base raw resource |
| `copper_ore` | Raw | 3 | Base raw resource |
| `raw_fish` | Raw | 2 | Base raw resource |
| `wood_plank` | Processed | 3 | Premium from wood_log x2 |
| `copper_ingot` | Processed | 8 | Premium from copper_ore x2 |
| `cooked_fish` | Processed | 4 | Premium from raw_fish |

**Price Logic**: Dynamic pricing based on vendor stock. Base prices shown above; actual price may vary based on demand bands (normal, stocked, oversupplied).

## Equipment Stats Integration

Equipment stats from Step 4 affect gathering:

| Stat | Effect | Formula |
|------|--------|---------|
| `gatheringYield` | Bonus yield quantity | `bonusYield = Math.floor(gathering_bonus / 100)` |
| `gatheringXp` | XP multiplier | `bonusXp = gathering_bonus` |

Tier 2 tools (copper_axe, reinforced_pickaxe, reinforced_fishing_rod) provide +1 bonus yield.

## Fail Reasons

All endpoints return fail reasons when validation fails:

| Reason | Endpoint | Description |
|--------|----------|-------------|
| `missing_player` | All | Player ID not provided or invalid |
| `missing_inventory` | All | Inventory state unavailable |
| `missing_resource_node` | Gather | Node ID not found |
| `resource_too_far` | Gather | Player position exceeds node interaction radius |
| `resource_depleted` | Gather | Node depleted, respawning |
| `missing_required_tool` | Gather | Required tool not equipped |
| `missing_recipe` | Craft | Recipe ID not found |
| `missing_ingredients` | Craft | Insufficient materials in inventory |
| `station_too_far` | Craft | Player not within station interaction radius |
| `missing_vendor` | Sell | Vendor ID not found |
| `vendor_too_far` | Sell | Player not within vendor interaction radius |
| `invalid_item` | Sell | Item cannot be sold |
| `invalid_quantity` | Sell | Quantity must be positive |

## Determinism Rules

Hard rules enforced:
- **No** `Math.random()` in gameplay paths
- **No** `Date.now()` in gameplay state
- **No** client-authoritative mutation
- **No** unordered item mutation
- **No** partial mutation after failed validation
- Stable sorted inventory updates
- Stable recipe resolution
- Stable vendor price table
- Stable replayable result from same input state

## Test IDs

UI elements use stable test IDs for E2E testing:

| Test ID | Element |
|---------|---------|
| `resource-node-{itemRewardId}` | Resource node in ResourceNodePanel |
| `gather-resource-{itemRewardId}` | Gather button in ResourceNodePanel |
| `process-{recipeId}` | Process button in CraftingWindow |
| `vendor-sell-{itemId}` | Sell button per item in InventoryPanel |
| `wallet-coin-balance` | Coin balance display in InventoryPanel |
| `skill-progress-{skillId}` | Skill progress row in SkillProgressionPanel |
| `inventory-item-{itemId}` | Inventory item in InventoryPanel |
| `inventory-panel-live` | Live inventory state |
| `inventory-panel-empty` | Empty inventory state |
| `resource-panel-live` | Live resource panel state |
| `crafting-panel-live` | Live crafting panel state |

## LiveGameplaySnapshot

The snapshot exposes all economy data for client UI:

```typescript
interface LiveGameplaySnapshot {
  inventory: readonly LiveGameplayInventoryItem[];
  wallet: { readonly coin: number };
  skills: readonly LiveGameplaySkillState[];
  equipmentStats: EquipmentStatBlock;
  vendorEconomy: LiveGameplayVendorEconomySnapshot;
  resourceNodes: readonly LiveGameplayResourceNode[];
  processingStations: readonly LiveGameplayProcessingStation[];
  // ...
}
```

## Files

### Server

| File | Purpose |
|------|---------|
| `server/src/routes/resourceGatherRoute.ts` | POST /api/resource/gather |
| `server/src/routes/craftingRoute.ts` | POST /api/crafting/craft |
| `server/src/economy/economyRoute.ts` | POST /api/economy/sell-resource, sell-all-resources |
| `server/src/resources/GatheringService.ts` | Gathering logic with equipment stat integration |
| `server/src/crafting/CraftingService.ts` | Crafting logic with station proximity |
| `server/src/economy/EconomyService.ts` | Vendor selling logic |
| `server/src/gameplay/LiveGameplaySnapshotComposer.ts` | Snapshot composition |
| `server/src/gameplay/composeLiveGameplaySnapshotFromLegacy.ts` | Legacy snapshot composer |
| `server/src/crafting/ProcessingStations.ts` | Station definitions |
| `server/src/economy/VillageVendors.ts` | Vendor definitions |
| `server/src/economy/ResourceSellPrices.ts` | Sell price table |
| `server/src/tests/resource-economy-loop.test.ts` | Unit tests |

### Client

| File | Purpose |
|------|---------|
| `apps/client-2d/src/ui/windows/InventoryPanel.tsx` | Inventory with sell actions |
| `apps/client-2d/src/ui/windows/CraftingWindow.tsx` | Crafting UI with process buttons |
| `apps/client-2d/src/ui/windows/ResourceNodePanel.tsx` | Resource nodes with gather buttons |
| `apps/client-2d/src/ui/windows/SkillProgressionPanel.tsx` | Skill progress display |
| `apps/client-2d/src/game/liveGameplaySnapshot.ts` | Snapshot types and normalization |
| `apps/client-2d/src/game/resources.ts` | Client gather API |
| `apps/client-2d/src/game/crafting.ts` | Client craft API |
| `apps/client-2d/src/game/gameplayActions.ts` | Client action dispatchers |

### E2E

| File | Purpose |
|------|---------|
| `e2e/resource-economy-loop.spec.ts` | E2E smoke tests |
| `e2e/live-resource-gameplay-loop.spec.ts` | Full gameplay loop E2E |

## Verification

```bash
pnpm --filter @wasd/shared build
pnpm --filter @wasd/server exec tsc --noEmit
pnpm run guard:all
pnpm -r --if-present test
pnpm run ci:verify
pnpm run test:e2e:ci
```