# JULES' CAUSALITY LOG

## 2026-05-17 - Non-deterministic Map Iteration in NPC Simulation
**Learning:** Iterating over `Map.values()` or `Map.keys()` in Level-A simulation paths (NPC perception, AI updates) is non-deterministic if the registration order of entities differs between server/client or during replays. This causes WorldHash drift and targeting inconsistencies.
**Action:** Always sort Map-derived collections by a stable `id` or `npcId` before iteration in any simulation path. Added a defensive guard `if (!npc) continue` in batched updates to handle potential mid-loop deletions safely.
