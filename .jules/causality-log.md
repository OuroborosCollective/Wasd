## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2026-05-30 - Determinism Hardening & Gate Expansion
Learning: Binary string comparison is mandatory for cross-environment WorldHash consistency as localeCompare is non-deterministic. Expanded the ARE Determinism Gate to cover gameplay, world, governance, and are modules. Enforced deterministic time injection in GameplayFusionDirector to prevent wall-clock leakage.
Action: Replace localeCompare with (a < b ? -1 : a > b ? 1 : 0) in all Level-A paths. Ensure Vitest config includes all test directories to avoid CI failures.
