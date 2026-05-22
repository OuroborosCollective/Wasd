## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2025-05-20 - Environmental Hazard Determinism

Learning: Found a non-deterministic leak in `server/src/modules/world/HazardResonance.ts` where `Date.now() % 100` was used for calculating `phaseShift`. Since this path affects player health and Plexity (Level-A simulation), it must be purely deterministic.

Action: Refactored hazard processing functions to accept a `tick` parameter. Extended the ARE Determinism Gate (`scripts/check-are-determinism.mjs`) to cover the `server/src/modules/world` directory.
