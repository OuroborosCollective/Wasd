# SESSION_CONTEXT (2026-03-31)

## Meta
- Datum: 2026-03-31
- Repo: `Wasd` (Arbeitsverzeichnis `/workspace`)
- Branch in dieser Session: `cursor/instanz-chat-kontext-a431`
- Historischer Arbeitsbranch aus vorheriger Instanz: `cursor/mcp-play-canvas-integration-e792`
- Ziel: Wissensstand aus der vorherigen Cursor-Instanz nahtlos fortsetzen.

---

## Kurzfazit (heutiger Gesamtstand)

1. Auto-Deploy wurde repariert und verifiziert.
2. GM/PlayCanvas-Auslieferung und WebSocket-Scene-Flow wurden live verifiziert.
3. PlayCanvas-Editor-Probleme wurden diagnostiziert (Routing, Ammo, Import-Map, Scene-Visibility).
4. Architektur-Empfehlung wurde festgelegt: Babylon.js + React als sauberster Exit aus PlayCanvas, Server-Logik weitgehend unveraendert.
5. Asset-Swap-Workflow wurde als codebasierter No-Code-freundlicher Pfad vorbereitet.
6. Zweite Test-Repo wurde erstellt und auf denselben Stand synchronisiert.

---

## Chronologische Chronik (kompakt)

### 1) Deploy-Fix gestartet
- Anfrage: Deploy wieder stabil machen.
- Arbeiten:
  - Build-/Deploy-Pfad analysiert (`deploy/deploy.sh`, Client/Server package-Dateien).
  - Fehlende Build-Abhaengigkeiten ergaenzt.
  - Deploy-Script robuster gemacht (Node-Version-Upgrade-Logik, Build via package scripts).
  - Zusaetzliche Build-Blocker im Server behoben.
- Ergebnis: Lokale Builds gruen, Commit + Push + PR-Update.

### 2) Nach Merge validiert
- GitHub Actions auf `main` geprueft.
- Ergebnis: Deploy-Workflow erfolgreich (`completed success`).

### 3) GM-Link + Kurzanleitung + Script-Downloads
- GM-Seite und knappe PlayCanvas-Schritte bereitgestellt.
- Download-Links fuer:
  - `didi-scene-bootstrap.js`
  - `didi-scene-trigger.js`

### 4) Live-Test auf Nutzerwunsch
- Initialzustand: `/gm/*` teils falsch ausgeliefert (HTML statt JS), WS-Verhalten alt.
- Nach Infra-/Routing-Korrekturen:
  - GM-Konsole erreichbar
  - PlayCanvas-Skripte korrekt erreichbar
  - `welcome` + `scene_changed` inkl. `spawnPosition` vorhanden

### 5) Schwarzer Bildschirm in PlayCanvas
- Ursachen eingegrenzt:
  - Host/WS-Aufloesung im Launch-Kontext
  - Szene ohne sichtbare Geometrie
- Gelieferte Fix-Anleitung:
  - Kamera-/Root-/Trigger-Setup
  - Ground-Testobjekt
  - Root-Skalierung und Ziel-Entity fuer Bootstrap

### 6) Editor-Fehler (rot) im Trigger/Collision-Bereich
- Ursache: `Ammo module not found`.
- Fix: Ammo importieren (`IMPORT AMMO`), Trigger/Rigidbody korrekt konfigurieren.

### 7) Hierarchy-/Root-Feinabstimmung
- `Root` Scale auf `1,1,1`.
- Keine riesige Skalierung am Container.
- Sichtbare Test-Geometrie als Child (`Ground_Test`).

### 8) Publish-Fehler: `Import Map does not exist`
- Fix:
  - fehlerhaften Build entfernen
  - Import Map auf none/leer oder Dummy-Datei setzen
  - neu publishen

### 9) Publish-Link geprueft
- `https://playcanv.as/p/e2qxOtMp/` erreichbar.
- Danach Sichtbarkeits-/Content-Checks empfohlen.

### 10) GLB-Workflow und Strategiefragen
- Klaerungen:
  - Scene-ID vs. Dateiname
  - Hybrid-Ansatz (statischer Hub + dynamische/prozedurale Welt)
  - Mobile-Poly-/Performance-Richtwerte
  - PlayCanvas rendert clientseitig (kein "unendliches Cloud-Polybudget")
  - Ionic = App-Huelle, nicht 3D-Renderer

