# ARE Module Standard

**Phase 2 of the Core Reality Alignment initiative.**

This document defines the standard for all game logic modules in `server/src/modules/` to ensure deterministic, replayable, and snapshot-compatible behavior.

## Background

The ARE (Areloria Runtime Engine) provides:
- Deterministic simulation via TickSystems
- State hashing for divergence detection
- Snapshot composition for persistence
- Replay via shadow execution

All domain modules must integrate with this system.

## Module Categories

| Category | Description | Action |
|----------|-------------|--------|
| **A: ARE-Aligned** | Follows TickSystem pattern, uses deterministic types | Keep as-is |
| **B: Deterministic-Ready** | Has game logic, needs ARE wrapping | Add ARE integration |
| **C: Math/Date Utilities** | Pure functions, generally deterministic | Verify and document |
| **D: Non-Deterministic** | Uses Math.random/Date.now | Refactor to use DeterministicPrng |
| **E: Stub/Fake** | No real logic | Delete |

## ARE Module Pattern

Each domain module should follow this structure:

```
modules/<domain>/
├── <Domain>Types.ts       # State/Delta interfaces (branded types)
├── <Domain>Ports.ts       # Read-only state access interfaces
├── <Domain>TickSystem.ts  # Implements TickSystem, registered with priority
├── <Domain>Delta.ts       # Immutable change records
├── <Domain>Snapshot.ts    # Replay/snapshot sink
└── <Domain>System.ts      # Main system class (optional)
```

### Example: Combat Module Structure

```
modules/combat/
├── CombatTypes.ts         # CombatState, DamageDelta, CombatResult
├── CombatPorts.ts         # Read-only entity stats access
├── CombatTickSystem.ts    # Implements TickSystem, GAMEPLAY priority
├── CombatDelta.ts         # DamageDelta, HealDelta, etc.
├── CombatSnapshot.ts       # Snapshot sink for replay
├── CombatDirector.ts      # Main orchestrator
├── CombatService.ts       # Public API
└── CombatSystem.ts        # Core combat logic
```

## Core Requirements

### 1. No Direct Time Access

❌ **FORBIDDEN:**
```typescript
Date.now()
new Date()
performance.now()
```

✅ **REQUIRED:**
```typescript
import { deterministicNow } from '../../core/determinism/AREDeterminism.js';

// Use tick-based time
const time = deterministicNow(`${npcId}:${tickCount}`);
```

### 2. No Direct Randomness

❌ **FORBIDDEN:**
```typescript
Math.random()
```

✅ **REQUIRED:**
```typescript
import { SeededARERng, createARESeed } from '../../core/determinism/AREDeterminism.js';

// Create deterministic RNG with stable seed
const rng = new SeededARERng(createARESeed([
  'combat',
  'attack',
  attackerId,
  defenderId,
  sequence,
]));
const roll = rng.nextFloat();
```

### 3. No Direct WorldTick Import

❌ **FORBIDDEN:**
```typescript
import { WorldTick } from '../WorldTick.js';
```

✅ **REQUIRED:**
```typescript
import { type TickSystemContext } from '../../core/are/TickSystem.js';

// Access tick via context
tick(context: TickSystemContext): void {
  const tickCount = context.tickCount;
  // ...
}
```

### 4. No I/O in Tick Loop

TickSystem.tick() must not perform:
- Database operations
- HTTP/API calls
- File system access
- setTimeout/setInterval

Use write-behind queues for persistence:
```typescript
import { layerPersistenceQueue } from '../../core/are/LayerPersistenceQueue.js';

layerPersistenceQueue.enqueue({
  type: 'memory-update',
  npcId,
  data: memoryDelta,
});
```

## Branded Types

All core values use branded types for type-level determinism:

```typescript
import { createKappa, createTickId, createStateHash } from '../../core/are/types.js';

// Kappa: Fixed-point integers (1 unit = 1000 Kappa)
const position = createKappa(15000);  // 15.0 world units

// TickId: Simulation tick counter
const tick = createTickId(12345);

// StateHash: SHA-256 fingerprint
const hash = createStateHash('a1b2c3...');  // 64 hex chars
```

## Delta Pattern

All state changes must produce Delta records:

```typescript
interface CombatDamageDelta {
  type: 'combat-damage';
  tick: TickId;
  attackerId: EntityId;
  defenderId: EntityId;
  damage: KappaInt;
  crit: boolean;
  resultingHealth: KappaInt;
}
```

## Snapshot Integration

Modules must feed into SnapshotComposer:

```typescript
import { snapshotComposer } from '../../core/are/SnapshotComposer.js';

snapshotComposer.registerEntity(entityId, {
  position_x: entity.positionX,
  position_z: entity.positionZ,
  health: entity.health,
  level: entity.level,
});
```

## TickSystem Implementation

```typescript
import { 
  TickSystem, 
  TickSystemPriority, 
  type TickSystemContext 
} from '../../core/are/TickSystem.js';
import { tickSystemRegistry } from '../../core/are/TickSystemRegistry.js';

export class CombatTickSystem implements TickSystem {
  readonly name = 'combat';
  readonly priority = TickSystemPriority.GAMEPLAY;  // 20
  enabled = true;

  tick(context: TickSystemContext): void {
    // Deterministic combat processing
  }

  onStart?(): void {
    console.log('[CombatTickSystem] Started');
  }
}

// Registration
export function registerCombatSystem(
  combatSystem: CombatSystem, 
  combatService: CombatService
): CombatTickSystem {
  const system = new CombatTickSystem(combatSystem, combatService);
  
  tickSystemRegistry.register({
    system,
    dependencies: ['player-system', 'npc-system'],
    tags: ['combat', 'damage', 'gameplay'],
  });
  
  return system;
}
```

## Priority System

Tick systems execute in priority order:

| Priority | Value | Systems |
|----------|-------|---------|
| INFRASTRUCTURE | 0 | Spatial grid, manifest |
| FOUNDATION | 10 | Player, NPC |
| GAMEPLAY | 20 | Combat, Economy, Quest |
| BROADCAST | 30 | Network broadcasting |
| PERSISTENCE | 40 | Write-behind persistence |

## Verification Commands

```bash
# Check for non-deterministic patterns
grep -rn "Math\.random" server/src/modules/
grep -rn "Date\.now\|new Date" server/src/modules/
grep -rn "performance\.now" server/src/modules/

# Verify TickSystem registration
grep -rn "tickSystemRegistry.register\|register.*System" server/src/modules/

# Run determinism tests
npx vitest run --reporter=verbose
```

## Module Analysis Scanner

Use the analysis script to categorize modules:

```bash
node scripts/analyze-modules.mjs              # Full scan
node scripts/analyze-modules.mjs --verbose    # Detailed output
node scripts/analyze-modules.mjs --category=D # Only non-deterministic
node scripts/analyze-modules.mjs --module=combat # Only combat module
```

## Migration Checklist

For each module:
- [ ] Remove Math.random → use SeededARERng
- [ ] Remove Date.now → use deterministicNow with tick
- [ ] Remove WorldTick import → use TickSystemContext
- [ ] Remove I/O from tick() → use persistence queue
- [ ] Add branded types (Kappa, TickId, StateHash)
- [ ] Add Delta records for state changes
- [ ] Register with TickSystemRegistry
- [ ] Verify determinism with tests

## Related Documentation

- `docs/ai-skills/wasd-are-system.md` - ARE system overview
- `server/src/core/are/` - ARE core implementations
- `server/src/core/are/types.ts` - Branded type definitions