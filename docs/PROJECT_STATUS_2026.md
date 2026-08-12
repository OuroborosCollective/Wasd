# Project status — Areloria / Ouroboros (June 2026)

This file is the practical current-state snapshot. Use it before trusting older reconstruction or handover docs.

---

## ARE truth-path rule

All active runtime work follows this rule:

```text
No mock truth.
No fake snapshots.
No workflow tricks.
No stub systems in the truth path.
No facade that replaces real ARE causality.
```

Valid runtime truth must come from tick/logicalIndex, kappa, chunk/position, hash/manifest, journal/delta/replay, resolver input, or real runtime providers.

---

## Core runtime architecture

| Item | Status |
|------|--------|
| Monorepo layout | `client/` (Vite + Babylon.js), `apps/client-2d/` (PixiJS v7 + React), `server/` (Express + WebSocket), `game-data/` (authoritative JSON content) |
| Main server loop | `server/src/core/WorldTick.ts` at ~100 ms sim tick |
| Main client entry | `client/src/main.ts` |
| 2D client entry | `apps/client-2d/src/App.tsx` |
| Primary rendering (3D) | Babylon.js (`@babylonjs/core` + loaders + materials + addons) |
| Primary rendering (2D) | PixiJS v7 + React UI (`apps/client-2d/`) |
| Networking | WebSocket (`ws`) via `server/src/networking/WebSocketServer.ts` |
| Manifest System | Deterministic server-authoritative state via hash chain in `server/src/core/manifest/`; client divergence detection in `apps/client-2d/src/manifest/`; resync API at `/api/manifest/*` |
| Data content root | `game-data/` by default, optional published pack via `USE_PUBLISHED_CONTENT` / `CONTENT_PACK_DIR` |

---

## Authentication and persistence

| Item | Status |
|------|--------|
| Server auth verification | Supabase JWT flow with guest/dev toggles. Public release lockdown tracked by #2040. |
| Client auth provider | `VITE_AUTH_PROVIDER` supports `supabase` or `none`; auto mode resolves to Supabase if configured. |
| Persistence drivers | `PERSISTENCE_DRIVER`: `auto` / `postgres` / `file`. Backup/restore proof tracked by #2039. |
| JSON fallback | `PLAYER_SAVE_FILE` default under `data/`. |
| Redis usage | Optional (`ioredis`) for cache/chat relay paths, graceful fallback when unset. |
| Health endpoint | `GET /health` includes auth, persistence, playtester, self-healing and content-root summary. Release observability tracked by #2049. |

---

## Gameplay systems live and wired

| Domain | Live status |
|--------|-------------|
| Players/combat | Movement, target selection, attack handling, skill usage, cooldown/mana flow, death/respawn are wired. Balance/UI hardening remains open. |
| Inventory/equipment/loot | Inventory stacks, equip/unequip, loot drop + pickup and sync are active. |
| Canonical loot truth | Production path is `LootDirector -> ProceduralLootMachine -> loot_delta`. Inventory-Consumption trägt persistente Loot-Origins; bei vollständig abgelehntem Inventar-Delta übernimmt ausschließlich der serverseitige WorldDrop-Consumer. Ein Defeat→Delta→Inventory→Restart-Replay-Test deckt den Pfad ab. Legacy `LootSystem` ist quarantined. |
| Player Stats Sync | Server-authoritative XP/level tracking via `PlayerStatsDirector`; `player_stats_snapshot` broadcast via WebSocket. |
| Quest system | Quest start/progression/sync and talk/collect/combat updates are active. |
| Questline system | Questline engine + bridge and unlock propagation are wired. |
| NPC runtime | `NPCSystem`, memory cache/persistence, relationships, proactive chat and game-data loading are wired. |
| Living Duden / NPC speech | Runtime language content loads from `game-data/language`; 2D NPC interaction emits runtime dialogue packets. |
| Lineage runtime | FamilyHouseRegistry, birth journal, replay, LineageTickRunner, snapshot bridge and visible-POI runtime provider exist. |
| Lineage worldSurface | Server projects houses/nodes into `liveGameplaySnapshot.worldSurface`; 2D renders markers; 3D rendering tracked by #2046. |
| Ouroboros agents | `OuroborosEngine` is instantiated and ticked from `WorldTick`. |
| World systems | Chunks, observers, world objects, weather/time and terrain adapters are wired. |
| Resource entities | Deterministic resource nodes and chunk coordinates are wired; remaining deterministic audit cleanup tracked by #2041. |
| Storage system | `StorageEntity` entities with inventory, `open_storage`/`transfer_item` handlers in WorldTick. |
| Warfront | `WarfrontSystem` lifecycle, status pushes and reward claims are wired. |
| World boss | `WorldBossDungeonSystem` encounter flow and ranking summaries are wired. |
| Vote system | Vote banner/session/status and reward claims are wired. |
| Crafting | Server-authoritative starter crafting loop is wired and visible in snapshots/UI. |
| Admin content tools | `/api/admin/content/*` routes + `/admin-content.html` are active. |

