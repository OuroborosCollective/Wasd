# ARELOGIC RESOURCE VENDOR CONTRACT

## Summary

This contract establishes server-authoritative resource selling functionality, enabling players to sell gathered resources for coins. The first completed economy loop in Areloria: Gather Resources → Sell → Gain Currency.

## Why Resource Selling Now

After implementing:
- Character Name/Persistence (#1776)
- Resource Gather Intent Adapter (#1777)
- Resource Gather Position Bridge (#1778)
- Resource Node Contract V2 (#1782)
- Worldgen Outside Starter Village (#1783)
- Tool Onboarding / Starter Tool Acquisition (#1784)

The next logical step is enabling players to use gathered resources. Resource selling provides:
1. First meaningful economy loop
2. Reason to gather more resources
3. Currency for future crafting/progression
4. Validation that the gathering system works

## Sellable Resources

| Item ID       | Sell Price (coins) |
|---------------|-------------------|
| wood_log      | 1                 |
| copper_ore    | 3                 |
| raw_fish      | 2                 |
| wood_plank    | 1                 |
| copper_ingot  | 5                 |
| cooked_fish   | 3                 |

**Non-sellable items:**
- Tools (wooden_axe, copper_pickaxe, simple_fishing_rod)
- Quest items
- Unknown items

## Price Table Rules

- Prices are deterministic and static
- No Math.random() for prices
- No Date.now() for prices
- No dynamic market pricing
- Prices are integers (coins are whole units)
- Price table defined in: `server/src/economy/ResourceSellPrices.ts`

## Server Routes

### POST /api/economy/sell-resource

**Request:**
```json
{
  "playerId": "string",
  "itemId": "string",
  "quantity": number
}
```

**Headers:**
- `x-player-id`: Player identifier

**Success Response (200):**
```json
{
  "ok": true,
  "result": {
    "itemId": "wood_log",
    "quantitySold": 3,
    "unitPrice": 1,
    "totalCoins": 3,
    "newBalance": 3
  }
}
```

**Failure Response (400):**
```json
{
  "ok": false,
  "error": "invalid_quantity"
}
```

### POST /api/economy/sell-all-resources

**Request:**
```json
{
  "playerId": "string"
}
```

**Headers:**
- `x-player-id`: Player identifier

**Success Response (200):**
```json
{
  "ok": true,
  "result": {
    "sold": [
      { "itemId": "wood_log", "quantitySold": 5, "unitPrice": 1, "totalCoins": 5 },
      { "itemId": "copper_ore", "quantitySold": 2, "unitPrice": 3, "totalCoins": 6 }
    ],
    "totalCoins": 11,
    "newBalance": 11
  }
}
```

**Failure Response (400):**
```json
{
  "ok": false,
  "error": "nothing_to_sell"
}
```

## Wallet / Currency Contract

**Server-side:**
- `server/src/economy/WalletTypes.ts` - WalletState type
- `server/src/economy/WalletStore.ts` - In-memory wallet storage
- `server/src/economy/WalletService.ts` - Wallet operations with persistence
- `server/src/economy/WalletPersistence.ts` - Persistence interface

**Wallet State:**
```typescript
interface WalletState {
  playerId: string;
  schemaVersion: 1;
  balances: {
    coin: number;  // Always initialized to 0
  };
}
```

**Snapshot shape (for client):**
```typescript
interface WalletSnapshot {
  coin: number;
}
```

## Fail-Does-Not-Mutate Rules

1. **Invalid player**: No inventory or wallet changes
2. **Invalid item**: No changes
3. **Invalid quantity**: No changes
4. **Not sellable**: No changes
5. **Insufficient quantity**: No changes

The server validates all conditions before making any state changes. If any validation fails, the operation is rejected and the player's state remains unchanged.

## Client Actions

**File:** `apps/client-2d/src/game/gameplayActions.ts`

```typescript
// Sell specific resource
dispatchSellResource({ itemId: string, quantity: number, playerId?: string })

// Sell all resources
dispatchSellAllResources(playerId?: string)
```

Both actions:
- POST to server route
- Include `x-player-id` header
- Refetch snapshot on success
- Return ActionResult with details

## Client UI

**File:** `apps/client-2d/src/ui/windows/InventoryPanel.tsx`

**Features:**
- Wallet balance display (Coins: X)
- "SELL" button on each sellable resource slot
- "Sell All Resources" button at top of inventory
- Toast feedback on sell success/failure

**Test IDs:**
- `data-testid="wallet-balance"`
- `data-testid="sell-resource-button"`
- `data-testid="sell-all-resources-button"`

**Sell button behavior:**
- Sells entire stack (quantity from slot)
- Shows tooltip with total value
- Only visible for sellable resources

## Snapshot Integration

**Server:** `server/src/routes/gameplaySnapshot.ts`
- Wallet state included in snapshot
- Coin balance returned with each snapshot

**Client:** `apps/client-2d/src/game/liveGameplaySnapshot.ts`
- `wallet.coin` field added to LiveGameplaySnapshot
- Normalizes to 0 if missing (backwards compatible)

## Known Limitations

1. **Static prices**: No dynamic market or NPC-specific pricing
2. **No NPC vendor location**: Items can be sold anywhere (MVP)
3. **No vendor inventory**: Unlimited buying capacity assumed
4. **No player trading**: Cannot trade coins/items with other players
5. **No real-money**: Coins are game currency only
6. **No partial sell**: Must sell entire stack or all resources

## Next PRs

1. **#1786 NPC Vendor Location / Village Trader**
   - Add physical NPC vendor in village
   - Require player to be near vendor to sell
   - NPC-specific pricing (future)

2. **#1787 NPC Resource Economy Loop**
   - NPCs that buy processed items for more
   - Smelting copper_ore → copper_ingot → sell
   - Cooking raw_fish → cooked_fish → sell

3. **#1788 Tool Crafting Recipes**
   - Better tools from gathered resources
   - Copper axe, iron pickaxe, etc.
   - Use coins to craft

4. **#1789 Mining/Fishing Camps as World POIs**
   - Named locations with bonus rewards
   - Visual landmarks for gathering
   - Respawn rate modifiers

## Files Changed

### Server (new files)
- `server/src/economy/WalletTypes.ts`
- `server/src/economy/WalletStore.ts`
- `server/src/economy/WalletService.ts`
- `server/src/economy/WalletPersistence.ts`
- `server/src/economy/JsonWalletPersistenceAdapter.ts`
- `server/src/economy/ResourceSellPrices.ts`
- `server/src/economy/EconomyService.ts`
- `server/src/economy/economyRoute.ts`
- `server/src/economy/economyRuntime.ts`
- `server/src/economy/index.ts`
- `server/src/tests/economy-service.test.ts`

### Server (modified files)
- `server/src/core/ServerBootstrap.ts` - Added economyRouter
- `server/src/gameplay/LiveGameplaySnapshotTypes.ts` - Added wallet
- `server/src/gameplay/LiveGameplaySnapshotComposer.ts` - Added getWallet
- `server/src/gameplay/composeLiveGameplaySnapshotFromLegacy.ts` - Added wallet
- `server/src/tests/LiveGameplaySnapshotComposer.test.ts` - Updated tests

### Client (modified files)
- `apps/client-2d/src/game/liveGameplaySnapshot.ts` - Added wallet types
- `apps/client-2d/src/game/gameplayActions.ts` - Added sell actions
- `apps/client-2d/src/ui/windows/InventoryPanel.tsx` - Added sell UI
- `apps/client-2d/src/ui/GameplayWindowsLayer.tsx` - Added wallet prop

### Docs (new file)
- `docs/ARELOGIC_RESOURCE_VENDOR_CONTRACT.md`