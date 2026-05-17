## 2025-05-20 - Non-deterministic NPC Intent Generation
Learning: Iterating over the `npcs` Map in `NPCSimulation.update` without sorting causes non-deterministic execution order of AI logic and intent generation. This can lead to different WorldHash results if NPC actions are sequence-dependent.
Action: Always sort Map/Set keys (e.g., entity IDs) before iterating in Level-A simulation paths.
