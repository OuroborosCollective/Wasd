## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2026-05-23 - Hardened Deterministic Iteration in Simulation Paths

Learning: JavaScript `Map` and `Set` iteration order is non-deterministic (insertion order) and can vary across runs if populated from non-deterministic sources. In Level-A simulation paths, this leads to divergent WorldHashes and causality failures, especially in regional economy and evolution logic.

Action: Enforce sorted key iteration in `EconomySimulation`, `EvolutionSystem`, and `OracleSystem`. Always extract keys to an array and sort them before processing collections that impact the WorldHash.
