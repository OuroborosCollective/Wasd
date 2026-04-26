# Architecture Overview

This document summarizes the architecture currently implemented in this repository.
For current operational details, see `docs/PROJECT_STATUS_2026.md`.

## Runtime topology

- Browser client (`client/`) runs Babylon.js, HUD/UI, and WebSocket protocol handlers.
- Server (`server/`) runs Express + WebSocket and the authoritative simulation loop (`WorldTick`).
- Data/content layer is JSON-first via `game-data/`, optionally replaced at runtime by a published content pack.

## Core control flow

1. Client sends `login` / `input` / `move_intent` / `interact` / `attack` / `use_skill` messages over WebSocket.
2. Server validates and routes messages in `GameWebSocketServer` and `WorldTick`.
3. `WorldTick` runs periodic simulation updates (players, NPCs, systems, events).
4. Server broadcasts `entity_sync`, status updates, and subsystem payloads.
5. Client updates world state and Babylon scene from authoritative sync payloads.

## Server core systems

- `server/src/core/WorldTick.ts`: main orchestrator.
- `server/src/networking/WebSocketServer.ts`: WS connection and protocol transport.
- `server/src/modules/npc/*`: NPC runtime, memory, relationships, heuristics.
- `server/src/modules/ouroboros/*`: autonomous world-agent loop.
- `server/src/modules/quest/*` + `questline/*`: quests and questlines.
- `server/src/modules/world/*`: world/chunk/weather/object systems.
- `server/src/modules/combat/*`, `loot/*`, `inventory/*`, `skill/*`: combat and progression.
- `server/src/modules/vote/*`, `warfront/*`, `core/WorldBossDungeonSystem.ts`: live event systems.
- `server/src/modules/content/*` + `api/adminContentRoute.ts`: admin content and GLB management.
- `server/src/modules/playtester/*`: autonomous playtester and monitor/stream stack.
- `server/src/modules/gameplay/GameplayFusionDirector.ts`: quest echo + adaptive profile + construction contracts integration.

## Client core systems

- `client/src/main.ts`: application boot.
- `client/src/engine/babylon/*`: Babylon rendering and asset loading.
- `client/src/core/MMORPGClientCore.ts`: sync/state integration with renderer.
- `client/src/networking/websocketClient.ts`: WS protocol client.
- `client/src/ui/*`: HUD, panels, mobile controls, overlay components.
- `client/src/playtesterMonitorViewerMain.ts`: lightweight monitor viewer.
- `client/src/playtesterRenderPublisherMain.ts`: render publisher for monitor stream mode.

## Auth and persistence

- Auth provider in current client runtime: Supabase (`client/src/config/gameAuth.ts` -> `supabase | none`).
- WS auth verification on server: Supabase JWT settings via `.env`.
- Persistence drivers implemented server-side: `auto | postgres | file`.
  - `auto` chooses Postgres when DB is configured, else file fallback.

## Content and assets

- Source content root: `game-data/`.
- Optional published content root: `published-content/current/` with `USE_PUBLISHED_CONTENT=1`.
- Asset path conventions:
  - `/assets/models/...` for client-facing model URLs.
  - Optional `/world-assets/...` static serving for mirrored/source assets.

## Deployment model

- PM2-managed Node server on VPS.
- CI/CD workflows trigger verification and deployment on `main`.
- Environment is controlled by `.env` on server, template in `deploy/.env.production.template`.
