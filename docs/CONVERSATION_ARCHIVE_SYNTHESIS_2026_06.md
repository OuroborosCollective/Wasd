# Conversation Archive Synthesis — June 2026

This document summarizes the useful technical information extracted from local `conversation_*.zip` archives reviewed on 2026-06-10. It intentionally excludes raw chat logs, secrets, credentials, private tokens and temporary agent chatter.

The goal is to preserve project-relevant engineering knowledge in a form that future agents can actually use.

## Reviewed archive shape

The imported ZIPs contained thousands of event records from agent sessions, including user requests, terminal/file observations, PR summaries, CI failures and route/refactor notes.

Recurring subject clusters:

```text
WorldTick migration
TickSystemRegistry and WorldTickScheduler
WorldBrainTickSystem
TickSystemContextProvider for HTTP routes
Kappa math correction
UnifiedChunkContract and ObserverEngine conflict
ChunkKey / KappaInt branded type errors
Route migration to deterministic tick context
ARE determinism and architecture lint gates
README/wiki sync and documentation automation
```

## High-value extracted facts

### 1. WorldTick migration is the dominant architecture pressure

The archives repeatedly show the same correction: do not use `server/src/core/WorldTick.ts` as the new extension point.

Observed old pattern:

```text
route or module reaches into WorldTick
route reads tickCount directly
WorldTick grows more domain imports
WorldBrain runs as special case after registry
```

Correct pattern:

```text
WorldTickScheduler owns logical stepping only
TickSystemRegistry orders systems
WorldBrain is WorldBrainTickSystem
routes use TickSystemContextProvider or snapshot/read ports
SnapshotComposer exposes truth
```

### 2. Phase 11 route migration matters

The archives document Phase 11 route integration through `TickSystemContextProvider`.

Routes called out as migrated or requiring the same pattern:

```text
gameplaySnapshot.ts
onboardingRoute.ts
questEventRoute.ts
lootRoutes.ts
inventoryRoute.ts
craftingRoute.ts
equipmentRoute.ts
resourceGatherRoute.ts
skillEventRoute.ts
selfHealWorkshopRoute.ts
areHeartbeat.ts
areReplayRoute.ts
manifestResyncRoute.ts
```

Rule: HTTP routes must not depend on legacy `WorldTick.tickCount`. They should use deterministic tick context and server-resolved player identity.

### 3. Kappa math was corrected

Correct values:

```text
CHUNK_SIZE_TILES = 64 per side
CHUNK_SIZE_KAPPA = 64,000 per side
Kappa cells per chunk plane = 64,000 × 64,000 = 4,096,000,000
```

Do not regress to the old mistaken `4,096 Kappa cells` wording. `4,096` is logical tile count, not Kappa-cell count.

### 4. Chunk radius conflict was resolved conceptually

The archives identify the old mismatch:

```text
ObserverEngine.viewDistanceChunks = 2 → 5×5 simulation interest
SpatialBroadcastGrid = 3×3 broadcast envelope
```

Correct resolution:

```text
UNIFIED_CHUNK_CONTRACT.simulationRadiusChunks = 2
UNIFIED_CHUNK_CONTRACT.broadcastRadiusChunks = 1
```

Observer, broadcast and active-chunk logic must use this contract instead of local constants.

### 5. Core audit baseline improved, but remaining debt is known

Captured audit trajectory:

```text
Before: 2 PASS, 5 FAIL, 1 PARTIAL
After:  4 PASS, 3 FAIL, 1 PARTIAL
```

Remaining themes:

```text
worldtick_domain_imports must shrink
any_unknown_in_core must be reduced
non_deterministic_apis must be eliminated from simulation-critical paths
snapshot_fields_origin needs full proof
```

Do not hide these failures. Track them as phase work.

### 6. Branded types are useful but require test discipline

Repeated TypeScript failures involved branded values such as `ChunkKey`, `KappaInt`, `TickId` and `StateHash`.

Tests should use local helper functions instead of `as any`:

```ts
function ck(value: `${number}:${number}`): ChunkKey {
  return value as ChunkKey;
}

function k(value: number): KappaInt {
  if (!Number.isSafeInteger(value)) throw new Error(`Invalid KappaInt: ${value}`);
  return value as KappaInt;
}
```

Strict branded types are part of the architecture, not an annoyance to bypass.

### 7. `createKappaFromDecimal` must round to nearest Kappa

Boundary adapter semantics are backward-compatible:

```text
3.14159 → 3142
3.4999  → 3500
```

Therefore `createKappaFromDecimal` / boundary world-unit conversion must use nearest-Kappa rounding. After boundary conversion, core state must remain integer Kappa.

### 8. External LLM/API services are adapters, not truth

Archives mention possible free LLM/API providers for presentation or assistant layers. They may be useful only outside authoritative tick causality.

Allowed:

```text
external adapter
→ sanitized event
→ deterministic TickSystem consumes event
→ replay/snapshot proof
```

Forbidden:

```text
TickSystem.tick()
→ external API call
→ state mutation from response timing/content
```

### 9. Wiki sync is already the right kind of automation

The correct wiki flow is:

```text
README.md / docs/** / docs/wiki/** / scripts/wiki/** changes
→ build autonomous wiki into .wiki-build
→ sync .wiki-build into GitHub wiki
```

A workflow that copies only `docs/wiki/**` is insufficient. The current workflow should keep build-before-sync behavior.

## Practical migration map

| Old pressure | New canonical response |
| --- | --- |
| More logic in `WorldTick.ts` | Add or register a `TickSystem` |
| Route needs tick | Use `TickSystemContextProvider` |
| Module needs randomness | Use deterministic seed/hash/PRNG |
| Module needs persistence | Emit delta, queue write-behind side effect |
| Client needs state | Read snapshot or runtime manifest |
| New asset pack | Quarantine-first intake pipeline |
| New gameplay system | Types → Ports → TickSystem → Delta → Replay/Snapshot → /2d proof |
| CI fails | Current head only, fetch log, smallest patch |

## Security notes

The archives may contain operational context and references to credentials or tokens. This synthesis does not include those values. Treat historical secrets as potentially compromised and rotate them through the appropriate provider/VPS process.

Never commit:

```text
raw conversation zips
raw event json logs
tokens
API keys
VPS passwords
.env files
private URLs
private asset license material
```

## Final working rule

```text
Old conversations are useful as evidence.
Active code and canonical docs are the source of truth.
The correct output is deterministic code, replayable state, snapshot proof, /2d visibility and green guardrails.
```
