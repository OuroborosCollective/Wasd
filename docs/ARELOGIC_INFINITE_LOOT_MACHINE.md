# ARELogic Infinite Loot Machine — Mutation Edition

## Overview

The ARELogic Infinite Loot Machine is a **Diablo-2-inspired, deterministic loot generation system** that creates "schier endlose" (almost endless) item variations through the combination of:

- Treasure Classes with recursive nesting
- Rarity tiers with Magic Find bonuses
- Prefix/Suffix/Synergy affix systems
- Biomimetische Sozialstring Mutation (biomimetic social string mutation)
- Autonomous safety governors

Every drop is **deterministic, auditable, and replayable** at 10Hz tick rate.

---

## Architecture

```
NPC Death/Decomposition
        │
        ▼
GameEventBus.emit('combat.npcKilled')
        │
        ▼
LootDirector.handleNpcKilled()
        │
        ▼
ProceduralLootMachine.generate(ctx)
        │
        ├──► TreasureClassRegistry.resolve()  ──► TreasureClass (recursive)
        │
        ├──► RarityResolver.resolve()         ──► RARITY (COMMON→MYTHIC)
        │
        ├──► AffixEngine.rollAffixes()       ──► Prefix/Suffix/Synergies
        │
        ├──► SocialStringMutationEngine.resolve() ──► Biome/Faction/Social
        │
        └──► LootGovernor.inspect()          ──► Economy/Exploit/Drift checks
                │
                ▼
        LootAuditStore (replay proof)
                │
                ▼
        WorldDropService / InventoryService
                │
                ▼
        WebSocket Broadcast: loot.generated
```

---

## Core Components

### 1. DeterministicRng

**Location:** `server/src/loot/DeterministicRng.ts`

Cryptographically seeded RNG using SHA-256 hash. No `Math.random()`.

```typescript
const rng = new DeterministicRng(seed);
const value = rng.int(1, 100);        // Integer in range
const picked = rng.weightedPick(items, 'weight'); // Weighted selection
```

**Key Methods:**
- `nextU32()` — 32-bit unsigned integer
- `float01()` — Float 0.0 to 1.0
- `int(min, max)` — Integer in range
- `pick(list)` — Random array element
- `weightedPick(items, weightKey)` — Weighted selection

---

### 2. LootAxioms

**Location:** `server/src/loot/LootAxioms.ts`

Deterministic seed generation and hashing.

```typescript
const seed = LootAxioms.makeSeed({
  playerId: 'player_1',
  tickIndex: 100,
  dropSourceId: 'npc_1',
  areaLevel: 10,
  lootIndex: 0,
  biomeId: 'mountain',
  factionId: 'npc_kingdom_red',
  socialString: 'protector oath'
});
// Returns: "ARE_LOOT_AXIOMS_V3_MUTATION|policy:default|player:player_1|..."
```

**Axiom Version:** `ARE_LOOT_AXIOMS_V3_MUTATION`

---

### 3. TreasureClassRegistry

**Location:** `server/src/loot/TreasureClassRegistry.ts`

Diablo-2-style treasure classes with recursive nesting.

**Fallback Treasure Classes:**

| ID | Rolls | NoDrop | Description |
|----|-------|--------|-------------|
| TC_ACT1_BEAST | 1 | 700 | Standard beast drops |
| TC_GOLD_SMALL | 1 | 200 | Small gold drops |
| TC_BOSS_WORLD | 6 | 0 | World boss drops (high-tier) |

**Entry Types:**
- `baseType` — References ItemBase for item generation
- `treasureClass` — Recursive reference to another TC
- `currency` — Gold or other currencies
- `noDrop` — Empty drop (noDropWeight)

---

### 4. RarityResolver

**Location:** `server/src/loot/RarityResolver.ts`

Rarity tiers with Magic Find, Boss Bonus, and Pity mechanics.

**Rarity Tiers:**

