## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2028-05-21 - Hardened Ouroboros Simulation

Learning: The Ouroboros NPC agent cycle (Level-A) was leaking non-determinism via `Math.random()` in goal-directed behaviors (socializing, legend spreading). Even surgical logic remains fragile if the coordinator does not provide a stable, fact-seeded PRNG.

Action: Replaced `Math.random()` with `ARERng` in `OuroborosLoop.ts` and extended the `ARE Determinism Gate` to cover `server/src/modules/ouroboros`. Seeding must use world facts (tick, npcId) to ensure causality across simulation replays.
