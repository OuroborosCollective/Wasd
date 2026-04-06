# Project status — Arelorian / Ouroboros (April 2026)

This document is the **authoritative snapshot** of what works today in the repository. Agents and humans should read this before assuming older docs (reconstruction packs, legacy SESSION notes) reflect current behavior.

## Renderer and client

| Item | Status |
|------|--------|
| **Primary 3D engine** | **Babylon.js** (`@babylonjs/core`, `@babylonjs/loaders`) |
| **Boot path** | `client/src/main.ts` (thin shell) → `clientBoot.ts` → `createBabylonApp` → `BabylonAdapter` |
| **Vite chunks** | `babylon-core` vs `babylon-loaders` — glTF plugin loads on **first GLB** (`BabylonAdapter`), not on first paint |
| **WebGL failure** | `Engine.IsSupported` → full-screen overlay; **context lost** → overlay + link to Babylon WebGL docs |
| **Mobile performance** | Touch / narrow viewports: **no** `preserveDrawingBuffer` (unless `?screenshot=1`), **hardware scaling**, **maxFPS 30** (Android **24**), default **ARE mode `off`**, **no skybox** + **no stencil buffer** on Android, **hover tooltip disabled** on touch, **GLB loads serialized** on Android (failed loads **do not** abort the queue), **name tags** only rebuilt when the **name string changes** (avoids flicker every `entity_sync`), throttled **target reticle** + **navigation marker** |
| **Default GLB fallbacks** | Server **`ensureGlbUrl`** + client **`BabylonAdapter`** defaults under **`/assets/models/*`** when paths missing; `AssetRegistry` / **`/world-assets`** only if those files are deployed |
| **Bridge** | `client/src/engine/bridge/` — `IEngineBridge`, `EntityViewModel`; keep simulation off the client |
| **HUD / mobile** | HP + stamina + **mana** **bars**; dialogue **bottom sheet**; **inventory / skills / equipment / quest** panels share **`panelLayout.ts`**; **inventory** lists stacks (**×N**) + **Equip**/**Use** + row **`title` tooltips** (stats from server item payloads); **usable** rows (consumable / equippable) get a light highlight when alive; **Use**/**Equip** disabled while **dead**; **equipment** shows weapon/armor + **Unequip**; loot chips when **`prefersCompactTouchUi()`**; **target reticle**; **world hover tooltip** (NPC role/faction/HP, loot); UI SFX via **Babylon `Sound`** with **Web Audio** fallback |

## Server and networking

| Item | Status |
|------|--------|
| **Stack** | Node, Express, WebSocket (`server/src/networking/`) |
| **Player persistence** | **`PERSISTENCE_DRIVER`**: `auto` / `firestore` / `file` / `spacetime` (stub: file fallback for players until Spacetime wired). **Firestore** when configured; else **`data/players.json`** (`PLAYER_SAVE_FILE`). Whitelist: `playerSnapshot.ts`. **`GET /health`** includes **`persistence.persistenceDriver`** |
| **WS login** | **Token** → Firebase uid; client uses **`getIdToken()`** on reconnect. Errors: **`invalid_token`** / **`login_required`**. **`REQUIRE_FIREBASE_AUTH=1`** → only token. **Vite:** `VITE_FIREBASE_*` or repo **`firebase-applet-config.json`** |
| **Skills** | **`use_skill`**: **`ember_bolt`**, **`frost_shard`**, **`arc_spark`**, **`vitality_tap`**, **`shadow_tag`**, **`aether_pulse`** — mana, cooldown, `spellStrike` / self-heal; **skill bar** (server cooldown fill); **Q** / mobile **SPELL** use **quick-cast** skill (`localStorage` **`areloria_quick_cast_skill_id`**, Skills panel radios + **Set quick**) |
| **E2E** | **`pnpm run test:e2e`** — Playwright starts built server (`scripts/e2e-webserver.sh`), checks **`/health`** + **`/e2e-smoke.html`** guest WS login + **`welcome.stats`** shape; CI: **`.github/workflows/ci.yml`** runs **`pnpm run test:e2e:ci`** after build |
| **Auth (client)** | HUD: **Google**, **email/password** sign-in & create; **Verify email** / **Reset password** (Firebase); token refresh on WS reconnect |
| **WS limits** | **`wsMaxMessageBytes`**, **`wsMaxMessagesPerSecond`** per socket; **`wsMaxMessagesPerPlayerUidPerSecond`** per logged-in account (rolling 1s); override with **`WS_MAX_MESSAGES_PER_PLAYER_UID_PER_SECOND`** |
| **Inventory** | **Stacks** for `consumable` + `misc` (override with `stackable` / `maxStack` on items); merge on load; **Quest collect** counts `quantity` |
| **Combat target** | Client **tap** on canvas → `set_target` (locks **`combatTargetNpcId`**, persisted); **`attack`** prefers locked target in range |
| **Mana** | Passive **regen** (`GameConfig.playerManaRegenPerSecond`); **`playerManaPerLevel`** (+5 max mana per character level above 1; current mana increases by the same delta on level-up); consumables e.g. **`minor_mana_draught`** via **`use_item`** |
| **Observability** | **`GET /health`** includes **`persistence`** (last save timing, Firestore flag, last error) |
| **No-code content admin (GLB + asset pools)** | **`/api/admin/content`**: **`/choices`** (NPC/Objekt/Rolle/Typ/Monster aus Content-Root), **`/validate-preview`**, **`/publish-pack`** (Repo-`game-data` → `published-content/current` wenn cwd zum Monorepo passt). GLB-Pfade unter **`/assets/models/`** werden gegen **`client/public/assets/models`** geprüft. UI **`/admin-content.html`** (DE) |
| **Game loop** | `WorldTick` — simulation tick **100 ms**; global `entity_sync` tick from **`stateBroadcastIntervalMs`** (default **200 ms**); sockets with **`login.clientHints.lowBandwidth`** (touch client) get **per-socket throttle** at **`stateBroadcastIntervalMobileMs`** (default **400 ms**, override **`STATE_BROADCAST_INTERVAL_MOBILE_MS`**) |
| **Movement** | Held WASD + `move_intent` (joystick); applied each tick with `GameConfig.playerSpeed` |
| **Interact / dialogue** | `interact` resolves **nearest NPC** or **loot on ground** (whichever is closer in range); `dialogue_choice` / `quest_accept`; `talk_to` quests complete on target NPC contact |
| **Combat** | Target pick in **`selectAttackTarget.ts`** (tested); **ranged** weapons cost **mana** (`item.manaCost` or default **3** if `attackRange` > melee); attack **cooldown** applies only after a valid swing (mana + target OK); while **dead**, **`attack`** / **`use_skill`** get a **toast** (not silent); **`equip_item`** / **`unequip_item`** WS; **`InventorySystem`** equips **armor** slot; **`entity_sync` NPCs** include **health/maxHealth** + **`combatThreat`** / **`combatNpcId`** / **`role`** |
| **Scenes** | `game-data/scenes/*.json` — spawns and trigger zones (server-side) |
| **NPC spawns** | `game-data/spawns/npc-spawns.json` (path resolves from repo root or `server/` cwd) |
| **Starter content** | **Millbrook** hub: `npc_guide` (Linnea), quests `starter_welcome` / `village_tour`, plus existing Mara / Elder / Guard chain — see `game-data/` |

