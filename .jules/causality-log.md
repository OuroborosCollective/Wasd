## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2028-08-21 - Hardened Economy & System Summation

Learning: Even when using Fixed-Point (integer) arithmetic, stable iteration order is mandatory for simulation (Level-A) logic. Iterating over `worldState.regions` or `resourceSaturation` Maps without sorting keys leads to non-deterministic mutation ordering in the `WorldStateRegistry` and inconsistent ledger entries. For summations (e.g., total system energy), sorting ensures that the order of operations remains identical across all nodes, preventing bit-drift in the WorldHash.

Action: Explicitly sort Map keys (e.g., `Array.from(map.keys()).sort()`) before any iteration in `EconomySimulation.ts` and similar simulation systems.
