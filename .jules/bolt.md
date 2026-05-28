## 2026-05-22 - [Optimizing Deep Cloning in WarfrontSystem]
**Learning:** `JSON.parse(JSON.stringify(obj))` is a significant performance bottleneck for frequently called snapshot methods. While `structuredClone()` is a safer modern alternative, manual spread cloning (`{...obj}`) is significantly faster (approx. 20x improvement in this case) for objects with a known, stable schema.
**Action:** Prefer manual cloning for high-frequency code paths with fixed schemas. Always benchmark against `structuredClone()` and `JSON.parse(JSON.stringify())` to quantify gains.

## 2026-05-23 - [Optimized Deep Cloning for Player Snapshots]
**Learning:** For objects with dynamic or deeply nested structures (like player profiles), a recursive manual `deepClone` implementation is ~4.6x faster than `JSON.stringify/parse` and significantly faster than native `structuredClone()` in Node 22. Native `structuredClone()` has surprising overhead for these specific data structures compared to a lean JS recursion.
**Action:** Use a recursive `deepClone` utility for high-frequency persistence paths where `JSON.stringify` was previously the bottleneck.
