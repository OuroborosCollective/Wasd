## 2026-05-22 - [Optimizing Deep Cloning in WarfrontSystem]
**Learning:** `JSON.parse(JSON.stringify(obj))` is a significant performance bottleneck for frequently called snapshot methods. While `structuredClone()` is a safer modern alternative, manual spread cloning (`{...obj}`) is significantly faster (approx. 20x improvement in this case) for objects with a known, stable schema.
**Action:** Prefer manual cloning for high-frequency code paths with fixed schemas. Always benchmark against `structuredClone()` and `JSON.parse(JSON.stringify())` to quantify gains.

## 2028-02-14 - [Generic High-Performance deepClone Utility]
**Learning:** For dynamic or deeply nested objects where manual spread cloning is impractical, a recursive `deepClone` implementation is ~3.8x to 7x faster than `JSON.parse(JSON.stringify())` while maintaining JSON parity (handling Dates, undefined, etc.).
**Action:** Use the `deepClone` utility from `server/src/utils/deepClone.ts` for hot paths involving complex state snapshots or persistence serialization.

## 2028-02-24 - [Extending deepClone to persistence and registry paths]
**Learning:** The `deepClone` utility consistently outperforms `JSON.parse(JSON.stringify())` by 3.5x to 5.1x across various data structures (flat records like VoteBanner, nested templates like Crossroads, and complex documents like AssetPool). The performance gap is wider for larger, more deeply nested objects.
**Action:** Systematically replace the JSON serialization hack in all non-Level-A paths where JSON parity is required but structuredClone is not yet preferred due to environment constraints or minor speed differences.
