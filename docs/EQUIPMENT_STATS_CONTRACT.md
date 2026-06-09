# Equipment Stats Contract

Equipment stats are computed server-side from authoritative equipped items and exposed via the live gameplay snapshot.

## Stat Keys

All stats are integers (floors of server-computed values). Defaults to 0 when no equipment is equipped.

| Stat Key (snake_case) | Type (camelCase) | Description |
|---|---|---|
| `attack_power` | `attackPower` | Outgoing combat damage bonus |
| `defense` | `defense` | Incoming damage reduction |
| `max_health` | `maxHealth` | Visible max HP |
| `max_stamina` | `maxStamina` | Visible max stamina |
| `magic_find` | `magicFind` | Deterministic loot rarity weighting |
| `gathering_yield` | `gatheringYield` | Resource yield bonus (capped at 5) |
| `gathering_xp` | `gatheringXp` | Gathering XP multiplier |
| `loot_quality` | `lootQuality` | Loot quality weighting (capped at 300) |
| `critical_chance_per_mille` | `criticalChancePerMille` | Crit chance in per-mille (0–250) |

## Snapshot Contract

The live gameplay snapshot exposes `equipmentStats` as a non-optional field:

```typescript
// server/src/gameplay/LiveGameplaySnapshotTypes.ts
export interface LiveGameplaySnapshot {
  readonly equipmentStats: EquipmentStatBlock;
  // ...other fields
}
```

The client receives the same shape:

```typescript
// apps/client-2d/src/game/liveGameplaySnapshot.ts
export interface LiveGameplaySnapshot {
  equipmentStats?: EquipmentStats;
  // ...other fields
}
```

## Server Aggregation

Stats are computed server-side in `composeLiveGameplaySnapshotFromLegacy.ts` by passing `getEquipmentStats` to the `LiveGameplaySnapshotComposer`:

```typescript
getEquipmentStats: () => {
  return calculateEquipmentStats({ equipment: playerEquipmentState });
},
```

`calculateEquipmentStats` (from `EquipmentStatService.ts`) iterates over equipped slots sorted by `slotId`, accumulates stats from known equipment definitions and procedural loot items, and applies caps from `EQUIPMENT_STAT_CAPS`.

## UI Rendering

The `InventoryPanel` renders the stat summary with stable test IDs:

```tsx
<div className="equipment-stats-summary" data-testid="equipment-stats-summary">
  <div data-testid="equipment-stat-attack-power">Attack Power: {stats.attackPower}</div>
  <div data-testid="equipment-stat-defense">Defense: {stats.defense}</div>
  <div data-testid="equipment-stat-max-health">Max Health: {stats.maxHealth}</div>
  <div data-testid="equipment-stat-max-stamina">Max Stamina: {stats.maxStamina}</div>
  <div data-testid="equipment-stat-magic-find">Magic Find: {stats.magicFind}</div>
  <div data-testid="equipment-stat-gathering-yield">Gathering Yield: {stats.gatheringYield}</div>
  <div data-testid="equipment-stat-loot-quality">Loot Quality: {stats.lootQuality}</div>
  <div data-testid="equipment-stat-crit-chance">Crit Chance: {stats.criticalChancePerMille / 10}%</div>
</div>
```

## Determinism Rules

- No `Math.random()` for stat values
- No `Date.now()` for stat computation
- Stable slot ordering (sorted by `slotId` before accumulation)
- Unsafe values (NaN, Infinity) are clamped to 0
- Failed validation does not mutate equipment or stats
- Stats are always server-computed — client cannot set stats directly

## Gameplay Effects (Partial)

| Stat | Wired | Status |
|---|---|---|
| `attackPower` | Combat damage | Partial — `CombatEquipmentHook` applies to outgoing damage |
| `defense` | Damage reduction | Partial — `applyDefense` reduces incoming damage |
| `magicFind` | Loot rarity | Partial — passed to `LootDirector` via loot context |
| `gatheringYield` | Resource bonus | Partial — `calculateEffectiveGatheringYield` in GatheringService |
| `maxHealth` | Max HP display | Intentionally partial — character HP system pending |
| `maxStamina` | Max stamina display | Intentionally partial — stamina system pending |
| `lootQuality` | Loot quality | Intentionally partial — `LootDirector` accepts the value |
| `criticalChancePerMille` | Crit chance | Intentionally partial — `CombatEquipmentHook` computes crits |

## Tests Added

- `server/src/tests/LiveGameplaySnapshotComposer.test.ts` — equipmentStats in composer output
- `apps/client-2d/src/game/normalizeEquipmentStats.test.ts` — client normalization
- `e2e/live-gameplay-snapshot.spec.ts` — API exposes equipmentStats with valid integers

## Verification Commands

```bash
pnpm --filter @wasd/shared build
pnpm run ci:verify
pnpm run test:e2e:ci
```