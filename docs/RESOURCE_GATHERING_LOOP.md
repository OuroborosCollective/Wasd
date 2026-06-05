# Resource Gathering Loop

## Status

**PARTIAL MVP**

This system adds deterministic starter resource nodes for:

- Woodcutting
- Mining
- Fishing

It connects resource interaction to the existing Skill Progression system from PR #1704.

## Loop

```
Resource Node
  → Server-authoritative gather request
  → Range check
  → Skill level check
  → Node depletion by serverTick
  → Skill XP reward
  → Item reward
  → LiveGameplaySnapshot update
  → 2D Resource Node Panel update
```

## Deterministik Regeln

- **Kein Math.random()** - Alle Entscheidungen basieren auf stabilen IDs und Tick-Counts
- **Kein Date.now()** für Gameplay-State - Respawn verwendet serverTick
- **Stabile Node-IDs** - `starter_tree_001`, `starter_ore_001`, `starter_fish_001`
- **Stabile Node-Reihenfolge** - Sortiert nach ID für deterministische Ausgabe
- **Server-authoritativ** - Client kann niemals XP oder Rewards direkt setzen

## MVP Starter Nodes

| Node ID | Skill | XP Reward | Item Reward | Respawn (Ticks) | Position |
|---------|-------|-----------|-------------|-----------------|----------|
| starter_tree_001 | woodcutting | 25 | Wood Log | 30 | (460, 500) |
| starter_ore_001 | mining | 30 | Copper Ore | 40 | (540, 520) |
| starter_fish_001 | fishing | 20 | Raw Fish | 25 | (500, 580) |

## Architektur

### Server-Side

```
server/src/resources/
  ResourceTypes.ts        # Type definitions
  StarterResourceNodes.ts # Static node definitions
  ResourceNodeStore.ts    # State management (tick-based depletion)
  GatheringService.ts     # Gathering logic + skill integration

server/src/routes/
  resourceGatherRoute.ts  # /api/resource/gather, /api/resource/nodes

server/src/routes/gameplaySnapshotUtils.ts
  # Added ResourceNodeSnapshot to LiveGameplaySnapshot

server/src/core/WorldTick.ts
  # Added pendingStarterResourceActions queue
  # Added gather handler via gatheringService.gather()
```

### Client-Side

```
apps/client-2d/src/
  game/liveGameplaySnapshot.ts   # Added ResourceNodeSnapshot type
  game/resources.ts              # HTTP + WebSocket gather functions
  ui/windows/ResourceNodePanel.tsx # Resource node panel UI
  ArelorianStitchHud.tsx         # Added "resources" panel (shortcut: r)
```

## API Endpoints

### POST /api/resource/gather

Gather from a resource node.

**Request:**
```json
{
  "nodeId": "starter_tree_001",
  "playerPosition": { "x": 460, "y": 500 },
  "currentTick": 1000
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "result": {
    "ok": true,
    "playerId": "player-123",
    "nodeId": "starter_tree_001",
    "reason": "gathered",
    "skillId": "woodcutting",
    "xpReward": 25,
    "itemRewardId": "wood_log",
    "itemRewardName": "Wood Log"
  }
}
```

**Response (409 Conflict):**
```json
{
  "ok": false,
  "result": {
    "ok": false,
    "playerId": "player-123",
    "nodeId": "starter_tree_001",
    "reason": "node_depleted"
  }
}
```

### GET /api/resource/nodes

Get all resource node snapshots.

**Request:** `GET /api/resource/nodes?tick=1000`

**Response:**
```json
{
  "ok": true,
  "nodes": [
    {
      "id": "starter_tree_001",
      "kind": "tree",
      "title": "Young Pine",
      "skillId": "woodcutting",
      "requiredLevel": 1,
      "xpReward": 25,
      "itemRewardId": "wood_log",
      "itemRewardName": "Wood Log",
      "position": { "x": 460, "y": 500 },
      "radius": 24,
      "status": "available",
      "depletedUntilTick": null,
      "remainingTicks": 0
    }
  ],
  "count": 3
}
```

## Aktuelle Limits

- **Statische Starter Nodes nur** - Keine prozedurale Platzierung
- **Inventar Reward ist Runtime** - Item wird im InventorySystem hinzugefügt, aber Persistenz ist pending
- **Keine Crafting-Integration** - Rohmaterialien können noch nicht zu Items verarbeitet werden
- **Keine Tool-Anforderungen** - Spieler können ohne Werkzeug sammeln
- **Kein Skill-Level-Effekt** - Gather-Chance hängt nicht von Skill-Level ab

## Nächste Schritte

1. **feat(inventory): persist gathered resource items**
   - Item-Persistenz in Datenbank
   - Inventory-API erweitern

2. **feat(crafting): add recipe system for gathered resources**
   - Rezepte definieren (Holz → Bretter, etc.)
   - Crafting-UI hinzufügen

3. **feat(resources): add procedural resource node placement**
   - Chunk-basiertes Node-Spawning
   - Bioms-spezifische Nodes

## Verification

```bash
# Unit tests
pnpm vitest run server/src/tests/resource-node-store.test.ts

# E2E tests
pnpm run test:e2e -- e2e/resource-gathering.spec.ts
pnpm run test:e2e -- e2e/client-2d-resource-panel.spec.ts

# Build check
pnpm --filter @wasd/client-2d build
```

## WebSocket Integration

Für WebSocket-basierte Interaktion:

1. Client sendet `wasd:client-action` mit `resource_gather`:
```typescript
window.dispatchEvent(new CustomEvent("wasd:client-action", {
  detail: {
    action: "resource_gather",
    payload: { nodeId, playerPosition }
  }
}));
```

2. Server verarbeitet in `pendingStarterResourceActions` Queue

3. Server sendet `RESOURCE_GATHER_RESULT` und `SKILL_PROGRESS` zurück

## Änderungen in diesem PR

- Server: `server/src/resources/` (4 neue Dateien)
- Server: `server/src/routes/resourceGatherRoute.ts`
- Server: `server/src/core/WorldTick.ts` (WS-Hook)
- Server: `server/src/routes/gameplaySnapshot*.ts` (Snapshot-Update)
- Server: `server/src/core/ServerBootstrap.ts` (Route-Wiring)
- Client: `apps/client-2d/src/game/liveGameplaySnapshot.ts`
- Client: `apps/client-2d/src/game/resources.ts`
- Client: `apps/client-2d/src/ui/windows/ResourceNodePanel.tsx`
- Client: `apps/client-2d/src/ArelorianStitchHud.tsx`
- Client: `apps/client-2d/src/ModuleRegistry.ts`
- Tests: `server/src/tests/resource-node-store.test.ts`
- Tests: `e2e/resource-gathering.spec.ts`
- Tests: `e2e/client-2d-resource-panel.spec.ts`