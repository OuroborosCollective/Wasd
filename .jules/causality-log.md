## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2026-05-20 - Ouroboros Loop Determinism Hardening

Learning: The emergent socialization logic (factions, families, legends) in OuroborosLoop was relying on native Math.random() and unsorted proximity lists. In a distributed simulation, this causes rapid WorldHash divergence as different nodes reach different social outcomes for the same tick.

Action: Inject SeededARERng derived from NPC ID and WorldTime. Enforce non-mutating sort on perceived entity arrays before any filtering or selection logic.
