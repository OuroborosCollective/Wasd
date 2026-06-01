# ARE Deterministic Replacement Channels

This document defines the official deterministic alternatives to forbidden nondeterministic APIs in ARE core logic.

## Forbidden APIs (Cannot Use in Core Logic)

```typescript
// ❌ FORBIDDEN in server/src/core/** and server/src/modules/**
Math.random()                    // Non-deterministic randomness
Date.now()                      // Wall-clock time, varies
performance.now()               // High-res timer, varies
crypto.randomUUID()             // Non-deterministic ID generation
new Date()                      // Wall-clock time object
```

## Official Deterministic Alternatives

### 1. Deterministic RNG (`SeededARERng`)

```typescript
import { SeededARERng } from '@wasd/shared';

// Create seeded RNG from ARE payload
const rng = new SeededARERng(seed, tick);

// Generate deterministic random values
const roll = rng.next();                    // 0-1 float
const int = rng.nextInt(max);               // 0 to max-1
const bool = rng.nextBool();                // true/false
const choice = rng.pickFrom(array);        // deterministic choice
```

**Usage in core logic:**
```typescript
// Instead of: Math.random()
const rng = new SeededARERng(deterministicSeed, tick);
const chance = rng.next();

// Instead of: Math.random() < 0.5
const critical = rng.nextBool();
```

### 2. ARE Clock (`tick * 1000`)

```typescript
// Instead of: Date.now()
// Use: tick-based timestamps

const tickTimestamp = tick * 1000;                    // Milliseconds
const tickSeconds = Math.floor(tick / 10);           // Seconds (10 ticks/sec)
const tickMinutes = Math.floor(tick / 600);          // Minutes

// For display/formatted time:
const displayTime = formatTickTime(tick);            // Deterministic formatting
```

**Usage:**
```typescript
// Instead of: new Date().toISOString()
const isoTime = new Date(tick * 1000).toISOString();

// Instead of: Date.now() - startTime
const elapsed = tick - startTick;  // Deterministic tick delta
```

### 3. Deterministic ID Factory

```typescript
// Instead of: crypto.randomUUID()
// Use: seed-based deterministic IDs

function deterministicId(seed: string, namespace: string, index: number): string {
    const input = `${seed}|${namespace}|${index}`;
    return sha256(input).slice(0, 36);  // UUID format
}

// Or use built-in deterministic ID generation
import { createDeterministicId } from '@wasd/shared';

const id = createDeterministicId(seed, 'player', playerIndex);
```

**Usage:**
```typescript
// Instead of: crypto.randomUUID()
const entityId = deterministicId(deterministicSeed, 'npc', npcIndex);
```

### 4. ARE Seed Generation

```typescript
import { createARESeed } from '@wasd/shared';

// Standard ARE seed format
const seed = createARESeed({
    worldId: 'areloria-main',
    tick: currentTick,
    chunk: currentChunk,
    salt: 'entity-spawn'
});

// Extracting entropy from seed
const rng = new SeededARERng(seed, tick);
```

## Architecture Decision Record

| Forbidden API | Replacement | Use Case |
|---------------|-------------|----------|
| `Math.random()` | `SeededARERng` | Loot drops, combat rolls, spawn chances |
| `Date.now()` | `tick * 1000` | Timestamps, cooldowns, age tracking |
| `performance.now()` | `tick * 1000 + tickFraction` | High-res timing (rare, use tick) |
| `crypto.randomUUID()` | `deterministicId()` | Entity IDs, correlation IDs |
| `new Date()` | `new Date(tick * 1000)` | Display formatting, logs |

## Implementation Checklist

When adding new core logic:

1. **Check imports** - Ensure no forbidden APIs are imported
2. **Replace RNG** - Replace `Math.random()` with `SeededARERng`
3. **Replace timestamps** - Replace `Date.now()` with tick-based timing
4. **Replace IDs** - Replace `crypto.randomUUID()` with `deterministicId()`
5. **Verify** - Run `scripts/scan-are-core.mjs --strict`

## CI Integration

The ARE Determinism Gate (`.github/workflows/are-determinism-gate.yml`) runs:

1. `scripts/check-are-determinism.mjs` - Critical path scan
2. `scripts/check-determinism-gate.mjs` - Pattern scan  
3. `scripts/scan-are-core.mjs --strict` - TypeScript Guard scan

All three must pass for a PR to merge to `main`.

## Migration Guide

### Before (Forbidden)
```typescript
const damage = baseDamage * (0.8 + Math.random() * 0.4);
const spawnId = crypto.randomUUID();
const timestamp = Date.now();
```

### After (Deterministic)
```typescript
const rng = new SeededARERng(seed, tick);
const damage = baseDamage * (0.8 + rng.next() * 0.4);
const spawnId = deterministicId(seed, 'enemy', spawnIndex);
const timestamp = tick * 1000;
```

## Emergency Exceptions

For truly necessary wall-clock operations, use the exemption marker:

```typescript
// @ARE-GUARD-EXEMPT: Audit log timestamp only; not a world-state input.
const auditTimestamp = Date.now();
```

**Note:** Exceptions must be reviewed by a senior developer and documented in PR comments.