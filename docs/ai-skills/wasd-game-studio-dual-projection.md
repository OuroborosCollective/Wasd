# WASD AI Skill: Game Studio Dual-Projection Workflow

<!--
type: guide
created: 2026-08-10
owner: rendering-client
status: active
-->

## Purpose

Adapt the installed Game Studio workflow to Areloria WASD without replacing the project's existing renderer choices or weakening ARE truth boundaries.

Game Studio is a development, asset, UI, performance and playtest layer. It is **not** the simulation owner and it must never introduce a second game-state authority.

## Canonical Architecture

Areloria has **one game world** and multiple visual projections of that world.

```text
player input
  -> intent only
  -> authoritative server validation
  -> WorldTickScheduler / TickSystemRegistry (10 Hz)
  -> canonical deterministic delta
  -> replay / StateHash / runtime manifest
  -> projection frame
       |-> PixiJS 2D projection (active release path)
       |-> 3D projection (integrated secondary client)
  -> camera / animation / particles / HUD
```

The renderer may smooth, decorate and animate canonical facts. It may not create authoritative gameplay facts.

## Renderer Policy

### 2D: PixiJS is canonical for the active release path

- Keep `apps/client-2d` on PixiJS + React.
- Do **not** introduce Phaser merely because Game Studio defaults to Phaser for generic 2D games.
- Apply Game Studio's 2D architecture, UI, sprite-pipeline and playtest practices to the existing PixiJS runtime.
- Treat the `/2d` path as the primary production proof surface unless a task explicitly changes the release policy.

### 3D: preserve the integrated WASD 3D stack

- Keep the existing `client/` 3D stack and its current Babylon.js/Three/R3F surfaces unless a task explicitly requests a renderer migration.
- Do **not** reintroduce PlayCanvas.
- Prefer the existing Babylon.js runtime for current 3D work where that is already the live path.
- Use `packages/rendering-bridge` where an engine-neutral renderer boundary is appropriate.
- GLB/glTF remains the preferred shipped 3D asset family.

## One-World Rule

2D and 3D must never become separate simulations.

For the same authoritative world identity and tick, both renderers must consume equivalent world facts:

```text
worldId + tick + chunkId + actorId + canonical delta/state hash
```

Differences are allowed only in presentation:

- camera model
- interpolation curve
- animation blend
- particles
- lighting
- post-processing
- sprite/mesh representation
- HUD layout
- local accessibility settings

Differences are **not** allowed in:

- inventory
- wallet/economy
- combat outcome
- loot outcome
- quest state
- NPC memory/reputation
- ownership
- collision truth
- authoritative position
- tick ordering
- replay/state hash
- persistent world facts

## 10 Hz -> display-rate interpolation

The server remains authoritative at 10 Hz. The client may render at 60 FPS or another display cadence.

Interpolation is presentation-only:

```text
AuthoritativeFrame(tick N)
AuthoritativeFrame(tick N+1)
        |
        +-> VisualFrame(alpha 0..1)
```

Rules:

1. `alpha` must never be written into authoritative state.
2. Interpolated positions must never feed combat, collision, loot, quest or persistence decisions.
3. Server correction replaces visual prediction/interpolation targets immediately according to the renderer policy.
4. Wall-clock values such as `performance.now()` are allowed only in an explicitly non-authoritative presentation/telemetry side channel.
5. Replay or parity tests compare canonical frames, not transient in-between pixels.

## Input Boundary

Physical inputs map to intent actions in one place.

Examples:

```text
WASD / stick -> move_intent
pointer/touch -> target_intent
button 1 -> ability_intent
interact -> interact_intent
```

The client may provide immediate local feedback (button press, cursor, camera motion), but gameplay mutation occurs only after authoritative confirmation.

## Game Studio Routing for WASD

When Game Studio is used on this repository, override its generic defaults as follows:

| Work | WASD route |
| --- | --- |
| 2D gameplay/rendering | PixiJS existing runtime, not Phaser |
| 2D sprites/atlases | Game Studio sprite-pipeline concepts + WASD manifest/intake tools |
| 2D HUD | Game Studio UI guidance + existing React UIManager/Cyber-Zen surfaces |
| 3D runtime | Existing Babylon.js client unless task explicitly targets Three/R3F |
| 3D assets | Game Studio web-3d-asset-pipeline concepts, GLB/glTF |
| Shared architecture | ARE server truth + shared projection contracts |
| QA | Game Studio browser playtest + WASD runtime evidence |
| Performance | renderer-specific probes; never infer simulation correctness from FPS |

