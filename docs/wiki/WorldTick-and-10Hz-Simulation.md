# WorldTick and 10Hz Simulation

Tags: `10hz`, `tick-system`, `scheduler`, `determinism`, `server`
Status: `migration-anchor`

This page records the current 10Hz simulation rule. Historical references to `WorldTick` must be interpreted through the current refactor:

```text
WorldTickScheduler
→ TickSystemRegistry
→ ordered TickSystem modules
→ AREReplayBuffer
→ SnapshotComposer
→ WriteBehindPersistenceQueue
```

`server/src/core/WorldTick.ts` may still exist as a legacy compatibility surface, but it is not the canonical extension point for new logic.

---

## Prime rule

```text
Kein Snapshot, kein Spiel.
Kein Tick, keine Wahrheit.
Kein Guard, keine Architektur.
Kein /2d Proof, keine Integration.
```

---

## Why 10Hz matters

A fixed 10Hz tick keeps authoritative gameplay reproducible:

- combat timing,
- NPC decisions,
- resource updates,
- economy and quest events,
- world-brain pressure,
- replay verification,
- snapshot production.

Rendering may interpolate. Server truth changes only through deterministic tick boundaries.

---

## Canonical scheduler order

```text
WorldTickScheduler 10Hz
  → TickSystemRegistry
    1. InputTickSystem
    2. SpatialInterestTickSystem
    3. ResourceEconomyTickSystem
    4. NpcMemoryRumorTickSystem
    5. WorldBrainTickSystem
    6. SnapshotComposerTickSystem
  → AREReplayBuffer
  → WriteBehindPersistenceQueue
```

The World Brain is a TickSystem. It must not control the scheduler directly.

---

## Tick boundary rule

Core simulation should prefer:

```text
TickId
logicalIndex
KappaInt
ChunkKey
StateHash
explicit seed
stable sorted traversal
```

and avoid hidden dependencies on:

```text
Date.now()
new Date()
Math.random()
performance.now()
external API timing
unordered map/object iteration where order changes state
```

---

## HTTP route tick context

HTTP routes that need tick awareness should use `TickSystemContextProvider` or sanctioned read ports, not `WorldTick.tickCount`.

Canonical route response shape:

```json
{
  "ok": true,
  "result": {},
  "tickContext": {
    "tickId": 123,
    "tickIndex": 123,
    "worldTimeHours": 2.95,
    "tickTimestamp": 12300,
    "seedHash": "..."
  }
}
```

---

## Kappa / chunk math note

Do not confuse logical tiles with Kappa cells.

```text
chunk side = 64 logical tiles
Kappa scale = 1000
chunk side = 64,000 Kappa
chunk Kappa plane = 64,000 × 64,000 = 4,096,000,000 Kappa cells
```

---

## Spatial radius contract

The old conflict is resolved by naming two different envelopes:

```text
simulationRadiusChunks = 2 → 5×5 simulation/interest envelope
broadcastRadiusChunks  = 1 → 3×3 client broadcast envelope
```

Both must come from `UnifiedChunkContract`.

---

## Implementation anchors

| Path | Meaning |
| --- | --- |
| `server/src/core/are/WorldTickScheduler.ts` | thin logical scheduler |
| `server/src/core/are/TickSystemRegistry.ts` | deterministic system ordering |
| `server/src/core/are/TickSystem.ts` | subsystem contract |
| `server/src/core/are/TickSystemContextProvider.ts` | deterministic route tick context |
| `server/src/core/are/WorldBrainTickSystem.ts` | 13-layer brain as TickSystem |
| `server/src/core/are/SnapshotComposer.ts` | snapshot truth output |
| `server/src/core/are/AREReplayBuffer.ts` | replay/delta evidence |
| `server/src/core/spatial/UnifiedChunkContract.ts` | canonical spatial constants |

---

## Agent rules

When editing tick logic:

1. do not add new domain logic to `server/src/core/WorldTick.ts`,
2. add or modify a `TickSystem`,
3. read and write through ports,
4. emit replayable deltas,
5. feed snapshot/manifest output,
6. prove through tests or `/2d` where player-visible,
7. document new rules in current docs/wiki.

---

## See also

- [[Home]]
- [[ARE Core Reality Standard|ARE-Core-Reality-Standard]]
- [[Determinism]]
- [[Systems Architecture|Systems_Architecture]]
- [[Implementation Map|Implementation-Map]]
- [[Glossary]]
