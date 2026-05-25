## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2025-05-16 - Elimination of Non-Deterministic Socialization

Learning: The Ouroboros socialization logic (faction and family formation) was relying on native Math.random(), causing the agent-driven social evolution to diverge between simulation runs even with identical starting seeds. This breaks the ARE-Axiom of absolute causality for Level-A simulation.

Action: Always audit modules/ouroboros/ and similar high-level agent loops for residual native randomness. Replace with SeededARERng initialized from (worldTime + npcId) to ensure reproducible social outcomes.
