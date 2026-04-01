## Zero-Click Scene Layouts (Server Authoritative)

Scene spawns and trigger zones are **server-driven** (no client-editor trigger scripts required). The server loads them from JSON files in `game-data/scenes/`. The Babylon client only renders state from `entity_sync` and local scene/spawn hints from the server.

### Active layout file

- `game-data/scenes/didis_hub.json`

### How it works

1. On server startup, `WorldTick` loads all `*.json` files from `game-data/scenes/`.
2. Spawn points and trigger zones become runtime authority on the server.
3. Clients only render visuals and send movement intent.
4. Server detects when a player enters a trigger zone and sends `scene_changed`.

### JSON schema

```json
{
  "sceneId": "didis_hub",
  "defaultSpawnKey": "sp_player_default",
  "spawnPoints": {
    "sp_player_default": { "x": 0, "y": 0, "z": 0 },
    "sp_didi_01": { "x": 18, "y": 0, "z": 6 },
    "sp_didi_02": { "x": -18, "y": 0, "z": 6 }
  },
  "triggerZones": [
    {
      "id": "tr_to_didi_01",
      "x": 8,
      "y": 0,
      "radius": 2.2,
      "targetSpawnKey": "sp_didi_01",
      "allowedSpawnKeys": ["sp_player_default", "sp_didi_02"]
    }
  ]
}
```

### Notes

- `x`/`y` in trigger zones use server simulation coordinates.
- `spawnPoints[*].z` is used for rendered Y in 3D mapping (as already used in existing code path).
- If a layout file is missing or invalid, defaults in `WorldTick` remain as fallback.
