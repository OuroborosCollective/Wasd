# WorldTick and 10Hz Simulation

Tags: `worldtick`, `10hz`, `server`, `simulation`, `determinism`
Status: `implementation-anchor`

`WorldTick` is the authoritative heartbeat of the Areloria server simulation.

The design target is a stable **10Hz loop**, meaning one authoritative simulation step every `100ms`. Rendering can be smooth and interpolated, but authoritative decisions should happen at tick boundaries.

---

## Why 10Hz matters

A fixed tick rate keeps core logic reproducible:

- combat timing,
- NPC decisions,
- resource updates,
- collision / interaction windows,
- event replay,
- future [[ARE-Erdos Attractor Model|ARE-Erdos-Attractor-Model]] propagation.

---

## Tick boundary rule

Core simulation should prefer:

```txt
currentTick
entityId
logical position
seed / deterministic input
```

and avoid hidden dependencies on:

```txt
Date.now()
Math.random()
floating delta time
iteration order of unordered maps
external API timing
```

---

## Rendering boundary

Client rendering may interpolate between server snapshots. That does not change the authoritative tick.

Related pages:

- [[Determinism]]
- [[Systems Architecture|Systems_Architecture]]
- [[Asset Forge and 2D Pipeline|Asset-Forge-and-2D-Pipeline]]

---

## Implementation anchors

| Path | Meaning |
| --- | --- |
| `server/src/core/WorldTick.ts` | Authoritative simulation loop |
| `server/src/networking/WebSocketServer.ts` | Player message delivery |
| `client/src/engine/renderer.ts` | Client interpolation / rendering layer |
| `apps/client-2d/src/stackedProps.ts` | 2D prop rendering path |
| `server/src/modules/world/ChunkModificationDirector.ts` | Depletion persistence for resources |
| `server/src/modules/world/ResourcePopulator.ts` | Deterministic resource entity generation |

## Resources Entity System

As of 2026-05-31, WorldTick supports `type: 'RESOURCE'` entities in `world_snapshot`:

```typescript
// Resources broadcast to clients
this.ws.sendToPlayer(socketId, {
  type: "world_snapshot",
  tick: this.tickCount,
  self: selfId,
  other_players: [...],
  npcs: [...],
  loot: [...],
  resources: [  // NEW
    {
      id: 'res_wood_0_5_0',
      type: 'RESOURCE',
      resourceType: 'wood',
      x, z,            // World space
      kappaX, kappaZ,   // KAPPA space (1 unit = 1000 KAPPA)
      yield: 5,
      maxYield: 5,
      depleted: false,
      regrowRate: 600, // Ticks
    }
  ]
});
```

Resource entity IDs format: `res_{type}_{chunkX}_{chunkZ}_{index}`

---

## Agent rules

When editing tick logic:

1. keep changes small,
2. add deterministic tests when possible,
3. avoid broad bot-generated rewrites,
4. do not mix NPC, economy, combat and CI changes in one PR,
5. document new tick rules in [[Implementation Map|Implementation-Map]].

---

## See also

- [[Home]]
- [[Glossary]]
- [[ARE Logic Core|ARE-Logic-Core]]
- [[ARE-Erdos Attractor Model|ARE-Erdos-Attractor-Model]]
- [[Implementation Map|Implementation-Map]]