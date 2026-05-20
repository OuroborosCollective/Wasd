## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2025-05-16 - Hardened HazardResonance Determinism

Learning: Environmental hazard systems using wall-clock time (`Date.now()`) for visual or logic-influencing offsets like `phaseShift` introduce non-determinism into the simulation (Level-A). This prevents identical replays and can cause state drift between server and clients.

Action: Replace wall-clock usage in simulation paths with values derived from the deterministic global tick (`worldStateRegistry.getTick()`). Ensure the modulo or scale matches the expected range of the downstream consumer (e.g., `tick % 100`).
