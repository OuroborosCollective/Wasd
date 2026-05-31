# WASD AI Skill: Server-Side Player Stats Sync

Purpose: Implement server-authoritative XP/level tracking and broadcast to client UI.

## Architecture: Read-Only Stats Axiom

**The client NEVER calculates XP or levels locally.** All stats come from the server via WebSocket.

```
SERVER (Authoritative)          CLIENT (Read-Only)
─────────────────────           ───────────────────
PlayerStatsDirector           CharacterOverlay
    ↓                              ↑
XP calculation                   Render only
    ↓                              ↑
Broadcast via WS              Receive snapshot
    ↓                              ↑
CombatDirector ─────────────── useSyncExternalStore
```

## Implementation

### 1. PlayerStatsDirector Singleton
```typescript
export class PlayerStatsDirector {
  private playerSkills = new Map<string, Record<string, { xp: number; level: number }>>();
  private broadcastFn: ((playerId, event, payload) => void) | null = null;
  
  setBroadcastFn(fn) {
    this.broadcastFn = fn;
  }
  
  applyXP(playerId: string, skillId: string, amount: number): { leveledUp: boolean; newLevel: number } {
    const skills = this.getOrCreateSkills(playerId);
    // ... RuneScape XP formula
  }
  
  getFullSnapshot(playerId: string, playerState: any): PlayerStatsSnapshot {
    // Return complete stats for UI
  }
  
  private broadcastSnapshot(playerId: string) {
    if (!this.broadcastFn) return;
    const snapshot = this.getFullSnapshot(playerId, playerState);
    this.broadcastFn(playerId, "player_stats_snapshot", snapshot);
  }
}
```

### 2. RuneScape XP Formula
```typescript
const MAX_LEVEL = 99;

function xpForLevel(level: number): number {
  // XP needed to go from level to level+1
  if (level <= 1) return 0;
  return Math.floor(50 * Math.pow(level, 1.4));
}

function totalXpForLevel(level: number): number {
  let total = 0;
  for (let l = 2; l <= level; l++) {
    total += xpForLevel(l - 1);
  }
  return total;
}

function levelFromXp(totalXp: number): number {
  let level = 1;
  let xpRemaining = totalXp;
  while (level < MAX_LEVEL && xpRemaining >= xpForLevel(level)) {
    xpRemaining -= xpForLevel(level);
    level++;
  }
  return level;
}
```

### 3. Types
```typescript
export interface SkillSnapshot {
  xp: number;
  level: number;
  nextLevelXP: number;
  progressPercent: number; // 0-100 for UI progress bar
}

export interface PlayerStatsSnapshot {
  playerId: string;
  skills: Record<string, SkillSnapshot>;
  totalLevel: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  stamina: number;
  maxStamina: number;
  gold: number;
  level: number;
}
```

### 4. Integration with CombatDirector

CombatDirector emits XP events that PlayerStatsDirector consumes:
```typescript
// CombatDirector
public drainXPevents(): XPGainEvent[] {
  const events = this.pendingXPevents;
  this.pendingXPevents = [];
  return events;
}

// In WorldTick
const xpEvents = combatDirector.drainXPevents();
playerStatsDirector.queueXPevents(xpEvents);
playerStatsDirector.processXPevents(xpEvents);
```

### 5. Client UI Pattern
```typescript
// State store with useSyncExternalStore
class CharacterStateStore {
  private state: PlayerStatsSnapshot | null = null;
  private listeners = new Set<() => void>();
  
  receiveSnapshot(snapshot: PlayerStatsSnapshot) {
    this.state = snapshot;
    this.notify();
  }
}

export function useCharacterStats(): PlayerStatsSnapshot | null {
  return useSyncExternalStore(
    this.subscribe,
    () => this.getSnapshot(),
    () => null
  );
}
```

## Skill Definitions
Default skills to track:
- `sword_mastery` - Sword weapons
- `blunt_force` - Axes and maces
- `archery` - Bow weapons
- `heavy_armor` - Plate armor defense
- `evasion` - Light/medium armor defense
- `shield_wall` - Shield blocking
- `combat` - Generic combat

## Key Files
- `server/src/modules/player/PlayerStatsDirector.ts` - Server-side stats director
- `apps/client-2d/src/ui/CharacterOverlay.tsx` - React UI component
- `apps/client-2d/src/ui/characterOverlay.css` - CSS styling

## Security Notes

- XP amounts are calculated SERVER-SIDE only
- Client cannot manipulate stats
- Snapshot is server-authoritative truth
- Deterministic XP calculation is verifiable by ARE invariant guard
