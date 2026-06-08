# ARE Loot Machine Integration — AI Skill

## Purpose

This skill guides AI agents working with the **ARELogic Infinite Loot Machine** — a deterministic, Diablo-2-inspired loot generation system.

## Trigger Keywords

- `are loot`
- `procedural loot`
- `deterministic loot`
- `treasure class`
- `affix engine`
- `item generation`
- `loot director`
- `social mutation`

---

## Core Concepts

### Determinism First

**Every loot drop is deterministic.** No `Math.random()` allowed.

```typescript
// ✅ CORRECT: Use DeterministicRng
const rng = new DeterministicRng(seed);
const roll = rng.int(1, 100);

// ❌ WRONG: Never use Math.random()
const roll = Math.random(); // FORBIDDEN
```

### Seed Composition

Loot seed must include:
- `playerId` — Who killed
- `tickIndex` — When (at 10Hz)
- `dropSourceId` — What died
- `areaLevel` — Where
- `lootIndex` — Which drop (for multiple drops)
- `biomeId` — Environmental context
- `factionId` — Social context
- `socialString` — Behavioral context

### Treasure Class Recursion

Treasure Classes can nest up to **8 levels deep**:

```
TC_ACT1_BEAST
  ├── baseType: weapon.sword
  ├── baseType: armor.light
  ├── treasureClass: TC_GOLD_SMALL
  │     └── currency: gold
  └── treasureClass: TC_RARE_GEMS
        └── baseType: gem
```

---

## File Locations

| File | Purpose |
|------|---------|
| `server/src/loot/DeterministicRng.ts` | Cryptographic RNG |
| `server/src/loot/LootAxioms.ts` | Seed generation |
| `server/src/loot/TreasureClassRegistry.ts` | TC resolution |
| `server/src/loot/RarityResolver.ts` | Rarity tiers |
| `server/src/loot/AffixEngine.ts` | Prefix/suffix |
| `server/src/loot/SocialStringMutationEngine.ts` | Biome/faction mutation |
| `server/src/loot/LootGovernor.ts` | Safety limits |
| `server/src/loot/ProceduralLootMachine.ts` | Main orchestrator |
| `server/src/loot/LootDirector.ts` | Event handler |
| `server/src/bootLootSystem.ts` | Bootstrap |
| `server/src/modules/loot/installARELootIntegration.ts` | NPC bridge |

---

## Integration Patterns

### 1. Emitting Loot Events

```typescript
import { emitDeterministicLootEvent } from './modules/loot/installARELootIntegration.ts';

emitDeterministicLootEvent({
  playerId: player.id,
  npcId: npc.id,
  npcType: npc.role,
  areaLevel: zone.areaLevel,
  position: npc.position,
  biomeId: zone.biomeId,
  factionId: npc.factionId,
  socialString: npc.socialString || '',
  playerReputation: player.reputation,
  magicFind: player.stats.magicFind,
  killStreak: player.stats.killStreak,
  tick: worldTick
});
```

### 2. Generating Loot Directly

```typescript
import { ProceduralLootMachine } from './loot/ProceduralLootMachine.ts';

const machine = new ProceduralLootMachine(db);
const result = await machine.generate({
  playerId: 'player_1',
  tickIndex: 100,
  dropSourceId: 'npc_1',
  areaLevel: 10,
  treasureClassId: 'TC_BOSS_WORLD',
  biomeId: 'mountain',
  factionId: 'npc_kingdom_red',
  socialString: 'protector',
  playerReputation: 90
});
```

### 3. Checking System Status

```typescript
import { getARELootStatus } from './modules/loot/installARELootIntegration.ts';

const status = getARELootStatus();
// { initialized: true, system: 'ARE_INFINITE_LOOT_MACHINE', ... }
```

---

## Rarity Distribution

| Rarity | Weight | Affixes | Notes |
|--------|--------|---------|-------|
| COMMON | 1000 | 0 | Basic drops |
| MAGIC | 220 | 1-2 | Uncommon |
| RARE | 70 | 3-4 | Valuable |
| EPIC | 18 | 5-6 | Powerful |
| LEGENDARY | 4 | 6-8 | Rare |
| MYTHIC | 1 | 8-10 | Unique |

**Bonuses:**
- Magic Find: +rare% per point (capped at 500)
- Kill Streak: +pity% after 100 kills
- Boss: WORLD_BOSS = 2.5x, ELITE = 1.5x

---

## Social Mutation Effects

| Context | Title Prefix | Title Suffix | Stat Bias | Value Scale |
|---------|--------------|--------------|-----------|-------------|
| biome:swamp | Mire | — | poisonResist, vitality | 1000‰ |
| biome:mountain | Stonebound | — | armor, strength | 1000‰ |
| faction:red | — | of the Red Banner | damageMax | 1000‰ |
| social:protector | — | of the Watch | armor, vitality | 1000‰ |
| social:betrayal | — | of Broken Oaths | criticalChance | 1000‰ |
| rep >= 80 | — | — | — | +50‰ |
| rep <= -80 | — | — | damageMin | -30‰ |

---

## LootGovernor Limits

```typescript
const policy = {
  maxSellValue: 1_000_000,
  maxAffixes: 10,
  maxSingleStatValue: 10_000,
  forbiddenStats: ['adminPower', 'serverAuthority', 'realMoneyValue']
};
```

---

## Testing Checklist

When modifying loot system:

- [ ] Same context produces same loot (determinism)
- [ ] Different tick produces different loot
- [ ] Rarity distribution matches weights
- [ ] Social mutation applies correctly
- [ ] Governor sanitizes invalid items
- [ ] Treasure class recursion terminates at depth 8
- [ ] Item UID is reproducible

---

## Common Issues

### "LOOT_CONTEXT_MISSING"

Context must include: `playerId`, `tickIndex`, `dropSourceId`, `areaLevel`, `lootIndex`

### "TREASURE_CLASS_RECURSION_LIMIT"

TC nesting exceeded 8 levels. Check for circular references.

### "INVALID_RNG_RANGE"

`min > max` in `rng.int(min, max)`. Check affix ranges.

### Loot not appearing in world

Check that `installARELootIntegration(tick)` was called in ServerBootstrap after `tick.start()`.

---

## Best Practices

1. **Never modify seed generation** — It breaks determinism
2. **Always use frozen objects** — Prevents accidental mutation
3. **Test with same seed twice** — Verify determinism
4. **Use LootGovernor** — Prevents exploit items
5. **Log seedHash** — Enables replay debugging

---

## See Also

- [ARELOGIC_INFINITE_LOOT_MACHINE.md](../../ARELOGIC_INFINITE_LOOT_MACHINE.md) — Full documentation
- [server-anti-ninja-loot.md](../../ai-skills/server-anti-ninja-loot.md) — Security patterns
- [wasd-are-system.md](../../ai-skills/wasd-are-system.md) — ARE architecture