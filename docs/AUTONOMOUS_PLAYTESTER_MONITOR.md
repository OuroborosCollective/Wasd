# Autonomous NPC Playtester + Live Monitor

## Purpose

The Autonomous Playtester system runs a deterministic server-side NPC test agent (`playtester_001`) that continuously exercises core gameplay loops (movement, NPC interaction, quest progression, loot pickup, inventory/equipment, and combat checks).  
It exists so admins can validate content and visual world quality live even on weak devices.

## What this system does

- Starts a rule-based playtester loop when enabled.
- Simulates actions through existing authoritative server message handling.
- Streams **live monitor state** through a dedicated WebSocket path (`/playtester-monitor` by default).
- Provides a separate monitor page (`/playtester-monitor.html`) with a third-person spectator view.
- Writes debug/action logs to JSONL.

## What this system does NOT do

- No video recording.
- No stream archive / replay persistence.
- No screenshot automation.
- No replacement of core quest/combat/inventory engines.

Only debug logs are persisted.

## Activation

Set environment variables:

- `PLAYTESTER_ENABLED=true` to activate.
- Optional tuning:
  - `PLAYTESTER_TICK_MS` (default `500`)
  - `PLAYTESTER_ID` (default `playtester_001`)
  - `PLAYTESTER_DISPLAY_NAME` (default `Playtester Bot`)
  - `PLAYTESTER_LOG_ENABLED` (default `true`)
  - `PLAYTESTER_DEBUG_LOG_PATH` (default `data/logs/playtester-debug.jsonl`)
  - `PLAYTESTER_STREAM_ENABLED` (default `true`)
  - `PLAYTESTER_MONITOR_PATH` (default `/playtester-monitor`)
  - `PLAYTESTER_MONITOR_TOKEN` (recommended in production)
  - `PLAYTESTER_MONITOR_RADIUS_CHUNKS` (default `2`)
  - `PLAYTESTER_MONITOR_PERF_RADIUS_CHUNKS` (default `1`)

If `PLAYTESTER_ENABLED=false` (default), the system remains inactive and normal gameplay is unchanged.

## Monitor access and security

### WebSocket stream

- Path: `/playtester-monitor` (configurable with `PLAYTESTER_MONITOR_PATH`)
- Auth:
  - If `PLAYTESTER_MONITOR_TOKEN` is set: token required (query `?token=...` or `x-playtester-token`/Bearer header during handshake).
  - If token is not set:
    - dev/non-production: allowed
    - production: loopback-only fallback

### Monitor page

- URL: `/playtester-monitor.html`
- Uses same token gate logic as monitor API and WebSocket expectations.

### Monitor debug endpoint

- `GET /api/playtester/debug-log`
- Returns enabled/stream/token requirements + debug log path.
- Uses same access gate.

## Stream payload

The monitor stream emits `playtester_monitor_update` snapshots with:

- `playtester`: live status (position/chunk/action/goal/quest/inventory/equipment/nearby/events/warnings).
- `camera`: third-person follow metadata (`mode`, `offset`, `lookAt`).
- `scene.chunks`: visible chunk slice around playtester.
- `scene.entities`: players/NPCs/loot/world objects with asset inspection fields (`assetId`, `assetType`, `glbPath`, `scale` when available).
- `overlay`: condensed debug data for UI overlays.
- `renderHints`: performance flags and radius.

## Third-person monitor behavior

- Camera follows the playtester entity using existing Babylon follow behavior.
- Admin sees:
  - nearby chunks
  - playtester/player entities
  - NPCs/enemies
  - loot entities
  - world objects and linked GLB paths when available
- Overlay includes:
  - current action/goal/chunk/quest step
  - nearby interactables
  - last events/warnings
  - visible asset inspection list (`assetId`, `entityId`, `assetType`, `position`, `scale`)

## Performance mode

Monitor supports low-cost operation via query params and stream hints:

- `?performance=1` (default on monitor page)
- `?placeholder=1` for placeholder asset mode
- `?radius=<n>` chunk radius reduction

Performance mode reduces streamed/rendered scope and disables heavy visual expectations (e.g. shadows/particles in hints).

## Debug log format

Debug log file (JSONL), default:

- `data/logs/playtester-debug.jsonl`

Entry fields:

- `ts`
- `tick`
- `playtesterId`
- `action`
- `result`
- `goal`
- `questId`
- `step`
- `position`
- optional `targetId`, `warning`, `error`

Example:

`{"ts":1710000000000,"tick":42,"playtesterId":"playtester_001","action":"interact_with_npc","result":"quest_started","goal":"start_new_quest","questId":"first_steps","step":1,"position":{"x":12,"y":0,"z":8},"targetId":"npc_1"}`

## Known limitations

- Playtester currently prioritizes deterministic smoke coverage over advanced pathfinding.
- Quest start strategy is generic and content-order dependent.
- Monitor renders from streamed state (not full gameplay client ownership model), intended for admin inspection/debug.
