## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2026-05-27 - Non-Deterministic Sorting Leak via localeCompare

Learning: `String.prototype.localeCompare` is non-deterministic across different Node.js environments and OS locales because it relies on the system's ICU data. Using it for sorting in Level-A simulation paths or WorldHash calculation leads to hash divergence between server and client (Portal), breaking causality verification.

Action: Replace all usage of `localeCompare` in simulation-critical paths and hash snapshots with locale-independent binary comparisons: `(a < b ? -1 : a > b ? 1 : 0)`.
