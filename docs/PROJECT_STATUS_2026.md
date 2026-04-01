# Project status — Arelorian / Ouroboros (April 2026)

This document is the **authoritative snapshot** of what works today in the repository. Agents and humans should read this before assuming older docs (reconstruction packs, legacy SESSION notes) reflect current behavior.

## Renderer and client

| Item | Status |
|------|--------|
| **Primary 3D engine** | **Babylon.js** (`@babylonjs/core`, `@babylonjs/loaders`) |
| **Boot path** | `client/src/main.ts` → `createBabylonApp` → `BabylonAdapter` |
| **Legacy / fallback** | `PlayCanvasAdapter` exists under `client/src/engine/playcanvas/` as **emergency fallback** if Babylon bootstrap throws — not the supported path for new work |
| **Bridge** | `client/src/engine/bridge/` — `IEngineBridge`, `EntityViewModel`; keep simulation off the client |

## Server and networking

| Item | Status |
|------|--------|
| **Stack** | Node, Express, WebSocket (`server/src/networking/`) |
| **Game loop** | `WorldTick` — simulation tick **100 ms**; `entity_sync` broadcast **configurable** (`GameConfig.stateBroadcastIntervalMs`, default **200 ms**) |
| **Movement** | Held WASD + `move_intent` (joystick); applied each tick with `GameConfig.playerSpeed` |
| **Interact / dialogue** | `interact` resolves **nearest NPC**; `dialogue_choice` / `quest_accept`; `talk_to` quests complete on target NPC contact |
| **Scenes** | `game-data/scenes/*.json` — spawns and trigger zones (server-side) |
| **NPC spawns** | `game-data/spawns/npc-spawns.json` (path resolves from repo root or `server/` cwd) |
| **Starter content** | **Millbrook** hub: `npc_guide` (Linnea), quests `starter_welcome` / `village_tour`, plus existing Mara / Elder / Guard chain — see `game-data/` |

## World objects and assets

| Item | Status |
|------|--------|
| **Static props** | `game-data/world/objects.json` — loaded into `WorldObjectSystem`; **placeholder** models may use `chest.glb` until real village GLBs are wired |
| **Textures (dev)** | Optional Babylon Playground textures via jsDelivr (`client/src/engine/babylon/playgroundTextures.ts`) |
| **Production assets** | `world-assets/` and `client/public/` — team replaces placeholders |

## Deploy and ops

| Item | Status |
|------|--------|
| **CI / VPS** | `.github/workflows/deploy.yml` — SSH deploy, `update.sh` when build exists, **health check** on `/health` |
| **PM2** | `deploy/write_pm2_ecosystem.sh` — `cwd` = repo root, `CLIENT_ROOT_DIR` for static client |
| **Details** | Root `DEPLOYMENT.md`, `deploy/deploy.sh`, `deploy/update.sh` |

## Tests and quality

| Item | Status |
|------|--------|
| **Server tests** | Vitest — run `pnpm run test` (600+ tests typical) |
| **Lint** | `pnpm run lint` |
| **Content validation** | `server` build runs `validateContent.ts` against `game-data/` |

## Known gaps (high level)

See **`docs/ROADMAP_TO_RELEASE.md`** for the full backlog aligned with the design bible. Short list:

- Client bundle is **large** (Babylon) — code-splitting recommended  
- Many **server modules** are implemented but not all wired end-to-end in `WorldTick` or exposed to the live client UI  
- **Combat** `attack` message is thin (broadcast + stub)  
- **Quest types** `collect` / full **combat** completion need server hooks comparable to `talk_to`  
- **React** appears in root dependencies but the **game shell** is largely vanilla TS + DOM UI panels  

---

**Maintenance rule:** After any merge that changes behavior, architecture, or major features, update this file **and** `docs/ROADMAP_TO_RELEASE.md` in the same PR when practical.
