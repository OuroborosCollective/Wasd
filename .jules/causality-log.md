## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2028-02-14 - Global String Determinism & Gate Hardening

Learning: `String.prototype.localeCompare` is environment-dependent and causes non-deterministic sorting order across different OS locales, leading to WorldHash drift in Level-A simulation paths. Furthermore, simulation modules like `gameplay` and `are` must be strictly guarded by the Determinism Gate to prevent wall-clock (Date.now) leakage.

Action: Prohibit `localeCompare` in all Level-A paths and replace with binary comparison `(a < b ? -1 : a > b ? 1 : 0)`. Update `scripts/check-are-determinism.mjs` to block `localeCompare` and expand coverage to all simulation-critical modules.
