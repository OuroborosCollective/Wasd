## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2025-05-15 - Hardened NPC Personality Determinism

Learning: The use of `Math.random()` in core simulation engines like `NPCPersonalityEngine` (Level-A) creates immediate causality drifts in the WorldHash. Ad-hoc hashing functions in systems like `NPCSystem` create architectural fragmentation and are harder to audit than centralized PRNG systems.

Action: Replace all `Math.random()` usage in Level-A paths with `SeededARERng` derived from entity IDs or tick data. Consolidate deterministic trait generation into the centralized `NPCPersonalityEngine` to ensure system-wide causality and facilitate centralized auditing of PRNG sequences.
