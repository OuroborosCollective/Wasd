# ARE Runtime Dataflow

This document defines the intended runtime path for WebSocket input, HTTP read models, database/cache connections, and deterministic world state in `OuroborosCollective/Wasd`.

## Non-negotiable truth path

```text
Client input
  -> transport validation
  -> intent or authenticated runtime action
  -> 10 Hz tick systems
  -> WorldStateProvider slices
  -> WorldBrain snapshot/hash
  -> projection over HTTP/WebSocket
  -> persistence/replay diagnostics
```

No module may create gameplay truth from an empty object, a placeholder snapshot, or a transport cache. A runtime source is either available and named, or unavailable and reported as such.

## Authority model

| Layer | May mutate simulation truth | May read truth | May cache | Notes |
| --- | --- | --- | --- | --- |
| Tick systems | Yes | Yes | No hidden cache | Deterministic order only. |
| WorldStateProvider | No direct mutation | Yes | No | Projects canonical subsystem state into the tick context. |
| WebSocket | No | Yes, through projections | Transport-only | Rate limits and socket maps are side-channel only. |
| HTTP routes | No | Yes, through providers/services | Response cache only | Must return explicit unavailable state when a runtime provider is missing. |
| Persistence | Reconstruct only | Yes | Durable replay/source data | Must not become a second live writer. |
| Redis/cache | No | Derived data only | Yes | Optional acceleration, never canonical truth. |
| Auth/JWT | No | Identity only | Session validation | Wall-clock expiry is allowed for auth, not simulation. |

## Runtime ports

Public adapter fields must not pretend to be working systems. The adapter now exposes explicit diagnostics for ports that are not connected to canonical runtime services.

Available runtime sources currently include:

- `NPCSystem`
- `DeterministicLootDirector`
- `RuntimePlayerSystem`
- `WarfrontRuntimePort`
- `TransportObserverEngine` as a side-channel only

Unavailable ports must report why they are unavailable before they are wired:

- chunk runtime
- combat runtime/service
- inventory runtime
- guild/governance runtime
- economy runtime
- quest runtime
- persistence adapter port
- GLB/asset pool runtime
- placement/crafting/skill runtime
- resource runtime

## Player lifecycle

`RuntimePlayerSystem.getPlayer(id)` is a read-only lookup. It must not create a player. Creation requires an explicit login/hydration cause:

```text
login/presence identity
  -> createPlayer/getOrCreatePlayerFromLogin
  -> hydration hook, when available
  -> registered socket presence
  -> tick provider emits player state
```

This prevents accidental reads from creating incomplete players such as `{ id, gold: 0 }`.

## WebSocket boundaries

WebSocket code may do transport work:

- parse messages
- validate input shape
- enforce transport rate limits
- map socket IDs to player IDs
- send projections

WebSocket code must not become the long-term owner of gameplay truth. When movement is fully migrated, the path should be:

```text
move_intent
  -> InputIntentQueue
  -> PlayerMovementTickSystem
  -> RuntimePlayerSystem position update at tick N
  -> WorldStateProvider projection
  -> WebSocket/HTTP delta
```

Until that migration is complete, any direct transport mutation must be treated as compatibility debt and must not feed replay/hash code without a tick-system owner.

## Snapshot and projection rules

Projection code may emit data only from real providers. If a provider is missing, use an explicit unavailable payload:

```json
{
  "available": false,
  "reason": "missing_runtime_provider"
}
```

Do not emit fake NPC activity, fake chunks, fake economy, or empty success objects that imply a runtime exists.

## Database and cache rules

Database writes should be attached to a deterministic event or reconstruction path. Cache and Redis data may speed up reads, but must be disposable. If cache loss changes gameplay truth, the cache is incorrectly acting as a database.

## Diagnostics expected from ARE runtime

Runtime diagnostics should expose:

- provider count
- provider IDs
- runtime port status
- unavailable ports and reasons
- world hash
- replay stats
- persistence queue stats
- WebSocket transport stats
- NPC game-data load report

These diagnostics are not gameplay truth. They are health and integration visibility.
