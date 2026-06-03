# ARE Time Paradigm: Tick-Authoritative Simulation

Areloria/WASD simulation time is tick-authoritative. Gameplay logic must compare integer ticks, not wall-clock timestamps.

## Canonical cadence

The shared cadence lives in:

```ts
packages/shared/src/areTime.ts
```

Use these exports instead of hard-coded duration assumptions:

```ts
import {
  ARE_SIMULATION_TICK_HZ,
  ARE_SIMULATION_TICK_MS,
  msToARETicks,
  areTicksToMs,
} from '@wasd/shared';
```

Current canonical values:

```ts
ARE_SIMULATION_TICK_HZ = 10
ARE_SIMULATION_TICK_MS = 100
```

## Core rule

Do not encode hidden tick math like this:

```ts
Math.ceil(cooldownMs / 100)
tickCount % 10 === 0
Date.now()
performance.now()
Math.random()
```

Use explicit ARE helpers/adapters instead:

```ts
msToARETicks(cooldownMs)
createWorldTickTimeAdapter(() => tickCount).cooldownTicks(cooldownMs)
createWorldTickTimeAdapter(() => tickCount).snapshot()
```

## Server hot paths

For world/server systems, prefer `WorldTickTimeAdapter`:

```ts
import { createWorldTickTimeAdapter } from './WorldTickTimeAdapter.js';

const time = createWorldTickTimeAdapter(() => tickCount);
const cooldownTicks = time.cooldownTicks(800);
const ok = time.hasCooldownElapsed(lastTick, 800);
```

The adapter exists to keep duration declarations readable while preserving tick-only authority.

## UI and client systems

UI may use the same cadence for coalescing noisy browser events, but UI time is not simulation authority.

Good example:

```ts
export const WORLD_SERVER_TICK_HZ = ARE_SIMULATION_TICK_HZ;
export const WORLD_SERVER_TICK_MS = ARE_SIMULATION_TICK_MS;
```

This is allowed for layout/hud throttling. It must never decide combat, inventory, XP, loot or authoritative movement.

## Best practices

1. Store authoritative time as ticks.
2. Convert milliseconds at the boundary only.
3. Never compare wall-clock time inside simulation code.
4. Never use `Date.now()` or `performance.now()` for gameplay decisions.
5. Never use `Math.random()` in gameplay decisions. Use seeded ARE RNG.
6. Prefer explicit names like `cooldownMs` for declarations and `cooldownTicks` for simulation comparison.
7. Include tick snapshots in telemetry when helpful:

```ts
{
  tick: time.nowTick(),
  tickHz: time.tickHz,
  tickMs: time.tickMs,
}
```

## Current migration note

Warfront cadence already routes through `WorldTickTimeAdapter`.

The remaining player-message cooldown in `server/src/core/WorldTick.ts` should be migrated with:

```bash
node scripts/patch-worldtick-time-adapter.mjs
```

The script performs a narrow deterministic replacement:

- imports `createWorldTickTimeAdapter`
- adds a `private readonly time` field to `WorldTick`
- replaces `Math.ceil(cooldownMs / 100)` with `this.time.cooldownTicks(cooldownMs)`

This script exists because `WorldTick.ts` is a large hot-path file and should not be rewritten casually through broad automated edits.
