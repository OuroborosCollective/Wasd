## 2026-05-22 - [Optimizing Deep Cloning in WarfrontSystem]
**Learning:** `JSON.parse(JSON.stringify(obj))` is a significant performance bottleneck for frequently called snapshot methods. While `structuredClone()` is a safer modern alternative, manual spread cloning (`{...obj}`) is significantly faster (approx. 20x improvement in this case) for objects with a known, stable schema.
**Action:** Prefer manual cloning for high-frequency code paths with fixed schemas. Always benchmark against `structuredClone()` and `JSON.parse(JSON.stringify())` to quantify gains.

## 2026-05-23 - [High-Performance Deep Clone for Persistence]
**Learning:** For deep cloning large, heterogeneous objects (like player persistence data), a custom recursive utility that bypasses string serialization is ~4x faster than `JSON.parse(JSON.stringify())`. To avoid regressions, the utility must explicitly replicate JSON behavior, such as converting `Date` to ISO strings and omitting `undefined` or functions in objects.
**Action:** Use the refined `deepClone` utility in `server/src/utils/deepClone.ts` for hot paths that currently use JSON-based cloning but require JSON-like serialization semantics.
