## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2026-05-28 - Expansion of Simulation Determinism Gate

Learning: Level-A simulation paths in `genealogy`, `farming`, and `monster` modules were identified as leaking non-deterministic wall-clock state (IDs and timestamps) into the WorldHash. These leaks break simulation replayability and CI stability.

Action: Expanded `scripts/check-are-determinism.mjs` to cover all active simulation modules. Injected `AREClock` into `FamilyGenerationSystem`, `FarmingSystem`, and `TreeGrowthSystem` to replace `Date.now()` with deterministic tick-based timestamps. Marked necessary wall-clock usages for LLM context and DB metadata in the NPC module with `@are-telemetry-side-channel` to clearly separate Telemetry (Level-C) from Simulation (Level-A).
