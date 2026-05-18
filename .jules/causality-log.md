## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2028-06-21 - Enforced Deterministic Map Iteration in Core Systems

Learning: Multiple core simulation systems (Economy, Oracle, Evolution, Quest Derivation) were iterating over `Map` and `Set` collections (regions, resource types, travel heat corridors) without sorting. Since `Map` iteration follows insertion order, this causes non-deterministic drift in the WorldHash and simulation state, especially in shared server environments.

Action: Systematically applied `Array.from(map.keys()).sort()` to all Level-A simulation loops that iterate over world entities or resource maps. In nested loops, ensure the keys are sorted once outside the outer loop to maintain performance without sacrificing causality.
