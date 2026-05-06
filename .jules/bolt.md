## 2026-05-22 - Squared Distance Optimization
**Learning:** Math.hypot() and Math.sqrt() in hot loops (like proximity chat or AoE damage) introduce significant overhead (approx 8.5x slower than squared distance checks). Most proximity checks only need to know if an entity is within a radius, making `dx*dx + dy*dy <= r*r` the preferred pattern.
**Action:** Always prefer squared distance for range checks. Only use Math.sqrt() when the actual distance is strictly required for further calculations (e.g., linear falloff).

## 2026-05-22 - Hot Loop Entity Allocation
**Learning:** Pre-computing lists like `onlinePlayers` once per tick in `WorldTick.ts` prevents redundant filtering and array allocations across multiple subsystems (Chat, AI, Ouroboros).
**Action:** Reuse pre-computed entity collections in the main tick loop instead of having each subsystem filter the global state.
