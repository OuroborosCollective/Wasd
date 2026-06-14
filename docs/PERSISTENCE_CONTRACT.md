# PERSISTENCE_CONTRACT.md

## Overview

This document defines the persistence contract for Areloria's ARE architecture. It establishes boundaries between simulation truth, persistence metadata, and runtime gameplay authority.

## Core Principles

1. **Tick Authority**: Simulation state is derived from WorldTick, NOT wall-clock time
2. **Persistence is Side-Channel**: Persistence metadata (timestamps) is for identity/analytics only
3. **Runtime Truth is Deterministic**: Gameplay calculations MUST use `tick`, `simulationTimeMs`, or `logicalSequence`

## Classification Matrix

| Category | Allowed | Notes |
|----------|---------|-------|
| Tick-derived simulation state | ✅ Yes | Uses tick/simulationTimeMs |
| Persistence metadata | ✅ Yes | `createdAtMs`, `updatedAtMs` for DB records |
| Analytics | ✅ Yes | Metrics, tracking |
| Runtime gameplay authority | ❌ No | Cannot use real-time for gameplay logic |

## Allowed Time Sources

### ✅ Tick-Derived (Gameplay Authority)

```typescript
// Valid gameplay time sources
const tick = tickContextProvider.getContext();
const gameTime = tick.tickIndex;
const simulationMs = tick.tickTimestamp;
const worldHours = tick.worldTimeHours;
```

### ✅ Persistence Metadata (Side-Channel)

```typescript
// Valid persistence timestamps (NOT for gameplay authority)
// @are-telemetry-side-channel Non-deterministic timestamps for identity/persistence only
const createdAtMs = Date.now();  // OK for persistence
const updatedAtMs = Date.now();  // OK for persistence
```

### ❌ Forbidden (Runtime Gameplay)

```typescript
// FORBIDDEN in simulation paths
const wallClock = Date.now();        // ❌
const realTime = new Date();         // ❌
const perfNow = performance.now();   // ❌
```

## Persistence Schema Rules

### Entity Persistence Types

| Entity | createdAtMs | updatedAtMs | Tick-Derived Fields |
|--------|-------------|-------------|---------------------|
| PersistedPlayer | ✅ | ✅ | tickIndex (implicit) |
| PersistedCharacter | ✅ | ✅ | tickIndex (implicit) |
| PersistedInventorySlot | ❌ | ❌ | N/A |
| PersistedEquipmentSlot | ❌ | ❌ | N/A |
| PersistedQuestProgress | ❌ | ✅ | N/A |
| PersistedWorldEntity | ❌ | ✅ | N/A |
| PersistedSession | ❌ | lastSeenAtMs | N/A |

### Tick Authority Rules

1. **Simulation state** (position, HP, inventory) is derived from WorldTick
2. **Persistence timestamps** are metadata for database integrity
3. **Replay guarantees**: Given same seed + tick sequence, simulation MUST produce same result

## Migration Guide

If a gameplay calculation depends on wall-clock time:

```typescript
// ❌ BEFORE: Wall-clock dependency
function getCooldownRemaining(lastUsedMs: number) {
  return Math.max(0, lastUsedMs + COOLDOWN_MS - Date.now());
}

// ✅ AFTER: Tick-based
function getCooldownRemaining(lastUsedTick: number, currentTick: number) {
  const ticksElapsed = currentTick - lastUsedTick;
  return Math.max(0, ticksElapsed * TICK_DURATION_MS - COOLDOWN_MS);
}
```

## Audit Criteria

The following patterns indicate violations:

```typescript
// ❌ createdAt in simulation paths
const timeSinceSpawn = tick.timestamp - entity.createdAt;  // VIOLATION

// ❌ Date.now() for gameplay timing
if (Date.now() > skill.lastUsed + COOLDOWN)  // VIOLATION

// ❌ performance.now() for state
const elapsed = performance.now() - start;  // VIOLATION

// ❌ Math.random() for deterministic logic
const crit = Math.random() < 0.1;  // VIOLATION (unless seeded)
```

## Implementation Files

| File | Role |
|------|------|
| `server/src/gameplay/persistence/types.ts` | Type definitions |
| `server/src/gameplay/persistence/gameplayPersistence.ts` | Facade implementation |
| `server/src/gameplay/persistence/playerRepository.ts` | Player persistence |
| `server/src/gameplay/persistence/inventoryRepository.ts` | Inventory persistence |
| `server/src/gameplay/persistence/sessionRepository.ts` | Session persistence |

## References

- ARE_RUNTIME_CONTRACT.md - Master runtime contract
- ARE_DETERMINISM_CLASSIFICATION.md - Determinism rules
- WEBSOCKET_TRUTH_PATH.md - Network truth path
