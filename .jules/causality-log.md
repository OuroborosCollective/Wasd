## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2028-08-23 - Enforced Sorted Map Iteration

Learning: Native JavaScript Map iteration follows insertion order, which is non-deterministic in concurrent server environments. In Level-A simulation paths, this causes WorldHash drift during replays.

Action: Always sort Map keys before iteration in Economy, Evolution, and Oracle systems. Standardized Node.js 22 in CI to support modern pnpm features.
