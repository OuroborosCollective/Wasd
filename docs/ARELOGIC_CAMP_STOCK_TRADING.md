# ARELOGIC CAMP STOCK TRADING

## 1. Summary

Camp Stock Trading allows players to buy resources from camp workers at gathering camps. This feature transforms camp NPCs from passive gatherers into active trade hubs.

### Key Features
- Players can buy camp stock from camp workers (Woodcutter, Miner, Fisher)
- Fixed buy prices prevent arbitrage
- Server-authoritative: all decisions made server-side
- Proximity validation: player must be near camp to trade
- Discovery check: undiscovered camps cannot be traded with

## 2. Why Camp Stock Instead of Free Claim?

Camp Stock is bought, not claimed for free, because:
- **Economic balance**: Prevents infinite resource generation without cost
- **Coin sink**: Creates demand for coins, supporting the game's economy
- **Convenience vs. grind**: Players can buy resources instead of gathering, but at a cost
- **No exploit**: Players cannot exploit by gathering from camps for free

## 3. Buy Route Contract

### Endpoint
```
POST /api/npc/camp/:npcId/buy-stock
```

### Input
```typescript
{
  playerId: string;
  itemId: string;
  quantity: number;
  playerPosition?: { x: number, y: number };
}
```

### Success Response
```typescript
{
  ok: true,
  result: {
    npcId: string;
    poiId: string;
    itemId: string;
    quantityBought: number;
    unitPrice: number;
    totalCoins: number;
    newCoinBalance: number;
    remainingCampStock: number;
  }
}
```

### Failure Response
```typescript
{
  ok: false;
  error: string; // One of:
  // - invalid_player
  // - invalid_npc
  // - undiscovered_camp
  // - invalid_item
  // - invalid_quantity
  // - insufficient_camp_stock
  // - insufficient_coins
  // - missing_player_position
  // - invalid_player_position
  // - camp_too_far
}
```

## 4. Price Table

| Item | Camp Buy Price | Mira Sell Price | Arbitrage? |
|------|---------------|-----------------|------------|
| wood_log | 2 coins | 1 coin | No (2 > 1) |
| copper_ore | 5 coins | 3 coins | No (5 > 3) |
| raw_fish | 4 coins | 2 coins | No (4 > 2) |

**Rule**: Camp buy price MUST be >= Mira sell price to prevent buy-low-sell-high arbitrage.

## 5. Mutation Order

On successful buy, mutations occur in this order:
1. **Validate all conditions** (discovery, proximity, stock, coins)
2. **Subtract coins** from player wallet
3. **Subtract camp stock** from camp inventory
4. **Add player inventory** item

If any validation fails, **no mutation occurs**.

## 6. Discovery / Proximity Rules

### Discovery
- Player must have discovered the camp POI to trade
- Undiscovered camps return `undiscovered_camp` error
- No stock information leaks for undiscovered camps

### Proximity
- Player position must be within 48 units of camp POI
- Distance calculated using Euclidean formula
- Far players receive `camp_too_far` error

## 7. Client UI

### Buy Button
- Appears on camp NPC marker when stock is available
- Shows item name and price: "BUY (5c)"
- Disabled state while processing
- Toast notification on success/failure

### Toast Messages
| Scenario | Message |
|----------|---------|
| Success | "Bought 1 Log" |
| insufficient_coins | "Not enough coins" |
| camp_too_far | "Move closer to the camp worker" |
| insufficient_camp_stock | "Camp stock empty" |

### Test IDs
- `data-testid="camp-trade-buy-button"`
- `data-testid="camp-npc-marker"`

## 8. Determinism Rules

- **No Math.random()**: Prices and behavior are deterministic
- **No Date.now()**: All timing based on server tick
- **No client mutation**: Server is authoritative for all state changes
- **Fixed prices**: Buy prices are constant, not dynamic

## 9. Known Limitations

1. **No selling to camp**: Players cannot sell items to camp workers (only buy)
2. **No dynamic pricing**: Prices are fixed, not based on supply/demand
3. **No reputation system**: All players can trade equally
4. **No buy-all**: Only single quantity purchases supported in MVP
5. **No NPC coin wallet**: NPCs don't track their own coin balance
6. **Camp stock resets on restart**: Stock is in-memory only (persistence PR #1799)

## 10. Next PRs

| PR | Title | Description |
|----|-------|-------------|
| #1796 | Tool Durability / Repair | Add tool durability system |
| #1797 | Skill Level Requirements | Require skill levels for better yields |
| #1798 | NPC Memory for Camp Workers | NPCs remember interactions |
| #1799 | Camp Stock Persistence | Persist camp stock to disk/database |

## 11. Files Changed

### Server
- `server/src/economy/CampStockPrices.ts` - New file with buy prices
- `server/src/npc/CampNpcService.ts` - Added buyStock method
- `server/src/npc/CampNpcRoutes.ts` - Added buy-stock route
- `server/src/npc/CampNpcTypes.ts` - Added trading dialogue
- `server/src/gameplay/LiveGameplaySnapshotTypes.ts` - Added buyPrice field

### Client
- `apps/client-2d/src/game/gameplayActions.ts` - Added dispatchBuyCampStock
- `apps/client-2d/src/game/liveGameplaySnapshot.ts` - Added buyPrice to CampStockItemSnapshot
- `apps/client-2d/src/ui/CampNpcMarkerLayer.tsx` - Added buy button UI

### Tests
- `server/src/tests/camp-npc-buy-stock.test.ts` - New test file

### Docs
- `docs/ARELOGIC_CAMP_STOCK_TRADING.md` - This file