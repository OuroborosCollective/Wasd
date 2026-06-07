# ARELOGIC Live Resource Gameplay Loop

## Goal

Build the first fully visible, deterministic, server-authoritative gameplay loop for the 2D client:

1. Resource Node in World View is tapped/clicked
2. Server executes Gather action
3. Inventory updates
4. Start-path Quest Progress increases
5. Crafting Recipe becomes possible
6. Crafting produces Item
7. Equipment/Paperdoll shows Tool/Item visibly
8. Quest Journal and Quest Preview update live

## Architecture

### Server-Authoritative Flow

```
Client (Display + Input) → Server (Authoritative) → Snapshot (State) → Client (Display)
```

1. **Client Input**: User taps/clicks resource node marker in world view
2. **Server Action**: `POST /api/resource/gather` - server validates, applies XP, adds item to inventory
3. **State Update**: Server persists changes to inventory, skills, quests
4. **Snapshot Refetch**: Client refetches `/api/gameplay/snapshot` after action
5. **UI Update**: All panels (Inventory, Quest, Crafting, Equipment) update from snapshot

### Determinism Rules (ARELOGIC)

Strict adherence to deterministic gameplay:

- **No `Math.random()`** for gameplay decisions (XP, loot, quest progress, crafting success, equipment)
- **No `Date.now()`** for gameplay state progression
- **Client is Display + Input only** - no game logic decisions
- **Server is Authoritative** - all game state changes happen server-side
- **Every action uses**: `playerId`, `nodeId`, `recipeId`, `itemId`, `slotId`, `logicalIndex/currentTick`
- **Stable array sorting**:
  - `inventory` sorted by `itemId`
  - `equipment` sorted by `slot`
  - `skills` sorted by `skillId`
  - `resourceNodes` sorted by `nodeId`
  - `quests` sorted by `id`
- **No direct entity mutation in client**
- **No hidden implicit side effects**
- **Idempotent/defensive server endpoints**
- **Errors return JSON, never HTML**
- **Guest/Playtest fallback `playerId=guest` must not break**
- **Start paths are NOT classes** and must not lock skills

## Server Authoritative APIs

### Gather Resource

```
POST /api/resource/gather
```

**Request:**
```json
{
  "playerId": "guest",
  "nodeId": "starter_tree_001",
  "playerPosition": { "x": 460, "y": 500 },
  "currentTick": 123
}
```

**Response:**
```json
{
  "ok": true,
  "result": {
    "ok": true,
    "playerId": "guest",
    "nodeId": "starter_tree_001",
    "skillId": "woodcutting",
    "xpReward": 25,
    "itemRewardId": "wood_log",
    "itemRewardName": "Wood Log",
    "inventoryAdded": true,
    "inventoryQuantity": 1
  }
}
```

**Errors:**
- `invalid_node_id` - invalid node identifier
- `node_not_found` - node does not exist
- `node_depleted` - node is currently depleted
- `too_far` - player too far from node
- `level_too_low` - player skill level insufficient
- `authenticated_player_required` - production requires auth

### Craft Item

```
POST /api/crafting/craft
```

**Request:**
```json
{
  "playerId": "guest",
  "recipeId": "wood_plank"
}
```

**Response:**
```json
{
  "ok": true,
  "result": {
    "ok": true,
    "playerId": "guest",
    "recipeId": "wood_plank",
    "consumed": [{ "itemId": "wood_log", "quantity": 2 }],
    "outputs": [{ "itemId": "wood_plank", "quantity": 1 }],
    "craftingXpReward": 15
  }
}
```

### Equip Item

```
POST /api/equipment/equip
```

**Request:**
```json
{
  "playerId": "guest",
  "itemId": "wooden_axe"
}
```

**Response:**
```json
{
  "ok": true,
  "result": {
    "ok": true,
    "playerId": "guest",
    "itemId": "wooden_axe",
    "slotId": "woodcutting_tool"
  }
}
```

### Get Gameplay Snapshot

```
GET /api/gameplay/snapshot?playerId=guest
```

**Response:**
```json
{
  "ok": true,
  "playerId": "guest",
  "snapshot": { ... },
  "liveGameplaySnapshot": {
    "schemaVersion": "live-gameplay-snapshot.v1",
    "playerId": "guest",
    "logicalIndex": 1234,
    "tickRateHz": 10,
    "tickMs": 100,
    "inventory": [...],
    "equipment": [...],
    "skills": [...],
    "resourceNodes": [...]
  }
}
```