| Rarity | Base Weight | Affix Range |
|--------|-------------|-------------|
| COMMON | 1000 | [0, 0] |
| MAGIC | 220 | [1, 2] |
| RARE | 70 | [3, 4] |
| EPIC | 18 | [5, 6] |
| LEGENDARY | 4 | [6, 8] |
| MYTHIC | 1 | [8, 10] |

**Bonuses:**
- `magicFind`: Up to +500% (capped), increases rare chances
- `killStreak`: Pity bonus up to +2x after 100 kills
- `sourceRank`: WORLD_BOSS = 2.5x, ELITE = 1.5x

---

### 5. AffixEngine

**Location:** `server/src/loot/AffixEngine.ts`

Prefix and suffix generation with group blocking and social bias.

**Fallback Affixes:**

| ID | Name | Stat | Type | Range | Level | Prefix |
|----|------|------|------|-------|-------|--------|
| pre_vital | Vital | vitality | flat | 2-8 | 1 | ✓ |
| pre_savage | Savage | damageMax | flat | 1-6 | 1 | ✓ |
| suf_bear | the Bear | strength | flat | 2-9 | 1 | ✗ |
| suf_owl | the Owl | intelligence | flat | 2-9 | 1 | ✗ |
| pre_ouroboric | Ouroboric | resonance | flat | 1-5 | 10 | ✓ |

**Group Blocking:** Only one affix per stat group per item.

---

### 6. SocialStringMutationEngine

**Location:** `server/src/loot/SocialStringMutationEngine.ts`

Biomimetic mutation that affects item names, lore, and stat biases based on:

- **Biome:** Swamp → poisonResist/vitality, Mountain → armor/strength
- **Faction:** Red Kingdom → damageMax bias
- **Social String:** "protector" → defensive stats, "betrayal" → criticalChance
- **Reputation:** Honored (+80) → +5% value, Feared (-80) → +damageMin

**Example:**
```
biomeId: mountain
factionId: npc_kingdom_red
socialString: "protector oath"
```

Generates: **Stonebound Savage Iron Sword of the Watch of the Red Banner**

---

### 7. LootGovernor

**Location:** `server/src/loot/LootGovernor.ts`

Autonomous safety system that inspects and sanitizes items.

**Policy Limits:**
- `maxSellValue`: 1,000,000
- `maxAffixes`: 10
- `maxSingleStatValue`: 10,000
- `forbiddenStats`: adminPower, serverAuthority, realMoneyValue

**Warning Codes:**
- `TOO_MANY_AFFIXES`
- `FORBIDDEN_STAT`
- `STAT_TOO_HIGH`
- `SELL_VALUE_TOO_HIGH`

---

### 8. ProceduralLootMachine

**Location:** `server/src/loot/ProceduralLootMachine.ts`

Central orchestrator that combines all components.

**Generation Flow:**
1. Normalize context
2. Create deterministic RNG from seed
3. Resolve social mutation
4. Resolve treasure class entries
5. For each entry:
   - Currency → direct drop
   - BaseType → full item generation
6. Inspect with LootGovernor
7. Return frozen result

**Output Structure:**
```typescript
{
  seedHash: string,      // Short hash for debugging
  context: LootContext,  // Normalized input
  items: LootItem[]     // Frozen array of items
}
```

---

### 9. LootDirector

**Location:** `server/src/loot/LootDirector.ts`

Event-driven director that listens for `combat.npcKilled` events.

**Event Handling:**
- `combat.npcKilled` → Generate loot, spawn/drop items
- `world.tick` (every 100 ticks) → Emit telemetry

**Treasure Class Selection:**
```typescript
treasureClassForNpc(payload) {
  if (sourceRank === 'WORLD_BOSS') return 'TC_BOSS_WORLD';
  if (npcType === 'beast') return 'TC_ACT1_BEAST';
  return 'TC_ACT1_BEAST';
}
```

---

## API Endpoints

### GET /admin/loot/status

Check loot system status.

```json
{
  "ok": true,
  "system": "ARE_INFINITE_LOOT_MACHINE",
  "status": {
    "started": true,
    "axiomVersion": "ARE_LOOT_AXIOMS_V3_MUTATION",
    "telemetry": {
      "generated": 1234,
      "byRarity": { "COMMON": 800, "MAGIC": 300, "RARE": 100 }
    }
  }
}
```

