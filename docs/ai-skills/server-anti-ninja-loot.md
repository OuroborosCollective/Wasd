# WASD AI Skill: Anti-Ninja Loot System

Purpose: Implement server-side loot ownership and kill-lock to prevent ninja-looting in multiplayer scenarios.

## Problem Statement

When a player kills a monster, dropped loot should belong to the killer for a period of time. Other players should not be able to pick up this loot until the lock expires.

## Solution: Causality Guard

### Core Concept
- **Loot Ownership**: Every loot entity has an `ownerId` (killer's player ID)
- **Time-Locked**: `lockedUntilTick` marks when the lock expires
- **Owner Check**: During lock period, only `ownerId` can pick up

### Implementation

#### 1. Extend LootEntity Interface
```typescript
export interface LootEntity {
  id: string;
  type: "LOOT";
  position: KappaCoord;
  itemSignature: ItemSignature;
  // ... other fields ...
  ownerId: string | null;      // Killer ID or null for public loot
  lockedUntilTick: number;     // Anti-Ninja Lock expiry
}
```

#### 2. Configure Lock Duration
```typescript
class LootDirector {
  // 60 seconds at 10 Hz = 600 ticks
  private readonly LOOT_LOCK_DURATION_TICKS = 600;
}
```

#### 3. Set Owner on Death Drop
```typescript
generateDeathDrops(monsterId, monsterLevel, position, killerId) {
  // killerId comes from CombatDirector or damage tracking
  const lootEntity: LootEntity = {
    ownerId: killerId,
    lockedUntilTick: this.worldTick + this.LOOT_LOCK_DURATION_TICKS,
    // ... other fields
  };
}
```

#### 4. Pickup Guard (Critical)
```typescript
attemptPickup(lootId, playerId, playerPosition, ...) {
  const loot = this.lootEntities.get(lootId);
  
  // ═══════════════════════════════════════════════════════════
  // ANTI-NINJA LOCK CHECK (Causality Guard)
  //
  // For the first 60 seconds (600 ticks at 10Hz), loot belongs to the killer.
  // If lockedUntilTick > currentTick, only the owner can pick up.
  // If ownerId is null, loot is public (e.g., gathering nodes).
  // ═══════════════════════════════════════════════════════════
  if (this.worldTick < loot.lockedUntilTick && loot.ownerId !== null) {
    if (playerId !== loot.ownerId) {
      return {
        success: false,
        code: "LOOT_LOCKED",
        message: `This loot is locked to ${loot.ownerId} for ${Math.ceil((loot.lockedUntilTick - this.worldTick) / 10)} more seconds.`
      };
    }
  }
  
  // ... proceed with other checks
}
```

### Integration with CombatDirector

The `killerId` comes from combat tracking. When monster dies:
1. `CombatDirector` tracks who dealt final blow
2. Pass `killerId` to `LootDirector.generateDeathDrops()`
3. If no combat (world gathering), pass `killerId = null` for public loot

### PickupResult Extension
```typescript
export interface PickupResult {
  success: boolean;
  code?: "LOOT_NOT_FOUND" | "LOOT_EXPIRED" | "LOOT_LOCKED" | "TOO_FAR" | "OVER_WEIGHT" | "INVENTORY_FULL";
  // ...
}
```

## Key Files
- `server/src/modules/world/LootDirector.ts` - Loot entity management

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Player kills monster | Loot locked to killer for 60s |
| Second player tries to pick up | REJECTED with LOOT_LOCKED |
| Killer picks up | SUCCEEDS immediately |
| After 60 seconds | LOOT_LOCKED check skipped |
| World gathering (no killer) | ownerId = null, loot is public immediately |

## Security Notes

- All loot ownership checks are SERVER-SIDE only
- Client cannot spoof pickup authorization
- Atomic pickup removes loot from world on success
- Lock duration is deterministic based on world tick