## Projection Contract Direction

New cross-render work should converge on a small engine-neutral projection contract in shared code rather than duplicating server interpretation in each renderer.

A target shape is:

```ts
export interface WorldProjectionFrame {
  worldId: string;
  tick: number;
  stateHash: string;
  chunks: readonly ProjectedChunk[];
  entities: readonly ProjectedEntity[];
  events: readonly ProjectedVisualEvent[];
}
```

This structure is a **projection contract**, not saved mutable gameplay state.

The exact schema must be derived from the current canonical snapshot/manifest contracts before implementation. Do not invent fields when an existing canonical type already owns the fact.

## 2D Asset Workflow

Use the existing deterministic asset pipeline and manifests.

Requirements:

- stable manifest keys, never filename-as-contract
- deterministic naming and frame order
- quarantine/intake validation before production use
- no placeholder asset may be interpreted as gameplay truth
- sprite generation may vary visually, but mapping from canonical entity/visual identity to the selected asset must be deterministic

Game Studio sprite-generation/normalization practices may be used for:

- direction sets
- animation strips
- anchor consistency
- scale normalization
- preview sheets
- visual QA

## 3D Asset Workflow

Use GLB/glTF shipping conventions and keep model processing outside simulation truth.

Track at minimum:

- stable asset key
- model/texture byte size
- triangle count where available
- material count
- texture dimensions
- animation names
- collision proxy ownership
- LOD policy

A GLB may represent an entity but may never determine that entity's gameplay properties unless those properties are already canonical server facts.

## Performance Policy

The 2D and 3D clients have separate rendering budgets but the same world truth.

### 2D

Measure:

- frame time
- active sprites/containers
- visible chunk count
- texture/atlas churn
- GC spikes
- interpolation stability between 10 Hz snapshots

### 3D

Measure:

- frame time / FPS
- draw calls
- active meshes/materials
- texture memory pressure
- GLB streaming stalls
- WebGL context loss
- hardware scaling level
- post-processing cost

Adaptive quality is allowed for rendering only. It must not change authoritative simulation radius, event outcomes or state hashes.

## Cross-Renderer Parity Gate

For representative authoritative frames, verify:

1. same `worldId`
2. same authoritative `tick`
3. same authoritative `stateHash` or equivalent canonical verification token
4. same entity identities
5. same canonical positions and lifecycle facts
6. same chunk identities and visibility entitlement
7. same gameplay event facts

Then allow renderer-specific visual differences.

A renderer mismatch is not automatically a server desync. Classify first:

```text
canonical mismatch -> truth/integration defect
projection mismatch -> projection contract defect
visual mismatch -> renderer/asset defect
performance mismatch -> renderer budget defect
```

## Playtest Evidence

A Game Studio playtest is complete only when evidence includes the player-visible path.

For `/2d`:

- boot to actionable world
- receive real server heartbeat/snapshot
- move via real input intent
- observe authoritative correction/update
- capture representative screenshots
- check HUD/playfield overlap
- verify chunk visibility and interpolation

For 3D:

- boot to actionable world
- receive the same canonical world source
- exercise camera and movement intent
- inspect WebGL/context stability
- capture screenshots
- record performance cliffs and asset stalls

Never call a renderer production-ready from unit tests alone.

## No-Mock / Evidence Rules

- No fake snapshot as production proof.
- No stub world used to claim parity.
- No client-authored gameplay truth.
- No random visual choice may leak back into simulation causality.
- No green state based only on logs or labels.
- Validate from canonical source -> projection -> actual browser readback.

## PlayCanvas

PlayCanvas is legacy for WASD and must not be selected by Game Studio. Any remaining historical references must be treated as documentation/history unless runtime evidence proves otherwise.

## Working Rule for ChatGPT and Coding Agents

Before modifying gameplay-facing client code:

1. identify canonical server/shared owner of the relevant fact
2. identify active 2D and relevant 3D projection consumers
3. preserve 10 Hz authoritative causality
4. make the smallest renderer/projection change
5. run unit/build/architecture guards
6. perform browser readback on the affected projection
7. for shared world facts, perform cross-render parity evidence when both clients are affected

The goal is not "make two games match". The goal is **prove that two renderers are observing the same deterministic Areloria world**.
