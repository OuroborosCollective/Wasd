# ARE Telemetry Side-Channel Policy

Deterministic simulation and runtime telemetry have different jobs.

Simulation code must be replayable from explicit inputs. It should use:

- `AREClock` for time
- `ARERng` for random decisions
- stable seeds from world facts such as world seed, region, chunk, tick, actor ids, table ids, cycle ids

Telemetry code observes the live runtime. It may use wall-clock time for health checks, logs, anomaly windows, healing cooldowns, and retention policies.

## Decision

Level-C runtime telemetry should not be scattered through simulation files with naked allow comments.

Preferred shape:

```text
server/src/core/telemetry/**
server/src/core/liveheal/**
server/src/core/logger/**
server/src/core/api/**
server/src/core/integrity/**
server/src/modules/warfront/WarfrontCombatTelemetry.ts
```

The determinism gate excludes these side-channel paths by policy. This keeps runtime observability from hiding nondeterminism in gameplay code.

## Allowed in telemetry side-channel

- `Date.now()` for process timing
- `new Date()` for human-readable log timestamps
- runtime ids for patch logs and health events
- anomaly windows and cooldowns
- retention cutoff calculations

## Not allowed in simulation paths

- `Math.random()` for combat, loot, NPC, oracle, warfront, worldgen, economy decisions
- `Date.now()` for cycle, spawn, loot, cooldown, tick, or replay decisions
- `randomUUID()` for ids that become gameplay state

## Temporary escape hatch

A reviewed marker exists for rare cases:

```ts
// @are-determinism-allow reason: explain why this line cannot affect simulation replay
```

or

```ts
// @are-telemetry-side-channel reason: runtime observability only
```

Use markers sparingly. Prefer moving telemetry code into a side-channel path.
