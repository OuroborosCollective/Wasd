# PlayCanvas Didi Scripts (Download + Einbindung)

Diese zwei Dateien kannst du direkt in PlayCanvas als Script-Assets importieren:

- `client/public/playcanvas/scripts/didi-scene-bootstrap.js`
- `client/public/playcanvas/scripts/didi-scene-trigger.js`

## 1) Download (direkt aus GitHub)

Nach Push sind die Raw-URLs:

- `<RAW_BASE>/client/public/playcanvas/scripts/didi-scene-bootstrap.js`
- `<RAW_BASE>/client/public/playcanvas/scripts/didi-scene-trigger.js`

`<RAW_BASE>` ist in der Regel:

- `https://raw.githubusercontent.com/OuroborosCollective/Wasd/<branch>`

Beispiel mit Branch:

- `https://raw.githubusercontent.com/OuroborosCollective/Wasd/cursor/mcp-play-canvas-integration-e792/client/public/playcanvas/scripts/didi-scene-bootstrap.js`
- `https://raw.githubusercontent.com/OuroborosCollective/Wasd/cursor/mcp-play-canvas-integration-e792/client/public/playcanvas/scripts/didi-scene-trigger.js`

## 2) PlayCanvas Import

1. PlayCanvas Editor -> **Assets**
2. **Upload** -> beide `.js` Dateien hochladen
3. Szene `didis_hub` öffnen

## 3) Bootstrap Script (einmal in Szene)

1. Entity `WorldRoot` auswählen
2. **Add Component** -> **Script**
3. Script `didiSceneBootstrap` hinzufügen

Empfohlene Werte:

- `sceneId`: `didis_hub`
- `hubSpawnName`: `sp_player_default`
- `didi01SpawnName`: `sp_didi_01`
- `didi02SpawnName`: `sp_didi_02`

Optional:

- `showQuickButtons`: `true` (Mobile/Touch Schnellbuttons im Canvas)

## 4) Trigger Script (pro Trigger-Entity)

Lege Trigger-Entities unter `Triggers` an (mit Collision Trigger + Script):

- `tr_to_didi_01`
- `tr_to_didi_02`
- `tr_to_hub_from_didi_01`
- `tr_to_hub_from_didi_02`

Je Trigger:

1. Entity auswählen
2. **Add Component** -> **Collision**
3. Type `box`, **Is Trigger** aktivieren
4. **Add Component** -> **Script**
5. Script `didiSceneTrigger` hinzufügen
6. Felder setzen:
   - `targetSceneId`: `didis_hub`
   - `targetSpawnKey`: je nach Ziel
   - `cooldownMs`: `1200`
   - `debugLog`: `true` (optional)

`targetSpawnKey` pro Trigger:

- `tr_to_didi_01` -> `sp_didi_01`
- `tr_to_didi_02` -> `sp_didi_02`
- `tr_to_hub_from_didi_01` -> `sp_player_default`
- `tr_to_hub_from_didi_02` -> `sp_player_default`

## 5) API Bridge im Browser

Scripts nutzen folgende globale Funktion (ist im Client bereits gesetzt):

- `window.requestSceneChange(sceneId, spawnKey)`

Fallbacks:

- WebSocket Direktsendung `scene_change`
- URL-Query fallback `?sceneId=...&spawnKey=...`
