## 2025-05-15 - [GLBRegistry O(1) Optimization]
**Learning:** The `GLBRegistry.getModelForTarget` method was performing an $O(n)$ array `find` for every NPC and loot item on every world tick (10Hz). In a world with many entities, this becomes a significant bottleneck.
**Action:** Use an internal `Map` for $O(1)$ lookups in registries and managers that are queried frequently in the main game loop.

## 2025-05-15 - [Monorepo Dependency Management]
**Learning:** Running `pnpm install` in a monorepo that isn't fully set up for pnpm (missing `pnpm-workspace.yaml`) can generate a massive `pnpm-lock.yaml` file in the root, which is undesirable for small PRs.
**Action:** Be extremely careful with installation commands in monorepos; prefer `npm install` within specific package directories if the root workspace configuration is unstable.

## 2026-04-25 - [WorldTick broadcastState O(1) Optimization]
**Learning:** The `broadcastState` loop was using `chunks.some()` resulting in $O(E \cdot C)$ complexity where E is the number of entities and C is the number of active chunks. Additionally, redundant GLB path resolutions for static or repeated entities added significant overhead.
**Action:** Use a `Set` for $O(1)$ chunk lookups and implement a `Map`-based cache for GLB path resolutions in the main world tick loop.

## 2025-05-15 - [Babylon.js Allocation Bottlenecks]
**Learning:** High-frequency loops like `updateCameraFollow` and `updateAREVisuals` in Babylon.js can cause significant GC pressure if they use `new Vector3()` or operators that return new vectors (like `.add()`).
**Action:** Always use reusable class-level `Vector3` instances and "ToRef" or "InPlace" methods (e.g., `LerpToRef`, `addInPlace`, `copyFromFloats`) for any logic running at 60fps or during heavy synchronization.

## 2026-05-20 - [Hot Loop Allocation & String Conversion]
**Learning:** `WorldTick.broadcastState` (10Hz) was creating multiple intermediate arrays via spreads and `.map()`. Additionally, `AREStateCompiler` used `Number(toFixed(4))` which is significantly slower than mathematical rounding due to string overhead.
**Action:** Use direct `for...of` loops over Map values and replace `toFixed` with `Math.round(x * 10000) / 10000` in paths executed for every entity.
