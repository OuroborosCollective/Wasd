# ARELOGIC PROCESSING STATIONS CONTRACT

## Summary

This contract establishes processing station requirements for crafting recipes in Areloria. Players must be near specific processing stations (campfire, furnace, workbench) to craft certain recipes. This creates the world loop: Go Out → Gather Resources → Return to Village → Use Station → Process → Sell.

**PR:** #1788  
**Status:** Implemented  
**Date:** 2026-06-07

---

## 1. Why Processing Stations After #1787

After #1787, players could process resources anywhere on the map, which felt abstract. Processing stations add physical context to crafting and give villages a purpose beyond just the vendor.

Benefits:
1. Creates physical world loop: gather → station → process → sell
2. Gives villages meaningful POIs
3. Makes processing feel grounded in the world
4. Sets foundation for future station POIs (mining camp, fishing pier)

---

## 2. Station Types

### Starter Village Processing Stations

| Station ID | Type | Title | Position | Interaction Radius |
|------------|------|-------|----------|-------------------|
| `campfire_001` | campfire | Village Campfire | { x: 465, y: 506 } | 32 |
| `furnace_001` | furnace | Village Furnace | { x: 470, y: 506 } | 32 |
| `workbench_001` | workbench | Village Workbench | { x: 468, y: 500 } | 32 |

### Station Properties

```typescript
interface ProcessingStation {
  id: string;                    // Deterministic ID
  type: "campfire" | "furnace" | "workbench";
  title: string;                // Display name
  position: { x: number; y: number };
  interactionRadius: number;     // Distance in world units
}
```

---

## 3. Recipe Station Requirements

### Resource Processing Recipes

| Recipe ID | Title | Station Required | Input | Output |
|-----------|-------|-----------------|-------|--------|
| `cook_raw_fish` | Cook Raw Fish | campfire | 1× raw_fish | 1× cooked_fish |
| `smelt_copper_ingot` | Smelt Copper Ingot | furnace | 2× copper_ore | 1× copper_ingot |
| `craft_wood_plank` | Craft Wood Plank | workbench | 2× wood_log | 1× wood_plank |

### Tool Crafting Recipes

| Recipe ID | Title | Station Required | Input | Output |
|-----------|-------|-----------------|-------|--------|
| `craft_wooden_axe` | Craft Wooden Axe | workbench | 2× wood_plank, 1× copper_ingot | 1× wooden_axe |
| `craft_copper_pickaxe` | Craft Copper Pickaxe | workbench | 1× wood_plank, 2× copper_ingot | 1× copper_pickaxe |
| `craft_simple_fishing_rod` | Craft Simple Fishing Rod | workbench | 1× wood_plank, 1× raw_fish | 1× simple_fishing_rod |

---

## 4. Server Crafting Contract

### POST /api/crafting/craft

**Request:**
```json
{
  "recipeId": "cook_raw_fish",
  "playerPosition": { "x": 465, "y": 506 }
}
```

**Success Response (200):**
```json
{
  "ok": true,
  "result": {
    "ok": true,
    "playerId": "player1",
    "recipeId": "cook_raw_fish",
    "reason": "crafted",
    "consumed": [{ "itemId": "raw_fish", "quantity": 1 }],
    "outputs": [{ "itemId": "cooked_fish", "quantity": 1 }],
    "craftingXpReward": 15
  }
}
```

**Failure Response (409):**
```json
{
  "ok": false,
  "result": {
    "ok": false,
    "playerId": "player1",
    "recipeId": "cook_raw_fish",
    "reason": "station_too_far"
  }
}
```

---

## 5. Player Position / Proximity Check

### Validation Flow

1. **Recipe has stationType?**
   - No: Skip station check, proceed with crafting
   - Yes: Continue to position validation

2. **Player position provided?**
   - No: Return `missing_player_position`
   - Yes: Continue to position validation

3. **Player position finite?**
   - No: Return `invalid_player_position`
   - Yes: Continue to proximity check

