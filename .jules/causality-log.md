## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2026-05-27 - Level-A Farming Clock Hardening

Learning: The farming module (FarmingSystem and TreeGrowthSystem) was identified as having a "Level-B" leak where Date.now() was used for simulation-critical timestamps. While previously unmonitored by the CI gate, this posed a risk for WorldHash divergence in replays.

Action: Refactored farming systems to use injected AREClock and added 'server/src/modules/farming' to the mandatory CI Determinism Gate. Enforced comment requirements on causality-critical refactors.
