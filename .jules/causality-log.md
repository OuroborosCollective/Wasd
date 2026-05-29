## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2028-02-25 - Absolute Determinism: Binary vs. Locale Comparison

Learning: Standard JavaScript `String.prototype.localeCompare` is non-deterministic for simulation logic (Level-A) because its output depends on the environment's locale (OS, Node.js version, system language). This causes identical seeds to yield different iteration orders across different machines, destroying the WorldHash.

Action: Strictly use binary comparison `(a, b) => (a < b ? -1 : a > b ? 1 : 0)` for all sorting in simulation paths. This ensures lexicographical consistency based on Unicode code points across all environments.
