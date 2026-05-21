## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2025-05-20 - Ouroboros Causality Hardening

Learning: Gameplay simulation logic in `OuroborosLoop.ts` was leaking non-determinism via `Math.random()`. While the NPC logic was high-level, it directly affected world state (faction formation, legend spreading). Using native randomness in any Level-A path breaks the WorldHash and prevents reproducible replays.

Action: Ensure all agent-cycle logic receives a seeded `ARERng` derived from stable inputs (Tick + ActorID). Explicitly include such modules in the `scripts/check-are-determinism.mjs` gate to prevent regressions.
