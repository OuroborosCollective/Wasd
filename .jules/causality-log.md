## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2028-02-14 - Eradicating localeCompare for Cross-Environment Determinism
Learning: localeCompare is environment-dependent and can cause non-deterministic sorting across different Node.js locales or implementations, leading to WorldHash drift in Level-A simulation paths.
Action: Always use binary comparison (a < b ? -1 : a > b ? 1 : 0) for string sorting in simulation-critical code.
