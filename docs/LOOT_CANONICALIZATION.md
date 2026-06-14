# Loot Canonicalization - Infinite ARE Loot Machine

## Binding Implementation Rules

### Canonical Truth
**ProceduralLootMachine = Infinite ARE Loot Machine** (main engine)

```
source event → loot_roll_context → Infinite ARE Loot Machine → loot_delta → inventory/equipment snapshot
```

### Allowed Module Roles

| Module | Role | Notes |
|--------|------|-------|
| `ProceduralLootMachine` | Main engine core | Infinite ARE Loot Machine |
| `DeterministicRng` | Deterministic entropy helper | SHA-256 based |
| `TreasureClassRegistry` | Registry/helper | Content lookup |
| `RarityResolver` | Helper | Rarity weights |
| `AffixEngine` | Helper | Affix rolling |
| `SocialStringMutationEngine` | Helper | Name/lore mutations |
| `LootGovernor` | Validator/sanitizer | Output validation |
| `ARELootEngine` | Facade/adapter | Only if preserves full capability |
| `DefaultLootMatrix` | Fallback/dev seed only | Not runtime truth |
| `LootDirector` | Context orchestrator + loot_delta writer | Only |
| `LootFeed/LootRenderer` | Snapshot observers only | Display only |

### Removal Rule

> If a loot module rolls items independently and cannot delegate to the Infinite ARE Loot Machine, **remove it from production runtime** or quarantine it as dev/test compatibility code.

### Not Allowed

- ❌ Client-side drop generation
- ❌ Math.random() for loot
- ❌ Date.now() for loot timing
- ❌ Parallel runtime loot truth
- ❌ Simplifying the infinite loot logic
- ❌ Replacing with small static matrix
- ❌ Fake inventory/equipment outputs

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CANONICAL LOOT PATH                            │
└─────────────────────────────────────────────────────────────────────┘

  [Combat System]
        │
        ▼
┌──────────────────────┐
│ LootRollContext      │
│ - sourceEntityId     │
│ - defeatedEntityId   │
│ - actorId            │
│ - sourceTick         │
│ - chunkKey           │
│ - worldHash          │
│ - chunkHash          │
│ - kappa/seed         │
│ - encounterId        │
│ - lootIndex          │
│ - treasureClassId    │
│ - areaLevel          │
│ - magicFind          │
│ - killStreak         │
│ - sourceRank         │
│ - biomeId            │
│ - factionId          │
│ - socialString       │
└──────────────────────┘
        │
        ▼
┌──────────────────────────────────────┐
│ ProceduralLootMachine                │
│ (INFINITE ARE LOOT MACHINE)          │
│                                      │
│ - TreasureClassRegistry              │
│ - RarityResolver                     │
│ - AffixEngine                        │
│ - SocialStringMutationEngine         │
│ - LootGovernor                       │
│ - DeterministicRng                   │
└──────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────┐
│ LootDelta                            │
│ - idempotencyKey                     │
│ - lootRollContext                    │
│ - seedHash                           │
│ - items[] (sorted by rollHash)       │
│ - createdAtTick                      │
│ - playerId                           │
└──────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────┐
│ LootDirector                         │
│ - Writes loot_delta                  │
│ - Emits loot.delta event             │
│ - Idempotency guard                   │
│ - No direct item spawning            │
└──────────────────────────────────────┘
        │
        ├───────────────────────────────┐
        ▼                               ▼
┌───────────────┐            ┌──────────────────┐
│ Inventory     │            │ WorldDropService │
│ System        │            │                  │
└───────────────┘            └──────────────────┘
        │                               │
        ▼                               ▼
┌─────────────────────────────────────────────┐
│           Inventory/Equipment State        │
│           (Consumes loot_delta only)        │
└─────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────┐
│ LootFeed (Client)                    │
│ - Observes server snapshot only      │
│ - No client-side roll logic          │
│ - Uses server tick for pruning       │
└──────────────────────────────────────┘

## Types

### LootRollContextCanonical
```typescript
interface LootRollContextCanonical {
  sourceEntityId: string;      // Player who triggered
  defeatedEntityId: string;   // NPC/entity defeated
  actorId: string;            // Actor performing action
  sourceTick: number;         // Server tick
  chunkKey: string;            // Spatial chunk
  worldHash: string;           // World-level determinism
  chunkHash: string;           // Chunk-level determinism
  kappa: string;               // Seed context
  encounterId?: string;       // Optional encounter
  lootIndex: number;           // Index for multiple drops
  treasureClassId: string;     // TC to use
  areaLevel: number;           // For scaling
  magicFind?: number;          // MF bonus
  killStreak?: number;         // Kill streak bonus
  sourceRank?: string;         // NORMAL/ELITE/BOSS/WORLD_BOSS
  biomeId?: string;           // For mutation
  factionId?: string;         // For mutation
  socialString?: string;       // For mutation
}
```

### LootDelta
```typescript
interface LootDelta {
  idempotencyKey: string;      // Prevents duplicate drops
  lootRollContext: LootRollContextCanonical;
  seedHash: string;            // Deterministic seed
  items: readonly LootDeltaItem[];  // Stably sorted
  createdAtTick: number;
  playerId: string;
}

interface LootDeltaItem {
  uid: string;
  itemId: string;
  name: string;
  rarity: string;
  quantity: number;
  position: { x: number; y: number; z: number };
  rollHash: string;            // For stable sorting
}
```

## Idempotency

```typescript
function createIdempotencyKey(ctx: LootRollContextCanonical): string {
  return [
    'loot',
    ctx.sourceEntityId,
    ctx.defeatedEntityId,
    ctx.actorId,
    String(ctx.sourceTick),
    ctx.lootIndex
  ].join('|');
}
```

Same context always produces same key → same loot.

## Visual Presentation (See #1984)

UI elements use Stitch asset pipeline:
- Icons from confirmed server metadata
- Frames from Stitch asset registry
- Pickup markers from Stitch
- Item panels from Stitch

Assets are **display-only** - looked up from server metadata with deterministic fallback.

## Tests

See `server/src/tests/lootCanonicalization.test.ts`:

1. **Determinism Tests**
   - Same context → same loot
   - Different context → different loot
   - Stable seed generation

2. **Idempotency Tests**
   - Same event → same idempotency key
   - Different tick → different key
   - Duplicate prevention

3. **Integration Tests**
   - Combat → LootRollContext → loot_delta → items
   - Full chain verification

## References

- Issue: https://github.com/OuroborosCollective/Wasd/issues/1977
- Asset Contract: https://github.com/OuroborosCollective/Wasd/issues/1984