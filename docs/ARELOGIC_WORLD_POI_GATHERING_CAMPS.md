# ARELOGIC WORLD POI GATHERING CAMPS CONTRACT

## Summary

This contract establishes deterministic World POIs (Points of Interest) for gathering camps outside the starter village. These POIs create a more readable world by marking areas where specific resources are more common.

**PR:** #1789  
**Status:** Implemented  
**Date:** 2026-06-07

---

## 1. Why POIs After Worldgen/Resources

After #1783 (Worldgen Outside Starter Village) and #1782 (Resource Node Contract V2), resources spawn deterministically per chunk. However, the world still lacks named locations that guide players.

Gathering camps solve this by:
1. Creating named landmarks for orientation
2. Marking areas with enhanced resource density
3. Making the world feel more guided and less abstract
4. Setting foundation for camp-based gameplay loops

---

## 2. POI Types

### Gathering Camps

| Type | Emoji | Description | Resource Bias |
|------|-------|-------------|---------------|
| `logging_camp` | 🪓 | Forest logging area | tree +2 |
| `mining_camp` | ⛏️ | Mountain mining area | ore +2 |
| `fishing_camp` | 🎣 | Water fishing area | fish_spot +2 |

### Village Stations

| Type | Emoji | Description |
|------|-------|-------------|
| `campfire` | 🔥 | Cooking station |
| `furnace` | 🧱 | Smelting station |
| `workbench` | 🛠️ | Crafting station |
| `village_trader` | 🏪 | Resource vendor |

---

## 3. Deterministic Generation

### Rules

1. **No Math.random()**: Uses FNV-1a seeded RNG for determinism
2. **No Date.now()**: All generation uses world seed + coordinates
3. **Same input = same output**: Same worldSeed + chunkX + chunkZ => same POIs
4. **Stable IDs**: `poi:{chunkX}:{chunkZ}:{type}:0`
5. **Sorted by ID**: All POI arrays sorted for deterministic iteration

### POI Distribution (MVP)

| Biome | POI Chance | POI Type |
|-------|-----------|---------|
| forest | 35% | logging_camp |
| forest_village | 35% | logging_camp |
| mountain | 30% | mining_camp |
| plains | 25% | fishing_camp |
| starter chunk (0,0) | 100% | Fixed village POIs |

### Starter Village Fixed POIs

| ID | Type | Title | Position |
|----|------|-------|----------|
| `village_trader_001` | village_trader | Mira the Quartermaster | { x: 462, y: 503 } |
| `campfire_001` | campfire | Village Campfire | { x: 465, y: 506 } |
| `furnace_001` | furnace | Village Furnace | { x: 470, y: 506 } |
| `workbench_001` | workbench | Village Workbench | { x: 468, y: 500 } |

---

## 4. Resource Bias Rules

When a gathering camp POI is present in a chunk, resources of that type are enhanced:

| Camp Type | Resource Bias | Spawn Bonus |
|-----------|---------------|-------------|
| logging_camp | tree | +2 tree nodes |
| mining_camp | ore | +2 ore nodes |
| fishing_camp | fish_spot | +2 fish spots |

**Important**: Resource IDs remain stable. The bias only affects spawn count, not node identities.

---

## 5. Snapshot Flow

### Server Generation

1. Player position received via query params (px, py in kappa units)
2. Calculate tile position: `tileX = floor(px / 1000)`
3. Get visible 3x3 chunks: `getVisibleChunkCoords(tileX, tileZ)`
4. Generate POIs for each visible chunk
5. Include starter village POIs for chunk 0,0
6. Sort all POIs by ID for deterministic output

### Snapshot Structure

```typescript
interface WorldPoiSnapshot {
  id: string;           // poi:{chunkX}:{chunkZ}:{type}:0
  type: WorldPoiType;
  title: string;
  position: { x: number; y: number };
  chunk: { x: number; z: number };
  interactionRadius: number;
  tags: string[];
}

// In LiveGameplaySnapshot
interface LiveGameplaySnapshot {
  // ... existing fields
  worldPois: WorldPoiSnapshot[];
}
```

---

## 6. Client Render/Map UI

### POI Marker Layer

- Renders POI markers on top of the 2D world canvas
- Uses same isometric projection as resource markers
- Click/tap on POI shows toast with description

