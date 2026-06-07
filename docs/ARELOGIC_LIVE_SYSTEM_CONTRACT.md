# ARELogic Live System Contract

## Goal

The live system contract connects WorldTick, LiveGameplaySnapshot, client rendering, SelfHeal and health diagnostics without violating deterministic simulation rules.

## Core ARELogic Rules

1. **The server is authoritative.**
2. **WorldTick runs at 10Hz / 100ms.**
3. **Gameplay state must be reproducible from explicit inputs.**
4. **Simulation paths must not use:**
   - `Math.random()`
   - `Date.now()`
   - `new Date()`
   - `randomUUID()`
   - `host/container identity`
5. **Operational telemetry may use wall-clock time only if it never feeds gameplay decisions.**
6. **Snapshot arrays must be sorted by stable ids.**
7. **Missing systems return explicit null-port responses, not silent `{}` placeholders.**
8. **SelfHeal may observe and repair infrastructure, but must not invent gameplay outcomes.**
9. **Client renders state; it does not decide truth.**

## Snapshot v2

The v2 live gameplay snapshot includes:

- `inventory` - Player inventory items
- `equipment` - Equipped gear slots
- `skills` - Skill states with XP/levels
- `resourceNodes` - Available gathering nodes
- `combat` - HP, stamina, cooldowns, target
- `crafting` - Known recipes, active job
- `faction` - Guild, faction, reputation
- `world` - Chunk, biome, safe zone

### Schema Version

```
live-gameplay-snapshot.v2
```

## Null Port Principle

A missing subsystem must say:

```json
{
  "ok": false,
  "reason": "system_not_connected"
}
```

**It must not silently return `{}`.**

### Defined Ports

| Port | Interface | Null Response |
|------|-----------|---------------|
| Crafting | `CraftingPort` | `{ ok: false, reason: "crafting_not_connected" }` |
| Skill | `SkillPort` | `{ ok: false, reason: "skill_not_connected" }` |
| Placement | `PlacementPort` | `{ ok: false, reason: "placement_not_connected" }` |

## SelfHeal Integration

SelfHeal signals are typed and logged through deterministic patch entries.

### Defined Signals

| Signal | Description |
|--------|-------------|
| `BOOT_CONFIG_MISSING` | Bootstrap configuration not found |
| `CLIENT_ASSET_MISSING` | Required client asset absent |
| `WORLD_TICK_DRIFT` | Tick timing deviation detected |
| `PERSISTENCE_WRITE_FAILED` | Database/file write error |
| `REDIS_UNAVAILABLE` | Redis connection failed |
| `ARE_INVARIANT_VIOLATION` | Determinism guard triggered |
| `SNAPSHOT_COMPOSITION_FAILED` | Snapshot composer error |
| `GLB_ASSET_INVALID` | 3D asset validation failed |
| `ENTRYPOINT_CONTRACT_DRIFT` | Client source/route mismatch |

### Patch Log Entry

Each repair produces a hashable, deterministic log entry:

```typescript
interface HealPatchLogEntry {
  id: string;           // SHA-256 hash
  tick: number;
  signal: SelfHealSignal;
  subsystem: string;
  action: string;
  beforeHash: string;   // SHA-256 of before state
  afterHash: string;    // SHA-256 of after state
  ok: boolean;
}
```

## Client Snapshot Validation

The client validates server snapshots before applying:

```typescript
function isLiveGameplaySnapshot(value: unknown): value is LiveGameplaySnapshotClient {
  return (
    value.schemaVersion === "live-gameplay-snapshot.v2" &&
    typeof value.playerId === "string" &&
    typeof value.logicalIndex === "number" &&
    value.tickRateHz === 10 &&
    value.tickMs === 100 &&
    // ... other field validations
  );
}
```

If validation fails, the client displays degraded fallback UI.

## Validation Commands

```bash
# Verify entrypoints
pnpm guard:entrypoints

# Run all guards
pnpm guard:all

# Type check server
pnpm --filter @wasd/server typecheck

# Build client-2d
pnpm --filter @wasd/client-2d build

# Build server
pnpm --filter @wasd/server build
```

## Expected Results

After implementation:

- `/health` reports real client entrypoints
- `/2d` remains public route
- `apps/client-2d` remains source
- `LiveGameplaySnapshot v2` is stable and sorted
- Missing systems are explicit null ports
- `SelfHeal` has typed signal contracts