---

## Release blockers and open integration issues

| Issue | Purpose |
|---:|---|
| #2038 | Repeatable production deploy and live verification gate |
| #2039 | Persistence backup and restore proof |
| #2040 | Production auth and session hardening |
| #2041 | Remaining deterministic audit violations |
| #2042 | Mobile and browser performance budget |
| #2043 | Player-facing UI coverage for critical gameplay |
| #2044 | Audited release content pack and asset license proof |
| #2045 | Required full-loop E2E and release smoke gate |
| #2046 | Render lineage worldSurface in the 3D client |
| #2050 | Runtime civic state from tick and house data |
| #2047 | Runtime market pricing from resource state |
| #2048 | Item provenance, trading and anti-duplication audit |
| #2049 | Runtime observability and release SLO dashboard |

---

## Playtester monitor and WebRTC stream mode

| Item | Status |
|------|--------|
| Playtester runtime | `AutonomousPlaytester` enabled by `PLAYTESTER_ENABLED` |
| Monitor mode default | `PLAYTESTER_MONITOR_MODE=webrtc` |
| Viewer page | `/playtester-monitor.html` |
| Publisher page | `/playtester-render-publisher.html` |
| Signaling | `PlaytesterWebRTCSignaling` at `PLAYTESTER_MONITOR_SIGNAL_PATH` |
| Release reporting | Open under #2049 |

---

## Content and asset pipeline

| Item | Status |
|------|--------|
| World asset sync | `scripts/sync-world-assets.mjs` mirrors repo assets into client public paths |
| GLB links and pools | File-based content paths + GLB registry + asset pool resolver are active |
| Admin model needs | `GET /api/admin/content/model-needs` provides needed/satisfied model suggestions |
| Publish snapshot | `pnpm run content:publish` creates `published-content/current` pack |
| Model audit | `pnpm run audit:model-paths` and admin model-path audit endpoint available |
| Release content pack | Open under #2044 |

---

## Testing/build toolchain

| Item | Status |
|------|--------|
| Unit/integration tests | Vitest (`pnpm run test`) |
| E2E tests | Playwright (`pnpm run test:e2e`, `pnpm run test:e2e:ci`) |
| Lint | ESLint (`pnpm run lint`) |
| Build | Root build compiles client then server (`pnpm run build`) |
| CI baseline | Lint + tests + build + model-path audit + E2E workflows exist |
| Required release smoke | Open under #2045 |
| Deterministic hardcode cleanup | Open under #2041 |

---

## Gameplay Vertical Slice Status

### Complete foundations

- Quest persistence and production ops are merged.
- Auth-bound player identity is active.
- Quest, skill and inventory state support persistence paths.
- Resource gathering connects world interaction to skills and inventory.
- Crafting loop exists: Gather -> Inventory -> Craft -> XP -> Snapshot/UI.
- Basic gathering tools exist and can be equipped.
- Lineage birth journal/replay/surface pipeline exists.

### Current live gameplay loop

```text
Gather starter resource node
-> Gain skill XP
-> Receive persistent resource item
-> Craft starter recipe/tool
-> Consume resource item
-> Receive persistent crafted item
-> Gain Crafting XP
-> See updated state in LiveGameplaySnapshot and 2D panels
```

### Partial systems

| System | Status | Notes |
|--------|--------|-------|
| Quest Persistence | Foundation complete | Production backup proof still open in #2039 |
| Skill Progression | Partial | MVP skills and XP persistence exist |
| Resource Gathering | Partial | Starter and chunk resources exist; release audit cleanup remains #2041 |
| Inventory | Partial | Resource/crafted/loot items exist; provenance/trading open #2048 |
| Crafting | Partial | Starter recipes and tool recipes exist |
| Guild/Faction | Partial | Snapshot visible, data not fully wired |
| Equipment | Partial | Basic gathering tools exist; combat equipment open |
| Lineage | Partial | Server/2D path exists; 3D path open #2046 |
| Economy | Planned | Runtime pricing open #2047 |
| Civic world state | Planned | Runtime state open #2050 |

### Not yet complete

- Release deploy verification (#2038)
- Backup/restore proof (#2039)
- Production auth lockdown (#2040)
- Remaining deterministic audit cleanup (#2041)
- Mobile/browser performance budget (#2042)
- Player-facing UI coverage (#2043)
- Release content pack audit (#2044)
- Required full-loop release gate (#2045)
- 3D lineage worldSurface rendering (#2046)
- Runtime market pricing (#2047)
- Item provenance and trading audit (#2048)
- Runtime observability dashboard (#2049)
- Runtime civic state (#2050)

---

## Maintenance rule

When runtime behavior changes, update this file together with:

- `README.md`
- `docs/ROADMAP_TO_RELEASE.md`
- `docs/RELEASE_CHECKLIST.md`
- relevant subsystem docs under `docs/`

Last refreshed: 2026-06-15
