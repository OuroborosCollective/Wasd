# AGENTS.md

## Cursor Cloud specific instructions

### Project overview
Arelorian/Ouroboros is a browser-based MMORPG built as a pnpm workspace with two packages: `server/` (Express + WebSocket game server) and `client/` (Vite + Babylon.js/PlayCanvas 3D client). See `README.md` for full architecture.

### Running the development server
- **Command:** `pnpm run dev` (runs `tsx watch src/index.ts` in `server/`).
- The server starts on port 3000 and embeds the Vite client dev middleware (serves the client at `/`).
- **Known gotcha:** `tsx watch` may restart in a loop because Vite middleware writes temp files to `client/node_modules/.vite-temp/`. For a stable session, run `npx tsx server/src/index.ts` directly (without watch) from the workspace root.
- Firebase/Firestore is optional for local dev. Without `FIREBASE_SERVICE_ACCOUNT_KEY`, the server logs warnings but continues with in-memory state. Auth tokens are bypassed in dev mode (any WS login without a token creates a `dev_*` player).
- Redis and PostgreSQL are optional; the server falls back gracefully without them.

### Lint, test, build
- **Lint:** `pnpm run lint` (ESLint from root; ignore the `.eslintignore` deprecation warning).
- **Test:** `pnpm run test` (Vitest, runs 600+ server tests; config at `vitest.config.ts`).
- **Build:** `pnpm run build` (builds client with Vite, then compiles server TypeScript).

### Environment variables
Copy `.env.example` to `.env`. Only `PORT` and `NODE_ENV` are needed for local dev without Firebase. See `.env.example` for full list.

### Key ports
| Service | Port |
|---------|------|
| Game Server (Express + WS + Vite middleware) | 3000 |
| Client standalone Vite dev server (if run separately) | 3001 |

### Testing the game loop without a browser
Connect via WebSocket to `ws://localhost:3000/ws` and send `{"type":"login"}`. The server assigns a dev player and broadcasts `entity_sync` packets every 100ms tick. Use `move_intent`, `interact`, and `attack` message types.
