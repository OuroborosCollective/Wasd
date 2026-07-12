## 2026-05-22 - [Optimizing Deep Cloning in WarfrontSystem]
**Learning:** `JSON.parse(JSON.stringify(obj))` is a significant performance bottleneck for frequently called snapshot methods. While `structuredClone()` is a safer modern alternative, manual spread cloning (`{...obj}`) is significantly faster (approx. 20x improvement in this case) for objects with a known, stable schema.
**Action:** Prefer manual cloning for high-frequency code paths with fixed schemas. Always benchmark against `structuredClone()` and `JSON.parse(JSON.stringify())` to quantify gains.

## 2028-02-14 - [Generic High-Performance deepClone Utility]
**Learning:** For dynamic or deeply nested objects where manual spread cloning is impractical, a recursive `deepClone` implementation is ~3.8x to 7x faster than `JSON.parse(JSON.stringify())` while maintaining JSON parity (handling Dates, undefined, etc.).
**Action:** Use the `deepClone` utility from `server/src/utils/deepClone.ts` for hot paths involving complex state snapshots or persistence serialization.

## 2028-02-24 - [Extending deepClone to persistence and registry paths]
**Learning:** The `deepClone` utility consistently outperforms `JSON.parse(JSON.stringify())` by 3.5x to 5.1x across various data structures (flat records like VoteBanner, nested templates like Crossroads, and complex documents like AssetPool). The performance gap is wider for larger, more deeply nested objects.
**Action:** Systematically replace the JSON serialization hack in all non-Level-A paths where JSON parity is required but structuredClone is not yet preferred due to environment constraints or minor speed differences.

## 2028-02-24 - [Fixing Duplicate Tags in NPCSystem]
**Learning:** Monorepo environments can occasionally suffer from merge artifacts or accidental duplicate property declarations in core interfaces (like NPC). This specifically caused TS2300 "Duplicate identifier 'tags'".
**Action:** Always verify the entire module's type health even when performing scoped optimizations, as unrelated pre-existing or emergent issues can block the CI gate.

## 2025-05-24 - [Optimizing Persistence via Single-Pass Canonicalization]
**Learning:** In PersistenceManager, performing separate `deepClone` (using `structuredClone`) and `canonicalize` (recursive sorting) passes was redundant. `structuredClone` has high overhead for simple JsonValue types. A single recursive pass that clones and sorts keys simultaneously is significantly more efficient and allows for immediate type conversion (BigInt, Date).
**Action:** Consolidate multiple object traversals into a single recursive pass when performing both cloning and deterministic transformation/canonicalization.

## 2026-06-16 - [Optimizing AREStateCompiler Snapshots]
**Learning:** Sorting the entire population in a simulation loop to generate delta snapshots is an (N \log N)$ bottleneck. By iterating directly and sorting only the delta (changed items), complexity drops to (N)$ for the common case where  \ll N$. Caching projections during comparison also avoids redundant (N)$ transformation work.
**Action:** Minimize sorting in high-frequency loops by only sorting the resulting deltas rather than the source population.

## 2026-06-22 - [Optimizing Quest Sync via Single-Pass Counting]
**Learning:** `QuestEngine.getQuestSyncForClient` was performing a full $O(N)$ inventory scan for every "collect" quest, leading to $O(Q \times N)$ complexity per player sync. Implementing a lazy-initialized count `Map` reduces this to $O(Q + N)$, resulting in a measurable ~40% speedup in synchronization overhead for active players.
**Action:** Always pre-calculate counts or lookups in a single pass when performing multiple searches across the same collection (e.g. inventory, active quests).

## 2026-06-30 - [Optimizing RecipeMatcher via Caching and Comparison]
**Learning:** The previous implementation of `RecipeMatcher.match` performed (N \cdot M \log M)$ work by sorting and stringifying both the input and every recipe's ingredients on every call. Using a `WeakMap` for recipe input caching and hoisting the input sorting reduces overhead significantly. Element-wise comparison is also much faster than `JSON.stringify`.
**Action:** Always hoist sorting outside of search loops and use `WeakMap` to cache transformations of stable objects in hot paths.

## 2026-07-05 - [Optimizing Deterministic Stringification via Manual Loops]
**Learning:** For performance-critical deterministic stringification (like RuntimeHistoryLog), using `.map().join()` introduces significant heap allocation overhead due to intermediate arrays and multiple string fragments. Manual loops and direct string concatenation reduces GC pressure and improves throughput by ~20-40% depending on object depth.
**Action:** Replace higher-order array methods with manual loops in high-frequency stringification paths to minimize allocations.
