# Watchdog Integration Notes

The Replit portal connects to the watchdog system defined in:

- `backend/src/core/watchdog-determinism.ts` — deterministic 10Hz event contract, severity normalization and validation helpers
- `backend/src/core/watchdog-emitter.ts` — deterministic `WatchdogEmitter` for local bus + WebSocket relay
- `backend/src/core/watchdog-learning.ts` — learning/recovery logic
- `backend/src/run-watchdog.ts` — sovereign circuit breaker (CLOSED/OPEN/HALF_OPEN)
- `backend/src/watchdog-server.ts` — WebSocket broadcast server on port 8080

## Deterministic 10Hz Rules

The World Server owns simulation time. Watchdog events must follow the same 10Hz rhythm:

| Field | Rule |
|-------|------|
| `tick` | Authoritative 10Hz world tick. Monotonic per client. |
| `timestamp` | Derived value only: `tick * 100`. Do not send wall-clock time. |
| `seq` | Relay/emitter sequence number for ordering inside one process. |
| `severity` | Canonical: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`. Legacy values are normalized. |
| `origin` / `source` | Logical subsystem, e.g. `world-server`, `selfheal`, `portal`, `ci`. |
| `payload` | Plain object only. No arrays as root payload. |
| `metadata` | Plain object only. Use for debug/diagnostic context. |

Strict mode is enabled by default via `WATCHDOG_STRICT_TICK_MODE=true`. In strict mode the relay rejects:

- Tick rewinds from the same client.
- Tick jumps larger than `WATCHDOG_MAX_TICK_JUMP`.
- Invalid JSON or non-object payloads.
- Oversized messages above `WATCHDOG_MAX_PAYLOAD_BYTES`.

## Recommended Event Shape

```json
{
  "type": "WORLD_TICK_HEALTH",
  "severity": "LOW",
  "origin": "world-server",
  "message": "10Hz world tick healthy",
  "tick": 12345,
  "payload": {
    "tickDurationMs": 6,
    "activePlayers": 12,
    "activeChunks": 44
  },
  "metadata": {
    "engine": "ARE",
    "tickHz": 10
  }
}
```

The relay will overwrite/derive deterministic `timestamp` and relay `seq` from the accepted tick.

## WebSocket Roles

Clients may connect with a role query parameter:

```txt
ws://localhost:8080?role=world
ws://localhost:8080?role=dashboard
ws://localhost:8080?role=selfheal
ws://localhost:8080?role=ci
```

Known roles: `world`, `agent`, `dashboard`, `logger`, `ci`, `selfheal`, `gm`.

## Circuit Breaker States

| State | Meaning |
|-------|---------|
| CLOSED | Normalbetrieb — everything OK |
| OPEN | Fehlerzustand — recovery mode, connection dropped |
| HALF_OPEN | Testphase — probing if system is stable again |

## Event Severities

| Severity | Meaning | Legacy aliases |
|----------|---------|----------------|
| LOW | Debug/info telemetry | `DEBUG`, `INFO` |
| MEDIUM | Warning/degraded state | `WARN`, `WARNING` |
| HIGH | Error requiring attention | `ERROR` |
| CRITICAL | Critical/fatal state | `FATAL` |

## Player Monitor

Based on `client/src/playtesterMonitorMain.ts`. Polls:

- Player position (x/y/z)
- Current action & goal
- Active quest & step
- Inventory items
- Nearby NPCs/enemies/interactables
- Warnings & errors

See `docs/AUTONOMOUS_PLAYTESTER_MONITOR.md` for full WebRTC stream mode docs.
