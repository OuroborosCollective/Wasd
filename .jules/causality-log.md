## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2026-05-20 - Deterministic Economy Iteration

Learning: In `EconomySimulation.ts`, iterating over `worldState.regions` and `region.resourceSaturation` maps without sorting leads to non-deterministic mutation ordering. Since floating-point addition is non-associative, even commutative operations like total energy summation can result in bit-drift in the WorldHash if the iteration order varies across different execution environments or replays.

Action: Enforce `Array.from(map.keys()).sort()` before iterating over any Map that contributes to simulation state (Level-A) mutations or cumulative calculations.

## 2026-05-20 - Hardened Deterministic Timestamps & Gate Compliance

Learning: Usage of `Date.now()` inside Level-A state objects (like `WorldState` or `RegionState`) or simulation modules (like `HazardResonance`) triggers the ARE Determinism Gate and risks WorldHash divergence. These must be replaced with tick-derived timestamps (e.g., `Tick * 100ms`). Legitimate bridges to wall-clock time (like `SystemAREClock`) must be explicitly marked with `// ARE-DETERMINISM-ALLOW` to pass CI.

Action: Replace wall-clock dependencies with tick-based logic in simulation-critical paths. Use gate exemptions surgically only for audited, non-simulation-critical infrastructure.
