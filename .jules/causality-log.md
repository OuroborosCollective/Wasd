## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2025-05-16 - Cross-Environment String Sorting Leak

Learning: `String.prototype.localeCompare` is non-deterministic across different operating systems and Node.js environments because it relies on the host OS's collation rules. Using it to sort entity IDs in Level-A simulation paths causes the WorldHash to drift between server and client or between different server instances.

Action: Replace all usage of `localeCompare` in simulation-critical paths with a deterministic lexicographical binary comparison: `(a < b ? -1 : a > b ? 1 : 0)`.
