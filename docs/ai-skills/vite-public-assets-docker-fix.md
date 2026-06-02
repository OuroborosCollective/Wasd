# Vite Public Assets + Docker Build Pattern

## The Problem

When building a Vite app (e.g., `apps/client-2d`) inside a Docker container, the `public/` directory is **NOT** automatically copied to `dist/` unless explicitly configured.

This causes missing static assets like Cozy Spring, biome atlases, etc.

## The Fix

In `Dockerfile.vps`, after the Vite build, explicitly copy public assets:

```dockerfile
# After: pnpm --filter @wasd/client-2d build
RUN mkdir -p apps/client-2d/dist/assets && \
    cp -a apps/client-2d/public/assets/. apps/client-2d/dist/assets/
```

## Asset Path Chain

```
Source:        apps/client-2d/public/assets/cozy-spring/
                ↓ cp -a
After Build:   apps/client-2d/dist/assets/cozy-spring/
                ↓ cp -a
In Container:  /app/server/client/dist/2d/assets/cozy-spring/
                ↓ Express serves at /
Browser URL:  https://arelorian.de/2d/assets/cozy-spring/manifest.index.json
```

## Verification

```bash
# Inside container
docker exec arelorian-engine sh -c \
  "test -f /app/server/client/dist/2d/assets/cozy-spring/manifest.index.json && echo OK || echo MISSING"

# From outside
curl -I https://arelorian.de/2d/assets/cozy-spring/manifest.index.json
# Expected: HTTP/1.1 200 OK
```

## Why This Happens

Vite's default behavior:
- `public/` files are served as-is at root URL during dev
- During production build, only files referenced in the build graph are included
- `public/` is NOT automatically copied to `dist/`

## When to Apply

Apply this fix whenever:
1. Adding new static assets to `apps/*/public/assets/`
2. Creating new content directories in `public/`
3. Adding asset packs (like Cozy Spring, biomes, etc.)

## Related Skills

- [VPS SSH Paramiko Patterns](./vps-ssh-paramiko-patterns.md) - For verifying the fix works
- [Client-2D Best Practices](./wasd-client-2d-best-practices.md)
- [Asset Tagging Workflow](./wasd-asset-tagging.md)