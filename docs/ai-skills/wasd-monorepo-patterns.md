# WASD AI Skill: Monorepo Patterns & TypeScript Integration

Purpose: Document patterns discovered during development that help future agents work efficiently with the WASD monorepo.

## Package Workspace

WASD is a pnpm monorepo. Key workspace packages:

```bash
@wasd/shared      # Shared types and utilities
@wasd/server      # Game server
@wasd/client-2d  # 2D React/Pixi client
@wasd/core       # Core logic
@wasd/core-logic  # Game logic
@wasd/portal      # Portal web app
```

## Shared Package Build

The `@wasd/shared` package MUST be built before other packages can use it:

```bash
pnpm -C packages/shared build
```

This runs `node scripts/transpile-build.mjs` which:
1. Transpiles TypeScript to JavaScript
2. Generates `.d.ts` declaration files
3. Outputs to `packages/shared/dist/`

### package.json exports

The shared package uses conditional exports:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./items": {
      "types": "./dist/items/index.d.ts",
      "import": "./dist/items/index.js"
    }
  }
}
```

## Client Vite Aliases

The 2D client uses Vite with path aliases. The alias configuration is in `apps/client-2d/vite.config.ts`:

```typescript
resolve: {
  alias: [
    { find: "@wasd/shared", replacement: path.resolve(sharedSrc, "./index.js") },
  ]
}
```

**Important**: The `.js` extension is required for Vite ESM resolution.

## TypeScript Path Resolution

Server uses `@shared/*` paths from `server/tsconfig.json`:

```json
{
  "paths": {
    "@shared/*": ["shared/*"]
  }
}
```

Client uses `@wasd/shared` which is aliased to the source directory.

## Server tsconfig Reference

When adding project references, use:

```json
{
  "references": [
    { "path": "../packages/shared" }
  ]
}
```

Add `types: ["node"]` to avoid TypeScript looking for ambient declarations.

## CI/CD Workflows

Common workflow files:

- `.github/workflows/ci.yml` - Main CI
- `.github/workflows/client-2d-smoke.yml` - Client build
- `.github/workflows/architecture-lint.yml` - Architecture checks

### Running builds locally

```bash
# Build shared first
pnpm -C packages/shared build

# Then build others
pnpm --filter @wasd/server build
pnpm --filter @wasd/client-2d build
```

### Typecheck commands

```bash
pnpm --filter @wasd/server exec tsc --noEmit
```

## Known Patterns

### 1. JSX files must use .tsx extension

If a file contains JSX syntax, it MUST have the `.tsx` extension, not `.ts`:

```bash
# Wrong
mv UIManager.ts UIManager.tsx

# In the file, use .tsx imports
import { Component } from "./Component.tsx";
```

### 2. Vite cache issues

If builds fail after code changes, clear the Vite cache:

```bash
rm -rf node_modules/.vite
rm -rf apps/client-2d/node_modules/.vite
```

### 3. ESBuild/TypeScript type conflicts

If you see errors about module resolution, check:
1. Is `@wasd/shared` properly exported in `packages/shared/package.json`?
2. Is the export path pointing to the right `.js` file (not `.ts`)?

## Git Workflow

### Branch naming

```
feature/modular-inventory-system
fix/client-build-error
chore/update-dependencies
```

### Commit style

```bash
# Good
feat: add modular inventory system
fix: resolve client-2d build errors

# Bad
update stuff
fixes
```

## File Locations

| Pattern | Location |
|---------|----------|
| Shared package | `packages/shared/` |
| Server code | `server/src/` |
| Client code | `apps/client-2d/src/` |
| 3D client | `client/src/` |
| Workflows | `.github/workflows/` |
| Docs | `docs/` |
