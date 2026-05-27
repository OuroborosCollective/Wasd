## 2025-05-15 - Hardened Deterministic Perception

Learning: JavaScript `Map` iteration order is based on insertion order, which is non-deterministic in a multi-user server environment. Iterating over players or NPCs in a simulation path (Level-A) without sorting leads to inconsistent world states and hash drifts. Additionally, missing properties like `phaseShift` in simulation entities can cause mathematical failures (NaN) in perception logic.

Action: Always enforce `Array.sort()` on entity collections (Players, NPCs, Loot) before processing them in any 10-Hz tick logic. Ensure all properties required by deterministic utility functions (like `PerceptionLogic`) are explicitly initialized during entity creation.

## 2026-05-21 - Warfront Determinism & Locale-Independent Sorting

Learning: `String.prototype.localeCompare` is non-deterministic across different Node.js environments and OS locales (e.g., ICU data differences). Additionally, wall-clock usage (`Date.now()`) in events that populate `WorldHistory` leads to WorldHash drift during replay.

Action: Always use binary ID comparison `(a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)` for deterministic sorting. Ensure all simulation-derived timestamps use the simulation tick (e.g., `tick * TICK_MS`) rather than wall-clock time.
