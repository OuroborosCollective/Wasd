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
**Learning:** Running `pnpm install` in a monorepo that isn\'t fully set up for pnpm (missing `pnpm-workspace.yaml`) can generate a massive `pnpm-lock.yaml` file in the root, which is undesirable for small PRs.
**Action:** Be extremely careful with installation commands in monorepos; prefer `npm install` within specific package directories if the root workspace configuration is unstable.

## 2025-05-15 - [Array Allocations in Hot Loops]
**Learning:** Calling `getAllPlayers()` multiple times in `WorldTick.ts` `tick()` creates multiple new arrays per tick using `Array.from()`. Since `tick()` runs 10 times per second, this causes unnecessary garbage collection and performance degradation.
**Action:** Always hoist data retrieval (like getting the player list) outside of repeating blocks in the main game loop to avoid redundant heap allocations.

## 2025-05-15 - [Optimization Purity and Lockfile Pollution]
**Learning:** Performance optimizations should remain "pure"—avoid changing default return values (like XP rewards) or method signatures unless strictly necessary. Additionally, running `pnpm install` to fix a test environment can accidentally pollute the `pnpm-lock.yaml` with unrelated dependency changes if the environment isn\'t perfectly clean.
**Action:** Always revert lockfile changes that are unrelated to the task. Ensure optimizations don\'t accidentally alter functional game logic (like default rewards) or break existing test assumptions about object structures (e.g., `player.skills` existence).

## 2025-05-23 - [Loop-Invariant Code Motion in Matching]
**Learning:** Performing array sorts (`[...inputIds].sort()`) and serialization (`JSON.stringify`) directly inside `Array.find` or loop conditionals causes redundant $O(N \log N)$ operations and unnecessary string allocations for static data across iterations.
**Action:** Always apply loop-invariant code motion (hoisting) to move static data processing (like sorting, filtering, or serializing inputs) outside of loop bodies to achieve $O(1)$ constant-time overhead per iteration instead of multiplying it.
