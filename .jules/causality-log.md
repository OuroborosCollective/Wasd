## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2028-02-14 - Eradication of `localeCompare`

Learning: `String.prototype.localeCompare` is non-deterministic as its output depends on the environment's locale settings. Using it in Level-A simulation paths (sorting entity IDs, etc.) causes WorldHash drift between different environments (e.g., local dev vs. CI).

Action: Use lexicographical binary comparison `(a < b ? -1 : a > b ? 1 : 0)` for all deterministic sorting in Level-A paths. Enforce this via the ARE Determinism Gate (`scripts/check-are-determinism.mjs`) by blocking `localeCompare`.
