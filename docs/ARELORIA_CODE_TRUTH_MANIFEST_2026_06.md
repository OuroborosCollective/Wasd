# ARELORIA Code Truth Manifest — June 2026

This document is a technical constitution for Areloria/WASD. It is not a raw conversation log, not a spiritual text, and not a speculative theory dump. It is a repo-safe distillation of the architecture rules repeatedly proven by code, audits, PRs, CI failures, and conversation exports.

Use it as the first filter for future implementation work. If this document conflicts with active code and current tests, update the code or this document explicitly; do not silently invent a third path.

## Prime rule

```text
Kein Snapshot, kein Spiel.
Kein Tick, keine Wahrheit.
Kein Guard, keine Architektur.
Kein /2d Proof, keine Integration.
```

## Core reality chain

A gameplay or world-system feature is real only when it follows this chain:

```text
server-authoritative input
→ deterministic 10Hz tick / TickSystem
→ canonical state mutation as delta
→ StateHash / replay evidence
→ SnapshotComposer or runtime manifest
→ /2d client renders as observer
→ guard/test/workflow protects against regression
```

Detached previews, isolated services, local-only UI, unobserved mocks, and routes that do not feed snapshot or manifest are not production integration.

## WorldTick is not the new truth

`server/src/core/WorldTick.ts` is legacy mass. It may still exist as a compatibility shell until migration completes, but it is not the canonical extension point for new systems.

Canonical direction:

```text
WorldTickScheduler
→ TickSystemRegistry
→ ordered TickSystem modules
→ AREReplayBuffer
→ SnapshotComposer
→ WriteBehindPersistenceQueue
```

New modules must not import or expand `WorldTick.ts`. They must implement `TickSystem`, read through ports, emit deterministic deltas, and feed replay/snapshot sinks.

## Current canonical scheduler order

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

The World Brain is a subsystem, not a scheduler owner.

## Kappa truth

Kappa is not decorative terminology. It is the integer coordinate contract.

```text
1 world unit = 1000 Kappa
1 chunk side = 64 world units = 64,000 Kappa
1 chunk plane = 64,000 × 64,000 = 4,096,000,000 Kappa cells
```

Do not confuse `64 × 64 = 4,096 logical tiles` with `64,000 × 64,000 Kappa cells`.

Decimal values may appear only at boundaries. Boundary adapters such as `createKappaFromDecimal` must round to nearest Kappa for compatibility. Internal simulation state must already be integer Kappa.

## Determinism law

Forbidden in gameplay causality:

```text
Math.random()
Date.now()
new Date()
performance.now()
randomUUID()
external API timing
process uptime as gameplay input
host/container identity as gameplay input
unordered iteration where order mutates state
```

Use instead:

```text
TickId
logicalIndex
StateHash
DeterministicPrng
content hash
stable seed parts
stable sorted traversal
row-major atlas order
explicit replay input
```

Telemetry may use wall-clock time only when it is a side channel and cannot feed gameplay, replay, snapshot truth, loot, economy, NPC state, or persistence semantics.

## Spatial truth

The old observer/broadcast split caused confusion. The correct interpretation is:

```text
simulationRadiusChunks = 2 → 5×5 interest/simulation envelope
broadcastRadiusChunks  = 1 → 3×3 client broadcast envelope
```

Both values must come from `UnifiedChunkContract`, not from local constants or ad-hoc radius math.

## Persistence truth

Persistence is not reality. Tick state is reality.

```text
Tick produces truth
Replay/EventLog proves transition
Snapshot exposes truth
Persistence writes asynchronously
```

Database, filesystem, API storage, analytics and logs are side effects. They must not block or define the 10Hz canonical simulation.

## Route migration rule

HTTP routes must not reach into `WorldTick.tickCount` or assume old loop internals. Routes that need tick context use `TickSystemContextProvider` or canonical snapshot/read ports.

Good route output includes explicit deterministic tick context when needed:

```json
{
  "ok": true,
  "result": {},
  "tickContext": {
    "tickId": 123,
    "worldTimeHours": 2.95,
    "seedHash": "..."
  }
}
```

## External AI / LLM boundary

External AI, free LLM endpoints, oracle adapters, and helper services may assist presentation, diagnostics, suggestions, or non-authoritative text. They must not inject hidden simulation impulses.

Allowed shape:

```text
adapter outside tick
→ explicit sanitized input event
→ deterministic TickSystem handles state consequence
→ snapshot exposes result
```

Forbidden shape:

```text
TickSystem calls external API
external timing/response mutates state
client receives non-replayable truth
```

## Asset truth

Stitch/generated assets follow quarantine-first intake:

```text
raw input
→ deterministic inspect/classify/validate
→ accepted/manual_review/quarantine
→ stable runtime manifest
→ /2d preview/proof
```

Manifest entries must use stable source paths, sorted IDs, row-major frame order, and no `/tmp/...` runtime references.

## Required eight-question check before code

Before emitting or merging code, answer:

```text
1. Is it server-authoritative?
2. Is it deterministic and reproducible?
3. Does core state use integer/Kappa types?
4. Is every mutation traceable by replay/event/state hash?
5. Does it flow into SnapshotComposer or runtime manifest?
6. Is it visible/provable in /2d where player-visible?
7. Do guards/tests/workflows protect it?
8. Did it avoid old WorldTick, dead 3D gates, wrong Docker paths and secrets?
```

## CI and guard truth

`guard:all` must protect current architecture without blocking intentionally-red baseline audits unless the repo explicitly switches that audit to hard-fail mode.

A red baseline is useful only when it is documented, tracked, and non-blocking until the remediation phase is ready.

## Security hygiene

Conversation ZIPs and agent logs are source material only. Never commit raw conversation exports. Never commit credentials, server passwords, API keys, tokens, private URLs, env files, or provider secrets.

When imported history mentions secrets, rotate them outside this repo instead of documenting values.
