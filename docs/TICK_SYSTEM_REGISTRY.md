# Tick System Registry Truth Path

## Purpose

The ARE runtime tick path uses `WorldTickThinShell` as a 10-Hz coordinator. Domain logic runs through registered `TickSystem` implementations instead of ad-hoc calls inside the tick loop.

## Runtime Contract

- `WorldTickThinShell` owns the 100 ms cadence.
- `TickSystemRegistry` owns deterministic execution order.
- Core tick systems are registered through `registerCoreTickSystems()`.
- `WorldBrainTickSystem` is registered by `WorldTickThinShell` with runtime ports.
- Equal-priority systems are ordered by stable system identity (`id`/`name`).
- `WorldStateProvider` remains the source for tick context world slices.
- `RuntimeWorldBrainStatePort` remains the source for active world-brain chunks and 13-layer state.
- No empty world-state fallback is allowed in the truth path.

## Registered Runtime Systems

| System | Runtime Source | Priority | Notes |
|--------|----------------|----------|-------|
| `oracle` | `server/src/core/are/OracleTickSystem.ts` | `INFRASTRUCTURE` | Reads tick context world state and produces oracle report/prophecies |
| `ouroboros` | `server/src/core/are/OuroborosTickSystem.ts` | `NPC` | Runs on 10-tick heartbeat cadence and reads NPC/player slices from tick context |
| `world-brain` | `server/src/core/are/WorldBrainTickSystem.ts` + `WorldBrainRuntimePort.ts` | `25` | Reads active chunks/layers, commits deterministic deltas, writes snapshots to `SnapshotComposer`, and records replay/persistence through `LayerPersistenceQueue` |

## WorldBrain Runtime Chain

```text
WorldTickThinShell.tick()
  -> create TickSystemContext
  -> merge WorldStateProvider slices
  -> TickSystemRegistry.executeAll(context)
  -> WorldBrainTickSystem.tick(context)
  -> RuntimeWorldBrainStatePort.commitWorldBrainDelta(delta)
  -> SnapshotComposerWorldBrainSink.includeWorldBrainChunk(...)
  -> LayerPersistenceWorldBrainReplaySink.recordWorldBrainDelta(...)
```

## Validation

Covered by:

- `server/src/core/WorldTickPolicy.guard.ts`
- `server/src/core/are/__tests__/TickSystemRegistration.test.ts`
- `server/src/core/are/__tests__/WorldBrainRuntimeTruth.test.ts`
- `TickSystemRegistry.getRegistrationSnapshot()` for deterministic inspection

## Non-Goals

This PR does not add blocking persistence I/O to the tick path. `LayerPersistenceQueue` remains write-behind and non-blocking. Chunks become active through `WorldTickThinShell.registerChunk()` and evolve through deterministic `WorldBrainTickSystem` deltas.
