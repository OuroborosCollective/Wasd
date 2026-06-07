# ARELOGIC POI DISCOVERY MAP FOG

## 1. Summary

POI Discovery + Map Fog MVP enables server-authoritative exploration progression. Players discover Points of Interest (POIs) by approaching them, creating a fog-of-war-like experience where unknown locations remain hidden until explored.

**Scope (MVP):**
- Discovery based on proximity (96 kappa units radius)
- Persistent discovery state per player
- Snapshot includes discovery status for POIs
- Map panel shows discovery counts
- Toast notifications for new discoveries

**Out of Scope:**
- Tile-level fog of war
- Shared party discovery
- Cartography skill
- Player map pins/notes
- Account-wide atlas sync

## 2. Why Discovery After POIs

POIs (camps, stations, traders) were implemented in previous PRs but always visible. Discovery adds progression:

1. **Motivation** - Players explore to find POIs
2. **Reward** - Discovery provides feedback and reveals information
3. **Progression** - Map fills in as player explores
4. **Persistence** - Discovered locations remain known across sessions

## 3. Discovery State

**State Shape:**
```typescript
interface WorldDiscoveryState {
  playerId: string;
  schemaVersion: 1;
  discoveredPoiIds: readonly string[];  // Sorted, no duplicates
  discoveredChunks: readonly string[]; // Format: "chunkX:chunkZ"
}
```

**Starter Village POIs (auto-discovered):**
- `village_trader_001` - Mira the Quartermaster
- `campfire_001` - Village Campfire
- `furnace_001` - Village Furnace
- `workbench_001` - Village Workbench

**Files:**
- `server/src/world/WorldDiscoveryTypes.ts` - Type definitions
- `server/src/world/WorldDiscoveryStore.ts` - In-memory store
- `server/src/world/WorldDiscoveryService.ts` - Discovery logic
- `server/src/world/JsonWorldDiscoveryPersistenceAdapter.ts` - JSON persistence

**Persistence:**
- Path: `data/world-discovery-state.json`
- Atomic writes for data integrity
- Auto-seeded with starter POIs for new players

## 4. Discovery Radius

**Default:** 96 kappa units (~3 tiles)

**Rules:**
1. When player has finite position:
   - Calculate visible 3x3 chunk range
   - Filter POIs within discovery radius
   - Mark those POIs as discovered

2. When no player position:
   - No new discovery processing
   - Return only already-discovered POIs

**Distance Calculation:**
```typescript
function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
```

**Discovery Processing:**
```typescript
const nearbyPois = visiblePois.filter(poi => distance(playerPosition, poi.position) <= discoveryRadius);
```

## 5. Snapshot Contract

**Extended WorldPoiSnapshot:**
```typescript
interface LiveGameplayWorldPoi {
  poiId: string;
  type: string;
  title: string;
  x: number;
  y: number;
  chunkX: number;
  chunkZ: number;
  discovered: boolean;  // NEW: Whether player has discovered this POI
}
```

**DiscoveryStats:**
```typescript
interface DiscoveryStats {
  discoveredPoiCount: number;
  discoveredChunkCount: number;
  visiblePoiCount: number;
}
```

**RecentDiscovery (for client feedback):**
```typescript
interface RecentDiscovery {
  poiId: string;
  title: string;
  type: string;
}
```

**LiveGameplaySnapshot additions:**
```typescript
interface LiveGameplaySnapshot {
  // ... existing fields
  discoveryStats: DiscoveryStats;
  recentDiscoveries: readonly RecentDiscovery[];
}
```

## 6. Client Map UI

**MapStatusPanel updates:**
- Shows "Discovered: X" count
- Shows "Chunks Explored: Y" count
- Test IDs: `data-testid="map-discovered-poi-count"`, `data-testid="map-discovered-chunk-count"`

**WorldPoiMarkerLayer updates:**
- Renders POI markers with `discovered` prop
- Undiscovered POIs show "?" marker with gray styling
- Click on undiscovered shows "Unknown location — Explore to discover"
- Test ID: `data-testid="world-poi-marker"`

**Discovery Toast Notifications:**
- Uses `wasd:toast` custom event
- Shows "Discovered: {POI Title}" when new POI found
- Uses `previousDiscoveriesRef` to prevent duplicate toasts

## 7. Determinism Rules

- **No Math.random()** - Uses seeded RNG for POI generation
- **No Date.now()** - Uses server tick for state
- **Deterministic IDs** - POI IDs: `poi:{chunkX}:{chunkZ}:{type}:0`
- **Sorted arrays** - All arrays sorted by ID for iteration
- **Immutable state** - State objects frozen with Object.freeze()

## 8. Known Limitations

1. **No tile-level fog** - Only POI-level discovery, not area fog
2. **No shared party discovery** - Each player discovers independently
3. **No cartography skill** - Could reduce discovery radius
4. **No POI notes** - Can't add custom notes to locations
5. **No map pins** - Can't place custom markers
6. **No account-wide atlas** - Discovery per character, not account
7. **No discovery undo** - Discovered POIs stay discovered

## 9. Next PRs

- **#1793** Camp NPC Gatherer Loop - NPCs at camps
- **#1794** Tool Durability / Repair - Equipment wear
- **#1795** Skill Level Requirements - Level-gated content
- **#1796** Player Map Pins / Notes - Custom markers

## 10. Files Changed

**New Server Files:**
- `server/src/world/WorldDiscoveryTypes.ts`
- `server/src/world/WorldDiscoveryStore.ts`
- `server/src/world/WorldDiscoveryService.ts`
- `server/src/world/JsonWorldDiscoveryPersistenceAdapter.ts`
- `server/src/tests/world-discovery.test.ts`

**Modified Server Files:**
- `server/src/gameplay/LiveGameplaySnapshotTypes.ts`
- `server/src/gameplay/LiveGameplaySnapshotComposer.ts`
- `server/src/gameplay/composeLiveGameplaySnapshotFromLegacy.ts`
- `server/src/routes/gameplaySnapshot.ts`

**Modified Client Files:**
- `apps/client-2d/src/game/liveGameplaySnapshot.ts`
- `apps/client-2d/src/ui/WorldPoiMarkerLayer.tsx`
- `apps/client-2d/src/ui/windows/MapStatusPanel.tsx`

**New Docs:**
- `docs/ARELOGIC_POI_DISCOVERY_MAP_FOG.md`

## 11. Testing

**Run tests:**
```bash
pnpm --filter @wasd/server test -- world-discovery
```

**Test coverage:**
- Discovery state default empty
- Discovery within radius
- No discovery outside radius
- Idempotent discovery
- Per-player isolation
- Starter POIs visible by default
- Chunk discovery when POI discovered

## 12. Live Verification Steps

1. Start server with `pnpm --filter @wasd/server dev`
2. Load character at starter village
3. Open map - should see starter POIs (4 total)
4. Walk toward a camp outside village
5. Before approaching: POI not visible on map
6. After approaching (within 96 units): Toast "Discovered: X"
7. Reload page - POI still visible
8. New character - POI not automatically discovered (except starters)