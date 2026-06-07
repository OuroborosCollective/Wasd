# ARELOGIC: World Generation Outside Starter Village + Chunk Resource Spawn Foundation

**PR:** #1783  
**Status:** Implemented  
**Date:** 2026-06-07

---

## 1. Summary

This PR implements deterministic world generation and procedural resource spawning for chunks outside the starter village (chunk 0/0). Players moving outside the initial spawn area will now see varied terrain and be able to gather resources from procedurally generated nodes.

**Key Changes:**
- Deterministic per-chunk biome derivation using FNV-1a hashing
- Procedural resource node generation per chunk (trees, ore, fish spots)
- Server-authoritative resource gathering with tool requirements
- Enhanced debug HUD showing chunk, biome, and resource counts
- No Math.random() or Date.now() for gameplay state

---

## 2. Problem: Outside Starter Village Blank/Empty

**Before this PR:**
- ChunkManager used a global `biomeId: "forest_village"` for ALL chunks
- No terrain variation outside chunk 0/0
- ResourceNodeStore only contained 3 static starter nodes
- World appeared empty/dead outside the starter area

**After this PR:**
- Each chunk derives its biome deterministically from coordinates
- Terrain and props vary by biome (forest, plains, mountain)
- Procedural resource nodes spawn in visible chunks
- Players can gather resources outside the starter village

---

## 3. Deterministic Chunk Render Flow

### Client-Side (ChunkManager)

```
Player Position Change
        ↓
kappaToChunk(playerKappa) → { chunkX, chunkZ }
        ↓
generateNeededKeys(viewRadius=1) → 3x3 chunk grid
        ↓
For each needed chunk:
  ├─ deriveChunkBiome(chunkX, chunkZ, worldSeed) → BiomeId
  ├─ generateChunkScenePlan({ worldSeed, chunkX, chunkZ, biomeId, ... })
  └─ render with biome-adaptive assets/fallbacks
```

### Key Functions

**`deriveChunkBiome(chunkX, chunkZ, worldSeed)`** (`packages/shared/src/world/BiomeDirector.ts`)
- Uses FNV-1a hash for deterministic biome selection
- Distribution: 45% forest, 20% plains, 20% mountain, 15% forest_village
- Same input → same output (no Math.random())

**`generateChunkScenePlan()`** (`packages/shared/src/world/WorldDirector.ts`)
- Already deterministic using SeededARERng
- Now uses derived biome instead of global config

---

## 4. Chunk Resource Spawn Foundation

### Server-Side (ResourceNodeStore + GatheringService)

```
Player Position (from snapshot request or gather intent)
        ↓
registerVisibleChunks(playerPosition) → registers 3x3 grid
        ↓
For each non-starter chunk:
  ├─ getChunkBiome(chunkX, chunkZ) → ChunkBiomeId
  ├─ generateChunkResourceNodes({ worldSeed, chunkX, chunkZ, biomeId })
  └─ add to definitions + runtime maps
        ↓
listSnapshots(currentTick) → returns starter + procedural nodes
```

### Key Files

| File | Purpose |
|------|---------|
| `server/src/resources/ChunkResourceGenerator.ts` | Deterministic node generation per chunk |
| `server/src/resources/ResourceNodeStore.ts` | Node storage + `registerVisibleChunks()` |
| `server/src/resources/GatheringService.ts` | Gather logic with tool requirements |
| `packages/shared/src/world/BiomeDirector.ts` | `deriveChunkBiome()` function |

### Node ID Pattern

```
resource:{chunkX}:{chunkZ}:{kind}:{index}
Example: resource:1:0:tree:0
```

### Spawn Rules by Biome

| Biome | Trees | Ore | Fish Spots |
|-------|-------|-----|------------|
| forest | 3-6 | 1-2 | 1-3 |
| plains | 1-3 | 1-2 | 1-2 |
| mountain | 0-1 | 2-4 | 0-1 |
| forest_village | 2-4 | 1-2 | 1-2 |

### Tool Requirements

| Resource Kind | Required Tool | Exception |
|---------------|---------------|-----------|
| tree | none (bare-handed allowed for MVP) | - |
| ore | mining_tool | - |
| fish_spot | fishing_tool | - |

---

## 5. Resource Contract Reuse from #1782

This PR reuses the established resource contract from #1782:

- **Tool requirements** are enforced in `GatheringService.gather()`
- **Depletion logic** uses `depletedUntilTick` calculated from `respawnTicks`
- **Gather validation** (distance, skill level, tool) happens server-side
- **No client-side inventory mutation** - server remains authoritative

The `requiredTool` field in `ResourceNodeDefinition` is used:
- `undefined` for trees (bare-handed allowed)
- `"mining_tool"` for ore
- `"fishing_tool"` for fish spots

---

## 6. Client/Server Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CLIENT (/2d/)                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ ChunkManager.updateVisibility(playerKappa)                                  │
│   ↓                                                                        │
│   deriveChunkBiome(chunkX, chunkZ) → biomeId                              │
│   ↓                                                                        │
│   generateChunkScenePlan({ biomeId, ... }) → ChunkScenePlan               │
│   ↓                                                                        │
│   renderChunkScenePlan(plan) → PIXI.Container                              │
│                                                                             │
│ ResourceNodeMarkerLayer reads from liveGameplaySnapshot.resources          │
│                                                                             │
│ fetchGameplaySnapshot() sends player position via px/py query params       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓ HTTP
                                    ↓ px=17000&py=5000
