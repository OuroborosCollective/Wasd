## 2025-05-15 - [GLBRegistry O(1) Optimization]
**Learning:** The `GLBRegistry.getModelForTarget` method was performing an $O(n)$ array `find` for every NPC and loot item on every world tick (10Hz). In a world with many entities, this becomes a significant bottleneck.
**Action:** Use an internal `Map` for $O(1)$ lookups in registries and managers that are queried frequently in the main game loop.

## 2025-05-15 - [Monorepo Dependency Management]
**Learning:** Running `pnpm install` in a monorepo that isn't fully set up for pnpm (missing `pnpm-workspace.yaml`) can generate a massive `pnpm-lock.yaml` file in the root, which is undesirable for small PRs.
**Action:** Be extremely careful with installation commands in monorepos; prefer `npm install` within specific package directories if the root workspace configuration is unstable.

## 2025-05-15 - [Math.hypot Performance Optimization]
**Learning:** `Math.hypot()` is surprisingly slow in JavaScript due to internal handling of arguments and precision guarantees. When computing distances in hot loops (e.g., game ticks, checking interaction distances, attack ranges), this function becomes a noticeable bottleneck.
**Action:** Replace `Math.hypot(dx, dy)` with squared distance checks `dx * dx + dy * dy` against squared thresholds (e.g., `distSq < threshold * threshold`). Only use `Math.sqrt()` when the actual distance value is strictly required for further calculations (like normalizing a movement vector).
