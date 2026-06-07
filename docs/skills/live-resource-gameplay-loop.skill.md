# Skill: Live Resource Gameplay Loop

## Purpose

Connects visible world resource nodes to server-authoritative gather, inventory, quest, crafting, and equipment updates. Creates a complete deterministic gameplay loop where:

1. Player taps/clicks a resource node marker in the world view
2. Server executes gather action, grants XP, adds item to inventory
3. Client refetches gameplay snapshot
4. All UI panels (Inventory, Quest, Crafting, Equipment) update automatically

## When to Use This Skill

Use this skill when:
- Building gameplay features that involve resource gathering
- Implementing quest progress tracking based on inventory
- Creating crafting systems that consume gathered resources
- Adding equipment that affects gathering efficiency
- Any feature requiring server-authoritative state updates

## Inputs

| Input | Type | Description |
|-------|------|-------------|
| `playerId` | string | Player identifier (use `guest` for E2E/dev) |
| `nodeId` | string | Resource node ID (e.g., `starter_tree_001`) |
| `currentTick` | number | Server tick for deterministic timing |
| `recipeId` | string | Crafting recipe ID (optional, for crafting) |
| `itemId` | string | Item to equip (optional, for equipment) |
| `slotId` | string | Equipment slot (optional, for equipment) |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| `liveGameplaySnapshot` | object | Full game state with inventory, equipment, skills, quests |
| `inventory` | array | Player's inventory slots with itemId and quantity |
| `equipment` | array | Equipped items by slot |
| `skills` | array | Player skills with XP and level |
| `resourceNodes` | array | Available resource nodes with status |
| `quests` | array | Quest objectives with progress |

## Deterministic Rules (ARELOGIC)

**CRITICAL**: All gameplay logic must follow these rules:

### Forbidden Patterns

```typescript
// ❌ NEVER use Math.random() for gameplay
const drop = Math.random(); // WRONG

// ❌ NEVER use Date.now() for gameplay state
const now = Date.now(); // WRONG for quest progress

// ❌ NEVER let client decide outcomes
if (clientRoll > 0.5) grantItem(); // WRONG
```

### Correct Patterns

```typescript
// ✅ Use stable hash for deterministic randomness
import { stableHash32 } from "./utils/hash";
const hash = stableHash32(`${playerId}:${nodeId}:${currentTick}`);
const drop = hash % 100;

// ✅ Use currentTick for timing
const canAct = currentTick >= lastActionTick + COOLDOWN_TICKS;

// ✅ Server decides all outcomes
// Client only sends action request
// Server returns result with new state
```

### Array Sorting Requirements

All arrays in snapshots must be stably sorted:

```typescript
inventory.sort((a, b) => a.itemId.localeCompare(b.itemId));
equipment.sort((a, b) => a.slot.localeCompare(b.slot));
skills.sort((a, b) => a.skillId.localeCompare(b.skillId));
resourceNodes.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
quests.sort((a, b) => a.id.localeCompare(b.id));
```

## API Endpoints

### Gather Resource

```
POST /api/resource/gather
Headers: Content-Type: application/json
Body: { playerId, nodeId, playerPosition, currentTick }
```

### Craft Item

```
POST /api/crafting/craft
Headers: Content-Type: application/json
Body: { playerId, recipeId }
```

### Equip Item

```
POST /api/equipment/equip
Headers: Content-Type: application/json
Body: { playerId, itemId }
```

### Get Snapshot

```
GET /api/gameplay/snapshot?playerId=guest
```

## Client Integration

### Action Dispatch Pattern

After any gameplay action, refetch the snapshot:

```typescript
import { fetchGameplaySnapshot, liveGameplayStore } from "./game/liveGameplayStore";
import { dispatchGather, dispatchCraft, dispatchEquip } from "./game/gameplayActions";

async function onGatherClick(nodeId: string, currentTick: number) {
  const result = await dispatchGather({
    playerId: "guest",
    nodeId,
    currentTick,
  });

  if (result.ok) {
    // Snapshot already refetched by dispatchGather
    // All subscribed components will update
  }
}
```

### Hook Usage

```typescript
import { useLiveGameplaySnapshot } from "./game/useLiveGameplaySnapshot";

function MyPanel() {
  const snapshot = useLiveGameplaySnapshot();
  
  return (
    <div>
      <div>Inventory: {snapshot.inventory.slots.length} items</div>
      <div>Skills: {snapshot.skills.length} skills</div>
      <div>Resources: {snapshot.resources.length} nodes</div>
    </div>
  );
}
```

## Error Handling

All API errors return JSON with `ok: false`:

```json
{
  "ok": false,
  "error": "node_depleted",
  "detail": "Node is currently depleted, respawning in 25 ticks"
}
```

Common error codes:
- `invalid_node_id` - Malformed node identifier
- `node_not_found` - Node does not exist
- `node_depleted` - Node is depleted (wait for respawn)
- `too_far` - Player too far from node (move closer)
- `level_too_low` - Insufficient skill level
- `invalid_recipe_id` - Unknown recipe
- `missing_ingredients` - Not enough materials
- `invalid_item_id` - Item not in inventory
- `invalid_slot` - Slot doesn't accept this item type
- `authenticated_player_required` - Production requires auth

## Quest System Integration

Start path quests automatically track inventory changes:

```typescript
// Forager quest: collect 3 wood logs
if (inventoryQuantity("wood_log") >= 3) {
  quest.status = "completed";
}

// Progress is recalculated on every snapshot request
```

## Testing

### E2E Test Commands

```bash
# Run gameplay loop tests
pnpm run test:e2e -- --grep "Live Resource Gameplay Loop"

# Run specific test
pnpm run test:e2e -- --grep "gather action updates inventory"

# Run with UI
pnpm run test:e2e
```

### Test Pattern

```typescript
test("gather updates inventory", async ({ page, request }) => {
  const playerId = "test-player";
  
  // Gather resource
  await request.post("/api/resource/gather", {
    data: { playerId, nodeId: "starter_tree_001", currentTick: 1000 }
  });
  
  // Verify snapshot
  const snapshot = await request.get("/api/gameplay/snapshot", {
    params: { playerId }
  });
  
  const body = await snapshot.json();
  const itemIds = body.liveGameplaySnapshot.inventory.map(i => i.itemId);
  expect(itemIds).toContain("wood_log");
});
```

## Agent Usage

When implementing features using this skill:

1. **Always use existing systems** - Don't reimplement gather/craft/equip if endpoints exist
2. **Follow ARELOGIC rules** - No Math.random(), Date.now() for gameplay
3. **Server-authoritative** - Client sends requests, server decides outcomes
4. **Refetch after actions** - Call `fetchGameplaySnapshot` and `setSnapshot` after any mutation
5. **Test the loop** - Verify full flow: gather → inventory → quest → craft → equip
6. **Document changes** - Update this skill and ARELOGIC_LIVE_RESOURCE_GAMEPLAY_LOOP.md

## Related Skills

- `wasd-monorepo-patterns` - Build commands and workspace patterns
- `wasd-client-2d-rendering` - 2D rendering patterns
- `wasd-server-player-stats-sync` - Player stats synchronization
- `wasd-quest-persistence-ops` - Quest persistence implementation
- `wasd-asset-tagging` - Asset tagging workflow