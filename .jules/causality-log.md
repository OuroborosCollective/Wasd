## 2028-06-05 - Fix non-deterministic timestamp in Warfront Telemetry
Learning: Discovered that `WarfrontCombatTelemetry.ts` was using `Date.now()` for world events recorded in `WorldHistory` during the 10Hz simulation tick. This violated the ARE axioms for Level-A Simulation paths.
Action: Refactored `WarfrontCombatTelemetry` to accept a deterministic timestamp and updated `WarfrontCombatOrchestrator.ts` to provide a timestamp derived from `tickCount`.
