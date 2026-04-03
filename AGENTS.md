# AGENTS.md

## Cursor Cloud specific instructions

### Project overview
Arelorian/Ouroboros is a browser-based MMORPG: `server/` (Express + WebSocket game server) and `client/` (Vite + **Babylon.js** 3D client). See `README.md` and `docs/PROJECT_STATUS_2026.md`.

**Firebase AI Logic (Web):** shipped inside the **`firebase`** npm package in `client/` (currently **^12.11.0**). Use `import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai"` after `initializeApp`. Complete the [Firebase console AI Logic setup](https://console.firebase.google.com/) (Gemini API provider); do **not** embed API keys in client code. Official guide: [Get started with Firebase AI Logic (Web)](https://firebase.google.com/docs/ai-logic/get-started?platform=web).

**Optional AI watchdog (client):** `VITE_FIREBASE_AI_WATCHDOG=1` enables `client/src/ai/firebaseAiWatchdog.ts`. It classifies recent errors into a **functional domain** (`network` | `firebase_auth` | `renderer` | `storage` | `unknown`), then asks Gemini for **one action** from a **domain-specific allow list** only (e.g. network: `clear_stale_ws_token`, `reconnect_websocket`; renderer: `babylon_soft_recover`, `babylon_reduce_render_load`). The model must echo the same `module` string; mismatches are rejected. No generated code, no cross-module file edits. Telemetry: `areloria:watchdog-log`, `watchdogTelemetry.ts`, handlers in `watchdogRecovery.ts`.

### Production .env (VPS)
- Step-by-step without relying on many shell one-liners: **`deploy/ENV_SETUP.md`**. Copy **`deploy/.env.production.template`** to `/opt/areloria/.env` via SCP/SFTP, fill secrets in an editor, restart PM2.

### VPS deploy + Firebase Admin (production)
- Deploy script: `deploy/deploy.sh` (GitHub Action runs it on push to `main`). PM2 loads `/opt/areloria/.env` via `ecosystem.config.cjs` (`deploy/write_pm2_ecosystem.sh`).
- **Do not commit** the Service Account JSON. On the VPS: place the key at `/opt/areloria/secrets/firebase-adminsdk.json` or run `deploy/setup-firebase-service-account.sh /path/to/key.json`. Deploy appends **`FIREBASE_SERVICE_ACCOUNT_KEY`** and **`GOOGLE_APPLICATION_CREDENTIALS`** when that file exists. Alternatively leave `FIREBASE_SERVICE_ACCOUNT_KEY` empty and use only **`GOOGLE_APPLICATION_CREDENTIALS`** + **`FIREBASE_PROJECT_ID`** — the server then uses **`applicationDefault()`** (same idea as `admin.credential.applicationDefault()`). On GCP VMs: **`FIREBASE_ADMIN_USE_APPLICATION_DEFAULT=1`**. See `DEPLOYMENT.md`.

### Running the development server
- **Command:** `pnpm run dev` (runs `tsx watch src/index.ts` in `server/`).
- The server starts on port 3000 and embeds the Vite client dev middleware (serves the client at `/`).
- **Known gotcha:** `tsx watch` may restart in a loop because Vite middleware writes temp files to `client/node_modules/.vite-temp/`. For a stable session, run `npx tsx server/src/index.ts` directly (without watch) from the workspace root.
- Firebase/Firestore is optional for local dev. Without `FIREBASE_SERVICE_ACCOUNT_KEY`, the server logs warnings but continues with in-memory state. **Game WebSocket login:** by default Firebase JWT is **not** verified (`USE_FIREBASE_WS_LOGIN` unset/0) — use dev/guest login while building gameplay; set `USE_FIREBASE_WS_LOGIN=1` to verify tokens again. **Client HUD:** Firebase buttons hidden by default (`VITE_DISABLE_FIREBASE_AUTH` unset = off); set `VITE_DISABLE_FIREBASE_AUTH=0` to show Google/email login again.
- Redis and PostgreSQL are optional; the server falls back gracefully without them.
- **`GET /health`** includes **`firebase`** (`configured`, `initMode`: cert | application_default | none, `projectId`, credential flags) and **`auth`** (`useFirebaseWsLogin`, `requireFirebaseAuth`, `allowGuestLogin`, `allowDevLogin`). See **`docs/FIREBASE_VPS_CHECKLIST.md`**.
- **Static assets:** Repo-root **`world-assets/`** is mirrored by **`scripts/sync-world-assets.mjs`** into **`client/public/assets/models/world-assets/`** (bundled as **`/assets/models/world-assets/*`**) and into **`client/public/world-assets/`** (dev). Client **`predev`/`prebuild`** runs the sync. **`pnpm run sync:world-assets`** at repo root does the same. The server serves legacy **`/world-assets/*`** from that mirror when present, else from repo **`world-assets/`** (**`WORLD_ASSETS_DIR`** / **`MIRRORED_WORLD_ASSETS_DIR`** override). Prefer **`CLIENT_ROOT_DIR`** when `cwd` is not the monorepo root.
- **Android / touch performance:** Client sends **`login.clientHints.lowBandwidth`** on Android and coarse-pointer / narrow viewports so the server uses **`STATE_BROADCAST_INTERVAL_MOBILE_MS`**. Babylon: lower `maxFPS`, higher `hardwareScalingLevel`, serialized GLB loads, coarser nav torus, batched name labels. Vite splits **`babylon-core`** / **`babylon-loaders`** chunks for parse caching.

### Lint, test, build
- **Lint:** `pnpm run lint` (ESLint from root; ignore the `.eslintignore` deprecation warning).
- **Test:** `pnpm run test` (Vitest, runs 600+ server tests; config at `vitest.config.ts`).
- **E2E:** `pnpm run build` then `pnpm run test:e2e` (Playwright; install browsers once with `pnpm run test:e2e:install`). In CI, `pnpm run test:e2e:ci` installs Chromium with system deps then runs tests.
- **Build:** `pnpm run build` (builds client with Vite, then compiles server TypeScript).
- **Pre-push (no E2E):** `pnpm run ci:verify` — lint, unit tests, build, `audit:model-paths`. Full CI also runs Playwright (`pnpm run test:e2e:ci`).
- **Content pack (optional):** `pnpm run content:publish` — validates, snapshots `game-data/` to `published-content/current/`. Run server with `USE_PUBLISHED_CONTENT=1` to load the snapshot instead of live `game-data/`.
- **Model path audit:** `pnpm run audit:model-paths` — lists `glb-links.json`, `world/objects.json`, and `world/asset-pools.json` references under `/assets/models/…` or `/world-assets/…` missing on disk. Resolves monorepo root even when `cwd` is `server/` (ignores `server/game-data` symlink). **CI** runs this after build (must pass). Admin UI: **„3D-Pfade prüfen“** → `GET /api/admin/content/model-path-audit`.

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
