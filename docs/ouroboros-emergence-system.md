# Ouroboros Emergence System

**Phase 11: Ouroboros Grand Unification with ARE-Logic**

A fully deterministic, self-developing game universe without State-Bloat, without Mocks, and without LLMs.

## Key Axioms

1. **Axiom 1: Snapshot-Prinzip** - No mutation during iteration
2. **Axiom 2: Nomock-Theorem** - No mocks, no stubs, no time sources
3. **Axiom 3: Zeitstempel-Integrität** - Tick-based time, not wall-clock
4. **Axiom 4: Informations-Erhaltung** - Energy is never lost
5. **Axiom 5: Feld-Lokalität** - Information spreads causally (3x3 neighbors)

## Architecture

```
server/src/core/ouroboros/
├── OuroborosTypes.ts           # Core types and constants
├── ErdosStringManager.ts       # Deterministic Erdős-String system
├── LayerResonanceTickSystem.ts # Kingdom emergence + legend waves
├── OuroborosCycleSystem.ts     # Civilization fall + resurrection
├── NPCSemanticsEngine.ts       # Deterministic speech + quest generation
├── OuroborosLootGenerator.ts   # Diablo-style deterministic loot
├── GenesisEngine.ts            # Zero-state database cold start
├── OuroborosWatchdog.ts        # Client state verification
└── index.ts                    # Module exports
```

## Core Concepts

### Erdős-Strings

Compressed interaction history stored as pipe-separated event logs.

```
CHUNKKEY|TICK:EVENT|TICK:EVENT|...
Example: "0:0|100:SETTLE|500:KINGDOM:12345|1200:FALLEN:67890"
```

**State-Bloat = 0**: We store only strings, not layer values. Layers are recomputed deterministically on load.

### The Ouroboros Cycle

1. **WILD** → **SETTLED** (first settlement)
2. **SETTLED** → **KINGDOM** (economy > 80, memory > 50)
3. **KINGDOM** → **WAR** (conflict rises)
4. **WAR** → **FALLEN** (conflict > 100, kingdom collapses)
5. **FALLEN** → dungeon spawns with mythos seed
6. **FALLEN** → cycles accumulate released energy
7. **cycles > 100** → **RESURRECT** wave to 3x3 neighbors
8. **RESURRECT** → new SETTLE, cycle repeats

### Deterministic Loot

Loot generated from hash contracts (player + boss + tick). Same inputs always produce same loot.

```typescript
const divineHash = kappa1000Hash(`${playerSeed}_${bossMythosSeed}_${tick}_${KAPPA}`);
const baseType = BASE_ITEMS[divineHash % BASE_ITEMS.length];
const rarity = getRarity((divineHash >> 8) % 1000);
```

### Client Verification (Watchdog)

Server verifies client state without trusting client data:

1. Client sends: `chunkKey + erdosString + claimedHash`
2. Server recomputes: `expectedHash` from erdosString deterministically
3. Server compares: `isValid = (clientHash === serverHash)`

## Environment Variables

See `deploy/.env.production.template` for full configuration:

```bash
OUROBOROS_ENABLED=true
OUROBOROS_KINGDOM_THRESHOLD=80000
OUROBOROS_FALL_THRESHOLD=100000
OUROBOROS_RESURRECTION_THRESHOLD=100000
```

## Testing

```bash
pnpm run test:ouroboros
# or with verbose output
SEED=42 pnpm run test:ouroboros -- --reporter=verbose
```

## Determinism Verification

Same seed always produces same output (100% deterministic):

```bash
SEED=42 npm run test:ouroboros -- --reporter=verbose
SEED=42 npm run test:ouroboros -- --reporter=verbose
# Diff should be empty
```

## Integration

The Ouroboros system integrates with:

- **TickSystemRegistry** - Registers as `WORLD` priority tick system
- **WorldTickScheduler** - Runs on 100ms tick interval
- **LayerPersistenceQueue** - Persists Erdős-Strings instead of layer values
- **Manifest System** - State verification via `hashChunkKappa1000`

## Client Rendering

The 2D client can render chunks from Erdős-Strings:

```typescript
// apps/client-2d/src/ouroboros/ChunkRenderer.ts
const visualSeed = kappa1000Hash(`${erdosString}_${KAPPA}`);
const conflictLevel = erdosString.includes('WAR') ? 15 : visualSeed % 20;
```

No server instructions needed - client computes visuals deterministically.