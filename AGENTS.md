# AGENTS.md

## Cursor Cloud specific instructions

### Project overview
Arelorian/Ouroboros is a browser-based MMORPG: `server/` (Express + WebSocket game server) and `client/` (Vite + **Babylon.js** 3D client). See `README.md` and `docs/PROJECT_STATUS_2026.md`.

### Running the development server
- **Command:** `pnpm run dev` (runs `tsx watch src/index.ts` in `server/`).
- The server starts on port 3000 and embeds the Vite client dev middleware (serves the client at `/`).
- **Known gotcha:** `tsx watch` may restart in a loop because Vite middleware writes temp files to `client/node_modules/.vite-temp/`. For a stable session, run `npx tsx server/src/index.ts` directly (without watch) from the workspace root.
- Firebase/Firestore is optional for local dev. Without `FIREBASE_SERVICE_ACCOUNT_KEY`, the server logs warnings but continues with in-memory state. Auth tokens are bypassed in dev mode (any WS login without a token creates a `dev_*` player).
- Redis and PostgreSQL are optional; the server falls back gracefully without them.
- **Static assets:** The game serves the Vite build from `client/dist` and also mounts repo-root **`world-assets/`** at **`/world-assets/*`** (large GLB tree). If the server `cwd` is not the monorepo root, set **`WORLD_ASSETS_DIR`** (absolute path to `world-assets`). Same idea as **`CLIENT_ROOT_DIR`** for the client package.

### Lint, test, build
- **Lint:** `pnpm run lint` (ESLint from root; ignore the `.eslintignore` deprecation warning).
- **Test:** `pnpm run test` (Vitest, runs 600+ server tests; config at `vitest.config.ts`).
- **E2E:** `pnpm run build` then `pnpm run test:e2e` (Playwright; install browsers once with `pnpm run test:e2e:install`). In CI, `pnpm run test:e2e:ci` installs Chromium with system deps then runs tests.
- **Build:** `pnpm run build` (builds client with Vite, then compiles server TypeScript).
- **Content pack (optional):** `pnpm run content:publish` — validates, snapshots `game-data/` to `published-content/current/`. Run server with `USE_PUBLISHED_CONTENT=1` to load the snapshot instead of live `game-data/`.

### Environment variables
Copy `.env.example` to `.env`. Only `PORT` and `NODE_ENV` are needed for local dev without Firebase. See `.env.example` for full list. Optional: **`WS_MAX_MESSAGES_PER_PLAYER_UID_PER_SECOND`** tightens per-account WS throughput after login. **`STATE_BROADCAST_INTERVAL_MOBILE_MS`** slows **`entity_sync`** for clients that send **`clientHints.lowBandwidth`** on login (touch UI).

**Persistence:** `PERSISTENCE_DRIVER` = `auto` (default: Firestore if `FIREBASE_SERVICE_ACCOUNT_KEY` + DB, else JSON file), `firestore`, `file`, or `spacetime`. The `spacetime` driver is a **stub**: it still saves players to **`PLAYER_SAVE_FILE`** until SpacetimeDB reducers/SDK are wired; set `SPACETIME_PERSIST_FILE_FALLBACK=0` to disable that fallback (empty load). **`GET /health`** → `persistence.persistenceDriver`.

**GLB link overrides (NPC/object model paths):** By default stored in **`glb-links.json`** under the active content root. Set **`GLB_LINKS_STORE=spacetime`** (and **`SPACETIME_DB_URL`**, **`SPACETIME_GLB_MODULE_NAME`** or **`SPACETIME_MODULE_NAME`**, optional **`SPACETIME_TOKEN`**) to persist links in SpacetimeDB via HTTP SQL. Publish the small Rust module in **`spacetimedb-modules/areloria-glb/`** (`spacetime build && spacetime publish …`). **`GET /health`** includes **`glbLinksStore`**: `file` | `spacetime`.

**SpacetimeDB TypeScript SDK:** The server package depends on **`spacetimedb`** for future generated client bindings; runtime GLB sync uses **`fetch`** to **`POST /v1/database/:name/sql`** (see `server/src/modules/spacetime/`).

**No-code content admin (GLB + asset pools):** REST **`/api/admin/content/*`** (`server/src/api/adminContentRoute.ts`). **`GET /choices`** — NPCs, Weltobjekte, Rollen, Objekttypen, Monster-Gruppen aus dem **aktiven Content-Root**. **`GET /glb-gallery-tree`** — Baum aller **`.glb`/`.gltf`** unter **`client/public/assets/models`**. **`POST /glb-upload`** — multipart **`file`** + optional **`folder`** (sichere Unterordner-Segmente); schreibt ins gleiche Verzeichnis (Admin-Auth + nicht readonly). Max-Größe: **`MAX_ADMIN_GLB_UPLOAD_MB`** (Standard 50, Deckel 120) oder Fallback **`MAX_GLB_SIZE_MB`**. **`POST /validate-preview`** — gleiche Regeln wie `validateContent.ts` + optional Prüfung, ob eine **`/assets/models/...`**-Datei auf dem Server existiert. **`POST /publish-pack`** — validiert Repo-**`game-data/`** und kopiert nach **`published-content/current/`** (funktioniert, wenn `process.cwd()` zum Monorepo auflösbar ist; sonst `pnpm run content:publish`). Auth: **`ADMIN_PANEL_TOKEN`** / **`X-Admin-Token`** oder Firebase Bearer + **`ADMIN_UID_ALLOWLIST`**; **`CONTENT_ADMIN_READONLY=1`**. UI: **`/admin-content.html`** (dist oder `public`-Fallback).

### Key ports
| Service | Port |
|---------|------|
| Game Server (Express + WS + Vite middleware) | 3000 |
| Client standalone Vite dev server (if run separately) | 3001 |

### Testing the game loop without a browser
Connect via WebSocket to `ws://localhost:3000/ws` and send `{"type":"login"}`. The server assigns a dev player; **`entity_sync`** is broadcast on a configurable interval (default **200 ms**, sim tick **100 ms**). Use `input` (WASD keydown/keyup), `move_intent` (analog), `interact`, `dialogue_choice`, and `attack` as needed.
