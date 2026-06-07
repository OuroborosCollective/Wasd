# ARELOGIC RESOURCE PROCESSING CONTRACT

## Summary

This contract establishes the resource processing economy loop for Areloria. Players can process raw gathered resources into refined materials that sell for higher prices at the Village Trader. This creates a meaningful progression loop: Gather Raw → Process → Sell Processed → Earn More.

**PR:** #1787  
**Status:** Implemented  
**Date:** 2026-06-07

---

## 1. Why Resource Processing Now

After implementing:
- Resource Gathering (#1777, #1782, #1783)
- Tool Onboarding (#1784)
- Resource Selling (#1785)
- Village Trader Proximity (#1786)

The next logical step is adding value to gathered resources through processing. Benefits:
1. Creates processing progression loop
2. Encourages returning to village
3. Makes gathering more rewarding
4. Sets foundation for crafting tools from processed materials

---

## 2. Processing Recipe Table

### Resource Processing Recipes

| Recipe ID | Title | Input | Output | Craft Ticks |
|-----------|-------|-------|--------|-------------|
| `craft_wood_plank` | Craft Wood Plank | 2× wood_log | 1× wood_plank | 5 |
| `smelt_copper_ingot` | Smelt Copper Ingot | 2× copper_ore | 1× copper_ingot | 8 |
| `cook_raw_fish` | Cook Raw Fish | 1× raw_fish | 1× cooked_fish | 4 |

### Tool Crafting Recipes (Future)

| Recipe ID | Title | Input | Output | Craft Ticks |
|-----------|-------|-------|--------|-------------|
| `craft_wooden_axe` | Craft Wooden Axe | 2× wood_plank, 1× copper_ingot | 1× wooden_axe | 8 |
| `craft_copper_pickaxe` | Craft Copper Pickaxe | 1× wood_plank, 2× copper_ingot | 1× copper_pickaxe | 10 |
| `craft_simple_fishing_rod` | Craft Simple Fishing Rod | 1× wood_plank, 1× raw_fish | 1× simple_fishing_rod | 6 |

---

## 3. Premium Sell Prices

### Price Comparison

| Raw Resource | Raw Price | Processed Item | Processed Price | Profit |
|--------------|-----------|----------------|-----------------|--------|
| 2× wood_log | 2 coins | 1× wood_plank | 3 coins | +1 |
| 2× copper_ore | 6 coins | 1× copper_ingot | 8 coins | +2 |
| 1× raw_fish | 2 coins | 1× cooked_fish | 4 coins | +2 |

### Full Price Table

```typescript
export const RESOURCE_SELL_PRICES: Record<string, number> = {
  // Raw gathered resources
  wood_log: 1,
  copper_ore: 3,
  raw_fish: 2,
  // Processed resources (premium values)
  wood_plank: 3,
  copper_ingot: 8,
  cooked_fish: 4,
};
```

---

## 4. Processing Service Contract

**File:** `server/src/crafting/CraftingService.ts`

### Interface

```typescript
interface CraftingInput {
  playerId: string;
  recipeId: string;
}

interface CraftingResult {
  ok: boolean;
  playerId: string;
  recipeId: string;
  reason?: "crafted" | "recipe_not_found" | "level_too_low" | "missing_ingredients" | "inventory_full" | "invalid_player";
  consumed?: RecipeIngredient[];
  outputs?: RecipeOutput[];
  craftingXpReward?: number;
}
```

### Validation Rules

1. **Player must be valid**: Invalid/anonymous player returns `invalid_player`
2. **Recipe must exist**: Unknown recipe ID returns `recipe_not_found`
3. **Level requirement**: Player must have required crafting level, returns `level_too_low`
4. **Ingredients available**: Player must have all required items, returns `missing_ingredients`
5. **Inventory space**: Must have room for outputs, returns `inventory_full`

### Fail-Does-Not-Mutate

If any step fails, the transaction is rolled back:
- No ingredients consumed
- No outputs added
- No XP granted

---

## 5. Server Route

### POST /api/crafting/craft

**Request:**
```json
{
  "recipeId": "craft_wood_plank"
}
```

**Headers:**
- `x-player-id`: Player identifier

**Success Response (200):**
```json
{
  "ok": true,
  "result": {
    "ok": true,
    "playerId": "player1",
    "recipeId": "craft_wood_plank",
    "reason": "crafted",
    "consumed": [{ "itemId": "wood_log", "quantity": 2 }],
    "outputs": [{ "itemId": "wood_plank", "quantity": 1 }],
    "craftingXpReward": 20
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
    "recipeId": "craft_wood_plank",
    "reason": "missing_ingredients"
  }
}
```

### GET /api/crafting/recipes

Returns all recipes with craftability status for the player.

**Response:**
```json
{
  "ok": true,
  "playerId": "player1",
  "recipes": [
    {
      "id": "craft_wood_plank",
      "title": "Craft Wood Plank",
      "requiredLevel": 1,
      "craftingXpReward": 20,
      "ingredients": [{ "itemId": "wood_log", "quantity": 2 }],
      "outputs": [{ "itemId": "wood_plank", "quantity": 1 }],
      "craftTicks": 5,
      "craftable": true
    }
  ]
}
```

---

## 6. Inventory Mutation Rules

### Successful Craft Flow

1. **Validate all conditions** (player, recipe, level, ingredients, space)
2. **Consume ingredients** (remove from inventory)
3. **Add outputs** (add to inventory)
4. **Grant XP** (add to crafting skill)
5. **Return result** (with consumed/outputs/XP details)

### Failed Craft Flow

If any validation or operation fails:
- No inventory changes
- No XP changes
- Return failure reason

### No Partial Mutations

The system never partially processes a recipe. Either all ingredients are consumed and all outputs added, or nothing happens.

---

## 7. Client Integration

### Client Actions

**File:** `apps/client-2d/src/game/crafting.ts`

```typescript
export async function craftRecipe(recipeId: string): Promise<CraftingApiResponse>
```

### Client UI

**File:** `apps/client-2d/src/ui/windows/CraftingWindow.tsx`

**Features:**
- Lists all recipes with ingredients/outputs
- Shows XP reward per recipe
- Disabled button when not craftable
- "Missing Items" / "Locked" status
- Toast notifications on success/failure

**Test IDs:**
- `data-testid="crafting-row"` (for each recipe)
- `data-testid="craft-button"` (on each recipe)

---

## 8. NPC Trader Flavor

**File:** `server/src/npc/VendorRoutes.ts`

Village Trader (Mira) dialogue updated:

**Before:**
> "I buy wood, ore, and fish. Bring me what you gather."

**After:**
> "I buy wood, ore, and fish. Bring me what you gather. I pay more for planks, ingots, and cooked fish."

This informs players about the premium pricing for processed materials.

---

## 9. Determinism Rules

1. **No Math.random()**: Recipe results are deterministic
2. **No Date.now()**: Crafting uses server tick, not timestamps
3. **Stable recipe IDs**: IDs never change
4. **Fixed prices**: Sell prices are constants, not calculated
5. **Sorted output**: Recipe lists are sorted by ID for deterministic iteration

---

## 10. Known Limitations

1. **No station proximity**: Players can craft anywhere (no campfire/furnace required)
2. **Instant crafting**: No tick-based crafting queue (immediate processing)
3. **No tool durability**: Crafted tools don't degrade
4. **No dynamic market**: Prices are static
5. **No NPC inventory**: Unlimited buying capacity
6. **No recipe discovery**: All recipes visible from start

---

## 11. Next PRs

1. **#1788 Processing Stations / Campfire / Furnace POIs**
   - Require proximity to campfire for cooking
   - Require proximity to furnace for smelting
   - Visual landmarks for processing

2. **#1789 NPC Resource Economy Loop with stock/demand**
   - NPCs have limited buying capacity
   - Prices vary by NPC type
   - Supply affects availability

3. **#1790 Tool Crafting Recipes**
   - Already exists in StarterRecipes
   - Test full tool crafting flow
   - Verify tools work for gathering

4. **#1791 Region-based Pricing**
   - Different prices in different regions
   - Travel to remote traders for better deals

---

## 12. Files Changed

### Server (modified files)

| File | Change |
|------|--------|
| `server/src/economy/ResourceSellPrices.ts` | Updated prices for premium processed items |
| `server/src/crafting/StarterRecipes.ts` | Updated copper ingot recipe (3→2 ore) |
| `server/src/npc/VendorRoutes.ts` | Updated dialogue for premium pricing |

### Client (modified files)

| File | Change |
|------|--------|
| `apps/client-2d/src/ui/windows/InventoryPanel.tsx` | Updated client-side sell prices |

### Docs (new file)

| File | Purpose |
|------|---------|
| `docs/ARELOGIC_RESOURCE_PROCESSING_CONTRACT.md` | This documentation |

---

## 13. Live Verification

1. Open /2d/ and load a character
2. Collect resources:
   - 2× wood_log
   - 2× copper_ore
   - 1× raw_fish
3. Open Crafting window
4. Verify recipes show:
   - craft_wood_plank: 2 wood_log → 1 wood_plank
   - smelt_copper_ingot: 2 copper_ore → 1 copper_ingot
   - cook_raw_fish: 1 raw_fish → 1 cooked_fish
5. Craft wood_plank:
   - wood_log decreases by 2
   - wood_plank increases by 1
6. Go to Village Trader
7. Sell processed items:
   - wood_plank: 3 coins (vs 2 for raw logs)
   - copper_ingot: 8 coins (vs 6 for raw ore)
   - cooked_fish: 4 coins (vs 2 for raw fish)
8. Verify profit is positive for processing
9. Reload - inventory persists correctly

---

*Document generated for PR #1787*  
*Part of the Areloria/WASD Economy Loop effort*