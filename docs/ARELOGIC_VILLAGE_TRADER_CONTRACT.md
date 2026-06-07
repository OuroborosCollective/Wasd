# ARELOGIC VILLAGE TRADER CONTRACT

## Summary

This contract establishes vendor proximity requirements for resource selling in Areloria. Players must be near the Village Trader NPC to sell gathered resources for coins. This creates a meaningful game loop: Go Out → Gather Resources → Return to Village/Vendor → Sell → Get Coins.

**PR:** #1786  
**Status:** Implemented  
**Date:** 2026-06-07

---

## 1. Why Selling is Now Bound to Vendor Proximity

After implementing:
- Character Name/Persistence (#1776)
- Resource Gather Intent Adapter (#1777)
- Resource Gather Position Bridge (#1780)
- Resource Node Contract V2 (#1782)
- Worldgen Outside Starter Village (#1783)
- Tool Onboarding / Starter Tool Acquisition (#1784)
- Resource Selling / Vendor Contract (#1785)

The next logical step is binding resource selling to a physical location. Benefits:
1. Creates meaningful travel gameplay loop
2. Gives villages/traders a purpose beyond decoration
3. Prevents abstract "magic selling" anywhere on the map
4. Sets foundation for future NPC economy features

---

## 2. Vendor Definition

### Village Trader NPC

**Vendor ID:** `village_trader_001`  
**Name:** "Mira the Quartermaster"  
**Role:** vendor  
**Vendor Type:** resource_trader

**Position:** `{ x: 462, y: 503 }`  
**Interaction Radius:** 32 units

The vendor is placed near the starter village center (chunk 0/0) for easy access by new players.

### Vendor Properties

```typescript
interface VendorDefinition {
  id: string;                    // Deterministic ID (e.g., "village_trader_001")
  name: string;                 // Display name (e.g., "Mira the Quartermaster")
  role: "vendor";
  vendorType: "resource_trader";
  position: {
    x: number;
    y: number;
  };
  interactionRadius: number;     // Distance in world units for valid selling
}
```

---

## 3. Sell Route Extension

### POST /api/economy/sell-resource

**Request:**
```json
{
  "playerId": "string",
  "itemId": "string",
  "quantity": number,
  "playerPosition": {
    "x": number,
    "y": number
  },
  "vendorId": "string"  // optional, defaults to "village_trader_001"
}
```

**Success Response (200):**
```json
{
  "ok": true,
  "result": {
    "itemId": "wood_log",
    "quantitySold": 3,
    "unitPrice": 1,
    "totalCoins": 3,
    "newBalance": 3,
    "reason": "sold"
  }
}
```

**Failure Response (400):**
```json
{
  "ok": false,
  "error": "vendor_too_far"
}
```

### POST /api/economy/sell-all-resources

**Request:**
```json
{
  "playerId": "string",
  "playerPosition": {
    "x": number,
    "y": number
  },
  "vendorId": "string"  // optional, defaults to "village_trader_001"
}
```

**Success Response (200):**
```json
{
  "ok": true,
  "result": {
    "sold": [
      { "itemId": "wood_log", "quantitySold": 5, "unitPrice": 1, "totalCoins": 5 }
    ],
    "totalCoins": 5,
    "newBalance": 5,
    "reason": "sold"
  }
}
```

---

## 4. Proximity Contract

### Distance Calculation

Euclidean distance between player position and vendor position:

```
distance = sqrt((playerX - vendorX)² + (playerY - vendorY)²)
```

### Validation Rules

1. **Vendor must exist**: Invalid vendor ID returns `invalid_vendor`
2. **Player position required**: Missing position returns `missing_player_position`
3. **Player position must be finite**: NaN or Infinity returns `invalid_player_position`
4. **Player must be within interaction radius**: Distance > 32 returns `vendor_too_far`

### Failure Reasons

| Error Code | Description | Inventory Mutated? |
|------------|-------------|-------------------|
| `invalid_vendor` | Vendor ID not found | No |
| `missing_player_position` | No position provided | No |
| `invalid_player_position` | Position contains NaN/Infinity | No |
| `vendor_too_far` | Player outside interaction radius | No |

---

## 5. Client Position Bridge

The client uses the existing PlayerPositionBridge to send player position with sell requests:

**File:** `apps/client-2d/src/game/gameplayActions.ts`

```typescript
// dispatchSellResource and dispatchSellAllResources now include:
const playerPosition = readPlayerPositionBridge();
body: JSON.stringify({
  playerId: pid,
  itemId: input.itemId,
  quantity: input.quantity,
  playerPosition: playerPosition ?? undefined,
  vendorId: "village_trader_001",
})
```

The PlayerPositionBridge stores player position in sessionStorage, updated by the game loop.

---

## 6. Client UI Feedback

**File:** `apps/client-2d/src/ui/windows/InventoryPanel.tsx`

### Vendor Hint

When resources are present in inventory, a hint is shown:
```html
<div class="vendor-sell-hint" data-testid="vendor-sell-hint">
  <span class="vendor-hint-icon">🏪</span>
  <span>Sell at Village Trader</span>
</div>
```

### Error Messages

User-friendly error messages for vendor proximity issues:

| Server Error | User Message |
|--------------|--------------|
| `vendor_too_far` | "Return to village trader to sell resources" |
| `missing_player_position` | "Cannot determine position - try moving slightly" |

---

## 7. NPC Interaction Routes

**File:** `server/src/npc/VendorRoutes.ts`

### GET /api/npc/vendor/:vendorId

Get vendor information and dialogue.

**Response:**
```json
{
  "ok": true,
  "result": {
    "vendor": {
      "id": "village_trader_001",
      "name": "Mira the Quartermaster",
      "role": "vendor",
      "vendorType": "resource_trader",
      "position": { "x": 462, "y": 503 },
      "interactionRadius": 32
    },
    "dialogue": "I buy wood, ore, and fish. Bring me what you gather."
  }
}
```

### POST /api/npc/vendor/:vendorId/interact

Player interacts with vendor.

**Response:**
```json
{
  "ok": true,
  "result": {
    "vendorId": "village_trader_001",
    "vendorName": "Mira the Quartermaster",
    "message": "I buy wood, ore, and fish. Bring me what you gather.",
    "interactionType": "trade"
  }
}
```

---

## 8. Determinism Rules

1. **No Math.random()**: Distance calculations use deterministic math
2. **No Date.now()**: All validation uses current state, not timestamps
3. **Vendor ID is stable**: Always `village_trader_001`
4. **Vendor position is fixed**: Always `{ x: 462, y: 503 }`
5. **Interaction radius is constant**: Always 32 units
6. **Same input → same output**: Proximity check is pure function

---

## 9. Known Limitations

1. **Single vendor**: Only one Village Trader exists (no traveling merchants)
2. **Static prices**: All resources sell at fixed prices from #1785
3. **No vendor inventory**: Unlimited buying capacity assumed
4. **No dynamic market**: Prices don't vary based on supply/demand
5. **No travel trade**: Cannot sell at remote vendors
6. **No reputation pricing**: All players get same prices

---

## 10. Next PRs

1. **#1787 NPC Resource Economy Loop**
   - NPCs that buy processed items for more
   - Smelting copper_ore → copper_ingot → sell
   - Cooking raw_fish → cooked_fish → sell

2. **#1788 Tool Crafting Recipes**
   - Better tools from gathered resources
   - Copper axe, iron pickaxe, etc.
   - Use coins to craft

3. **#1789 Vendor Camp / Mining Camp POIs**
   - Named locations with bonus rewards
   - Visual landmarks for gathering
   - Respawn rate modifiers

4. **#1790 Region-based Pricing**
   - Different prices in different regions
   - Travel to remote traders for better deals

---

## 11. Files Changed

### Server (new files)

| File | Purpose |
|------|---------|
| `server/src/economy/VillageVendors.ts` | Vendor definitions and proximity checking |
| `server/src/npc/VendorRoutes.ts` | NPC vendor interaction routes |

### Server (modified files)

| File | Change |
|------|--------|
| `server/src/economy/EconomyService.ts` | Added vendor proximity validation |
| `server/src/economy/economyRoute.ts` | Added playerPosition and vendorId parsing |
| `server/src/economy/economyRuntime.ts` | Updated interface signatures |
| `server/src/economy/index.ts` | Exported VillageVendors types |
| `server/src/core/ServerBootstrap.ts` | Added vendorRouter mount |
| `server/src/tests/economy-service.test.ts` | Added vendor proximity tests |

### Client (modified files)

| File | Change |
|------|--------|
| `apps/client-2d/src/game/gameplayActions.ts` | Added playerPosition to sell requests |
| `apps/client-2d/src/ui/windows/InventoryPanel.tsx` | Added vendor hint and error messages |

### Docs (new file)

| File | Purpose |
|------|---------|
| `docs/ARELOGIC_VILLAGE_TRADER_CONTRACT.md` | This documentation |

---

## 12. Live Verification

1. Open /2d/ and load a character
2. Wait for heartbeat OK
3. Collect some resources (wood, ore, fish)
4. Move near village trader position (462, 503)
5. Try selling resources:
   - **Success**: Coins increase, inventory decreases
6. Move away from village (100+ units)
7. Try selling again:
   - **Failure**: "Return to village trader to sell resources"
   - Coins unchanged, inventory unchanged
8. Interact with trader NPC:
   - **Message**: "I buy wood, ore, and fish. Bring me what you gather."
9. Reload page:
   - Coins and inventory persist correctly

---

*Document generated for PR #1786*  
*Part of the Areloria/WASD Economy Foundation effort*