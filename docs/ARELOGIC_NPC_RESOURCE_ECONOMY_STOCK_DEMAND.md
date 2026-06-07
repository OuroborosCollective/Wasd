# ARELOGIC NPC RESOURCE ECONOMY STOCK/DEMAND CONTRACT

## 1. Summary

This contract establishes server-authoritative vendor stock tracking and demand-based dynamic pricing for resource selling in Areloria. Mira the Village Trader now has finite purchasing capacity that affects prices, creating a basic supply/demand economy loop.

**PR:** #1790  
**Status:** Implemented  
**Date:** 2026-06-07

---

## 2. Why Stock/Demand Now

After implementing:
- Resource Node Contract V2 (#1782)
- Worldgen Outside Starter Village (#1783)
- Tool Onboarding / Starter Tool Acquisition (#1784)
- Resource Selling / Vendor Contract (#1785)
- Village Trader Proximity Contract (#1786)
- Resource Processing Economy Loop (#1787)
- Processing Stations / Campfire / Furnace POIs (#1788)
- World POI Gathering Camps (#1789)

The next logical step is adding depth to the economy. Benefits:
1. First meaningful economic feedback loop
2. Incentivizes variety in gathering (don't just farm one resource)
3. Processed items maintain premium value
4. Sets foundation for future NPC consumption and travel trades
5. Makes the world feel more alive and responsive

---

## 3. Vendor Stock State

### Stock Shape

```typescript
interface VendorStockState {
  vendorId: string;
  schemaVersion: 1;
  items: Record<string, number>; // itemId -> quantity
}
```

### Default Behavior
- Items not in stock have implicit quantity of 0
- Empty stock is valid and returns empty items object
- No expiration or decay of stock (MVP limitation)

### Persistence
- JSON file-based persistence at `data/vendor-stock-state.json`
- Follows the same pattern as Wallet persistence
- Atomic writes ensure data integrity

### Stock Rules
- Only resource items are tracked (not tools, equipment, quest items)
- Stock increases when players sell items
- Stock persists across server restarts

---

## 4. Dynamic Price Function

### Demand Bands

| Stock Level | Demand Band | Price Adjustment | Example (wood_log) |
|-------------|-------------|------------------|-------------------|
| 0-9 | normal | base price | 1 coin |
| 10-24 | stocked | base - 1 (floor 1) | 1 coin (floor) |
| 25+ | oversupplied | base - 2 (floor 1) | 1 coin (floor) |

### Price Calculation

```typescript
function calculateDynamicPrice(itemId: string, currentVendorStock: number) {
  const basePrice = RESOURCE_SELL_PRICES[itemId];
  const demandBand = getDemandBand(currentVendorStock);
  const adjustment = DEMAND_PRICE_ADJUSTMENT[demandBand];
  const unitPrice = Math.max(1, basePrice + adjustment); // floor of 1
  return { unitPrice, basePrice, demandBand };
}
```

### Processed Items Premium

| Item | Base Price | Notes |
|------|------------|-------|
| wood_log | 1 | Raw wood |
| copper_ore | 3 | Raw ore |
| raw_fish | 2 | Raw fish |
| wood_plank | 3 | Processed wood |
| copper_ingot | 8 | Processed metal |
| cooked_fish | 4 | Processed food |

**Premium maintained even in stocked/oversupplied bands:**
- copper_ingot (8) at stocked: 7 coins
- copper_ore (3) at stocked: 2 coins
- Premium of 5 coins maintained

### Determinism Rules
- No Math.random() in price calculation
- No Date.now() for price determination
- Same stock level → same price (deterministic function)
- Integer prices only (no floats)

---

## 5. Sell Route Mutation Order

### sellResource

```
1. Validate player
2. Validate quantity
3. Check item is sellable
4. Check player has sufficient quantity
5. Validate vendor proximity
6. Get current vendor stock for item → priceInfo
7. Remove items from player inventory
8. Add coins to player wallet
9. Add items to vendor stock
10. Return result with { unitPrice, basePrice, stockBefore, stockAfter, demandBand }
```

### sellAllResources

```
1. Validate player
2. Get inventory
3. Filter sellable items
4. Validate vendor proximity
5. Sort items by itemId (deterministic ordering)
6. For each item (in sorted order):
   a. Get current vendor stock
   b. Calculate dynamic price
   c. Add to sellOps list
7. Remove all items from inventory
8. Add total coins to wallet
9. Update vendor stock for each item
10. Return result with per-item pricing details
```

### Fail-Does-Not-Mutate Rules

| Failure Point | Inventory Mutated? | Wallet Mutated? | Stock Mutated? |
|--------------|-------------------|-----------------|----------------|
| invalid_player | No | No | No |
| invalid_quantity | No | No | No |
| not_sellable | No | No | No |
| insufficient_quantity | No | No | No |
| vendor_too_far | No | No | No |
| missing_player_position | No | No | No |

---

## 6. Snapshot Fields

### Server Types (LiveGameplaySnapshotTypes.ts)

```typescript
interface LiveGameplayVendorStockItem {
  itemId: string;
  quantity: number;
}

interface LiveGameplayVendorPriceItem {
  itemId: string;
  unitPrice: number;
  basePrice: number;
  demandBand: "normal" | "stocked" | "oversupplied";
}

interface LiveGameplayVendorEconomy {
  id: string;
  name: string;
  stock: LiveGameplayVendorStockItem[];
  prices: LiveGameplayVendorPriceItem[];
}

interface LiveGameplayVendorEconomySnapshot {
  vendors: LiveGameplayVendorEconomy[];
}
```

### Snapshot Composition

The snapshot includes vendor economy info via `getVendorEconomy` dependency:
- Vendor stock entries (only items with quantity > 0)
- Price info for ALL sellable items (not just those in stock)
- Demand band calculated at snapshot time

### Client Normalization

```typescript
function normalizeVendorEconomy(input: unknown): VendorEconomyContainerSnapshot {
  // Returns empty vendors array if missing/invalid
  // Filters invalid entries
  // Sorts by itemId for determinism
}
```

---

## 7. Client UI

### InventoryPanel Changes

**Props Updated:**
- Added `vendorEconomy?: VendorEconomyContainerSnapshot`

**Dynamic Price Display:**
- Shows current unit price from snapshot when available
- Falls back to DEFAULT_SELL_PRICES when no snapshot
- Displays demand band hint: "Price down: stocked" or "Price down: oversupplied"

**Sell Button:**
- Shows total value: "SELL 5c" instead of just "SELL"
- Tooltip shows calculated total

**Test IDs:**
- `data-testid="vendor-price"` on price display
- `data-testid="sell-resource-button"` on sell buttons

### Price Display Format

```
Normal:     "1c each"
Stocked:    "1c each (Price down: stocked)"
Oversupplied: "1c each (Price down: oversupplied)"
```

---

## 8. Vendor Dialogue

### Dynamic Dialogue

GET /api/npc/vendor/:vendorId returns stock-aware dialogue:

**Low stock (needs supplies):**
> "I need more supplies. Processed goods pay best."

**High wood_log stock:**
> "I have plenty of logs. Ingots and cooked fish pay better."

**Default:**
> "I buy wood, ore, and fish. Bring me what you gather. Processed goods pay best."

### Stock Summary Endpoint

GET /api/npc/vendor/:vendorId/stock returns:
```json
{
  "ok": true,
  "result": {
    "vendorId": "village_trader_001",
    "vendorName": "Mira the Quartermaster",
    "stock": [
      { "itemId": "wood_log", "quantity": 12 },
      { "itemId": "copper_ore", "quantity": 3 }
    ],
    "demandHint": {
      "needsStock": false,
      "overstockedItems": ["wood_log"],
      "message": "I have plenty of logs. Ingots and cooked fish pay better."
    }
  }
}
```

---

## 9. Determinism Rules

1. **No Math.random()**: Price calculation is pure function
2. **No Date.now()**: Stock state from persistence, not time
3. **Stable ordering**: sellAll sorts by itemId before processing
4. **Integer prices**: All prices are whole coins, no decimals
5. **Floor of 1**: Prices never go below 1 coin
6. **Fail-safe**: Failed operations don't mutate state

---

## 10. Known Limitations

1. **Single vendor**: Only Village Trader exists (no multi-vendor)
2. **No region pricing**: All vendors use same demand function
3. **No NPC consumption**: Vendors don't use stock for crafting/selling
4. **No production chains**: Stock doesn't trigger NPC behavior
5. **No travel trade**: Can't sell at remote locations
6. **No stock decay**: Stock never naturally decreases
7. **No player-to-player trading**: Cannot trade items between players
8. **No auction house**: Cannot list items for sale
9. **No real-money**: Coins are game currency only

---

## 11. Next PRs

1. **#1791 Tool Crafting / Tool Upgrade Recipes**
   - Better tools from gathered resources
   - Copper axe, iron pickaxe, etc.
   - Use coins to craft

2. **#1792 POI Discovery + Map Fog**
   - Named locations with bonus rewards
   - Visual landmarks for gathering
   - Respawn rate modifiers

3. **#1793 Camp NPC Gatherer Loop**
   - NPCs that gather resources automatically
   - Consume stock over time
   - Generate dynamic economy activity

4. **#1794 Region-based Pricing**
   - Different prices in different regions
   - Travel to remote traders for better deals
   - Regional supply/demand modifiers

---

## 12. Files Changed

### Server (new files)

| File | Purpose |
|------|---------|
| `server/src/economy/VendorStockTypes.ts` | Type definitions for vendor stock |
| `server/src/economy/VendorStockStore.ts` | In-memory stock storage |
| `server/src/economy/VendorStockService.ts` | Stock operations with persistence |
| `server/src/economy/VendorStockPersistence.ts` | Persistence interface |
| `server/src/economy/JsonVendorStockPersistenceAdapter.ts` | JSON file persistence |
| `server/src/economy/DemandPricing.ts` | Dynamic price calculation |
| `server/tests/vendor-stock.test.ts` | Unit tests for stock/pricing |

### Server (modified files)

| File | Change |
|------|--------|
| `server/src/economy/EconomyService.ts` | Added VendorStockService, dynamic pricing, stock updates |
| `server/src/economy/economyRuntime.ts` | Added VendorStockService singleton |
| `server/src/economy/index.ts` | Exported new stock/pricing types |
| `server/src/economy/ResourceSellPrices.ts` | Updated docstring (prices unchanged) |
| `server/src/gameplay/LiveGameplaySnapshotTypes.ts` | Added vendorEconomy types |
| `server/src/gameplay/LiveGameplaySnapshotComposer.ts` | Added getVendorEconomy dep, buildVendorEconomySnapshot |
| `server/src/gameplay/composeLiveGameplaySnapshotFromLegacy.ts` | Added vendor economy composition |
| `server/src/npc/VendorRoutes.ts` | Added stock-based dialogue, GET /stock endpoint |

### Client (modified files)

| File | Change |
|------|--------|
| `apps/client-2d/src/game/liveGameplaySnapshot.ts` | Added vendorEconomy types, normalizeVendorEconomy, getVendorPriceForItem |
| `apps/client-2d/src/ui/windows/InventoryPanel.tsx` | Added vendorEconomy prop, dynamic price display, demand band hints |
| `apps/client-2d/src/ui/GameplayWindowsLayer.tsx` | Pass vendorEconomy to InventoryPanel |

### Docs (new file)

| File | Purpose |
|------|---------|
| `docs/ARELOGIC_NPC_RESOURCE_ECONOMY_STOCK_DEMAND.md` | This documentation |

---

## 13. Live Verification

1. Open /2d/ and load a character
2. Wait for heartbeat OK
3. Collect some resources (wood, ore, fish)
4. Move near village trader position (462, 503)
5. Open inventory:
   - **Check**: Dynamic prices shown (1c, 3c, etc.)
6. Sell wood_log x1:
   - **Check**: Coins increase by 1
   - **Check**: Vendor stock increases
7. Sell more wood logs (to reach 10+):
   - **Check**: Price shows "down: stocked" hint
8. Sell even more (to reach 25+):
   - **Check**: Price shows "down: oversupplied" hint
9. Sell copper_ore and copper_ingot:
   - **Check**: Ingot sells for more than ore
10. Move away from trader (100+ units):
    - **Check**: "Return to village trader" error
    - **Check**: No coins, inventory, or stock change
11. Reload page:
    - **Check**: Wallet persists
    - **Check**: Vendor stock persists
12. Interact with vendor (GET /api/npc/vendor/village_trader_001):
    - **Check**: Dialogue reflects stock state

---

## 14. Test Commands

```bash
# Run server tests
pnpm --filter @wasd/server test

# Run typecheck
pnpm --filter @wasd/server typecheck

# Run client tests
pnpm --filter @wasd/client-2d test

# Guard entrypoints
pnpm guard:entrypoints
```

---

*Document generated for PR #1790*  
*Part of the Areloria/WASD Economy Foundation effort*