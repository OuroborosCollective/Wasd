# Areloria / Ouroboros — Logic Documentation (Current Runtime)

## Purpose

This document summarizes the **implemented runtime logic** and major systems that are actively wired into the game loop.

Primary runtime references:

- `server/src/core/WorldTick.ts`
- `server/src/core/ServerBootstrap.ts`
- `client/src/main.ts`
- `client/src/engine/babylon/*`

## Core runtime architecture

- **Client:** Vite + TypeScript + Babylon.js.
- **Server:** Express + WebSocket (`ws`) + authoritative simulation loop (`WorldTick`) at 100 ms.
- **Data:** JSON content in `game-data/`; optional published snapshot from `published-content/current`.
- **Persistence:** `PERSISTENCE_DRIVER` = `auto | postgres | file` (auto chooses Postgres when configured, otherwise file fallback).
- **Auth:** Supabase JWT-based flow (optional guest/dev toggles).

## WorldTick responsibility model

`WorldTick` orchestrates live gameplay and runs:

1. template/event queue processing
2. optional playtester tick
3. warfront/worldboss progression
4. NPC tick + world tick
5. loot cleanup
6. periodic save
7. resonance/chat/ouroboros updates
8. entity/chunk broadcast sync

This file is the effective integration point for “is this system really live?”

## Gameplay systems currently wired

- **Combat and targeting**
  - attack targeting and threat flags
  - skill usage with cooldowns/mana checks
  - loot drops and pickup
- **Quest + questline**
  - talk/collect/combat objective updates
  - questline bridge unlock logic
- **NPC systems**
  - proximity interactions
  - memory cache + persistence flush
  - relationship + ouroboros pass
  - NPC chat behavior in proximity of players
- **World systems**
  - chunk synchronization
  - world object system
  - weather/time progression
- **Large features**
  - warfront
  - world boss dungeon
  - vote sessions/banners
  - crafting
  - admin content and GLB tooling
  - playtester (including monitor stream modes)

## New fused live systems (current)

`server/src/modules/gameplay/GameplayFusionDirector.ts` is now wired through `WorldTick` and affects live autonomous NPC behavior:

- **Quest Echo Director**
  - derives quest-target beacons from active quest state
  - exposes beacon state for monitor/debug UX
- **Adaptive Quest Scene Profiles**
  - applies temporary adaptive GLB overrides for NPC/object classes
- **Construction Contracts**
  - derives contract candidates from admin GLB model-needs
  - allows contractor-like NPCs to claim/complete contracts
  - creates world objects for completed contract builds

## Admin content logic

`server/src/api/adminContentRoute.ts` + content modules provide:

- model gallery tree
- GLB upload and path validation
- link management
- model-needs analysis endpoint (`GET /api/admin/content/model-needs`)
- content publish pack flow

## Playtester monitor logic

- server-side monitor/update stream and status endpoint
- WebRTC signaling and stream mode controls via `PLAYTESTER_*` vars
- lightweight monitor page with optional local 3D fallback mode

Reference docs:

- `docs/AUTONOMOUS_PLAYTESTER_MONITOR.md`
- `docs/PROJECT_STATUS_2026.md`

## What this document intentionally does not claim

- It does not claim every historical module file in `server/src/modules` is fully UI-exposed.
- It does not claim Firebase/Firestore as primary runtime stack.
- It does not describe roadmap/vision-only systems as production-complete.

For roadmap/vision see:

- `docs/ROADMAP_TO_RELEASE.md`
- `docs/MASTER_DESIGN_BIBLE.md`
