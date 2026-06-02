# AGENTS.md

## Cursor Cloud specific instructions

### Project overview
Arelorian/Ouroboros is a browser MMORPG monorepo:
- `server/`: Express + WebSocket authoritative game server
- `client/`: Vite + Babylon.js rendering client (3D)
- `client-2d/`: PixiJS v7 + React UI (2D isometric)
- `game-data/`: content source (quests, NPCs, dialogue, world objects/scenes)

Primary source-of-truth docs:
- `README.md`
- `docs/PROJECT_STATUS_2026.md`
- `docs/ROADMAP_TO_RELEASE.md`
- `docs/DOCUMENTATION_INDEX.md`

### Client-2D specifics
- Entry: `apps/client-2d/src/DeterministicWorldIsoApp.tsx`
- UI system: `apps/client-2d/src/ui/UIManager.tsx` with `useSyncExternalStore`
- Rendering: PixiJS v7 with interpolated sprite movement (60 FPS lerp from 10 Hz server updates)
- WebSocket events: Listen on `wasd:network-packet` for UI updates
- CSS: Native CSS files (no Tailwind in 2D client unless requested)

### Production .env (VPS)
- Use `deploy/ENV_SETUP.md`.
- Copy `deploy/.env.production.template` to `/opt/areloria/.env`.
- Fill values, then restart PM2.

### Running the development server
- Preferred command from repo root: `npx tsx server/src/index.ts` (stable mode, runs game server with embedded Vite middleware on `:3000`).
- The root `package.json` does NOT have a `dev` script. Use the command above or `pnpm -C server dev` (uses `ts-node-dev`).
- The `@wasd/shared` package must be built before the client Vite middleware works: `pnpm -C packages/shared build`. If Vite shows "Failed to resolve import @wasd/shared", rebuild this package and clear the `.tsbuildinfo` file (`rm packages/shared/*.tsbuildinfo && pnpm -C packages/shared build`).
- Auth, DB, and Redis are optional; server degrades gracefully. Without auth credentials, the `verifyFirebaseToken` stub returns null, so WS login won't fully authenticate—server still broadcasts game state.
- DB persistence falls back to file-based when `DATABASE_URL` is unreachable (expect `getaddrinfo ENOTFOUND db` in logs—non-fatal).

### Lint, test, build
- Lint: `npx eslint server/src client/src` (eslint is a root devDependency with `eslint.config.mjs`; the root `package.json` has no `lint` script)
- Unit/integration tests: `npx vitest run` (config in root `vitest.config.ts`)
- Build: `pnpm run build` (recursive across workspaces)
- E2E:
  - Install once: `pnpm run test:e2e:install`
  - Run: `pnpm run test:e2e`
  - CI variant: `pnpm run test:e2e:ci`
- Pre-push quick verification (no E2E): `pnpm run ci:verify`
- Content checks:
  - Validate content: `pnpm run validate --prefix server`
  - Model-path audit: `pnpm run audit:model-paths`

### Environment variables (important)
- General defaults and descriptions: `.env.example`
- Production template: `deploy/.env.production.template`

Auth / login:
- Server-side WS auth controls:
  - `USE_SUPABASE_WS_LOGIN`
  - `REQUIRE_SUPABASE_AUTH`
  - `ALLOW_GUEST_LOGIN`
  - `ALLOW_DEV_LOGIN`
- Client auth provider:
  - `VITE_AUTH_PROVIDER` (`supabase` or `none`)
  - `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLIC_URL`
  - `VITE_SUPABASE_ANON_KEY`

Persistence:
- `PERSISTENCE_DRIVER`: `auto` | `postgres` | `file`
- `DATABASE_URL` (or PG* vars)
- `PLAYER_SAVE_FILE`

Playtester monitor (WebRTC default):
- `PLAYTESTER_ENABLED`
- `PLAYTESTER_MONITOR_MODE` (`webrtc` default, optional `local3d`)
- `PLAYTESTER_MONITOR_TOKEN`
- `PLAYTESTER_MONITOR_SIGNAL_PATH`
- `PLAYTESTER_STREAM_*`
- `PLAYTESTER_WEBRTC_ICE_SERVERS`

Admin/content:
- `ADMIN_PANEL_TOKEN`
- `ADMIN_UID_ALLOWLIST`
- `ADMIN_EMAIL_ALLOWLIST`
- `CONTENT_ADMIN_READONLY`
- `MAX_ADMIN_GLB_UPLOAD_MB`

