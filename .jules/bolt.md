## 2025-05-15 - [GLBRegistry O(1) Optimization]
**Learning:** The `GLBRegistry.getModelForTarget` method was performing an $O(n)$ array `find` for every NPC and loot item on every world tick (10Hz). In a world with many entities, this becomes a significant bottleneck.
**Action:** Use an internal `Map` for $O(1)$ lookups in registries and managers that are queried frequently in the main game loop.

## 2025-05-15 - [Monorepo Dependency Management]
**Learning:** Running `pnpm install` in a monorepo that isn't fully set up for pnpm (missing `pnpm-workspace.yaml`) can generate a massive `pnpm-lock.yaml` file in the root, which is undesirable for small PRs.
**Action:** Be extremely careful with installation commands in monorepos; prefer `npm install` within specific package directories if the root workspace configuration is unstable.
## 2026-04-06 - React.memo Pitfall with Inline Functions
**Learning:** When using `React.memo` to optimize a list of components (like `InventorySlot` inside `InventoryGrid`), every single prop passed to the memoized component MUST be stable. Missing even one inline arrow function (like `onDragStart={(slot, item) => ...}`) causes the component to fail the shallow comparison and re-render every time the parent renders, completely negating the `React.memo` optimization.
**Action:** When applying `React.memo`, rigorously audit all props being passed to ensure none are inline objects or functions. Use `useCallback` or `useMemo` for everything.
