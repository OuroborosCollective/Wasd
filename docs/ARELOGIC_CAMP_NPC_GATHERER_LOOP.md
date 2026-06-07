# ARELOGIC CAMP NPC GATHERER LOOP CONTRACT

## Summary

This contract establishes deterministic camp gatherer NPCs at gathering camp POIs. NPCs inhabit camps, perform gathering loops, and accumulate camp stock without affecting player inventory.

**PR:** #1794  
**Status:** Implemented  
**Date:** 2026-06-07

---

## 1. Why Camp NPCs After POI Discovery

After #1793 (POI Discovery + Map Fog), players discover POIs as they explore. Camp NPCs now appear at discovered gathering camps, making camps feel alive rather than empty markers.

Camp NPCs solve this by:
1. Making discovered camps feel inhabited
2. Showing deterministic activity changes over time
3. Building camp stock that can be used in future trading PRs
4. Setting foundation for NPC interaction dialogue

---

## 2. Camp NPC Generation

### NPC Types

| POI Type | NPC Type | Name | Role | Output Item |
|---------|----------|------|------|-------------|
| `logging_camp` | `camp_woodcutter` | "Arel Woodcutter" | Lumberjack | `wood_log` |
| `mining_camp` | `camp_miner` | "Arel Miner" | Miner | `copper_ore` |
| `fishing_camp` | `camp_fisher` | "Arel Fisher" | Fisher | `raw_fish` |

### NPC ID Pattern

```
npc:{poiId}:worker:0
Example: npc:poi:1:2:logging_camp:0:worker:0
```

### NPC Position

Deterministic offset from POI position based on NPC type:
- Woodcutter: +2 kappa x, -1 kappa y
- Miner: -1 kappa x, +2 kappa y
- Fisher: +1 kappa x, +1 kappa y

### Rules

1. **No Math.random()**: Position derived from POI coordinates
2. **No Date.now()**: All values use currentTick
3. **Same input = same output**: Same POI ID + tick => same NPC
4. **Only for gathering camps**: `logging_camp`, `mining_camp`, `fishing_camp`
5. **Village stations excluded**: `campfire`, `furnace`, `workbench`, `village_trader`

---

## 3. Deterministic Activity Loop

### Phase Cycle (40 ticks = 4 seconds at 10Hz)

| Ticks | Phase | State | Message (Woodcutter) |
|-------|-------|-------|----------------------|
| 0-19 | `gathering` | `working` | "Chopping nearby trees" |
| 20-29 | `returning` | `working` | "Carrying wood" |
| 30-39 | `depositing` | `idle` | "Stacking logs" |

### Activity Messages by NPC Type

**Woodcutter:**
- gathering: "Chopping nearby trees"
- returning: "Carrying wood"
- depositing: "Stacking logs"

**Miner:**
- gathering: "Mining ore vein"
- returning: "Hauling ore"
- depositing: "Sorting ore"

**Fisher:**
- gathering: "Casting line"
- returning: "Carrying fish"
- depositing: "Packing fish"

### Rules

1. **No Math.random()**: Phase derived from `currentTick % 40`
2. **No Date.now()**: Uses server tick
3. **Same tick = same activity**: Deterministic phase calculation

---

## 4. Camp Stock MVP

### Stock Accumulation

Camp stock increases deterministically during the deposit phase:

- Only accumulates during deposit phase (ticks 30-39)
- Adds 1 item per completed cycle
- Caps at 20 items per resource type
- Persists in memory (no persistence adapter in MVP)

### Stock Schema

```typescript
interface CampStockSnapshot {
  poiId: string;
  items: readonly {
    itemId: string;
    quantity: number;
  }[];
  lastUpdatedTick: number;
}
```

### Output Items by Camp Type

| Camp Type | Output Item |
|-----------|-------------|
| logging_camp | `wood_log` |
| mining_camp | `copper_ore` |
| fishing_camp | `raw_fish` |

### Rules

1. **No Math.random()**: Stock uses tick-based cycle counting
2. **No Date.now()**: Uses currentTick for phase detection
3. **NPC output does NOT affect player inventory**: Camp stock is separate
4. **Cap prevents infinite growth**: Max 20 per item type

---

## 5. Snapshot Contract

### Server-Side Types

```typescript
interface LiveGameplayCampNpc {
  id: string;
  type: "camp_woodcutter" | "camp_miner" | "camp_fisher";
  name: string;
  role: string;
  poiId: string;
  position: { x: number; y: number };
  state: "idle" | "working" | "resting";
  activity: "gathering" | "returning" | "depositing";
  activityMessage: string;
}

interface LiveGameplayCampStock {
  poiId: string;
  items: readonly { itemId: string; quantity: number }[];
  lastUpdatedTick: number;
}

interface LiveGameplaySnapshot {
  // ... existing fields
  campNpcs: readonly LiveGameplayCampNpc[];
  campStocks: readonly LiveGameplayCampStock[];
}
```

### Filtering Rules

- Only discovered gathering camp POIs generate NPCs
- Undiscovered POIs do NOT leak NPC details
- Per-player discovery respected (Player A sees camp, Player B does not until discovery)

---

## 6. Client Display

### CampNpcMarkerLayer

