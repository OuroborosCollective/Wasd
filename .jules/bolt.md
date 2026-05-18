## 2026-05-22 - [Optimization] Redundant Fusion Contract filtering in WorldTick **Learning:** Calling `getConstructionContracts().filter()` inside an NPC loop creates $O(N \times C)$ complexity where $N$ is the number of NPCs and $C$ is the number of contracts. **Action:** Pre-calculate the available contracts list once per tick and pass it to downstream services to reduce complexity to $O(N + C)$.
## 2028-05-22 - [Optimization] Inlined NPC perception to eliminate O(N*P) allocations
**Learning:** Object allocation for temporary state objects (PerceptionState, StealthState) in high-frequency (10Hz) loops with O(N*P) complexity creates significant GC pressure.
**Action:** Inline distance-squared math and cache thresholds derived from static traits to eliminate allocations.
