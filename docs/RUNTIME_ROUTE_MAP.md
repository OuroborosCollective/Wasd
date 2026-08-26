# Runtime Route Map

This map is an integration checklist for HTTP and WebSocket surfaces. It describes which authority each route must use when it exists.

| Surface | Authority source | Mutation allowed | Determinism note |
| --- | --- | --- | --- |
| WebSocket login | Auth/session identity plus explicit player creation | Presence/player creation only after login cause | No player creation on read. |
| WebSocket movement | Input intent queue, then player movement tick system | Tick system only | Transport may validate or drop input. |
| WebSocket entity sync | Runtime projection from world providers | No | Visibility must come from one runtime provider. |
| WebSocket chat | Chat router plus runtime recipient mapping | Chat event only | Simulation state is not derived from chat transport. |
| Gameplay snapshot routes | Runtime providers and snapshot composer | No | Missing providers return unavailable payloads. |
| Warfront routes | `WarfrontRuntimePort` | Domain method only | Uses deterministic runtime time resolver. |
| Health/ARE diagnostics | Runtime diagnostics | No | Reports status only. |
| Persistence routes | Persistence/replay services | Reconstruction only | Must not write live truth outside tick/event path. |
| Asset/GLB routes | Asset runtime/registry | Quarantine/metadata only | Invalid assets must be quarantined, not silently accepted. |

## Route warning signs

A route should be treated as incomplete when it does any of the following:

- returns success while no runtime provider exists
- constructs empty arrays as if they were canonical snapshots
- mutates player, NPC, economy, quest, or chunk state from HTTP handlers
- uses Redis/cache as a durable truth source
- uses wall-clock time for simulation decisions
- computes visibility independently from other projections

## Required unavailable response shape

```json
{
  "ok": false,
  "error": "runtime_provider_unavailable",
  "provider": "EconomyRuntimePort",
  "reason": "Economy runtime must be wired from the transaction ledger before use."
}
```

Routes may use different status codes, but they must not hide missing runtime ownership behind a successful placeholder payload.