┌─────────────────────────────────────────────────────────────────────────────┐
│ SERVER                                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ GET /api/gameplay/snapshot?px=17000&py=5000                                │
│   ↓                                                                        │
│   gatheringService.listResourceSnapshots(tick, { x: 17000, y: 5000 })       │
│   ↓                                                                        │
│   registerVisibleChunks({ x: 17000, y: 5000 })                              │
│   ↓                                                                        │
│   For chunk 1/0: generateChunkResourceNodes({ chunkX: 1, chunkZ: 0, ... }) │
│   ↓                                                                        │
│   return starter_nodes + procedural_nodes sorted by ID                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Debug/Verification

### MapStatusPanel Enhancements

The debug panel now shows:
- **Chunk**: Current chunk coordinates (e.g., "1, 0")
- **Active Chunks**: Number of loaded chunks from ChunkManager
- **Resources**: Count of visible resource nodes
- **Biome**: Derived biome for current chunk
- **WorldSeed**: (dev only) First 16 chars of world seed

### Audit Script

Run: `node scripts/audit-worldgen-outside-starter.mjs`

Checks:
1. ChunkManager uses `deriveChunkBiome`
2. `BiomeDirector.deriveChunkBiome` exists
3. `ChunkResourceGenerator` exists with proper ID pattern
4. `ResourceNodeStore.registerVisibleChunks` works
5. `GatheringService` passes player position
6. Snapshot route accepts px/py params
7. Client `fetchGameplaySnapshot` passes position
8. No conflicting root-level 2d/ directory
9. MapStatusPanel shows biome and resources

---

## 8. Known Limitations

1. **Biome rules MVP**: Simple coordinate-based distribution, not based on actual terrain features
2. **Resources are simple deterministic nodes**: No full ecology simulation (no regrow animation, no depletion visual feedback on map)
3. **No NPC harvesting**: NPCs don't harvest procedural nodes
4. **No economy pricing**: Resource items have no economic value yet
5. **Tool onboarding follows after worldgen**: Players must find/equip tools manually
6. **3x3 chunk visibility**: Only 9 chunks are registered at a time; moving large distances requires multiple snapshot fetches
7. **No chunk persistence**: Procedural nodes regenerate on server restart (intentional for MVP)

---

## 9. Next PRs

### Recommended Follow-ups (in priority order)

1. **#1784: Chunk Persistence for Procedural Nodes**
   - Persist registered chunks and node states to DB
   - Survive server restarts

2. **#1785: Enhanced Biome System**
   - Biomes based on terrain features, not just coordinates
   - Different resource distributions per biome

3. **#1786: Resource Visual Feedback**
   - Depleted nodes show visual state
   - Respawn progress indicator

4. **#1787: Tool Acquisition Flow**
   - Starter tools for new players
   - Tool shops in villages

5. **#1788: NPC Resource Interaction**
   - NPCs harvest procedural nodes
   - NPC schedules based on resources

---

## 10. Files Changed

### New Files

| File | Purpose |
|------|---------|
| `server/src/resources/ChunkResourceGenerator.ts` | Deterministic procedural node generation |
| `server/src/resources/ChunkResourceGenerator.test.ts` | Tests for node generation |
| `server/src/resources/ResourceNodeStore.procedural.test.ts` | Tests for procedural node integration |
| `packages/shared/src/world/__tests__/BiomeDirector.test.ts` | Tests for biome derivation |
| `scripts/audit-worldgen-outside-starter.mjs` | Static verification script |
| `docs/ARELOGIC_WORLDGEN_OUTSIDE_STARTER_VILLAGE.md` | This documentation |

### Modified Files

| File | Change |
|------|--------|
| `packages/shared/src/world/BiomeDirector.ts` | Added `deriveChunkBiome()` |
| `packages/shared/src/world/index.ts` | Export `deriveChunkBiome` (already exported via *) |
| `server/src/resources/ResourceNodeStore.ts` | Added procedural node support |
| `server/src/resources/GatheringService.ts` | Added `registerVisibleChunks()` |
| `server/src/routes/gameplaySnapshot.ts` | Accept px/py position params |
| `apps/client-2d/src/world/ChunkManager.ts` | Use `deriveChunkBiome` per chunk |
| `apps/client-2d/src/game/liveGameplayStore.ts` | Pass position to snapshot fetch |
| `apps/client-2d/src/ui/windows/MapStatusPanel.tsx` | Enhanced debug display |

---

## 11. Testing

### Run Tests

```bash
# Shared package tests
pnpm --filter @wasd/shared test

# Server tests
pnpm --filter @wasd/server test

# Client tests
pnpm --filter @wasd/client-2d test

# Type checks
pnpm --filter @wasd/shared typecheck
pnpm --filter @wasd/server typecheck
pnpm --filter @wasd/client-2d typecheck

# Audit script
node scripts/audit-worldgen-outside-starter.mjs
```

### Manual Verification Steps

1. Open /2d/ and load a character
2. Wait for heartbeat OK
3. Verify position debug visible
4. Move out of starter village (chunk 0/0)
5. Verify new chunks load (3x3 grid)
6. Verify terrain changes (stone in mountains, grass in plains, etc.)
7. Verify resource markers appear outside starter area
8. Try gathering:
   - Far away → "too_far"
   - Missing tool → "missing_tool"
   - With tool, in range → success/depleted
9. Reload page, verify same resources at same positions

---

## 12. Data Integrity

- **No Math.random()**: All randomness uses SeededARERng with FNV-1a hashing
- **No Date.now()**: Server tick is used for all time-based state
- **Deterministic IDs**: `resource:{chunkX}:{chunkZ}:{kind}:{index}` is stable
- **Sorted snapshots**: All lists sorted by ID for deterministic iteration
- **No client-side state mutation**: Server remains authoritative

---

*Document generated for PR #1783*  
*Part of the Areloria/WASD World Generation Foundation effort*