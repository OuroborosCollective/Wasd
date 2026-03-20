## 2026-03-12 - [pnpm Monorepo CI and Lockfile Integrity]
**Learning:** In a pnpm monorepo, having `workspaces` in `package.json` is not sufficient for `pnpm` if `pnpm-workspace.yaml` is missing. This causes CI build failures as it fails to link local packages correctly. Additionally, running `pnpm install` without `--frozen-lockfile` in a misconfigured workspace or with a version mismatch can lead to massive, destructive `pnpm-lock.yaml` regressions (e.g., swapping entire frameworks if the lockfile version is bumped).
**Action:** Always verify if `pnpm-workspace.yaml` exists in a monorepo. Use `--frozen-lockfile` in CI and be extremely cautious when `pnpm-lock.yaml` changes significantly without `package.json` changes.

## 2026-03-12 - [Registry Lookup Optimization]
**Learning:** Transitioning from O(N) array searching (`Array.find`) to O(1) `Map` lookups in core registry classes (like `GLBRegistry`) provides a measurable performance gain in hot paths like the world tick loop.
**Action:** Audit registry-like classes for linear lookups and replace with hash maps where appropriate.

## 2025-05-15 - [GLBRegistry O(1) Optimization]
**Learning:** The `GLBRegistry.getModelForTarget` method was performing an $O(n)$ array `find` for every NPC and loot item on every world tick (10Hz). In a world with many entities, this becomes a significant bottleneck.
**Action:** Use an internal `Map` for $O(1)$ lookups in registries and managers that are queried frequently in the main game loop.

## 2025-05-15 - [Monorepo Dependency Management]
**Learning:** Running `pnpm install` in a monorepo that isn't fully set up for pnpm (missing `pnpm-workspace.yaml`) can generate a massive `pnpm-lock.yaml` file in the root, which is undesirable for small PRs.
**Action:** Be extremely careful with installation commands in monorepos; prefer `npm install` within specific package directories if the root workspace configuration is unstable.

## 2025-05-15 - [Array Allocations in Hot Loops]
**Learning:** Calling `getAllPlayers()` multiple times in `WorldTick.ts` `tick()` creates multiple new arrays per tick using `Array.from()`. Since `tick()` runs 10 times per second, this causes unnecessary garbage collection and performance degradation.
**Action:** Always hoist data retrieval (like getting the player list) outside of repeating blocks in the main game loop to avoid redundant heap allocations.

## 2025-05-15 - [Optimization Purity and Lockfile Pollution]
**Learning:** Performance optimizations should remain "pure"—avoid changing default return values (like XP rewards) or method signatures unless strictly necessary. Additionally, running `pnpm install` to fix a test environment can accidentally pollute the `pnpm-lock.yaml` with unrelated dependency changes if the environment isn't perfectly clean.
**Action:** Always revert lockfile changes that are unrelated to the task. Ensure optimizations don't accidentally alter functional game logic (like default rewards) or break existing test assumptions about object structures (e.g., `player.skills` existence).

## 2025-05-23 - [Loop-Invariant Code Motion in Matching]
**Learning:** Performing array sorts (`[...inputIds].sort()`) and serialization (`JSON.stringify`) directly inside `Array.find` or loop conditionals causes redundant $O(N \log N)$ operations and unnecessary string allocations for static data across iterations.
**Action:** Always apply loop-invariant code motion (hoisting) to move static data processing (like sorting, filtering, or serializing inputs) outside of loop bodies to achieve $O(1)$ constant-time overhead per iteration instead of multiplying it.

## 2026-03-17 - [O(1) Map Lookups for Character Assembly]
**Learning:** The CharacterAssemblySystem was repeatedly scanning large configuration arrays (skin tones, hair colors, etc.) using `.find()` and `.includes()` during every validation and assembly call. This created a significant amount of redundant work, especially as the asset list grew.
**Action:** Always index static configuration data into Maps during initialization to ensure O(1) lookup performance in high-frequency validation and assembly paths.

## 2026-05-21 - [Pre-resolving Asset Paths for Tick Loops]
**Learning:** Performing asset lookups (like GLB model paths) for every entity in the world broadcast tick (10Hz) creates unnecessary Map overhead and object spread allocations.
**Action:** Cache asset paths directly on entity objects during creation or hydration. This transforms an $O(E \times A)$ lookup (Entities x Assets) into a direct property access in the broadcast loop, significantly reducing per-tick overhead.

## 2026-03-18 - [Pre-resolving Appearance Models for Tick Loops]
**Learning:** Performing character appearance resolution (via `characterAssembly.resolveModelPaths`) and redundant object spreads for every player inside the 10Hz broadcast loop causes significant overhead as player counts scale.
**Action:** Always pre-calculate and cache complex resolved data (like character model URLs and colors) on the player object during hydration or update, preventing expensive string concatenations and map lookups on every single tick.

## 2026-03-19 - [Combining Array Iterations]
**Learning:** Chaining array methods like `.filter()` and `.reduce()` multiple times over the same array leads to redundant O(N) iterations and unnecessary intermediate array allocations, degrading performance, especially on hot paths like heuristic calculations.
**Action:** Replace multiple chained array methods with a single manual loop (e.g., `for...of`) to perform all filtering, accumulation, and transformation operations in a single O(N) pass without extra array allocations.

## 2026-03-20 - [Array Allocations Before Set Initialization]
**Learning:** Using `Array.map` to transform data before passing it to a `Set` constructor (e.g., `new Set(items.map(i => i.id))`) creates an unnecessary intermediate array allocation that is immediately discarded. In high-frequency loops like the 10Hz world tick, this causes significant garbage collection pressure.
**Action:** Use a manual `for...of` loop to iterate over the source data and add elements directly to an initialized `Set` to avoid the intermediate array allocation.

## 2024-05-28 - O(1) Map lookups for static nodes in hot paths
**Learning:** High-frequency systems like the `HeuristicWorldBrain` or other world tick modules often define static configuration arrays (e.g., `nodes`). Using `array.find()` on these static lists inside hot loops creates an O(N) performance penalty for every single update or retrieval.
**Action:** Always check if a class with static configuration arrays (`this.nodes`, `this.configs`, etc.) exposes methods that look up these items by ID. Shadow these arrays with a `Map` populated during initialization (e.g., in the constructor) to convert O(N) `find()` calls into O(1) constant-time `Map.get()` lookups. This significantly improves execution times in game ticks with zero loss of functionality.