## Client Display Flow

### Resource Node Markers

- Rendered as HTML overlay on top of Pixi.js canvas
- Position calculated from world coordinates using isometric projection
- Each marker shows:
  - Icon (🌲 tree, ⛏️ ore, 🎣 fish)
  - Title (e.g., "Young Pine")
  - Status (available/depleted)
  - Gathering state (when active)

### Live Store Integration

All panels use `useLiveGameplaySnapshot()` hook which subscribes to `LiveGameplayStore`:

```typescript
const snapshot = useLiveGameplaySnapshot();
// snapshot.inventory, snapshot.equipment, snapshot.skills, etc.
```

### After-Action Refetch Pattern

After any action (gather/craft/equip), the client refetches the snapshot:

```typescript
const next = await fetchGameplaySnapshot(playerId);
if (next) {
  liveGameplayStore.setSnapshot(next);
}
```

This ensures all panels update with the latest server state.

## Quest System

### Start Path Quests

Start path quests are derived from inventory state on each snapshot request:

- **Forager**: Collect 3 Wood Logs
- **Miner**: Collect 3 Copper Ore
- **Angler**: Catch 3 Raw Fish
- **Artisan**: Craft 1 Wood Plank
- **Wanderer**: Secure basic supplies

Quest progress updates automatically when inventory changes.

## Known Limitations

1. **Marker Positioning**: Isometric projection is approximate; markers may not align perfectly with world sprites
2. **Guest Player ID**: Uses `guest` for E2E and dev testing; production requires proper auth
3. **No WebSocket Live Updates**: Currently uses polling/refetch after actions; WebSocket integration pending
4. **Static Resource Nodes**: MVP uses only the 3 starter nodes; procedural placement pending
5. **No Crafting Recipes in MVP**: Crafting system exists but recipes may not be populated

## E2E Tests

Run the gameplay loop tests:

```bash
pnpm run test:e2e -- --grep "Live Resource Gameplay Loop"
```

Or the full E2E suite:

```bash
pnpm run test:e2e
```

## Manual Verification

After deployment, verify:

1. `/2d/` loads correctly
2. Character exists
3. World Root visible
4. Resource Markers visible
5. Mobile controls visible
6. Tap on Resource Node works
7. Inventory shows item after gather
8. Quest Preview updates
9. Quest Journal shows progress
10. Crafting shows craftable recipes when enough items
11. Equipment/Paperdoll opens without crash
12. No raw errors or `useRef is not defined`
13. No `invalid_player` errors
14. No `waiting for server snapshot` when API is live

## Files Changed

### Server
- `server/src/routes/resourceGatherRoute.ts` - gather API (existing)
- `server/src/resources/GatheringService.ts` - gathering logic (existing)
- `server/src/routes/craftingRoute.ts` - crafting API (existing)
- `server/src/routes/equipmentRoute.ts` - equipment API (existing)
- `server/src/routes/gameplaySnapshot.ts` - snapshot endpoint (existing)
- `server/src/gameplay/LiveGameplaySnapshotComposer.ts` - live snapshot composition (existing)

### Client
- `apps/client-2d/src/game/liveGameplayStore.ts` - live store (existing)
- `apps/client-2d/src/game/useLiveGameplaySnapshot.ts` - hook (existing)
- `apps/client-2d/src/game/gameplayActions.ts` - **NEW** action dispatchers with refetch
- `apps/client-2d/src/ui/ResourceNodeMarkerLayer.tsx` - **NEW** world view markers
- `apps/client-2d/src/ui/windows/CraftingWindow.tsx` - updated to refetch after craft
- `apps/client-2d/src/ui/windows/InventoryPanel.tsx` - updated to refetch after equip
- `apps/client-2d/src/DeterministicWorldIsoApp.tsx` - added ResourceNodeMarkerLayer

### Tests
- `e2e/live-resource-gameplay-loop.spec.ts` - **NEW** complete gameplay loop tests

### Docs
- `docs/ARELOGIC_LIVE_RESOURCE_GAMEPLAY_LOOP.md` - **NEW** this file