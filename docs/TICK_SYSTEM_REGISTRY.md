# Tick System Registry Truth Path

## Purpose

The ARE runtime tick path uses `WorldTickThinShell` as a 10-Hz coordinator. Domain logic must run through registered `TickSystem` implementations, not through ad-hoc imports inside the tick loop.

## Runtime Contract

- `WorldTickThinShell` owns the 100 ms cadence.
- `TickSystemRegistry` owns deterministic execution order.
- Core tick systems are registered through `registerCoreTickSystems()`.
- Registration is idempotent per registry instance.
- Equal-priority systems are ordered by stable system identity (`id`/`name`).
- `WorldStateProvider` remains the runtime source for world slices.
- No empty world-state fallback is allowed in the truth path.

## Core Registration Order

Current core bootstrap order:

1. `oracle`
2. `ouroboros`

Execution order is still controlled by priority first, then stable identity. This means bootstrap order is not used as hidden scheduler behavior.

## Registered Core Systems

| System | Runtime Source | Priority | Notes |
|--------|----------------|----------|-------|
| `oracle` | `server/src/core/are/OracleTickSystem.ts` | `INFRASTRUCTURE` | Reads tick context world state and produces oracle report/prophecies |
| `ouroboros` | `server/src/core/are/OuroborosTickSystem.ts` | `NPC` | Runs on 10-tick heartbeat cadence and reads NPC/player slices from tick context |

## Validation

Covered by:

- `server/src/core/WorldTickPolicy.guard.ts`
- `server/src/core/are/__tests__/TickSystemRegistration.test.ts`
- `TickSystemRegistry.getRegistrationSnapshot()` for deterministic inspection

## Non-Goals

This PR does not move `WorldBrainScheduler` into the registry yet. `WorldTickThinShell` already runs it directly as part of the existing world-brain truth path. Moving it into a `WorldBrainTickSystem` should be a separate PR with canonical state ports and snapshot sinks wired to real runtime sources.