### POI Marker Visual

```
🪓 [Logging Camp]
   or
⛏️ [Mining Camp]
   or
🎣 [Fishing Camp]
```

### MapStatusPanel

- Shows POI count: "POIs: 4"
- Updates reactively with snapshot changes

---

## 7. Client UI Messages

| POI Type | Tap Message |
|----------|------------|
| logging_camp | "Logging Camp — Trees nearby" |
| mining_camp | "Mining Camp — Ore veins nearby" |
| fishing_camp | "Fishing Camp — Fish spots nearby" |
| campfire | "Campfire — Cooking station" |
| furnace | "Furnace — Smelting station" |
| workbench | "Workbench — Crafting station" |
| village_trader | "Village Trader — Resource vendor" |

---

## 8. Determinism Rules

1. **No Math.random()**: Uses SeededARERng with FNV-1a hashing
2. **No Date.now()**: All values derived from world seed + coordinates
3. **Stable POI IDs**: Always `poi:{chunkX}:{chunkZ}:{type}:0`
4. **Fixed positions**: POIs never move
5. **Fixed radius**: Always 32 units for interaction
6. **Sorted arrays**: All POI arrays sorted by ID for iteration

---

## 9. Known Limitations

1. **POIs are MVP markers**: Visual indicators only
2. **No NPC camp inhabitants**: Camps are empty locations
3. **No camp ownership**: Anyone can use any camp
4. **No camp danger levels**: No enemies near camps
5. **No dynamic depletion**: Resources respawn regardless of camp
6. **No POI discovery persistence**: POIs visible as soon as chunk loads
7. **Emoji/fallback rendering**: No custom sprites yet

---

## 10. Next PRs

1. **#1790 NPC Resource Economy Stock/Demand**
   - NPCs have limited buying capacity
   - Prices vary by NPC type

2. **#1791 Tool Crafting / Tool Upgrade Recipes**
   - Verify full tool crafting flow works
   - Tools function for gathering

3. **#1792 POI Discovery + Map Fog**
   - POIs discovered as player explores
   - Fog of war for unexplored chunks

4. **#1793 Camp NPCs / Gatherer NPC Loop**
   - NPCs inhabit camps
   - Quests from camp NPCs

---

## 11. Files Changed

### Server (new files)

| File | Purpose |
|------|---------|
| `server/src/world/WorldPoiTypes.ts` | POI type definitions and utilities |
| `server/src/world/WorldPoiGenerator.ts` | Deterministic POI generation |

### Server (modified files)

| File | Change |
|------|--------|
| `server/src/routes/gameplaySnapshotUtils.ts` | Added WorldPoiSnapshot type and worldPois to map |
| `server/src/routes/gameplaySnapshot.ts` | Generate and include POIs in snapshot |
| `server/src/gameplay/LiveGameplaySnapshotTypes.ts` | Added worldPois to snapshot |
| `server/src/gameplay/LiveGameplaySnapshotComposer.ts` | Include worldPois in composition |
| `server/src/gameplay/composeLiveGameplaySnapshotFromLegacy.ts` | Pass worldPois through |

### Client (new files)

| File | Purpose |
|------|---------|
| `apps/client-2d/src/ui/WorldPoiMarkerLayer.tsx` | POI marker rendering |

### Client (modified files)

| File | Change |
|------|--------|
| `apps/client-2d/src/game/liveGameplaySnapshot.ts` | Added WorldPoiSnapshot and normalizeWorldPois |
| `apps/client-2d/src/DeterministicWorldIsoApp.tsx` | Added WorldPoiMarkerLayer |
| `apps/client-2d/src/ui/windows/MapStatusPanel.tsx` | Added POI count display |

### Docs (new file)

| File | Purpose |
|------|---------|
| `docs/ARELOGIC_WORLD_POI_GATHERING_CAMPS.md` | This documentation |

---

## 12. Live Verification

1. Open /2d/ and load a character
2. Heartbeat OK
3. Map panel shows POI count
4. Starter village shows 4 POIs (trader, campfire, furnace, workbench)
5. Walk outside village to new chunks
6. POI markers appear for logging/mining/fishing camps
7. Tap on POI shows toast with name and description
8. Reload - same POIs at same positions

---

*Document generated for PR #1789*
*Part of the Areloria/WASD World POI effort*