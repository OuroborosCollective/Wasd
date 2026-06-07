# Arelorian Client Entrypoints

## Source Truth

The playable 2D client source is:

```
apps/client-2d/
```

**There is no root-level `2d/` source directory.**

## Public Routes

| Route | Description |
|-------|-------------|
| `/2d` | Playable PIXI 2D client |
| `/3d` | Experimental 3D client |
| `/portal` | Portal shell |

## Build Artifacts

| Path | Description |
|------|-------------|
| `apps/client-2d/dist/` | Direct Vite output |
| `client/dist/2d/` | Runtime static output |
| `server/client/dist/2d/` | Copied runtime static output inside server container |

## Rule

**Never patch generated build output as source.**

### Correct:
```
apps/client-2d/src/...
```

### Wrong:
```
client/dist/2d/...
server/client/dist/2d/...
2d/...
```

## Deterministic Boundary

The server is authoritative. The client renders state; it does not decide truth.

### Server Owns:
- Movement validation
- Combat outcome
- Resource gathering result
- Crafting result
- Item changes
- Quest changes
- Guild/faction state

### Client Owns:
- Input collection
- Rendering
- Interpolation
- UI projection
- Degraded/offline display

## Client Entrypoint Health

The `/health` endpoint exposes `clientEntrypoints` with:

```typescript
interface ClientEntrypointHealth {
  source: {
    client2d: "apps/client-2d";
    client3d: "client";
    portal: "portal";
  };
  runtime: {
    root: string;        // e.g., /path/to/client/dist
    client2d: string;   // e.g., /path/to/client/dist/2d/index.html
    client3d: string;
    portal: string;
  };
  route: {
    client2d: "/2d";
    client3d: "/3d";
    portal: "/portal";
  };
  available: {
    client2d: boolean;
    client3d: boolean;
    portal: boolean;
  };
}
```

## Guard Script

Run `pnpm guard:entrypoints` to validate:

1. Required source paths exist:
   - `apps/client-2d/package.json`
   - `apps/client-2d/index.html`
   - `apps/client-2d/src/main.tsx`
   - `server/src/core/ServerBootstrap.ts`
   - `Dockerfile.vps`

2. Forbidden fake 2d paths do NOT exist:
   - `2d/package.json`
   - `2d/index.html`
   - `src/2d/index.html`