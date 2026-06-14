# Areloria WASD

**Areloria WASD** is a browser-native deterministic MMORPG engine and living-world simulation platform.

The current release path is **2D-first**: a server-authoritative Node.js game server, a Pixi-style `/2d` client surface, Cyber-Zen/Stitch UI panels, deterministic 10Hz gameplay rules, NPC memory/reputation/rumor systems, resource economy loops, and a quarantine-first asset intake pipeline for generated 2.5D sprite atlases.

The 3D client remains part of the repository, but it is not the active release gate unless a task explicitly says otherwise.

![Node.js](https://img.shields.io/badge/Node.js-22.x-green)
![Runtime](https://img.shields.io/badge/runtime-deterministic_10Hz-blue)
![Client](https://img.shields.io/badge/client-2D_first-cyan)
![Simulation](https://img.shields.io/badge/simulation-ARE_logic-purple)
![License](https://img.shields.io/badge/license-proprietary_all_rights_reserved-red)
<img alt="open collective badge" src="https://opencollective.com/ouroboros-collective-are/tiers/backers/badge.svg?label=backer&color=brightgreen" />

> This repository is proprietary. It is not MIT licensed. See [License and usage policy](#license-and-usage-policy).

---

## Core truth

Areloria is developed under this technical rule:

```text
Kein Snapshot, kein Spiel.
Kein Tick, keine Wahrheit.
Kein Guard, keine Architektur.
Kein /2d Proof, keine Integration.
```

A feature is considered real only when it is visible or verifiable through the active runtime path, server state, generated manifest, replay/state hash, or CI/smoke test. Detached demos do not count as production integration.

Canonical server flow:

```text
client intent
→ server validation
→ deterministic TickSystem
→ canonical delta
→ AREReplayBuffer / StateHash
→ SnapshotComposer or runtime manifest
→ /2d observer rendering
→ guard/test/workflow protection
```

`server/src/core/WorldTick.ts` is legacy mass, not the new extension point. New systems must target `WorldTickScheduler`, `TickSystemRegistry`, ports, deltas, replay sinks and snapshot/runtime-manifest output.

For agent-assisted GitHub work, PR review, CI interpretation, issue closure, and merge discipline, use the [Areloria Green-State Agent Playbook](docs/AGENT_GREEN_STATE_PLAYBOOK.md).

---

## Current project state

Areloria is no longer only a shell or prototype. The repository now contains a playable deterministic browser-MMORPG foundation with these active layers:

```text
/2d runtime path
server-authoritative gameplay snapshots
TickSystemRegistry and WorldTickScheduler foundation
WorldBrainTickSystem as subsystem, not scheduler owner
TickSystemContextProvider for deterministic HTTP route context
resource gather/process/sell economy loop
NPC resource quest loop
Cyber-Zen NPC dialogue and reputation UI
persistent NPC memory and deterministic rumor summaries
Stitch 2.5D atlas intake pipeline
VPS-oriented Docker deployment path
```

Recent high-value systems:

| Area | Current status |
| --- | --- |
| Runtime client | `/2d` is the primary proof path; 3D is not the current release blocker |
| Server tick | 10Hz deterministic server-authoritative gameplay model via scheduler/registry migration |
| Route tick context | HTTP routes should use `TickSystemContextProvider`, not legacy tick internals |
| Economy | resource gathering, processing/crafting, selling, wallet/XP progression |
| NPC quests | Mira / village supply style NPC resource quest loop |
| NPC social layer | reputation, memory, persisted memory state and rumor network |
| UI style | Cyber-Zen / Arelorian Stitch dark-neon HUD language |
| Assets | Stitch 2.5D sprite atlas intake, manifest generation and quarantine-first QA |
| Deployment | VPS-oriented flow; production Docker file is `Dockerfile.vps` |

---

## Vision

Areloria is not designed as a simple web game shell. It is an attempt to build a mathematically disciplined, deterministic living-world engine for a browser MMORPG.

The world should feel inhabited rather than merely scripted. NPCs are future citizens, workers, traders, witnesses, political actors, enemies, allies, informants, settlers, rulers, rebels, and memory-bearing participants in a simulated civilization.

The long-term target is an emergent AI population governed by deterministic server logic:

- NPCs remember local events.
- NPCs react to player history.
- Villages, towns, cities, kingdoms, and lands can emerge from rules.
- Trade routes, taxes, elections, wars, scarcity, migration, and resource pressure become systemic forces.
- Oracle/prophecy systems observe repeated patterns and expose transparent world-thought to players.
- Simulation remains bounded by tick cadence, chunk observation, and replayable deterministic inputs.

Areloria is therefore both a game project and a simulation architecture project.

---

## Core principles

### 1. Server authority is non-negotiable

Gameplay state follows this chain:

```text
client sends intent
server validates
server mutates
server emits snapshot/event
client renders
```

The client must not authoritatively mutate inventory, wallet, equipment, character stats, quest state, combat, loot, NPC memory, reputation, rumor state, economy state, or persistence state.

Failed validation must not partially mutate state.

### 2. Determinism rules the simulation

Gameplay state must be reproducible from explicit inputs. Simulation code must not depend on process-local randomness or hidden wall-clock state.

Forbidden in gameplay/simulation causality:

```text
Math.random()
Date.now()
new Date()
performance.now()
randomUUID()
process uptime as gameplay input
host/container identity as gameplay input
unordered iteration where order changes state
external API timing as simulation input
```

Use instead:

```text
TickId / logicalIndex
KappaInt / branded core types
StateHash
DeterministicPrng
ARE clock/time adapters
stable seeds from world facts
content hashes for generated assets
row-major frame order for atlases
stable sorted traversal
stable JSON formatting
explicit replay input
```

Good seed parts:

```text
worldSeed | regionId | chunkId | tick | actorId | targetId | tableId | cycleId
```

### 3. ARE logic is the governing model

Areloria is built around the project’s ARE logic model: an axiomatic deterministic rule system intended to govern simulation flow, replayability, causality, pressure, observation, and bounded emergence.

Within this repository, ARE is treated as the governing logic layer for:

- deterministic time,
- deterministic randomness,
- world pressure,
- causal mutation,
- replay-safe state transitions,
- region and chunk rule enforcement,
- oracle/brain interpretation,
- protected simulation boundaries.

The broader ARE theory, formula language, manuscripts, trademarks, research notes, and commercial/political/industrial usage rights are reserved by the rights holder and are not granted by this repository.

### 4. Observation bounds reality

The world should not simulate every possible place at full cost forever.

```text
Only observed or relevant regions receive expensive simulation.
Unobserved regions decay, summarize, or sleep.
```

Spatial truth must come from `UnifiedChunkContract`:

```text
simulationRadiusChunks = 2 → 5×5 simulation/interest envelope
broadcastRadiusChunks  = 1 → 3×3 client broadcast envelope
```

### 5. The 10Hz server tick is sacred

The authoritative server loop is designed around deterministic 10Hz logic.

Systems must declare:

- cadence,
- maximum work per tick,
- chunk/region scope,
- deterministic seed/time source,
- failure behavior,
- feature flag or registry entry,
- telemetry side-channel, if any.

No system may dump unbounded scans into the tick.

### 6. Protected structures stay protected

Areloria’s civilization and monetization design includes player-built assets and potentially paid construction energy.

Default rule:

```text
If uncertain, do not damage the structure.
```

NPCs, swarms, bosses, decay systems, watchdogs, and world events must not damage or destroy player-built, paid, or protected structures unless an explicit reviewed policy allows it.
