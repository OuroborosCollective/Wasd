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
| **HUD / mobile** | HP + stamina + **mana** **bars**; dialogue **bottom sheet**; **inventory / skills / equipment / quest** panels share **`panelLayout.ts`**; **inventory** lists stacks (**×N**) + **Equip**/**Use**; **equipment** shows weapon/armor + **Unequip**; loot chips when **`prefersCompactTouchUi()`**; **target reticle**; **world hover tooltip** (NPC role/faction/HP, loot); UI SFX via **Babylon `Sound`** with **Web Audio** fallback |

## Server and networking

| Item | Status |
|------|--------|
| **Stack** | Node, Express, WebSocket (`server/src/networking/`) |
| **Player persistence** | **Firestore** when `FIREBASE_SERVICE_ACCOUNT_KEY` is set (whitelisted fields via `playerSnapshot.ts`); otherwise **`data/players.json`** (or `PLAYER_SAVE_FILE`). Load: merge into fresh `createPlayer` (**`isOffline: true`** until login). Saves: disconnect, **~20s** tick, debounced after loot / equip / combat HP / quests / scene / respawn |
| **WS login** | **Token** → Firebase uid; client uses **`getIdToken()`** on reconnect. Errors: **`invalid_token`** / **`login_required`**. **`REQUIRE_FIREBASE_AUTH=1`** → only token. **Vite:** `VITE_FIREBASE_*` or repo **`firebase-applet-config.json`** |
| **Skills** | **`use_skill`**: **`ember_bolt`**, **`frost_shard`** — mana, cooldown, `spellStrike`; **Q** / mobile **SPELL** quick-cast primary skill |
| **Auth (client)** | HUD: **Google**, **email/password** sign-in & create; token refresh on WS reconnect |
| **WS limits** | **`wsMaxMessageBytes`**, **`wsMaxMessagesPerSecond`** per socket |
| **Inventory** | **Stacks** for `consumable` + `misc` (override with `stackable` / `maxStack` on items); merge on load; **Quest collect** counts `quantity` |
| **Combat target** | Client **tap** on canvas → `set_target` (locks **`combatTargetNpcId`**, persisted); **`attack`** prefers locked target in range |
| **Mana** | Passive **regen** (`GameConfig.playerManaRegenPerSecond`); consumables e.g. **`minor_mana_draught`** via **`use_item`** |
| **Observability** | **`GET /health`** includes **`persistence`** (last save timing, Firestore flag, last error) |
| **Game loop** | `WorldTick` — simulation tick **100 ms**; `entity_sync` broadcast **configurable** (`GameConfig.stateBroadcastIntervalMs`, default **200 ms**) |
| **Movement** | Held WASD + `move_intent` (joystick); applied each tick with `GameConfig.playerSpeed` |
| **Interact / dialogue** | `interact` resolves **nearest NPC** or **loot on ground** (whichever is closer in range); `dialogue_choice` / `quest_accept`; `talk_to` quests complete on target NPC contact |
| **Combat** | Target pick in **`selectAttackTarget.ts`** (tested); **ranged** weapons cost **mana** (`item.manaCost` or default **3** if `attackRange` > melee); **`equip_item`** / **`unequip_item`** WS; **`InventorySystem`** equips **armor** slot; **`entity_sync` NPCs** include **health/maxHealth** + **`combatThreat`** |
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
