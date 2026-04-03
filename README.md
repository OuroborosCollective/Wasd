# Arelorian / Ouroboros

Browser-based MMORPG: **authoritative Node server** + **Babylon.js client** (Vite). Gameplay data lives in **`game-data/`**; 3D assets in **`world-assets/`** and **`client/public/`**.

## Current stack (2026)

| Layer | Technology |
|-------|------------|
| **Client** | Vite, TypeScript, **Babylon.js** (`BabylonBoot`, `BabylonAdapter`), bridge pattern under `client/src/engine/bridge/` |
| **Server** | Express, WebSocket, `WorldTick` (~100 ms sim; configurable `entity_sync` interval) |
| **Data** | JSON in `game-data/` (NPCs, quests, dialogue, scenes, spawns, world objects) |

## Documentation map

- **`docs/PROJECT_STATUS_2026.md`** — what works today  
- **`docs/ROADMAP_TO_RELEASE.md`** — backlog to ship (aligned with design bible)  
- **`docs/DOCUMENTATION_INDEX.md`** — index of all docs + what is historical  
- **`docs/MASTER_DESIGN_BIBLE.md`** — creative / systems vision  
- **`AGENTS.md`** — dev commands for Cursor agents  
- **`DEPLOYMENT.md`** — VPS, PM2, GitHub Actions (Secrets inkl. optional **`DEPLOY_VERIFY_BASE_URL`**)  

## Prerequisites

- **Node.js** 18+ (22 recommended for VPS parity)
- **pnpm** (see lockfile) or npm as used in `package.json` scripts

## Install and run

```bash
pnpm install
cp .env.example .env   # optional for local dev
pnpm run dev           # server with Vite middleware (see AGENTS.md for watch gotcha)
```

Production-style:

```bash
pnpm run build
pnpm run start
```

## Architecture (short)

- **Networking**: WebSocket — `login`, `input`, `move_intent`, `interact`, `dialogue_choice`, `quest_accept`, `entity_sync`, etc.
- **Client entry**: `client/src/main.ts` → `MMORPGClientCore` → `connectSocket`
- **Server core**: `server/src/core/WorldTick.ts`, `server/src/networking/WebSocketServer.ts`

## Starter content (Millbrook)

Hub scene **`didis_hub`** with NPCs and quests defined under `game-data/` (e.g. `npc_guide`, `starter_welcome`, `village_tour`). Replace placeholder world objects in `game-data/world/objects.json` when final GLBs are ready.

## Cursor MCP + VPS

See **`docs/VITE_MCP_AND_VPS_SETUP.md`** and `.cursor/mcp.json`.

## Contributing and agents

Every non-trivial change should update **`docs/PROJECT_STATUS_2026.md`** and, if it affects release scope, **`docs/ROADMAP_TO_RELEASE.md`**. See **`agent/AGENT_BUILD_INSTRUCTIONS.md`**.
