# WASD AI Skill: Deterministic Resource Entity Generation

**Purpose**: Guide future agents implementing chunk-based resource generation with KAPPA-grid alignment.

**Context**: Built in Session #2026-05-31 for the ResourcePopulator feature.

---

## Core Axioms

1. **Absolute Determinism**: NO `Math.random()`. All placement from worldSeed via AREHash.
2. **KAPPA-Grid Alignment**: Resources have precise `kappaX`/`kappaZ` coordinates.
3. **Depletion Persistence**: Gathered resources don't respawn on chunk reload.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                 ResourcePopulator                           │
│  worldSeed + chunkX + chunkZ                              │
│         │                                                  │
│         ▼                                                  │
│  AREHash.hashObject({ seed, chunkX, chunkZ })             │
│         │                                                  │
│         ▼                                                  │
│  SeededARERng(seed)                                       │
│         │                                                  │
│         ▼                                                  │
│  For each resource type:                                   │
│    For attempt < density * attempts:                       │
│      nextFloat() → position                                │
│      nextInt() → resource type                            │
│      generateEntityId(type, cx, cz, idx)                  │
│         │                                                  │
│         ▼                                                  │
│  Check ChunkModificationDirector.isDepleted(id)           │
│         │                                                  │
│         ▼                                                  │
│  GeneratedResourceEntity[]                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Entity ID Format

```
res_{type}_{chunkX}_{chunkZ}_{index}
Examples:
  res_wood_0_5_0
  res_stone_0_5_1
  res_iron_1_3_0
```

---

## Implementation Checklist

### 1. ChunkModificationDirector.ts

**Purpose**: Track depleted resources per chunk for persistence.

```typescript
class ChunkModificationDirector {
  private modificationMap = new Map<ChunkKey, ChunkModificationData>();
  
  markResourceDepleted(entityId, chunkX, chunkZ, tick, originalYield?): void
  isResourceDepleted(entityId): boolean
  getDepletedResourcesForChunk(chunkX, chunkZ): Set<string>
  serialize(): SerializedChunkModifications
  deserialize(data): void
}
```

**Key design**:
- Deterministic entity IDs enable O(1) lookup
- Map by entity ID, not chunk (same resource = same ID everywhere)

### 2. ResourcePopulator.ts

```typescript
interface ResourceDefinition {
  type: string;
  yield: number;
  density: number;        // 0-1 probability
  biomes: string[];      // ['forest', 'mountain']
  footprint: { w: number; d: number };
}

const RESOURCE_DEFINITIONS: Record<string, ResourceDefinition> = {
  wood: { type: 'wood', yield: 5, density: 0.15, biomes: ['forest'] },
  stone: { type: 'stone', yield: 4, density: 0.12, biomes: ['mountain'] },
  iron: { type: 'iron', yield: 2, density: 0.05, biomes: ['mountain'] },
  // ...
};

interface GeneratedResourceEntity {
  id: string;           // res_{type}_{cx}_{cz}_{idx}
  type: 'RESOURCE';
  resourceType: string;
  kappaX: number;       // KAPPA-scale (1 unit = 1000 KAPPA)
  kappaZ: number;
  yield: number;
  remainingYield: number;
  regrowRate: number;
  depleted: boolean;
}
```

### 3. WorldTick.ts Integration

```typescript
class WorldTick {
  private chunkResourceCache = new Map<string, GeneratedResourceEntity[]>();
  
  private getChunkResources(chunkX, chunkZ): GeneratedResourceEntity[] {
    const key = `${chunkX}:${chunkZ}`;
    if (!this.chunkResourceCache.has(key)) {
      const biome = this.getChunkBiome(chunkX, chunkZ);
      const result = resourcePopulator.generateChunkResources(chunkX, chunkZ, biome);
      this.chunkResourceCache.set(key, result.entities);
    }
    return this.chunkResourceCache.get(key);
  }
  
  private broadcastSpatialSnapshot(socketId, playerTileX, playerTileZ, selfId) {
    // ... existing player/npc/loot code ...
    
    // Add resources from 3x3 chunks around player
    const playerChunkX = Math.floor(playerTileX / 64);
    const playerChunkZ = Math.floor(playerTileZ / 64);
    
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const resources = this.getChunkResources(playerChunkX + dx, playerChunkZ + dz);
        for (const res of resources) {
          resources: [{
            id: res.id,
            type: 'RESOURCE',
            resourceType: res.resourceType,
            x: res.kappaX / 1000,
            z: res.kappaZ / 1000,
            kappaX: res.kappaX,
            kappaZ: res.kappaZ,
            yield: res.remainingYield,
            maxYield: res.yield,
            depleted: res.depleted,
            regrowRate: res.regrowRate,
          }]
        }
      }
    }
    
    this.ws.sendToPlayer(socketId, {
      type: "world_snapshot",
      tick: this.tickCount,
      self: selfId,
      other_players: otherPlayers,
      npcs: npcs,
      loot: loot,
      resources: resources,  // NEW
    });
  }
}
```

### 4. Gathering Handler

```typescript
private processForestResourceActions() {
  for (const request of queue) {
    // Handle deterministic RESOURCE entities
    if (request.input?.resourceNodeId?.startsWith('res_')) {
      const entityId = request.input.resourceNodeId;
      const parts = entityId.split('_'); // ['res', type, chunkX, chunkZ, idx]
      const chunkX = parseInt(parts[2], 10);
      const chunkZ = parseInt(parts[3], 10);
      
      if (chunkModificationDirector.isResourceDepleted(entityId)) {
        this.ws.sendToPlayer(request.socketId, {
          type: "FOREST_RESOURCE_REJECTED",
          reason: "depleted",
          entityId
        });
        continue;
      }
      
      // Add item to player
      this.inventorySystem.addItem(player, { id: itemId, quantity: 1 });
      
      // Mark as permanently depleted
      chunkModificationDirector.markResourceDepleted(entityId, chunkX, chunkZ, this.tickCount);
      
      this.ws.sendToPlayer(request.socketId, {
        type: "FOREST_RESOURCE_ACCEPTED",
        entityId,
        depleted: true
      });
      continue;
    }
    // ... existing forest resource logic ...
  }
}
```

---

## Key Files

| File | Purpose |
|------|---------|
| `server/src/modules/world/ChunkModificationDirector.ts` | Depletion persistence |
| `server/src/modules/world/ResourcePopulator.ts` | Deterministic generation |
| `server/src/core/WorldTick.ts` | Snapshot integration |
| `server/src/core/are/AREHash.ts` | Deterministic hashing |
| `server/src/core/determinism/AREDeterminism.ts` | SeededARERng |

---

## Performance Notes

- Chunk resources are cached in `chunkResourceCache`
- Only 9 chunks (3x3 grid) queried per player per tick
- Generation >10ms triggers warning log
- Depletion checks are O(1) via Map lookup

---

## Testing Checklist

- [ ] Same chunk generates same resources (determinism)
- [ ] Depleted resources stay depleted after chunk reload
- [ ] Resources appear in world_snapshot
- [ ] Gathering marks resource as depleted
- [ ] Multiple gathers of same resource blocked

---

## Commit Style

```
feat(server): Deterministic RESOURCE entity generation with KAPPA-grid placement
```

---

*Created: 2026-05-31 | Session: Resource Entity Generation*
