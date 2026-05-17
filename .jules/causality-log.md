## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2025-05-16 - Deterministic NPC Simulation Iteration
Learning: Iterating over a Map (this.npcs) in NPCSimulation followed insertion order, which is non-deterministic and leads to WorldHash drift.
Action: Enforce sorting of NPC IDs before iteration in the 10-Hz tick and ensure state snapshots (getAllNPCs) are sorted by identity.npcId.
