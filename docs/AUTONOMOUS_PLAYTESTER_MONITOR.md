# Autonomous Playtester Monitor (WebRTC Stream Mode)

## Purpose

The Playtester Monitor provides a low-overhead way to inspect live playtester behavior and world assets from admin devices.

Default mode is **remote-rendered WebRTC stream**:
- Admin viewer page does **not** run full local 3D world simulation.
- A dedicated render publisher captures canvas frames and streams video to viewers.

## Components

- `server/src/modules/playtester/AutonomousPlaytester.ts`  
  Server-side autonomous agent logic.
- `server/src/modules/playtester/PlaytesterMonitorStream.ts`  
  Monitor data stream payload generation.
- `server/src/modules/playtester/PlaytesterWebRTCSignaling.ts`  
  Signaling server for publisher/viewer offer-answer-ICE exchange.
- `client/src/playtesterMonitorViewerMain.ts`  
  Lightweight monitor viewer (video + debug overlay).
- `client/src/playtesterRenderPublisherMain.ts`  
  Dedicated render publisher client that captures canvas stream.
- `client/public/playtester-monitor.html`  
  Viewer entrypoint.
- `client/public/playtester-render-publisher.html`  
  Publisher entrypoint.

## Runtime Paths

- Viewer page: `/playtester-monitor.html`
- Publisher page: `/playtester-render-publisher.html`
- Status monitor WS: `/playtester-monitor` (default)
- WebRTC signaling WS: `/playtester-monitor-signal` (default)

Path defaults are configurable via `PLAYTESTER_MONITOR_*` environment variables.

## Configuration

Relevant env keys (see `.env.example`):

- `PLAYTESTER_ENABLED`
- `PLAYTESTER_MONITOR_MODE` (`webrtc` or `local3d`; default `webrtc`)
- `PLAYTESTER_MONITOR_TOKEN`
- `PLAYTESTER_MONITOR_PATH`
- `PLAYTESTER_MONITOR_SIGNAL_PATH`
- `PLAYTESTER_MONITOR_PUBLISHER_PATH`
- `PLAYTESTER_WEBRTC_ICE_SERVERS`
- `PLAYTESTER_STREAM_WIDTH`
- `PLAYTESTER_STREAM_HEIGHT`
- `PLAYTESTER_STREAM_FPS`
- `PLAYTESTER_STREAM_QUALITY`
- `PLAYTESTER_STREAM_SHADOWS`
- `PLAYTESTER_STREAM_PARTICLES`
- `PLAYTESTER_STREAM_RENDER_DISTANCE`

## Security

- If `PLAYTESTER_MONITOR_TOKEN` is set, viewer/signal access requires token via query/header/bearer.
- Without token, development is open; production falls back to loopback-only access.

## Monitor Payloads and Overlay

Viewer receives:
- WebRTC video stream (remote-rendered scene).
- Lightweight monitor/debug status messages (action, goal, quest state, nearby context, warnings/events).

This is intended for live validation of NPC behavior, quest execution, and GLB/world visual inspection without heavy local rendering.

## Non-Goals

- No video archive.
- No screenshot archive.
- No replay persistence.

Only debug/status logs are persisted where configured.
