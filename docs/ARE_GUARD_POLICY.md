# ARE Guard Policy

The ARE Guard separates world-state logic from observer/meta systems.

## Strict world-state paths

These paths must not use nondeterministic runtime calls such as `Math.random()`, `Date.now()`, `new Date()` or `randomUUID()`:

- `server/src/core/systems/**`
- `server/src/core/state/**`
- `server/src/core/determinism/**`
- `server/src/modules/combat/**`
- `server/src/modules/npc/**`
- `server/src/modules/world/**`
- `server/src/modules/dungeon/**`
- `server/src/modules/economy/**`
- `server/src/modules/loot/**`
- `server/src/modules/oracle/**`
- `server/src/modules/warfront/**`
- `packages/shared/src/**`

Use deterministic primitives instead:

- `SeededARERng`
- `createARESeed`
- tick-derived timestamps such as `tick * 100`
- explicit deterministic sequence counters

## Observer/meta paths

Observer systems may use wall-clock time or non-world randomness only when they do not feed the world hash, simulation result, combat result, loot result, NPC decision, economy result or replay snapshot.

Examples:

- telemetry
- analytics
- audit logs
- dashboards
- health endpoints
- self-healing reports
- playtester monitoring
- notifications

Such files should declare intent near the top of the file:

```ts
// @ARE-GUARD-EXEMPT: Telemetry timestamp only; not a world-state or world-hash input.
```

## Single-line exceptions

For rare isolated cases outside world-state input, use:

```ts
// ARE-DETERMINISM-ALLOW cooldown/audit metadata; not world-hash input.
const observedAt = Date.now();
```

Do not use this tag to hide gameplay randomness. If the value can influence world state, replay, combat, NPC behavior, loot, economy, chunk hashes or prophecy, replace it with deterministic ARE primitives instead.