4. **Player within station radius?**
   - No: Return `station_too_far`
   - Yes: Proceed with crafting

### Failure Reasons

| Error | Description | Inventory Mutated? |
|-------|-------------|-------------------|
| `missing_player_position` | No position provided for station-required recipe | No |
| `invalid_player_position` | Position contains NaN/Infinity | No |
| `station_too_far` | Player outside station interaction radius | No |

---

## 6. Client UI

- Shows station requirement per recipe (e.g., "🔥 Campfire required")
- Button shows "Move to Station" when `blockedReason === "station_too_far"`
- Toast shows user-friendly message: "Move near a station to craft this"

---

## 7. Determinism Rules

1. **No Math.random()**: Station positions and IDs are deterministic
2. **No Date.now()**: All validation uses current state, not timestamps
3. **Stable station IDs**: Always `campfire_001`, `furnace_001`, `workbench_001`
4. **Fixed positions**: Stations never move
5. **Fixed radius**: Always 32 units

---

## 8. Known Limitations

1. **Only starter village stations**: No remote processing locations
2. **No player-built stations**: Stations are world fixtures only
3. **No station durability**: Stations don't degrade
4. **No tick-based processing**: Instant crafting
5. **Emoji/fallback rendering**: No custom sprites for stations yet

---

## 9. Next PRs

1. **#1789 Mining/Fishing/Logging Camp POIs**
   - Named locations with bonus resources
   - Visual landmarks for gathering

2. **#1790 NPC Resource Economy Stock/Demand**
   - NPCs have limited buying capacity
   - Prices vary by NPC type

3. **#1791 Tool Crafting Recipes**
   - Verify full tool crafting flow works
   - Tools function for gathering

4. **#1792 Player-built Stations / Housing Foundation**
   - Players can place their own stations
   - Housing system foundation

---

## 10. Files Changed

### Server (new files)

| File | Purpose |
|------|---------|
| `server/src/crafting/ProcessingStations.ts` | Station definitions and proximity checking |

### Server (modified files)

| File | Change |
|------|--------|
| `server/src/crafting/CraftingTypes.ts` | Added stationType to recipes and results |
| `server/src/crafting/StarterRecipes.ts` | Added stationType to all recipes |
| `server/src/crafting/CraftingService.ts` | Added station proximity validation |
| `server/src/routes/craftingRoute.ts` | Added playerPosition and stationId parsing |

### Client (modified files)

| File | Change |
|------|--------|
| `apps/client-2d/src/game/crafting.ts` | Added playerPosition to craft requests |
| `apps/client-2d/src/ui/windows/CraftingWindow.tsx` | Added station display and feedback |

### Docs (new file)

| File | Purpose |
|------|---------|
| `docs/ARELOGIC_PROCESSING_STATIONS_CONTRACT.md` | This documentation |

---

## 11. Live Verification

1. Open /2d/ and load a character
2. Collect: 1× raw_fish, 2× copper_ore, 2× wood_log
3. Open Crafting window far from village
4. Try to craft - should show "Move to Station"
5. Return to village
6. Near campfire: cook raw_fish → cooked_fish succeeds
7. Near furnace: smelt copper_ore → copper_ingot succeeds
8. Near workbench: craft wood_plank succeeds
9. Go to Village Trader, sell processed items
10. Verify premium prices work
11. Reload - inventory persists correctly

---

## 12. Processing Loop

The full player loop now looks like:

```
Go Outside → Gather Resources → Return to Village
                                       ↓
                  ┌────────────────────┼────────────────────┐
                  ↓                    ↓                    ↓
             Campfire           Furnace            Workbench
                  ↓                    ↓                    ↓
            Cook Fish         Smelt Ore          Make Planks
                  ↓                    ↓                    ↓
                  └────────────────────┼────────────────────┘
                                       ↓
                             Village Trader
                                       ↓
                              Sell Processed Items
                              (Premium Prices ✓)
```

---

*Document generated for PR #1788*
*Part of the Areloria/WASD World POI effort*