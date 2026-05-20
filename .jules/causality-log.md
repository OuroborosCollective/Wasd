## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2025-05-16 - Deterministic Hazard Resonance

Learning: Using wall-clock time (`Date.now()`) in simulation logic (Level-A) creates non-deterministic results that break the WorldHash and desynchronize the collective. Specifically, `HazardResonance.ts` was using `Date.now() % 100` for `phaseShift`, which directly impacts NPC perception thresholds.

Action: Replace all wall-clock calls in simulation paths with deterministic values derived from the world tick (`worldStateRegistry.getTick()`). This ensures that every execution from the same seed yields the exact same WorldHash.
