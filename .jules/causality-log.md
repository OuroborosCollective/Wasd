## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2025-05-23 - Hardened Core Simulation Paths

Learning: Pervasive use of Date.now() and non-deterministic Map iteration in core systems (Economy, Evolution, Oracle, StateCompiler) represents a systemic threat to WorldHash stability. AREStateCompiler specifically leaked wall-clock time into the integrity hash and entity mutations, which would cause replay desyncs.

Action: Replace all Date.now() calls in Level-A paths with deterministic version counters or state-provided timestamps. Enforce Array.sort() on all Map keys before iteration in simulation logic. Optimize performance by sorting large collections outside of nested loops.
