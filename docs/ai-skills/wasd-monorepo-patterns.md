# WASD AI Skill: Monorepo Patterns & TypeScript Integration

Purpose: Document patterns for working with the WASD pnpm monorepo.

## Package Workspace

Key workspace packages:
- `@wasd/shared` - Shared types and utilities
- `@wasd/server` - Game server
- `@wasd/client-2d` - 2D React/Pixi client
- `@wasd/core` - Core logic

## Build Order

The `@wasd/shared` package MUST be built first:

```bash
pnpm -C packages/shared build
```

## Client Vite Aliases

Located in `apps/client-2d/vite.config.ts`:

```typescript
resolve: {
  alias: [
    { find: "@wasd/shared", replacement: path.resolve(sharedSrc, "./index.js") },
  ]
}
```

**Important**: Use `.js` extension for ESM resolution.

## JSX File Extension

Files with JSX MUST use `.tsx` extension:

```bash
# Wrong
UIManager.ts

# Correct
UIManager.tsx
```

## Common Build Commands

```bash
# Build shared (always first)
pnpm -C packages/shared build

# Typecheck
pnpm --filter @wasd/server exec tsc --noEmit

# Build client
pnpm --filter @wasd/client-2d build
```

## Git Commit Style

```bash
# Good
feat: add modular inventory system
fix: resolve client-2d build errors

# Bad
update stuff
fixes
```

## Branch Naming

```
feature/modular-inventory-system
docs/ai-skills
fix/client-build-error
```
