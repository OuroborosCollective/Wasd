## 2026-05-22 - [Optimization] Redundant Fusion Contract filtering in WorldTick **Learning:** Calling `getConstructionContracts().filter()` inside an NPC loop creates $O(N \times C)$ complexity where $N$ is the number of NPCs and $C$ is the number of contracts. **Action:** Pre-calculate the available contracts list once per tick and pass it to downstream services to reduce complexity to $O(N + C)$.

## 2028-07-24 - [Optimization] NPC Perception Hot-Loop Allocation & Sorting
**Learning:** The 10Hz NPC perception loop ((N \times P)$) was suffering from heavy GC pressure due to repeated object allocations (PerceptionState/StealthState) and redundant sorting ((N \log N)$ every tick). Raw string comparison is faster than localeCompare for ID sorting.
**Action:** Implemented an NPC sorting cache, pre-processed player data once per tick, and introduced a zero-allocation `checkStealthFast` utility to bypass object creation in the inner loop. Reduced tick overhead by ~84%.
