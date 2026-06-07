# Skill: Live System Contract Hardening

## Purpose

Hardens the WASD live gameplay path by connecting existing systems through deterministic contracts.

## Scope

This skill may modify:
- `server/src/gameplay/**` - Extended LiveGameplaySnapshot types
- `server/src/core/ports/**` - Typed gameplay port interfaces
- `server/src/selfhealing/**` - SelfHeal signal contracts
- `server/src/core/ServerBootstrap.ts` - ClientEntrypointHealth
- `apps/client-2d/src/net/**` - Client snapshot validation
- `scripts/verify-client-entrypoints.mjs` - Entry point guard
- `e2e/live-system-contract.spec.ts` - Contract tests
- `docs/**` - Architecture and skill docs

**This skill must not treat `2d/` as a source directory.**

## Deterministic Requirements

- **No `Math.random`** in simulation
- **No `Date.now`** in gameplay decisions
- **No mutation** of source snapshot arrays
- **Stable sorting** for arrays
- **Explicit `logicalIndex`** on gameplay operations
- **Null ports** instead of placeholder objects
- **Health telemetry** cannot affect simulation

## Key Types

### Gameplay Ports

```typescript
interface CraftingPort {
  readonly kind: "crafting";
  craft(playerId: string, recipeId: string, logicalIndex: number): CraftingResult;
}

interface SkillPort {
  readonly kind: "skill";
  useSkill(playerId: string, skillId: string, logicalIndex: number): SkillUseResult;
}

interface PlacementPort {
  readonly kind: "placement";
  place(playerId: string, blueprintId: string, tileX: number, tileZ: number, logicalIndex: number): PlacementResult;
}
```

### SelfHeal Signals

```typescript
type SelfHealSignal =
  | "BOOT_CONFIG_MISSING"
  | "CLIENT_ASSET_MISSING"
  | "WORLD_TICK_DRIFT"
  | "PERSISTENCE_WRITE_FAILED"
  | "REDIS_UNAVAILABLE"
  | "ARE_INVARIANT_VIOLATION"
  | "SNAPSHOT_COMPOSITION_FAILED"
  | "GLB_ASSET_INVALID"
  | "ENTRYPOINT_CONTRACT_DRIFT";
```

### Snapshot v2

```typescript
interface LiveGameplaySnapshot {
  readonly schemaVersion: "live-gameplay-snapshot.v2";
  readonly playerId: string;
  readonly logicalIndex: number;
  readonly tickRateHz: 10;
  readonly tickMs: 100;
  readonly inventory: readonly LiveGameplayInventoryItem[];
  readonly equipment: readonly LiveGameplayEquipmentSlot[];
  readonly skills: readonly LiveGameplaySkillState[];
  readonly resourceNodes: readonly LiveGameplayResourceNode[];
  readonly combat: LiveGameplayCombatView;
  readonly crafting: LiveGameplayCraftingView;
  readonly faction: LiveGameplayFactionView;
  readonly world: LiveGameplayWorldView;
}
```

## Validation

Run:

```bash
# Verify entrypoints guard
pnpm guard:entrypoints

# Run all guards
pnpm guard:all

# Type check server
pnpm --filter @wasd/server typecheck

# Run server tests
pnpm --filter @wasd/server test -- --run

# Build client-2d
pnpm --filter @wasd/client-2d build
```

## Expected Result

- `/health` reports real client entrypoints
- `/2d` remains public route
- `apps/client-2d` remains source
- `LiveGameplaySnapshot v2` is stable and sorted
- Missing systems are explicit null ports
- `SelfHeal` has typed signal contracts

## Files Created

| File | Description |
|------|-------------|
| `scripts/verify-client-entrypoints.mjs` | Guard script for client entrypoint truth |
| `server/src/core/ports/GameplayPorts.ts` | Typed port interfaces |
| `server/src/core/ports/NullGameplayPorts.ts` | Explicit null implementations |
| `server/src/selfhealing/SelfHealSignals.ts` | Typed signal contracts |
| `server/src/selfhealing/SelfHealPatchLog.ts` | Deterministic patch logging |
| `apps/client-2d/src/net/liveGameplaySnapshot.ts` | Client validation types |
| `e2e/live-system-contract.spec.ts` | E2E contract tests |
| `docs/ARCHITECTURE_CLIENT_ENTRYPOINTS.md` | Client entrypoint docs |
| `docs/ARELOGIC_LIVE_SYSTEM_CONTRACT.md` | ARELogic contract docs |

## Files Modified

| File | Changes |
|------|---------|
| `package.json` | Added `guard:entrypoints` and updated `guard:all` |
| `server/src/gameplay/LiveGameplaySnapshotTypes.ts` | Extended v2 types |
| `server/src/gameplay/LiveGameplaySnapshotComposer.ts` | Extended composer |
| `server/src/core/ServerBootstrap.ts` | Added `ClientEntrypointHealth` |
| `server/src/core/WorldTick.ts` | Replaced placeholders with typed ports |