Performance/safety:
- `WS_MAX_MESSAGES_PER_PLAYER_UID_PER_SECOND`
- `STATE_BROADCAST_INTERVAL_MOBILE_MS`

### Key runtime notes
- Static world assets are mirrored by `scripts/sync-world-assets.mjs` into client public assets and served by server static handlers.
- `/health` is served by `ServerBootstrap` and contains current auth/persistence/content/playtester state used by operations.
- In dev, embedded Vite middleware may affect some route behavior; verify both browser + WS flow when debugging.

### No-code content admin
- REST base: `/api/admin/content/*`
- Admin page: `/admin-content.html`
- Notable endpoints:
  - `GET /choices`
  - `GET /glb-gallery-tree`
  - `GET /model-needs`
  - `POST /glb-upload`
  - `POST /validate-preview`
  - `POST /publish-pack`

### Setup gotchas
- **pnpm v11 `allowBuilds`**: pnpm v11 replaced `onlyBuiltDependencies` with `allowBuilds` in `pnpm-workspace.yaml`. Build scripts for esbuild, prisma, protobufjs, ssh2, etc. must be explicitly allowed with boolean `true` values—string placeholders cause install failures.
- **Tailwind CSS v4**: The client uses `tailwindcss@4` which requires `@tailwindcss/postcss` plugin (not the legacy `tailwindcss` PostCSS plugin) and `@import "tailwindcss"` syntax instead of the old `@tailwind` directives.
- **Vite version**: `@vitejs/plugin-react@6.x` requires Vite 8+. The client's `vite` dependency must be `^8.x`, not `^6.x`.
- **`@wasd/shared` export**: The shared package's `src/utils/import-fixer.ts` is a Node.js build script (uses `fs`/`path`); it must NOT be re-exported from the shared package index when consumed by browser clients.

### Documentation maintenance rule
For every non-trivial feature or architecture change:
1. Update `docs/PROJECT_STATUS_2026.md`
2. Update `docs/ROADMAP_TO_RELEASE.md` if release scope/gaps changed
3. If a core workflow changed, also update `README.md` and relevant deploy/env docs

### AI Skills & Knowledge Base
When working on specific topics, check the skills in `docs/ai-skills/`:
- `wasd-typescript-troubleshooting.md` - Common TypeScript errors and fixes
- `wasd-are-system.md` - ARE engine types and integrations
- `wasd-monorepo-patterns.md` - Build commands and workspace patterns
- `wasd-manifest-system.md` - Manifest system usage
- `wasd-github-actions-repair.md` - CI/CD debugging patterns
- `wasd-game-architecture.md` - Core architecture decisions
- `wasd-server-player-stats-sync.md` - Player stats synchronization
- `wasd-storage-ui-implementation.md` - Storage UI implementation
- `wasd-resource-entity-generation.md` - Resource/entity generation
- `wasd-modular-inventory-system.md` - Inventory system design
- `wasd-client-2d-rendering.md` - 2D rendering patterns (legacy, see below)
- `wasd-client-2d-chunk-visibility.md` - Chunk loading troubleshooting & debug HUD
- `wasd-client-2d-best-practices.md` - Client-2D best practices & patterns
- `server-anti-ninja-loot.md` - Security patterns for loot
- `wasd-asset-tagging.md` - Asset tagging workflow and patterns
- `wasd-docs-best-practices.md` - Documentation standards

### Manifest System (Server Authority)
The manifest system provides deterministic, server-authoritative state management:
- **Server**: `server/src/core/manifest/` - ManifestFactory, ManifestHasher, ManifestSigner, ManifestVerifier, ManifestReplayGuard
- **Client**: `apps/client-2d/src/manifest/` - ClientManifestTracker for divergence detection
- **API**: `server/src/api/manifestResyncRoute.ts` - `/api/manifest/*` endpoints
- **Design**: "Manifest klein halten, Funktionen drumherum stark machen"
- **Key types**: `ManifestKind`, `PayloadMode`, `DependencyKind`, `ICryptoDependencyHeader`
- **Genesis**: `GENESIS_STATE_HASH = '0'.repeat(64)`, `GENESIS_PREVIOUS_HASH = 'GENESIS'`
- **Env vars**: `MANIFEST_AUTHORITY_SECRET`, `WORLD_ID`
See `docs/MANIFEST_SYSTEM.md` for full documentation.
