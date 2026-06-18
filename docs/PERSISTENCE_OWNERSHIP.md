# Persistence Ownership

Persistence reconstructs runtime state. It is not a second live simulation authority.

## Ownership table

| Runtime area | Runtime owner | Durable source | Reconstruction rule |
| --- | --- | --- | --- |
| Players | Player runtime and tick systems | Player persistence backend | Rehydrate only after login or explicit boot flow. |
| NPCs | NPC runtime/tick system | Game-data/content pack plus persistence | Load content first, then apply tick-owned changes. |
| Loot | Deterministic loot director | Loot transactions and committed events | Rebuild from deterministic drop events and transactions. |
| Warfront | Warfront runtime port | Warfront state/events | Reconstruct from season state and contribution events. |
| Economy | Economy ledger runtime | Transaction ledger | Cache cannot be the only source. |
| Quests | Quest progression runtime | Quest progression store | Progress only from player or world events. |
| Skills | Skill progression runtime | Skill progression store | Progress only from deterministic use events. |
| Chunks | WorldBrain/chunk runtime | Layer persistence queue | Active chunk state comes from WorldBrain runtime. |

## Rules

1. A live state mutation has one runtime owner.
2. A durable write is attached to a tick, event, or reconstruction point.
3. Cache writes are optional acceleration and disposable.
4. HTTP and WebSocket handlers record input or delegate to runtime services; they do not become simulation owners.

## Replay verification target

```text
snapshot at tick N
  -> replay deterministic events to tick N+k
  -> recompute subsystem hashes
  -> combine into world hash
  -> compare expected and actual
```

A divergence report should name the subsystem, tick, expected hash, actual hash, and event range.
