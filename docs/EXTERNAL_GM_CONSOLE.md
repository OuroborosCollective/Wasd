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
3. Optional scene/spawn:
   - Scene: `didis_hub`
   - Spawn: `sp_player_default`
4. Click **Connect**.

## Features

- Command groups similar to MMORPG event GM workflows:
  - World: weather, time, broadcast, world events
  - NPC: spawn/remove
  - Player ops: list, kick/ban/mute/unmute/unban, teleport
  - Economy: set/reset prices
  - Nations: create nation, diplomacy, territory
- Live event log panel
- Mini-map style preview panel fed by `gm_preview_snapshot`

## Notes

- GM commands are server-authoritative in `server/src/core/WorldTick.ts`.
- Role check is enforced (`admin` or `gm`).
- Some commands are lightweight wrappers over current game systems and can be extended further.
