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

### Stitch Game Assets Integration
Stitch-generated game assets (models, effects, biomes, symbols, weather) are imported via:
- **Import script**: `scripts/stitch-game-assets-importer.mjs`
- **Documentation**: `docs/COZY_ASSET_DIRECTOR_WORKFLOW.md`
- **Asset manifest**: `apps/client-2d/public/2d-assets/game-assets/manifest.json`
- **Sprite manifest**: `apps/client-2d/src/manifest/gameAssetsManifest.ts`

**MCP Connection (Stitch)**:
```bash
curl -s -X POST "https://stitch.googleapis.com/mcp" \
  -H "X-Goog-Api-Key: $STITCH_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

**Workflow**:
1. Create Stitch project: `create_project` with title
2. Upload DESIGN.md via `upload_design_md` (base64 encoded)
3. Create design system: `create_design_system_from_design_md`
4. Generate sprites: `generate_screen_from_text` with design system ID
5. Download from `downloadUrl` in response

**Sprite Naming Convention (Deterministic)**:
```
{class}_{race}_{gender}_{direction}_{animation}[_f{fr}].png
Example: warrior_human_male_e_idle.png
```

**Sprite Specs**:
- Size: 256x256 pixels
- Format: PNG with alpha channel
- Directions: 8 (n, ne, e, se, s, sw, w, nw)
- Animations: idle, walk, run, attack, defend, talk, sleep, die
- Frames: 30 per animation per direction

**Usage:**
```bash
# Import from GitHub issue #1071 (ZIP attachments)
node scripts/stitch-game-assets-importer.mjs

# Dry-run (verify without importing)
node scripts/stitch-game-assets-importer.mjs --dry-run

# Custom issue
ISSUE_NUMBER=1080 node scripts/stitch-game-assets-importer.mjs
```

**Categories:**
- `models/characters/`: Character sprites (e.g., `warrior_human_male_e_idle.png`)
- `effects/combat/`: Combat FX
- `effects/magic/`: Spell particles
- `biomes/`: Environment tiles
- `symbols/`: UI icons, item graphics
- `weather/`: Weather overlays

**Available Stitch MCP Tools**:
- `create_project` - Create new project
- `get_project` - Get project details
- `upload_design_md` - Upload design spec (base64)
- `create_design_system_from_design_md` - Create design system
- `generate_screen_from_text` - Generate sprite image
- `generate_variants` - Generate variations
- `get_screen` - Retrieve generated screen
- `list_screens` - List project screens

### Setup gotchas
- **pnpm v11 `allowBuilds`**: pnpm v11 replaced `onlyBuiltDependencies` with `allowBuilds` in `pnpm-workspace.yaml`. Build scripts for esbuild, prisma, protobufjs, ssh2, etc. must be explicitly allowed with boolean `true` values—string placeholders cause install failures.
- **Tailwind CSS v4**: The client uses `tailwindcss@4` which requires `@tailwindcss/postcss` plugin (not the legacy `tailwindcss` PostCSS plugin) and `@import "tailwindcss"` syntax instead of the old `@tailwind` directives.
- **Vite version**: `@vitejs/plugin-react@6.x` requires Vite 8+. The client's `vite` dependency must be `^8.x`, not `^6.x`.
- **`@wasd/shared` export**: The shared package's `src/utils/import-fixer.ts` is a Node.js build script (uses `fs`/`path`); it must NOT be re-exported from the shared package index when consumed by browser clients.
- **Vite `public/` dir not copied to `dist/`**: When building with `pnpm --filter @wasd/client-2d build`, Vite does NOT automatically copy the `public/` directory to `dist/`. You must explicitly copy it in the Dockerfile:
  ```dockerfile
  RUN mkdir -p apps/client-2d/dist/assets && \
      cp -a apps/client-2d/public/assets/. apps/client-2d/dist/assets/
  ```
  This caused PR #1586 (Dockerfile.vps: copy public assets for client-2d). Assets in `apps/client-2d/public/assets/` must be copied to `apps/client-2d/dist/assets/` so they end up in `/app/server/client/dist/2d/assets/` in the Docker container.

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
- `wasd-stitch-mcp-integration.md` - Stitch MCP connection and UI screen integration
### VPS & Deployment Skills
- `vps-ssh-paramiko-patterns.md` - SSH access to VPS via Paramiko
- `vite-public-assets-docker-fix.md` - Vite public/ directory in Docker builds
- `vps-deployment-workflow-best-practices.md` - Complete VPS deployment workflow
- `github-pr-draft-workaround.md` - GitHub PR draft state and merge fixes
- `wasd-vps-deployment-troubleshooting.md` - VPS deployment issues (2D client blank page, WebSocket, Nginx conflicts)

### Tools (in `tools/`)
- `tools/vps/vps-verify.py` - VPS deployment verification script
- `tools/github/pr-manager.py` - GitHub PR management (status, merge, checks)

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

### Areloria Codex Engine (Autonomous Wiki Sync)
The project uses an autonomous wiki engine to sync documentation to GitHub Wiki:

**Structure:**
```
scripts/wiki/
  build-autonomous-wiki.mjs   # Main builder - generates wiki pages
  validate-wiki.mjs          # Content validator
  push-wiki.mjs              # Robust wiki push with diff/preview
  lib/
    scan-files.mjs           # File scanner and parser
    parse-markdown.mjs       # Markdown analyzer
    generate-home.mjs        # Home page generator
    generate-sidebar.mjs     # Sidebar generator
    generate-changelog.mjs  # Auto-changelog from git
    generate-module-map.mjs  # Architecture diagrams
    validate-links.mjs       # Link validator
```

**Workflow:** `.github/workflows/wiki-engine.yml`
- Triggers on push to main (docs/**, server/src/**, client/src/**, scripts/wiki/**)
- Supports manual triggers with dry-run and rebuild options
- Jobs: Build Wiki → Validate Wiki → Sync to GitHub Wiki

**Running locally:**
```bash
# Build the wiki
node scripts/wiki/build-autonomous-wiki.mjs --source docs/wiki --out .wiki-build --rebuild true

# Validate wiki content
node scripts/wiki/validate-wiki.mjs --dir .wiki-build

# Push to wiki (dry-run)
node scripts/wiki/push-wiki.mjs --dir .wiki-build --dry-run true
```

**Generated pages:**
- `Home.md` - Auto-generated with project overview
- `_Sidebar.md` - Auto-generated navigation
- `Systems_Architecture.md` - Architecture with Mermaid diagrams
- `Implementation-Map.md` - Module overview
- `Changelog.md` - Recent commits
- `Roadmap.md` - From docs/ROADMAP_TO_RELEASE.md
- `Status.md` - Current system status
