## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2028-02-24 - Economy Module Causality Hardening

Learning: The economy module was heavily reliant on wall-clock `Date.now()` for transaction and record timestamps, protected only by `@ARE-GUARD-EXEMPT` markers. This created a significant causality leak where simulation history (Level-A) was non-deterministic across replays.

Action: Systematically hardened the economy module by injecting `AREClock` into all ledger and order systems. Enabled the CI Determinism Gate for `server/src/modules/economy` to prevent future regressions.
