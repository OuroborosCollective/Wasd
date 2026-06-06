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