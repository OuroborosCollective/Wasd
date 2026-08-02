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

## 2028-04-12 - [Optimizing Morton Code Encoding and Decoding via O(1) Bit Dilation]
**Learning:** Loop-based bit interleaving for 16-bit Morton code (Z-order curve) calculation is slow due to loop overhead and branch predictions, and is highly prone to subtle bitwise indexing bugs. Replacing 16-iteration loops with $O(1)$ loop-free bit dilation (`dilate16`) and undilation (`undilate16`) using magic bit masks (such as `0x00ff00ff`, `0x55555555`) yields ~1.7x to 2.2x speedup. Consistent coordinate systems must be maintained by ensuring identical sign-extension (e.g. `(x << 16) >> 16`) for all decoders when negative coordinates are allowed.
**Action:** Always prefer loop-free binary magic splits and masks for low-level bit operations and ensure identical handling of sign-extension across redundant implementations of the same math functions.

## 2028-05-18 - [Optimizing DeterminismEngine Simulation Cloning]
**Learning:** In hot client simulation paths, frequently cloning structured state snapshots like `AREState` using `JSON.parse(JSON.stringify())` introduces massive CPU serialization overhead. Replacing this with an explicitly-typed, key-checked manual property cloner produces a ~18x-22x performance speedup.
**Action:** Always check for target coordinate schemas in simulation helper cloning utilities to skip serialization-based fallback pathways.

## 2028-05-28 - [Optimizing Pathfinding via Numeric Key Hash and Swap-and-Pop]
**Learning:** In hot execution paths like pathfinding (A*), string key template literal interpolation (e.g., `` `${x},${y}` ``) causes massive garbage collection (GC) churn and high Map/Set lookup latency. Replacing it with a 32-bit integer key hash using bitwise shift and OR operations `((x & 0xffff) | ((y & 0xffff) << 16))` eliminates allocation. Additionally, removing elements from an unordered list like `openList` using `splice()` incurs costly $O(N)$ element shifting; replacing it with an $O(1)$ swap-and-pop technique eliminates array shifts, producing a combined ~2.0x overall performance speedup.
**Action:** Always prefer non-allocating numeric hashes for integer coordinate-based Map/Set lookup keys, and use $O(1)$ swap-and-pop for element removal in unordered worklists.
