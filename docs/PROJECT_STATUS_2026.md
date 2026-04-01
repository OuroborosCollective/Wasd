# Project status — Arelorian / Ouroboros (April 2026)

This document is the **authoritative snapshot** of what works today in the repository. Agents and humans should read this before assuming older docs (reconstruction packs, legacy SESSION notes) reflect current behavior.

## Renderer and client

| Item | Status |
|------|--------|
| **Primary 3D engine** | **Babylon.js** (`@babylonjs/core`, `@babylonjs/loaders`) |
| **Boot path** | `client/src/main.ts` (thin shell) → `clientBoot.ts` → `createBabylonApp` → `BabylonAdapter` |
| **Vite chunks** | `babylon-core` vs `babylon-loaders` — glTF plugin loads on **first GLB** (`BabylonAdapter`), not on first paint |
| **WebGL failure** | `Engine.IsSupported` → full-screen overlay; **context lost** → overlay + link to Babylon WebGL docs |
| **Default GLB fallbacks** | `client/src/engine/babylon/AssetRegistry.ts` — used when server does not send a `modelUrl` |
| **Bridge** | `client/src/engine/bridge/` — `IEngineBridge`, `EntityViewModel`; keep simulation off the client |

## Server and networking

| Item | Status |
|------|--------|
| **Stack** | Node, Express, WebSocket (`server/src/networking/`) |
| **Game loop** | `WorldTick` — simulation tick **100 ms**; `entity_sync` broadcast **configurable** (`GameConfig.stateBroadcastIntervalMs`, default **200 ms**) |
| **Movement** | Held WASD + `move_intent` (joystick); applied each tick with `GameConfig.playerSpeed` |
| **Interact / dialogue** | `interact` resolves **nearest NPC** or **loot on ground** (whichever is closer in range); `dialogue_choice` / `quest_accept`; `talk_to` quests complete on target NPC contact |
| **Combat** | `attack` picks **nearest valid target** (training dummy, `faction: Hostile`, or `role: Enemy`); **weapon** `damage` from `ItemRegistry` adds to hit; **hostile NPCs** **chase** in aggro radius + **leash**, counter-attack in melee; **player death** → `dead` + **respawn** message after delay; **loot** from `dropTable` (**items** and/or **goldMin/goldMax**), **pickup_loot** + interact; **mobile**: loot chips + death overlay (**`combatMobileUi.ts`**) |
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

- Client **index** chunk still large — further **dynamic `import()`** for heavy UI panels possible  
- Many **server modules** are implemented but not all wired end-to-end in `WorldTick` or exposed to the live client UI  
- **Combat** still has no death/respawn UI, aggro lists, or ranged abilities — see roadmap Tier A2  
- **React** appears in root dependencies but the **game shell** is largely vanilla TS + DOM UI panels  

### Recently wired (snapshot)

- **`attack`**: target filter + weapon damage bonus + player attack cooldown; hostile **counter-attack**; loot drops + interact pickup; combat XP on kill; **`stats_sync`** + **`toast`**  
- **Collect quests**: turn-in on **talk** to `targetNpcId` / `giverNpcId` when inventory has `requiredItemId` × count  
- **`quest_sync`** message + **`stats_sync`** (quests with collect progress, gold, XP)  
- **Quest log** reads **live** `playerState`; HUD shows **Gold / XP**  
- **Vite**: `manualChunks` for **babylon-core**, **babylon-loaders**, **firebase**, **game UI panels** (inventory/skills vs quest/equipment), **mobile teleport**, **PerformanceMonitor**
- **Client**: heavy panels loaded via **`dynamic import()`** (`lazyPanels.ts`) + idle **preload** after boot  
- **PlayCanvas removed**: client is **Babylon.js only**; default GLB map lives in `engine/babylon/AssetRegistry.ts`  
- **ItemRegistry** resolves `game-data` from `server/` cwd (`../game-data`)  

---

**Maintenance rule:** After any merge that changes behavior, architecture, or major features, update this file **and** `docs/ROADMAP_TO_RELEASE.md` in the same PR when practical.
