## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2025-05-15 - Enforced Deterministic Map Iteration in Level-A Core Systems

Learning: Core simulation systems (Economy, Oracle, Quest, Evolution) were iterating over `worldState.regions` and resource maps directly. Since JavaScript `Map` iteration depends on insertion order, this introduced non-determinism in state updates across ticks, which could lead to WorldHash drift in multi-user environments.

Action: Enforced `Array.sort()` on all Map keys before iteration in `EconomySimulation.ts`, `OracleSystem.ts`, `QuestDerivationEngine.ts`, and `EvolutionSystem.ts`. This ensures that all simulation-critical loops execute in a stable, predictable order regardless of the order in which entities or regions were added to the state.
