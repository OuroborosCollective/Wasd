# ARE Core Reality Standard

Tags: `are`, `core-reality`, `determinism`, `tick-system`, `2d`
Status: `canonical-standard`

This page is the wiki form of the Areloria code truth manifest.

```text
Kein Snapshot, kein Spiel.
Kein Tick, keine Wahrheit.
Kein Guard, keine Architektur.
Kein /2d Proof, keine Integration.
```

---

## Canonical chain

```text
server-authoritative input
→ deterministic tick
→ canonical delta
→ replay/state hash
→ SnapshotComposer or runtime manifest
→ /2d client observer
→ guard/test/workflow
```

Anything outside this chain is either a prototype, an adapter, a diagnostic side-channel, or unfinished work.

---

## New module rule

New modules follow:

```text
Types
→ Ports
→ TickSystem
→ Delta
→ Replay sink
→ Snapshot/manifest sink
→ /2d proof if player-visible
→ Tests
→ Docs
```

Never implement new gameplay as a direct `WorldTick.ts` patch.

---

## Forbidden in authoritative logic

```text
Math.random()
Date.now()
new Date()
performance.now()
randomUUID()
external API timing
client-authored gameplay mutation
```

Use TickId, KappaInt, StateHash, DeterministicPrng, stable sorted traversal and explicit replay input instead.

---

## Spatial truth

```text
simulationRadiusChunks = 2 → 5×5 interest/simulation
broadcastRadiusChunks  = 1 → 3×3 client broadcast
```

Both come from `UnifiedChunkContract`.

---

## Kappa truth

```text
1 world unit = 1000 Kappa
1 chunk side = 64,000 Kappa
1 chunk plane = 4,096,000,000 Kappa cells
```

Boundary decimal adapters may round into Kappa. Internal state must already be integer.

---

## See also

- [[Home]]
- [[WorldTick and 10Hz Simulation|WorldTick-and-10Hz-Simulation]]
- [[Determinism]]
- [[Systems Architecture|Systems_Architecture]]
- [[Implementation Map|Implementation-Map]]
