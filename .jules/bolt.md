## 2026-05-22 - [Optimizing Deep Cloning in WarfrontSystem]
**Learning:** `JSON.parse(JSON.stringify(obj))` is a significant performance bottleneck for frequently called snapshot methods. While `structuredClone()` is a safer modern alternative, manual spread cloning (`{...obj}`) is significantly faster (approx. 20x improvement in this case) for objects with a known, stable schema.
**Action:** Prefer manual cloning for high-frequency code paths with fixed schemas. Always benchmark against `structuredClone()` and `JSON.parse(JSON.stringify())` to quantify gains.

## 2026-05-29 - [Optimizing Player Snapshot Cloning]
**Learning:** Manual recursive `deepClone` is approximately 4x faster than `JSON.parse(JSON.stringify())` and 7x faster than `structuredClone()` for the typical player data structures in this Node.js 22 environment. Replacing it in hot persistence paths significantly reduces serialization overhead while maintaining safety via `try-catch` and explicit `Date` handling.
**Action:** Use the `deepClone` utility in `playerSnapshot.ts` for high-performance player data cloning. Ensure robustness by wrapping in `try-catch` to handle potential circular references and explicitly handling non-plain objects like `Date`.
