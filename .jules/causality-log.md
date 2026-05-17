## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2026-05-17 - Hardened Deterministic Combat Timing
Learning: Level-A simulation paths involving combat combos and cooldowns (like `CombatService` and `ComboValidator`) were leaking non-determinism by relying on `Date.now()` for sequence validation. This causes WorldHash drift during replays if the system clock differs from the original recording.
Action: Propagate deterministic timestamps (e.g., `tickCount * 100`) from the simulation orchestrator (`WorldTick` or `WarfrontCombatOrchestrator`) down through the combat service and validator layers. Replace all internal `Date.now()` calls with these injected timestamps or sovereign equivalents.
