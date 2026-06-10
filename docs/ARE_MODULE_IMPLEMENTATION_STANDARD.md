# ARE Module Implementation Standard

This is the default schema for new server-side Areloria modules such as weather, settlement pressure, disease, faction pressure, dungeon pressure, trading pressure, or NPC social systems.

The goal is to prevent detached services and legacy `WorldTick.ts` growth. Every module must become part of the canonical tick/snapshot/replay chain or remain explicitly outside gameplay truth.

## Module done-chain

A module is not complete until this chain is closed:

```text
Types
→ Ports
→ TickSystem
→ Delta
→ Replay sink
→ Snapshot or runtime manifest sink
→ /2d proof where player-visible
→ Unit/guard tests
→ Docs
```

## File shape

Recommended server layout:

```text
server/src/modules/<module>/
  <Module>Types.ts
  <Module>Ports.ts
  <Module>TickSystem.ts
  <Module>Snapshot.ts
  __tests__/<Module>TickSystem.test.ts
```

Core-only modules may live in `server/src/core/are/` only when they are part of the scheduler, replay, snapshot, guard, or Kappa foundation.

## Seven non-negotiable rules

```text
1. No direct import from server/src/core/WorldTick.ts.
2. No Date.now(), Math.random(), performance.now(), randomUUID() in TickSystem logic.
3. No I/O, DB, filesystem, network or external API call inside TickSystem.tick().
4. Core values use integer/Kappa/brand types where state is authoritative.
5. State changes are emitted as deltas, not hidden side effects.
6. Deltas feed replay and SnapshotComposer/runtime manifest.
7. Tests prove same input + same tick = same output.
```

## Port pattern

Modules read and write only through ports. Ports make tests deterministic and prevent scheduler ownership leakage.

```ts
export interface WeatherStatePort {
  listActiveChunkKeys(): readonly ChunkKey[];
  readWeatherState(chunkKey: ChunkKey): WeatherState | null;
  commitWeatherDelta(delta: WeatherDelta): void;
}

export interface WeatherReplaySink {
  recordWeatherDelta(delta: WeatherDelta): void;
}

export interface WeatherSnapshotSink {
  includeWeatherDelta(delta: WeatherDelta): void;
}
```

## TickSystem pattern

```ts
export class WeatherTickSystem implements TickSystem {
  readonly name = "weather";
  readonly priority = TickSystemPriority.GAMEPLAY;
  enabled = true;

  constructor(
    private readonly state: WeatherStatePort,
    private readonly replay: WeatherReplaySink,
    private readonly snapshot: WeatherSnapshotSink,
  ) {}

  tick(context: TickSystemContext): void {
    const chunkKeys = [...this.state.listActiveChunkKeys()].sort(compareChunkKeys);

    for (const chunkKey of chunkKeys) {
      const previous = this.state.readWeatherState(chunkKey) ?? createDefaultWeather(chunkKey);
      const next = evolveWeather(previous, context.tickCount);
      const delta = createWeatherDelta(context.tickCount, chunkKey, previous, next);

      this.state.commitWeatherDelta(delta);
      this.replay.recordWeatherDelta(delta);
      this.snapshot.includeWeatherDelta(delta);
    }
  }
}
```

## External data rule

Real-world APIs, LLMs, telemetry collectors, payment providers, asset generators and external AI services are adapters, not simulation truth.

Correct shape:

```text
external adapter outside tick
→ sanitized deterministic input event
→ TickSystem consumes event on tick boundary
→ state delta
→ replay/snapshot proof
```

Wrong shape:

```text
TickSystem.tick()
→ fetch external API
→ mutate canonical state from response timing/content
```

## WeatherLogic example

Weather in Areloria is gameplay weather unless explicitly stated otherwise. Gameplay weather should not call a real weather API inside the tick.

Required state fields should be bounded integers such as:

```text
humidity: KappaInt 0..1000
pressure: KappaInt 0..1000
temperature: KappaInt 0..1000
windX/windZ: KappaInt -1000..1000
kind: enum clear/cloud/rain/storm/fog/ash/snow
stateHash: StateHash
```

A real weather service may influence cosmetic UI or produce a sanitized input event, but the authoritative simulation must still be replayable from stored inputs.

## Required tests

Every new module PR should include tests for:

```text
- TickSystem name and priority
- stable sorted chunk traversal
- same input and tick produces same delta/hash
- replay sink receives delta
- snapshot or manifest sink receives output
- no mutation on failed validation
- no direct WorldTick import
- no forbidden runtime APIs in tick logic
```

## PR checklist

```text
Summary
Changed files
Runtime proof path
Determinism notes
Replay/Snapshot notes
Verification commands
Known limitations
Follow-up work
```

## Acceptance rule

A module may be merged as a foundation PR before /2d UI only if the PR explicitly states it is foundation-only and the next PR is the snapshot/UI proof. For player-visible features, `/2d` proof is mandatory before calling the feature complete.
