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
| `failure-family-probe` | `server/src/core/are/TickFailureFamilyProbeSystem.ts` | `BACKGROUND` | Idle by default. Admin-triggered diagnostic cases execute inside real tick slots and are the only system allowed to use same-context rerun. The probe never mutates gameplay state. |

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

## 10-Hz Failure-Family Contract

Failures are derived where they occur, not reconstructed later from console strings.

```text
100ms scheduler slot
  -> WorldStateProvider merge
     -> runtime_source failure evidence (provider id retained)
  -> TickSystemRegistry.executeAll(context)
     -> system exception
     -> deterministic family + SHA-256 fingerprint derivation
     -> derivation rerun against identical failure input
     -> optional execution rerun ONLY if descriptor says safe_same_context_once
  -> snapshot finalize
  -> persistence queue tick
```

The runtime families are:

- `runtime_source`
- `system_exception`
- `state_invariant`
- `determinism`
- `persistence`
- `ordering`
- `unknown` (fail-closed fallback only)

Every record carries the real tick, origin stage, system/provider identity when available, normalized error code/message, deterministic fingerprint, first/last tick, occurrence count, derivation-rerun result and execution-rerun outcome.

### Organic runtime health vs diagnostic evidence

A deliberate probe failure is marked `origin = diagnostic_probe`; an organic server failure is `origin = runtime`.

`TickFailureFamilySnapshot` keeps both views:

- `runtimeOccurrences` / `runtimeFamilies` — organic failures only.
- `diagnosticOccurrences` / `diagnosticFamilies` — deliberate failure-family runs only.
- `totalOccurrences` / `families` — combined evidence ledger.
- `status` — derived from organic runtime failures only. A pure diagnostic run cannot turn a clean server into `observed`.
- `lastHealthyTick` — continues to advance through ticks that contain only diagnostic-probe failures.
- `lastRuntimeFailureTick` — ignores diagnostic exercises.

The fingerprint includes the origin class, so an injected diagnostic case cannot aggregate into a later organic production failure even when code/message/family happen to match.

### Rerun safety

Authoritative TickSystems default to `failurePolicy.rerun = "never"`. This is deliberate: a thrown system may already have partially mutated gameplay state, so blindly running it twice could duplicate inventory, combat, economy or persistence effects.

A same-context execution rerun is allowed only for a system explicitly registered with:

```ts
failurePolicy: { rerun: "safe_same_context_once" }
```

At present this is reserved for `failure-family-probe`, whose only mutable data is its private diagnostic queue. Production gameplay systems are not automatically retried. A regression test scans the actual registry snapshot and requires every non-probe system to remain `never`.

Rerun outcomes are explicit:

- `recovered` — the retry completed.
- `reproduced` — retry failed with the same deterministic fingerprint.
- `changed_failure` — retry failed differently, which is itself important evidence.
- `not_eligible` — no execution rerun was allowed.

### Failure derivation precedence

Hard boundary stages (`world_state`, `persistence_tick`) retain their origin family even when the thrown error has no explicit code. Generic snapshot-finalize errors derive as `state_invariant`, while an explicit determinism code remains `determinism`.

`SYSTEM_EXCEPTION` is a fallback code, not a forced family. Untyped system errors are first inspected for stronger signals such as world-hash/replay divergence, persistence/database failure, ordering/dependency failure, or non-finite/Kappa invariant violations. Only otherwise do they remain `system_exception`.

### Scheduled boundary behavior

Direct `WorldTickThinShell.tick()` remains fail-hard for missing runtime truth. The repeating 100 ms scheduler catches that exception only after the failure has been recorded. It never substitutes empty or previous world state. The failed tick remains consumed and the next scheduler slot gets the next tick id.

For a scheduled boundary failure, logs contain only safe correlation evidence:

```text
tick + stage + family + fingerprint
```

The raw error message is not repeated in this boundary correlation line.

### Operator-triggered family run

Admin-authenticated operators can arm the runtime exercise through:

```text
POST /api/are/validation/failure-families/run
GET  /api/are/validation/failure-families/status
```

The POST only arms the queue. Cases execute on subsequent real 10-Hz tick slots. The default run covers runtime-source, state-invariant, determinism, persistence, ordering and transient-system failure families. It cannot mutate gameplay state.

The status response includes `runRecords`, filtered to the current/most-recent `probe.runId`. Stable fingerprints still aggregate across repeated runs, while each record preserves both first-run provenance (`runId`, `caseId`) and latest-run provenance (`lastRunId`, `lastCaseId`). This allows an operator to prove a specific rerun without duplicating the underlying failure family.

## Validation

Covered by:

- `server/src/core/WorldTickPolicy.guard.ts`
- `server/src/core/are/__tests__/TickSystemRegistration.test.ts`
- `server/src/core/are/__tests__/WorldBrainRuntimeTruth.test.ts`
- `server/src/core/are/__tests__/TickFailureFamilyRuntime.test.ts`
- `server/src/core/are/__tests__/TickFailureFamilyHeuristics.test.ts`
- `server/src/core/are/__tests__/TickSystemFailureRerun.test.ts`
- `server/src/core/are/__tests__/TickFailureFamilyProbeSystem.test.ts`
- `server/src/core/are/__tests__/WorldTickFailureBoundary.test.ts`
- `server/src/tests/are-failure-family-route.test.ts`
- `TickSystemRegistry.getRegistrationSnapshot()` for deterministic inspection
- Safe Test Lab runs both the ARE suite and the failure-family route regression.

## Non-Goals

This work does not add blocking persistence I/O to the tick path and does not auto-retry state-mutating gameplay systems. `LayerPersistenceQueue` remains write-behind and non-blocking. Chunks become active through `WorldTickThinShell.registerChunk()` and evolve through deterministic `WorldBrainTickSystem` deltas.