- Renders camp NPC markers on 2D world canvas
- Shows emoji based on NPC type (🪓 ⛏️ 🎣)
- Color-coded by camp type
- Activity label shows current state
- Click shows toast with NPC name and activity message

### MapStatusPanel

- Shows "Camp NPCs: N" count
- Updates reactively with snapshot changes

### Data Attributes

```html
<button data-testid="camp-npc-marker" data-npc-type="camp_miner" data-activity="gathering">
```

---

## 7. NPC Interaction API

### GET /api/npc/camp/:npcId

Get NPC information and dialogue.

### POST /api/npc/camp/:npcId/interact

Player interacts with camp NPC. Requires POI discovery.

### GET /api/npc/camp/:npcId/stock

Get camp stock summary.

### Dialogue Lines

**Woodcutter:**
- greeting: "Trees are thick here. Better axes bring better yield."
- gathering: "I'm working now."
- depositing: "We have some stock at camp."

**Miner:**
- greeting: "Ore runs deep in this camp. Bring a stronger pickaxe."
- gathering: "I'm working now."
- depositing: "We have some stock at camp."

**Fisher:**
- greeting: "Fish bite better near calm water."
- gathering: "I'm working now."
- depositing: "We have some stock at camp."

---

## 8. Player Inventory Safety

**CRITICAL**: NPC output goes to camp stock, NOT player inventory.

### What Happens

1. Player discovers a logging camp
2. NPC appears at the camp
3. NPC performs gathering loop
4. NPC deposits resources to camp stock
5. Camp stock accumulates resources

### What Does NOT Happen

1. ❌ Player does NOT receive free resources
2. ❌ Player inventory does NOT increase from NPC activity
3. ❌ Player cannot claim NPC stock (future PR)

### Future Trading (PR #1795)

Future PRs will add:
- Trade with camp NPC
- Buy resources from camp stock
- Hire additional workers

---

## 9. Known Limitations

1. **No persistence**: Camp stock resets on server restart
2. **No NPC-to-NPC trading**: Camps don't trade with each other
3. **No player claim**: Players can't take camp stock yet
4. **No skill/level**: NPCs don't have skills
5. **No NPC memory**: NPCs don't remember players
6. **No combat**: NPCs don't defend camps
7. **No pathfinding**: Position is fixed (deterministic offset from POI)
8. **No NPC-to-player item transfer**: Stock stays at camp

---

## 10. Next PRs

1. **#1795 Camp Stock Trading / Buy From Camp NPC**
   - Players can buy from camp stock
   - Camp stock decreases when sold

2. **#1796 Tool Durability / Repair**
   - Tools wear out
   - Camps can repair tools

3. **#1797 Skill Level Requirements**
   - Higher tier resources require skill levels
   - NPCs have skill levels

4. **#1798 NPC Memory for Camp Workers**
   - NPCs remember players who trade
   - Loyalty discounts

---

## 11. Files Changed

### Server (new files)

| File | Purpose |
|------|---------|
| `server/src/npc/CampNpcTypes.ts` | NPC type definitions and utilities |
| `server/src/npc/CampNpcService.ts` | NPC generation and state management |
| `server/src/npc/CampNpcRoutes.ts` | NPC interaction API routes |
| `server/src/tests/camp-npc-service.test.ts` | Unit tests |

### Server (modified files)

| File | Change |
|------|--------|
| `server/src/gameplay/LiveGameplaySnapshotTypes.ts` | Added campNpc/campStock types |
| `server/src/gameplay/composeLiveGameplaySnapshotFromLegacy.ts` | Include camp NPCs in snapshot |
| `server/src/core/ServerBootstrap.ts` | Register camp NPC routes |

### Client (new files)

| File | Purpose |
|------|---------|
| `apps/client-2d/src/ui/CampNpcMarkerLayer.tsx` | NPC marker rendering |

### Client (modified files)

| File | Change |
|------|--------|
| `apps/client-2d/src/game/liveGameplaySnapshot.ts` | Added campNPC types and normalizers |
| `apps/client-2d/src/DeterministicWorldIsoApp.tsx` | Added CampNpcMarkerLayer |
| `apps/client-2d/src/ui/windows/MapStatusPanel.tsx` | Added Camp NPCs count |

### Docs (new file)

| File | Purpose |
|------|---------|
| `docs/ARELOGIC_CAMP_NPC_GATHERER_LOOP.md` | This documentation |

---

## 12. Live Verification

1. Open /2d/ and load a character
2. Heartbeat OK
3. Map panel shows "Camp NPCs: 0"
4. Walk outside starter village
5. Discover a logging/mining/fishing camp
6. NPC marker appears near the camp
7. Map panel shows "Camp NPCs: 1"
8. Wait and observe - activity changes (gathering → returning → depositing)
9. Tap NPC - shows dialogue toast
10. Reload - discovery persists, NPC still visible

---

## 13. Test Commands

```bash
# Run server tests
pnpm --filter @wasd/server test -- camp-npc-service

# Type check
pnpm --filter @wasd/server typecheck
pnpm --filter @wasd/client-2d typecheck

# Lint
npx eslint server/src client/src
```

---

*Document generated for PR #1794*
*Part of the Areloria/WASD Camp NPC Gatherer Loop effort*