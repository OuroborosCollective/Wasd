## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2025-05-21 - Absolute Causality in State Compilation

Learning: The `AREStateCompiler` was susceptible to non-deterministic delta snapshots due to unsorted `Map` iterations and forbidden `Date.now()` calls. Even if logic is isolated, any leakage of wall-clock time into state deltas or integrity hashes will cause downstream WorldHash drift during replays.

Action: Enforce sorted key iteration in all state processing logic. Strictly use `AREClock` injection for any time-related metadata in simulation paths. Standardize pnpm workspace overrides to ensure consistent dependency resolution across CI nodes.
