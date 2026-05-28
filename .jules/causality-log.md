## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2026-05-18 - Expanding Determinism Gate for Emerging Modules

Learning: New simulation modules (Genealogy, Farming, NPC Chat) often carry over standard JS patterns like `Date.now()` which are non-deterministic. Expanding the `check-are-determinism.mjs` gate to these paths is essential for long-term WorldHash stability. Telemetry (Level-C) in these modules must be clearly marked with `@are-determinism-allow` or moved to dedicated side-channel paths to maintain simulation (Level-A) purity.

Action: When creating a new simulation-critical module, immediately add its root to `scripts/check-are-determinism.mjs`. Use `AREClock` for all simulation timestamps and deterministic IDs.
