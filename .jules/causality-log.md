## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2026-05-25 - Deterministic Telemetry Timestamps

Learning: Telemetry events (hits, kills) recorded during Level-A simulation ticks (like Warfront combat) must use deterministic timestamps derived from the tick count. Using wall-clock time (`Date.now()`) inside these recording paths introduces host-dependency into the WorldHistory and can cause causality drifts or non-reproducible event logs.

Action: Derive telemetry timestamps using `(tick * TICK_MS)` where `TICK_MS` is the simulation cadence (100ms for 10Hz). Pass this stable timestamp explicitly to telemetry services to ensure the Ouroboros event log remains perfectly deterministic across all nodes.
