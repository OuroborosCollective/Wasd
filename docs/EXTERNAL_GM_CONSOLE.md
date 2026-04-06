# External GM Console (Browser Tool)

This project now includes a standalone browser GM console that can be used outside of the in-game UI.

## Files

- `client/public/gm/index.html`
- `client/public/gm/app.js`

## Open

After deploying client assets, open:

- `https://<your-domain>/gm/`

## Login / Connect

1. Enter WebSocket URL:
   - `wss://<your-domain>/ws`
2. Enter Firebase ID token (for admin/gm user).
3. Optional GM panel token:
   - set `GM_PANEL_TOKEN` on server and paste same value in the GM console.
   - this enables an additional secure override path for `gm_*` and `admin_glb_*` commands.
4. Optional scene/spawn:
   - Scene: `didis_hub`
   - Spawn: `sp_player_default`
5. Click **Connect**.

## Features

- Command groups similar to MMORPG event GM workflows:
  - World: weather, time, broadcast, world events
  - NPC: spawn/remove
  - Player ops: list, kick/ban/mute/unmute/unban, teleport
  - Economy: set/reset prices
  - Nations: create nation, diplomacy, territory
- Event templates:
  - loaded from `game-data/gm/event-templates.json`
  - trigger with one click via `gm_run_event_template`
  - supports phased actions (broadcasts, weather, time, npc spawns, economy events)
- Live event log panel
- Mini-map style preview panel fed by `gm_preview_snapshot`
- Heatmap visualization toggle in preview panel

## Notes

- GM commands are server-authoritative in `server/src/core/WorldTick.ts`.
- Role check is enforced (`admin` or `gm`) and can be augmented by `GM_PANEL_TOKEN`.
- Event template scheduler currently runs in-memory per server process.