## World objects and assets

| Item | Status |
|------|--------|
| **Static props** | `game-data/world/objects.json` — loaded into `WorldObjectSystem`; client keeps **prop/building** GLBs **non-pickable** so **`scene.pick`** stays cheap on mobile |
| **Textures (dev)** | Optional Babylon Playground textures via jsDelivr (`client/src/engine/babylon/playgroundTextures.ts`) |
| **Production assets** | `world-assets/` and `client/public/` — team replaces placeholders |

## Deploy and ops

| Item | Status |
|------|--------|
| **CI / VPS** | **`.github/workflows/ci.yml`** — lint, Vitest, build, Playwright; **`.github/workflows/deploy.yml`** — SSH deploy, `update.sh` when build exists, **health check** on `/health` |
| **PM2** | `deploy/write_pm2_ecosystem.sh` — `cwd` = repo root, `CLIENT_ROOT_DIR` for static client |
| **Details** | Root `DEPLOYMENT.md`, `deploy/deploy.sh`, `deploy/update.sh` |

## Tests and quality

| Item | Status |
|------|--------|
| **Server tests** | Vitest — run `pnpm run test` (600+ tests typical); WebSocket **`use_skill`** in **`use-skill-ws.test.ts`**; **`attack`** / **`set_target`** / **`entity_sync`** NPC fields in **`combat-ws.test.ts`**; per-UID WS cap in **`ws-player-uid-rate.test.ts`** |
| **Lint** | `pnpm run lint` |
| **Content validation** | `server` build runs `validateContent.ts` against the active **content root** (default: repo `game-data/`; optional **published pack** — see below) |
| **Published content (optional)** | `pnpm run content:publish` copies validated `game-data/` → `published-content/current/` + `content-pack-manifest.json`. Server: **`USE_PUBLISHED_CONTENT=1`** or **`CONTENT_PACK_DIR`**. **`GET /health`** returns **`content.mode`** and **`content.root`**. Legacy `game-data/` unchanged if unset |

## Known gaps (high level)

See **`docs/ROADMAP_TO_RELEASE.md`** for the full backlog aligned with the design bible. Short list:

- Client **index** chunk still large — further **dynamic `import()`** for heavy UI panels possible  
- Many **server modules** are implemented but not all wired end-to-end in `WorldTick` or exposed to the live client UI  
- **Combat** still has no party/revive, aggro UI lists, or full combat log — see roadmap Tier A2  
- **React** appears in root dependencies but the **game shell** is largely vanilla TS + DOM UI panels  

### Recently wired (snapshot)

- **`attack`**: target filter + weapon damage bonus + player attack cooldown; hostile **counter-attack**; loot drops + interact pickup; combat XP on kill; **`stats_sync`** + **`toast`**  
- **Collect quests**: turn-in on **talk** to `targetNpcId` / `giverNpcId` when inventory has `requiredItemId` × count  
- **`quest_sync`** message + **`stats_sync`** (quests with collect progress, gold, XP)  
- **Quest log** reads **live** `playerState`; HUD shows **Gold / XP**  
- **Vite**: `manualChunks` for **babylon-core**, **babylon-loaders**, **firebase**, **game UI panels** (inventory/skills vs quest/equipment), **mobile teleport**, **PerformanceMonitor**
- **Client**: heavy panels loaded via **`dynamic import()`** (`lazyPanels.ts`) + idle **preload** after boot  
- **PlayCanvas removed**: client is **Babylon.js only**; default GLB map lives in `engine/babylon/AssetRegistry.ts`  
- **ItemRegistry** and related loaders use **`contentDataRoot`** (`server/src/modules/content/contentDataRoot.ts`) — same layout as `game-data/`, stable path from repo root  

---

**Maintenance rule:** After any merge that changes behavior, architecture, or major features, update this file **and** `docs/ROADMAP_TO_RELEASE.md` in the same PR when practical.
