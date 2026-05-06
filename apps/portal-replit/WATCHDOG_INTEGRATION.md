# Watchdog Integration Notes

The Replit portal connects to the watchdog system defined in:

- `backend/src/core/watchdog-emitter.ts` — `WatchdogEvent` type, `WatchdogEmitter` class
- `backend/src/core/watchdog-learning.ts` — learning/recovery logic
- `backend/src/run-watchdog.ts` — sovereign circuit breaker (CLOSED/OPEN/HALF_OPEN)
- `backend/src/watchdog-server.ts` — WebSocket broadcast server on port 8080

## Circuit Breaker States

| State | Meaning |
|-------|---------|
| CLOSED | Normalbetrieb — everything OK |
| OPEN | Fehlerzustand — recovery mode, connection dropped |
| HALF_OPEN | Testphase — probing if system is stable again |

## Event Severities

| Severity | Color |
|----------|-------|
| LOW | Gray |
| MEDIUM | Yellow |
| HIGH | Orange |
| CRITICAL | Red |

## Player Monitor

Based on `client/src/playtesterMonitorMain.ts`. Polls:
- Player position (x/y/z)
- Current action & goal
- Active quest & step
- Inventory items
- Nearby NPCs/enemies/interactables
- Warnings & errors

See `docs/AUTONOMOUS_PLAYTESTER_MONITOR.md` for full WebRTC stream mode docs.