### 11) "Mach alles fertig" (Asset-Swap ohne staendiges Editor-Gefummel)
- Umgesetzt:
  - `server/src/modules/world/AssetPoolResolver.ts` (neu)
  - `game-data/world/asset-pools.json` (neu)
  - `docs/WORLD_ASSET_POOLS.md` (neu)
  - World-/Tick-/Client-Factory-Anpassungen
  - `entity_sync` transportiert `modelUrl` aus `glbPath`
  - Client laedt GLB modellgetrieben fuer World-Objekte
- Ergebnis: `server` + `client` Build erfolgreich, Commit + Push + PR-Update.

### 12) Wirksamkeit ohne Editor-Aufwand
- Statuskommunikation:
  - Code fertig
  - Live-Wirksamkeit haengt von Merge/Deploy auf `main` ab
  - Minimaler PlayCanvas-Aufwand bleibt fuer echte Asset-Platzierung

### 13) Token-Frage
- Antwort: Limits sind plan-/kontoabhaengig, Details in Dashboard/Billing.

### 14) Zweite Repo/Testumgebung
- Clone nach `/workspace/wasd-test-env`.
- Test-Repo auf denselben Branch/Commit-Stand synchronisiert.

### 15) Strategische Migration weg von PlayCanvas
- Empfehlung: Rendering-Layer ersetzen, Backend/Protokoll beibehalten.
- Best Path: Babylon.js (+ optional React).

### 16) No-Code-Machbarkeit mit Babylon
- Klare Aussage: deutlich stressfreier als PlayCanvas-Editor-Flow.
- Hauptgrund: Alles codebasiert im Repo versioniert, kein externer Editor-Zwang.

### 17) Kontextdokument angefragt
- Datei `SESSION_CONTEXT.md` wurde in einer vorherigen Instanz bereits erstellt und verlinkt.
- In dieser Instanz wird der Kontext erneut als Persistenzdatei gefuehrt.

---

## Relevante Artefakte (aus vorheriger Instanz, Auszug)

### Deploy / Stabilitaet
- `deploy/deploy.sh`
- `client/package.json`
- `server/package.json`

### World / Asset-Swap
- `server/src/modules/world/AssetPoolResolver.ts`
- `server/src/modules/world/WorldObjectSystem.ts`
- `server/src/modules/world/WorldSystem.ts`
- `server/src/core/WorldTick.ts`
- `client/src/engine/playcanvas/PlayCanvasEntityFactory.ts`
- `client/src/engine/bridge/EntityViewModel.ts`
- `game-data/world/asset-pools.json`
- `docs/WORLD_ASSET_POOLS.md`

### GM / PlayCanvas
- `client/public/gm/index.html`
- `client/public/gm/app.js`
- `client/public/playcanvas/scripts/didi-scene-bootstrap.js`
- `client/public/playcanvas/scripts/didi-scene-trigger.js`

---

## Follow-up aus dem letzten Austausch (Babylon)

### Verbindliche Architektur-Empfehlung
- Best Path: Babylon.js + React.
- Serverseitige Logik so weit wie moeglich unveraendert lassen.
- Ziel: geringes Risiko beim Exit aus PlayCanvas.

### Warum Babylon hier besser passt
- Kein externer Editor als Pflichtschritt.
- Vollstaendig Git/versionierbar.
- Agent kann autonom umsetzen:
  - Szenenaufbau
  - GLB-Import/Placement
  - Trigger/Teleport
  - Kamera/Input
  - HUD/GM-UI
  - WS-Anbindung an vorhandenes Protokoll

### Dinge, die ggf. ausserhalb Code bleiben
- DNS/Domain/SSL
- Secrets/Infra-Freigaben
- Deploy-Freigaben je nach Hosting

---

## Aktueller Status fuer Neustarts

- Der Wissensstand fuer diese Session ist in dieser Datei persistiert.
- Beim Neustart zuerst `SESSION_CONTEXT.md` lesen, danach mit Babylon-Migrationsschritten weitermachen.

---

## Naechste sinnvolle Schritte

1. Exakte Babylon-Migrations-Checkliste pro Datei/Modul erstellen (erste 10 Dateien, Reihenfolge, unveraenderte Module markieren).
2. Babylon-Client-Grundgeruest aufsetzen (React + Babylon + bestehendes WS-Protokoll).
3. Feature-Paritaet fuer Kernfluss herstellen:
   - Login/Welcome
   - Scene change + Spawn
   - GLB-World-Loader
   - Trigger/Teleport
4. GM-Hooks auf neuen Client adaptieren.

