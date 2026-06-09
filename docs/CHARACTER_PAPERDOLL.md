# Character Profile and Paperdoll

## Status

**PARTIAL MVP**

This system adds persistent character identity and a paperdoll snapshot for equipped gathering tools.

## Loop

```
Login / playerId
→ Character profile
→ Gather resources
→ Craft equipment
→ Equip tool
→ Paperdoll shows equipped tool
→ LiveGameplaySnapshot exposes character + paperdoll
```

## Character Archetypes

- wanderer
- forager
- miner
- angler
- artisan

## Paperdoll Slots

| Slot | Purpose |
|------|---------|
| woodcutting_tool | Axe slot |
| mining_tool | Pickaxe slot |
| fishing_tool | Fishing rod slot |

## API Endpoints

### GET /api/character/profile

Returns the character profile for the authenticated player.

**Response:**
```json
{
  "ok": true,
  "playerId": "player_123",
  "profile": {
    "playerId": "player_123",
    "schemaVersion": 1,
    "characterId": "char_player_123",
    "displayName": "Test Hero",
    "archetype": "forager",
    "createdAtTick": 100,
    "selected": true
  }
}
```

### POST /api/character/create

Creates a new character for the authenticated player.

**Request:**
```json
{
  "displayName": "Test Hero",
  "archetype": "forager",
  "currentTick": 100
}
```

**Response (success):**
```json
{
  "ok": true,
  "result": {
    "ok": true,
    "playerId": "player_123",
    "reason": "created",
    "profile": { ... }
  }
}
```

## Snapshot Integration

Character and paperdoll are included in `/api/gameplay/snapshot`:

```json
{
  "snapshot": {
    "status": "live",
    "serverTick": 12345,
    "character": {
      "playerId": "player_123",
      "characterId": "char_player_123",
      "displayName": "Test Hero",
      "archetype": "forager",
      "selected": true
    },
    "paperdoll": {
      "character": { ... },
      "slots": [
        { "slotId": "fishing_tool", "itemId": "simple_fishing_rod", "title": "Simple Fishing Rod" },
        { "slotId": "mining_tool", "itemId": null, "title": "Empty" },
        { "slotId": "woodcutting_tool", "itemId": null, "title": "Empty" }
      ]
    },
    ...
  }
}
```

## Determinism Rules

- Character ID is derived from playerId
- No random character stats
- No random appearance generation
- Character creation uses validated input only
- Equipment shown comes from server-authoritative EquipmentService
- Client cannot directly mutate paperdoll

## Current Limits

- One character per player
- No multi-character roster
- No appearance editor
- No armor slots
- No combat weapon slots
- No paperdoll drag/drop yet
- No character deletion

## Files

### Server

- `server/src/character/CharacterTypes.ts` - Types and validation
- `server/src/character/CharacterStore.ts` - In-memory store
- `server/src/character/CharacterPersistence.ts` - Persistence interface
- `server/src/character/JsonCharacterPersistenceAdapter.ts` - JSON file adapter
- `server/src/character/PgCharacterPersistenceAdapter.ts` - Postgres adapter
- `server/src/character/CharacterService.ts` - Service with hydration
- `server/src/character/characterRuntime.ts` - Singleton instance
- `server/src/character/PaperdollTypes.ts` - Paperdoll types
- `server/src/character/characterRoute.ts` - REST endpoints
- `server/src/routes/gameplaySnapshot.ts` - Snapshot with character/paperdoll
- `server/src/routes/gameplaySnapshotUtils.ts` - Snapshot utilities
- `server/migrations/009_player_character_profile.sql` - Database schema

### Client

- `apps/client-2d/src/game/liveGameplaySnapshot.ts` - Types and normalizers
- `apps/client-2d/src/game/liveGameplayStore.ts` - Store with character/paperdoll
- `apps/client-2d/src/ui/windows/PaperdollPanel.tsx` - Paperdoll UI
- `apps/client-2d/src/ui/windows/CharacterSelectPanel.tsx` - Character creation UI
- `apps/client-2d/src/ui/windows/windows.css` - Styles

### Tests

- `server/src/tests/character-store.test.ts` - Unit tests
- `e2e/character-profile.spec.ts` - E2E tests

## Equipment System (2026-06-09)

The equipment system provides server-authoritative equip/unequip functionality.

### API Endpoints

#### GET /api/equipment/state

Get current player equipment state.

**Response:**
```json
{
  "ok": true,
  "playerId": "player_123",
  "equipment": {
    "playerId": "player_123",
    "schemaVersion": 1,
    "slots": [
      { "slotId": "woodcutting_tool", "itemId": "wooden_axe", "title": "Wooden Axe", "tier": 1 }
    ]
  }
}
```

#### POST /api/equipment/equip

Equip an item from inventory.

**Request:**
```json
{ "itemId": "wooden_axe" }
```

**Response:**
```json
{
  "ok": true,
  "result": {
    "ok": true,
    "playerId": "player_123",
    "itemId": "wooden_axe",
    "reason": "equipped",
    "equipment": { ... }
  }
}
```

#### POST /api/equipment/unequip

Unequip an item from a slot.

**Request:**
```json
{ "slotId": "woodcutting_tool" }
```

**Response:**
```json
{
  "ok": true,
  "result": {
    "ok": true,
    "playerId": "player_123",
    "slotId": "woodcutting_tool",
    "reason": "unequipped",
    "equipment": { ... }
  }
}
```

### Fail Reasons

| Reason | Description |
|--------|-------------|
| `invalid_item` | Item ID is not a valid equipment item |
| `item_not_owned` | Player does not own this item in inventory |
| `invalid_player` | Player ID is invalid (anonymous) |
| `invalid_slot` | Slot ID is not a valid equipment slot |
| `slot_empty` | No item equipped in the specified slot |

### Equipment Slots

| Slot ID | Skill | Example Items |
|---------|-------|----------------|
| `woodcutting_tool` | Woodcutting | wooden_axe, copper_axe |
| `mining_tool` | Mining | copper_pickaxe, reinforced_pickaxe |
| `fishing_tool` | Fishing | simple_fishing_rod, reinforced_fishing_rod |

### Client Integration

```typescript
import { equipGatheringTool, unequipGatheringTool, fetchEquipmentState } from "./game/equipment";

// Equip a tool
const result = await equipGatheringTool("wooden_axe");

// Unequip a tool
const result = await unequipGatheringTool("woodcutting_tool");

// Fetch current equipment state
const result = await fetchEquipmentState();
```

### Test IDs

| Test ID | Element |
|---------|---------|
| `inventory-panel-live` | Main inventory panel |
| `inventory-panel-empty` | Empty inventory state |
| `wallet-balance` | Coin balance display |
| `equipment-slot-{slotId}` | Equipped item in slot |
| `unequip-slot-{slotId}` | Unequip button for slot |
| `equip-item-{itemId}` | Equip button for item |
| `sell-resource-button` | Sell individual resource |
| `sell-all-resources-button` | Sell all resources |

### Files

- `server/src/routes/equipmentRoute.ts` - REST endpoints
- `server/src/equipment/EquipmentService.ts` - Equipment service
- `server/src/equipment/EquipmentStore.ts` - In-memory store
- `server/src/equipment/EquipmentTypes.ts` - Types and definitions
- `apps/client-2d/src/game/equipment.ts` - Client API functions
- `apps/client-2d/src/ui/windows/InventoryPanel.tsx` - Inventory UI