# Project status — Areloria / Ouroboros (May 2026)

This file is the practical "what is shipped now" snapshot.
Use it before trusting older reconstruction or handover docs.

## Core runtime architecture

| Item | Status |
|------|--------|
| Monorepo layout | `client/` (Vite + Babylon.js), `client-2d/` (PixiJS v7 + React), `server/` (Express + WebSocket), `game-data/` (authoritative JSON content) |
| Main server loop | `server/src/core/WorldTick.ts` at ~100 ms sim tick |
| Main client entry | `client/src/main.ts` |
| 2D client entry | `apps/client-2d/src/DeterministicWorldIsoApp.tsx` (replaces `App.tsx` for deterministic isometric rendering) |
| Primary rendering (3D) | Babylon.js (`@babylonjs/core` + loaders + materials + addons) |
| Primary rendering (2D) | PixiJS v7 + React UI (`apps/client-2d/`) |
| Networking | WebSocket (`ws`) via `server/src/networking/WebSocketServer.ts` |
| **Player Vitals State** | Server-authoritative vitals (HP/MP/Stamina/XP) in `apps/client-2d/src/live/playerVitalState.ts`; heartbeat-driven via `playerVitalState.onHeartbeatVitals()`; HUD receives vitals via `usePlayerVitalState()` hook |
| **ArelorianStitchHud** | Deterministic HUD with server-authoritative vitals; receives `vitals` prop from heartbeat state; Gauge components display HP/MP/STA/XP percentages |
| Data content root | `game-data/` by default, optional published pack via `USE_PUBLISHED_CONTENT` / `CONTENT_PACK_DIR` |

## Authentication and persistence

| Item | Status |
|------|--------|
| Server auth verification | Supabase JWT flow (`USE_SUPABASE_WS_LOGIN`, `REQUIRE_SUPABASE_AUTH`, guest/dev toggles) |
| Client auth provider | `VITE_AUTH_PROVIDER` supports `supabase` or `none`; auto mode resolves to Supabase if `VITE_SUPABASE_*` is configured |
| Persistence drivers | `PERSISTENCE_DRIVER`: `auto` / `postgres` / `file` (auto prefers Postgres if DB configured, else JSON fallback) |
| JSON fallback | `PLAYER_SAVE_FILE` (default under `data/`) |
| Redis usage | Optional (`ioredis`) for cache/chat relay paths, graceful fallback when unset |
| Health endpoint | `GET /health` includes auth, persistence, playtester, self-healing, and content-root summary |

## Gameplay systems (live and wired)

| Domain | Live status |
|--------|-------------|
| Players/combat | Player movement, target selection, attack handling, skill usage, cooldown/mana flow, death/respawn are wired in `WorldTick` + combat/skill modules |
| Inventory/equipment/loot | Inventory stacks, equip/unequip, loot drop + pickup and sync are active |
| **Anti-Ninja Loot Lock** | Loot ownership with 60-second kill lock (600 ticks at 10Hz); `LootDirector` enforces causality guard via `ownerId` + `lockedUntilTick` |
| **Player Stats Sync** | Server-authoritative XP/level tracking via `PlayerStatsDirector`; RuneScape XP formula (50 × level^1.4); `player_stats_snapshot` broadcast via WebSocket |
| Quest system | Quest start/progression/sync and talk/collect/combat updates are active |
| Questline system | Questline engine + bridge and unlock propagation are wired |
| NPC runtime | `NPCSystem` + memory cache/persistence + relationships + proactive chat are wired |
| Ouroboros agents | `OuroborosEngine` is instantiated and ticked from `WorldTick` |
| World systems | Chunks, observers, world objects, weather/time, terrain adapters are wired |
| Resource entities | Deterministic RESOURCE entities with KAPPA-grid alignment via `ChunkModificationDirector` + `ResourcePopulator` |
| Storage system | `StorageEntity` entities with inventory, `open_storage`/`transfer_item` handlers in WorldTick |
| Warfront | `WarfrontSystem` lifecycle, status pushes, reward claims are wired |
| World boss | `WorldBossDungeonSystem` encounter flow and ranking summaries are wired |
| Vote system | Vote banner/session/status and reward claims are wired |
| Crafting | Crafting system is wired through server message handlers |
| Admin content tools | `/api/admin/content/*` routes + `/admin-content.html` are active |

## Playtester monitor and WebRTC stream mode

| Item | Status |
|------|--------|
| Playtester runtime | `AutonomousPlaytester` enabled by `PLAYTESTER_ENABLED` |
| Monitor mode default | `PLAYTESTER_MONITOR_MODE=webrtc` |
| Viewer page | `/playtester-monitor.html` (lightweight stream viewer) |
| Publisher page | `/playtester-render-publisher.html` (render publisher) |
| Signaling | `PlaytesterWebRTCSignaling` at `PLAYTESTER_MONITOR_SIGNAL_PATH` |
| Legacy dev mode | Optional `?mode=local3d` path kept as dev-only fallback |

## New fusion systems (now active)

| Integration | Status |
|------------|--------|
| Quest Echo Director | Active via `GameplayFusionDirector` + `WorldTick.tickFusionIntegrations()`; generates quest echo beacons from active quest context |
| Adaptive Quest Scene Profiles | Active via `GameplayFusionDirector` adaptive profile/override logic; hooked into NPC/world object GLB resolution |
| Construction Contracts | Active contract lifecycle from admin model needs to NPC assignment/completion flow |
| Scope | Applies outside playtester as part of live autonomous NPC runtime tick |

## Content and asset pipeline

| Item | Status |
|------|--------|
| World asset sync | `scripts/sync-world-assets.mjs` mirrors repo assets into client public paths |
| GLB links and pools | File-based content paths + GLB registry + asset pool resolver are active |
| Admin model needs | `GET /api/admin/content/model-needs` provides needed/satisfied model suggestions |
| Publish snapshot | `pnpm run content:publish` creates `published-content/current` pack |
| Model audit | `pnpm run audit:model-paths` and admin model-path audit endpoint available |

## Testing/build toolchain

| Item | Status |
|------|--------|
| Unit/integration tests | Vitest (`pnpm run test`) |
| E2E tests | Playwright (`pnpm run test:e2e`, `pnpm run test:e2e:ci`) |
| Lint | ESLint (`pnpm run lint`) |
| Build | Root build compiles client then server (`pnpm run build`) |
| CI baseline | Lint + tests + build + model-path audit + e2e workflow exists |

## Important clarifications

- Current docs should treat Supabase + Postgres/file persistence as the active production path.
- Legacy docs may still reference older auth stacks; treat those references as historical unless explicitly marked as currently supported.
- Root `next` dependency/config exists but is not the active game runtime path; the live game stack is Vite client + Express/WebSocket server.

## Maintenance rule

When runtime behavior changes, update this file together with:

- `README.md`
- `docs/ROADMAP_TO_RELEASE.md` (if release scope changed)
- Relevant subsystem docs under `docs/`
