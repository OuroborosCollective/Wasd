## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2026-06-01 - Hardened Economy Determinism

Learning: Even secondary simulation systems like the `TaxLedger` must avoid wall-clock `Date.now()` calls if they record timestamps that could be used for sorting or logic later. While originally exempt, these "metadata" leaks can cause subtle non-determinism during high-fidelity replays.

Action: Inject `AREClock` into all economy ledger classes and replace `Date.now()` with `clock.now()`. Ensure tests use `FixedAREClock` to verify deterministic timestamp recording.