### POST /admin/loot/generate

Test loot generation with custom context.

```json
// Request
{
  "playerId": "test_player",
  "tickIndex": 1000,
  "dropSourceId": "test_npc",
  "areaLevel": 10,
  "biomeId": "mountain",
  "factionId": "npc_kingdom_red",
  "socialString": "protector oath",
  "playerReputation": 90
}
```

---

## WebSocket Events

### Outgoing: loot.generated

```json
{
  "type": "loot.generated",
  "payload": {
    "playerId": "player_1",
    "tickIndex": 100,
    "seedHash": "a1b2c3d4e5f6",
    "items": [
      {
        "uid": "item-abc123",
        "kind": "item",
        "name": "Stonebound Savage Iron Sword of the Watch",
        "rarity": "RARE",
        "amount": 1
      },
      {
        "uid": "item-def456",
        "kind": "currency",
        "currency": "gold",
        "amount": 12
      }
    ]
  }
}
```

### Outgoing: loot.telemetry

Every 100 ticks with system status.

---

## Determinism Guarantees

### The ARE LOOT AXIOM — MUTATION EDITION

1. **Every drop is a function of context, policy, and seed.**
2. **No loot result may depend on `Math.random()`.**
3. **Intelligence may observe, suggest, quarantine, and tune policies.**
4. **Only versioned deterministic policy may alter live outcomes.**
5. **Social mutation may bias flavor and weighted choice, never break replay.**
6. **Every item must be hashable, auditable, and replayable.**

---

## File Structure

```
server/src/
├── loot/
│   ├── DeterministicRng.ts
│   ├── LootAxioms.ts
│   ├── TreasureClassRegistry.ts
│   ├── RarityResolver.ts
│   ├── AffixEngine.ts
│   ├── SocialStringMutationEngine.ts
│   ├── LootGovernor.ts
│   ├── ProceduralLootMachine.ts
│   ├── LootDirector.ts
│   └── index.ts
├── core/events/
│   └── GameEventBus.ts
├── bootLootSystem.ts
└── routes/
    └── lootRoutes.ts

server/src/tests/
└── proceduralLootMachine.test.ts

server/src/modules/loot/
├── installLootBridge.ts
├── installARELootIntegration.ts
└── ... (existing loot modules)
```

---

## Configuration

**Environment Variables:**
- None required (fallback data provided)

**Database Models (optional):**
- `TreasureClass` — Custom treasure class definitions
- `ItemBase` — Custom base item definitions
- `AffixPool` — Custom affix definitions
- `LootPolicy` — Active policy configuration

---

## Integration with NPC Decomposition

The loot system integrates with the existing NPC decomposition system:

1. NPC enters `decomposition` state (energy depleted)
2. `emitDecompositionResonance()` creates loot capsule
3. `installARELootIntegration` hooks into this flow
4. `emitDeterministicLootEvent()` fires `combat.npcKilled`
5. `LootDirector` generates deterministic loot
6. Items spawn in world via `WorldDropService`

---

## Testing

```bash
# Run loot system tests
pnpm vitest run server/src/tests/proceduralLootMachine.test.ts

# Test determinism
# Same context → Same loot → PASS

# Test rarity distribution
# Run 1000 iterations, verify distribution

# Test social mutation
# Mountain + protector + red faction → expected biases
```

---

## Performance

- **Generation Time:** < 1ms per item
- **Memory:** Minimal (no stateful caching)
- **Determinism:** O(1) seed → O(n) generation

---

## Future Extensions

1. **Database Integration:** Load custom TCs, items, affixes from DB
2. **LootAuditStore:** Persist drops for replay verification
3. **Policy Hot-Reload:** Update loot policies without restart
4. **ItemFusion:** Combine items for new generations
5. **CraftingIntegration:** Use loot items as crafting materials

---

**System Version:** ARE_LOOT_AXIOMS_V3_MUTATION
**Last Updated:** 2026-06-08