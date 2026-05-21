## 2026-05-22 - [Optimization] Redundant Fusion Contract filtering in WorldTick
**Learning:** Calling `getConstructionContracts().filter()` inside an NPC loop creates $O(N \times C)$ complexity where $N$ is the number of NPCs and $C$ is the number of contracts.
**Action:** Pre-calculate the available contracts list once per tick and pass it to downstream services to reduce complexity to $O(N + C)$.

## 2028-08-24 - [Optimization] NPC Perception Loop Bottleneck
**Learning:** High-frequency $O(N \times P)$ loops (10Hz) are extremely sensitive to object allocations and nested property access. Re-sorting entities every tick using `localeCompare` and allocating a `result` object per check creates massive GC pressure and CPU overhead.
**Action:** Implement "Dirty Flag" caching for sorted lists, flatten complex objects into primitive arrays once per tick, and use zero-allocation "Fast Path" methods for hot loop calculations. Applied this to `NPCSystem` perception, reducing tick time from ~81ms to ~19ms for 2000 entities.
