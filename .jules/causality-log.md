## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2028-02-20 - Deterministic String Comparison

Learning: `String.prototype.localeCompare` is non-deterministic across different execution environments because its behavior depends on the system's locale and collation settings. In Level-A simulation paths, where sorting order must be identical for WorldHash consistency, `localeCompare` can cause state drift.

Action: Prohibit `localeCompare` in simulation-critical paths. Use binary lexicographical comparison `(a < b ? -1 : a > b ? 1 : 0)` for all string-based sorting of IDs, keys, or names that affect the simulation state. The ARE Determinism Gate now enforces this restriction.
