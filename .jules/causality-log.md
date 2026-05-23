## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2025-05-22 - Hardened Economy Simulation Determinism

Learning: The `EconomySimulation` system was susceptible to WorldHash drift due to non-deterministic iteration over `worldState.regions` and `region.resourceSaturation` Maps. In Level-A simulation paths, any logic that queues mutations or calculates aggregate totals (like `calculateTotalRegionEnergy`) must iterate over collections in a strictly sorted order to ensure consistent causality and floating-point summation.

Action: Enforce key sorting (e.g., `Array.from(map.keys()).sort()`) before iterating over any Map that influences simulation state or Oracle pressure generation.
