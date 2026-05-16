# ARE Determinism Classification

This document classifies the first findings from PR #765 (`ci(are): add deterministic runtime gate`) and defines the safe migration order.

The goal is not to delete every `Date.now()`, `new Date()`, or `Math.random()` in the repository. The goal is to protect ARE-critical simulation from nondeterministic host time and process-local randomness.

## Classification levels

| Level | Meaning | Required action |
|---|---|---|
| A | Simulation-affecting gameplay result | Replace with injected `AREClock` / `ARERng` before gate merge |
| B | Simulation-adjacent state timestamp | Prefer injected `AREClock`; temporary reviewed marker allowed only if not used for gameplay branching |
| C | Runtime, observability, health, logging, or local repair telemetry | Keep system time; add reviewed exception marker if scanned |
| D | UI/demo/test/local-dev only | Exclude from critical gate paths |

## First gate findings

### Level A: migrate first

These directly affect combat, loot, warfront, or oracle output and must become deterministic.

- `server/src/core/systems/CombatSystem.ts`
  - critical rolls
  - loot drop rolls
  - item amount rolls
  - item id random suffixes
- `server/src/modules/loot/LootSystem.ts`
  - drop chance rolls
  - count rolls
  - gold rolls
- `server/src/modules/loot/diabloItemGen.ts`
  - affix/stat rarity rolls
- `server/src/modules/loot/diabloTreasure.ts`
  - treasure table selection and gold rolls
- `server/src/modules/loot/itemEnchant.ts`
  - enchant target/affix selection
- `server/src/modules/loot/smartLoot.ts`
  - weighted selection
- `server/src/modules/oracle/OracleEngine.ts`
  - prophecy/vision selection

### Level B: migrate carefully

These use wall-clock time for world or player state. They should use injected `AREClock`, but some already accept `now` parameters and only need default-source cleanup.

- `server/src/modules/warfront/WarfrontSystem.ts`
  - default `now = Date.now()` values
  - cycle ids and season windows
- `server/src/core/WorldBossDungeonSystem.ts`
  - current-time helper
- `server/src/core/state/RegionState.ts`
  - sync timestamp
- `server/src/core/state/WorldStateRegistry.ts`
  - sync timestamp
- `server/src/core/GameStateManager.ts`
  - state payload timestamps
- `server/src/core/PayloadFactory.ts`
  - payload timestamps
- `packages/core-logic/src/agent/Orchestrator.ts`
  - memory ids and timestamps; classify by whether memory affects simulation decisions
- `server/src/core/AIOrchestrator.ts`
  - task reset and timeout loops; classify by whether it gates simulation work
- `server/src/core/systems/EvolutionSystem.ts`
  - directive ids based on wall-clock time

### Level C: allow or move out of critical scan

These are runtime/ops/self-healing telemetry. They can use wall-clock time because their job is to observe the live process, not to produce deterministic simulation results.

- `server/src/core/api/APIServer.ts`
  - health/API timestamp
- `server/src/core/logger/Logger.ts`
  - log timestamp
- `server/src/core/integrity/OuroborosAnchor.ts`
  - integrity event timestamp, unless used as simulation seed
- `server/src/core/liveheal/**`
  - anomaly timing
  - cooldowns
  - patch ids
  - learning-store retention
  - healing durations

## Migration order

1. Add deterministic primitives: `AREClock`, `ARERng`, seeded RNG factory.
2. Migrate Level A loot/combat/oracle rolls.
3. Migrate Warfront default wall-clock sources to injected clock or explicit tick time.
4. Narrow the gate to Level A/B paths, or add explicit `@are-determinism-allow` markers for Level C files.
5. Re-run PR #765 or replace it with a gate that reflects this classification.

## Default seed guidance

For simulation results, derive seeds from stable game facts, not wall-clock time:

```text
worldSeed | regionId | chunkId | tick | attackerId | targetId | tableId | cycleId
```

Good examples:

```text
combat|region-12|tick-9912|player-a|npc-b
loot|region-12|tick-9912|npc-b|table-goblin
warfront|warfront_cycle_20514|sector-combat
oracle|region-12|cycle-20514|pressure-high_conflict
```

Bad examples:

```text
Date.now()
Math.random()
process uptime
hostname
container id
```

## Rule

The ARE engine may observe wall-clock time at system boundaries, but deterministic simulation decisions must receive time/randomness as explicit inputs.
