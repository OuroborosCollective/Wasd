## 2026-05-22 - [Optimization] Redundant Fusion Contract filtering in WorldTick **Learning:** Calling `getConstructionContracts().filter()` inside an NPC loop creates $O(N \times C)$ complexity where $N$ is the number of NPCs and $C$ is the number of contracts. **Action:** Pre-calculate the available contracts list once per tick and pass it to downstream services to reduce complexity to $O(N + C)$.

## 2027-06-15 - [Optimization] Redundant Deep Cloning in Status Payloads
**Learning:** `JSON.parse(JSON.stringify)` deep cloning was used in `WarfrontSystem.getStatusForPlayer` to create "snapshots" before mapping them to response payloads. This is redundant when the mapping logic creates fresh objects and doesn't mutate source state. This anti-pattern causes unnecessary CPU spikes and GC pressure.
**Action:** Access internal state directly when building read-only status payloads if the mapping process is already non-destructive.
