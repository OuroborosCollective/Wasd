# ARELORIA FINAL RECONSTRUCTION PACK

Format: DATEI / PFAD / INHALT

---

DATEI
.env.example

PFAD
/.env.example

INHALT
```
PORT=3000
NODE_ENV=development
DATABASE_URL=postgres://user:password@localhost:5432/areloria
CACHE_URL=redis://localhost:6379
FIREBASE_PROJECT_ID=your-project-id
```

---

DATEI
.gitignore

PFAD
/.gitignore

INHALT
```
node_modules/
dist/
.env
.env.local
.DS_Store
*.log
coverage/
```

---

DATEI
CHECKED_CONTENT_REPORT.md

PFAD
/CHECKED_CONTENT_REPORT.md

INHALT
```
# Checked Content Report

Aktueller erweiterter Arbeitsstand.

## Dateianzahl
181

## Letzter Block
Diplomatie, Ruf, Fraktionen, Bau-Upgrade/Siege, Terrain-Brush/Admin-Audit, historische Karte, Migration, Preisbalancer, Alterung und Familiengeneration.
```

---

DATEI
CONTENT_STATUS_MATRIX.md

PFAD
/CONTENT_STATUS_MATRIX.md

INHALT
```
# Content Status Matrix

## Strongly present
- server foundation
- client foundation
- documentation
- reconstruction support
- game-data scaffolding
- admin/gm scaffolding
- asset import guidance
- route scaffolding

## Still needs real production depth later
- balancing
- full live auth
- production database integration
- concrete GLB asset population
- polished UI/UX
- integration tests at production depth
```

---

DATEI
FINAL_AUDIT_REPORT.md

PFAD
/FINAL_AUDIT_REPORT.md

INHALT
```
# Final Audit Report

Dieser Stand ist der aktuelle Audit- und Bündelungsstand des Areloria/Ouroboros-Projekts.

## Audit-Ziele
- Kernregeln vorhanden
- Server- und Client-Startpunkte vorhanden
- Rekonstruktionsfähigkeit vorhanden
- zentrale Gameplay- und Weltsysteme abgedeckt
- Doku-, Daten- und Integrationsschicht vorhanden

## Wichtige Einordnung
Dies ist ein **stark ausgebautes Fundament** und ein **No-Code/Agent-kompatibler Rekonstruktionsstand**.
Es ist **nicht** das final balancierte, live ausgerollte Komplett-MMO.

## Nächster sinnvoller echter Produktionsschritt
- echte Produktions-DB anbinden
- Auth abschließen
- Balance und Content vertiefen
- Assets/GLBs konkret einpflegen
- Testläufe durchführen
```

---

DATEI
FINAL_AUDIT_SUMMARY.json

PFAD
/FINAL_AUDIT_SUMMARY.json

INHALT
```
{
  "fileCount": 505,
  "hasRootReadme": true,
  "hasLockRules": true,
  "hasFinalTruth": true,
  "hasAgentFiles": true,
  "hasServerEntry": true,
  "hasClientEntry": true,
  "hasApiIndex": true,
  "hasBundleDocs": true
}
```

---

DATEI
FINAL_CHECKLIST_AUDIT.md

PFAD
/FINAL_CHECKLIST_AUDIT.md

INHALT
```
# Final Checklist Audit

## Fundament vorhanden
- [x] README / Lock Rules / Final Truth
- [x] Agent-Anweisungen
- [x] Server Entry
- [x] Client Entry
- [x] WebSocket-Basis
- [x] Chunk 64x64
- [x] Observer-System
- [x] NPC Personality / Memory / Genealogy
- [x] Civilization / Politics / War
- [x] Economy / Matrix Energy / Markets
- [x] Player / Skills / Combat / Loot / Inventory
- [x] Quests / Dialogue / Mail / Auction
- [x] Dungeons / Ruins / History / Oracle / Brain
- [x] GM Editor / Admin / Roles
- [x] GLB / Asset / Import-Hinweise
- [x] Reconstruction-Pack
- [x] Backup-/Audit-Schicht

## Noch nicht voll produktionsreif
- [ ] echte Produktionsdatenbank final verdrahtet
- [ ] volle Asset-Bestückung mit realen GLBs
- [ ] tiefes Balancing
- [ ] vollständige produktive UI/UX
- [ ] durchgehende Integrationstests
```

---

DATEI
FINAL_CONSISTENCY_CHECK.md

PFAD
/FINAL_CONSISTENCY_CHECK.md

INHALT
```
# Final Consistency Check

## Counts
- server modules: 223
- client files: 64
- game-data files: 50
- api files: 15

## Key files
- .gitignore
- .env.example
- FINAL_AUDIT_REPORT.md
- FINAL_AUDIT_SUMMARY.json
- FINAL_HANDOFF_CHECKLIST.md
- docs/ROUTE_MANIFEST.md
- docs/MODULE_MANIFEST.md
- docs/CLIENT_MANIFEST.md
- docs/GAME_DATA_MANIFEST.md
```

---

DATEI
FINAL_DELIVERY_NOTE.md

PFAD
/FINAL_DELIVERY_NOTE.md

INHALT
```
# Final Delivery Note

Dieses Projekt wird in mehreren Formen ausgeliefert:

1. Projekt-ZIP
2. Reconstruction-Pack als Markdown
3. Reconstruction-Pack als Text
4. Bundle-ZIP mit Projekt + Reconstruction

## Zweck
Damit kein Stand verloren geht und No-Code- oder Firebase-Studio-Agents das Projekt rekonstruieren können.
```

---

DATEI
FINAL_HANDOFF_CHECKLIST.md

PFAD
/FINAL_HANDOFF_CHECKLIST.md

INHALT
```
# Final Handoff Checklist

## Must read first
- README_START_HERE.md
- PROJECT_LOCK_RULES.md
- final-lock/FINAL_TRUTH.md
- docs/MASTER_DESIGN_BIBLE.md
- docs/BUILD_SEQUENCE_MASTER.md

## Handoff checks
- project zip exists
- reconstruction pack exists
- server entry exists
- client entry exists
- route manifest exists
- module manifest exists
- game-data manifest exists
- env example exists
- gitignore exists
```

---

DATEI
FINAL_MASTER_DELIVERY_INDEX.md

PFAD
/FINAL_MASTER_DELIVERY_INDEX.md

INHALT
```
# Final Master Delivery Index

Dies ist der gebündelte Abschlussstand des Areloria/Ouroboros-Fundaments.

## Dateizahlen
- Gesamtdateien: 518
- Serverdateien: 257
- Clientdateien: 67
- Dokumentationsdateien: 84
- Game-Data-Dateien: 50
- Integrationsdateien: 20
- Admin-/GM-Dateien: 10

## Kernebenen
- Root / Lock / Agent
- Server Core / Networking / API / Modules / Config / Tests
- Client Engine / UI / Editor / Audio / State
- Game Data
- Integrations
- Admin Tools
- Reconstruction Packs

## Zweck
Ein belastbarer No-Code- und Entwickler-Baukasten für die weitere Umsetzung des MMORPGs.
```

---

DATEI
FINAL_NEXT_REAL_STEPS.md

PFAD
/FINAL_NEXT_REAL_STEPS.md

INHALT
```
# Final Next Real Steps

1. Reale GLB-Assets einsortieren und registrieren
2. Produktive DB/Cache-Adapter mit echten Zugangsdaten konfigurieren
3. Auth-Flow finalisieren
4. WebSocket/Session-Reconnect live testen
5. Combat/Skill/Loot balancieren
6. GM- und Rollensystem live testen
7. Client-UI polieren
8. Erstes kleines internes Spiel-Deployment fahren
```

---

DATEI
FINAL_PACK_COUNTS.json

PFAD
/FINAL_PACK_COUNTS.json

INHALT
```
{
  "totalFiles": 518,
  "serverFiles": 257,
  "clientFiles": 67,
  "docsFiles": 84,
  "gameDataFiles": 50,
  "integrationFiles": 20,
  "adminFiles": 10
}
```

---

DATEI
MANIFEST_SUMMARY.json

PFAD
/MANIFEST_SUMMARY.json

INHALT
```
{
  "serverModuleCount": 223,
  "clientFileCount": 64,
  "gameDataFileCount": 50,
  "apiRouteFileCount": 15
}
```

---

DATEI
MASTER_INDEX.md

PFAD
/MASTER_INDEX.md

INHALT
```
# Master Index

## Root
- README_START_HERE.md
- PROJECT_LOCK_RULES.md
- MASTER_INDEX.md

## Core Docs
- docs/MASTER_DESIGN_BIBLE.md
- docs/MASTER_SYSTEM_CHECKLIST.md
- docs/BUILD_SEQUENCE_MASTER.md
- docs/WORLD_GENERATION.md
- docs/NPC_SYSTEM.md
- docs/ECONOMY_MODEL.md
- docs/BRAIN_SYSTEM.md
- docs/ASSET_PIPELINE.md
- docs/GM_EDITOR.md

## Final Lock
- final-lock/FINAL_TRUTH.md
- final-lock/DO_NOT_SIMPLIFY.md
- final-lock/REQUIRED_SYSTEMS_MATRIX.md

## Agent
- agent/AGENT_BUILD_INSTRUCTIONS.md
- agent/ARELORIAN_SUPER_PROMPT.md
- agent/AI_AGENT_FAILSAFE_RULES.md

## Code
- server/
- client/

## Data
- game-data/
- world-assets/

## Ops
- integrations/
- admin-tools/
```

---

DATEI
PACK_BUILD_STATUS.md

PFAD
/PACK_BUILD_STATUS.md

INHALT
```
# Pack Build Status

Current assembled file count: 254

This working directory is being expanded in blocks.
No final delivery links should be sent until the combined pack is explicitly requested.
```

---

DATEI
PACK_PROGRESS_2.md

PFAD
/PACK_PROGRESS_2.md

INHALT
```
# Pack Progress 2

Dieser Stand erweitert das Projekt um:
- Diplomatie
- Reputation
- Fraktionen
- Bau- und Upgrade-Systeme
- Belagerung
- GM Terrain/Object Tools
- Historische Karten und Ruinenentwicklung
- Event Scheduling
- Migration
- Aging
- Family generation
- Crafting
- Farming / tree growth
- Item generator / affixes
- Admin mount registry
```

---

DATEI
PACK_PROGRESS_3.md

PFAD
/PACK_PROGRESS_3.md

INHALT
```
# Pack Progress 3

Neu ergänzt in diesem Ausbau:
- API-Routen
- Shared Memory System
- Relationship System
- Prophecy Archive / Generator
- Disaster / War Forecast
- World Resource and Activation files
- Client UI files
- Client Editor files
- Asset loader and model registry
- Additional game-data JSON
```

---

DATEI
PACK_PROGRESS_4.md

PFAD
/PACK_PROGRESS_4.md

INHALT
```
# Pack Progress 4

Neuer Sammelblock ergänzt.
Aktuelle Dateianzahl: 272

Schwerpunkte:
- Wetter/Jahreszeiten
- Reputation/Factions
- Event-Layer
- historische Karten / Ruinenentwicklung
- zusätzliche Client-UI
- Admin-Tools
- Firebase/AWS-Deploy-Hinweise
```

---

DATEI
PACK_PROGRESS_5.md

PFAD
/PACK_PROGRESS_5.md

INHALT
```
# Pack Progress 5

Finalisierungsblock hinzugefügt.

## Fokus
- Audit
- Delivery-Hinweise
- letzte Strukturkontrolle
- finaler Bundle-Stand vorbereiten
```

---

DATEI
PROJECT_LOCK_RULES.md

PFAD
/PROJECT_LOCK_RULES.md

INHALT
```
# Project Lock Rules

Diese Regeln dürfen nicht gebrochen werden.

1. Kein Umbau zu einer simplen Demo-App.
2. Chunkgröße bleibt 64x64.
3. Observer-Axiom bleibt Pflicht.
4. Server bleibt autoritativ.
5. NPC-Personality, NPC-Memory und Genealogie bleiben Pflichtsysteme.
6. Spieler- und NPC-Politik bleiben Pflichtsysteme.
7. Matrix-Energie bleibt Infrastrukturwährung.
8. Server-Brain mit 13 Punkten bleibt Pflicht.
9. GM-World-Editor bleibt Pflicht.
10. GLB-Asset-Pipeline bleibt Pflicht.
```

---

DATEI
README_START_HERE.md

PFAD
/README_START_HERE.md

INHALT
```
# Arelorian Master Project

Dieses Paket ist ein **voller Entwicklungs-Scaffold** für das Arelorian/Ouroboros Browser-MMORPG.
Es ist **kein leeres Ordnerpaket** und **keine Demo-App**, sondern eine strukturierte Grundlage mit:
- Architektur- und Regeldokumenten
- Server-Modulen als TypeScript-Skeletons
- Client-Grundgerüst mit Three.js
- Game-Data-Dateien
- Integrationsplatzhaltern für Firebase/AWS
- Admin-/GM-Editor-Grunddateien
- Asset-Import-Hinweisen für GLB-Dateien

## Sofort lesen
1. `PROJECT_LOCK_RULES.md`
2. `final-lock/FINAL_TRUTH.md`
3. `docs/MASTER_DESIGN_BIBLE.md`
4. `docs/BUILD_SEQUENCE_MASTER.md`
5. `agent/AGENT_BUILD_INSTRUCTIONS.md`

## Projektstatus
Dieses Paket liefert ein **ausgebautes Fundament**. Es ist nicht das komplett fertige MMO,
aber es ist eine **brauchbare, nicht-leere Arbeitsbasis**, die weiter implementiert werden kann.
```

---

DATEI
RELEASE_TODO_SHORTLIST.md

PFAD
/RELEASE_TODO_SHORTLIST.md

INHALT
```
# Release Todo Shortlist

1. echte GLB-Assets einpflegen
2. Produktionsdatenbank anbinden
3. Auth und Sessionfluss finalisieren
4. Kampf-/Skill-Balance abstimmen
5. UI polieren
6. Persistenz live testen
7. GM- und Rollenprüfung testen
8. Deployment durchspielen
```

---

DATEI
README_ADMIN.md

PFAD
/admin-tools/README_ADMIN.md

INHALT
```
# Admin Tools

Hier liegen GM- und World-Editor-Hinweise.

## Geplant
- WorldEditor.ts
- TerrainBrush.ts
- ObjectPlacement.ts
- GMControlPanel.ts
- LiveWorldControl.ts

Das Mount `gm_giraffe` kann später den Admin-Modus markieren.
```

---

DATEI
GMControlPanel.ts

PFAD
/admin-tools/gm-panel/GMControlPanel.ts

INHALT
```
export class GMControlPanel {
  open(){ return "gm-control-open"; }
}
```

---

DATEI
LiveWorldControl.ts

PFAD
/admin-tools/gm-panel/LiveWorldControl.ts

INHALT
```
export class LiveWorldControl {
  trigger(eventType:string){
    return { eventType, triggered:true };
  }
}
```

---

DATEI
MountDebug.md

PFAD
/admin-tools/gm-panel/MountDebug.md

INHALT
```
# Mount Debug

GM-Mounts können für Debug- oder Admin-Modi verwendet werden.
Beispiel: giraffe_admin
```

---

DATEI
PermissionReference.md

PFAD
/admin-tools/gm-panel/PermissionReference.md

INHALT
```
# GM Permission Reference

- superadmin: volle Kontrolle
- gm: Welt- und NPC-Steuerung
- moderator: Chat- und Spieleraufsicht
- observer: reine Ansicht
```

---

DATEI
RecoveryGuide.md

PFAD
/admin-tools/rollback/RecoveryGuide.md

INHALT
```
# Recovery Guide

## Im Notfall
- letzten Snapshot laden
- AdminRollback ausführen
- Audit und EditorActionLog prüfen
- Benachrichtigung an Admins schicken
```

---

DATEI
MountDebug.md

PFAD
/admin-tools/world-editor/MountDebug.md

INHALT
```
# Mount Debug

Die gaffende Giraffe kann als GM-/Admin-Mount markiert werden.
Beim Aktivieren des Editor-Modus können spezielle Panels eingeblendet werden.
```

---

DATEI
ObjectPlacement.ts

PFAD
/admin-tools/world-editor/ObjectPlacement.ts

INHALT
```
export class ObjectPlacement {
  place(assetId:string, position:{x:number;y:number;z:number}){
    return { assetId, position };
  }
}
```

---

DATEI
TerrainBrush.ts

PFAD
/admin-tools/world-editor/TerrainBrush.ts

INHALT
```
export class TerrainBrush {
  paint(mode:string, strength:number){
    return { mode, strength };
  }
}
```

---

DATEI
WorldEditor.ts

PFAD
/admin-tools/world-editor/WorldEditor.ts

INHALT
```
export class WorldEditor {
  place(type:string, position:{x:number;y:number;z:number}){
    return { action:"place", type, position };
  }
}
```

---

DATEI
AGENT_BUILD_INSTRUCTIONS.md

PFAD
/agent/AGENT_BUILD_INSTRUCTIONS.md

INHALT
```
# Agent Build Instructions

1. Lies zuerst alle Lock-Dateien.
2. Verändere keine Kernregeln.
3. Baue in der vorgegebenen Reihenfolge.
4. Halte Serverlogik serverseitig.
5. Nutze das Clientgerüst nur für Darstellung.

## Wichtige Reihenfolge
server core -> world -> observer -> npc -> civilization -> economy -> gameplay -> brain -> assets -> gm editor -> client -> integrations
```

---

DATEI
AI_AGENT_FAILSAFE_RULES.md

PFAD
/agent/AI_AGENT_FAILSAFE_RULES.md

INHALT
```
# AI Agent Failsafe Rules

- Do not remove observer simulation
- Do not remove chunk size 64x64
- Do not remove NPC memory/genealogy
- Do not remove politics
- Do not remove matrix energy
- Do not remove brain
- Do not remove GM editor
- Do not remove GLB pipeline
```

---

DATEI
ARELORIAN_SUPER_PROMPT.md

PFAD
/agent/ARELORIAN_SUPER_PROMPT.md

INHALT
```
# Arelorian Super Prompt

Build a persistent browser MMORPG with:
- procedural world
- 64x64 chunks
- observer-driven simulation
- NPC personality, memory, genealogy, politics
- player civilization and NPC civilization
- matrix energy economy
- 13-node server brain
- GLB asset pipeline
- GM world editor

Do not simplify it into a prototype app.
```

---

DATEI
areloria_reconstruction_pack_fuller.md

PFAD
/areloria_reconstruction_pack_fuller.md

INHALT
```
# ARELORIA RECONSTRUCTION PACK FULLER

DATEI / PFAD / INHALT für Agent-Rekonstruktion

---

DATEI
CHECKED_CONTENT_REPORT.md

PFAD
/CHECKED_CONTENT_REPORT.md

INHALT
```
# Checked Content Report

Dieses Paket wurde **neu** aufgebaut, damit es nicht wieder nur aus fast leeren Ordnern besteht.

## Enthalten
- Root-Dateien
- 9 Hauptdokumente
- 3 final-lock-Dateien
- 3 agent-Dateien
- Server core + networking
- 21 Server-Moduldateien
- Client package + renderer + websocket + HUD
- Game-data-Dateien
- Integrationsplatzhalter
- Admin-/Asset-Readmes

## Dateianzahl
79
```

---

DATEI
MASTER_INDEX.md

PFAD
/MASTER_INDEX.md

INHALT
```
# Master Index

## Root
- README_START_HERE.md
- PROJECT_LOCK_RULES.md
- MASTER_INDEX.md

## Core Docs
- docs/MASTER_DESIGN_BIBLE.md
- docs/MASTER_SYSTEM_CHECKLIST.md
- docs/BUILD_SEQUENCE_MASTER.md
- docs/WORLD_GENERATION.md
- docs/NPC_SYSTEM.md
- docs/ECONOMY_MODEL.md
- docs/BRAIN_SYSTEM.md
- docs/ASSET_PIPELINE.md
- docs/GM_EDITOR.md

## Final Lock
- final-lock/FINAL_TRUTH.md
- final-lock/DO_NOT_SIMPLIFY.md
- final-lock/REQUIRED_SYSTEMS_MATRIX.md

## Agent
- agent/AGENT_BUILD_INSTRUCTIONS.md
- agent/ARELORIAN_SUPER_PROMPT.md
- agent/AI_AGENT_FAILSAFE_RULES.md

## Code
- server/
- client/

## Data
- game-data/
- world-assets/

## Ops
- integrations/
- admin-tools/
```

---

DATEI
PACK_BUILD_STATUS.md

PFAD
/PACK_BUILD_STATUS.md

INHALT
```
# Pack Build Status

## Bereits aufgebaut
- Root rules/docs
- Final lock files
- Agent files
- Server core
- Networking
- World + observer
- NPC systems
- Dialogue + quest
- Dungeon + monster
- Structure + gate + asset registry
- AI behavior
- Persistence
- Client core + renderer + websocket + HUD + editor UI
- Game data basics
- Integrations placeholders

## Nächste vertiefbare Blöcke
- vollständiger GM command layer
- richer item generator + affix logic
- crafting system
- farming / tree growth logic
- city market simulation expansion
- real auth / persistence adapters
```

---

DATEI
PROJECT_LOCK_RULES.md

PFAD
/PROJECT_LOCK_RULES.md

INHALT
```
# Project Lock Rules

Diese Regeln dürfen nicht gebrochen werden.

1. Kein Umbau zu einer simplen Demo-App.
2. Chunkgröße bleibt 64x64.
3. Observer-Axiom bleibt Pflicht.
4. Server bleibt autoritativ.
5. NPC-Personality, NPC-Memory und Genealogie bleiben Pflichtsysteme.
6. Spieler- und NPC-Politik bleiben Pflichtsysteme.
7. Matrix-Energie bleibt Infrastrukturwährung.
8. Server-Brain mit 13 Punkten bleibt Pflicht.
9. GM-World-Editor bleibt Pflicht.
10. GLB-Asset-Pipeline bleibt Pflicht.
```

---

DATEI
README_START_HERE.md

PFAD
/README_START_HERE.md

INHALT
```
# Arelorian Master Project

Dieses Paket ist ein **voller Entwicklungs-Scaffold** für das Arelorian/Ouroboros Browser-MMORPG.
Es ist **kein leeres Ordnerpaket** und **keine Demo-App**, sondern eine strukturierte Grundlage mit:
- Architektur- und Regeldokumenten
- Server-Modulen als TypeScript-Skeletons
- Client-Grundgerüst mit Three.js
- Game-Data-Dateien
- Integrationsplatzhaltern für Firebase/AWS
- Admin-/GM-Editor-Grunddateien
- Asset-Import-Hinweisen für GLB-Dateien

## Sofort lesen
1. `PROJECT_LOCK_RULES.md`
2. `final-lock/FINAL_TRUTH.md`
3. `docs/MASTER_DESIGN_BIBLE.md`
4. `docs/BUILD_SEQUENCE_MASTER.md`
5. `agent/AGENT_BUILD_INSTRUCTIONS.md`

## Projektstatus
Dieses Paket liefert ein **ausgebautes Fundament**. Es ist nicht das komplett fertige MMO,
aber es ist eine **brauchbare, nicht-leere Arbeitsbasis**, die weiter implementiert werden kann.
```

---

DATEI
README_ADMIN.md

PFAD
/admin-tools/README_ADMIN.md

INHALT
```
# Admin Tools

Hier liegen GM- und World-Editor-Hinweise.

## Geplant
- WorldEditor.ts
- TerrainBrush.ts
- ObjectPlacement.ts
- GMControlPanel.ts
- LiveWorldControl.ts

Das Mount `gm_giraffe` kann später den Admin-Modus markieren.
```

---

DATEI
AGENT_BUILD_INSTRUCTIONS.md

PFAD
/agent/AGENT_BUILD_INSTRUCTIONS.md

INHALT
```
# Agent Build Instructions

1. Lies zuerst alle Lock-Dateien.
2. Verändere keine Kernregeln.
3. Baue in der vorgegebenen Reihenfolge.
4. Halte Serverlogik serverseitig.
5. Nutze das Clientgerüst nur für Darstellung.

## Wichtige Reihenfolge
server core -> world -> observer -> npc -> civilization -> economy -> gameplay -> brain -> assets -> gm editor -> client -> integrations
```

---

DATEI
AI_AGENT_FAILSAFE_RULES.md

PFAD
/agent/AI_AGENT_FAILSAFE_RULES.md

INHALT
```
# AI Agent Failsafe Rules

- Do not remove observer simulation
- Do not remove chunk size 64x64
- Do not remove NPC memory/genealogy
- Do not remove politics
- Do not remove matrix energy
- Do not remove brain
- Do not remove GM editor
- Do not remove GLB pipeline
```

---

DATEI
ARELORIAN_SUPER_PROMPT.md

PFAD
/agent/ARELORIAN_SUPER_PROMPT.md

INHALT
```
# Arelorian Super Prompt

Build a persistent browser MMORPG with:
- procedural world
- 64x64 chunks
- observer-driven simulation
- NPC personality, memory, genealogy, politics
- player civilization and NPC civilization
- matrix energy economy
- 13-node server brain
- GLB asset pipeline
- GM world editor

Do not simplify it into a prototype app.
```

---

DATEI
package.json

PFAD
/client/package.json

INHALT
```
{
  "name": "areloria-client",
  "version": "0.2.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "three": "^0.169.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^5.4.0"
  }
}
```

---

DATEI
index.html

PFAD
/client/public/index.html

INHALT
```
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
    <title>Arelorian Client</title>
  </head>
  <body>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

---

DATEI
AssetLoader.ts

PFAD
/client/src/assets/AssetLoader.ts

INHALT
```
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class AssetLoader {
  private loader = new GLTFLoader();

  load(path: string) {
    return new Promise((resolve, reject) => {
      this.loader.load(path, (gltf) => resolve(gltf.scene), undefined, reject);
    });
  }
}
```

---

DATEI
ModelRegistry.ts

PFAD
/client/src/assets/ModelRegistry.ts

INHALT
```
export const ModelRegistry = {
  uschi: { path: "/assets/models/characters/uschi_gossip.glb", scale: 1 },
  castle_wall: { path: "/assets/models/buildings/castle_wall.glb", scale: 1 },
  watch_tower: { path: "/assets/models/buildings/castle_watch_tower.glb", scale: 1 },
  tree_spring: { path: "/assets/models/vegetation/tree_oak_spring.glb", scale: 1 },
  gm_giraffe: { path: "/assets/models/admin/gm_giraffe.glb", scale: 1 }
};
```

---

DATEI
PlacementTool.ts

PFAD
/client/src/editor/PlacementTool.ts

INHALT
```
export class PlacementTool {
  place(type: string, position: { x: number; y: number; z: number }) {
    return { action: "place", type, position };
  }
}
```

---

DATEI
SelectionTool.ts

PFAD
/client/src/editor/SelectionTool.ts

INHALT
```
export class SelectionTool {
  select(entityId: string) {
    return { selected: entityId };
  }
}
```

---

DATEI
WorldEditorUI.ts

PFAD
/client/src/editor/WorldEditorUI.ts

INHALT
```
export function openWorldEditorUI() {
  const el = document.createElement("div");
  el.textContent = "GM World Editor";
  el.style.position = "fixed";
  el.style.right = "12px";
  el.style.bottom = "12px";
  el.style.padding = "10px 14px";
  el.style.background = "#2b2b2b";
  el.style.color = "#fff";
  document.body.appendChild(el);
}
```

---

DATEI
renderer.ts

PFAD
/client/src/engine/renderer.ts

INHALT
```
import * as THREE from "three";

export function initRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshBasicMaterial({ color: 0x44aa88 })
  );

  scene.add(cube);

  function animate() {
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();
}
```

---

DATEI
worldLoader.ts

PFAD
/client/src/engine/worldLoader.ts

INHALT
```
export function loadWorldChunk(chunkX: number, chunkY: number) {
  return {
    chunkX,
    chunkY,
    status: "requested"
  };
}
```

---

DATEI
playerController.ts

PFAD
/client/src/gameplay/playerController.ts

INHALT
```
export class PlayerController {
  move(direction: string) {
    return {
      type: "move",
      direction
    };
  }
}
```

---

DATEI
main.ts

PFAD
/client/src/main.ts

INHALT
```
import { initRenderer } from "./engine/renderer";
import { connectSocket } from "./networking/websocketClient";
import { renderHUD } from "./ui/hud";

const canvas = document.createElement("canvas");
document.body.style.margin = "0";
document.body.appendChild(canvas);

initRenderer(canvas);
connectSocket();
renderHUD();
```

---

DATEI
websocketClient.ts

PFAD
/client/src/networking/websocketClient.ts

INHALT
```
export function connectSocket() {
  const ws = new WebSocket(`ws://${location.hostname}:3000`);

  ws.onopen = () => console.log("Connected to Arelorian server");
  ws.onmessage = (msg) => console.log("Server:", msg.data);

  return ws;
}
```

---

DATEI
chat.ts

PFAD
/client/src/ui/chat.ts

INHALT
```
export function renderChat() {
  const el = document.createElement("div");
  el.textContent = "Chat placeholder";
  el.style.position = "fixed";
  el.style.left = "12px";
  el.style.bottom = "12px";
  el.style.padding = "8px 12px";
  el.style.background = "rgba(0,0,0,0.55)";
  el.style.color = "#fff";
  document.body.appendChild(el);
}
```

---

DATEI
hud.ts

PFAD
/client/src/ui/hud.ts

INHALT
```
export function renderHUD() {
  const hud = document.createElement("div");
  hud.textContent = "Arelorian HUD online";
  hud.style.position = "fixed";
  hud.style.top = "12px";
  hud.style.left = "12px";
  hud.style.padding = "8px 12px";
  hud.style.background = "rgba(0,0,0,0.55)";
  hud.style.color = "#fff";
  hud.style.fontFamily = "sans-serif";
  document.body.appendChild(hud);
}
```

---

DATEI
inventory.ts

PFAD
/client/src/ui/inventory.ts

INHALT
```
export function renderInventory() {
  const el = document.createElement("div");
  el.textContent = "Inventory placeholder";
  el.style.position = "fixed";
  el.style.right = "12px";
  el.style.top = "12px";
  el.style.padding = "8px 12px";
  el.style.background = "rgba(0,0,0,0.55)";
  el.style.color = "#fff";
  document.body.appendChild(el);
}
```

---

DATEI
tsconfig.json

PFAD
/client/tsconfig.json

INHALT
```
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true
  },
  "include": [
    "src/**/*"
  ]
}
```

---

DATEI
ASSET_PIPELINE.md

PFAD
/docs/ASSET_PIPELINE.md

INHALT
```
# Asset Pipeline

## GLB-Regeln
Terrain ist kein GLB-Bodenteppich. GLB wird für NPCs, Monster, Gebäude, Bäume, Props und Reittiere verwendet.

## Struktur
- characters/
- monsters/
- buildings/
- props/
- vegetation/
- admin/

## Validierung
Jedes Asset sollte idealerweise besitzen:
- sauberen Ursprungspunkt
- sinnvolle Skalierung
- optionales Rig/Skeleton
- optional Animationen
```

---

DATEI
BRAIN_SYSTEM.md

PFAD
/docs/BRAIN_SYSTEM.md

INHALT
```
# Brain System

Das Server Brain ist eine heuristische Meta-Schicht.

## Aufgaben
- Spannungen erkennen
- Politiksignale lesen
- Marktanomalien erkennen
- Orakelvisionen speisen
- Ereignisse anstoßen

## 13-Punkte-Modell
- 4 Weltpunkte
- 4 Interpretationspunkte
- 4 Dynamikpunkte
- 1 Zentrum

Das Zentrum aggregiert Weltzustand, NPC-Memory, Ökonomie, Politik und Geschichte.
```

---

DATEI
BUILD_SEQUENCE_MASTER.md

PFAD
/docs/BUILD_SEQUENCE_MASTER.md

INHALT
```
# Build Sequence Master

1. Server core und bootstrap
2. World tick
3. Chunk- und Observer-System
4. Persistence
5. NPC personality + memory + genealogy
6. Civilization + politics
7. Economy + Matrix energy
8. Player, skills, combat, loot
9. Dungeons, ruins, oracle, history
10. Brain + field analyzer
11. Asset registry + GLB loading
12. GM editor
13. Client renderer + websocket sync
14. Firebase/AWS integration
```

---

DATEI
DIALOGUE_SYSTEM.md

PFAD
/docs/DIALOGUE_SYSTEM.md

INHALT
```
# Dialogue System

The dialogue system combines:
- personality traits
- family and lineage
- culture
- religion
- memory
- world events
- oracle/world history signals

## Pipeline
1. build context
2. choose tone
3. choose dialogue pool
4. inject dynamic references
5. return line + optional quest/world hint
```

---

DATEI
DUNGEON_SYSTEM.md

PFAD
/docs/DUNGEON_SYSTEM.md

INHALT
```
# Dungeon System

Dungeons are generated from seeds, ruins and regional history.

## Room types
- hall
- shrine
- monster_lair
- collapsed_passage
- treasure_room
- prison
- relic_chamber

## Inputs
- biome
- ruin class
- ancient civilization markers
- oracle hints
- current danger rating
```

---

DATEI
ECONOMY_MODEL.md

PFAD
/docs/ECONOMY_MODEL.md

INHALT
```
# Economy Model

Die Wirtschaft verbindet Ressourcen, Spieler, NPCs, Märkte und Städte.

## Kernelemente
- Stadtmärkte
- Handelsrouten
- NPC-Händler
- Spielerhandel
- Matrix-Energie
- politische und kriegerische Markteinflüsse

## Preisfaktoren
- Angebot
- Nachfrage
- Krieg
- Knappheit
- Transport
- Stadtsteuern
```

---

DATEI
GM_EDITOR.md

PFAD
/docs/GM_EDITOR.md

INHALT
```
# GM Editor

Der GM-Editor erlaubt Live-Eingriffe in die Welt.

## Fähigkeiten
- Objekte setzen
- NPCs spawnen
- Strukturen verschieben
- Terrainmarker bearbeiten
- Events starten
- Weltzustände prüfen

## Regel
Der Editor ist serverautoritativ. Der Client darf nur Befehle senden.
```

---

DATEI
MASTER_DESIGN_BIBLE.md

PFAD
/docs/MASTER_DESIGN_BIBLE.md

INHALT
```
# Master Design Bible

## Vision
Arelorian ist ein persistentes Browser-MMORPG mit emergenter Weltlogik. Die Welt ist theoretisch unendlich,
wird prozedural erzeugt und über Beobachterzonen simuliert.

## Fünf Axiome
1. Informationsfeld
2. Emergenz
3. Persistenz
4. Ouroboros-Zyklus
5. Beobachter

## Welt
- Prozedurale Welt
- Chunks 64x64
- Biome als natürliche Grenzen
- Ruinen, Dungeons und historische Schichten

## Zivilisationen
- Guild -> Village -> City -> Kingdom -> Nation
- Spieler und NPCs besitzen dieselben zivilisatorischen Rechte

## NPCs
- Personality
- DNA/Traits
- Genealogie und Häuser
- Memory und Shared Memory
- Kultur und Religion
- Politik und Familiengeschichte

## Gameplay
- klassenloses Skill-System
- Skills durch Nutzung
- Stamina als Kernressource
- Diablo-artiges Loot
- Magie als Skillzweig
- Crafting, Handel und Weltwirtschaft

## Systeme
- Server Brain mit 13-Punkte-Modell
- Dudenregister und Orakel
- Matrix-Energie
- Weltwunder und Schattenregisterportal
- GM-Editor
- GLB-Asset-Pipeline
```

---

DATEI
MASTER_SYSTEM_CHECKLIST.md

PFAD
/docs/MASTER_SYSTEM_CHECKLIST.md

INHALT
```
# Master System Checklist

## Welt
- [x] World generator
- [x] 64x64 chunk system
- [x] Observer simulation
- [x] Biome and terrain
- [x] World tick
- [x] Dungeons
- [x] Ruins

## NPC
- [x] Personality engine
- [x] Memory engine
- [x] Shared memory
- [x] Genealogy
- [x] DNA and traits
- [x] Dialogue
- [x] Quests

## Gesellschaft
- [x] Civilization engine
- [x] NPC politics
- [x] Player politics
- [x] Governments
- [x] Taxes
- [x] War

## Gameplay
- [x] Players
- [x] Skills
- [x] Inventory
- [x] Combat
- [x] Loot
- [x] Magic

## Spezial
- [x] Matrix energy
- [x] Dudenregister
- [x] Oracle
- [x] Server brain
- [x] GLB pipeline
- [x] GM editor
```

---

DATEI
MONSTER_SYSTEM.md

PFAD
/docs/MONSTER_SYSTEM.md

INHALT
```
# Monster System

Monsters are generated from:
- species
- dna
- mutation
- biome
- pack memory
- rarity

This allows regional monster lines such as frost wolves, swamp alphas or cave mutants.
```

---

DATEI
NPC_SYSTEM.md

PFAD
/docs/NPC_SYSTEM.md

INHALT
```
# NPC System

## Fünf Einflussfaktoren
- DNA / Traits
- Familie / Genealogie
- Kultur / Herkunft
- Religion / Weltbild
- Erfahrung / Memory

## Memory-Ebenen
- Local memory
- Social memory
- Faction memory
- Historical memory
- Oracle memory

## Verhalten
NPCs können:
- arbeiten
- handeln
- Gerüchte verbreiten
- Familien gründen
- Politik betreiben
- Kriege beginnen oder vermeiden
```

---

DATEI
PERSISTENCE_MODEL.md

PFAD
/docs/PERSISTENCE_MODEL.md

INHALT
```
# Persistence Model

Persistent storage is split by concern:
- world chunks
- players
- civilizations
- history / dudenregister
- snapshots
- asset metadata
```

---

DATEI
STRUCTURE_SYSTEM.md

PFAD
/docs/STRUCTURE_SYSTEM.md

INHALT
```
# Structure System

Structures connect GLB assets to persistent world entities.

## Types
- player_structure
- npc_structure
- civilization_structure
- ruin_structure
- wonder_structure
- matrix_protected_structure

## Examples
- house
- gate
- wall
- watch tower
- workshop
- temple
- shadow register portal
```

---

DATEI
WORLD_GENERATION.md

PFAD
/docs/WORLD_GENERATION.md

INHALT
```
# World Generation

Die Welt wird aus `seed + coordinates` erzeugt.

## Chunkstruktur
Jeder Chunk enthält:
- Terrain
- Biomtyp
- Ressourcen
- Objektliste
- Strukturen
- Ruinen oder Dungeon-Eingänge

## Simulationsebenen
1. Dormant
2. Background simulation
3. Active simulation
4. Full simulation

Nur beobachtete Regionen werden hochauflösend simuliert.
```

---

DATEI
DO_NOT_SIMPLIFY.md

PFAD
/final-lock/DO_NOT_SIMPLIFY.md

INHALT
```
# Do Not Simplify

Nicht reduzieren auf:
- Demo
- UI-Mockup
- Singleplayer-Sandbox
- nur Terrain-Viewer
- nur Client ohne Weltsimulation
```

---

DATEI
FINAL_TRUTH.md

PFAD
/final-lock/FINAL_TRUTH.md

INHALT
```
# Final Truth

Dieses Projekt ist ein persistentes MMORPG und darf nicht auf ein Mockup oder eine Einzelspieler-Demo reduziert werden.

Pflicht:
- 64x64 chunks
- observer simulation
- server-authoritative logic
- NPC memory + genealogy
- player and NPC politics
- matrix energy
- 13-node brain
- GM editor
- GLB pipeline
```

---

DATEI
REQUIRED_SYSTEMS_MATRIX.md

PFAD
/final-lock/REQUIRED_SYSTEMS_MATRIX.md

INHALT
```
# Required Systems Matrix

## Welt
observer, chunks, terrain, biomes, tick, dungeons, ruins

## NPC
personality, memory, shared memory, genealogy, dna, dialogue

## Gesellschaft
civilization, politics, government, tax, war, diplomacy

## Gameplay
player, skills, inventory, combat, loot, magic

## Spezial
oracle, dudenregister, matrix energy, brain, gm editor, glb pipeline
```

---

DATEI
biome-definitions.json

PFAD
/game-data/biomes/biome-definitions.json

INHALT
```
{
  "forest": {
    "temperature": "mild",
    "resources": [
      "wood",
      "berries",
      "animals"
    ]
  },
  "desert": {
    "temperature": "hot",
    "resources": [
      "sand",
      "salt",
      "crystals"
    ]
  },
  "mountain": {
    "temperature": "cold",
    "resources": [
      "stone",
      "iron",
      "gold"
    ]
  }
}
```

---

DATEI
cultures.json

PFAD
/game-data/cultures/cultures.json

INHALT
```
{
  "forest_tribes": {
    "style": "organic"
  },
  "mountain_clans": {
    "style": "stone"
  },
  "desert_nomads": {
    "style": "lightweight"
  }
}
```

---

DATEI
matrix-energy-rules.json

PFAD
/game-data/economy/matrix-energy-rules.json

INHALT
```
{
  "currency": "matrix_energy",
  "npcCannotDestroyProtectedStructures": true
}
```

---

DATEI
dudenregister-schema.json

PFAD
/game-data/history/dudenregister-schema.json

INHALT
```
{
  "events": [
    "war",
    "collapse",
    "ruin",
    "wonder",
    "dynasty",
    "oracle"
  ]
}
```

---

DATEI
loot-tables.json

PFAD
/game-data/items/loot-tables.json

INHALT
```
{
  "wolf": [
    "wolf_pelt",
    "fang",
    "alpha_claw"
  ],
  "skeleton": [
    "bone_fragment",
    "rusted_blade",
    "grave_ring"
  ],
  "ruin_cache": [
    "ancient_coin",
    "relic_fragment",
    "forgotten_sigil"
  ]
}
```

---

DATEI
spell-schools.json

PFAD
/game-data/magic/spell-schools.json

INHALT
```
{
  "nature": [
    "root_bind",
    "healing_moss"
  ],
  "shadow": [
    "dark_bolt",
    "fear_whisper"
  ],
  "resonance": [
    "echo_wave",
    "field_tone"
  ],
  "protection": [
    "ward_shield",
    "holy_barrier"
  ],
  "ritual": [
    "ancestral_call",
    "portal_trace"
  ]
}
```

---

DATEI
npc-archetypes.json

PFAD
/game-data/npc/npc-archetypes.json

INHALT
```
{
  "merchant": {},
  "guard": {},
  "oracle": {},
  "gossip": {
    "example": "Uschi die Geschminkte"
  }
}
```

---

DATEI
government-types.json

PFAD
/game-data/politics/government-types.json

INHALT
```
{
  "monarchy": {},
  "council": {},
  "theocracy": {},
  "trade_republic": {},
  "warband": {}
}
```

---

DATEI
quest-registry.json

PFAD
/game-data/quests/quest-registry.json

INHALT
```
{
  "ruin_hunter": {
    "giver": "uschi_gossip",
    "objective": "find_ruins"
  },
  "watchtower_supply": {
    "giver": "city_guard",
    "objective": "deliver_supplies"
  }
}
```

---

DATEI
religions.json

PFAD
/game-data/religions/religions.json

INHALT
```
{
  "sun_order": {
    "ethos": "honor"
  },
  "shadow_cult": {
    "ethos": "secrecy"
  },
  "ancestor_faith": {
    "ethos": "lineage"
  }
}
```

---

DATEI
skills.json

PFAD
/game-data/skills/skills.json

INHALT
```
{
  "combat": {},
  "woodcutting": {},
  "mining": {},
  "smithing": {},
  "magic": {},
  "fishing": {}
}
```

---

DATEI
README_INTEGRATIONS.md

PFAD
/integrations/README_INTEGRATIONS.md

INHALT
```
# Integrations

Hier werden produktive Integrationen abgelegt:
- Firebase
- AWS
- WebSocket Gateway
- Datenbankadapter

Wichtig: Keine Secrets hart in Dateien schreiben.
```

---

DATEI
elasticacheAdapter.ts

PFAD
/integrations/aws/elasticacheAdapter.ts

INHALT
```
export function initElastiCache() {
  return {
    status: "elasticache-adapter-placeholder"
  };
}
```

---

DATEI
postgresAdapter.ts

PFAD
/integrations/aws/postgresAdapter.ts

INHALT
```
export function initPostgres() {
  return {
    status: "postgres-adapter-placeholder"
  };
}
```

---

DATEI
firebase-config.ts

PFAD
/integrations/firebase/firebase-config.ts

INHALT
```
export const firebaseConfig = {
  note: "Fill with real Firebase credentials during deployment"
};
```

---

DATEI
firestorePersistence.ts

PFAD
/integrations/firebase/firestorePersistence.ts

INHALT
```
export function initFirestorePersistence() {
  return {
    status: "firestore-persistence-placeholder"
  };
}
```

---

DATEI
awsGatewayBridge.ts

PFAD
/integrations/websocket-gateway/awsGatewayBridge.ts

INHALT
```
export function initAwsGatewayBridge() {
  return {
    status: "aws-websocket-gateway-placeholder"
  };
}
```

---

DATEI
package.json

PFAD
/server/package.json

INHALT
```
{
  "name": "areloria-server",
  "version": "0.2.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "@types/ws": "^8.5.12",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

---

DATEI
ServerBootstrap.ts

PFAD
/server/src/core/ServerBootstrap.ts

INHALT
```
import express from "express";
import { createServer } from "node:http";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { WorldTick } from "./WorldTick.js";

export class ServerBootstrap {
  start() {
    const app = express();
    const httpServer = createServer(app);

    app.get("/health", (_req, res) => {
      res.json({
        ok: true,
        project: "ARELORIAN MMORPG",
        version: "0.2.0"
      });
    });

    const ws = new GameWebSocketServer(httpServer);
    ws.start();

    const tick = new WorldTick();
    const port = Number(process.env.PORT || 3000);

    httpServer.listen(port, () => {
      console.log(`Arelorian server listening on ${port}`);
      tick.start();
    });
  }
}
```

---

DATEI
WorldTick.ts

PFAD
/server/src/core/WorldTick.ts

INHALT
```
export class WorldTick {
  private timer: NodeJS.Timeout | null = null;
  private tickCount = 0;

  start() {
    this.timer = setInterval(() => this.tick(), 100);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  tick() {
    this.tickCount += 1;
    if (this.tickCount % 10 === 0) {
      console.log("World Tick", this.tickCount);
    }
  }
}
```

---

DATEI
index.ts

PFAD
/server/src/index.ts

INHALT
```
import { ServerBootstrap } from "./core/ServerBootstrap.js";

new ServerBootstrap().start();
```

---

DATEI
BehaviorTree.ts

PFAD
/server/src/modules/ai/BehaviorTree.ts

INHALT
```
export class BehaviorTree {
  run(npc: any) {
    if (npc.needs?.sleep) return "sleep";
    if (npc.needs?.hunger) return "eat";
    if (npc.job) return "work";
    return "wander";
  }
}
```

---

DATEI
NPCBrain.ts

PFAD
/server/src/modules/ai/NPCBrain.ts

INHALT
```
import { BehaviorTree } from "./BehaviorTree.js";

export class NPCBrain {
  private tree = new BehaviorTree();

  update(npc: any) {
    const action = this.tree.run(npc);
    npc.currentAction = action;
    return action;
  }
}
```

---

DATEI
TaskSystem.ts

PFAD
/server/src/modules/ai/TaskSystem.ts

INHALT
```
export class TaskSystem {
  execute(npc: any, action: string) {
    switch (action) {
      case "wander":
        return { action, destination: "random_nearby" };
      case "work":
        return { action, destination: npc.jobLocation ?? "workplace" };
      case "eat":
        return { action, destination: "tavern" };
      case "sleep":
        return { action, destination: "home" };
      default:
        return { action: "idle" };
    }
  }
}
```

---

DATEI
AssetRegistry.ts

PFAD
/server/src/modules/asset-registry/AssetRegistry.ts

INHALT
```
export class AssetRegistry {
  private assets = new Map<string, any>();

  register(id: string, data: any) {
    this.assets.set(id, data);
  }

  get(id: string) {
    return this.assets.get(id) ?? null;
  }

  list() {
    return Array.from(this.assets.entries()).map(([id, data]) => ({ id, ...data }));
  }
}
```

---

DATEI
NPCAssets.ts

PFAD
/server/src/modules/asset-registry/NPCAssets.ts

INHALT
```
export const NPCAssets = {
  uschi_gossip: {
    assetId: "uschi_gossip",
    model: "/assets/models/characters/uschi_gossip.glb",
    category: "npc",
    animations: ["idle", "talk", "laugh", "cough"]
  },
  warrior_male: {
    assetId: "warrior_male",
    model: "/assets/models/characters/warrior_male.glb",
    category: "player_or_npc",
    animations: ["idle", "walk", "attack"]
  },
  warrior_female: {
    assetId: "warrior_female",
    model: "/assets/models/characters/warrior_female.glb",
    category: "player_or_npc",
    animations: ["idle", "walk", "attack"]
  }
};
```

---

DATEI
StructureAssets.ts

PFAD
/server/src/modules/asset-registry/StructureAssets.ts

INHALT
```
export const StructureAssets = {
  castle_wall: {
    assetId: "castle_wall",
    type: "structure",
    model: "/assets/models/buildings/castle_wall.glb",
    collision: true
  },
  castle_gate: {
    assetId: "castle_gate",
    type: "interactive_structure",
    model: "/assets/models/buildings/castle_gate.glb",
    collision: true,
    states: ["open", "closed", "locked", "damaged", "destroyed"]
  },
  castle_watch_tower: {
    assetId: "castle_watch_tower",
    type: "defense_structure",
    model: "/assets/models/buildings/castle_watch_tower.glb",
    collision: true
  }
};
```

---

DATEI
VegetationAssets.ts

PFAD
/server/src/modules/asset-registry/VegetationAssets.ts

INHALT
```
export const VegetationAssets = {
  tree_oak_young: { model: "/assets/models/vegetation/tree_oak_young.glb", category: "vegetation", growthStage: 0 },
  tree_oak_spring: { model: "/assets/models/vegetation/tree_oak_spring.glb", category: "vegetation", growthStage: 1 },
  tree_oak_summer: { model: "/assets/models/vegetation/tree_oak_summer.glb", category: "vegetation", growthStage: 2 },
  tree_oak_autumn: { model: "/assets/models/vegetation/tree_oak_autumn.glb", category: "vegetation", growthStage: 3 }
};
```

---

DATEI
BrainFieldAnalyzer.ts

PFAD
/server/src/modules/brain/BrainFieldAnalyzer.ts

INHALT
```
export class BrainFieldAnalyzer {
  analyzeField(values: unknown[]) {
    return {
      activeNodes: values.length,
      result: "field-analysis-placeholder"
    };
  }
}
```

---

DATEI
HeuristicWorldBrain.ts

PFAD
/server/src/modules/brain/HeuristicWorldBrain.ts

INHALT
```
export class HeuristicWorldBrain {
  private readonly nodes = new Array(13).fill(null);

  analyze(input: unknown) {
    return {
      nodes: this.nodes.length,
      summary: "analysis-placeholder",
      input
    };
  }
}
```

---

DATEI
CivilizationEngine.ts

PFAD
/server/src/modules/civilization/CivilizationEngine.ts

INHALT
```
export class CivilizationEngine {
  createVillage(guildMembers: number) {
    if (guildMembers < 50) return null;
    return {
      type: "village",
      population: guildMembers,
      createdAt: Date.now()
    };
  }
}
```

---

DATEI
SettlementSystem.ts

PFAD
/server/src/modules/civilization/SettlementSystem.ts

INHALT
```
export class SettlementSystem {
  createSettlement(type: "village" | "city" | "kingdom" | "nation", ownerId: string) {
    return {
      type,
      ownerId,
      createdAt: Date.now()
    };
  }
}
```

---

DATEI
CombatSystem.ts

PFAD
/server/src/modules/combat/CombatSystem.ts

INHALT
```
export class CombatSystem {
  attack(attacker: any, defender: any) {
    if (attacker.stamina <= 0) return { success: false, reason: "no_stamina" };

    attacker.stamina -= 10;

    const hitChance = this.hitChance(attacker, defender);
    if (Math.random() > hitChance) {
      return { success: true, hit: false, damage: 0 };
    }

    const damage = this.calculateDamage(attacker, defender);
    defender.health = Math.max(0, defender.health - damage);

    return {
      success: true,
      hit: true,
      damage,
      defenderHealth: defender.health
    };
  }

  hitChance(attacker: any, defender: any) {
    const atk = attacker.skills?.combat?.level ?? 1;
    const def = defender.skills?.combat?.level ?? 1;
    return Math.min(0.95, Math.max(0.1, atk / (atk + def)));
  }

  calculateDamage(attacker: any, defender: any) {
    const atk = attacker.skills?.combat?.level ?? 1;
    const def = defender.skills?.combat?.level ?? 1;
    const base = 5 + atk;
    const mitigation = Math.floor(def * 0.3);
    return Math.max(1, base - mitigation + Math.floor(Math.random() * 4));
  }
}
```

---

DATEI
DialogueContext.ts

PFAD
/server/src/modules/dialogue/DialogueContext.ts

INHALT
```
export function buildDialogueContext(npc: any, player: any, world: any) {
  return {
    npcId: npc.id,
    playerId: player?.id ?? null,
    traits: npc.traits ?? {},
    lineage: npc.lineage ?? null,
    culture: npc.culture ?? null,
    religion: npc.religion ?? null,
    memory: npc.memory ?? [],
    worldEvents: world?.events ?? [],
    oracleSignals: world?.oracleSignals ?? []
  };
}
```

---

DATEI
DialogueEngine.ts

PFAD
/server/src/modules/dialogue/DialogueEngine.ts

INHALT
```
import { buildDialogueContext } from "./DialogueContext.js";
import { DialogueGenerator } from "./DialogueGenerator.js";

export class DialogueEngine {
  private generator = new DialogueGenerator();

  talk(npc: any, player: any, world: any) {
    const context = buildDialogueContext(npc, player, world);
    return this.generator.generate(context);
  }
}
```

---

DATEI
DialogueGenerator.ts

PFAD
/server/src/modules/dialogue/DialogueGenerator.ts

INHALT
```
import { DialogueTemplates } from "./DialogueTemplates.js";

export class DialogueGenerator {
  generate(context: any) {
    const mood = context.traits?.aggression > 0.7 ? "warning" : "greeting";
    const pool = DialogueTemplates[mood] ?? ["..."];
    return {
      line: pool[Math.floor(Math.random() * pool.length)],
      contextSummary: {
        culture: context.culture,
        religion: context.religion
      }
    };
  }
}
```

---

DATEI
DialogueTemplates.ts

PFAD
/server/src/modules/dialogue/DialogueTemplates.ts

INHALT
```
export const DialogueTemplates = {
  greeting: [
    "Na Süßer, suchst du Abenteuer?",
    "Du siehst aus, als hättest du Ärger im Gepäck.",
    "Setz dich, ich erzähl dir was Interessantes."
  ],
  rumor: [
    "Im Nordwald wurden alte Mauern gesehen.",
    "Die Händler reden von seltsamen Kreaturen im Moor.",
    "Ein Königreich im Osten ist nervös."
  ],
  warning: [
    "Geh da nicht unvorbereitet hinein.",
    "Manche Wege fressen ganze Blutlinien.",
    "Nicht jede Ruine will entdeckt werden."
  ]
};
```

---

DATEI
DungeonGenerator.ts

PFAD
/server/src/modules/dungeon/DungeonGenerator.ts

INHALT
```
export class DungeonGenerator {
  generate(seed: number) {
    const rooms = [];
    const roomCount = 4 + Math.floor(Math.abs(Math.sin(seed)) * 6);
    for (let i = 0; i < roomCount; i++) {
      rooms.push({
        id: i,
        type: this.randomRoom(seed + i),
        danger: 1 + (i % 5)
      });
    }
    return { seed, rooms };
  }

  randomRoom(seed: number) {
    const types = [
      "hall",
      "treasure_room",
      "monster_lair",
      "collapsed_passage",
      "ancient_shrine"
    ];
    return types[Math.abs(Math.floor(seed)) % types.length];
  }
}
```

---

DATEI
EconomyEngine.ts

PFAD
/server/src/modules/economy/EconomyEngine.ts

INHALT
```
export class EconomyEngine {
  private markets = new Map<string, { goods: Record<string, number> }>();

  registerMarket(id: string) {
    this.markets.set(id, { goods: {} });
  }

  trade(marketId: string, item: string, amount: number) {
    const market = this.markets.get(marketId);
    if (!market) return null;
    if (!market.goods[item]) market.goods[item] = 0;
    market.goods[item] += amount;
    return market.goods[item];
  }
}
```

---

DATEI
MatrixEnergySystem.ts

PFAD
/server/src/modules/economy/MatrixEnergySystem.ts

INHALT
```
export class MatrixEnergySystem {
  private balances = new Map<string, number>();

  add(playerId: string, amount: number) {
    const current = this.balances.get(playerId) || 0;
    this.balances.set(playerId, current + amount);
  }

  consume(playerId: string, amount: number) {
    const current = this.balances.get(playerId) || 0;
    if (current < amount) return false;
    this.balances.set(playerId, current - amount);
    return true;
  }

  getBalance(playerId: string) {
    return this.balances.get(playerId) || 0;
  }
}
```

---

DATEI
TradeRoutes.ts

PFAD
/server/src/modules/economy/TradeRoutes.ts

INHALT
```
export class TradeRoutes {
  createRoute(a: string, b: string) {
    return {
      from: a,
      to: b,
      active: true
    };
  }
}
```

---

DATEI
DudenregisterHistory.ts

PFAD
/server/src/modules/history/DudenregisterHistory.ts

INHALT
```
export class DudenregisterHistory {
  private history: any[] = [];

  record(event: any) {
    this.history.push(event);
  }

  getHistory() {
    return this.history;
  }
}
```

---

DATEI
WorldSnapshotSystem.ts

PFAD
/server/src/modules/history/WorldSnapshotSystem.ts

INHALT
```
export class WorldSnapshotSystem {
  private snapshots: any[] = [];

  save(worldState: any) {
    this.snapshots.push({
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(worldState))
    });
  }

  latest() {
    return this.snapshots[this.snapshots.length - 1] ?? null;
  }
}
```

---

DATEI
InventorySystem.ts

PFAD
/server/src/modules/inventory/InventorySystem.ts

INHALT
```
export class InventorySystem {
  addItem(player: any, item: any) {
    player.inventory.push(item);
    return player.inventory;
  }

  removeItem(player: any, itemId: string) {
    player.inventory = player.inventory.filter((item: any) => item.id !== itemId);
    return player.inventory;
  }
}
```

---

DATEI
LootTables.ts

PFAD
/server/src/modules/loot/LootTables.ts

INHALT
```
export const LootTables = {
  wolf: [
    { id: "wolf_pelt", chance: 0.65, rarity: "common" },
    { id: "fang", chance: 0.3, rarity: "common" },
    { id: "alpha_claw", chance: 0.05, rarity: "rare" }
  ],
  skeleton: [
    { id: "bone_fragment", chance: 0.7, rarity: "common" },
    { id: "rusted_blade", chance: 0.2, rarity: "uncommon" },
    { id: "grave_ring", chance: 0.03, rarity: "rare" }
  ],
  ruin_cache: [
    { id: "ancient_coin", chance: 0.5, rarity: "uncommon" },
    { id: "relic_fragment", chance: 0.2, rarity: "rare" },
    { id: "forgotten_sigil", chance: 0.02, rarity: "legendary" }
  ]
};
```

---

DATEI
MagicSystem.ts

PFAD
/server/src/modules/magic/MagicSystem.ts

INHALT
```
export class MagicSystem {
  cast(caster: any, spell: any, target: any) {
    if ((caster.mana ?? 0) < spell.cost) {
      return { success: false, reason: "not_enough_mana" };
    }

    caster.mana -= spell.cost;

    return {
      success: true,
      spell: spell.id,
      target: target?.id ?? null,
      effect: spell.effect ?? "generic_magic_effect"
    };
  }
}
```

---

DATEI
MonsterDNA.ts

PFAD
/server/src/modules/monster/MonsterDNA.ts

INHALT
```
export function generateMonsterDNA(species: string) {
  return {
    species,
    strength: Math.random(),
    speed: Math.random(),
    aggression: Math.random(),
    intelligence: Math.random(),
    resilience: Math.random()
  };
}
```

---

DATEI
MonsterMutation.ts

PFAD
/server/src/modules/monster/MonsterMutation.ts

INHALT
```
export function mutateMonster(dna: any, biome: string) {
  const clone = { ...dna, mutations: [] as string[] };

  if (biome === "snow") {
    clone.resilience += 0.2;
    clone.mutations.push("frost_resistance");
  }

  if (biome === "swamp") {
    clone.aggression += 0.15;
    clone.mutations.push("swamp_hunger");
  }

  if (Math.random() < 0.08) {
    clone.mutations.push("rare_variant");
  }

  return clone;
}
```

---

DATEI
MonsterSpawner.ts

PFAD
/server/src/modules/monster/MonsterSpawner.ts

INHALT
```
import { generateMonsterDNA } from "./MonsterDNA.js";
import { mutateMonster } from "./MonsterMutation.js";

export class MonsterSpawner {
  spawn(species: string, biome: string) {
    const dna = generateMonsterDNA(species);
    return mutateMonster(dna, biome);
  }
}
```

---

DATEI
NPCDialogueSystem.ts

PFAD
/server/src/modules/npc/NPCDialogueSystem.ts

INHALT
```
export class NPCDialogueSystem {
  talk(npc: any, worldSignals: any = {}) {
    const lines = npc.dialogueLines || [
      "Die Welt flüstert merkwürdige Dinge.",
      "Ich habe da ein Gerücht gehört."
    ];

    return {
      line: lines[Math.floor(Math.random() * lines.length)],
      signals: worldSignals
    };
  }
}
```

---

DATEI
NPCGenealogyEngine.ts

PFAD
/server/src/modules/npc/NPCGenealogyEngine.ts

INHALT
```
export class NPCGenealogyEngine {
  createLineage(id: string, house: string, parents: string[] = []) {
    return {
      id,
      house,
      parents,
      children: [] as string[]
    };
  }

  addChild(lineage: any, childId: string) {
    lineage.children.push(childId);
    return lineage;
  }
}
```

---

DATEI
NPCMemoryEngine.ts

PFAD
/server/src/modules/npc/NPCMemoryEngine.ts

INHALT
```
export class NPCMemoryEngine {
  private memory = new Map<string, any[]>();

  remember(npcId: string, event: any) {
    if (!this.memory.has(npcId)) this.memory.set(npcId, []);
    this.memory.get(npcId)!.push({
      timestamp: Date.now(),
      event
    });
  }

  recall(npcId: string) {
    return this.memory.get(npcId) || [];
  }
}
```

---

DATEI
NPCPersonalityEngine.ts

PFAD
/server/src/modules/npc/NPCPersonalityEngine.ts

INHALT
```
export class NPCPersonalityEngine {
  generateTraits() {
    return {
      courage: Math.random(),
      curiosity: Math.random(),
      greed: Math.random(),
      faith: Math.random(),
      aggression: Math.random()
    };
  }
}
```

---

DATEI
ObserverEngine.ts

PFAD
/server/src/modules/observer/ObserverEngine.ts

INHALT
```
export class ObserverEngine {
  private observers = new Map<string, { x: number; y: number }>();

  register(playerId: string, position: { x: number; y: number }) {
    this.observers.set(playerId, position);
  }

  unregister(playerId: string) {
    this.observers.delete(playerId);
  }

  getObservedChunks() {
    const result = [] as { chunkX: number; chunkY: number }[];
    for (const [, pos] of this.observers) {
      result.push({
        chunkX: Math.floor(pos.x / 64),
        chunkY: Math.floor(pos.y / 64)
      });
    }
    return result;
  }
}
```

---

DATEI
OracleEngine.ts

PFAD
/server/src/modules/oracle/OracleEngine.ts

INHALT
```
export class OracleEngine {
  generateVision() {
    const visions = [
      "Ich sehe Feuer im Norden.",
      "Unter alten Mauern liegt ein Geheimnis.",
      "Ein Königreich wird fallen."
    ];
    return visions[Math.floor(Math.random() * visions.length)];
  }
}
```

---

DATEI
CivilizationDatabase.ts

PFAD
/server/src/modules/persistence/CivilizationDatabase.ts

INHALT
```
export class CivilizationDatabase {
  private civilizations = new Map<string, any>();

  saveCivilization(civ: any) {
    this.civilizations.set(civ.id, civ);
  }

  loadCivilization(id: string) {
    return this.civilizations.get(id) ?? null;
  }
}
```

---

DATEI
PlayerDatabase.ts

PFAD
/server/src/modules/persistence/PlayerDatabase.ts

INHALT
```
export class PlayerDatabase {
  private players = new Map<string, any>();

  savePlayer(player: any) {
    this.players.set(player.id, player);
  }

  loadPlayer(id: string) {
    return this.players.get(id) ?? null;
  }
}
```

---

DATEI
WorldDatabase.ts

PFAD
/server/src/modules/persistence/WorldDatabase.ts

INHALT
```
export class WorldDatabase {
  private chunks = new Map<string, any>();

  saveChunk(chunk: any) {
    this.chunks.set(chunk.id, chunk);
  }

  loadChunk(id: string) {
    return this.chunks.get(id) ?? null;
  }
}
```

---

DATEI
PlayerSystem.ts

PFAD
/server/src/modules/player/PlayerSystem.ts

INHALT
```
export class PlayerSystem {
  createPlayer(id: string, name: string) {
    return {
      id,
      name,
      position: { x: 0, y: 0, z: 0 },
      health: 100,
      stamina: 100,
      mana: 25,
      skills: {},
      inventory: [],
      faction: null,
      civilization: null,
      matrixEnergy: 0
    };
  }
}
```

---

DATEI
GovernmentTypes.ts

PFAD
/server/src/modules/politics/GovernmentTypes.ts

INHALT
```
export const GovernmentTypes = {
  monarchy: { id: "monarchy", succession: "inheritance", stabilityBase: 0.7 },
  council: { id: "council", succession: "vote", stabilityBase: 0.6 },
  theocracy: { id: "theocracy", succession: "religious_selection", stabilityBase: 0.65 },
  trade_republic: { id: "trade_republic", succession: "merchant_vote", stabilityBase: 0.55 },
  warband: { id: "warband", succession: "strength", stabilityBase: 0.4 }
};
```

---

DATEI
WarEngine.ts

PFAD
/server/src/modules/politics/WarEngine.ts

INHALT
```
export class WarEngine {
  declareWar(attacker: any, defender: any) {
    return {
      type: "war_declared",
      attacker: attacker.id,
      defender: defender.id,
      timestamp: Date.now()
    };
  }
}
```

---

DATEI
QuestEngine.ts

PFAD
/server/src/modules/quest/QuestEngine.ts

INHALT
```
import { QuestRegistry } from "./QuestRegistry.js";

export class QuestEngine {
  private active = new Map<string, any[]>();

  startQuest(playerId: string, questId: keyof typeof QuestRegistry) {
    const quest = QuestRegistry[questId];
    if (!quest) return null;
    if (!this.active.has(playerId)) this.active.set(playerId, []);
    this.active.get(playerId)!.push({ ...quest, startedAt: Date.now(), completed: false });
    return quest;
  }

  listQuests(playerId: string) {
    return this.active.get(playerId) || [];
  }

  completeQuest(playerId: string, questId: string) {
    const quests = this.active.get(playerId) || [];
    const q = quests.find((x) => x.id === questId);
    if (!q) return null;
    q.completed = true;
    q.completedAt = Date.now();
    return q.reward;
  }
}
```

---

DATEI
QuestRegistry.ts

PFAD
/server/src/modules/quest/QuestRegistry.ts

INHALT
```
export const QuestRegistry = {
  ruin_hunter: {
    id: "ruin_hunter",
    name: "Die alten Mauern",
    giver: "uschi_gossip",
    objective: "find_ruins",
    reward: { gold: 100, item: "ancient_relic" }
  },
  watchtower_supply: {
    id: "watchtower_supply",
    name: "Die hungernden Wächter",
    giver: "city_guard",
    objective: "deliver_supplies",
    reward: { xp: 50, item: "guard_token" }
  }
};
```

---

DATEI
ReligionSystem.ts

PFAD
/server/src/modules/religion/ReligionSystem.ts

INHALT
```
export class ReligionSystem {
  private religions = new Map<string, any>();

  registerReligion(id: string, data: any) {
    this.religions.set(id, data);
  }

  getReligion(id: string) {
    return this.religions.get(id);
  }
}
```

---

DATEI
SkillSystem.ts

PFAD
/server/src/modules/skill/SkillSystem.ts

INHALT
```
export class SkillSystem {
  ensureSkill(player: any, skillName: string) {
    if (!player.skills[skillName]) {
      player.skills[skillName] = { level: 1, xp: 0 };
    }
  }

  addXP(player: any, skillName: string, amount: number) {
    this.ensureSkill(player, skillName);
    const skill = player.skills[skillName];
    skill.xp += amount;
    while (skill.xp >= this.nextLevelXP(skill.level)) {
      skill.level += 1;
    }
    return skill;
  }

  nextLevelXP(level: number) {
    return Math.floor(50 * Math.pow(level, 1.4));
  }
}
```

---

DATEI
GateController.ts

PFAD
/server/src/modules/structure/GateController.ts

INHALT
```
export class GateController {
  setState(gate: any, state: string) {
    const allowed = ["open", "closed", "locked", "damaged", "destroyed"];
    if (!allowed.includes(state)) throw new Error("Invalid gate state");
    gate.state = state;
    return gate;
  }

  canOpen(actor: any, gate: any) {
    if (gate.state === "destroyed") return false;
    if (gate.state === "locked" && !actor.permissions?.includes("gate_access")) return false;
    return true;
  }
}
```

---

DATEI
StructureEngine.ts

PFAD
/server/src/modules/structure/StructureEngine.ts

INHALT
```
export class StructureEngine {
  private structures = new Map<string, any>();

  createStructure(structure: any) {
    this.structures.set(structure.structureId, structure);
    return structure;
  }

  getStructure(id: string) {
    return this.structures.get(id) ?? null;
  }

  damageStructure(id: string, amount: number) {
    const structure = this.structures.get(id);
    if (!structure) return null;
    structure.hitpoints = Math.max(0, structure.hitpoints - amount);
    if (structure.hitpoints === 0) structure.destroyed = true;
    return structure;
  }
}
```

---

DATEI
BiomeGenerator.ts

PFAD
/server/src/modules/world/BiomeGenerator.ts

INHALT
```
export class BiomeGenerator {
  getBiome(_x: number, _y: number, height: number) {
    if (height > 0.7) return "mountain";
    if (height > 0.45) return "forest";
    if (height > 0.2) return "grassland";
    return "desert";
  }
}
```

---

DATEI
ChunkSystem.ts

PFAD
/server/src/modules/world/ChunkSystem.ts

INHALT
```
export class ChunkSystem {
  constructor(public readonly size: number = 64) {}

  getChunk(x: number, y: number) {
    return {
      id: `${x}:${y}`,
      x,
      y,
      size: this.size
    };
  }
}
```

---

DATEI
TerrainGenerator.ts

PFAD
/server/src/modules/world/TerrainGenerator.ts

INHALT
```
export class TerrainGenerator {
  getHeight(x: number, y: number) {
    return Math.sin(x * 0.1) + Math.cos(y * 0.1);
  }
}
```

---

DATEI
WorldEditorServer.ts

PFAD
/server/src/modules/world-editor/WorldEditorServer.ts

INHALT
```
export class WorldEditorServer {
  spawnEntity(type: string, position: { x: number; y: number; z: number }) {
    return { action: "spawn", type, position };
  }

  moveEntity(entityId: string, position: { x: number; y: number; z: number }) {
    return { action: "move", entityId, position };
  }

  deleteEntity(entityId: string) {
    return { action: "delete", entityId };
  }
}
```

---

DATEI
PacketRouter.ts

PFAD
/server/src/networking/PacketRouter.ts

INHALT
```
export class PacketRouter {
  route(packet: any) {
    return {
      handled: true,
      type: packet?.type ?? "unknown"
    };
  }
}
```

---

DATEI
PlayerSession.ts

PFAD
/server/src/networking/PlayerSession.ts

INHALT
```
export type PlayerSession = {
  id: string;
  name: string;
  connectedAt: number;
  position: { x: number; y: number; z: number };
};
```

---

DATEI
WebSocketServer.ts

PFAD
/server/src/networking/WebSocketServer.ts

INHALT
```
import type { Server as HttpServer } from "node:http";
import { WebSocketServer } from "ws";

export class GameWebSocketServer {
  private wss: WebSocketServer | null = null;

  constructor(private readonly httpServer: HttpServer) {}

  start() {
    this.wss = new WebSocketServer({ server: this.httpServer });

    this.wss.on("connection", (socket) => {
      socket.send(JSON.stringify({
        type: "welcome",
        message: "Arelorian connection established"
      }));

      socket.on("message", (msg) => {
        console.log("WS message:", msg.toString());
      });
    });
  }
}
```

---

DATEI
tsconfig.json

PFAD
/server/tsconfig.json

INHALT
```
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": [
    "src/**/*"
  ]
}
```

---

DATEI
README_ASSETS.md

PFAD
/world-assets/README_ASSETS.md

INHALT
```
# World Assets

Lege hier GLB-Assets ab:
- characters/
- monsters/
- buildings/
- props/
- vegetation/
- admin/

Beispiele:
- uschi_gossip.glb
- warrior_male.glb
- warrior_female.glb
- castle_gate.glb
- castle_watch_tower.glb
- tree_oak_spring.glb
- gm_giraffe.glb
```
```

---

DATEI
areloria_reconstruction_pack_fuller.txt

PFAD
/areloria_reconstruction_pack_fuller.txt

INHALT
```
# ARELORIA RECONSTRUCTION PACK FULLER

DATEI / PFAD / INHALT für Agent-Rekonstruktion

---

DATEI
CHECKED_CONTENT_REPORT.md

PFAD
/CHECKED_CONTENT_REPORT.md

INHALT
```
# Checked Content Report

Dieses Paket wurde **neu** aufgebaut, damit es nicht wieder nur aus fast leeren Ordnern besteht.

## Enthalten
- Root-Dateien
- 9 Hauptdokumente
- 3 final-lock-Dateien
- 3 agent-Dateien
- Server core + networking
- 21 Server-Moduldateien
- Client package + renderer + websocket + HUD
- Game-data-Dateien
- Integrationsplatzhalter
- Admin-/Asset-Readmes

## Dateianzahl
79
```

---

DATEI
MASTER_INDEX.md

PFAD
/MASTER_INDEX.md

INHALT
```
# Master Index

## Root
- README_START_HERE.md
- PROJECT_LOCK_RULES.md
- MASTER_INDEX.md

## Core Docs
- docs/MASTER_DESIGN_BIBLE.md
- docs/MASTER_SYSTEM_CHECKLIST.md
- docs/BUILD_SEQUENCE_MASTER.md
- docs/WORLD_GENERATION.md
- docs/NPC_SYSTEM.md
- docs/ECONOMY_MODEL.md
- docs/BRAIN_SYSTEM.md
- docs/ASSET_PIPELINE.md
- docs/GM_EDITOR.md

## Final Lock
- final-lock/FINAL_TRUTH.md
- final-lock/DO_NOT_SIMPLIFY.md
- final-lock/REQUIRED_SYSTEMS_MATRIX.md

## Agent
- agent/AGENT_BUILD_INSTRUCTIONS.md
- agent/ARELORIAN_SUPER_PROMPT.md
- agent/AI_AGENT_FAILSAFE_RULES.md

## Code
- server/
- client/

## Data
- game-data/
- world-assets/

## Ops
- integrations/
- admin-tools/
```

---

DATEI
PACK_BUILD_STATUS.md

PFAD
/PACK_BUILD_STATUS.md

INHALT
```
# Pack Build Status

## Bereits aufgebaut
- Root rules/docs
- Final lock files
- Agent files
- Server core
- Networking
- World + observer
- NPC systems
- Dialogue + quest
- Dungeon + monster
- Structure + gate + asset registry
- AI behavior
- Persistence
- Client core + renderer + websocket + HUD + editor UI
- Game data basics
- Integrations placeholders

## Nächste vertiefbare Blöcke
- vollständiger GM command layer
- richer item generator + affix logic
- crafting system
- farming / tree growth logic
- city market simulation expansion
- real auth / persistence adapters
```

---

DATEI
PROJECT_LOCK_RULES.md

PFAD
/PROJECT_LOCK_RULES.md

INHALT
```
# Project Lock Rules

Diese Regeln dürfen nicht gebrochen werden.

1. Kein Umbau zu einer simplen Demo-App.
2. Chunkgröße bleibt 64x64.
3. Observer-Axiom bleibt Pflicht.
4. Server bleibt autoritativ.
5. NPC-Personality, NPC-Memory und Genealogie bleiben Pflichtsysteme.
6. Spieler- und NPC-Politik bleiben Pflichtsysteme.
7. Matrix-Energie bleibt Infrastrukturwährung.
8. Server-Brain mit 13 Punkten bleibt Pflicht.
9. GM-World-Editor bleibt Pflicht.
10. GLB-Asset-Pipeline bleibt Pflicht.
```

---

DATEI
README_START_HERE.md

PFAD
/README_START_HERE.md

INHALT
```
# Arelorian Master Project

Dieses Paket ist ein **voller Entwicklungs-Scaffold** für das Arelorian/Ouroboros Browser-MMORPG.
Es ist **kein leeres Ordnerpaket** und **keine Demo-App**, sondern eine strukturierte Grundlage mit:
- Architektur- und Regeldokumenten
- Server-Modulen als TypeScript-Skeletons
- Client-Grundgerüst mit Three.js
- Game-Data-Dateien
- Integrationsplatzhaltern für Firebase/AWS
- Admin-/GM-Editor-Grunddateien
- Asset-Import-Hinweisen für GLB-Dateien

## Sofort lesen
1. `PROJECT_LOCK_RULES.md`
2. `final-lock/FINAL_TRUTH.md`
3. `docs/MASTER_DESIGN_BIBLE.md`
4. `docs/BUILD_SEQUENCE_MASTER.md`
5. `agent/AGENT_BUILD_INSTRUCTIONS.md`

## Projektstatus
Dieses Paket liefert ein **ausgebautes Fundament**. Es ist nicht das komplett fertige MMO,
aber es ist eine **brauchbare, nicht-leere Arbeitsbasis**, die weiter implementiert werden kann.
```

---

DATEI
README_ADMIN.md

PFAD
/admin-tools/README_ADMIN.md

INHALT
```
# Admin Tools

Hier liegen GM- und World-Editor-Hinweise.

## Geplant
- WorldEditor.ts
- TerrainBrush.ts
- ObjectPlacement.ts
- GMControlPanel.ts
- LiveWorldControl.ts

Das Mount `gm_giraffe` kann später den Admin-Modus markieren.
```

---

DATEI
AGENT_BUILD_INSTRUCTIONS.md

PFAD
/agent/AGENT_BUILD_INSTRUCTIONS.md

INHALT
```
# Agent Build Instructions

1. Lies zuerst alle Lock-Dateien.
2. Verändere keine Kernregeln.
3. Baue in der vorgegebenen Reihenfolge.
4. Halte Serverlogik serverseitig.
5. Nutze das Clientgerüst nur für Darstellung.

## Wichtige Reihenfolge
server core -> world -> observer -> npc -> civilization -> economy -> gameplay -> brain -> assets -> gm editor -> client -> integrations
```

---

DATEI
AI_AGENT_FAILSAFE_RULES.md

PFAD
/agent/AI_AGENT_FAILSAFE_RULES.md

INHALT
```
# AI Agent Failsafe Rules

- Do not remove observer simulation
- Do not remove chunk size 64x64
- Do not remove NPC memory/genealogy
- Do not remove politics
- Do not remove matrix energy
- Do not remove brain
- Do not remove GM editor
- Do not remove GLB pipeline
```

---

DATEI
ARELORIAN_SUPER_PROMPT.md

PFAD
/agent/ARELORIAN_SUPER_PROMPT.md

INHALT
```
# Arelorian Super Prompt

Build a persistent browser MMORPG with:
- procedural world
- 64x64 chunks
- observer-driven simulation
- NPC personality, memory, genealogy, politics
- player civilization and NPC civilization
- matrix energy economy
- 13-node server brain
- GLB asset pipeline
- GM world editor

Do not simplify it into a prototype app.
```

---

DATEI
package.json

PFAD
/client/package.json

INHALT
```
{
  "name": "areloria-client",
  "version": "0.2.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "three": "^0.169.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^5.4.0"
  }
}
```

---

DATEI
index.html

PFAD
/client/public/index.html

INHALT
```
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
    <title>Arelorian Client</title>
  </head>
  <body>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

---

DATEI
AssetLoader.ts

PFAD
/client/src/assets/AssetLoader.ts

INHALT
```
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class AssetLoader {
  private loader = new GLTFLoader();

  load(path: string) {
    return new Promise((resolve, reject) => {
      this.loader.load(path, (gltf) => resolve(gltf.scene), undefined, reject);
    });
  }
}
```

---

DATEI
ModelRegistry.ts

PFAD
/client/src/assets/ModelRegistry.ts

INHALT
```
export const ModelRegistry = {
  uschi: { path: "/assets/models/characters/uschi_gossip.glb", scale: 1 },
  castle_wall: { path: "/assets/models/buildings/castle_wall.glb", scale: 1 },
  watch_tower: { path: "/assets/models/buildings/castle_watch_tower.glb", scale: 1 },
  tree_spring: { path: "/assets/models/vegetation/tree_oak_spring.glb", scale: 1 },
  gm_giraffe: { path: "/assets/models/admin/gm_giraffe.glb", scale: 1 }
};
```

---

DATEI
PlacementTool.ts

PFAD
/client/src/editor/PlacementTool.ts

INHALT
```
export class PlacementTool {
  place(type: string, position: { x: number; y: number; z: number }) {
    return { action: "place", type, position };
  }
}
```

---

DATEI
SelectionTool.ts

PFAD
/client/src/editor/SelectionTool.ts

INHALT
```
export class SelectionTool {
  select(entityId: string) {
    return { selected: entityId };
  }
}
```

---

DATEI
WorldEditorUI.ts

PFAD
/client/src/editor/WorldEditorUI.ts

INHALT
```
export function openWorldEditorUI() {
  const el = document.createElement("div");
  el.textContent = "GM World Editor";
  el.style.position = "fixed";
  el.style.right = "12px";
  el.style.bottom = "12px";
  el.style.padding = "10px 14px";
  el.style.background = "#2b2b2b";
  el.style.color = "#fff";
  document.body.appendChild(el);
}
```

---

DATEI
renderer.ts

PFAD
/client/src/engine/renderer.ts

INHALT
```
import * as THREE from "three";

export function initRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshBasicMaterial({ color: 0x44aa88 })
  );

  scene.add(cube);

  function animate() {
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();
}
```

---

DATEI
worldLoader.ts

PFAD
/client/src/engine/worldLoader.ts

INHALT
```
export function loadWorldChunk(chunkX: number, chunkY: number) {
  return {
    chunkX,
    chunkY,
    status: "requested"
  };
}
```

---

DATEI
playerController.ts

PFAD
/client/src/gameplay/playerController.ts

INHALT
```
export class PlayerController {
  move(direction: string) {
    return {
      type: "move",
      direction
    };
  }
}
```

---

DATEI
main.ts

PFAD
/client/src/main.ts

INHALT
```
import { initRenderer } from "./engine/renderer";
import { connectSocket } from "./networking/websocketClient";
import { renderHUD } from "./ui/hud";

const canvas = document.createElement("canvas");
document.body.style.margin = "0";
document.body.appendChild(canvas);

initRenderer(canvas);
connectSocket();
renderHUD();
```

---

DATEI
websocketClient.ts

PFAD
/client/src/networking/websocketClient.ts

INHALT
```
export function connectSocket() {
  const ws = new WebSocket(`ws://${location.hostname}:3000`);

  ws.onopen = () => console.log("Connected to Arelorian server");
  ws.onmessage = (msg) => console.log("Server:", msg.data);

  return ws;
}
```

---

DATEI
chat.ts

PFAD
/client/src/ui/chat.ts

INHALT
```
export function renderChat() {
  const el = document.createElement("div");
  el.textContent = "Chat placeholder";
  el.style.position = "fixed";
  el.style.left = "12px";
  el.style.bottom = "12px";
  el.style.padding = "8px 12px";
  el.style.background = "rgba(0,0,0,0.55)";
  el.style.color = "#fff";
  document.body.appendChild(el);
}
```

---

DATEI
hud.ts

PFAD
/client/src/ui/hud.ts

INHALT
```
export function renderHUD() {
  const hud = document.createElement("div");
  hud.textContent = "Arelorian HUD online";
  hud.style.position = "fixed";
  hud.style.top = "12px";
  hud.style.left = "12px";
  hud.style.padding = "8px 12px";
  hud.style.background = "rgba(0,0,0,0.55)";
  hud.style.color = "#fff";
  hud.style.fontFamily = "sans-serif";
  document.body.appendChild(hud);
}
```

---

DATEI
inventory.ts

PFAD
/client/src/ui/inventory.ts

INHALT
```
export function renderInventory() {
  const el = document.createElement("div");
  el.textContent = "Inventory placeholder";
  el.style.position = "fixed";
  el.style.right = "12px";
  el.style.top = "12px";
  el.style.padding = "8px 12px";
  el.style.background = "rgba(0,0,0,0.55)";
  el.style.color = "#fff";
  document.body.appendChild(el);
}
```

---

DATEI
tsconfig.json

PFAD
/client/tsconfig.json

INHALT
```
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true
  },
  "include": [
    "src/**/*"
  ]
}
```

---

DATEI
ASSET_PIPELINE.md

PFAD
/docs/ASSET_PIPELINE.md

INHALT
```
# Asset Pipeline

## GLB-Regeln
Terrain ist kein GLB-Bodenteppich. GLB wird für NPCs, Monster, Gebäude, Bäume, Props und Reittiere verwendet.

## Struktur
- characters/
- monsters/
- buildings/
- props/
- vegetation/
- admin/

## Validierung
Jedes Asset sollte idealerweise besitzen:
- sauberen Ursprungspunkt
- sinnvolle Skalierung
- optionales Rig/Skeleton
- optional Animationen
```

---

DATEI
BRAIN_SYSTEM.md

PFAD
/docs/BRAIN_SYSTEM.md

INHALT
```
# Brain System

Das Server Brain ist eine heuristische Meta-Schicht.

## Aufgaben
- Spannungen erkennen
- Politiksignale lesen
- Marktanomalien erkennen
- Orakelvisionen speisen
- Ereignisse anstoßen

## 13-Punkte-Modell
- 4 Weltpunkte
- 4 Interpretationspunkte
- 4 Dynamikpunkte
- 1 Zentrum

Das Zentrum aggregiert Weltzustand, NPC-Memory, Ökonomie, Politik und Geschichte.
```

---

DATEI
BUILD_SEQUENCE_MASTER.md

PFAD
/docs/BUILD_SEQUENCE_MASTER.md

INHALT
```
# Build Sequence Master

1. Server core und bootstrap
2. World tick
3. Chunk- und Observer-System
4. Persistence
5. NPC personality + memory + genealogy
6. Civilization + politics
7. Economy + Matrix energy
8. Player, skills, combat, loot
9. Dungeons, ruins, oracle, history
10. Brain + field analyzer
11. Asset registry + GLB loading
12. GM editor
13. Client renderer + websocket sync
14. Firebase/AWS integration
```

---

DATEI
DIALOGUE_SYSTEM.md

PFAD
/docs/DIALOGUE_SYSTEM.md

INHALT
```
# Dialogue System

The dialogue system combines:
- personality traits
- family and lineage
- culture
- religion
- memory
- world events
- oracle/world history signals

## Pipeline
1. build context
2. choose tone
3. choose dialogue pool
4. inject dynamic references
5. return line + optional quest/world hint
```

---

DATEI
DUNGEON_SYSTEM.md

PFAD
/docs/DUNGEON_SYSTEM.md

INHALT
```
# Dungeon System

Dungeons are generated from seeds, ruins and regional history.

## Room types
- hall
- shrine
- monster_lair
- collapsed_passage
- treasure_room
- prison
- relic_chamber

## Inputs
- biome
- ruin class
- ancient civilization markers
- oracle hints
- current danger rating
```

---

DATEI
ECONOMY_MODEL.md

PFAD
/docs/ECONOMY_MODEL.md

INHALT
```
# Economy Model

Die Wirtschaft verbindet Ressourcen, Spieler, NPCs, Märkte und Städte.

## Kernelemente
- Stadtmärkte
- Handelsrouten
- NPC-Händler
- Spielerhandel
- Matrix-Energie
- politische und kriegerische Markteinflüsse

## Preisfaktoren
- Angebot
- Nachfrage
- Krieg
- Knappheit
- Transport
- Stadtsteuern
```

---

DATEI
GM_EDITOR.md

PFAD
/docs/GM_EDITOR.md

INHALT
```
# GM Editor

Der GM-Editor erlaubt Live-Eingriffe in die Welt.

## Fähigkeiten
- Objekte setzen
- NPCs spawnen
- Strukturen verschieben
- Terrainmarker bearbeiten
- Events starten
- Weltzustände prüfen

## Regel
Der Editor ist serverautoritativ. Der Client darf nur Befehle senden.
```

---

DATEI
MASTER_DESIGN_BIBLE.md

PFAD
/docs/MASTER_DESIGN_BIBLE.md

INHALT
```
# Master Design Bible

## Vision
Arelorian ist ein persistentes Browser-MMORPG mit emergenter Weltlogik. Die Welt ist theoretisch unendlich,
wird prozedural erzeugt und über Beobachterzonen simuliert.

## Fünf Axiome
1. Informationsfeld
2. Emergenz
3. Persistenz
4. Ouroboros-Zyklus
5. Beobachter

## Welt
- Prozedurale Welt
- Chunks 64x64
- Biome als natürliche Grenzen
- Ruinen, Dungeons und historische Schichten

## Zivilisationen
- Guild -> Village -> City -> Kingdom -> Nation
- Spieler und NPCs besitzen dieselben zivilisatorischen Rechte

## NPCs
- Personality
- DNA/Traits
- Genealogie und Häuser
- Memory und Shared Memory
- Kultur und Religion
- Politik und Familiengeschichte

## Gameplay
- klassenloses Skill-System
- Skills durch Nutzung
- Stamina als Kernressource
- Diablo-artiges Loot
- Magie als Skillzweig
- Crafting, Handel und Weltwirtschaft

## Systeme
- Server Brain mit 13-Punkte-Modell
- Dudenregister und Orakel
- Matrix-Energie
- Weltwunder und Schattenregisterportal
- GM-Editor
- GLB-Asset-Pipeline
```

---

DATEI
MASTER_SYSTEM_CHECKLIST.md

PFAD
/docs/MASTER_SYSTEM_CHECKLIST.md

INHALT
```
# Master System Checklist

## Welt
- [x] World generator
- [x] 64x64 chunk system
- [x] Observer simulation
- [x] Biome and terrain
- [x] World tick
- [x] Dungeons
- [x] Ruins

## NPC
- [x] Personality engine
- [x] Memory engine
- [x] Shared memory
- [x] Genealogy
- [x] DNA and traits
- [x] Dialogue
- [x] Quests

## Gesellschaft
- [x] Civilization engine
- [x] NPC politics
- [x] Player politics
- [x] Governments
- [x] Taxes
- [x] War

## Gameplay
- [x] Players
- [x] Skills
- [x] Inventory
- [x] Combat
- [x] Loot
- [x] Magic

## Spezial
- [x] Matrix energy
- [x] Dudenregister
- [x] Oracle
- [x] Server brain
- [x] GLB pipeline
- [x] GM editor
```

---

DATEI
MONSTER_SYSTEM.md

PFAD
/docs/MONSTER_SYSTEM.md

INHALT
```
# Monster System

Monsters are generated from:
- species
- dna
- mutation
- biome
- pack memory
- rarity

This allows regional monster lines such as frost wolves, swamp alphas or cave mutants.
```

---

DATEI
NPC_SYSTEM.md

PFAD
/docs/NPC_SYSTEM.md

INHALT
```
# NPC System

## Fünf Einflussfaktoren
- DNA / Traits
- Familie / Genealogie
- Kultur / Herkunft
- Religion / Weltbild
- Erfahrung / Memory

## Memory-Ebenen
- Local memory
- Social memory
- Faction memory
- Historical memory
- Oracle memory

## Verhalten
NPCs können:
- arbeiten
- handeln
- Gerüchte verbreiten
- Familien gründen
- Politik betreiben
- Kriege beginnen oder vermeiden
```

---

DATEI
PERSISTENCE_MODEL.md

PFAD
/docs/PERSISTENCE_MODEL.md

INHALT
```
# Persistence Model

Persistent storage is split by concern:
- world chunks
- players
- civilizations
- history / dudenregister
- snapshots
- asset metadata
```

---

DATEI
STRUCTURE_SYSTEM.md

PFAD
/docs/STRUCTURE_SYSTEM.md

INHALT
```
# Structure System

Structures connect GLB assets to persistent world entities.

## Types
- player_structure
- npc_structure
- civilization_structure
- ruin_structure
- wonder_structure
- matrix_protected_structure

## Examples
- house
- gate
- wall
- watch tower
- workshop
- temple
- shadow register portal
```

---

DATEI
WORLD_GENERATION.md

PFAD
/docs/WORLD_GENERATION.md

INHALT
```
# World Generation

Die Welt wird aus `seed + coordinates` erzeugt.

## Chunkstruktur
Jeder Chunk enthält:
- Terrain
- Biomtyp
- Ressourcen
- Objektliste
- Strukturen
- Ruinen oder Dungeon-Eingänge

## Simulationsebenen
1. Dormant
2. Background simulation
3. Active simulation
4. Full simulation

Nur beobachtete Regionen werden hochauflösend simuliert.
```

---

DATEI
DO_NOT_SIMPLIFY.md

PFAD
/final-lock/DO_NOT_SIMPLIFY.md

INHALT
```
# Do Not Simplify

Nicht reduzieren auf:
- Demo
- UI-Mockup
- Singleplayer-Sandbox
- nur Terrain-Viewer
- nur Client ohne Weltsimulation
```

---

DATEI
FINAL_TRUTH.md

PFAD
/final-lock/FINAL_TRUTH.md

INHALT
```
# Final Truth

Dieses Projekt ist ein persistentes MMORPG und darf nicht auf ein Mockup oder eine Einzelspieler-Demo reduziert werden.

Pflicht:
- 64x64 chunks
- observer simulation
- server-authoritative logic
- NPC memory + genealogy
- player and NPC politics
- matrix energy
- 13-node brain
- GM editor
- GLB pipeline
```

---

DATEI
REQUIRED_SYSTEMS_MATRIX.md

PFAD
/final-lock/REQUIRED_SYSTEMS_MATRIX.md

INHALT
```
# Required Systems Matrix

## Welt
observer, chunks, terrain, biomes, tick, dungeons, ruins

## NPC
personality, memory, shared memory, genealogy, dna, dialogue

## Gesellschaft
civilization, politics, government, tax, war, diplomacy

## Gameplay
player, skills, inventory, combat, loot, magic

## Spezial
oracle, dudenregister, matrix energy, brain, gm editor, glb pipeline
```

---

DATEI
biome-definitions.json

PFAD
/game-data/biomes/biome-definitions.json

INHALT
```
{
  "forest": {
    "temperature": "mild",
    "resources": [
      "wood",
      "berries",
      "animals"
    ]
  },
  "desert": {
    "temperature": "hot",
    "resources": [
      "sand",
      "salt",
      "crystals"
    ]
  },
  "mountain": {
    "temperature": "cold",
    "resources": [
      "stone",
      "iron",
      "gold"
    ]
  }
}
```

---

DATEI
cultures.json

PFAD
/game-data/cultures/cultures.json

INHALT
```
{
  "forest_tribes": {
    "style": "organic"
  },
  "mountain_clans": {
    "style": "stone"
  },
  "desert_nomads": {
    "style": "lightweight"
  }
}
```

---

DATEI
matrix-energy-rules.json

PFAD
/game-data/economy/matrix-energy-rules.json

INHALT
```
{
  "currency": "matrix_energy",
  "npcCannotDestroyProtectedStructures": true
}
```

---

DATEI
dudenregister-schema.json

PFAD
/game-data/history/dudenregister-schema.json

INHALT
```
{
  "events": [
    "war",
    "collapse",
    "ruin",
    "wonder",
    "dynasty",
    "oracle"
  ]
}
```

---

DATEI
loot-tables.json

PFAD
/game-data/items/loot-tables.json

INHALT
```
{
  "wolf": [
    "wolf_pelt",
    "fang",
    "alpha_claw"
  ],
  "skeleton": [
    "bone_fragment",
    "rusted_blade",
    "grave_ring"
  ],
  "ruin_cache": [
    "ancient_coin",
    "relic_fragment",
    "forgotten_sigil"
  ]
}
```

---

DATEI
spell-schools.json

PFAD
/game-data/magic/spell-schools.json

INHALT
```
{
  "nature": [
    "root_bind",
    "healing_moss"
  ],
  "shadow": [
    "dark_bolt",
    "fear_whisper"
  ],
  "resonance": [
    "echo_wave",
    "field_tone"
  ],
  "protection": [
    "ward_shield",
    "holy_barrier"
  ],
  "ritual": [
    "ancestral_call",
    "portal_trace"
  ]
}
```

---

DATEI
npc-archetypes.json

PFAD
/game-data/npc/npc-archetypes.json

INHALT
```
{
  "merchant": {},
  "guard": {},
  "oracle": {},
  "gossip": {
    "example": "Uschi die Geschminkte"
  }
}
```

---

DATEI
government-types.json

PFAD
/game-data/politics/government-types.json

INHALT
```
{
  "monarchy": {},
  "council": {},
  "theocracy": {},
  "trade_republic": {},
  "warband": {}
}
```

---

DATEI
quest-registry.json

PFAD
/game-data/quests/quest-registry.json

INHALT
```
{
  "ruin_hunter": {
    "giver": "uschi_gossip",
    "objective": "find_ruins"
  },
  "watchtower_supply": {
    "giver": "city_guard",
    "objective": "deliver_supplies"
  }
}
```

---

DATEI
religions.json

PFAD
/game-data/religions/religions.json

INHALT
```
{
  "sun_order": {
    "ethos": "honor"
  },
  "shadow_cult": {
    "ethos": "secrecy"
  },
  "ancestor_faith": {
    "ethos": "lineage"
  }
}
```

---

DATEI
skills.json

PFAD
/game-data/skills/skills.json

INHALT
```
{
  "combat": {},
  "woodcutting": {},
  "mining": {},
  "smithing": {},
  "magic": {},
  "fishing": {}
}
```

---

DATEI
README_INTEGRATIONS.md

PFAD
/integrations/README_INTEGRATIONS.md

INHALT
```
# Integrations

Hier werden produktive Integrationen abgelegt:
- Firebase
- AWS
- WebSocket Gateway
- Datenbankadapter

Wichtig: Keine Secrets hart in Dateien schreiben.
```

---

DATEI
elasticacheAdapter.ts

PFAD
/integrations/aws/elasticacheAdapter.ts

INHALT
```
export function initElastiCache() {
  return {
    status: "elasticache-adapter-placeholder"
  };
}
```

---

DATEI
postgresAdapter.ts

PFAD
/integrations/aws/postgresAdapter.ts

INHALT
```
export function initPostgres() {
  return {
    status: "postgres-adapter-placeholder"
  };
}
```

---

DATEI
firebase-config.ts

PFAD
/integrations/firebase/firebase-config.ts

INHALT
```
export const firebaseConfig = {
  note: "Fill with real Firebase credentials during deployment"
};
```

---

DATEI
firestorePersistence.ts

PFAD
/integrations/firebase/firestorePersistence.ts

INHALT
```
export function initFirestorePersistence() {
  return {
    status: "firestore-persistence-placeholder"
  };
}
```

---

DATEI
awsGatewayBridge.ts

PFAD
/integrations/websocket-gateway/awsGatewayBridge.ts

INHALT
```
export function initAwsGatewayBridge() {
  return {
    status: "aws-websocket-gateway-placeholder"
  };
}
```

---

DATEI
package.json

PFAD
/server/package.json

INHALT
```
{
  "name": "areloria-server",
  "version": "0.2.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "@types/ws": "^8.5.12",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

---

DATEI
ServerBootstrap.ts

PFAD
/server/src/core/ServerBootstrap.ts

INHALT
```
import express from "express";
import { createServer } from "node:http";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { WorldTick } from "./WorldTick.js";

export class ServerBootstrap {
  start() {
    const app = express();
    const httpServer = createServer(app);

    app.get("/health", (_req, res) => {
      res.json({
        ok: true,
        project: "ARELORIAN MMORPG",
        version: "0.2.0"
      });
    });

    const ws = new GameWebSocketServer(httpServer);
    ws.start();

    const tick = new WorldTick();
    const port = Number(process.env.PORT || 3000);

    httpServer.listen(port, () => {
      console.log(`Arelorian server listening on ${port}`);
      tick.start();
    });
  }
}
```

---

DATEI
WorldTick.ts

PFAD
/server/src/core/WorldTick.ts

INHALT
```
export class WorldTick {
  private timer: NodeJS.Timeout | null = null;
  private tickCount = 0;

  start() {
    this.timer = setInterval(() => this.tick(), 100);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  tick() {
    this.tickCount += 1;
    if (this.tickCount % 10 === 0) {
      console.log("World Tick", this.tickCount);
    }
  }
}
```

---

DATEI
index.ts

PFAD
/server/src/index.ts

INHALT
```
import { ServerBootstrap } from "./core/ServerBootstrap.js";

new ServerBootstrap().start();
```

---

DATEI
BehaviorTree.ts

PFAD
/server/src/modules/ai/BehaviorTree.ts

INHALT
```
export class BehaviorTree {
  run(npc: any) {
    if (npc.needs?.sleep) return "sleep";
    if (npc.needs?.hunger) return "eat";
    if (npc.job) return "work";
    return "wander";
  }
}
```

---

DATEI
NPCBrain.ts

PFAD
/server/src/modules/ai/NPCBrain.ts

INHALT
```
import { BehaviorTree } from "./BehaviorTree.js";

export class NPCBrain {
  private tree = new BehaviorTree();

  update(npc: any) {
    const action = this.tree.run(npc);
    npc.currentAction = action;
    return action;
  }
}
```

---

DATEI
TaskSystem.ts

PFAD
/server/src/modules/ai/TaskSystem.ts

INHALT
```
export class TaskSystem {
  execute(npc: any, action: string) {
    switch (action) {
      case "wander":
        return { action, destination: "random_nearby" };
      case "work":
        return { action, destination: npc.jobLocation ?? "workplace" };
      case "eat":
        return { action, destination: "tavern" };
      case "sleep":
        return { action, destination: "home" };
      default:
        return { action: "idle" };
    }
  }
}
```

---

DATEI
AssetRegistry.ts

PFAD
/server/src/modules/asset-registry/AssetRegistry.ts

INHALT
```
export class AssetRegistry {
  private assets = new Map<string, any>();

  register(id: string, data: any) {
    this.assets.set(id, data);
  }

  get(id: string) {
    return this.assets.get(id) ?? null;
  }

  list() {
    return Array.from(this.assets.entries()).map(([id, data]) => ({ id, ...data }));
  }
}
```

---

DATEI
NPCAssets.ts

PFAD
/server/src/modules/asset-registry/NPCAssets.ts

INHALT
```
export const NPCAssets = {
  uschi_gossip: {
    assetId: "uschi_gossip",
    model: "/assets/models/characters/uschi_gossip.glb",
    category: "npc",
    animations: ["idle", "talk", "laugh", "cough"]
  },
  warrior_male: {
    assetId: "warrior_male",
    model: "/assets/models/characters/warrior_male.glb",
    category: "player_or_npc",
    animations: ["idle", "walk", "attack"]
  },
  warrior_female: {
    assetId: "warrior_female",
    model: "/assets/models/characters/warrior_female.glb",
    category: "player_or_npc",
    animations: ["idle", "walk", "attack"]
  }
};
```

---

DATEI
StructureAssets.ts

PFAD
/server/src/modules/asset-registry/StructureAssets.ts

INHALT
```
export const StructureAssets = {
  castle_wall: {
    assetId: "castle_wall",
    type: "structure",
    model: "/assets/models/buildings/castle_wall.glb",
    collision: true
  },
  castle_gate: {
    assetId: "castle_gate",
    type: "interactive_structure",
    model: "/assets/models/buildings/castle_gate.glb",
    collision: true,
    states: ["open", "closed", "locked", "damaged", "destroyed"]
  },
  castle_watch_tower: {
    assetId: "castle_watch_tower",
    type: "defense_structure",
    model: "/assets/models/buildings/castle_watch_tower.glb",
    collision: true
  }
};
```

---

DATEI
VegetationAssets.ts

PFAD
/server/src/modules/asset-registry/VegetationAssets.ts

INHALT
```
export const VegetationAssets = {
  tree_oak_young: { model: "/assets/models/vegetation/tree_oak_young.glb", category: "vegetation", growthStage: 0 },
  tree_oak_spring: { model: "/assets/models/vegetation/tree_oak_spring.glb", category: "vegetation", growthStage: 1 },
  tree_oak_summer: { model: "/assets/models/vegetation/tree_oak_summer.glb", category: "vegetation", growthStage: 2 },
  tree_oak_autumn: { model: "/assets/models/vegetation/tree_oak_autumn.glb", category: "vegetation", growthStage: 3 }
};
```

---

DATEI
BrainFieldAnalyzer.ts

PFAD
/server/src/modules/brain/BrainFieldAnalyzer.ts

INHALT
```
export class BrainFieldAnalyzer {
  analyzeField(values: unknown[]) {
    return {
      activeNodes: values.length,
      result: "field-analysis-placeholder"
    };
  }
}
```

---

DATEI
HeuristicWorldBrain.ts

PFAD
/server/src/modules/brain/HeuristicWorldBrain.ts

INHALT
```
export class HeuristicWorldBrain {
  private readonly nodes = new Array(13).fill(null);

  analyze(input: unknown) {
    return {
      nodes: this.nodes.length,
      summary: "analysis-placeholder",
      input
    };
  }
}
```

---

DATEI
CivilizationEngine.ts

PFAD
/server/src/modules/civilization/CivilizationEngine.ts

INHALT
```
export class CivilizationEngine {
  createVillage(guildMembers: number) {
    if (guildMembers < 50) return null;
    return {
      type: "village",
      population: guildMembers,
      createdAt: Date.now()
    };
  }
}
```

---

DATEI
SettlementSystem.ts

PFAD
/server/src/modules/civilization/SettlementSystem.ts

INHALT
```
export class SettlementSystem {
  createSettlement(type: "village" | "city" | "kingdom" | "nation", ownerId: string) {
    return {
      type,
      ownerId,
      createdAt: Date.now()
    };
  }
}
```

---

DATEI
CombatSystem.ts

PFAD
/server/src/modules/combat/CombatSystem.ts

INHALT
```
export class CombatSystem {
  attack(attacker: any, defender: any) {
    if (attacker.stamina <= 0) return { success: false, reason: "no_stamina" };

    attacker.stamina -= 10;

    const hitChance = this.hitChance(attacker, defender);
    if (Math.random() > hitChance) {
      return { success: true, hit: false, damage: 0 };
    }

    const damage = this.calculateDamage(attacker, defender);
    defender.health = Math.max(0, defender.health - damage);

    return {
      success: true,
      hit: true,
      damage,
      defenderHealth: defender.health
    };
  }

  hitChance(attacker: any, defender: any) {
    const atk = attacker.skills?.combat?.level ?? 1;
    const def = defender.skills?.combat?.level ?? 1;
    return Math.min(0.95, Math.max(0.1, atk / (atk + def)));
  }

  calculateDamage(attacker: any, defender: any) {
    const atk = attacker.skills?.combat?.level ?? 1;
    const def = defender.skills?.combat?.level ?? 1;
    const base = 5 + atk;
    const mitigation = Math.floor(def * 0.3);
    return Math.max(1, base - mitigation + Math.floor(Math.random() * 4));
  }
}
```

---

DATEI
DialogueContext.ts

PFAD
/server/src/modules/dialogue/DialogueContext.ts

INHALT
```
export function buildDialogueContext(npc: any, player: any, world: any) {
  return {
    npcId: npc.id,
    playerId: player?.id ?? null,
    traits: npc.traits ?? {},
    lineage: npc.lineage ?? null,
    culture: npc.culture ?? null,
    religion: npc.religion ?? null,
    memory: npc.memory ?? [],
    worldEvents: world?.events ?? [],
    oracleSignals: world?.oracleSignals ?? []
  };
}
```

---

DATEI
DialogueEngine.ts

PFAD
/server/src/modules/dialogue/DialogueEngine.ts

INHALT
```
import { buildDialogueContext } from "./DialogueContext.js";
import { DialogueGenerator } from "./DialogueGenerator.js";

export class DialogueEngine {
  private generator = new DialogueGenerator();

  talk(npc: any, player: any, world: any) {
    const context = buildDialogueContext(npc, player, world);
    return this.generator.generate(context);
  }
}
```

---

DATEI
DialogueGenerator.ts

PFAD
/server/src/modules/dialogue/DialogueGenerator.ts

INHALT
```
import { DialogueTemplates } from "./DialogueTemplates.js";

export class DialogueGenerator {
  generate(context: any) {
    const mood = context.traits?.aggression > 0.7 ? "warning" : "greeting";
    const pool = DialogueTemplates[mood] ?? ["..."];
    return {
      line: pool[Math.floor(Math.random() * pool.length)],
      contextSummary: {
        culture: context.culture,
        religion: context.religion
      }
    };
  }
}
```

---

DATEI
DialogueTemplates.ts

PFAD
/server/src/modules/dialogue/DialogueTemplates.ts

INHALT
```
export const DialogueTemplates = {
  greeting: [
    "Na Süßer, suchst du Abenteuer?",
    "Du siehst aus, als hättest du Ärger im Gepäck.",
    "Setz dich, ich erzähl dir was Interessantes."
  ],
  rumor: [
    "Im Nordwald wurden alte Mauern gesehen.",
    "Die Händler reden von seltsamen Kreaturen im Moor.",
    "Ein Königreich im Osten ist nervös."
  ],
  warning: [
    "Geh da nicht unvorbereitet hinein.",
    "Manche Wege fressen ganze Blutlinien.",
    "Nicht jede Ruine will entdeckt werden."
  ]
};
```

---

DATEI
DungeonGenerator.ts

PFAD
/server/src/modules/dungeon/DungeonGenerator.ts

INHALT
```
export class DungeonGenerator {
  generate(seed: number) {
    const rooms = [];
    const roomCount = 4 + Math.floor(Math.abs(Math.sin(seed)) * 6);
    for (let i = 0; i < roomCount; i++) {
      rooms.push({
        id: i,
        type: this.randomRoom(seed + i),
        danger: 1 + (i % 5)
      });
    }
    return { seed, rooms };
  }

  randomRoom(seed: number) {
    const types = [
      "hall",
      "treasure_room",
      "monster_lair",
      "collapsed_passage",
      "ancient_shrine"
    ];
    return types[Math.abs(Math.floor(seed)) % types.length];
  }
}
```

---

DATEI
EconomyEngine.ts

PFAD
/server/src/modules/economy/EconomyEngine.ts

INHALT
```
export class EconomyEngine {
  private markets = new Map<string, { goods: Record<string, number> }>();

  registerMarket(id: string) {
    this.markets.set(id, { goods: {} });
  }

  trade(marketId: string, item: string, amount: number) {
    const market = this.markets.get(marketId);
    if (!market) return null;
    if (!market.goods[item]) market.goods[item] = 0;
    market.goods[item] += amount;
    return market.goods[item];
  }
}
```

---

DATEI
MatrixEnergySystem.ts

PFAD
/server/src/modules/economy/MatrixEnergySystem.ts

INHALT
```
export class MatrixEnergySystem {
  private balances = new Map<string, number>();

  add(playerId: string, amount: number) {
    const current = this.balances.get(playerId) || 0;
    this.balances.set(playerId, current + amount);
  }

  consume(playerId: string, amount: number) {
    const current = this.balances.get(playerId) || 0;
    if (current < amount) return false;
    this.balances.set(playerId, current - amount);
    return true;
  }

  getBalance(playerId: string) {
    return this.balances.get(playerId) || 0;
  }
}
```

---

DATEI
TradeRoutes.ts

PFAD
/server/src/modules/economy/TradeRoutes.ts

INHALT
```
export class TradeRoutes {
  createRoute(a: string, b: string) {
    return {
      from: a,
      to: b,
      active: true
    };
  }
}
```

---

DATEI
DudenregisterHistory.ts

PFAD
/server/src/modules/history/DudenregisterHistory.ts

INHALT
```
export class DudenregisterHistory {
  private history: any[] = [];

  record(event: any) {
    this.history.push(event);
  }

  getHistory() {
    return this.history;
  }
}
```

---

DATEI
WorldSnapshotSystem.ts

PFAD
/server/src/modules/history/WorldSnapshotSystem.ts

INHALT
```
export class WorldSnapshotSystem {
  private snapshots: any[] = [];

  save(worldState: any) {
    this.snapshots.push({
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(worldState))
    });
  }

  latest() {
    return this.snapshots[this.snapshots.length - 1] ?? null;
  }
}
```

---

DATEI
InventorySystem.ts

PFAD
/server/src/modules/inventory/InventorySystem.ts

INHALT
```
export class InventorySystem {
  addItem(player: any, item: any) {
    player.inventory.push(item);
    return player.inventory;
  }

  removeItem(player: any, itemId: string) {
    player.inventory = player.inventory.filter((item: any) => item.id !== itemId);
    return player.inventory;
  }
}
```

---

DATEI
LootTables.ts

PFAD
/server/src/modules/loot/LootTables.ts

INHALT
```
export const LootTables = {
  wolf: [
    { id: "wolf_pelt", chance: 0.65, rarity: "common" },
    { id: "fang", chance: 0.3, rarity: "common" },
    { id: "alpha_claw", chance: 0.05, rarity: "rare" }
  ],
  skeleton: [
    { id: "bone_fragment", chance: 0.7, rarity: "common" },
    { id: "rusted_blade", chance: 0.2, rarity: "uncommon" },
    { id: "grave_ring", chance: 0.03, rarity: "rare" }
  ],
  ruin_cache: [
    { id: "ancient_coin", chance: 0.5, rarity: "uncommon" },
    { id: "relic_fragment", chance: 0.2, rarity: "rare" },
    { id: "forgotten_sigil", chance: 0.02, rarity: "legendary" }
  ]
};
```

---

DATEI
MagicSystem.ts

PFAD
/server/src/modules/magic/MagicSystem.ts

INHALT
```
export class MagicSystem {
  cast(caster: any, spell: any, target: any) {
    if ((caster.mana ?? 0) < spell.cost) {
      return { success: false, reason: "not_enough_mana" };
    }

    caster.mana -= spell.cost;

    return {
      success: true,
      spell: spell.id,
      target: target?.id ?? null,
      effect: spell.effect ?? "generic_magic_effect"
    };
  }
}
```

---

DATEI
MonsterDNA.ts

PFAD
/server/src/modules/monster/MonsterDNA.ts

INHALT
```
export function generateMonsterDNA(species: string) {
  return {
    species,
    strength: Math.random(),
    speed: Math.random(),
    aggression: Math.random(),
    intelligence: Math.random(),
    resilience: Math.random()
  };
}
```

---

DATEI
MonsterMutation.ts

PFAD
/server/src/modules/monster/MonsterMutation.ts

INHALT
```
export function mutateMonster(dna: any, biome: string) {
  const clone = { ...dna, mutations: [] as string[] };

  if (biome === "snow") {
    clone.resilience += 0.2;
    clone.mutations.push("frost_resistance");
  }

  if (biome === "swamp") {
    clone.aggression += 0.15;
    clone.mutations.push("swamp_hunger");
  }

  if (Math.random() < 0.08) {
    clone.mutations.push("rare_variant");
  }

  return clone;
}
```

---

DATEI
MonsterSpawner.ts

PFAD
/server/src/modules/monster/MonsterSpawner.ts

INHALT
```
import { generateMonsterDNA } from "./MonsterDNA.js";
import { mutateMonster } from "./MonsterMutation.js";

export class MonsterSpawner {
  spawn(species: string, biome: string) {
    const dna = generateMonsterDNA(species);
    return mutateMonster(dna, biome);
  }
}
```

---

DATEI
NPCDialogueSystem.ts

PFAD
/server/src/modules/npc/NPCDialogueSystem.ts

INHALT
```
export class NPCDialogueSystem {
  talk(npc: any, worldSignals: any = {}) {
    const lines = npc.dialogueLines || [
      "Die Welt flüstert merkwürdige Dinge.",
      "Ich habe da ein Gerücht gehört."
    ];

    return {
      line: lines[Math.floor(Math.random() * lines.length)],
      signals: worldSignals
    };
  }
}
```

---

DATEI
NPCGenealogyEngine.ts

PFAD
/server/src/modules/npc/NPCGenealogyEngine.ts

INHALT
```
export class NPCGenealogyEngine {
  createLineage(id: string, house: string, parents: string[] = []) {
    return {
      id,
      house,
      parents,
      children: [] as string[]
    };
  }

  addChild(lineage: any, childId: string) {
    lineage.children.push(childId);
    return lineage;
  }
}
```

---

DATEI
NPCMemoryEngine.ts

PFAD
/server/src/modules/npc/NPCMemoryEngine.ts

INHALT
```
export class NPCMemoryEngine {
  private memory = new Map<string, any[]>();

  remember(npcId: string, event: any) {
    if (!this.memory.has(npcId)) this.memory.set(npcId, []);
    this.memory.get(npcId)!.push({
      timestamp: Date.now(),
      event
    });
  }

  recall(npcId: string) {
    return this.memory.get(npcId) || [];
  }
}
```

---

DATEI
NPCPersonalityEngine.ts

PFAD
/server/src/modules/npc/NPCPersonalityEngine.ts

INHALT
```
export class NPCPersonalityEngine {
  generateTraits() {
    return {
      courage: Math.random(),
      curiosity: Math.random(),
      greed: Math.random(),
      faith: Math.random(),
      aggression: Math.random()
    };
  }
}
```

---

DATEI
ObserverEngine.ts

PFAD
/server/src/modules/observer/ObserverEngine.ts

INHALT
```
export class ObserverEngine {
  private observers = new Map<string, { x: number; y: number }>();

  register(playerId: string, position: { x: number; y: number }) {
    this.observers.set(playerId, position);
  }

  unregister(playerId: string) {
    this.observers.delete(playerId);
  }

  getObservedChunks() {
    const result = [] as { chunkX: number; chunkY: number }[];
    for (const [, pos] of this.observers) {
      result.push({
        chunkX: Math.floor(pos.x / 64),
        chunkY: Math.floor(pos.y / 64)
      });
    }
    return result;
  }
}
```

---

DATEI
OracleEngine.ts

PFAD
/server/src/modules/oracle/OracleEngine.ts

INHALT
```
export class OracleEngine {
  generateVision() {
    const visions = [
      "Ich sehe Feuer im Norden.",
      "Unter alten Mauern liegt ein Geheimnis.",
      "Ein Königreich wird fallen."
    ];
    return visions[Math.floor(Math.random() * visions.length)];
  }
}
```

---

DATEI
CivilizationDatabase.ts

PFAD
/server/src/modules/persistence/CivilizationDatabase.ts

INHALT
```
export class CivilizationDatabase {
  private civilizations = new Map<string, any>();

  saveCivilization(civ: any) {
    this.civilizations.set(civ.id, civ);
  }

  loadCivilization(id: string) {
    return this.civilizations.get(id) ?? null;
  }
}
```

---

DATEI
PlayerDatabase.ts

PFAD
/server/src/modules/persistence/PlayerDatabase.ts

INHALT
```
export class PlayerDatabase {
  private players = new Map<string, any>();

  savePlayer(player: any) {
    this.players.set(player.id, player);
  }

  loadPlayer(id: string) {
    return this.players.get(id) ?? null;
  }
}
```

---

DATEI
WorldDatabase.ts

PFAD
/server/src/modules/persistence/WorldDatabase.ts

INHALT
```
export class WorldDatabase {
  private chunks = new Map<string, any>();

  saveChunk(chunk: any) {
    this.chunks.set(chunk.id, chunk);
  }

  loadChunk(id: string) {
    return this.chunks.get(id) ?? null;
  }
}
```

---

DATEI
PlayerSystem.ts

PFAD
/server/src/modules/player/PlayerSystem.ts

INHALT
```
export class PlayerSystem {
  createPlayer(id: string, name: string) {
    return {
      id,
      name,
      position: { x: 0, y: 0, z: 0 },
      health: 100,
      stamina: 100,
      mana: 25,
      skills: {},
      inventory: [],
      faction: null,
      civilization: null,
      matrixEnergy: 0
    };
  }
}
```

---

DATEI
GovernmentTypes.ts

PFAD
/server/src/modules/politics/GovernmentTypes.ts

INHALT
```
export const GovernmentTypes = {
  monarchy: { id: "monarchy", succession: "inheritance", stabilityBase: 0.7 },
  council: { id: "council", succession: "vote", stabilityBase: 0.6 },
  theocracy: { id: "theocracy", succession: "religious_selection", stabilityBase: 0.65 },
  trade_republic: { id: "trade_republic", succession: "merchant_vote", stabilityBase: 0.55 },
  warband: { id: "warband", succession: "strength", stabilityBase: 0.4 }
};
```

---

DATEI
WarEngine.ts

PFAD
/server/src/modules/politics/WarEngine.ts

INHALT
```
export class WarEngine {
  declareWar(attacker: any, defender: any) {
    return {
      type: "war_declared",
      attacker: attacker.id,
      defender: defender.id,
      timestamp: Date.now()
    };
  }
}
```

---

DATEI
QuestEngine.ts

PFAD
/server/src/modules/quest/QuestEngine.ts

INHALT
```
import { QuestRegistry } from "./QuestRegistry.js";

export class QuestEngine {
  private active = new Map<string, any[]>();

  startQuest(playerId: string, questId: keyof typeof QuestRegistry) {
    const quest = QuestRegistry[questId];
    if (!quest) return null;
    if (!this.active.has(playerId)) this.active.set(playerId, []);
    this.active.get(playerId)!.push({ ...quest, startedAt: Date.now(), completed: false });
    return quest;
  }

  listQuests(playerId: string) {
    return this.active.get(playerId) || [];
  }

  completeQuest(playerId: string, questId: string) {
    const quests = this.active.get(playerId) || [];
    const q = quests.find((x) => x.id === questId);
    if (!q) return null;
    q.completed = true;
    q.completedAt = Date.now();
    return q.reward;
  }
}
```

---

DATEI
QuestRegistry.ts

PFAD
/server/src/modules/quest/QuestRegistry.ts

INHALT
```
export const QuestRegistry = {
  ruin_hunter: {
    id: "ruin_hunter",
    name: "Die alten Mauern",
    giver: "uschi_gossip",
    objective: "find_ruins",
    reward: { gold: 100, item: "ancient_relic" }
  },
  watchtower_supply: {
    id: "watchtower_supply",
    name: "Die hungernden Wächter",
    giver: "city_guard",
    objective: "deliver_supplies",
    reward: { xp: 50, item: "guard_token" }
  }
};
```

---

DATEI
ReligionSystem.ts

PFAD
/server/src/modules/religion/ReligionSystem.ts

INHALT
```
export class ReligionSystem {
  private religions = new Map<string, any>();

  registerReligion(id: string, data: any) {
    this.religions.set(id, data);
  }

  getReligion(id: string) {
    return this.religions.get(id);
  }
}
```

---

DATEI
SkillSystem.ts

PFAD
/server/src/modules/skill/SkillSystem.ts

INHALT
```
export class SkillSystem {
  ensureSkill(player: any, skillName: string) {
    if (!player.skills[skillName]) {
      player.skills[skillName] = { level: 1, xp: 0 };
    }
  }

  addXP(player: any, skillName: string, amount: number) {
    this.ensureSkill(player, skillName);
    const skill = player.skills[skillName];
    skill.xp += amount;
    while (skill.xp >= this.nextLevelXP(skill.level)) {
      skill.level += 1;
    }
    return skill;
  }

  nextLevelXP(level: number) {
    return Math.floor(50 * Math.pow(level, 1.4));
  }
}
```

---

DATEI
GateController.ts

PFAD
/server/src/modules/structure/GateController.ts

INHALT
```
export class GateController {
  setState(gate: any, state: string) {
    const allowed = ["open", "closed", "locked", "damaged", "destroyed"];
    if (!allowed.includes(state)) throw new Error("Invalid gate state");
    gate.state = state;
    return gate;
  }

  canOpen(actor: any, gate: any) {
    if (gate.state === "destroyed") return false;
    if (gate.state === "locked" && !actor.permissions?.includes("gate_access")) return false;
    return true;
  }
}
```

---

DATEI
StructureEngine.ts

PFAD
/server/src/modules/structure/StructureEngine.ts

INHALT
```
export class StructureEngine {
  private structures = new Map<string, any>();

  createStructure(structure: any) {
    this.structures.set(structure.structureId, structure);
    return structure;
  }

  getStructure(id: string) {
    return this.structures.get(id) ?? null;
  }

  damageStructure(id: string, amount: number) {
    const structure = this.structures.get(id);
    if (!structure) return null;
    structure.hitpoints = Math.max(0, structure.hitpoints - amount);
    if (structure.hitpoints === 0) structure.destroyed = true;
    return structure;
  }
}
```

---

DATEI
BiomeGenerator.ts

PFAD
/server/src/modules/world/BiomeGenerator.ts

INHALT
```
export class BiomeGenerator {
  getBiome(_x: number, _y: number, height: number) {
    if (height > 0.7) return "mountain";
    if (height > 0.45) return "forest";
    if (height > 0.2) return "grassland";
    return "desert";
  }
}
```

---

DATEI
ChunkSystem.ts

PFAD
/server/src/modules/world/ChunkSystem.ts

INHALT
```
export class ChunkSystem {
  constructor(public readonly size: number = 64) {}

  getChunk(x: number, y: number) {
    return {
      id: `${x}:${y}`,
      x,
      y,
      size: this.size
    };
  }
}
```

---

DATEI
TerrainGenerator.ts

PFAD
/server/src/modules/world/TerrainGenerator.ts

INHALT
```
export class TerrainGenerator {
  getHeight(x: number, y: number) {
    return Math.sin(x * 0.1) + Math.cos(y * 0.1);
  }
}
```

---

DATEI
WorldEditorServer.ts

PFAD
/server/src/modules/world-editor/WorldEditorServer.ts

INHALT
```
export class WorldEditorServer {
  spawnEntity(type: string, position: { x: number; y: number; z: number }) {
    return { action: "spawn", type, position };
  }

  moveEntity(entityId: string, position: { x: number; y: number; z: number }) {
    return { action: "move", entityId, position };
  }

  deleteEntity(entityId: string) {
    return { action: "delete", entityId };
  }
}
```

---

DATEI
PacketRouter.ts

PFAD
/server/src/networking/PacketRouter.ts

INHALT
```
export class PacketRouter {
  route(packet: any) {
    return {
      handled: true,
      type: packet?.type ?? "unknown"
    };
  }
}
```

---

DATEI
PlayerSession.ts

PFAD
/server/src/networking/PlayerSession.ts

INHALT
```
export type PlayerSession = {
  id: string;
  name: string;
  connectedAt: number;
  position: { x: number; y: number; z: number };
};
```

---

DATEI
WebSocketServer.ts

PFAD
/server/src/networking/WebSocketServer.ts

INHALT
```
import type { Server as HttpServer } from "node:http";
import { WebSocketServer } from "ws";

export class GameWebSocketServer {
  private wss: WebSocketServer | null = null;

  constructor(private readonly httpServer: HttpServer) {}

  start() {
    this.wss = new WebSocketServer({ server: this.httpServer });

    this.wss.on("connection", (socket) => {
      socket.send(JSON.stringify({
        type: "welcome",
        message: "Arelorian connection established"
      }));

      socket.on("message", (msg) => {
        console.log("WS message:", msg.toString());
      });
    });
  }
}
```

---

DATEI
tsconfig.json

PFAD
/server/tsconfig.json

INHALT
```
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": [
    "src/**/*"
  ]
}
```

---

DATEI
README_ASSETS.md

PFAD
/world-assets/README_ASSETS.md

INHALT
```
# World Assets

Lege hier GLB-Assets ab:
- characters/
- monsters/
- buildings/
- props/
- vegetation/
- admin/

Beispiele:
- uschi_gossip.glb
- warrior_male.glb
- warrior_female.glb
- castle_gate.glb
- castle_watch_tower.glb
- tree_oak_spring.glb
- gm_giraffe.glb
```
```

---

DATEI
areloria_reconstruction_pack_working.md

PFAD
/areloria_reconstruction_pack_working.md

INHALT
```
# ARELORIA RECONSTRUCTION PACK WORKING

Dieses Dokument ist für No-Code/Agent-Rekonstruktion gedacht.
Jede Datei ist mit DATEI, PFAD und INHALT angegeben.

---

DATEI
CHECKED_CONTENT_REPORT.md

PFAD
/CHECKED_CONTENT_REPORT.md

INHALT
```
# Checked Content Report

Dieses Paket wurde **neu** aufgebaut, damit es nicht wieder nur aus fast leeren Ordnern besteht.

## Enthalten
- Root-Dateien
- 9 Hauptdokumente
- 3 final-lock-Dateien
- 3 agent-Dateien
- Server core + networking
- 21 Server-Moduldateien
- Client package + renderer + websocket + HUD
- Game-data-Dateien
- Integrationsplatzhalter
- Admin-/Asset-Readmes

## Dateianzahl
79
```

---

DATEI
MASTER_INDEX.md

PFAD
/MASTER_INDEX.md

INHALT
```
# Master Index

## Root
- README_START_HERE.md
- PROJECT_LOCK_RULES.md
- MASTER_INDEX.md

## Core Docs
- docs/MASTER_DESIGN_BIBLE.md
- docs/MASTER_SYSTEM_CHECKLIST.md
- docs/BUILD_SEQUENCE_MASTER.md
- docs/WORLD_GENERATION.md
- docs/NPC_SYSTEM.md
- docs/ECONOMY_MODEL.md
- docs/BRAIN_SYSTEM.md
- docs/ASSET_PIPELINE.md
- docs/GM_EDITOR.md

## Final Lock
- final-lock/FINAL_TRUTH.md
- final-lock/DO_NOT_SIMPLIFY.md
- final-lock/REQUIRED_SYSTEMS_MATRIX.md

## Agent
- agent/AGENT_BUILD_INSTRUCTIONS.md
- agent/ARELORIAN_SUPER_PROMPT.md
- agent/AI_AGENT_FAILSAFE_RULES.md

## Code
- server/
- client/

## Data
- game-data/
- world-assets/

## Ops
- integrations/
- admin-tools/
```

---

DATEI
PACK_BUILD_STATUS.md

PFAD
/PACK_BUILD_STATUS.md

INHALT
```
# Pack Build Status

Aktueller Arbeitsstand im Sammelmodus.

## Neues Ausbaupaket ergänzt
- CraftingSystem
- RecipeRegistry
- TreeGrowthSystem
- FarmingSystem
- ItemGenerator
- AffixSystem
- GMCommandLayer
- MarketExpansion
- WorldEventLayer
- NPCSchedules
- AdminMountRegistry
- GiraffeAdminMount
- zusätzliche Doku
- zusätzliche Game-Data
- zusätzliche Client-UI-Dateien

## Aktuelle Dateianzahl
147
```

---

DATEI
PROJECT_LOCK_RULES.md

PFAD
/PROJECT_LOCK_RULES.md

INHALT
```
# Project Lock Rules

Diese Regeln dürfen nicht gebrochen werden.

1. Kein Umbau zu einer simplen Demo-App.
2. Chunkgröße bleibt 64x64.
3. Observer-Axiom bleibt Pflicht.
4. Server bleibt autoritativ.
5. NPC-Personality, NPC-Memory und Genealogie bleiben Pflichtsysteme.
6. Spieler- und NPC-Politik bleiben Pflichtsysteme.
7. Matrix-Energie bleibt Infrastrukturwährung.
8. Server-Brain mit 13 Punkten bleibt Pflicht.
9. GM-World-Editor bleibt Pflicht.
10. GLB-Asset-Pipeline bleibt Pflicht.
```

---

DATEI
README_START_HERE.md

PFAD
/README_START_HERE.md

INHALT
```
# Arelorian Master Project

Dieses Paket ist ein **voller Entwicklungs-Scaffold** für das Arelorian/Ouroboros Browser-MMORPG.
Es ist **kein leeres Ordnerpaket** und **keine Demo-App**, sondern eine strukturierte Grundlage mit:
- Architektur- und Regeldokumenten
- Server-Modulen als TypeScript-Skeletons
- Client-Grundgerüst mit Three.js
- Game-Data-Dateien
- Integrationsplatzhaltern für Firebase/AWS
- Admin-/GM-Editor-Grunddateien
- Asset-Import-Hinweisen für GLB-Dateien

## Sofort lesen
1. `PROJECT_LOCK_RULES.md`
2. `final-lock/FINAL_TRUTH.md`
3. `docs/MASTER_DESIGN_BIBLE.md`
4. `docs/BUILD_SEQUENCE_MASTER.md`
5. `agent/AGENT_BUILD_INSTRUCTIONS.md`

## Projektstatus
Dieses Paket liefert ein **ausgebautes Fundament**. Es ist nicht das komplett fertige MMO,
aber es ist eine **brauchbare, nicht-leere Arbeitsbasis**, die weiter implementiert werden kann.
```

---

DATEI
README_ADMIN.md

PFAD
/admin-tools/README_ADMIN.md

INHALT
```
# Admin Tools

Hier liegen GM- und World-Editor-Hinweise.

## Geplant
- WorldEditor.ts
- TerrainBrush.ts
- ObjectPlacement.ts
- GMControlPanel.ts
- LiveWorldControl.ts

Das Mount `gm_giraffe` kann später den Admin-Modus markieren.
```

---

DATEI
AGENT_BUILD_INSTRUCTIONS.md

PFAD
/agent/AGENT_BUILD_INSTRUCTIONS.md

INHALT
```
# Agent Build Instructions

1. Lies zuerst alle Lock-Dateien.
2. Verändere keine Kernregeln.
3. Baue in der vorgegebenen Reihenfolge.
4. Halte Serverlogik serverseitig.
5. Nutze das Clientgerüst nur für Darstellung.

## Wichtige Reihenfolge
server core -> world -> observer -> npc -> civilization -> economy -> gameplay -> brain -> assets -> gm editor -> client -> integrations
```

---

DATEI
AI_AGENT_FAILSAFE_RULES.md

PFAD
/agent/AI_AGENT_FAILSAFE_RULES.md

INHALT
```
# AI Agent Failsafe Rules

- Do not remove observer simulation
- Do not remove chunk size 64x64
- Do not remove NPC memory/genealogy
- Do not remove politics
- Do not remove matrix energy
- Do not remove brain
- Do not remove GM editor
- Do not remove GLB pipeline
```

---

DATEI
ARELORIAN_SUPER_PROMPT.md

PFAD
/agent/ARELORIAN_SUPER_PROMPT.md

INHALT
```
# Arelorian Super Prompt

Build a persistent browser MMORPG with:
- procedural world
- 64x64 chunks
- observer-driven simulation
- NPC personality, memory, genealogy, politics
- player civilization and NPC civilization
- matrix energy economy
- 13-node server brain
- GLB asset pipeline
- GM world editor

Do not simplify it into a prototype app.
```

---

DATEI
areloria_reconstruction_pack_fuller.md

PFAD
/areloria_reconstruction_pack_fuller.md

INHALT
```
# ARELORIA RECONSTRUCTION PACK FULLER

DATEI / PFAD / INHALT für Agent-Rekonstruktion

---

DATEI
CHECKED_CONTENT_REPORT.md

PFAD
/CHECKED_CONTENT_REPORT.md

INHALT
```
# Checked Content Report

Dieses Paket wurde **neu** aufgebaut, damit es nicht wieder nur aus fast leeren Ordnern besteht.

## Enthalten
- Root-Dateien
- 9 Hauptdokumente
- 3 final-lock-Dateien
- 3 agent-Dateien
- Server core + networking
- 21 Server-Moduldateien
- Client package + renderer + websocket + HUD
- Game-data-Dateien
- Integrationsplatzhalter
- Admin-/Asset-Readmes

## Dateianzahl
79
```

---

DATEI
MASTER_INDEX.md

PFAD
/MASTER_INDEX.md

INHALT
```
# Master Index

## Root
- README_START_HERE.md
- PROJECT_LOCK_RULES.md
- MASTER_INDEX.md

## Core Docs
- docs/MASTER_DESIGN_BIBLE.md
- docs/MASTER_SYSTEM_CHECKLIST.md
- docs/BUILD_SEQUENCE_MASTER.md
- docs/WORLD_GENERATION.md
- docs/NPC_SYSTEM.md
- docs/ECONOMY_MODEL.md
- docs/BRAIN_SYSTEM.md
- docs/ASSET_PIPELINE.md
- docs/GM_EDITOR.md

## Final Lock
- final-lock/FINAL_TRUTH.md
- final-lock/DO_NOT_SIMPLIFY.md
- final-lock/REQUIRED_SYSTEMS_MATRIX.md

## Agent
- agent/AGENT_BUILD_INSTRUCTIONS.md
- agent/ARELORIAN_SUPER_PROMPT.md
- agent/AI_AGENT_FAILSAFE_RULES.md

## Code
- server/
- client/

## Data
- game-data/
- world-assets/

## Ops
- integrations/
- admin-tools/
```

---

DATEI
PACK_BUILD_STATUS.md

PFAD
/PACK_BUILD_STATUS.md

INHALT
```
# Pack Build Status

## Bereits aufgebaut
- Root rules/docs
- Final lock files
- Agent files
- Server core
- Networking
- World + observer
- NPC systems
- Dialogue + quest
- Dungeon + monster
- Structure + gate + asset registry
- AI behavior
- Persistence
- Client core + renderer + websocket + HUD + editor UI
- Game data basics
- Integrations placeholders

## Nächste vertiefbare Blöcke
- vollständiger GM command layer
- richer item generator + affix logic
- crafting system
- farming / tree growth logic
- city market simulation expansion
- real auth / persistence adapters
```

---

DATEI
PROJECT_LOCK_RULES.md

PFAD
/PROJECT_LOCK_RULES.md

INHALT
```
# Project Lock Rules

Diese Regeln dürfen nicht gebrochen werden.

1. Kein Umbau zu einer simplen Demo-App.
2. Chunkgröße bleibt 64x64.
3. Observer-Axiom bleibt Pflicht.
4. Server bleibt autoritativ.
5. NPC-Personality, NPC-Memory und Genealogie bleiben Pflichtsysteme.
6. Spieler- und NPC-Politik bleiben Pflichtsysteme.
7. Matrix-Energie bleibt Infrastrukturwährung.
8. Server-Brain mit 13 Punkten bleibt Pflicht.
9. GM-World-Editor bleibt Pflicht.
10. GLB-Asset-Pipeline bleibt Pflicht.
```

---

DATEI
README_START_HERE.md

PFAD
/README_START_HERE.md

INHALT
```
# Arelorian Master Project

Dieses Paket ist ein **voller Entwicklungs-Scaffold** für das Arelorian/Ouroboros Browser-MMORPG.
Es ist **kein leeres Ordnerpaket** und **keine Demo-App**, sondern eine strukturierte Grundlage mit:
- Architektur- und Regeldokumenten
- Server-Modulen als TypeScript-Skeletons
- Client-Grundgerüst mit Three.js
- Game-Data-Dateien
- Integrationsplatzhaltern für Firebase/AWS
- Admin-/GM-Editor-Grunddateien
- Asset-Import-Hinweisen für GLB-Dateien

## Sofort lesen
1. `PROJECT_LOCK_RULES.md`
2. `final-lock/FINAL_TRUTH.md`
3. `docs/MASTER_DESIGN_BIBLE.md`
4. `docs/BUILD_SEQUENCE_MASTER.md`
5. `agent/AGENT_BUILD_INSTRUCTIONS.md`

## Projektstatus
Dieses Paket liefert ein **ausgebautes Fundament**. Es ist nicht das komplett fertige MMO,
aber es ist eine **brauchbare, nicht-leere Arbeitsbasis**, die weiter implementiert werden kann.
```

---

DATEI
README_ADMIN.md

PFAD
/admin-tools/README_ADMIN.md

INHALT
```
# Admin Tools

Hier liegen GM- und World-Editor-Hinweise.

## Geplant
- WorldEditor.ts
- TerrainBrush.ts
- ObjectPlacement.ts
- GMControlPanel.ts
- LiveWorldControl.ts

Das Mount `gm_giraffe` kann später den Admin-Modus markieren.
```

---

DATEI
AGENT_BUILD_INSTRUCTIONS.md

PFAD
/agent/AGENT_BUILD_INSTRUCTIONS.md

INHALT
```
# Agent Build Instructions

1. Lies zuerst alle Lock-Dateien.
2. Verändere keine Kernregeln.
3. Baue in der vorgegebenen Reihenfolge.
4. Halte Serverlogik serverseitig.
5. Nutze das Clientgerüst nur für Darstellung.

## Wichtige Reihenfolge
server core -> world -> observer -> npc -> civilization -> economy -> gameplay -> brain -> assets -> gm editor -> client -> integrations
```

---

DATEI
AI_AGENT_FAILSAFE_RULES.md

PFAD
/agent/AI_AGENT_FAILSAFE_RULES.md

INHALT
```
# AI Agent Failsafe Rules

- Do not remove observer simulation
- Do not remove chunk size 64x64
- Do not remove NPC memory/genealogy
- Do not remove politics
- Do not remove matrix energy
- Do not remove brain
- Do not remove GM editor
- Do not remove GLB pipeline
```

---

DATEI
ARELORIAN_SUPER_PROMPT.md

PFAD
/agent/ARELORIAN_SUPER_PROMPT.md

INHALT
```
# Arelorian Super Prompt

Build a persistent browser MMORPG with:
- procedural world
- 64x64 chunks
- observer-driven simulation
- NPC personality, memory, genealogy, politics
- player civilization and NPC civilization
- matrix energy economy
- 13-node server brain
- GLB asset pipeline
- GM world editor

Do not simplify it into a prototype app.
```

---

DATEI
package.json

PFAD
/client/package.json

INHALT
```
{
  "name": "areloria-client",
  "version": "0.2.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "three": "^0.169.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^5.4.0"
  }
}
```

---

DATEI
index.html

PFAD
/client/public/index.html

INHALT
```
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
    <title>Arelorian Client</title>
  </head>
  <body>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

---

DATEI
AssetLoader.ts

PFAD
/client/src/assets/AssetLoader.ts

INHALT
```
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class AssetLoader {
  private loader = new GLTFLoader();

  load(path: string) {
    return new Promise((resolve, reject) => {
      this.loader.load(path, (gltf) => resolve(gltf.scene), undefined, reject);
    });
  }
}
```

---

DATEI
ModelRegistry.ts

PFAD
/client/src/assets/ModelRegistry.ts

INHALT
```
export const ModelRegistry = {
  uschi: { path: "/assets/models/characters/uschi_gossip.glb", scale: 1 },
  castle_wall: { path: "/assets/models/buildings/castle_wall.glb", scale: 1 },
  watch_tower: { path: "/assets/models/buildings/castle_watch_tower.glb", scale: 1 },
  tree_spring: { path: "/assets/models/vegetation/tree_oak_spring.glb", scale: 1 },
  gm_giraffe: { path: "/assets/models/admin/gm_giraffe.glb", scale: 1 }
};
```

---

DATEI
PlacementTool.ts

PFAD
/client/src/editor/PlacementTool.ts

INHALT
```
export class PlacementTool {
  place(type: string, position: { x: number; y: number; z: number }) {
    return { action: "place", type, position };
  }
}
```

---

DATEI
SelectionTool.ts

PFAD
/client/src/editor/SelectionTool.ts

INHALT
```
export class SelectionTool {
  select(entityId: string) {
    return { selected: entityId };
  }
}
```

---

DATEI
WorldEditorUI.ts

PFAD
/client/src/editor/WorldEditorUI.ts

INHALT
```
export function openWorldEditorUI() {
  const el = document.createElement("div");
  el.textContent = "GM World Editor";
  el.style.position = "fixed";
  el.style.right = "12px";
  el.style.bottom = "12px";
  el.style.padding = "10px 14px";
  el.style.background = "#2b2b2b";
  el.style.color = "#fff";
  document.body.appendChild(el);
}
```

---

DATEI
renderer.ts

PFAD
/client/src/engine/renderer.ts

INHALT
```
import * as THREE from "three";

export function initRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshBasicMaterial({ color: 0x44aa88 })
  );

  scene.add(cube);

  function animate() {
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();
}
```

---

DATEI
worldLoader.ts

PFAD
/client/src/engine/worldLoader.ts

INHALT
```
export function loadWorldChunk(chunkX: number, chunkY: number) {
  return {
    chunkX,
    chunkY,
    status: "requested"
  };
}
```

---

DATEI
playerController.ts

PFAD
/client/src/gameplay/playerController.ts

INHALT
```
export class PlayerController {
  move(direction: string) {
    return {
      type: "move",
      direction
    };
  }
}
```

---

DATEI
main.ts

PFAD
/client/src/main.ts

INHALT
```
import { initRenderer } from "./engine/renderer";
import { connectSocket } from "./networking/websocketClient";
import { renderHUD } from "./ui/hud";

const canvas = document.createElement("canvas");
document.body.style.margin = "0";
document.body.appendChild(canvas);

initRenderer(canvas);
connectSocket();
renderHUD();
```

---

DATEI
websocketClient.ts

PFAD
/client/src/networking/websocketClient.ts

INHALT
```
export function connectSocket() {
  const ws = new WebSocket(`ws://${location.hostname}:3000`);

  ws.onopen = () => console.log("Connected to Arelorian server");
  ws.onmessage = (msg) => console.log("Server:", msg.data);

  return ws;
}
```

---

DATEI
chat.ts

PFAD
/client/src/ui/chat.ts

INHALT
```
export function renderChat() {
  const el = document.createElement("div");
  el.textContent = "Chat placeholder";
  el.style.position = "fixed";
  el.style.left = "12px";
  el.style.bottom = "12px";
  el.style.padding = "8px 12px";
  el.style.background = "rgba(0,0,0,0.55)";
  el.style.color = "#fff";
  document.body.appendChild(el);
}
```

---

DATEI
hud.ts

PFAD
/client/src/ui/hud.ts

INHALT
```
export function renderHUD() {
  const hud = document.createElement("div");
  hud.textContent = "Arelorian HUD online";
  hud.style.position = "fixed";
  hud.style.top = "12px";
  hud.style.left = "12px";
  hud.style.padding = "8px 12px";
  hud.style.background = "rgba(0,0,0,0.55)";
  hud.style.color = "#fff";
  hud.style.fontFamily = "sans-serif";
  document.body.appendChild(hud);
}
```

---

DATEI
inventory.ts

PFAD
/client/src/ui/inventory.ts

INHALT
```
export function renderInventory() {
  const el = document.createElement("div");
  el.textContent = "Inventory placeholder";
  el.style.position = "fixed";
  el.style.right = "12px";
  el.style.top = "12px";
  el.style.padding = "8px 12px";
  el.style.background = "rgba(0,0,0,0.55)";
  el.style.color = "#fff";
  document.body.appendChild(el);
}
```

---

DATEI
tsconfig.json

PFAD
/client/tsconfig.json

INHALT
```
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true
  },
  "include": [
    "src/**/*"
  ]
}
```

---

DATEI
ASSET_PIPELINE.md

PFAD
/docs/ASSET_PIPELINE.md

INHALT
```
# Asset Pipeline

## GLB-Regeln
Terrain ist kein GLB-Bodenteppich. GLB wird für NPCs, Monster, Gebäude, Bäume, Props und Reittiere verwendet.

## Struktur
- characters/
- monsters/
- buildings/
- props/
- vegetation/
- admin/

## Validierung
Jedes Asset sollte idealerweise besitzen:
- sauberen Ursprungspunkt
- sinnvolle Skalierung
- optionales Rig/Skeleton
- optional Animationen
```

---

DATEI
BRAIN_SYSTEM.md

PFAD
/docs/BRAIN_SYSTEM.md

INHALT
```
# Brain System

Das Server Brain ist eine heuristische Meta-Schicht.

## Aufgaben
- Spannungen erkennen
- Politiksignale lesen
- Marktanomalien erkennen
- Orakelvisionen speisen
- Ereignisse anstoßen

## 13-Punkte-Modell
- 4 Weltpunkte
- 4 Interpretationspunkte
- 4 Dynamikpunkte
- 1 Zentrum

Das Zentrum aggregiert Weltzustand, NPC-Memory, Ökonomie, Politik und Geschichte.
```

---

DATEI
BUILD_SEQUENCE_MASTER.md

PFAD
/docs/BUILD_SEQUENCE_MASTER.md

INHALT
```
# Build Sequence Master

1. Server core und bootstrap
2. World tick
3. Chunk- und Observer-System
4. Persistence
5. NPC personality + memory + genealogy
6. Civilization + politics
7. Economy + Matrix energy
8. Player, skills, combat, loot
9. Dungeons, ruins, oracle, history
10. Brain + field analyzer
11. Asset registry + GLB loading
12. GM editor
13. Client renderer + websocket sync
14. Firebase/AWS integration
```

---

DATEI
DIALOGUE_SYSTEM.md

PFAD
/docs/DIALOGUE_SYSTEM.md

INHALT
```
# Dialogue System

The dialogue system combines:
- personality traits
- family and lineage
- culture
- religion
- memory
- world events
- oracle/world history signals

## Pipeline
1. build context
2. choose tone
3. choose dialogue pool
4. inject dynamic references
5. return line + optional quest/world hint
```

---

DATEI
DUNGEON_SYSTEM.md

PFAD
/docs/DUNGEON_SYSTEM.md

INHALT
```
# Dungeon System

Dungeons are generated from seeds, ruins and regional history.

## Room types
- hall
- shrine
- monster_lair
- collapsed_passage
- treasure_room
- prison
- relic_chamber

## Inputs
- biome
- ruin class
- ancient civilization markers
- oracle hints
- current danger rating
```

---

DATEI
ECONOMY_MODEL.md

PFAD
/docs/ECONOMY_MODEL.md

INHALT
```
# Economy Model

Die Wirtschaft verbindet Ressourcen, Spieler, NPCs, Märkte und Städte.

## Kernelemente
- Stadtmärkte
- Handelsrouten
- NPC-Händler
- Spielerhandel
- Matrix-Energie
- politische und kriegerische Markteinflüsse

## Preisfaktoren
- Angebot
- Nachfrage
- Krieg
- Knappheit
- Transport
- Stadtsteuern
```

---

DATEI
GM_EDITOR.md

PFAD
/docs/GM_EDITOR.md

INHALT
```
# GM Editor

Der GM-Editor erlaubt Live-Eingriffe in die Welt.

## Fähigkeiten
- Objekte setzen
- NPCs spawnen
- Strukturen verschieben
- Terrainmarker bearbeiten
- Events starten
- Weltzustände prüfen

## Regel
Der Editor ist serverautoritativ. Der Client darf nur Befehle senden.
```

---

DATEI
MASTER_DESIGN_BIBLE.md

PFAD
/docs/MASTER_DESIGN_BIBLE.md

INHALT
```
# Master Design Bible

## Vision
Arelorian ist ein persistentes Browser-MMORPG mit emergenter Weltlogik. Die Welt ist theoretisch unendlich,
wird prozedural erzeugt und über Beobachterzonen simuliert.

## Fünf Axiome
1. Informationsfeld
2. Emergenz
3. Persistenz
4. Ouroboros-Zyklus
5. Beobachter

## Welt
- Prozedurale Welt
- Chunks 64x64
- Biome als natürliche Grenzen
- Ruinen, Dungeons und historische Schichten

## Zivilisationen
- Guild -> Village -> City -> Kingdom -> Nation
- Spieler und NPCs besitzen dieselben zivilisatorischen Rechte

## NPCs
- Personality
- DNA/Traits
- Genealogie und Häuser
- Memory und Shared Memory
- Kultur und Religion
- Politik und Familiengeschichte

## Gameplay
- klassenloses Skill-System
- Skills durch Nutzung
- Stamina als Kernressource
- Diablo-artiges Loot
- Magie als Skillzweig
- Crafting, Handel und Weltwirtschaft

## Systeme
- Server Brain mit 13-Punkte-Modell
- Dudenregister und Orakel
- Matrix-Energie
- Weltwunder und Schattenregisterportal
- GM-Editor
- GLB-Asset-Pipeline
```

---

DATEI
MASTER_SYSTEM_CHECKLIST.md

PFAD
/docs/MASTER_SYSTEM_CHECKLIST.md

INHALT
```
# Master System Checklist

## Welt
- [x] World generator
- [x] 64x64 chunk system
- [x] Observer simulation
- [x] Biome and terrain
- [x] World tick
- [x] Dungeons
- [x] Ruins

## NPC
- [x] Personality engine
- [x] Memory engine
- [x] Shared memory
- [x] Genealogy
- [x] DNA and traits
- [x] Dialogue
- [x] Quests

## Gesellschaft
- [x] Civilization engine
- [x] NPC politics
- [x] Player politics
- [x] Governments
- [x] Taxes
- [x] War

## Gameplay
- [x] Players
- [x] Skills
- [x] Inventory
- [x] Combat
- [x] Loot
- [x] Magic

## Spezial
- [x] Matrix energy
- [x] Dudenregister
- [x] Oracle
- [x] Server brain
- [x] GLB pipeline
- [x] GM editor
```

---

DATEI
MONSTER_SYSTEM.md

PFAD
/docs/MONSTER_SYSTEM.md

INHALT
```
# Monster System

Monsters are generated from:
- species
- dna
- mutation
- biome
- pack memory
- rarity

This allows regional monster lines such as frost wolves, swamp alphas or cave mutants.
```

---

DATEI
NPC_SYSTEM.md

PFAD
/docs/NPC_SYSTEM.md

INHALT
```
# NPC System

## Fünf Einflussfaktoren
- DNA / Traits
- Familie / Genealogie
- Kultur / Herkunft
- Religion / Weltbild
- Erfahrung / Memory

## Memory-Ebenen
- Local memory
- Social memory
- Faction memory
- Historical memory
- Oracle memory

## Verhalten
NPCs können:
- arbeiten
- handeln
- Gerüchte verbreiten
- Familien gründen
- Politik betreiben
- Kriege beginnen oder vermeiden
```

---

DATEI
PERSISTENCE_MODEL.md

PFAD
/docs/PERSISTENCE_MODEL.md

INHALT
```
# Persistence Model

Persistent storage is split by concern:
- world chunks
- players
- civilizations
- history / dudenregister
- snapshots
- asset metadata
```

---

DATEI
STRUCTURE_SYSTEM.md

PFAD
/docs/STRUCTURE_SYSTEM.md

INHALT
```
# Structure System

Structures connect GLB assets to persistent world entities.

## Types
- player_structure
- npc_structure
- civilization_structure
- ruin_structure
- wonder_structure
- matrix_protected_structure

## Examples
- house
- gate
- wall
- watch tower
- workshop
- temple
- shadow register portal
```

---

DATEI
WORLD_GENERATION.md

PFAD
/docs/WORLD_GENERATION.md

INHALT
```
# World Generation

Die Welt wird aus `seed + coordinates` erzeugt.

## Chunkstruktur
Jeder Chunk enthält:
- Terrain
- Biomtyp
- Ressourcen
- Objektliste
- Strukturen
- Ruinen oder Dungeon-Eingänge

## Simulationsebenen
1. Dormant
2. Background simulation
3. Active simulation
4. Full simulation

Nur beobachtete Regionen werden hochauflösend simuliert.
```

---

DATEI
DO_NOT_SIMPLIFY.md

PFAD
/final-lock/DO_NOT_SIMPLIFY.md

INHALT
```
# Do Not Simplify

Nicht reduzieren auf:
- Demo
- UI-Mockup
- Singleplayer-Sandbox
- nur Terrain-Viewer
- nur Client ohne Weltsimulation
```

---

DATEI
FINAL_TRUTH.md

PFAD
/final-lock/FINAL_TRUTH.md

INHALT
```
# Final Truth

Dieses Projekt ist ein persistentes MMORPG und darf nicht auf ein Mockup oder eine Einzelspieler-Demo reduziert werden.

Pflicht:
- 64x64 chunks
- observer simulation
- server-authoritative logic
- NPC memory + genealogy
- player and NPC politics
- matrix energy
- 13-node brain
- GM editor
- GLB pipeline
```

---

DATEI
REQUIRED_SYSTEMS_MATRIX.md

PFAD
/final-lock/REQUIRED_SYSTEMS_MATRIX.md

INHALT
```
# Required Systems Matrix

## Welt
observer, chunks, terrain, biomes, tick, dungeons, ruins

## NPC
personality, memory, shared memory, genealogy, dna, dialogue

## Gesellschaft
civilization, politics, government, tax, war, diplomacy

## Gameplay
player, skills, inventory, combat, loot, magic

## Spezial
oracle, dudenregister, matrix energy, brain, gm editor, glb pipeline
```

---

DATEI
biome-definitions.json

PFAD
/game-data/biomes/biome-definitions.json

INHALT
```
{
  "forest": {
    "temperature": "mild",
    "resources": [
      "wood",
      "berries",
      "animals"
    ]
  },
  "desert": {
    "temperature": "hot",
    "resources": [
      "sand",
      "salt",
      "crystals"
    ]
  },
  "mountain": {
    "temperature": "cold",
    "resources": [
      "stone",
      "iron",
      "gold"
    ]
  }
}
```

---

DATEI
cultures.json

PFAD
/game-data/cultures/cultures.json

INHALT
```
{
  "forest_tribes": {
    "style": "organic"
  },
  "mountain_clans": {
    "style": "stone"
  },
  "desert_nomads": {
    "style": "lightweight"
  }
}
```

---

DATEI
matrix-energy-rules.json

PFAD
/game-data/economy/matrix-energy-rules.json

INHALT
```
{
  "currency": "matrix_energy",
  "npcCannotDestroyProtectedStructures": true
}
```

---

DATEI
dudenregister-schema.json

PFAD
/game-data/history/dudenregister-schema.json

INHALT
```
{
  "events": [
    "war",
    "collapse",
    "ruin",
    "wonder",
    "dynasty",
    "oracle"
  ]
}
```

---

DATEI
loot-tables.json

PFAD
/game-data/items/loot-tables.json

INHALT
```
{
  "wolf": [
    "wolf_pelt",
    "fang",
    "alpha_claw"
  ],
  "skeleton": [
    "bone_fragment",
    "rusted_blade",
    "grave_ring"
  ],
  "ruin_cache": [
    "ancient_coin",
    "relic_fragment",
    "forgotten_sigil"
  ]
}
```

---

DATEI
spell-schools.json

PFAD
/game-data/magic/spell-schools.json

INHALT
```
{
  "nature": [
    "root_bind",
    "healing_moss"
  ],
  "shadow": [
    "dark_bolt",
    "fear_whisper"
  ],
  "resonance": [
    "echo_wave",
    "field_tone"
  ],
  "protection": [
    "ward_shield",
    "holy_barrier"
  ],
  "ritual": [
    "ancestral_call",
    "portal_trace"
  ]
}
```

---

DATEI
npc-archetypes.json

PFAD
/game-data/npc/npc-archetypes.json

INHALT
```
{
  "merchant": {},
  "guard": {},
  "oracle": {},
  "gossip": {
    "example": "Uschi die Geschminkte"
  }
}
```

---

DATEI
government-types.json

PFAD
/game-data/politics/government-types.json

INHALT
```
{
  "monarchy": {},
  "council": {},
  "theocracy": {},
  "trade_republic": {},
  "warband": {}
}
```

---

DATEI
quest-registry.json

PFAD
/game-data/quests/quest-registry.json

INHALT
```
{
  "ruin_hunter": {
    "giver": "uschi_gossip",
    "objective": "find_ruins"
  },
  "watchtower_supply": {
    "giver": "city_guard",
    "objective": "deliver_supplies"
  }
}
```

---

DATEI
religions.json

PFAD
/game-data/religions/religions.json

INHALT
```
{
  "sun_order": {
    "ethos": "honor"
  },
  "shadow_cult": {
    "ethos": "secrecy"
  },
  "ancestor_faith": {
    "ethos": "lineage"
  }
}
```

---

DATEI
skills.json

PFAD
/game-data/skills/skills.json

INHALT
```
{
  "combat": {},
  "woodcutting": {},
  "mining": {},
  "smithing": {},
  "magic": {},
  "fishing": {}
}
```

---

DATEI
README_INTEGRATIONS.md

PFAD
/integrations/README_INTEGRATIONS.md

INHALT
```
# Integrations

Hier werden produktive Integrationen abgelegt:
- Firebase
- AWS
- WebSocket Gateway
- Datenbankadapter

Wichtig: Keine Secrets hart in Dateien schreiben.
```

---

DATEI
elasticacheAdapter.ts

PFAD
/integrations/aws/elasticacheAdapter.ts

INHALT
```
export function initElastiCache() {
  return {
    status: "elasticache-adapter-placeholder"
  };
}
```

---

DATEI
postgresAdapter.ts

PFAD
/integrations/aws/postgresAdapter.ts

INHALT
```
export function initPostgres() {
  return {
    status: "postgres-adapter-placeholder"
  };
}
```

---

DATEI
firebase-config.ts

PFAD
/integrations/firebase/firebase-config.ts

INHALT
```
export const firebaseConfig = {
  note: "Fill with real Firebase credentials during deployment"
};
```

---

DATEI
firestorePersistence.ts

PFAD
/integrations/firebase/firestorePersistence.ts

INHALT
```
export function initFirestorePersistence() {
  return {
    status: "firestore-persistence-placeholder"
  };
}
```

---

DATEI
awsGatewayBridge.ts

PFAD
/integrations/websocket-gateway/awsGatewayBridge.ts

INHALT
```
export function initAwsGatewayBridge() {
  return {
    status: "aws-websocket-gateway-placeholder"
  };
}
```

---

DATEI
package.json

PFAD
/server/package.json

INHALT
```
{
  "name": "areloria-server",
  "version": "0.2.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "@types/ws": "^8.5.12",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

---

DATEI
ServerBootstrap.ts

PFAD
/server/src/core/ServerBootstrap.ts

INHALT
```
import express from "express";
import { createServer } from "node:http";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { WorldTick } from "./WorldTick.js";

export class ServerBootstrap {
  start() {
    const app = express();
    const httpServer = createServer(app);

    app.get("/health", (_req, res) => {
      res.json({
        ok: true,
        project: "ARELORIAN MMORPG",
        version: "0.2.0"
      });
    });

    const ws = new GameWebSocketServer(httpServer);
    ws.start();

    const tick = new WorldTick();
    const port = Number(process.env.PORT || 3000);

    httpServer.listen(port, () => {
      console.log(`Arelorian server listening on ${port}`);
      tick.start();
    });
  }
}
```

---

DATEI
WorldTick.ts

PFAD
/server/src/core/WorldTick.ts

INHALT
```
export class WorldTick {
  private timer: NodeJS.Timeout | null = null;
  private tickCount = 0;

  start() {
    this.timer = setInterval(() => this.tick(), 100);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  tick() {
    this.tickCount += 1;
    if (this.tickCount % 10 === 0) {
      console.log("World Tick", this.tickCount);
    }
  }
}
```

---

DATEI
index.ts

PFAD
/server/src/index.ts

INHALT
```
import { ServerBootstrap } from "./core/ServerBootstrap.js";

new ServerBootstrap().start();
```

---

DATEI
BehaviorTree.ts

PFAD
/server/src/modules/ai/BehaviorTree.ts

INHALT
```
export class BehaviorTree {
  run(npc: any) {
    if (npc.needs?.sleep) return "sleep";
    if (npc.needs?.hunger) return "eat";
    if (npc.job) return "work";
    return "wander";
  }
}
```

---

DATEI
NPCBrain.ts

PFAD
/server/src/modules/ai/NPCBrain.ts

INHALT
```
import { BehaviorTree } from "./BehaviorTree.js";

export class NPCBrain {
  private tree = new BehaviorTree();

  update(npc: any) {
    const action = this.tree.run(npc);
    npc.currentAction = action;
    return action;
  }
}
```

---

DATEI
TaskSystem.ts

PFAD
/server/src/modules/ai/TaskSystem.ts

INHALT
```
export class TaskSystem {
  execute(npc: any, action: string) {
    switch (action) {
      case "wander":
        return { action, destination: "random_nearby" };
      case "work":
        return { action, destination: npc.jobLocation ?? "workplace" };
      case "eat":
        return { action, destination: "tavern" };
      case "sleep":
        return { action, destination: "home" };
      default:
        return { action: "idle" };
    }
  }
}
```

---

DATEI
AssetRegistry.ts

PFAD
/server/src/modules/asset-registry/AssetRegistry.ts

INHALT
```
export class AssetRegistry {
  private assets = new Map<string, any>();

  register(id: string, data: any) {
    this.assets.set(id, data);
  }

  get(id: string) {
    return this.assets.get(id) ?? null;
  }

  list() {
    return Array.from(this.assets.entries()).map(([id, data]) => ({ id, ...data }));
  }
}
```

---

DATEI
NPCAssets.ts

PFAD
/server/src/modules/asset-registry/NPCAssets.ts

INHALT
```
export const NPCAssets = {
  uschi_gossip: {
    assetId: "uschi_gossip",
    model: "/assets/models/characters/uschi_gossip.glb",
    category: "npc",
    animations: ["idle", "talk", "laugh", "cough"]
  },
  warrior_male: {
    assetId: "warrior_male",
    model: "/assets/models/characters/warrior_male.glb",
    category: "player_or_npc",
    animations: ["idle", "walk", "attack"]
  },
  warrior_female: {
    assetId: "warrior_female",
    model: "/assets/models/characters/warrior_female.glb",
    category: "player_or_npc",
    animations: ["idle", "walk", "attack"]
  }
};
```

---

DATEI
StructureAssets.ts

PFAD
/server/src/modules/asset-registry/StructureAssets.ts

INHALT
```
export const StructureAssets = {
  castle_wall: {
    assetId: "castle_wall",
    type: "structure",
    model: "/assets/models/buildings/castle_wall.glb",
    collision: true
  },
  castle_gate: {
    assetId: "castle_gate",
    type: "interactive_structure",
    model: "/assets/models/buildings/castle_gate.glb",
    collision: true,
    states: ["open", "closed", "locked", "damaged", "destroyed"]
  },
  castle_watch_tower: {
    assetId: "castle_watch_tower",
    type: "defense_structure",
    model: "/assets/models/buildings/castle_watch_tower.glb",
    collision: true
  }
};
```

---

DATEI
VegetationAssets.ts

PFAD
/server/src/modules/asset-registry/VegetationAssets.ts

INHALT
```
export const VegetationAssets = {
  tree_oak_young: { model: "/assets/models/vegetation/tree_oak_young.glb", category: "vegetation", growthStage: 0 },
  tree_oak_spring: { model: "/assets/models/vegetation/tree_oak_spring.glb", category: "vegetation", growthStage: 1 },
  tree_oak_summer: { model: "/assets/models/vegetation/tree_oak_summer.glb", category: "vegetation", growthStage: 2 },
  tree_oak_autumn: { model: "/assets/models/vegetation/tree_oak_autumn.glb", category: "vegetation", growthStage: 3 }
};
```

---

DATEI
BrainFieldAnalyzer.ts

PFAD
/server/src/modules/brain/BrainFieldAnalyzer.ts

INHALT
```
export class BrainFieldAnalyzer {
  analyzeField(values: unknown[]) {
    return {
      activeNodes: values.length,
      result: "field-analysis-placeholder"
    };
  }
}
```

---

DATEI
HeuristicWorldBrain.ts

PFAD
/server/src/modules/brain/HeuristicWorldBrain.ts

INHALT
```
export class HeuristicWorldBrain {
  private readonly nodes = new Array(13).fill(null);

  analyze(input: unknown) {
    return {
      nodes: this.nodes.length,
      summary: "analysis-placeholder",
      input
    };
  }
}
```

---

DATEI
CivilizationEngine.ts

PFAD
/server/src/modules/civilization/CivilizationEngine.ts

INHALT
```
export class CivilizationEngine {
  createVillage(guildMembers: number) {
    if (guildMembers < 50) return null;
    return {
      type: "village",
      population: guildMembers,
      createdAt: Date.now()
    };
  }
}
```

---

DATEI
SettlementSystem.ts

PFAD
/server/src/modules/civilization/SettlementSystem.ts

INHALT
```
export class SettlementSystem {
  createSettlement(type: "village" | "city" | "kingdom" | "nation", ownerId: string) {
    return {
      type,
      ownerId,
      createdAt: Date.now()
    };
  }
}
```

---

DATEI
CombatSystem.ts

PFAD
/server/src/modules/combat/CombatSystem.ts

INHALT
```
export class CombatSystem {
  attack(attacker: any, defender: any) {
    if (attacker.stamina <= 0) return { success: false, reason: "no_stamina" };

    attacker.stamina -= 10;

    const hitChance = this.hitChance(attacker, defender);
    if (Math.random() > hitChance) {
      return { success: true, hit: false, damage: 0 };
    }

    const damage = this.calculateDamage(attacker, defender);
    defender.health = Math.max(0, defender.health - damage);

    return {
      success: true,
      hit: true,
      damage,
      defenderHealth: defender.health
    };
  }

  hitChance(attacker: any, defender: any) {
    const atk = attacker.skills?.combat?.level ?? 1;
    const def = defender.skills?.combat?.level ?? 1;
    return Math.min(0.95, Math.max(0.1, atk / (atk + def)));
  }

  calculateDamage(attacker: any, defender: any) {
    const atk = attacker.skills?.combat?.level ?? 1;
    const def = defender.skills?.combat?.level ?? 1;
    const base = 5 + atk;
    const mitigation = Math.floor(def * 0.3);
    return Math.max(1, base - mitigation + Math.floor(Math.random() * 4));
  }
}
```

---

DATEI
DialogueContext.ts

PFAD
/server/src/modules/dialogue/DialogueContext.ts

INHALT
```
export function buildDialogueContext(npc: any, player: any, world: any) {
  return {
    npcId: npc.id,
    playerId: player?.id ?? null,
    traits: npc.traits ?? {},
    lineage: npc.lineage ?? null,
    culture: npc.culture ?? null,
    religion: npc.religion ?? null,
    memory: npc.memory ?? [],
    worldEvents: world?.events ?? [],
    oracleSignals: world?.oracleSignals ?? []
  };
}
```

---

DATEI
DialogueEngine.ts

PFAD
/server/src/modules/dialogue/DialogueEngine.ts

INHALT
```
import { buildDialogueContext } from "./DialogueContext.js";
import { DialogueGenerator } from "./DialogueGenerator.js";

export class DialogueEngine {
  private generator = new DialogueGenerator();

  talk(npc: any, player: any, world: any) {
    const context = buildDialogueContext(npc, player, world);
    return this.generator.generate(context);
  }
}
```

---

DATEI
DialogueGenerator.ts

PFAD
/server/src/modules/dialogue/DialogueGenerator.ts

INHALT
```
import { DialogueTemplates } from "./DialogueTemplates.js";

export class DialogueGenerator {
  generate(context: any) {
    const mood = context.traits?.aggression > 0.7 ? "warning" : "greeting";
    const pool = DialogueTemplates[mood] ?? ["..."];
    return {
      line: pool[Math.floor(Math.random() * pool.length)],
      contextSummary: {
        culture: context.culture,
        religion: context.religion
      }
    };
  }
}
```

---

DATEI
DialogueTemplates.ts

PFAD
/server/src/modules/dialogue/DialogueTemplates.ts

INHALT
```
export const DialogueTemplates = {
  greeting: [
    "Na Süßer, suchst du Abenteuer?",
    "Du siehst aus, als hättest du Ärger im Gepäck.",
    "Setz dich, ich erzähl dir was Interessantes."
  ],
  rumor: [
    "Im Nordwald wurden alte Mauern gesehen.",
    "Die Händler reden von seltsamen Kreaturen im Moor.",
    "Ein Königreich im Osten ist nervös."
  ],
  warning: [
    "Geh da nicht unvorbereitet hinein.",
    "Manche Wege fressen ganze Blutlinien.",
    "Nicht jede Ruine will entdeckt werden."
  ]
};
```

---

DATEI
DungeonGenerator.ts

PFAD
/server/src/modules/dungeon/DungeonGenerator.ts

INHALT
```
export class DungeonGenerator {
  generate(seed: number) {
    const rooms = [];
    const roomCount = 4 + Math.floor(Math.abs(Math.sin(seed)) * 6);
    for (let i = 0; i < roomCount; i++) {
      rooms.push({
        id: i,
        type: this.randomRoom(seed + i),
        danger: 1 + (i % 5)
      });
    }
    return { seed, rooms };
  }

  randomRoom(seed: number) {
    const types = [
      "hall",
      "treasure_room",
      "monster_lair",
      "collapsed_passage",
      "ancient_shrine"
    ];
    return types[Math.abs(Math.floor(seed)) % types.length];
  }
}
```

---

DATEI
EconomyEngine.ts

PFAD
/server/src/modules/economy/EconomyEngine.ts

INHALT
```
export class EconomyEngine {
  private markets = new Map<string, { goods: Record<string, number> }>();

  registerMarket(id: string) {
    this.markets.set(id, { goods: {} });
  }

  trade(marketId: string, item: string, amount: number) {
    const market = this.markets.get(marketId);
    if (!market) return null;
    if (!market.goods[item]) market.goods[item] = 0;
    market.goods[item] += amount;
    return market.goods[item];
  }
}
```

---

DATEI
MatrixEnergySystem.ts

PFAD
/server/src/modules/economy/MatrixEnergySystem.ts

INHALT
```
export class MatrixEnergySystem {
  private balances = new Map<string, number>();

  add(playerId: string, amount: number) {
    const current = this.balances.get(playerId) || 0;
    this.balances.set(playerId, current + amount);
  }

  consume(playerId: string, amount: number) {
    const current = this.balances.get(playerId) || 0;
    if (current < amount) return false;
    this.balances.set(playerId, current - amount);
    return true;
  }

  getBalance(playerId: string) {
    return this.balances.get(playerId) || 0;
  }
}
```

---

DATEI
TradeRoutes.ts

PFAD
/server/src/modules/economy/TradeRoutes.ts

INHALT
```
export class TradeRoutes {
  createRoute(a: string, b: string) {
    return {
      from: a,
      to: b,
      active: true
    };
  }
}
```

---

DATEI
DudenregisterHistory.ts

PFAD
/server/src/modules/history/DudenregisterHistory.ts

INHALT
```
export class DudenregisterHistory {
  private history: any[] = [];

  record(event: any) {
    this.history.push(event);
  }

  getHistory() {
    return this.history;
  }
}
```

---

DATEI
WorldSnapshotSystem.ts

PFAD
/server/src/modules/history/WorldSnapshotSystem.ts

INHALT
```
export class WorldSnapshotSystem {
  private snapshots: any[] = [];

  save(worldState: any) {
    this.snapshots.push({
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(worldState))
    });
  }

  latest() {
    return this.snapshots[this.snapshots.length - 1] ?? null;
  }
}
```

---

DATEI
InventorySystem.ts

PFAD
/server/src/modules/inventory/InventorySystem.ts

INHALT
```
export class InventorySystem {
  addItem(player: any, item: any) {
    player.inventory.push(item);
    return player.inventory;
  }

  removeItem(player: any, itemId: string) {
    player.inventory = player.inventory.filter((item: any) => item.id !== itemId);
    return player.inventory;
  }
}
```

---

DATEI
LootTables.ts

PFAD
/server/src/modules/loot/LootTables.ts

INHALT
```
export const LootTables = {
  wolf: [
    { id: "wolf_pelt", chance: 0.65, rarity: "common" },
    { id: "fang", chance: 0.3, rarity: "common" },
    { id: "alpha_claw", chance: 0.05, rarity: "rare" }
  ],
  skeleton: [
    { id: "bone_fragment", chance: 0.7, rarity: "common" },
    { id: "rusted_blade", chance: 0.2, rarity: "uncommon" },
    { id: "grave_ring", chance: 0.03, rarity: "rare" }
  ],
  ruin_cache: [
    { id: "ancient_coin", chance: 0.5, rarity: "uncommon" },
    { id: "relic_fragment", chance: 0.2, rarity: "rare" },
    { id: "forgotten_sigil", chance: 0.02, rarity: "legendary" }
  ]
};
```

---

DATEI
MagicSystem.ts

PFAD
/server/src/modules/magic/MagicSystem.ts

INHALT
```
export class MagicSystem {
  cast(caster: any, spell: any, target: any) {
    if ((caster.mana ?? 0) < spell.cost) {
      return { success: false, reason: "not_enough_mana" };
    }

    caster.mana -= spell.cost;

    return {
      success: true,
      spell: spell.id,
      target: target?.id ?? null,
      effect: spell.effect ?? "generic_magic_effect"
    };
  }
}
```

---

DATEI
MonsterDNA.ts

PFAD
/server/src/modules/monster/MonsterDNA.ts

INHALT
```
export function generateMonsterDNA(species: string) {
  return {
    species,
    strength: Math.random(),
    speed: Math.random(),
    aggression: Math.random(),
    intelligence: Math.random(),
    resilience: Math.random()
  };
}
```

---

DATEI
MonsterMutation.ts

PFAD
/server/src/modules/monster/MonsterMutation.ts

INHALT
```
export function mutateMonster(dna: any, biome: string) {
  const clone = { ...dna, mutations: [] as string[] };

  if (biome === "snow") {
    clone.resilience += 0.2;
    clone.mutations.push("frost_resistance");
  }

  if (biome === "swamp") {
    clone.aggression += 0.15;
    clone.mutations.push("swamp_hunger");
  }

  if (Math.random() < 0.08) {
    clone.mutations.push("rare_variant");
  }

  return clone;
}
```

---

DATEI
MonsterSpawner.ts

PFAD
/server/src/modules/monster/MonsterSpawner.ts

INHALT
```
import { generateMonsterDNA } from "./MonsterDNA.js";
import { mutateMonster } from "./MonsterMutation.js";

export class MonsterSpawner {
  spawn(species: string, biome: string) {
    const dna = generateMonsterDNA(species);
    return mutateMonster(dna, biome);
  }
}
```

---

DATEI
NPCDialogueSystem.ts

PFAD
/server/src/modules/npc/NPCDialogueSystem.ts

INHALT
```
export class NPCDialogueSystem {
  talk(npc: any, worldSignals: any = {}) {
    const lines = npc.dialogueLines || [
      "Die Welt flüstert merkwürdige Dinge.",
      "Ich habe da ein Gerücht gehört."
    ];

    return {
      line: lines[Math.floor(Math.random() * lines.length)],
      signals: worldSignals
    };
  }
}
```

---

DATEI
NPCGenealogyEngine.ts

PFAD
/server/src/modules/npc/NPCGenealogyEngine.ts

INHALT
```
export class NPCGenealogyEngine {
  createLineage(id: string, house: string, parents: string[] = []) {
    return {
      id,
      house,
      parents,
      children: [] as string[]
    };
  }

  addChild(lineage: any, childId: string) {
    lineage.children.push(childId);
    return lineage;
  }
}
```

---

DATEI
NPCMemoryEngine.ts

PFAD
/server/src/modules/npc/NPCMemoryEngine.ts

INHALT
```
export class NPCMemoryEngine {
  private memory = new Map<string, any[]>();

  remember(npcId: string, event: any) {
    if (!this.memory.has(npcId)) this.memory.set(npcId, []);
    this.memory.get(npcId)!.push({
      timestamp: Date.now(),
      event
    });
  }

  recall(npcId: string) {
    return this.memory.get(npcId) || [];
  }
}
```

---

DATEI
NPCPersonalityEngine.ts

PFAD
/server/src/modules/npc/NPCPersonalityEngine.ts

INHALT
```
export class NPCPersonalityEngine {
  generateTraits() {
    return {
      courage: Math.random(),
      curiosity: Math.random(),
      greed: Math.random(),
      faith: Math.random(),
      aggression: Math.random()
    };
  }
}
```

---

DATEI
ObserverEngine.ts

PFAD
/server/src/modules/observer/ObserverEngine.ts

INHALT
```
export class ObserverEngine {
  private observers = new Map<string, { x: number; y: number }>();

  register(playerId: string, position: { x: number; y: number }) {
    this.observers.set(playerId, position);
  }

  unregister(playerId: string) {
    this.observers.delete(playerId);
  }

  getObservedChunks() {
    const result = [] as { chunkX: number; chunkY: number }[];
    for (const [, pos] of this.observers) {
      result.push({
        chunkX: Math.floor(pos.x / 64),
        chunkY: Math.floor(pos.y / 64)
      });
    }
    return result;
  }
}
```

---

DATEI
OracleEngine.ts

PFAD
/server/src/modules/oracle/OracleEngine.ts

INHALT
```
export class OracleEngine {
  generateVision() {
    const visions = [
      "Ich sehe Feuer im Norden.",
      "Unter alten Mauern liegt ein Geheimnis.",
      "Ein Königreich wird fallen."
    ];
    return visions[Math.floor(Math.random() * visions.length)];
  }
}
```

---

DATEI
CivilizationDatabase.ts

PFAD
/server/src/modules/persistence/CivilizationDatabase.ts

INHALT
```
export class CivilizationDatabase {
  private civilizations = new Map<string, any>();

  saveCivilization(civ: any) {
    this.civilizations.set(civ.id, civ);
  }

  loadCivilization(id: string) {
    return this.civilizations.get(id) ?? null;
  }
}
```

---

DATEI
PlayerDatabase.ts

PFAD
/server/src/modules/persistence/PlayerDatabase.ts

INHALT
```
export class PlayerDatabase {
  private players = new Map<string, any>();

  savePlayer(player: any) {
    this.players.set(player.id, player);
  }

  loadPlayer(id: string) {
    return this.players.get(id) ?? null;
  }
}
```

---

DATEI
WorldDatabase.ts

PFAD
/server/src/modules/persistence/WorldDatabase.ts

INHALT
```
export class WorldDatabase {
  private chunks = new Map<string, any>();

  saveChunk(chunk: any) {
    this.chunks.set(chunk.id, chunk);
  }

  loadChunk(id: string) {
    return this.chunks.get(id) ?? null;
  }
}
```

---

DATEI
PlayerSystem.ts

PFAD
/server/src/modules/player/PlayerSystem.ts

INHALT
```
export class PlayerSystem {
  createPlayer(id: string, name: string) {
    return {
      id,
      name,
      position: { x: 0, y: 0, z: 0 },
      health: 100,
      stamina: 100,
      mana: 25,
      skills: {},
      inventory: [],
      faction: null,
      civilization: null,
      matrixEnergy: 0
    };
  }
}
```

---

DATEI
GovernmentTypes.ts

PFAD
/server/src/modules/politics/GovernmentTypes.ts

INHALT
```
export const GovernmentTypes = {
  monarchy: { id: "monarchy", succession: "inheritance", stabilityBase: 0.7 },
  council: { id: "council", succession: "vote", stabilityBase: 0.6 },
  theocracy: { id: "theocracy", succession: "religious_selection", stabilityBase: 0.65 },
  trade_republic: { id: "trade_republic", succession: "merchant_vote", stabilityBase: 0.55 },
  warband: { id: "warband", succession: "strength", stabilityBase: 0.4 }
};
```

---

DATEI
WarEngine.ts

PFAD
/server/src/modules/politics/WarEngine.ts

INHALT
```
export class WarEngine {
  declareWar(attacker: any, defender: any) {
    return {
      type: "war_declared",
      attacker: attacker.id,
      defender: defender.id,
      timestamp: Date.now()
    };
  }
}
```

---

DATEI
QuestEngine.ts

PFAD
/server/src/modules/quest/QuestEngine.ts

INHALT
```
import { QuestRegistry } from "./QuestRegistry.js";

export class QuestEngine {
  private active = new Map<string, any[]>();

  startQuest(playerId: string, questId: keyof typeof QuestRegistry) {
    const quest = QuestRegistry[questId];
    if (!quest) return null;
    if (!this.active.has(playerId)) this.active.set(playerId, []);
    this.active.get(playerId)!.push({ ...quest, startedAt: Date.now(), completed: false });
    return quest;
  }

  listQuests(playerId: string) {
    return this.active.get(playerId) || [];
  }

  completeQuest(playerId: string, questId: string) {
    const quests = this.active.get(playerId) || [];
    const q = quests.find((x) => x.id === questId);
    if (!q) return null;
    q.completed = true;
    q.completedAt = Date.now();
    return q.reward;
  }
}
```

---

DATEI
QuestRegistry.ts

PFAD
/server/src/modules/quest/QuestRegistry.ts

INHALT
```
export const QuestRegistry = {
  ruin_hunter: {
    id: "ruin_hunter",
    name: "Die alten Mauern",
    giver: "uschi_gossip",
    objective: "find_ruins",
    reward: { gold: 100, item: "ancient_relic" }
  },
  watchtower_supply: {
    id: "watchtower_supply",
    name: "Die hungernden Wächter",
    giver: "city_guard",
    objective: "deliver_supplies",
    reward: { xp: 50, item: "guard_token" }
  }
};
```

---

DATEI
ReligionSystem.ts

PFAD
/server/src/modules/religion/ReligionSystem.ts

INHALT
```
export class ReligionSystem {
  private religions = new Map<string, any>();

  registerReligion(id: string, data: any) {
    this.religions.set(id, data);
  }

  getReligion(id: string) {
    return this.religions.get(id);
  }
}
```

---

DATEI
SkillSystem.ts

PFAD
/server/src/modules/skill/SkillSystem.ts

INHALT
```
export class SkillSystem {
  ensureSkill(player: any, skillName: string) {
    if (!player.skills[skillName]) {
      player.skills[skillName] = { level: 1, xp: 0 };
    }
  }

  addXP(player: any, skillName: string, amount: number) {
    this.ensureSkill(player, skillName);
    const skill = player.skills[skillName];
    skill.xp += amount;
    while (skill.xp >= this.nextLevelXP(skill.level)) {
      skill.level += 1;
    }
    return skill;
  }

  nextLevelXP(level: number) {
    return Math.floor(50 * Math.pow(level, 1.4));
  }
}
```

---

DATEI
GateController.ts

PFAD
/server/src/modules/structure/GateController.ts

INHALT
```
export class GateController {
  setState(gate: any, state: string) {
    const allowed = ["open", "closed", "locked", "damaged", "destroyed"];
    if (!allowed.includes(state)) throw new Error("Invalid gate state");
    gate.state = state;
    return gate;
  }

  canOpen(actor: any, gate: any) {
    if (gate.state === "destroyed") return false;
    if (gate.state === "locked" && !actor.permissions?.includes("gate_access")) return false;
    return true;
  }
}
```

---

DATEI
StructureEngine.ts

PFAD
/server/src/modules/structure/StructureEngine.ts

INHALT
```
export class StructureEngine {
  private structures = new Map<string, any>();

  createStructure(structure: any) {
    this.structures.set(structure.structureId, structure);
    return structure;
  }

  getStructure(id: string) {
    return this.structures.get(id) ?? null;
  }

  damageStructure(id: string, amount: number) {
    const structure = this.structures.get(id);
    if (!structure) return null;
    structure.hitpoints = Math.max(0, structure.hitpoints - amount);
    if (structure.hitpoints === 0) structure.destroyed = true;
    return structure;
  }
}
```

---

DATEI
BiomeGenerator.ts

PFAD
/server/src/modules/world/BiomeGenerator.ts

INHALT
```
export class BiomeGenerator {
  getBiome(_x: number, _y: number, height: number) {
    if (height > 0.7) return "mountain";
    if (height > 0.45) return "forest";
    if (height > 0.2) return "grassland";
    return "desert";
  }
}
```

---

DATEI
ChunkSystem.ts

PFAD
/server/src/modules/world/ChunkSystem.ts

INHALT
```
export class ChunkSystem {
  constructor(public readonly size: number = 64) {}

  getChunk(x: number, y: number) {
    return {
      id: `${x}:${y}`,
      x,
      y,
      size: this.size
    };
  }
}
```

---

DATEI
TerrainGenerator.ts

PFAD
/server/src/modules/world/TerrainGenerator.ts

INHALT
```
export class TerrainGenerator {
  getHeight(x: number, y: number) {
    return Math.sin(x * 0.1) + Math.cos(y * 0.1);
  }
}
```

---

DATEI
WorldEditorServer.ts

PFAD
/server/src/modules/world-editor/WorldEditorServer.ts

INHALT
```
export class WorldEditorServer {
  spawnEntity(type: string, position: { x: number; y: number; z: number }) {
    return { action: "spawn", type, position };
  }

  moveEntity(entityId: string, position: { x: number; y: number; z: number }) {
    return { action: "move", entityId, position };
  }

  deleteEntity(entityId: string) {
    return { action: "delete", entityId };
  }
}
```

---

DATEI
PacketRouter.ts

PFAD
/server/src/networking/PacketRouter.ts

INHALT
```
export class PacketRouter {
  route(packet: any) {
    return {
      handled: true,
      type: packet?.type ?? "unknown"
    };
  }
}
```

---

DATEI
PlayerSession.ts

PFAD
/server/src/networking/PlayerSession.ts

INHALT
```
export type PlayerSession = {
  id: string;
  name: string;
  connectedAt: number;
  position: { x: number; y: number; z: number };
};
```

---

DATEI
WebSocketServer.ts

PFAD
/server/src/networking/WebSocketServer.ts

INHALT
```
import type { Server as HttpServer } from "node:http";
import { WebSocketServer } from "ws";

export class GameWebSocketServer {
  private wss: WebSocketServer | null = null;

  constructor(private readonly httpServer: HttpServer) {}

  start() {
    this.wss = new WebSocketServer({ server: this.httpServer });

    this.wss.on("connection", (socket) => {
      socket.send(JSON.stringify({
        type: "welcome",
        message: "Arelorian connection established"
      }));

      socket.on("message", (msg) => {
        console.log("WS message:", msg.toString());
      });
    });
  }
}
```

---

DATEI
tsconfig.json

PFAD
/server/tsconfig.json

INHALT
```
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": [
    "src/**/*"
  ]
}
```

---

DATEI
README_ASSETS.md

PFAD
/world-assets/README_ASSETS.md

INHALT
```
# World Assets

Lege hier GLB-Assets ab:
- characters/
- monsters/
- buildings/
- props/
- vegetation/
- admin/

Beispiele:
- uschi_gossip.glb
- warrior_male.glb
- warrior_female.glb
- castle_gate.glb
- castle_watch_tower.glb
- tree_oak_spring.glb
- gm_giraffe.glb
```
```

---

DATEI
areloria_reconstruction_pack_fuller.txt

PFAD
/areloria_reconstruction_pack_fuller.txt

INHALT
```
# ARELORIA RECONSTRUCTION PACK FULLER

DATEI / PFAD / INHALT für Agent-Rekonstruktion

---

DATEI
CHECKED_CONTENT_REPORT.md

PFAD
/CHECKED_CONTENT_REPORT.md

INHALT
```
# Checked Content Report

Dieses Paket wurde **neu** aufgebaut, damit es nicht wieder nur aus fast leeren Ordnern besteht.

## Enthalten
- Root-Dateien
- 9 Hauptdokumente
- 3 final-lock-Dateien
- 3 agent-Dateien
- Server core + networking
- 21 Server-Moduldateien
- Client package + renderer + websocket + HUD
- Game-data-Dateien
- Integrationsplatzhalter
- Admin-/Asset-Readmes

## Dateianzahl
79
```

---

DATEI
MASTER_INDEX.md

PFAD
/MASTER_INDEX.md

INHALT
```
# Master Index

## Root
- README_START_HERE.md
- PROJECT_LOCK_RULES.md
- MASTER_INDEX.md

## Core Docs
- docs/MASTER_DESIGN_BIBLE.md
- docs/MASTER_SYSTEM_CHECKLIST.md
- docs/BUILD_SEQUENCE_MASTER.md
- docs/WORLD_GENERATION.md
- docs/NPC_SYSTEM.md
- docs/ECONOMY_MODEL.md
- docs/BRAIN_SYSTEM.md
- docs/ASSET_PIPELINE.md
- docs/GM_EDITOR.md

## Final Lock
- final-lock/FINAL_TRUTH.md
- final-lock/DO_NOT_SIMPLIFY.md
- final-lock/REQUIRED_SYSTEMS_MATRIX.md

## Agent
- agent/AGENT_BUILD_INSTRUCTIONS.md
- agent/ARELORIAN_SUPER_PROMPT.md
- agent/AI_AGENT_FAILSAFE_RULES.md

## Code
- server/
- client/

## Data
- game-data/
- world-assets/

## Ops
- integrations/
- admin-tools/
```

---

DATEI
PACK_BUILD_STATUS.md

PFAD
/PACK_BUILD_STATUS.md

INHALT
```
# Pack Build Status

## Bereits aufgebaut
- Root rules/docs
- Final lock files
- Agent files
- Server core
- Networking
- World + observer
- NPC systems
- Dialogue + quest
- Dungeon + monster
- Structure + gate + asset registry
- AI behavior
- Persistence
- Client core + renderer + websocket + HUD + editor UI
- Game data basics
- Integrations placeholders

## Nächste vertiefbare Blöcke
- vollständiger GM command layer
- richer item generator + affix logic
- crafting system
- farming / tree growth logic
- city market simulation expansion
- real auth / persistence adapters
```

---

DATEI
PROJECT_LOCK_RULES.md

PFAD
/PROJECT_LOCK_RULES.md

INHALT
```
# Project Lock Rules

Diese Regeln dürfen nicht gebrochen werden.

1. Kein Umbau zu einer simplen Demo-App.
2. Chunkgröße bleibt 64x64.
3. Observer-Axiom bleibt Pflicht.
4. Server bleibt autoritativ.
5. NPC-Personality, NPC-Memory und Genealogie bleiben Pflichtsysteme.
6. Spieler- und NPC-Politik bleiben Pflichtsysteme.
7. Matrix-Energie bleibt Infrastrukturwährung.
8. Server-Brain mit 13 Punkten bleibt Pflicht.
9. GM-World-Editor bleibt Pflicht.
10. GLB-Asset-Pipeline bleibt Pflicht.
```

---

DATEI
README_START_HERE.md

PFAD
/README_START_HERE.md

INHALT
```
# Arelorian Master Project

Dieses Paket ist ein **voller Entwicklungs-Scaffold** für das Arelorian/Ouroboros Browser-MMORPG.
Es ist **kein leeres Ordnerpaket** und **keine Demo-App**, sondern eine strukturierte Grundlage mit:
- Architektur- und Regeldokumenten
- Server-Modulen als TypeScript-Skeletons
- Client-Grundgerüst mit Three.js
- Game-Data-Dateien
- Integrationsplatzhaltern für Firebase/AWS
- Admin-/GM-Editor-Grunddateien
- Asset-Import-Hinweisen für GLB-Dateien

## Sofort lesen
1. `PROJECT_LOCK_RULES.md`
2. `final-lock/FINAL_TRUTH.md`
3. `docs/MASTER_DESIGN_BIBLE.md`
4. `docs/BUILD_SEQUENCE_MASTER.md`
5. `agent/AGENT_BUILD_INSTRUCTIONS.md`

## Projektstatus
Dieses Paket liefert ein **ausgebautes Fundament**. Es ist nicht das komplett fertige MMO,
aber es ist eine **brauchbare, nicht-leere Arbeitsbasis**, die weiter implementiert werden kann.
```

---

DATEI
README_ADMIN.md

PFAD
/admin-tools/README_ADMIN.md

INHALT
```
# Admin Tools

Hier liegen GM- und World-Editor-Hinweise.

## Geplant
- WorldEditor.ts
- TerrainBrush.ts
- ObjectPlacement.ts
- GMControlPanel.ts
- LiveWorldControl.ts

Das Mount `gm_giraffe` kann später den Admin-Modus markieren.
```

---

DATEI
AGENT_BUILD_INSTRUCTIONS.md

PFAD
/agent/AGENT_BUILD_INSTRUCTIONS.md

INHALT
```
# Agent Build Instructions

1. Lies zuerst alle Lock-Dateien.
2. Verändere keine Kernregeln.
3. Baue in der vorgegebenen Reihenfolge.
4. Halte Serverlogik serverseitig.
5. Nutze das Clientgerüst nur für Darstellung.

## Wichtige Reihenfolge
server core -> world -> observer -> npc -> civilization -> economy -> gameplay -> brain -> assets -> gm editor -> client -> integrations
```

---

DATEI
AI_AGENT_FAILSAFE_RULES.md

PFAD
/agent/AI_AGENT_FAILSAFE_RULES.md

INHALT
```
# AI Agent Failsafe Rules

- Do not remove observer simulation
- Do not remove chunk size 64x64
- Do not remove NPC memory/genealogy
- Do not remove politics
- Do not remove matrix energy
- Do not remove brain
- Do not remove GM editor
- Do not remove GLB pipeline
```

---

DATEI
ARELORIAN_SUPER_PROMPT.md

PFAD
/agent/ARELORIAN_SUPER_PROMPT.md

INHALT
```
# Arelorian Super Prompt

Build a persistent browser MMORPG with:
- procedural world
- 64x64 chunks
- observer-driven simulation
- NPC personality, memory, genealogy, politics
- player civilization and NPC civilization
- matrix energy economy
- 13-node server brain
- GLB asset pipeline
- GM world editor

Do not simplify it into a prototype app.
```

---

DATEI
package.json

PFAD
/client/package.json

INHALT
```
{
  "name": "areloria-client",
  "version": "0.2.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "three": "^0.169.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^5.4.0"
  }
}
```

---

DATEI
index.html

PFAD
/client/public/index.html

INHALT
```
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
    <title>Arelorian Client</title>
  </head>
  <body>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

---

DATEI
AssetLoader.ts

PFAD
/client/src/assets/AssetLoader.ts

INHALT
```
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class AssetLoader {
  private loader = new GLTFLoader();

  load(path: string) {
    return new Promise((resolve, reject) => {
      this.loader.load(path, (gltf) => resolve(gltf.scene), undefined, reject);
    });
  }
}
```

---

DATEI
ModelRegistry.ts

PFAD
/client/src/assets/ModelRegistry.ts

INHALT
```
export const ModelRegistry = {
  uschi: { path: "/assets/models/characters/uschi_gossip.glb", scale: 1 },
  castle_wall: { path: "/assets/models/buildings/castle_wall.glb", scale: 1 },
  watch_tower: { path: "/assets/models/buildings/castle_watch_tower.glb", scale: 1 },
  tree_spring: { path: "/assets/models/vegetation/tree_oak_spring.glb", scale: 1 },
  gm_giraffe: { path: "/assets/models/admin/gm_giraffe.glb", scale: 1 }
};
```

---

DATEI
PlacementTool.ts

PFAD
/client/src/editor/PlacementTool.ts

INHALT
```
export class PlacementTool {
  place(type: string, position: { x: number; y: number; z: number }) {
    return { action: "place", type, position };
  }
}
```

---

DATEI
SelectionTool.ts

PFAD
/client/src/editor/SelectionTool.ts

INHALT
```
export class SelectionTool {
  select(entityId: string) {
    return { selected: entityId };
  }
}
```

---

DATEI
WorldEditorUI.ts

PFAD
/client/src/editor/WorldEditorUI.ts

INHALT
```
export function openWorldEditorUI() {
  const el = document.createElement("div");
  el.textContent = "GM World Editor";
  el.style.position = "fixed";
  el.style.right = "12px";
  el.style.bottom = "12px";
  el.style.padding = "10px 14px";
  el.style.background = "#2b2b2b";
  el.style.color = "#fff";
  document.body.appendChild(el);
}
```

---

DATEI
renderer.ts

PFAD
/client/src/engine/renderer.ts

INHALT
```
import * as THREE from "three";

export function initRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshBasicMaterial({ color: 0x44aa88 })
  );

  scene.add(cube);

  function animate() {
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();
}
```

---

DATEI
worldLoader.ts

PFAD
/client/src/engine/worldLoader.ts

INHALT
```
export function loadWorldChunk(chunkX: number, chunkY: number) {
  return {
    chunkX,
    chunkY,
    status: "requested"
  };
}
```

---

DATEI
playerController.ts

PFAD
/client/src/gameplay/playerController.ts

INHALT
```
export class PlayerController {
  move(direction: string) {
    return {
      type: "move",
      direction
    };
  }
}
```

---

DATEI
main.ts

PFAD
/client/src/main.ts

INHALT
```
import { initRenderer } from "./engine/renderer";
import { connectSocket } from "./networking/websocketClient";
import { renderHUD } from "./ui/hud";

const canvas = document.createElement("canvas");
document.body.style.margin = "0";
document.body.appendChild(canvas);

initRenderer(canvas);
connectSocket();
renderHUD();
```

---

DATEI
websocketClient.ts

PFAD
/client/src/networking/websocketClient.ts

INHALT
```
export function connectSocket() {
  const ws = new WebSocket(`ws://${location.hostname}:3000`);

  ws.onopen = () => console.log("Connected to Arelorian server");
  ws.onmessage = (msg) => console.log("Server:", msg.data);

  return ws;
}
```

---

DATEI
chat.ts

PFAD
/client/src/ui/chat.ts

INHALT
```
export function renderChat() {
  const el = document.createElement("div");
  el.textContent = "Chat placeholder";
  el.style.position = "fixed";
  el.style.left = "12px";
  el.style.bottom = "12px";
  el.style.padding = "8px 12px";
  el.style.background = "rgba(0,0,0,0.55)";
  el.style.color = "#fff";
  document.body.appendChild(el);
}
```

---

DATEI
hud.ts

PFAD
/client/src/ui/hud.ts

INHALT
```
export function renderHUD() {
  const hud = document.createElement("div");
  hud.textContent = "Arelorian HUD online";
  hud.style.position = "fixed";
  hud.style.top = "12px";
  hud.style.left = "12px";
  hud.style.padding = "8px 12px";
  hud.style.background = "rgba(0,0,0,0.55)";
  hud.style.color = "#fff";
  hud.style.fontFamily = "sans-serif";
  document.body.appendChild(hud);
}
```

---

DATEI
inventory.ts

PFAD
/client/src/ui/inventory.ts

INHALT
```
export function renderInventory() {
  const el = document.createElement("div");
  el.textContent = "Inventory placeholder";
  el.style.position = "fixed";
  el.style.right = "12px";
  el.style.top = "12px";
  el.style.padding = "8px 12px";
  el.style.background = "rgba(0,0,0,0.55)";
  el.style.color = "#fff";
  document.body.appendChild(el);
}
```

---

DATEI
tsconfig.json

PFAD
/client/tsconfig.json

INHALT
```
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true
  },
  "include": [
    "src/**/*"
  ]
}
```

---

DATEI
ASSET_PIPELINE.md

PFAD
/docs/ASSET_PIPELINE.md

INHALT
```
# Asset Pipeline

## GLB-Regeln
Terrain ist kein GLB-Bodenteppich. GLB wird für NPCs, Monster, Gebäude, Bäume, Props und Reittiere verwendet.

## Struktur
- characters/
- monsters/
- buildings/
- props/
- vegetation/
- admin/

## Validierung
Jedes Asset sollte idealerweise besitzen:
- sauberen Ursprungspunkt
- sinnvolle Skalierung
- optionales Rig/Skeleton
- optional Animationen
```

---

DATEI
BRAIN_SYSTEM.md

PFAD
/docs/BRAIN_SYSTEM.md

INHALT
```
# Brain System

Das Server Brain ist eine heuristische Meta-Schicht.

## Aufgaben
- Spannungen erkennen
- Politiksignale lesen
- Marktanomalien erkennen
- Orakelvisionen speisen
- Ereignisse anstoßen

## 13-Punkte-Modell
- 4 Weltpunkte
- 4 Interpretationspunkte
- 4 Dynamikpunkte
- 1 Zentrum

Das Zentrum aggregiert Weltzustand, NPC-Memory, Ökonomie, Politik und Geschichte.
```

---

DATEI
BUILD_SEQUENCE_MASTER.md

PFAD
/docs/BUILD_SEQUENCE_MASTER.md

INHALT
```
# Build Sequence Master

1. Server core und bootstrap
2. World tick
3. Chunk- und Observer-System
4. Persistence
5. NPC personality + memory + genealogy
6. Civilization + politics
7. Economy + Matrix energy
8. Player, skills, combat, loot
9. Dungeons, ruins, oracle, history
10. Brain + field analyzer
11. Asset registry + GLB loading
12. GM editor
13. Client renderer + websocket sync
14. Firebase/AWS integration
```

---

DATEI
DIALOGUE_SYSTEM.md

PFAD
/docs/DIALOGUE_SYSTEM.md

INHALT
```
# Dialogue System

The dialogue system combines:
- personality traits
- family and lineage
- culture
- religion
- memory
- world events
- oracle/world history signals

## Pipeline
1. build context
2. choose tone
3. choose dialogue pool
4. inject dynamic references
5. return line + optional quest/world hint
```

---

DATEI
DUNGEON_SYSTEM.md

PFAD
/docs/DUNGEON_SYSTEM.md

INHALT
```
# Dungeon System

Dungeons are generated from seeds, ruins and regional history.

## Room types
- hall
- shrine
- monster_lair
- collapsed_passage
- treasure_room
- prison
- relic_chamber

## Inputs
- biome
- ruin class
- ancient civilization markers
- oracle hints
- current danger rating
```

---

DATEI
ECONOMY_MODEL.md

PFAD
/docs/ECONOMY_MODEL.md

INHALT
```
# Economy Model

Die Wirtschaft verbindet Ressourcen, Spieler, NPCs, Märkte und Städte.

## Kernelemente
- Stadtmärkte
- Handelsrouten
- NPC-Händler
- Spielerhandel
- Matrix-Energie
- politische und kriegerische Markteinflüsse

## Preisfaktoren
- Angebot
- Nachfrage
- Krieg
- Knappheit
- Transport
- Stadtsteuern
```

---

DATEI
GM_EDITOR.md

PFAD
/docs/GM_EDITOR.md

INHALT
```
# GM Editor

Der GM-Editor erlaubt Live-Eingriffe in die Welt.

## Fähigkeiten
- Objekte setzen
- NPCs spawnen
- Strukturen verschieben
- Terrainmarker bearbeiten
- Events starten
- Weltzustände prüfen

## Regel
Der Editor ist serverautoritativ. Der Client darf nur Befehle senden.
```

---

DATEI
MASTER_DESIGN_BIBLE.md

PFAD
/docs/MASTER_DESIGN_BIBLE.md

INHALT
```
# Master Design Bible

## Vision
Arelorian ist ein persistentes Browser-MMORPG mit emergenter Weltlogik. Die Welt ist theoretisch unendlich,
wird prozedural erzeugt und über Beobachterzonen simuliert.

## Fünf Axiome
1. Informationsfeld
2. Emergenz
3. Persistenz
4. Ouroboros-Zyklus
5. Beobachter

## Welt
- Prozedurale Welt
- Chunks 64x64
- Biome als natürliche Grenzen
- Ruinen, Dungeons und historische Schichten

## Zivilisationen
- Guild -> Village -> City -> Kingdom -> Nation
- Spieler und NPCs besitzen dieselben zivilisatorischen Rechte

## NPCs
- Personality
- DNA/Traits
- Genealogie und Häuser
- Memory und Shared Memory
- Kultur und Religion
- Politik und Familiengeschichte

## Gameplay
- klassenloses Skill-System
- Skills durch Nutzung
- Stamina als Kernressource
- Diablo-artiges Loot
- Magie als Skillzweig
- Crafting, Handel und Weltwirtschaft

## Systeme
- Server Brain mit 13-Punkte-Modell
- Dudenregister und Orakel
- Matrix-Energie
- Weltwunder und Schattenregisterportal
- GM-Editor
- GLB-Asset-Pipeline
```

---

DATEI
MASTER_SYSTEM_CHECKLIST.md

PFAD
/docs/MASTER_SYSTEM_CHECKLIST.md

INHALT
```
# Master System Checklist

## Welt
- [x] World generator
- [x] 64x64 chunk system
- [x] Observer simulation
- [x] Biome and terrain
- [x] World tick
- [x] Dungeons
- [x] Ruins

## NPC
- [x] Personality engine
- [x] Memory engine
- [x] Shared memory
- [x] Genealogy
- [x] DNA and traits
- [x] Dialogue
- [x] Quests

## Gesellschaft
- [x] Civilization engine
- [x] NPC politics
- [x] Player politics
- [x] Governments
- [x] Taxes
- [x] War

## Gameplay
- [x] Players
- [x] Skills
- [x] Inventory
- [x] Combat
- [x] Loot
- [x] Magic

## Spezial
- [x] Matrix energy
- [x] Dudenregister
- [x] Oracle
- [x] Server brain
- [x] GLB pipeline
- [x] GM editor
```

---

DATEI
MONSTER_SYSTEM.md

PFAD
/docs/MONSTER_SYSTEM.md

INHALT
```
# Monster System

Monsters are generated from:
- species
- dna
- mutation
- biome
- pack memory
- rarity

This allows regional monster lines such as frost wolves, swamp alphas or cave mutants.
```

---

DATEI
NPC_SYSTEM.md

PFAD
/docs/NPC_SYSTEM.md

INHALT
```
# NPC System

## Fünf Einflussfaktoren
- DNA / Traits
- Familie / Genealogie
- Kultur / Herkunft
- Religion / Weltbild
- Erfahrung / Memory

## Memory-Ebenen
- Local memory
- Social memory
- Faction memory
- Historical memory
- Oracle memory

## Verhalten
NPCs können:
- arbeiten
- handeln
- Gerüchte verbreiten
- Familien gründen
- Politik betreiben
- Kriege beginnen oder vermeiden
```

---

DATEI
PERSISTENCE_MODEL.md

PFAD
/docs/PERSISTENCE_MODEL.md

INHALT
```
# Persistence Model

Persistent storage is split by concern:
- world chunks
- players
- civilizations
- history / dudenregister
- snapshots
- asset metadata
```

---

DATEI
STRUCTURE_SYSTEM.md

PFAD
/docs/STRUCTURE_SYSTEM.md

INHALT
```
# Structure System

Structures connect GLB assets to persistent world entities.

## Types
- player_structure
- npc_structure
- civilization_structure
- ruin_structure
- wonder_structure
- matrix_protected_structure

## Examples
- house
- gate
- wall
- watch tower
- workshop
- temple
- shadow register portal
```

---

DATEI
WORLD_GENERATION.md

PFAD
/docs/WORLD_GENERATION.md

INHALT
```
# World Generation

Die Welt wird aus `seed + coordinates` erzeugt.

## Chunkstruktur
Jeder Chunk enthält:
- Terrain
- Biomtyp
- Ressourcen
- Objektliste
- Strukturen
- Ruinen oder Dungeon-Eingänge

## Simulationsebenen
1. Dormant
2. Background simulation
3. Active simulation
4. Full simulation

Nur beobachtete Regionen werden hochauflösend simuliert.
```

---

DATEI
DO_NOT_SIMPLIFY.md

PFAD
/final-lock/DO_NOT_SIMPLIFY.md

INHALT
```
# Do Not Simplify

Nicht reduzieren auf:
- Demo
- UI-Mockup
- Singleplayer-Sandbox
- nur Terrain-Viewer
- nur Client ohne Weltsimulation
```

---

DATEI
FINAL_TRUTH.md

PFAD
/final-lock/FINAL_TRUTH.md

INHALT
```
# Final Truth

Dieses Projekt ist ein persistentes MMORPG und darf nicht auf ein Mockup oder eine Einzelspieler-Demo reduziert werden.

Pflicht:
- 64x64 chunks
- observer simulation
- server-authoritative logic
- NPC memory + genealogy
- player and NPC politics
- matrix energy
- 13-node brain
- GM editor
- GLB pipeline
```

---

DATEI
REQUIRED_SYSTEMS_MATRIX.md

PFAD
/final-lock/REQUIRED_SYSTEMS_MATRIX.md

INHALT
```
# Required Systems Matrix

## Welt
observer, chunks, terrain, biomes, tick, dungeons, ruins

## NPC
personality, memory, shared memory, genealogy, dna, dialogue

## Gesellschaft
civilization, politics, government, tax, war, diplomacy

## Gameplay
player, skills, inventory, combat, loot, magic

## Spezial
oracle, dudenregister, matrix energy, brain, gm editor, glb pipeline
```

---

DATEI
biome-definitions.json

PFAD
/game-data/biomes/biome-definitions.json

INHALT
```
{
  "forest": {
    "temperature": "mild",
    "resources": [
      "wood",
      "berries",
      "animals"
    ]
  },
  "desert": {
    "temperature": "hot",
    "resources": [
      "sand",
      "salt",
      "crystals"
    ]
  },
  "mountain": {
    "temperature": "cold",
    "resources": [
      "stone",
      "iron",
      "gold"
    ]
  }
}
```

---

DATEI
cultures.json

PFAD
/game-data/cultures/cultures.json

INHALT
```
{
  "forest_tribes": {
    "style": "organic"
  },
  "mountain_clans": {
    "style": "stone"
  },
  "desert_nomads": {
    "style": "lightweight"
  }
}
```

---

DATEI
matrix-energy-rules.json

PFAD
/game-data/economy/matrix-energy-rules.json

INHALT
```
{
  "currency": "matrix_energy",
  "npcCannotDestroyProtectedStructures": true
}
```

---

DATEI
dudenregister-schema.json

PFAD
/game-data/history/dudenregister-schema.json

INHALT
```
{
  "events": [
    "war",
    "collapse",
    "ruin",
    "wonder",
    "dynasty",
    "oracle"
  ]
}
```

---

DATEI
loot-tables.json

PFAD
/game-data/items/loot-tables.json

INHALT
```
{
  "wolf": [
    "wolf_pelt",
    "fang",
    "alpha_claw"
  ],
  "skeleton": [
    "bone_fragment",
    "rusted_blade",
    "grave_ring"
  ],
  "ruin_cache": [
    "ancient_coin",
    "relic_fragment",
    "forgotten_sigil"
  ]
}
```

---

DATEI
spell-schools.json

PFAD
/game-data/magic/spell-schools.json

INHALT
```
{
  "nature": [
    "root_bind",
    "healing_moss"
  ],
  "shadow": [
    "dark_bolt",
    "fear_whisper"
  ],
  "resonance": [
    "echo_wave",
    "field_tone"
  ],
  "protection": [
    "ward_shield",
    "holy_barrier"
  ],
  "ritual": [
    "ancestral_call",
    "portal_trace"
  ]
}
```

---

DATEI
npc-archetypes.json

PFAD
/game-data/npc/npc-archetypes.json

INHALT
```
{
  "merchant": {},
  "guard": {},
  "oracle": {},
  "gossip": {
    "example": "Uschi die Geschminkte"
  }
}
```

---

DATEI
government-types.json

PFAD
/game-data/politics/government-types.json

INHALT
```
{
  "monarchy": {},
  "council": {},
  "theocracy": {},
  "trade_republic": {},
  "warband": {}
}
```

---

DATEI
quest-registry.json

PFAD
/game-data/quests/quest-registry.json

INHALT
```
{
  "ruin_hunter": {
    "giver": "uschi_gossip",
    "objective": "find_ruins"
  },
  "watchtower_supply": {
    "giver": "city_guard",
    "objective": "deliver_supplies"
  }
}
```

---

DATEI
religions.json

PFAD
/game-data/religions/religions.json

INHALT
```
{
  "sun_order": {
    "ethos": "honor"
  },
  "shadow_cult": {
    "ethos": "secrecy"
  },
  "ancestor_faith": {
    "ethos": "lineage"
  }
}
```

---

DATEI
skills.json

PFAD
/game-data/skills/skills.json

INHALT
```
{
  "combat": {},
  "woodcutting": {},
  "mining": {},
  "smithing": {},
  "magic": {},
  "fishing": {}
}
```

---

DATEI
README_INTEGRATIONS.md

PFAD
/integrations/README_INTEGRATIONS.md

INHALT
```
# Integrations

Hier werden produktive Integrationen abgelegt:
- Firebase
- AWS
- WebSocket Gateway
- Datenbankadapter

Wichtig: Keine Secrets hart in Dateien schreiben.
```

---

DATEI
elasticacheAdapter.ts

PFAD
/integrations/aws/elasticacheAdapter.ts

INHALT
```
export function initElastiCache() {
  return {
    status: "elasticache-adapter-placeholder"
  };
}
```

---

DATEI
postgresAdapter.ts

PFAD
/integrations/aws/postgresAdapter.ts

INHALT
```
export function initPostgres() {
  return {
    status: "postgres-adapter-placeholder"
  };
}
```

---

DATEI
firebase-config.ts

PFAD
/integrations/firebase/firebase-config.ts

INHALT
```
export const firebaseConfig = {
  note: "Fill with real Firebase credentials during deployment"
};
```

---

DATEI
firestorePersistence.ts

PFAD
/integrations/firebase/firestorePersistence.ts

INHALT
```
export function initFirestorePersistence() {
  return {
    status: "firestore-persistence-placeholder"
  };
}
```

---

DATEI
awsGatewayBridge.ts

PFAD
/integrations/websocket-gateway/awsGatewayBridge.ts

INHALT
```
export function initAwsGatewayBridge() {
  return {
    status: "aws-websocket-gateway-placeholder"
  };
}
```

---

DATEI
package.json

PFAD
/server/package.json

INHALT
```
{
  "name": "areloria-server",
  "version": "0.2.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "@types/ws": "^8.5.12",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

---

DATEI
ServerBootstrap.ts

PFAD
/server/src/core/ServerBootstrap.ts

INHALT
```
import express from "express";
import { createServer } from "node:http";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { WorldTick } from "./WorldTick.js";

export class ServerBootstrap {
  start() {
    const app = express();
    const httpServer = createServer(app);

    app.get("/health", (_req, res) => {
      res.json({
        ok: true,
        project: "ARELORIAN MMORPG",
        version: "0.2.0"
      });
    });

    const ws = new GameWebSocketServer(httpServer);
    ws.start();

    const tick = new WorldTick();
    const port = Number(process.env.PORT || 3000);

    httpServer.listen(port, () => {
      console.log(`Arelorian server listening on ${port}`);
      tick.start();
    });
  }
}
```

---

DATEI
WorldTick.ts

PFAD
/server/src/core/WorldTick.ts

INHALT
```
export class WorldTick {
  private timer: NodeJS.Timeout | null = null;
  private tickCount = 0;

  start() {
    this.timer = setInterval(() => this.tick(), 100);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  tick() {
    this.tickCount += 1;
    if (this.tickCount % 10 === 0) {
      console.log("World Tick", this.tickCount);
    }
  }
}
```

---

DATEI
index.ts

PFAD
/server/src/index.ts

INHALT
```
import { ServerBootstrap } from "./core/ServerBootstrap.js";

new ServerBootstrap().start();
```

---

DATEI
BehaviorTree.ts

PFAD
/server/src/modules/ai/BehaviorTree.ts

INHALT
```
export class BehaviorTree {
  run(npc: any) {
    if (npc.needs?.sleep) return "sleep";
    if (npc.needs?.hunger) return "eat";
    if (npc.job) return "work";
    return "wander";
  }
}
```

---

DATEI
NPCBrain.ts

PFAD
/server/src/modules/ai/NPCBrain.ts

INHALT
```
import { BehaviorTree } from "./BehaviorTree.js";

export class NPCBrain {
  private tree = new BehaviorTree();

  update(npc: any) {
    const action = this.tree.run(npc);
    npc.currentAction = action;
    return action;
  }
}
```

---

DATEI
TaskSystem.ts

PFAD
/server/src/modules/ai/TaskSystem.ts

INHALT
```
export class TaskSystem {
  execute(npc: any, action: string) {
    switch (action) {
      case "wander":
        return { action, destination: "random_nearby" };
      case "work":
        return { action, destination: npc.jobLocation ?? "workplace" };
      case "eat":
        return { action, destination: "tavern" };
      case "sleep":
        return { action, destination: "home" };
      default:
        return { action: "idle" };
    }
  }
}
```

---

DATEI
AssetRegistry.ts

PFAD
/server/src/modules/asset-registry/AssetRegistry.ts

INHALT
```
export class AssetRegistry {
  private assets = new Map<string, any>();

  register(id: string, data: any) {
    this.assets.set(id, data);
  }

  get(id: string) {
    return this.assets.get(id) ?? null;
  }

  list() {
    return Array.from(this.assets.entries()).map(([id, data]) => ({ id, ...data }));
  }
}
```

---

DATEI
NPCAssets.ts

PFAD
/server/src/modules/asset-registry/NPCAssets.ts

INHALT
```
export const NPCAssets = {
  uschi_gossip: {
    assetId: "uschi_gossip",
    model: "/assets/models/characters/uschi_gossip.glb",
    category: "npc",
    animations: ["idle", "talk", "laugh", "cough"]
  },
  warrior_male: {
    assetId: "warrior_male",
    model: "/assets/models/characters/warrior_male.glb",
    category: "player_or_npc",
    animations: ["idle", "walk", "attack"]
  },
  warrior_female: {
    assetId: "warrior_female",
    model: "/assets/models/characters/warrior_female.glb",
    category: "player_or_npc",
    animations: ["idle", "walk", "attack"]
  }
};
```

---

DATEI
StructureAssets.ts

PFAD
/server/src/modules/asset-registry/StructureAssets.ts

INHALT
```
export const StructureAssets = {
  castle_wall: {
    assetId: "castle_wall",
    type: "structure",
    model: "/assets/models/buildings/castle_wall.glb",
    collision: true
  },
  castle_gate: {
    assetId: "castle_gate",
    type: "interactive_structure",
    model: "/assets/models/buildings/castle_gate.glb",
    collision: true,
    states: ["open", "closed", "locked", "damaged", "destroyed"]
  },
  castle_watch_tower: {
    assetId: "castle_watch_tower",
    type: "defense_structure",
    model: "/assets/models/buildings/castle_watch_tower.glb",
    collision: true
  }
};
```

---

DATEI
VegetationAssets.ts

PFAD
/server/src/modules/asset-registry/VegetationAssets.ts

INHALT
```
export const VegetationAssets = {
  tree_oak_young: { model: "/assets/models/vegetation/tree_oak_young.glb", category: "vegetation", growthStage: 0 },
  tree_oak_spring: { model: "/assets/models/vegetation/tree_oak_spring.glb", category: "vegetation", growthStage: 1 },
  tree_oak_summer: { model: "/assets/models/vegetation/tree_oak_summer.glb", category: "vegetation", growthStage: 2 },
  tree_oak_autumn: { model: "/assets/models/vegetation/tree_oak_autumn.glb", category: "vegetation", growthStage: 3 }
};
```

---

DATEI
BrainFieldAnalyzer.ts

PFAD
/server/src/modules/brain/BrainFieldAnalyzer.ts

INHALT
```
export class BrainFieldAnalyzer {
  analyzeField(values: unknown[]) {
    return {
      activeNodes: values.length,
      result: "field-analysis-placeholder"
    };
  }
}
```

---

DATEI
HeuristicWorldBrain.ts

PFAD
/server/src/modules/brain/HeuristicWorldBrain.ts

INHALT
```
export class HeuristicWorldBrain {
  private readonly nodes = new Array(13).fill(null);

  analyze(input: unknown) {
    return {
      nodes: this.nodes.length,
      summary: "analysis-placeholder",
      input
    };
  }
}
```

---

DATEI
CivilizationEngine.ts

PFAD
/server/src/modules/civilization/CivilizationEngine.ts

INHALT
```
export class CivilizationEngine {
  createVillage(guildMembers: number) {
    if (guildMembers < 50) return null;
    return {
      type: "village",
      population: guildMembers,
      createdAt: Date.now()
    };
  }
}
```

---

DATEI
SettlementSystem.ts

PFAD
/server/src/modules/civilization/SettlementSystem.ts

INHALT
```
export class SettlementSystem {
  createSettlement(type: "village" | "city" | "kingdom" | "nation", ownerId: string) {
    return {
      type,
      ownerId,
      createdAt: Date.now()
    };
  }
}
```

---

DATEI
CombatSystem.ts

PFAD
/server/src/modules/combat/CombatSystem.ts

INHALT
```
export class CombatSystem {
  attack(attacker: any, defender: any) {
    if (attacker.stamina <= 0) return { success: false, reason: "no_stamina" };

    attacker.stamina -= 10;

    const hitChance = this.hitChance(attacker, defender);
    if (Math.random() > hitChance) {
      return { success: true, hit: false, damage: 0 };
    }

    const damage = this.calculateDamage(attacker, defender);
    defender.health = Math.max(0, defender.health - damage);

    return {
      success: true,
      hit: true,
      damage,
      defenderHealth: defender.health
    };
  }

  hitChance(attacker: any, defender: any) {
    const atk = attacker.skills?.combat?.level ?? 1;
    const def = defender.skills?.combat?.level ?? 1;
    return Math.min(0.95, Math.max(0.1, atk / (atk + def)));
  }

  calculateDamage(attacker: any, defender: any) {
    const atk = attacker.skills?.combat?.level ?? 1;
    const def = defender.skills?.combat?.level ?? 1;
    const base = 5 + atk;
    const mitigation = Math.floor(def * 0.3);
    return Math.max(1, base - mitigation + Math.floor(Math.random() * 4));
  }
}
```

---

DATEI
DialogueContext.ts

PFAD
/server/src/modules/dialogue/DialogueContext.ts

INHALT
```
export function buildDialogueContext(npc: any, player: any, world: any) {
  return {
    npcId: npc.id,
    playerId: player?.id ?? null,
    traits: npc.traits ?? {},
    lineage: npc.lineage ?? null,
    culture: npc.culture ?? null,
    religion: npc.religion ?? null,
    memory: npc.memory ?? [],
    worldEvents: world?.events ?? [],
    oracleSignals: world?.oracleSignals ?? []
  };
}
```

---

DATEI
DialogueEngine.ts

PFAD
/server/src/modules/dialogue/DialogueEngine.ts

INHALT
```
import { buildDialogueContext } from "./DialogueContext.js";
import { DialogueGenerator } from "./DialogueGenerator.js";

export class DialogueEngine {
  private generator = new DialogueGenerator();

  talk(npc: any, player: any, world: any) {
    const context = buildDialogueContext(npc, player, world);
    return this.generator.generate(context);
  }
}
```

---

DATEI
DialogueGenerator.ts

PFAD
/server/src/modules/dialogue/DialogueGenerator.ts

INHALT
```
import { DialogueTemplates } from "./DialogueTemplates.js";

export class DialogueGenerator {
  generate(context: any) {
    const mood = context.traits?.aggression > 0.7 ? "warning" : "greeting";
    const pool = DialogueTemplates[mood] ?? ["..."];
    return {
      line: pool[Math.floor(Math.random() * pool.length)],
      contextSummary: {
        culture: context.culture,
        religion: context.religion
      }
    };
  }
}
```

---

DATEI
DialogueTemplates.ts

PFAD
/server/src/modules/dialogue/DialogueTemplates.ts

INHALT
```
export const DialogueTemplates = {
  greeting: [
    "Na Süßer, suchst du Abenteuer?",
    "Du siehst aus, als hättest du Ärger im Gepäck.",
    "Setz dich, ich erzähl dir was Interessantes."
  ],
  rumor: [
    "Im Nordwald wurden alte Mauern gesehen.",
    "Die Händler reden von seltsamen Kreaturen im Moor.",
    "Ein Königreich im Osten ist nervös."
  ],
  warning: [
    "Geh da nicht unvorbereitet hinein.",
    "Manche Wege fressen ganze Blutlinien.",
    "Nicht jede Ruine will entdeckt werden."
  ]
};
```

---

DATEI
DungeonGenerator.ts

PFAD
/server/src/modules/dungeon/DungeonGenerator.ts

INHALT
```
export class DungeonGenerator {
  generate(seed: number) {
    const rooms = [];
    const roomCount = 4 + Math.floor(Math.abs(Math.sin(seed)) * 6);
    for (let i = 0; i < roomCount; i++) {
      rooms.push({
        id: i,
        type: this.randomRoom(seed + i),
        danger: 1 + (i % 5)
      });
    }
    return { seed, rooms };
  }

  randomRoom(seed: number) {
    const types = [
      "hall",
      "treasure_room",
      "monster_lair",
      "collapsed_passage",
      "ancient_shrine"
    ];
    return types[Math.abs(Math.floor(seed)) % types.length];
  }
}
```

---

DATEI
EconomyEngine.ts

PFAD
/server/src/modules/economy/EconomyEngine.ts

INHALT
```
export class EconomyEngine {
  private markets = new Map<string, { goods: Record<string, number> }>();

  registerMarket(id: string) {
    this.markets.set(id, { goods: {} });
  }

  trade(marketId: string, item: string, amount: number) {
    const market = this.markets.get(marketId);
    if (!market) return null;
    if (!market.goods[item]) market.goods[item] = 0;
    market.goods[item] += amount;
    return market.goods[item];
  }
}
```

---

DATEI
MatrixEnergySystem.ts

PFAD
/server/src/modules/economy/MatrixEnergySystem.ts

INHALT
```
export class MatrixEnergySystem {
  private balances = new Map<string, number>();

  add(playerId: string, amount: number) {
    const current = this.balances.get(playerId) || 0;
    this.balances.set(playerId, current + amount);
  }

  consume(playerId: string, amount: number) {
    const current = this.balances.get(playerId) || 0;
    if (current < amount) return false;
    this.balances.set(playerId, current - amount);
    return true;
  }

  getBalance(playerId: string) {
    return this.balances.get(playerId) || 0;
  }
}
```

---

DATEI
TradeRoutes.ts

PFAD
/server/src/modules/economy/TradeRoutes.ts

INHALT
```
export class TradeRoutes {
  createRoute(a: string, b: string) {
    return {
      from: a,
      to: b,
      active: true
    };
  }
}
```

---

DATEI
DudenregisterHistory.ts

PFAD
/server/src/modules/history/DudenregisterHistory.ts

INHALT
```
export class DudenregisterHistory {
  private history: any[] = [];

  record(event: any) {
    this.history.push(event);
  }

  getHistory() {
    return this.history;
  }
}
```

---

DATEI
WorldSnapshotSystem.ts

PFAD
/server/src/modules/history/WorldSnapshotSystem.ts

INHALT
```
export class WorldSnapshotSystem {
  private snapshots: any[] = [];

  save(worldState: any) {
    this.snapshots.push({
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(worldState))
    });
  }

  latest() {
    return this.snapshots[this.snapshots.length - 1] ?? null;
  }
}
```

---

DATEI
InventorySystem.ts

PFAD
/server/src/modules/inventory/InventorySystem.ts

INHALT
```
export class InventorySystem {
  addItem(player: any, item: any) {
    player.inventory.push(item);
    return player.inventory;
  }

  removeItem(player: any, itemId: string) {
    player.inventory = player.inventory.filter((item: any) => item.id !== itemId);
    return player.inventory;
  }
}
```

---

DATEI
LootTables.ts

PFAD
/server/src/modules/loot/LootTables.ts

INHALT
```
export const LootTables = {
  wolf: [
    { id: "wolf_pelt", chance: 0.65, rarity: "common" },
    { id: "fang", chance: 0.3, rarity: "common" },
    { id: "alpha_claw", chance: 0.05, rarity: "rare" }
  ],
  skeleton: [
    { id: "bone_fragment", chance: 0.7, rarity: "common" },
    { id: "rusted_blade", chance: 0.2, rarity: "uncommon" },
    { id: "grave_ring", chance: 0.03, rarity: "rare" }
  ],
  ruin_cache: [
    { id: "ancient_coin", chance: 0.5, rarity: "uncommon" },
    { id: "relic_fragment", chance: 0.2, rarity: "rare" },
    { id: "forgotten_sigil", chance: 0.02, rarity: "legendary" }
  ]
};
```

---

DATEI
MagicSystem.ts

PFAD
/server/src/modules/magic/MagicSystem.ts

INHALT
```
export class MagicSystem {
  cast(caster: any, spell: any, target: any) {
    if ((caster.mana ?? 0) < spell.cost) {
      return { success: false, reason: "not_enough_mana" };
    }

    caster.mana -= spell.cost;

    return {
      success: true,
      spell: spell.id,
      target: target?.id ?? null,
      effect: spell.effect ?? "generic_magic_effect"
    };
  }
}
```

---

DATEI
MonsterDNA.ts

PFAD
/server/src/modules/monster/MonsterDNA.ts

INHALT
```
export function generateMonsterDNA(species: string) {
  return {
    species,
    strength: Math.random(),
    speed: Math.random(),
    aggression: Math.random(),
    intelligence: Math.random(),
    resilience: Math.random()
  };
}
```

---

DATEI
MonsterMutation.ts

PFAD
/server/src/modules/monster/MonsterMutation.ts

INHALT
```
export function mutateMonster(dna: any, biome: string) {
  const clone = { ...dna, mutations: [] as string[] };

  if (biome === "snow") {
    clone.resilience += 0.2;
    clone.mutations.push("frost_resistance");
  }

  if (biome === "swamp") {
    clone.aggression += 0.15;
    clone.mutations.push("swamp_hunger");
  }

  if (Math.random() < 0.08) {
    clone.mutations.push("rare_variant");
  }

  return clone;
}
```

---

DATEI
MonsterSpawner.ts

PFAD
/server/src/modules/monster/MonsterSpawner.ts

INHALT
```
import { generateMonsterDNA } from "./MonsterDNA.js";
import { mutateMonster } from "./MonsterMutation.js";

export class MonsterSpawner {
  spawn(species: string, biome: string) {
    const dna = generateMonsterDNA(species);
    return mutateMonster(dna, biome);
  }
}
```

---

DATEI
NPCDialogueSystem.ts

PFAD
/server/src/modules/npc/NPCDialogueSystem.ts

INHALT
```
export class NPCDialogueSystem {
  talk(npc: any, worldSignals: any = {}) {
    const lines = npc.dialogueLines || [
      "Die Welt flüstert merkwürdige Dinge.",
      "Ich habe da ein Gerücht gehört."
    ];

    return {
      line: lines[Math.floor(Math.random() * lines.length)],
      signals: worldSignals
    };
  }
}
```

---

DATEI
NPCGenealogyEngine.ts

PFAD
/server/src/modules/npc/NPCGenealogyEngine.ts

INHALT
```
export class NPCGenealogyEngine {
  createLineage(id: string, house: string, parents: string[] = []) {
    return {
      id,
      house,
      parents,
      children: [] as string[]
    };
  }

  addChild(lineage: any, childId: string) {
    lineage.children.push(childId);
    return lineage;
  }
}
```

---

DATEI
NPCMemoryEngine.ts

PFAD
/server/src/modules/npc/NPCMemoryEngine.ts

INHALT
```
export class NPCMemoryEngine {
  private memory = new Map<string, any[]>();

  remember(npcId: string, event: any) {
    if (!this.memory.has(npcId)) this.memory.set(npcId, []);
    this.memory.get(npcId)!.push({
      timestamp: Date.now(),
      event
    });
  }

  recall(npcId: string) {
    return this.memory.get(npcId) || [];
  }
}
```

---

DATEI
NPCPersonalityEngine.ts

PFAD
/server/src/modules/npc/NPCPersonalityEngine.ts

INHALT
```
export class NPCPersonalityEngine {
  generateTraits() {
    return {
      courage: Math.random(),
      curiosity: Math.random(),
      greed: Math.random(),
      faith: Math.random(),
      aggression: Math.random()
    };
  }
}
```

---

DATEI
ObserverEngine.ts

PFAD
/server/src/modules/observer/ObserverEngine.ts

INHALT
```
export class ObserverEngine {
  private observers = new Map<string, { x: number; y: number }>();

  register(playerId: string, position: { x: number; y: number }) {
    this.observers.set(playerId, position);
  }

  unregister(playerId: string) {
    this.observers.delete(playerId);
  }

  getObservedChunks() {
    const result = [] as { chunkX: number; chunkY: number }[];
    for (const [, pos] of this.observers) {
      result.push({
        chunkX: Math.floor(pos.x / 64),
        chunkY: Math.floor(pos.y / 64)
      });
    }
    return result;
  }
}
```

---

DATEI
OracleEngine.ts

PFAD
/server/src/modules/oracle/OracleEngine.ts

INHALT
```
export class OracleEngine {
  generateVision() {
    const visions = [
      "Ich sehe Feuer im Norden.",
      "Unter alten Mauern liegt ein Geheimnis.",
      "Ein Königreich wird fallen."
    ];
    return visions[Math.floor(Math.random() * visions.length)];
  }
}
```

---

DATEI
CivilizationDatabase.ts

PFAD
/server/src/modules/persistence/CivilizationDatabase.ts

INHALT
```
export class CivilizationDatabase {
  private civilizations = new Map<string, any>();

  saveCivilization(civ: any) {
    this.civilizations.set(civ.id, civ);
  }

  loadCivilization(id: string) {
    return this.civilizations.get(id) ?? null;
  }
}
```

---

DATEI
PlayerDatabase.ts

PFAD
/server/src/modules/persistence/PlayerDatabase.ts

INHALT
```
export class PlayerDatabase {
  private players = new Map<string, any>();

  savePlayer(player: any) {
    this.players.set(player.id, player);
  }

  loadPlayer(id: string) {
    return this.players.get(id) ?? null;
  }
}
```

---

DATEI
WorldDatabase.ts

PFAD
/server/src/modules/persistence/WorldDatabase.ts

INHALT
```
export class WorldDatabase {
  private chunks = new Map<string, any>();

  saveChunk(chunk: any) {
    this.chunks.set(chunk.id, chunk);
  }

  loadChunk(id: string) {
    return this.chunks.get(id) ?? null;
  }
}
```

---

DATEI
PlayerSystem.ts

PFAD
/server/src/modules/player/PlayerSystem.ts

INHALT
```
export class PlayerSystem {
  createPlayer(id: string, name: string) {
    return {
      id,
      name,
      position: { x: 0, y: 0, z: 0 },
      health: 100,
      stamina: 100,
      mana: 25,
      skills: {},
      inventory: [],
      faction: null,
      civilization: null,
      matrixEnergy: 0
    };
  }
}
```

---

DATEI
GovernmentTypes.ts

PFAD
/server/src/modules/politics/GovernmentTypes.ts

INHALT
```
export const GovernmentTypes = {
  monarchy: { id: "monarchy", succession: "inheritance", stabilityBase: 0.7 },
  council: { id: "council", succession: "vote", stabilityBase: 0.6 },
  theocracy: { id: "theocracy", succession: "religious_selection", stabilityBase: 0.65 },
  trade_republic: { id: "trade_republic", succession: "merchant_vote", stabilityBase: 0.55 },
  warband: { id: "warband", succession: "strength", stabilityBase: 0.4 }
};
```

---

DATEI
WarEngine.ts

PFAD
/server/src/modules/politics/WarEngine.ts

INHALT
```
export class WarEngine {
  declareWar(attacker: any, defender: any) {
    return {
      type: "war_declared",
      attacker: attacker.id,
      defender: defender.id,
      timestamp: Date.now()
    };
  }
}
```

---

DATEI
QuestEngine.ts

PFAD
/server/src/modules/quest/QuestEngine.ts

INHALT
```
import { QuestRegistry } from "./QuestRegistry.js";

export class QuestEngine {
  private active = new Map<string, any[]>();

  startQuest(playerId: string, questId: keyof typeof QuestRegistry) {
    const quest = QuestRegistry[questId];
    if (!quest) return null;
    if (!this.active.has(playerId)) this.active.set(playerId, []);
    this.active.get(playerId)!.push({ ...quest, startedAt: Date.now(), completed: false });
    return quest;
  }

  listQuests(playerId: string) {
    return this.active.get(playerId) || [];
  }

  completeQuest(playerId: string, questId: string) {
    const quests = this.active.get(playerId) || [];
    const q = quests.find((x) => x.id === questId);
    if (!q) return null;
    q.completed = true;
    q.completedAt = Date.now();
    return q.reward;
  }
}
```

---

DATEI
QuestRegistry.ts

PFAD
/server/src/modules/quest/QuestRegistry.ts

INHALT
```
export const QuestRegistry = {
  ruin_hunter: {
    id: "ruin_hunter",
    name: "Die alten Mauern",
    giver: "uschi_gossip",
    objective: "find_ruins",
    reward: { gold: 100, item: "ancient_relic" }
  },
  watchtower_supply: {
    id: "watchtower_supply",
    name: "Die hungernden Wächter",
    giver: "city_guard",
    objective: "deliver_supplies",
    reward: { xp: 50, item: "guard_token" }
  }
};
```

---

DATEI
ReligionSystem.ts

PFAD
/server/src/modules/religion/ReligionSystem.ts

INHALT
```
export class ReligionSystem {
  private religions = new Map<string, any>();

  registerReligion(id: string, data: any) {
    this.religions.set(id, data);
  }

  getReligion(id: string) {
    return this.religions.get(id);
  }
}
```

---

DATEI
SkillSystem.ts

PFAD
/server/src/modules/skill/SkillSystem.ts

INHALT
```
export class SkillSystem {
  ensureSkill(player: any, skillName: string) {
    if (!player.skills[skillName]) {
      player.skills[skillName] = { level: 1, xp: 0 };
    }
  }

  addXP(player: any, skillName: string, amount: number) {
    this.ensureSkill(player, skillName);
    const skill = player.skills[skillName];
    skill.xp += amount;
    while (skill.xp >= this.nextLevelXP(skill.level)) {
      skill.level += 1;
    }
    return skill;
  }

  nextLevelXP(level: number) {
    return Math.floor(50 * Math.pow(level, 1.4));
  }
}
```

---

DATEI
GateController.ts

PFAD
/server/src/modules/structure/GateController.ts

INHALT
```
export class GateController {
  setState(gate: any, state: string) {
    const allowed = ["open", "closed", "locked", "damaged", "destroyed"];
    if (!allowed.includes(state)) throw new Error("Invalid gate state");
    gate.state = state;
    return gate;
  }

  canOpen(actor: any, gate: any) {
    if (gate.state === "destroyed") return false;
    if (gate.state === "locked" && !actor.permissions?.includes("gate_access")) return false;
    return true;
  }
}
```

---

DATEI
StructureEngine.ts

PFAD
/server/src/modules/structure/StructureEngine.ts

INHALT
```
export class StructureEngine {
  private structures = new Map<string, any>();

  createStructure(structure: any) {
    this.structures.set(structure.structureId, structure);
    return structure;
  }

  getStructure(id: string) {
    return this.structures.get(id) ?? null;
  }

  damageStructure(id: string, amount: number) {
    const structure = this.structures.get(id);
    if (!structure) return null;
    structure.hitpoints = Math.max(0, structure.hitpoints - amount);
    if (structure.hitpoints === 0) structure.destroyed = true;
    return structure;
  }
}
```

---

DATEI
BiomeGenerator.ts

PFAD
/server/src/modules/world/BiomeGenerator.ts

INHALT
```
export class BiomeGenerator {
  getBiome(_x: number, _y: number, height: number) {
    if (height > 0.7) return "mountain";
    if (height > 0.45) return "forest";
    if (height > 0.2) return "grassland";
    return "desert";
  }
}
```

---

DATEI
ChunkSystem.ts

PFAD
/server/src/modules/world/ChunkSystem.ts

INHALT
```
export class ChunkSystem {
  constructor(public readonly size: number = 64) {}

  getChunk(x: number, y: number) {
    return {
      id: `${x}:${y}`,
      x,
      y,
      size: this.size
    };
  }
}
```

---

DATEI
TerrainGenerator.ts

PFAD
/server/src/modules/world/TerrainGenerator.ts

INHALT
```
export class TerrainGenerator {
  getHeight(x: number, y: number) {
    return Math.sin(x * 0.1) + Math.cos(y * 0.1);
  }
}
```

---

DATEI
WorldEditorServer.ts

PFAD
/server/src/modules/world-editor/WorldEditorServer.ts

INHALT
```
export class WorldEditorServer {
  spawnEntity(type: string, position: { x: number; y: number; z: number }) {
    return { action: "spawn", type, position };
  }

  moveEntity(entityId: string, position: { x: number; y: number; z: number }) {
    return { action: "move", entityId, position };
  }

  deleteEntity(entityId: string) {
    return { action: "delete", entityId };
  }
}
```

---

DATEI
PacketRouter.ts

PFAD
/server/src/networking/PacketRouter.ts

INHALT
```
export class PacketRouter {
  route(packet: any) {
    return {
      handled: true,
      type: packet?.type ?? "unknown"
    };
  }
}
```

---

DATEI
PlayerSession.ts

PFAD
/server/src/networking/PlayerSession.ts

INHALT
```
export type PlayerSession = {
  id: string;
  name: string;
  connectedAt: number;
  position: { x: number; y: number; z: number };
};
```

---

DATEI
WebSocketServer.ts

PFAD
/server/src/networking/WebSocketServer.ts

INHALT
```
import type { Server as HttpServer } from "node:http";
import { WebSocketServer } from "ws";

export class GameWebSocketServer {
  private wss: WebSocketServer | null = null;

  constructor(private readonly httpServer: HttpServer) {}

  start() {
    this.wss = new WebSocketServer({ server: this.httpServer });

    this.wss.on("connection", (socket) => {
      socket.send(JSON.stringify({
        type: "welcome",
        message: "Arelorian connection established"
      }));

      socket.on("message", (msg) => {
        console.log("WS message:", msg.toString());
      });
    });
  }
}
```

---

DATEI
tsconfig.json

PFAD
/server/tsconfig.json

INHALT
```
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": [
    "src/**/*"
  ]
}
```

---

DATEI
README_ASSETS.md

PFAD
/world-assets/README_ASSETS.md

INHALT
```
# World Assets

Lege hier GLB-Assets ab:
- characters/
- monsters/
- buildings/
- props/
- vegetation/
- admin/

Beispiele:
- uschi_gossip.glb
- warrior_male.glb
- warrior_female.glb
- castle_gate.glb
- castle_watch_tower.glb
- tree_oak_spring.glb
- gm_giraffe.glb
```
```

---

DATEI
package.json

PFAD
/client/package.json

INHALT
```
{
  "name": "areloria-client",
  "version": "0.2.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "three": "^0.169.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^5.4.0"
  }
}
```

---

DATEI
index.html

PFAD
/client/public/index.html

INHALT
```
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
    <title>Arelorian Client</title>
  </head>
  <body>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

---

DATEI
AssetLoader.ts

PFAD
/client/src/assets/AssetLoader.ts

INHALT
```
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class AssetLoader {
  private loader = new GLTFLoader();

  load(path: string) {
    return new Promise((resolve, reject) => {
      this.loader.load(path, (gltf) => resolve(gltf.scene), undefined, reject);
    });
  }
}
```

---

DATEI
ModelRegistry.ts

PFAD
/client/src/assets/ModelRegistry.ts

INHALT
```
export const ModelRegistry = {
  uschi: { path: "/assets/models/characters/uschi_gossip.glb", scale: 1 },
  castle_wall: { path: "/assets/models/buildings/castle_wall.glb", scale: 1 },
  watch_tower: { path: "/assets/models/buildings/castle_watch_tower.glb", scale: 1 },
  tree_spring: { path: "/assets/models/vegetation/tree_oak_spring.glb", scale: 1 },
  gm_giraffe: { path: "/assets/models/admin/gm_giraffe.glb", scale: 1 }
};
```

---

DATEI
GMCommandConsole.ts

PFAD
/client/src/editor/GMCommandConsole.ts

INHALT
```
export class GMCommandConsole {
  run(command: string) {
    return {
      command,
      status: "queued"
    };
  }
}
```

---

DATEI
PlacementTool.ts

PFAD
/client/src/editor/PlacementTool.ts

INHALT
```
export class PlacementTool {
  place(type: string, position: { x: number; y: number; z: number }) {
    return { action: "place", type, position };
  }
}
```

---

DATEI
SelectionTool.ts

PFAD
/client/src/editor/SelectionTool.ts

INHALT
```
export class SelectionTool {
  select(entityId: string) {
    return { selected: entityId };
  }
}
```

---

DATEI
WorldEditorUI.ts

PFAD
/client/src/editor/WorldEditorUI.ts

INHALT
```
export function openWorldEditorUI() {
  const el = document.createElement("div");
  el.textContent = "GM World Editor";
  el.style.position = "fixed";
  el.style.right = "12px";
  el.style.bottom = "12px";
  el.style.padding = "10px 14px";
  el.style.background = "#2b2b2b";
  el.style.color = "#fff";
  document.body.appendChild(el);
}
```

---

DATEI
renderer.ts

PFAD
/client/src/engine/renderer.ts

INHALT
```
import * as THREE from "three";

export function initRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshBasicMaterial({ color: 0x44aa88 })
  );

  scene.add(cube);

  function animate() {
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();
}
```

---

DATEI
worldLoader.ts

PFAD
/client/src/engine/worldLoader.ts

INHALT
```
export function loadWorldChunk(chunkX: number, chunkY: number) {
  return {
    chunkX,
    chunkY,
    status: "requested"
  };
}
```

---

DATEI
farmingSystem.ts

PFAD
/client/src/gameplay/farmingSystem.ts

INHALT
```
export function plantSeed(seedId: string) {
  return {
    seedId,
    planted: true
  };
}
```

---

DATEI
playerController.ts

PFAD
/client/src/gameplay/playerController.ts

INHALT
```
export class PlayerController {
  move(direction: string) {
    return {
      type: "move",
      direction
    };
  }
}
```

---

DATEI
main.ts

PFAD
/client/src/main.ts

INHALT
```
import { initRenderer } from "./engine/renderer";
import { connectSocket } from "./networking/websocketClient";
import { renderHUD } from "./ui/hud";

const canvas = document.createElement("canvas");
document.body.style.margin = "0";
document.body.appendChild(canvas);

initRenderer(canvas);
connectSocket();
renderHUD();
```

---

DATEI
websocketClient.ts

PFAD
/client/src/networking/websocketClient.ts

INHALT
```
export function connectSocket() {
  const ws = new WebSocket(`ws://${location.hostname}:3000`);

  ws.onopen = () => console.log("Connected to Arelorian server");
  ws.onmessage = (msg) => console.log("Server:", msg.data);

  return ws;
}
```

---

DATEI
chat.ts

PFAD
/client/src/ui/chat.ts

INHALT
```
export function renderChat() {
  const el = document.createElement("div");
  el.textContent = "Chat placeholder";
  el.style.position = "fixed";
  el.style.left = "12px";
  el.style.bottom = "12px";
  el.style.padding = "8px 12px";
  el.style.background = "rgba(0,0,0,0.55)";
  el.style.color = "#fff";
  document.body.appendChild(el);
}
```

---

DATEI
crafting.ts

PFAD
/client/src/ui/crafting.ts

INHALT
```
export function renderCraftingUI() {
  const panel = document.createElement("div");
  panel.textContent = "Crafting UI placeholder";
  return panel;
}
```

---

DATEI
hud.ts

PFAD
/client/src/ui/hud.ts

INHALT
```
export function renderHUD() {
  const hud = document.createElement("div");
  hud.textContent = "Arelorian HUD online";
  hud.style.position = "fixed";
  hud.style.top = "12px";
  hud.style.left = "12px";
  hud.style.padding = "8px 12px";
  hud.style.background = "rgba(0,0,0,0.55)";
  hud.style.color = "#fff";
  hud.style.fontFamily = "sans-serif";
  document.body.appendChild(hud);
}
```

---

DATEI
inventory.ts

PFAD
/client/src/ui/inventory.ts

INHALT
```
export function renderInventory() {
  const el = document.createElement("div");
  el.textContent = "Inventory placeholder";
  el.style.position = "fixed";
  el.style.right = "12px";
  el.style.top = "12px";
  el.style.padding = "8px 12px";
  el.style.background = "rgba(0,0,0,0.55)";
  el.style.color = "#fff";
  document.body.appendChild(el);
}
```

---

DATEI
market.ts

PFAD
/client/src/ui/market.ts

INHALT
```
export function renderMarketUI() {
  const panel = document.createElement("div");
  panel.textContent = "Market UI placeholder";
  return panel;
}
```

---

DATEI
tsconfig.json

PFAD
/client/tsconfig.json

INHALT
```
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true
  },
  "include": [
    "src/**/*"
  ]
}
```

---

DATEI
ADMIN_MOUNT_SYSTEM.md

PFAD
/docs/ADMIN_MOUNT_SYSTEM.md

INHALT
```
# Admin Mount System

Admins und GMs können besondere Mounts erhalten, z.B. die gaffende Giraffe.

## Zweck
- sichtbare GM-Präsenz
- World-Editor-Kontext
- humorvolles Prestige-Element

## Geplante Fähigkeiten
- teleport
- fly
- world_edit_mode
- spawn_shortcuts
```

---

DATEI
AFFIX_AND_ITEM_GENERATION.md

PFAD
/docs/AFFIX_AND_ITEM_GENERATION.md

INHALT
```
# Affix and Item Generation

Items bestehen aus:
- Base Item
- Rarity
- Affix Set
- Item Power

## Rarity
common, uncommon, rare, epic, legendary, mythic

## Beispiel-Affixe
- +Strength
- +Attack Speed
- +Health
- +Mining Skill
- +Fire Resistance
```

---

DATEI
ASSET_PIPELINE.md

PFAD
/docs/ASSET_PIPELINE.md

INHALT
```
# Asset Pipeline

## GLB-Regeln
Terrain ist kein GLB-Bodenteppich. GLB wird für NPCs, Monster, Gebäude, Bäume, Props und Reittiere verwendet.

## Struktur
- characters/
- monsters/
- buildings/
- props/
- vegetation/
- admin/

## Validierung
Jedes Asset sollte idealerweise besitzen:
- sauberen Ursprungspunkt
- sinnvolle Skalierung
- optionales Rig/Skeleton
- optional Animationen
```

---

DATEI
BRAIN_SYSTEM.md

PFAD
/docs/BRAIN_SYSTEM.md

INHALT
```
# Brain System

Das Server Brain ist eine heuristische Meta-Schicht.

## Aufgaben
- Spannungen erkennen
- Politiksignale lesen
- Marktanomalien erkennen
- Orakelvisionen speisen
- Ereignisse anstoßen

## 13-Punkte-Modell
- 4 Weltpunkte
- 4 Interpretationspunkte
- 4 Dynamikpunkte
- 1 Zentrum

Das Zentrum aggregiert Weltzustand, NPC-Memory, Ökonomie, Politik und Geschichte.
```

---

DATEI
BUILD_SEQUENCE_MASTER.md

PFAD
/docs/BUILD_SEQUENCE_MASTER.md

INHALT
```
# Build Sequence Master

1. Server core und bootstrap
2. World tick
3. Chunk- und Observer-System
4. Persistence
5. NPC personality + memory + genealogy
6. Civilization + politics
7. Economy + Matrix energy
8. Player, skills, combat, loot
9. Dungeons, ruins, oracle, history
10. Brain + field analyzer
11. Asset registry + GLB loading
12. GM editor
13. Client renderer + websocket sync
14. Firebase/AWS integration
```

---

DATEI
CRAFTING_SYSTEM.md

PFAD
/docs/CRAFTING_SYSTEM.md

INHALT
```
# Crafting System

Crafting verbindet Skills, Ressourcen, Wirtschaft und Städtebau.

## Grundprinzip
- Spieler sammeln Rohstoffe
- Rezepte definieren Inputs und Outputs
- Crafting gibt Skill-XP
- Qualität und Affixe können das Ergebnis beeinflussen

## Kernbereiche
- Smithing
- Woodworking
- Tailoring
- Alchemy
- Construction
- Cooking

## Serverregeln
Alle Crafting-Ergebnisse werden serverseitig berechnet.
```

---

DATEI
DIALOGUE_SYSTEM.md

PFAD
/docs/DIALOGUE_SYSTEM.md

INHALT
```
# Dialogue System

The dialogue system combines:
- personality traits
- family and lineage
- culture
- religion
- memory
- world events
- oracle/world history signals

## Pipeline
1. build context
2. choose tone
3. choose dialogue pool
4. inject dynamic references
5. return line + optional quest/world hint
```

---

DATEI
DUNGEON_SYSTEM.md

PFAD
/docs/DUNGEON_SYSTEM.md

INHALT
```
# Dungeon System

Dungeons are generated from seeds, ruins and regional history.

## Room types
- hall
- shrine
- monster_lair
- collapsed_passage
- treasure_room
- prison
- relic_chamber

## Inputs
- biome
- ruin class
- ancient civilization markers
- oracle hints
- current danger rating
```

---

DATEI
ECONOMY_MODEL.md

PFAD
/docs/ECONOMY_MODEL.md

INHALT
```
# Economy Model

Die Wirtschaft verbindet Ressourcen, Spieler, NPCs, Märkte und Städte.

## Kernelemente
- Stadtmärkte
- Handelsrouten
- NPC-Händler
- Spielerhandel
- Matrix-Energie
- politische und kriegerische Markteinflüsse

## Preisfaktoren
- Angebot
- Nachfrage
- Krieg
- Knappheit
- Transport
- Stadtsteuern
```

---

DATEI
FARMING_AND_GROWTH_SYSTEM.md

PFAD
/docs/FARMING_AND_GROWTH_SYSTEM.md

INHALT
```
# Farming and Growth System

Die Welt besitzt Wachstum über Zeit und Ticks.

## Baumwachstum
- young
- spring
- summer
- autumn
- optional winter/dead

## Farming
- Saat setzen
- Wachstum prüfen
- Ernte
- Boden- und Biomabhängigkeit

## Weltintegration
TreeGrowth und Farming laufen über den World Tick.
```

---

DATEI
GM_COMMAND_LAYER.md

PFAD
/docs/GM_COMMAND_LAYER.md

INHALT
```
# GM Command Layer

Der GM Command Layer kapselt administrative Eingriffe.

## Beispiele
- /spawn npc merchant
- /spawn structure castle_gate
- /event drought start
- /teleport x y z
- /set season autumn
- /set biome desert

Alle Befehle werden serverseitig validiert.
```

---

DATEI
GM_EDITOR.md

PFAD
/docs/GM_EDITOR.md

INHALT
```
# GM Editor

Der GM-Editor erlaubt Live-Eingriffe in die Welt.

## Fähigkeiten
- Objekte setzen
- NPCs spawnen
- Strukturen verschieben
- Terrainmarker bearbeiten
- Events starten
- Weltzustände prüfen

## Regel
Der Editor ist serverautoritativ. Der Client darf nur Befehle senden.
```

---

DATEI
MARKET_EXPANSION.md

PFAD
/docs/MARKET_EXPANSION.md

INHALT
```
# Market Expansion

Zusätzlich zum Basismarkt gibt es:
- regionale Preisprofile
- Handelsroutenboni
- Kriegsaufschläge
- Seltenheitsaufschläge
- NPC-Händlerverhalten

## Marktflüsse
Rohstoff -> Verarbeitung -> Weiterverkauf -> Steuer -> Wohlstand
```

---

DATEI
MASTER_DESIGN_BIBLE.md

PFAD
/docs/MASTER_DESIGN_BIBLE.md

INHALT
```
# Master Design Bible

## Vision
Arelorian ist ein persistentes Browser-MMORPG mit emergenter Weltlogik. Die Welt ist theoretisch unendlich,
wird prozedural erzeugt und über Beobachterzonen simuliert.

## Fünf Axiome
1. Informationsfeld
2. Emergenz
3. Persistenz
4. Ouroboros-Zyklus
5. Beobachter

## Welt
- Prozedurale Welt
- Chunks 64x64
- Biome als natürliche Grenzen
- Ruinen, Dungeons und historische Schichten

## Zivilisationen
- Guild -> Village -> City -> Kingdom -> Nation
- Spieler und NPCs besitzen dieselben zivilisatorischen Rechte

## NPCs
- Personality
- DNA/Traits
- Genealogie und Häuser
- Memory und Shared Memory
- Kultur und Religion
- Politik und Familiengeschichte

## Gameplay
- klassenloses Skill-System
- Skills durch Nutzung
- Stamina als Kernressource
- Diablo-artiges Loot
- Magie als Skillzweig
- Crafting, Handel und Weltwirtschaft

## Systeme
- Server Brain mit 13-Punkte-Modell
- Dudenregister und Orakel
- Matrix-Energie
- Weltwunder und Schattenregisterportal
- GM-Editor
- GLB-Asset-Pipeline
```

---

DATEI
MASTER_SYSTEM_CHECKLIST.md

PFAD
/docs/MASTER_SYSTEM_CHECKLIST.md

INHALT
```
# Master System Checklist

## Welt
- [x] World generator
- [x] 64x64 chunk system
- [x] Observer simulation
- [x] Biome and terrain
- [x] World tick
- [x] Dungeons
- [x] Ruins

## NPC
- [x] Personality engine
- [x] Memory engine
- [x] Shared memory
- [x] Genealogy
- [x] DNA and traits
- [x] Dialogue
- [x] Quests

## Gesellschaft
- [x] Civilization engine
- [x] NPC politics
- [x] Player politics
- [x] Governments
- [x] Taxes
- [x] War

## Gameplay
- [x] Players
- [x] Skills
- [x] Inventory
- [x] Combat
- [x] Loot
- [x] Magic

## Spezial
- [x] Matrix energy
- [x] Dudenregister
- [x] Oracle
- [x] Server brain
- [x] GLB pipeline
- [x] GM editor
```

---

DATEI
MONSTER_SYSTEM.md

PFAD
/docs/MONSTER_SYSTEM.md

INHALT
```
# Monster System

Monsters are generated from:
- species
- dna
- mutation
- biome
- pack memory
- rarity

This allows regional monster lines such as frost wolves, swamp alphas or cave mutants.
```

---

DATEI
NPC_SCHEDULES.md

PFAD
/docs/NPC_SCHEDULES.md

INHALT
```
# NPC Schedules

NPCs haben Tages- und Rollenpläne.

## Beispiele
Merchant:
- wake
- open shop
- trade
- tavern
- sleep

Guard:
- patrol
- gate duty
- tavern
- sleep
```

---

DATEI
NPC_SYSTEM.md

PFAD
/docs/NPC_SYSTEM.md

INHALT
```
# NPC System

## Fünf Einflussfaktoren
- DNA / Traits
- Familie / Genealogie
- Kultur / Herkunft
- Religion / Weltbild
- Erfahrung / Memory

## Memory-Ebenen
- Local memory
- Social memory
- Faction memory
- Historical memory
- Oracle memory

## Verhalten
NPCs können:
- arbeiten
- handeln
- Gerüchte verbreiten
- Familien gründen
- Politik betreiben
- Kriege beginnen oder vermeiden
```

---

DATEI
PERSISTENCE_MODEL.md

PFAD
/docs/PERSISTENCE_MODEL.md

INHALT
```
# Persistence Model

Persistent storage is split by concern:
- world chunks
- players
- civilizations
- history / dudenregister
- snapshots
- asset metadata
```

---

DATEI
STRUCTURE_SYSTEM.md

PFAD
/docs/STRUCTURE_SYSTEM.md

INHALT
```
# Structure System

Structures connect GLB assets to persistent world entities.

## Types
- player_structure
- npc_structure
- civilization_structure
- ruin_structure
- wonder_structure
- matrix_protected_structure

## Examples
- house
- gate
- wall
- watch tower
- workshop
- temple
- shadow register portal
```

---

DATEI
WORLD_EVENT_LAYER.md

PFAD
/docs/WORLD_EVENT_LAYER.md

INHALT
```
# World Event Layer

Die Welt besitzt geplante und emergente Ereignisse.

## Beispiele
- Dürre
- Monstermigration
- Kriegsausbruch
- Ernteboom
- Ruinenfund
- religiöse Wallfahrt

Events greifen auf Brain, Economy, Politics und History zu.
```

---

DATEI
WORLD_GENERATION.md

PFAD
/docs/WORLD_GENERATION.md

INHALT
```
# World Generation

Die Welt wird aus `seed + coordinates` erzeugt.

## Chunkstruktur
Jeder Chunk enthält:
- Terrain
- Biomtyp
- Ressourcen
- Objektliste
- Strukturen
- Ruinen oder Dungeon-Eingänge

## Simulationsebenen
1. Dormant
2. Background simulation
3. Active simulation
4. Full simulation

Nur beobachtete Regionen werden hochauflösend simuliert.
```

---

DATEI
DO_NOT_SIMPLIFY.md

PFAD
/final-lock/DO_NOT_SIMPLIFY.md

INHALT
```
# Do Not Simplify

Nicht reduzieren auf:
- Demo
- UI-Mockup
- Singleplayer-Sandbox
- nur Terrain-Viewer
- nur Client ohne Weltsimulation
```

---

DATEI
FINAL_TRUTH.md

PFAD
/final-lock/FINAL_TRUTH.md

INHALT
```
# Final Truth

Dieses Projekt ist ein persistentes MMORPG und darf nicht auf ein Mockup oder eine Einzelspieler-Demo reduziert werden.

Pflicht:
- 64x64 chunks
- observer simulation
- server-authoritative logic
- NPC memory + genealogy
- player and NPC politics
- matrix energy
- 13-node brain
- GM editor
- GLB pipeline
```

---

DATEI
REQUIRED_SYSTEMS_MATRIX.md

PFAD
/final-lock/REQUIRED_SYSTEMS_MATRIX.md

INHALT
```
# Required Systems Matrix

## Welt
observer, chunks, terrain, biomes, tick, dungeons, ruins

## NPC
personality, memory, shared memory, genealogy, dna, dialogue

## Gesellschaft
civilization, politics, government, tax, war, diplomacy

## Gameplay
player, skills, inventory, combat, loot, magic

## Spezial
oracle, dudenregister, matrix energy, brain, gm editor, glb pipeline
```

---

DATEI
biome-definitions.json

PFAD
/game-data/biomes/biome-definitions.json

INHALT
```
{
  "forest": {
    "temperature": "mild",
    "resources": [
      "wood",
      "berries",
      "animals"
    ]
  },
  "desert": {
    "temperature": "hot",
    "resources": [
      "sand",
      "salt",
      "crystals"
    ]
  },
  "mountain": {
    "temperature": "cold",
    "resources": [
      "stone",
      "iron",
      "gold"
    ]
  }
}
```

---

DATEI
recipes.json

PFAD
/game-data/crafting/recipes.json

INHALT
```
{
  "iron_sword": {
    "inputs": [
      {
        "id": "iron_ingot",
        "amount": 2
      },
      {
        "id": "wood_handle",
        "amount": 1
      }
    ],
    "output": {
      "id": "iron_sword",
      "amount": 1
    },
    "skill": "smithing"
  }
}
```

---

DATEI
cultures.json

PFAD
/game-data/cultures/cultures.json

INHALT
```
{
  "forest_tribes": {
    "style": "organic"
  },
  "mountain_clans": {
    "style": "stone"
  },
  "desert_nomads": {
    "style": "lightweight"
  }
}
```

---

DATEI
matrix-energy-rules.json

PFAD
/game-data/economy/matrix-energy-rules.json

INHALT
```
{
  "currency": "matrix_energy",
  "npcCannotDestroyProtectedStructures": true
}
```

---

DATEI
world-events.json

PFAD
/game-data/events/world-events.json

INHALT
```
{
  "drought": {
    "category": "climate"
  },
  "war_outbreak": {
    "category": "politics"
  },
  "ruin_discovery": {
    "category": "exploration"
  },
  "migration_wave": {
    "category": "population"
  }
}
```

---

DATEI
dudenregister-schema.json

PFAD
/game-data/history/dudenregister-schema.json

INHALT
```
{
  "events": [
    "war",
    "collapse",
    "ruin",
    "wonder",
    "dynasty",
    "oracle"
  ]
}
```

---

DATEI
loot-tables.json

PFAD
/game-data/items/loot-tables.json

INHALT
```
{
  "wolf": [
    "wolf_pelt",
    "fang",
    "alpha_claw"
  ],
  "skeleton": [
    "bone_fragment",
    "rusted_blade",
    "grave_ring"
  ],
  "ruin_cache": [
    "ancient_coin",
    "relic_fragment",
    "forgotten_sigil"
  ]
}
```

---

DATEI
spell-schools.json

PFAD
/game-data/magic/spell-schools.json

INHALT
```
{
  "nature": [
    "root_bind",
    "healing_moss"
  ],
  "shadow": [
    "dark_bolt",
    "fear_whisper"
  ],
  "resonance": [
    "echo_wave",
    "field_tone"
  ],
  "protection": [
    "ward_shield",
    "holy_barrier"
  ],
  "ritual": [
    "ancestral_call",
    "portal_trace"
  ]
}
```

---

DATEI
npc-archetypes.json

PFAD
/game-data/npc/npc-archetypes.json

INHALT
```
{
  "merchant": {},
  "guard": {},
  "oracle": {},
  "gossip": {
    "example": "Uschi die Geschminkte"
  }
}
```

---

DATEI
government-types.json

PFAD
/game-data/politics/government-types.json

INHALT
```
{
  "monarchy": {},
  "council": {},
  "theocracy": {},
  "trade_republic": {},
  "warband": {}
}
```

---

DATEI
quest-registry.json

PFAD
/game-data/quests/quest-registry.json

INHALT
```
{
  "ruin_hunter": {
    "giver": "uschi_gossip",
    "objective": "find_ruins"
  },
  "watchtower_supply": {
    "giver": "city_guard",
    "objective": "deliver_supplies"
  }
}
```

---

DATEI
religions.json

PFAD
/game-data/religions/religions.json

INHALT
```
{
  "sun_order": {
    "ethos": "honor"
  },
  "shadow_cult": {
    "ethos": "secrecy"
  },
  "ancestor_faith": {
    "ethos": "lineage"
  }
}
```

---

DATEI
skills.json

PFAD
/game-data/skills/skills.json

INHALT
```
{
  "combat": {},
  "woodcutting": {},
  "mining": {},
  "smithing": {},
  "magic": {},
  "fishing": {}
}
```

---

DATEI
tree-growth-rules.json

PFAD
/game-data/vegetation/tree-growth-rules.json

INHALT
```
{
  "oak": [
    "young",
    "spring",
    "summer",
    "autumn"
  ],
  "pine": [
    "young",
    "summer",
    "winter"
  ]
}
```

---

DATEI
README_INTEGRATIONS.md

PFAD
/integrations/README_INTEGRATIONS.md

INHALT
```
# Integrations

Hier werden produktive Integrationen abgelegt:
- Firebase
- AWS
- WebSocket Gateway
- Datenbankadapter

Wichtig: Keine Secrets hart in Dateien schreiben.
```

---

DATEI
elasticacheAdapter.ts

PFAD
/integrations/aws/elasticacheAdapter.ts

INHALT
```
export function initElastiCache() {
  return {
    status: "elasticache-adapter-placeholder"
  };
}
```

---

DATEI
postgresAdapter.ts

PFAD
/integrations/aws/postgresAdapter.ts

INHALT
```
export function initPostgres() {
  return {
    status: "postgres-adapter-placeholder"
  };
}
```

---

DATEI
firebase-config.ts

PFAD
/integrations/firebase/firebase-config.ts

INHALT
```
export const firebaseConfig = {
  note: "Fill with real Firebase credentials during deployment"
};
```

---

DATEI
firestorePersistence.ts

PFAD
/integrations/firebase/firestorePersistence.ts

INHALT
```
export function initFirestorePersistence() {
  return {
    status: "firestore-persistence-placeholder"
  };
}
```

---

DATEI
awsGatewayBridge.ts

PFAD
/integrations/websocket-gateway/awsGatewayBridge.ts

INHALT
```
export function initAwsGatewayBridge() {
  return {
    status: "aws-websocket-gateway-placeholder"
  };
}
```

---

DATEI
package.json

PFAD
/server/package.json

INHALT
```
{
  "name": "areloria-server",
  "version": "0.2.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "@types/ws": "^8.5.12",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

---

DATEI
ServerBootstrap.ts

PFAD
/server/src/core/ServerBootstrap.ts

INHALT
```
import express from "express";
import { createServer } from "node:http";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { WorldTick } from "./WorldTick.js";

export class ServerBootstrap {
  start() {
    const app = express();
    const httpServer = createServer(app);

    app.get("/health", (_req, res) => {
      res.json({
        ok: true,
        project: "ARELORIAN MMORPG",
        version: "0.2.0"
      });
    });

    const ws = new GameWebSocketServer(httpServer);
    ws.start();

    const tick = new WorldTick();
    const port = Number(process.env.PORT || 3000);

    httpServer.listen(port, () => {
      console.log(`Arelorian server listening on ${port}`);
      tick.start();
    });
  }
}
```

---

DATEI
WorldTick.ts

PFAD
/server/src/core/WorldTick.ts

INHALT
```
export class WorldTick {
  private timer: NodeJS.Timeout | null = null;
  private tickCount = 0;

  start() {
    this.timer = setInterval(() => this.tick(), 100);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  tick() {
    this.tickCount += 1;
    if (this.tickCount % 10 === 0) {
      console.log("World Tick", this.tickCount);
    }
  }
}
```

---

DATEI
index.ts

PFAD
/server/src/index.ts

INHALT
```
import { ServerBootstrap } from "./core/ServerBootstrap.js";

new ServerBootstrap().start();
```

---

DATEI
AdminMountRegistry.ts

PFAD
/server/src/modules/admin/AdminMountRegistry.ts

INHALT
```
export const AdminMountRegistry = {
  gm_giraffe: {
    id: "gm_giraffe",
    title: "Gaffende Giraffe",
    abilities: ["fly", "teleport", "world_edit_mode"]
  }
};
```

---

DATEI
GiraffeAdminMount.ts

PFAD
/server/src/modules/admin/GiraffeAdminMount.ts

INHALT
```
export class GiraffeAdminMount {
  activateEditorMode() {
    return {
      mount: "gm_giraffe",
      mode: "world_edit_mode",
      active: true
    };
  }
}
```

---

DATEI
BehaviorTree.ts

PFAD
/server/src/modules/ai/BehaviorTree.ts

INHALT
```
export class BehaviorTree {
  run(npc: any) {
    if (npc.needs?.sleep) return "sleep";
    if (npc.needs?.hunger) return "eat";
    if (npc.job) return "work";
    return "wander";
  }
}
```

---

DATEI
NPCBrain.ts

PFAD
/server/src/modules/ai/NPCBrain.ts

INHALT
```
import { BehaviorTree } from "./BehaviorTree.js";

export class NPCBrain {
  private tree = new BehaviorTree();

  update(npc: any) {
    const action = this.tree.run(npc);
    npc.currentAction = action;
    return action;
  }
}
```

---

DATEI
NPCSchedules.ts

PFAD
/server/src/modules/ai/NPCSchedules.ts

INHALT
```
export const NPCSchedules = {
  merchant: [
    { hour: 6, action: "wake" },
    { hour: 8, action: "open_shop" },
    { hour: 18, action: "close_shop" },
    { hour: 22, action: "sleep" }
  ],
  guard: [
    { hour: 6, action: "patrol" },
    { hour: 12, action: "gate_duty" },
    { hour: 20, action: "tavern" },
    { hour: 23, action: "sleep" }
  ],
  uschi_gossip: [
    { hour: 10, action: "market_gossip" },
    { hour: 14, action: "rumor_trade" },
    { hour: 19, action: "tavern" },
    { hour: 23, action: "vanish_into_city" }
  ]
};
```

---

DATEI
TaskSystem.ts

PFAD
/server/src/modules/ai/TaskSystem.ts

INHALT
```
export class TaskSystem {
  execute(npc: any, action: string) {
    switch (action) {
      case "wander":
        return { action, destination: "random_nearby" };
      case "work":
        return { action, destination: npc.jobLocation ?? "workplace" };
      case "eat":
        return { action, destination: "tavern" };
      case "sleep":
        return { action, destination: "home" };
      default:
        return { action: "idle" };
    }
  }
}
```

---

DATEI
AssetRegistry.ts

PFAD
/server/src/modules/asset-registry/AssetRegistry.ts

INHALT
```
export class AssetRegistry {
  private assets = new Map<string, any>();

  register(id: string, data: any) {
    this.assets.set(id, data);
  }

  get(id: string) {
    return this.assets.get(id) ?? null;
  }

  list() {
    return Array.from(this.assets.entries()).map(([id, data]) => ({ id, ...data }));
  }
}
```

---

DATEI
NPCAssets.ts

PFAD
/server/src/modules/asset-registry/NPCAssets.ts

INHALT
```
export const NPCAssets = {
  uschi_gossip: {
    assetId: "uschi_gossip",
    model: "/assets/models/characters/uschi_gossip.glb",
    category: "npc",
    animations: ["idle", "talk", "laugh", "cough"]
  },
  warrior_male: {
    assetId: "warrior_male",
    model: "/assets/models/characters/warrior_male.glb",
    category: "player_or_npc",
    animations: ["idle", "walk", "attack"]
  },
  warrior_female: {
    assetId: "warrior_female",
    model: "/assets/models/characters/warrior_female.glb",
    category: "player_or_npc",
    animations: ["idle", "walk", "attack"]
  }
};
```

---

DATEI
StructureAssets.ts

PFAD
/server/src/modules/asset-registry/StructureAssets.ts

INHALT
```
export const StructureAssets = {
  castle_wall: {
    assetId: "castle_wall",
    type: "structure",
    model: "/assets/models/buildings/castle_wall.glb",
    collision: true
  },
  castle_gate: {
    assetId: "castle_gate",
    type: "interactive_structure",
    model: "/assets/models/buildings/castle_gate.glb",
    collision: true,
    states: ["open", "closed", "locked", "damaged", "destroyed"]
  },
  castle_watch_tower: {
    assetId: "castle_watch_tower",
    type: "defense_structure",
    model: "/assets/models/buildings/castle_watch_tower.glb",
    collision: true
  }
};
```

---

DATEI
VegetationAssets.ts

PFAD
/server/src/modules/asset-registry/VegetationAssets.ts

INHALT
```
export const VegetationAssets = {
  tree_oak_young: { model: "/assets/models/vegetation/tree_oak_young.glb", category: "vegetation", growthStage: 0 },
  tree_oak_spring: { model: "/assets/models/vegetation/tree_oak_spring.glb", category: "vegetation", growthStage: 1 },
  tree_oak_summer: { model: "/assets/models/vegetation/tree_oak_summer.glb", category: "vegetation", growthStage: 2 },
  tree_oak_autumn: { model: "/assets/models/vegetation/tree_oak_autumn.glb", category: "vegetation", growthStage: 3 }
};
```

---

DATEI
BrainFieldAnalyzer.ts

PFAD
/server/src/modules/brain/BrainFieldAnalyzer.ts

INHALT
```
export class BrainFieldAnalyzer {
  analyzeField(values: unknown[]) {
    return {
      activeNodes: values.length,
      result: "field-analysis-placeholder"
    };
  }
}
```

---

DATEI
HeuristicWorldBrain.ts

PFAD
/server/src/modules/brain/HeuristicWorldBrain.ts

INHALT
```
export class HeuristicWorldBrain {
  private readonly nodes = new Array(13).fill(null);

  analyze(input: unknown) {
    return {
      nodes: this.nodes.length,
      summary: "analysis-placeholder",
      input
    };
  }
}
```

---

DATEI
CivilizationEngine.ts

PFAD
/server/src/modules/civilization/CivilizationEngine.ts

INHALT
```
export class CivilizationEngine {
  createVillage(guildMembers: number) {
    if (guildMembers < 50) return null;
    return {
      type: "village",
      population: guildMembers,
      createdAt: Date.now()
    };
  }
}
```

---

DATEI
SettlementSystem.ts

PFAD
/server/src/modules/civilization/SettlementSystem.ts

INHALT
```
export class SettlementSystem {
  createSettlement(type: "village" | "city" | "kingdom" | "nation", ownerId: string) {
    return {
      type,
      ownerId,
      createdAt: Date.now()
    };
  }
}
```

---

DATEI
CombatSystem.ts

PFAD
/server/src/modules/combat/CombatSystem.ts

INHALT
```
export class CombatSystem {
  attack(attacker: any, defender: any) {
    if (attacker.stamina <= 0) return { success: false, reason: "no_stamina" };

    attacker.stamina -= 10;

    const hitChance = this.hitChance(attacker, defender);
    if (Math.random() > hitChance) {
      return { success: true, hit: false, damage: 0 };
    }

    const damage = this.calculateDamage(attacker, defender);
    defender.health = Math.max(0, defender.health - damage);

    return {
      success: true,
      hit: true,
      damage,
      defenderHealth: defender.health
    };
  }

  hitChance(attacker: any, defender: any) {
    const atk = attacker.skills?.combat?.level ?? 1;
    const def = defender.skills?.combat?.level ?? 1;
    return Math.min(0.95, Math.max(0.1, atk / (atk + def)));
  }

  calculateDamage(attacker: any, defender: any) {
    const atk = attacker.skills?.combat?.level ?? 1;
    const def = defender.skills?.combat?.level ?? 1;
    const base = 5 + atk;
    const mitigation = Math.floor(def * 0.3);
    return Math.max(1, base - mitigation + Math.floor(Math.random() * 4));
  }
}
```

---

DATEI
CraftingSystem.ts

PFAD
/server/src/modules/crafting/CraftingSystem.ts

INHALT
```
export class CraftingSystem {
  craft(player: any, recipe: any) {
    const inventory = player.inventory ?? [];
    const hasAll = (recipe.inputs ?? []).every((input: any) =>
      inventory.some((item: any) => item.id === input.id && (item.amount ?? 1) >= input.amount)
    );

    if (!hasAll) {
      return { success: false, reason: "missing_materials" };
    }

    return {
      success: true,
      item: {
        id: recipe.output.id,
        amount: recipe.output.amount ?? 1
      }
    };
  }
}
```

---

DATEI
RecipeRegistry.ts

PFAD
/server/src/modules/crafting/RecipeRegistry.ts

INHALT
```
export const RecipeRegistry = {
  iron_sword: {
    id: "iron_sword",
    inputs: [
      { id: "iron_ingot", amount: 2 },
      { id: "wood_handle", amount: 1 }
    ],
    output: { id: "iron_sword", amount: 1 },
    skill: "smithing"
  }
};
```

---

DATEI
DialogueContext.ts

PFAD
/server/src/modules/dialogue/DialogueContext.ts

INHALT
```
export function buildDialogueContext(npc: any, player: any, world: any) {
  return {
    npcId: npc.id,
    playerId: player?.id ?? null,
    traits: npc.traits ?? {},
    lineage: npc.lineage ?? null,
    culture: npc.culture ?? null,
    religion: npc.religion ?? null,
    memory: npc.memory ?? [],
    worldEvents: world?.events ?? [],
    oracleSignals: world?.oracleSignals ?? []
  };
}
```

---

DATEI
DialogueEngine.ts

PFAD
/server/src/modules/dialogue/DialogueEngine.ts

INHALT
```
import { buildDialogueContext } from "./DialogueContext.js";
import { DialogueGenerator } from "./DialogueGenerator.js";

export class DialogueEngine {
  private generator = new DialogueGenerator();

  talk(npc: any, player: any, world: any) {
    const context = buildDialogueContext(npc, player, world);
    return this.generator.generate(context);
  }
}
```

---

DATEI
DialogueGenerator.ts

PFAD
/server/src/modules/dialogue/DialogueGenerator.ts

INHALT
```
import { DialogueTemplates } from "./DialogueTemplates.js";

export class DialogueGenerator {
  generate(context: any) {
    const mood = context.traits?.aggression > 0.7 ? "warning" : "greeting";
    const pool = DialogueTemplates[mood] ?? ["..."];
    return {
      line: pool[Math.floor(Math.random() * pool.length)],
      contextSummary: {
        culture: context.culture,
        religion: context.religion
      }
    };
  }
}
```

---

DATEI
DialogueTemplates.ts

PFAD
/server/src/modules/dialogue/DialogueTemplates.ts

INHALT
```
export const DialogueTemplates = {
  greeting: [
    "Na Süßer, suchst du Abenteuer?",
    "Du siehst aus, als hättest du Ärger im Gepäck.",
    "Setz dich, ich erzähl dir was Interessantes."
  ],
  rumor: [
    "Im Nordwald wurden alte Mauern gesehen.",
    "Die Händler reden von seltsamen Kreaturen im Moor.",
    "Ein Königreich im Osten ist nervös."
  ],
  warning: [
    "Geh da nicht unvorbereitet hinein.",
    "Manche Wege fressen ganze Blutlinien.",
    "Nicht jede Ruine will entdeckt werden."
  ]
};
```

---

DATEI
DungeonGenerator.ts

PFAD
/server/src/modules/dungeon/DungeonGenerator.ts

INHALT
```
export class DungeonGenerator {
  generate(seed: number) {
    const rooms = [];
    const roomCount = 4 + Math.floor(Math.abs(Math.sin(seed)) * 6);
    for (let i = 0; i < roomCount; i++) {
      rooms.push({
        id: i,
        type: this.randomRoom(seed + i),
        danger: 1 + (i % 5)
      });
    }
    return { seed, rooms };
  }

  randomRoom(seed: number) {
    const types = [
      "hall",
      "treasure_room",
      "monster_lair",
      "collapsed_passage",
      "ancient_shrine"
    ];
    return types[Math.abs(Math.floor(seed)) % types.length];
  }
}
```

---

DATEI
EconomyEngine.ts

PFAD
/server/src/modules/economy/EconomyEngine.ts

INHALT
```
export class EconomyEngine {
  private markets = new Map<string, { goods: Record<string, number> }>();

  registerMarket(id: string) {
    this.markets.set(id, { goods: {} });
  }

  trade(marketId: string, item: string, amount: number) {
    const market = this.markets.get(marketId);
    if (!market) return null;
    if (!market.goods[item]) market.goods[item] = 0;
    market.goods[item] += amount;
    return market.goods[item];
  }
}
```

---

DATEI
MarketExpansion.ts

PFAD
/server/src/modules/economy/MarketExpansion.ts

INHALT
```
export class MarketExpansion {
  calculateRegionalModifier(region: string) {
    if (region === "warzone") return 1.5;
    if (region === "trade_hub") return 0.9;
    return 1.0;
  }

  applyModifier(basePrice: number, modifier: number) {
    return Math.max(1, Math.round(basePrice * modifier));
  }
}
```

---

DATEI
MatrixEnergySystem.ts

PFAD
/server/src/modules/economy/MatrixEnergySystem.ts

INHALT
```
export class MatrixEnergySystem {
  private balances = new Map<string, number>();

  add(playerId: string, amount: number) {
    const current = this.balances.get(playerId) || 0;
    this.balances.set(playerId, current + amount);
  }

  consume(playerId: string, amount: number) {
    const current = this.balances.get(playerId) || 0;
    if (current < amount) return false;
    this.balances.set(playerId, current - amount);
    return true;
  }

  getBalance(playerId: string) {
    return this.balances.get(playerId) || 0;
  }
}
```

---

DATEI
TradeRoutes.ts

PFAD
/server/src/modules/economy/TradeRoutes.ts

INHALT
```
export class TradeRoutes {
  createRoute(a: string, b: string) {
    return {
      from: a,
      to: b,
      active: true
    };
  }
}
```

---

DATEI
WorldEventLayer.ts

PFAD
/server/src/modules/events/WorldEventLayer.ts

INHALT
```
export class WorldEventLayer {
  createEvent(type: string, region: string) {
    return {
      type,
      region,
      createdAt: Date.now(),
      active: true
    };
  }
}
```

---

DATEI
GMCommandLayer.ts

PFAD
/server/src/modules/gm/GMCommandLayer.ts

INHALT
```
export class GMCommandLayer {
  execute(command: string, args: string[] = []) {
    return {
      command,
      args,
      executedAt: Date.now(),
      status: "accepted"
    };
  }
}
```

---

DATEI
FarmingSystem.ts

PFAD
/server/src/modules/growth/FarmingSystem.ts

INHALT
```
export class FarmingSystem {
  plant(seedId: string, biome: string) {
    return {
      seedId,
      biome,
      plantedAt: Date.now(),
      growth: 0
    };
  }

  tick(crop: any) {
    crop.growth += 1;
    return crop;
  }
}
```

---

DATEI
TreeGrowthSystem.ts

PFAD
/server/src/modules/growth/TreeGrowthSystem.ts

INHALT
```
export class TreeGrowthSystem {
  grow(tree: any) {
    const stages = ["young", "spring", "summer", "autumn"];
    const index = stages.indexOf(tree.stage ?? "young");
    if (index < 0 || index >= stages.length - 1) return tree;
    tree.stage = stages[index + 1];
    return tree;
  }
}
```

---

DATEI
DudenregisterHistory.ts

PFAD
/server/src/modules/history/DudenregisterHistory.ts

INHALT
```
export class DudenregisterHistory {
  private history: any[] = [];

  record(event: any) {
    this.history.push(event);
  }

  getHistory() {
    return this.history;
  }
}
```

---

DATEI
WorldSnapshotSystem.ts

PFAD
/server/src/modules/history/WorldSnapshotSystem.ts

INHALT
```
export class WorldSnapshotSystem {
  private snapshots: any[] = [];

  save(worldState: any) {
    this.snapshots.push({
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(worldState))
    });
  }

  latest() {
    return this.snapshots[this.snapshots.length - 1] ?? null;
  }
}
```

---

DATEI
InventorySystem.ts

PFAD
/server/src/modules/inventory/InventorySystem.ts

INHALT
```
export class InventorySystem {
  addItem(player: any, item: any) {
    player.inventory.push(item);
    return player.inventory;
  }

  removeItem(player: any, itemId: string) {
    player.inventory = player.inventory.filter((item: any) => item.id !== itemId);
    return player.inventory;
  }
}
```

---

DATEI
AffixSystem.ts

PFAD
/server/src/modules/loot/AffixSystem.ts

INHALT
```
export class AffixSystem {
  rollAffixes(rarity: string) {
    const pool = [
      "plus_strength",
      "plus_health",
      "plus_attack_speed",
      "plus_mining",
      "plus_fire_resistance"
    ];

    const countMap: Record<string, number> = {
      common: 0,
      uncommon: 1,
      rare: 2,
      epic: 3,
      legendary: 4,
      mythic: 5
    };

    const count = countMap[rarity] ?? 0;
    return pool.slice(0, count);
  }
}
```

---

DATEI
ItemGenerator.ts

PFAD
/server/src/modules/loot/ItemGenerator.ts

INHALT
```
export class ItemGenerator {
  generate(baseId: string, rarity: string, affixes: string[] = []) {
    return {
      id: baseId,
      rarity,
      affixes,
      generatedAt: Date.now()
    };
  }
}
```

---

DATEI
LootTables.ts

PFAD
/server/src/modules/loot/LootTables.ts

INHALT
```
export const LootTables = {
  wolf: [
    { id: "wolf_pelt", chance: 0.65, rarity: "common" },
    { id: "fang", chance: 0.3, rarity: "common" },
    { id: "alpha_claw", chance: 0.05, rarity: "rare" }
  ],
  skeleton: [
    { id: "bone_fragment", chance: 0.7, rarity: "common" },
    { id: "rusted_blade", chance: 0.2, rarity: "uncommon" },
    { id: "grave_ring", chance: 0.03, rarity: "rare" }
  ],
  ruin_cache: [
    { id: "ancient_coin", chance: 0.5, rarity: "uncommon" },
    { id: "relic_fragment", chance: 0.2, rarity: "rare" },
    { id: "forgotten_sigil", chance: 0.02, rarity: "legendary" }
  ]
};
```

---

DATEI
MagicSystem.ts

PFAD
/server/src/modules/magic/MagicSystem.ts

INHALT
```
export class MagicSystem {
  cast(caster: any, spell: any, target: any) {
    if ((caster.mana ?? 0) < spell.cost) {
      return { success: false, reason: "not_enough_mana" };
    }

    caster.mana -= spell.cost;

    return {
      success: true,
      spell: spell.id,
      target: target?.id ?? null,
      effect: spell.effect ?? "generic_magic_effect"
    };
  }
}
```

---

DATEI
MonsterDNA.ts

PFAD
/server/src/modules/monster/MonsterDNA.ts

INHALT
```
export function generateMonsterDNA(species: string) {
  return {
    species,
    strength: Math.random(),
    speed: Math.random(),
    aggression: Math.random(),
    intelligence: Math.random(),
    resilience: Math.random()
  };
}
```

---

DATEI
MonsterMutation.ts

PFAD
/server/src/modules/monster/MonsterMutation.ts

INHALT
```
export function mutateMonster(dna: any, biome: string) {
  const clone = { ...dna, mutations: [] as string[] };

  if (biome === "snow") {
    clone.resilience += 0.2;
    clone.mutations.push("frost_resistance");
  }

  if (biome === "swamp") {
    clone.aggression += 0.15;
    clone.mutations.push("swamp_hunger");
  }

  if (Math.random() < 0.08) {
    clone.mutations.push("rare_variant");
  }

  return clone;
}
```

---

DATEI
MonsterSpawner.ts

PFAD
/server/src/modules/monster/MonsterSpawner.ts

INHALT
```
import { generateMonsterDNA } from "./MonsterDNA.js";
import { mutateMonster } from "./MonsterMutation.js";

export class MonsterSpawner {
  spawn(species: string, biome: string) {
    const dna = generateMonsterDNA(species);
    return mutateMonster(dna, biome);
  }
}
```

---

DATEI
NPCDialogueSystem.ts

PFAD
/server/src/modules/npc/NPCDialogueSystem.ts

INHALT
```
export class NPCDialogueSystem {
  talk(npc: any, worldSignals: any = {}) {
    const lines = npc.dialogueLines || [
      "Die Welt flüstert merkwürdige Dinge.",
      "Ich habe da ein Gerücht gehört."
    ];

    return {
      line: lines[Math.floor(Math.random() * lines.length)],
      signals: worldSignals
    };
  }
}
```

---

DATEI
NPCGenealogyEngine.ts

PFAD
/server/src/modules/npc/NPCGenealogyEngine.ts

INHALT
```
export class NPCGenealogyEngine {
  createLineage(id: string, house: string, parents: string[] = []) {
    return {
      id,
      house,
      parents,
      children: [] as string[]
    };
  }

  addChild(lineage: any, childId: string) {
    lineage.children.push(childId);
    return lineage;
  }
}
```

---

DATEI
NPCMemoryEngine.ts

PFAD
/server/src/modules/npc/NPCMemoryEngine.ts

INHALT
```
export class NPCMemoryEngine {
  private memory = new Map<string, any[]>();

  remember(npcId: string, event: any) {
    if (!this.memory.has(npcId)) this.memory.set(npcId, []);
    this.memory.get(npcId)!.push({
      timestamp: Date.now(),
      event
    });
  }

  recall(npcId: string) {
    return this.memory.get(npcId) || [];
  }
}
```

---

DATEI
NPCPersonalityEngine.ts

PFAD
/server/src/modules/npc/NPCPersonalityEngine.ts

INHALT
```
export class NPCPersonalityEngine {
  generateTraits() {
    return {
      courage: Math.random(),
      curiosity: Math.random(),
      greed: Math.random(),
      faith: Math.random(),
      aggression: Math.random()
    };
  }
}
```

---

DATEI
ObserverEngine.ts

PFAD
/server/src/modules/observer/ObserverEngine.ts

INHALT
```
export class ObserverEngine {
  private observers = new Map<string, { x: number; y: number }>();

  register(playerId: string, position: { x: number; y: number }) {
    this.observers.set(playerId, position);
  }

  unregister(playerId: string) {
    this.observers.delete(playerId);
  }

  getObservedChunks() {
    const result = [] as { chunkX: number; chunkY: number }[];
    for (const [, pos] of this.observers) {
      result.push({
        chunkX: Math.floor(pos.x / 64),
        chunkY: Math.floor(pos.y / 64)
      });
    }
    return result;
  }
}
```

---

DATEI
OracleEngine.ts

PFAD
/server/src/modules/oracle/OracleEngine.ts

INHALT
```
export class OracleEngine {
  generateVision() {
    const visions = [
      "Ich sehe Feuer im Norden.",
      "Unter alten Mauern liegt ein Geheimnis.",
      "Ein Königreich wird fallen."
    ];
    return visions[Math.floor(Math.random() * visions.length)];
  }
}
```

---

DATEI
CivilizationDatabase.ts

PFAD
/server/src/modules/persistence/CivilizationDatabase.ts

INHALT
```
export class CivilizationDatabase {
  private civilizations = new Map<string, any>();

  saveCivilization(civ: any) {
    this.civilizations.set(civ.id, civ);
  }

  loadCivilization(id: string) {
    return this.civilizations.get(id) ?? null;
  }
}
```

---

DATEI
PlayerDatabase.ts

PFAD
/server/src/modules/persistence/PlayerDatabase.ts

INHALT
```
export class PlayerDatabase {
  private players = new Map<string, any>();

  savePlayer(player: any) {
    this.players.set(player.id, player);
  }

  loadPlayer(id: string) {
    return this.players.get(id) ?? null;
  }
}
```

---

DATEI
WorldDatabase.ts

PFAD
/server/src/modules/persistence/WorldDatabase.ts

INHALT
```
export class WorldDatabase {
  private chunks = new Map<string, any>();

  saveChunk(chunk: any) {
    this.chunks.set(chunk.id, chunk);
  }

  loadChunk(id: string) {
    return this.chunks.get(id) ?? null;
  }
}
```

---

DATEI
PlayerSystem.ts

PFAD
/server/src/modules/player/PlayerSystem.ts

INHALT
```
export class PlayerSystem {
  createPlayer(id: string, name: string) {
    return {
      id,
      name,
      position: { x: 0, y: 0, z: 0 },
      health: 100,
      stamina: 100,
      mana: 25,
      skills: {},
      inventory: [],
      faction: null,
      civilization: null,
      matrixEnergy: 0
    };
  }
}
```

---

DATEI
GovernmentTypes.ts

PFAD
/server/src/modules/politics/GovernmentTypes.ts

INHALT
```
export const GovernmentTypes = {
  monarchy: { id: "monarchy", succession: "inheritance", stabilityBase: 0.7 },
  council: { id: "council", succession: "vote", stabilityBase: 0.6 },
  theocracy: { id: "theocracy", succession: "religious_selection", stabilityBase: 0.65 },
  trade_republic: { id: "trade_republic", succession: "merchant_vote", stabilityBase: 0.55 },
  warband: { id: "warband", succession: "strength", stabilityBase: 0.4 }
};
```

---

DATEI
WarEngine.ts

PFAD
/server/src/modules/politics/WarEngine.ts

INHALT
```
export class WarEngine {
  declareWar(attacker: any, defender: any) {
    return {
      type: "war_declared",
      attacker: attacker.id,
      defender: defender.id,
      timestamp: Date.now()
    };
  }
}
```

---

DATEI
QuestEngine.ts

PFAD
/server/src/modules/quest/QuestEngine.ts

INHALT
```
import { QuestRegistry } from "./QuestRegistry.js";

export class QuestEngine {
  private active = new Map<string, any[]>();

  startQuest(playerId: string, questId: keyof typeof QuestRegistry) {
    const quest = QuestRegistry[questId];
    if (!quest) return null;
    if (!this.active.has(playerId)) this.active.set(playerId, []);
    this.active.get(playerId)!.push({ ...quest, startedAt: Date.now(), completed: false });
    return quest;
  }

  listQuests(playerId: string) {
    return this.active.get(playerId) || [];
  }

  completeQuest(playerId: string, questId: string) {
    const quests = this.active.get(playerId) || [];
    const q = quests.find((x) => x.id === questId);
    if (!q) return null;
    q.completed = true;
    q.completedAt = Date.now();
    return q.reward;
  }
}
```

---

DATEI
QuestRegistry.ts

PFAD
/server/src/modules/quest/QuestRegistry.ts

INHALT
```
export const QuestRegistry = {
  ruin_hunter: {
    id: "ruin_hunter",
    name: "Die alten Mauern",
    giver: "uschi_gossip",
    objective: "find_ruins",
    reward: { gold: 100, item: "ancient_relic" }
  },
  watchtower_supply: {
    id: "watchtower_supply",
    name: "Die hungernden Wächter",
    giver: "city_guard",
    objective: "deliver_supplies",
    reward: { xp: 50, item: "guard_token" }
  }
};
```

---

DATEI
ReligionSystem.ts

PFAD
/server/src/modules/religion/ReligionSystem.ts

INHALT
```
export class ReligionSystem {
  private religions = new Map<string, any>();

  registerReligion(id: string, data: any) {
    this.religions.set(id, data);
  }

  getReligion(id: string) {
    return this.religions.get(id);
  }
}
```

---

DATEI
SkillSystem.ts

PFAD
/server/src/modules/skill/SkillSystem.ts

INHALT
```
export class SkillSystem {
  ensureSkill(player: any, skillName: string) {
    if (!player.skills[skillName]) {
      player.skills[skillName] = { level: 1, xp: 0 };
    }
  }

  addXP(player: any, skillName: string, amount: number) {
    this.ensureSkill(player, skillName);
    const skill = player.skills[skillName];
    skill.xp += amount;
    while (skill.xp >= this.nextLevelXP(skill.level)) {
      skill.level += 1;
    }
    return skill;
  }

  nextLevelXP(level: number) {
    return Math.floor(50 * Math.pow(level, 1.4));
  }
}
```

---

DATEI
GateController.ts

PFAD
/server/src/modules/structure/GateController.ts

INHALT
```
export class GateController {
  setState(gate: any, state: string) {
    const allowed = ["open", "closed", "locked", "damaged", "destroyed"];
    if (!allowed.includes(state)) throw new Error("Invalid gate state");
    gate.state = state;
    return gate;
  }

  canOpen(actor: any, gate: any) {
    if (gate.state === "destroyed") return false;
    if (gate.state === "locked" && !actor.permissions?.includes("gate_access")) return false;
    return true;
  }
}
```

---

DATEI
StructureEngine.ts

PFAD
/server/src/modules/structure/StructureEngine.ts

INHALT
```
export class StructureEngine {
  private structures = new Map<string, any>();

  createStructure(structure: any) {
    this.structures.set(structure.structureId, structure);
    return structure;
  }

  getStructure(id: string) {
    return this.structures.get(id) ?? null;
  }

  damageStructure(id: string, amount: number) {
    const structure = this.structures.get(id);
    if (!structure) return null;
    structure.hitpoints = Math.max(0, structure.hitpoints - amount);
    if (structure.hitpoints === 0) structure.destroyed = true;
    return structure;
  }
}
```

---

DATEI
BiomeGenerator.ts

PFAD
/server/src/modules/world/BiomeGenerator.ts

INHALT
```
export class BiomeGenerator {
  getBiome(_x: number, _y: number, height: number) {
    if (height > 0.7) return "mountain";
    if (height > 0.45) return "forest";
    if (height > 0.2) return "grassland";
    return "desert";
  }
}
```

---

DATEI
ChunkSystem.ts

PFAD
/server/src/modules/world/ChunkSystem.ts

INHALT
```
export class ChunkSystem {
  constructor(public readonly size: number = 64) {}

  getChunk(x: number, y: number) {
    return {
      id: `${x}:${y}`,
      x,
      y,
      size: this.size
    };
  }
}
```

---

DATEI
TerrainGenerator.ts

PFAD
/server/src/modules/world/TerrainGenerator.ts

INHALT
```
export class TerrainGenerator {
  getHeight(x: number, y: number) {
    return Math.sin(x * 0.1) + Math.cos(y * 0.1);
  }
}
```

---

DATEI
WorldEditorServer.ts

PFAD
/server/src/modules/world-editor/WorldEditorServer.ts

INHALT
```
export class WorldEditorServer {
  spawnEntity(type: string, position: { x: number; y: number; z: number }) {
    return { action: "spawn", type, position };
  }

  moveEntity(entityId: string, position: { x: number; y: number; z: number }) {
    return { action: "move", entityId, position };
  }

  deleteEntity(entityId: string) {
    return { action: "delete", entityId };
  }
}
```

---

DATEI
PacketRouter.ts

PFAD
/server/src/networking/PacketRouter.ts

INHALT
```
export class PacketRouter {
  route(packet: any) {
    return {
      handled: true,
      type: packet?.type ?? "unknown"
    };
  }
}
```

---

DATEI
PlayerSession.ts

PFAD
/server/src/networking/PlayerSession.ts

INHALT
```
export type PlayerSession = {
  id: string;
  name: string;
  connectedAt: number;
  position: { x: number; y: number; z: number };
};
```

---

DATEI
WebSocketServer.ts

PFAD
/server/src/networking/WebSocketServer.ts

INHALT
```
import type { Server as HttpServer } from "node:http";
import { WebSocketServer } from "ws";

export class GameWebSocketServer {
  private wss: WebSocketServer | null = null;

  constructor(private readonly httpServer: HttpServer) {}

  start() {
    this.wss = new WebSocketServer({ server: this.httpServer });

    this.wss.on("connection", (socket) => {
      socket.send(JSON.stringify({
        type: "welcome",
        message: "Arelorian connection established"
      }));

      socket.on("message", (msg) => {
        console.log("WS message:", msg.toString());
      });
    });
  }
}
```

---

DATEI
tsconfig.json

PFAD
/server/tsconfig.json

INHALT
```
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": [
    "src/**/*"
  ]
}
```

---

DATEI
README_ASSETS.md

PFAD
/world-assets/README_ASSETS.md

INHALT
```
# World Assets

Lege hier GLB-Assets ab:
- characters/
- monsters/
- buildings/
- props/
- vegetation/
- admin/

Beispiele:
- uschi_gossip.glb
- warrior_male.glb
- warrior_female.glb
- castle_gate.glb
- castle_watch_tower.glb
- tree_oak_spring.glb
- gm_giraffe.glb
```
```

---

DATEI
areloria_reconstruction_pack_working.txt

PFAD
/areloria_reconstruction_pack_working.txt

INHALT
```
# ARELORIA RECONSTRUCTION PACK WORKING

Dieses Dokument ist für No-Code/Agent-Rekonstruktion gedacht.
Jede Datei ist mit DATEI, PFAD und INHALT angegeben.

---

DATEI
CHECKED_CONTENT_REPORT.md

PFAD
/CHECKED_CONTENT_REPORT.md

INHALT
```
# Checked Content Report

Dieses Paket wurde **neu** aufgebaut, damit es nicht wieder nur aus fast leeren Ordnern besteht.

## Enthalten
- Root-Dateien
- 9 Hauptdokumente
- 3 final-lock-Dateien
- 3 agent-Dateien
- Server core + networking
- 21 Server-Moduldateien
- Client package + renderer + websocket + HUD
- Game-data-Dateien
- Integrationsplatzhalter
- Admin-/Asset-Readmes

## Dateianzahl
79
```

---

DATEI
MASTER_INDEX.md

PFAD
/MASTER_INDEX.md

INHALT
```
# Master Index

## Root
- README_START_HERE.md
- PROJECT_LOCK_RULES.md
- MASTER_INDEX.md

## Core Docs
- docs/MASTER_DESIGN_BIBLE.md
- docs/MASTER_SYSTEM_CHECKLIST.md
- docs/BUILD_SEQUENCE_MASTER.md
- docs/WORLD_GENERATION.md
- docs/NPC_SYSTEM.md
- docs/ECONOMY_MODEL.md
- docs/BRAIN_SYSTEM.md
- docs/ASSET_PIPELINE.md
- docs/GM_EDITOR.md

## Final Lock
- final-lock/FINAL_TRUTH.md
- final-lock/DO_NOT_SIMPLIFY.md
- final-lock/REQUIRED_SYSTEMS_MATRIX.md

## Agent
- agent/AGENT_BUILD_INSTRUCTIONS.md
- agent/ARELORIAN_SUPER_PROMPT.md
- agent/AI_AGENT_FAILSAFE_RULES.md

## Code
- server/
- client/

## Data
- game-data/
- world-assets/

## Ops
- integrations/
- admin-tools/
```

---

DATEI
PACK_BUILD_STATUS.md

PFAD
/PACK_BUILD_STATUS.md

INHALT
```
# Pack Build Status

Aktueller Arbeitsstand im Sammelmodus.

## Neues Ausbaupaket ergänzt
- CraftingSystem
- RecipeRegistry
- TreeGrowthSystem
- FarmingSystem
- ItemGenerator
- AffixSystem
- GMCommandLayer
- MarketExpansion
- WorldEventLayer
- NPCSchedules
- AdminMountRegistry
- GiraffeAdminMount
- zusätzliche Doku
- zusätzliche Game-Data
- zusätzliche Client-UI-Dateien

## Aktuelle Dateianzahl
147
```

---

DATEI
PROJECT_LOCK_RULES.md

PFAD
/PROJECT_LOCK_RULES.md

INHALT
```
# Project Lock Rules

Diese Regeln dürfen nicht gebrochen werden.

1. Kein Umbau zu einer simplen Demo-App.
2. Chunkgröße bleibt 64x64.
3. Observer-Axiom bleibt Pflicht.
4. Server bleibt autoritativ.
5. NPC-Personality, NPC-Memory und Genealogie bleiben Pflichtsysteme.
6. Spieler- und NPC-Politik bleiben Pflichtsysteme.
7. Matrix-Energie bleibt Infrastrukturwährung.
8. Server-Brain mit 13 Punkten bleibt Pflicht.
9. GM-World-Editor bleibt Pflicht.
10. GLB-Asset-Pipeline bleibt Pflicht.
```

---

DATEI
README_START_HERE.md

PFAD
/README_START_HERE.md

INHALT
```
# Arelorian Master Project

Dieses Paket ist ein **voller Entwicklungs-Scaffold** für das Arelorian/Ouroboros Browser-MMORPG.
Es ist **kein leeres Ordnerpaket** und **keine Demo-App**, sondern eine strukturierte Grundlage mit:
- Architektur- und Regeldokumenten
- Server-Modulen als TypeScript-Skeletons
- Client-Grundgerüst mit Three.js
- Game-Data-Dateien
- Integrationsplatzhaltern für Firebase/AWS
- Admin-/GM-Editor-Grunddateien
- Asset-Import-Hinweisen für GLB-Dateien

## Sofort lesen
1. `PROJECT_LOCK_RULES.md`
2. `final-lock/FINAL_TRUTH.md`
3. `docs/MASTER_DESIGN_BIBLE.md`
4. `docs/BUILD_SEQUENCE_MASTER.md`
5. `agent/AGENT_BUILD_INSTRUCTIONS.md`

## Projektstatus
Dieses Paket liefert ein **ausgebautes Fundament**. Es ist nicht das komplett fertige MMO,
aber es ist eine **brauchbare, nicht-leere Arbeitsbasis**, die weiter implementiert werden kann.
```

---

DATEI
README_ADMIN.md

PFAD
/admin-tools/README_ADMIN.md

INHALT
```
# Admin Tools

Hier liegen GM- und World-Editor-Hinweise.

## Geplant
- WorldEditor.ts
- TerrainBrush.ts
- ObjectPlacement.ts
- GMControlPanel.ts
- LiveWorldControl.ts

Das Mount `gm_giraffe` kann später den Admin-Modus markieren.
```

---

DATEI
AGENT_BUILD_INSTRUCTIONS.md

PFAD
/agent/AGENT_BUILD_INSTRUCTIONS.md

INHALT
```
# Agent Build Instructions

1. Lies zuerst alle Lock-Dateien.
2. Verändere keine Kernregeln.
3. Baue in der vorgegebenen Reihenfolge.
4. Halte Serverlogik serverseitig.
5. Nutze das Clientgerüst nur für Darstellung.

## Wichtige Reihenfolge
server core -> world -> observer -> npc -> civilization -> economy -> gameplay -> brain -> assets -> gm editor -> client -> integrations
```

---

DATEI
AI_AGENT_FAILSAFE_RULES.md

PFAD
/agent/AI_AGENT_FAILSAFE_RULES.md

INHALT
```
# AI Agent Failsafe Rules

- Do not remove observer simulation
- Do not remove chunk size 64x64
- Do not remove NPC memory/genealogy
- Do not remove politics
- Do not remove matrix energy
- Do not remove brain
- Do not remove GM editor
- Do not remove GLB pipeline
```

---

DATEI
ARELORIAN_SUPER_PROMPT.md

PFAD
/agent/ARELORIAN_SUPER_PROMPT.md

INHALT
```
# Arelorian Super Prompt

Build a persistent browser MMORPG with:
- procedural world
- 64x64 chunks
- observer-driven simulation
- NPC personality, memory, genealogy, politics
- player civilization and NPC civilization
- matrix energy economy
- 13-node server brain
- GLB asset pipeline
- GM world editor

Do not simplify it into a prototype app.
```

---

DATEI
areloria_reconstruction_pack_fuller.md

PFAD
/areloria_reconstruction_pack_fuller.md

INHALT
```
# ARELORIA RECONSTRUCTION PACK FULLER

DATEI / PFAD / INHALT für Agent-Rekonstruktion

---

DATEI
CHECKED_CONTENT_REPORT.md

PFAD
/CHECKED_CONTENT_REPORT.md

INHALT
```
# Checked Content Report

Dieses Paket wurde **neu** aufgebaut, damit es nicht wieder nur aus fast leeren Ordnern besteht.

## Enthalten
- Root-Dateien
- 9 Hauptdokumente
- 3 final-lock-Dateien
- 3 agent-Dateien
- Server core + networking
- 21 Server-Moduldateien
- Client package + renderer + websocket + HUD
- Game-data-Dateien
- Integrationsplatzhalter
- Admin-/Asset-Readmes

## Dateianzahl
79
```

---

DATEI
MASTER_INDEX.md

PFAD
/MASTER_INDEX.md

INHALT
```
# Master Index

## Root
- README_START_HERE.md
- PROJECT_LOCK_RULES.md
- MASTER_INDEX.md

## Core Docs
- docs/MASTER_DESIGN_BIBLE.md
- docs/MASTER_SYSTEM_CHECKLIST.md
- docs/BUILD_SEQUENCE_MASTER.md
- docs/WORLD_GENERATION.md
- docs/NPC_SYSTEM.md
- docs/ECONOMY_MODEL.md
- docs/BRAIN_SYSTEM.md
- docs/ASSET_PIPELINE.md
- docs/GM_EDITOR.md

## Final Lock
- final-lock/FINAL_TRUTH.md
- final-lock/DO_NOT_SIMPLIFY.md
- final-lock/REQUIRED_SYSTEMS_MATRIX.md

## Agent
- agent/AGENT_BUILD_INSTRUCTIONS.md
- agent/ARELORIAN_SUPER_PROMPT.md
- agent/AI_AGENT_FAILSAFE_RULES.md

## Code
- server/
- client/

## Data
- game-data/
- world-assets/

## Ops
- integrations/
- admin-tools/
```

---

DATEI
PACK_BUILD_STATUS.md

PFAD
/PACK_BUILD_STATUS.md

INHALT
```
# Pack Build Status

## Bereits aufgebaut
- Root rules/docs
- Final lock files
- Agent files
- Server core
- Networking
- World + observer
- NPC systems
- Dialogue + quest
- Dungeon + monster
- Structure + gate + asset registry
- AI behavior
- Persistence
- Client core + renderer + websocket + HUD + editor UI
- Game data basics
- Integrations placeholders

## Nächste vertiefbare Blöcke
- vollständiger GM command layer
- richer item generator + affix logic
- crafting system
- farming / tree growth logic
- city market simulation expansion
- real auth / persistence adapters
```

---

DATEI
PROJECT_LOCK_RULES.md

PFAD
/PROJECT_LOCK_RULES.md

INHALT
```
# Project Lock Rules

Diese Regeln dürfen nicht gebrochen werden.

1. Kein Umbau zu einer simplen Demo-App.
2. Chunkgröße bleibt 64x64.
3. Observer-Axiom bleibt Pflicht.
4. Server bleibt autoritativ.
5. NPC-Personality, NPC-Memory und Genealogie bleiben Pflichtsysteme.
6. Spieler- und NPC-Politik bleiben Pflichtsysteme.
7. Matrix-Energie bleibt Infrastrukturwährung.
8. Server-Brain mit 13 Punkten bleibt Pflicht.
9. GM-World-Editor bleibt Pflicht.
10. GLB-Asset-Pipeline bleibt Pflicht.
```

---

DATEI
README_START_HERE.md

PFAD
/README_START_HERE.md

INHALT
```
# Arelorian Master Project

Dieses Paket ist ein **voller Entwicklungs-Scaffold** für das Arelorian/Ouroboros Browser-MMORPG.
Es ist **kein leeres Ordnerpaket** und **keine Demo-App**, sondern eine strukturierte Grundlage mit:
- Architektur- und Regeldokumenten
- Server-Modulen als TypeScript-Skeletons
- Client-Grundgerüst mit Three.js
- Game-Data-Dateien
- Integrationsplatzhaltern für Firebase/AWS
- Admin-/GM-Editor-Grunddateien
- Asset-Import-Hinweisen für GLB-Dateien

## Sofort lesen
1. `PROJECT_LOCK_RULES.md`
2. `final-lock/FINAL_TRUTH.md`
3. `docs/MASTER_DESIGN_BIBLE.md`
4. `docs/BUILD_SEQUENCE_MASTER.md`
5. `agent/AGENT_BUILD_INSTRUCTIONS.md`

## Projektstatus
Dieses Paket liefert ein **ausgebautes Fundament**. Es ist nicht das komplett fertige MMO,
aber es ist eine **brauchbare, nicht-leere Arbeitsbasis**, die weiter implementiert werden kann.
```

---

DATEI
README_ADMIN.md

PFAD
/admin-tools/README_ADMIN.md

INHALT
```
# Admin Tools

Hier liegen GM- und World-Editor-Hinweise.

## Geplant
- WorldEditor.ts
- TerrainBrush.ts
- ObjectPlacement.ts
- GMControlPanel.ts
- LiveWorldControl.ts

Das Mount `gm_giraffe` kann später den Admin-Modus markieren.
```

---

DATEI
AGENT_BUILD_INSTRUCTIONS.md

PFAD
/agent/AGENT_BUILD_INSTRUCTIONS.md

INHALT
```
# Agent Build Instructions

1. Lies zuerst alle Lock-Dateien.
2. Verändere keine Kernregeln.
3. Baue in der vorgegebenen Reihenfolge.
4. Halte Serverlogik serverseitig.
5. Nutze das Clientgerüst nur für Darstellung.

## Wichtige Reihenfolge
server core -> world -> observer -> npc -> civilization -> economy -> gameplay -> brain -> assets -> gm editor -> client -> integrations
```

---

DATEI
AI_AGENT_FAILSAFE_RULES.md

PFAD
/agent/AI_AGENT_FAILSAFE_RULES.md

INHALT
```
# AI Agent Failsafe Rules

- Do not remove observer simulation
- Do not remove chunk size 64x64
- Do not remove NPC memory/genealogy
- Do not remove politics
- Do not remove matrix energy
- Do not remove brain
- Do not remove GM editor
- Do not remove GLB pipeline
```

---

DATEI
ARELORIAN_SUPER_PROMPT.md

PFAD
/agent/ARELORIAN_SUPER_PROMPT.md

INHALT
```
# Arelorian Super Prompt

Build a persistent browser MMORPG with:
- procedural world
- 64x64 chunks
- observer-driven simulation
- NPC personality, memory, genealogy, politics
- player civilization and NPC civilization
- matrix energy economy
- 13-node server brain
- GLB asset pipeline
- GM world editor

Do not simplify it into a prototype app.
```

---

DATEI
package.json

PFAD
/client/package.json

INHALT
```
{
  "name": "areloria-client",
  "version": "0.2.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "three": "^0.169.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^5.4.0"
  }
}
```

---

DATEI
index.html

PFAD
/client/public/index.html

INHALT
```
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
    <title>Arelorian Client</title>
  </head>
  <body>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

---

DATEI
AssetLoader.ts

PFAD
/client/src/assets/AssetLoader.ts

INHALT
```
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class AssetLoader {
  private loader = new GLTFLoader();

  load(path: string) {
    return new Promise((resolve, reject) => {
      this.loader.load(path, (gltf) => resolve(gltf.scene), undefined, reject);
    });
  }
}
```

---

DATEI
ModelRegistry.ts

PFAD
/client/src/assets/ModelRegistry.ts

INHALT
```
export const ModelRegistry = {
  uschi: { path: "/assets/models/characters/uschi_gossip.glb", scale: 1 },
  castle_wall: { path: "/assets/models/buildings/castle_wall.glb", scale: 1 },
  watch_tower: { path: "/assets/models/buildings/castle_watch_tower.glb", scale: 1 },
  tree_spring: { path: "/assets/models/vegetation/tree_oak_spring.glb", scale: 1 },
  gm_giraffe: { path: "/assets/models/admin/gm_giraffe.glb", scale: 1 }
};
```

---

DATEI
PlacementTool.ts

PFAD
/client/src/editor/PlacementTool.ts

INHALT
```
export class PlacementTool {
  place(type: string, position: { x: number; y: number; z: number }) {
    return { action: "place", type, position };
  }
}
```

---

DATEI
SelectionTool.ts

PFAD
/client/src/editor/SelectionTool.ts

INHALT
```
export class SelectionTool {
  select(entityId: string) {
    return { selected: entityId };
  }
}
```

---

DATEI
WorldEditorUI.ts

PFAD
/client/src/editor/WorldEditorUI.ts

INHALT
```
export function openWorldEditorUI() {
  const el = document.createElement("div");
  el.textContent = "GM World Editor";
  el.style.position = "fixed";
  el.style.right = "12px";
  el.style.bottom = "12px";
  el.style.padding = "10px 14px";
  el.style.background = "#2b2b2b";
  el.style.color = "#fff";
  document.body.appendChild(el);
}
```

---

DATEI
renderer.ts

PFAD
/client/src/engine/renderer.ts

INHALT
```
import * as THREE from "three";

export function initRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshBasicMaterial({ color: 0x44aa88 })
  );

  scene.add(cube);

  function animate() {
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();
}
```

---

DATEI
worldLoader.ts

PFAD
/client/src/engine/worldLoader.ts

INHALT
```
export function loadWorldChunk(chunkX: number, chunkY: number) {
  return {
    chunkX,
    chunkY,
    status: "requested"
  };
}
```

---

DATEI
playerController.ts

PFAD
/client/src/gameplay/playerController.ts

INHALT
```
export class PlayerController {
  move(direction: string) {
    return {
      type: "move",
      direction
    };
  }
}
```

---

DATEI
main.ts

PFAD
/client/src/main.ts

INHALT
```
import { initRenderer } from "./engine/renderer";
import { connectSocket } from "./networking/websocketClient";
import { renderHUD } from "./ui/hud";

const canvas = document.createElement("canvas");
document.body.style.margin = "0";
document.body.appendChild(canvas);

initRenderer(canvas);
connectSocket();
renderHUD();
```

---

DATEI
websocketClient.ts

PFAD
/client/src/networking/websocketClient.ts

INHALT
```
export function connectSocket() {
  const ws = new WebSocket(`ws://${location.hostname}:3000`);

  ws.onopen = () => console.log("Connected to Arelorian server");
  ws.onmessage = (msg) => console.log("Server:", msg.data);

  return ws;
}
```

---

DATEI
chat.ts

PFAD
/client/src/ui/chat.ts

INHALT
```
export function renderChat() {
  const el = document.createElement("div");
  el.textContent = "Chat placeholder";
  el.style.position = "fixed";
  el.style.left = "12px";
  el.style.bottom = "12px";
  el.style.padding = "8px 12px";
  el.style.background = "rgba(0,0,0,0.55)";
  el.style.color = "#fff";
  document.body.appendChild(el);
}
```

---

DATEI
hud.ts

PFAD
/client/src/ui/hud.ts

INHALT
```
export function renderHUD() {
  const hud = document.createElement("div");
  hud.textContent = "Arelorian HUD online";
  hud.style.position = "fixed";
  hud.style.top = "12px";
  hud.style.left = "12px";
  hud.style.padding = "8px 12px";
  hud.style.background = "rgba(0,0,0,0.55)";
  hud.style.color = "#fff";
  hud.style.fontFamily = "sans-serif";
  document.body.appendChild(hud);
}
```

---

DATEI
inventory.ts

PFAD
/client/src/ui/inventory.ts

INHALT
```
export function renderInventory() {
  const el = document.createElement("div");
  el.textContent = "Inventory placeholder";
  el.style.position = "fixed";
  el.style.right = "12px";
  el.style.top = "12px";
  el.style.padding = "8px 12px";
  el.style.background = "rgba(0,0,0,0.55)";
  el.style.color = "#fff";
  document.body.appendChild(el);
}
```

---

DATEI
tsconfig.json

PFAD
/client/tsconfig.json

INHALT
```
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true
  },
  "include": [
    "src/**/*"
  ]
}
```

---

DATEI
ASSET_PIPELINE.md

PFAD
/docs/ASSET_PIPELINE.md

INHALT
```
# Asset Pipeline

## GLB-Regeln
Terrain ist kein GLB-Bodenteppich. GLB wird für NPCs, Monster, Gebäude, Bäume, Props und Reittiere verwendet.

## Struktur
- characters/
- monsters/
- buildings/
- props/
- vegetation/
- admin/

## Validierung
Jedes Asset sollte idealerweise besitzen:
- sauberen Ursprungspunkt
- sinnvolle Skalierung
- optionales Rig/Skeleton
- optional Animationen
```

---

DATEI
BRAIN_SYSTEM.md

PFAD
/docs/BRAIN_SYSTEM.md

INHALT
```
# Brain System

Das Server Brain ist eine heuristische Meta-Schicht.

## Aufgaben
- Spannungen erkennen
- Politiksignale lesen
- Marktanomalien erkennen
- Orakelvisionen speisen
- Ereignisse anstoßen

## 13-Punkte-Modell
- 4 Weltpunkte
- 4 Interpretationspunkte
- 4 Dynamikpunkte
- 1 Zentrum

Das Zentrum aggregiert Weltzustand, NPC-Memory, Ökonomie, Politik und Geschichte.
```

---

DATEI
BUILD_SEQUENCE_MASTER.md

PFAD
/docs/BUILD_SEQUENCE_MASTER.md

INHALT
```
# Build Sequence Master

1. Server core und bootstrap
2. World tick
3. Chunk- und Observer-System
4. Persistence
5. NPC personality + memory + genealogy
6. Civilization + politics
7. Economy + Matrix energy
8. Player, skills, combat, loot
9. Dungeons, ruins, oracle, history
10. Brain + field analyzer
11. Asset registry + GLB loading
12. GM editor
13. Client renderer + websocket sync
14. Firebase/AWS integration
```

---

DATEI
DIALOGUE_SYSTEM.md

PFAD
/docs/DIALOGUE_SYSTEM.md

INHALT
```
# Dialogue System

The dialogue system combines:
- personality traits
- family and lineage
- culture
- religion
- memory
- world events
- oracle/world history signals

## Pipeline
1. build context
2. choose tone
3. choose dialogue pool
4. inject dynamic references
5. return line + optional quest/world hint
```

---

DATEI
DUNGEON_SYSTEM.md

PFAD
/docs/DUNGEON_SYSTEM.md

INHALT
```
# Dungeon System

Dungeons are generated from seeds, ruins and regional history.

## Room types
- hall
- shrine
- monster_lair
- collapsed_passage
- treasure_room
- prison
- relic_chamber

## Inputs
- biome
- ruin class
- ancient civilization markers
- oracle hints
- current danger rating
```

---

DATEI
ECONOMY_MODEL.md

PFAD
/docs/ECONOMY_MODEL.md

INHALT
```
# Economy Model

Die Wirtschaft verbindet Ressourcen, Spieler, NPCs, Märkte und Städte.

## Kernelemente
- Stadtmärkte
- Handelsrouten
- NPC-Händler
- Spielerhandel
- Matrix-Energie
- politische und kriegerische Markteinflüsse

## Preisfaktoren
- Angebot
- Nachfrage
- Krieg
- Knappheit
- Transport
- Stadtsteuern
```

---

DATEI
GM_EDITOR.md

PFAD
/docs/GM_EDITOR.md

INHALT
```
# GM Editor

Der GM-Editor erlaubt Live-Eingriffe in die Welt.

## Fähigkeiten
- Objekte setzen
- NPCs spawnen
- Strukturen verschieben
- Terrainmarker bearbeiten
- Events starten
- Weltzustände prüfen

## Regel
Der Editor ist serverautoritativ. Der Client darf nur Befehle senden.
```

---

DATEI
MASTER_DESIGN_BIBLE.md

PFAD
/docs/MASTER_DESIGN_BIBLE.md

INHALT
```
# Master Design Bible

## Vision
Arelorian ist ein persistentes Browser-MMORPG mit emergenter Weltlogik. Die Welt ist theoretisch unendlich,
wird prozedural erzeugt und über Beobachterzonen simuliert.

## Fünf Axiome
1. Informationsfeld
2. Emergenz
3. Persistenz
4. Ouroboros-Zyklus
5. Beobachter

## Welt
- Prozedurale Welt
- Chunks 64x64
- Biome als natürliche Grenzen
- Ruinen, Dungeons und historische Schichten

## Zivilisationen
- Guild -> Village -> City -> Kingdom -> Nation
- Spieler und NPCs besitzen dieselben zivilisatorischen Rechte

## NPCs
- Personality
- DNA/Traits
- Genealogie und Häuser
- Memory und Shared Memory
- Kultur und Religion
- Politik und Familiengeschichte

## Gameplay
- klassenloses Skill-System
- Skills durch Nutzung
- Stamina als Kernressource
- Diablo-artiges Loot
- Magie als Skillzweig
- Crafting, Handel und Weltwirtschaft

## Systeme
- Server Brain mit 13-Punkte-Modell
- Dudenregister und Orakel
- Matrix-Energie
- Weltwunder und Schattenregisterportal
- GM-Editor
- GLB-Asset-Pipeline
```

---

DATEI
MASTER_SYSTEM_CHECKLIST.md

PFAD
/docs/MASTER_SYSTEM_CHECKLIST.md

INHALT
```
# Master System Checklist

## Welt
- [x] World generator
- [x] 64x64 chunk system
- [x] Observer simulation
- [x] Biome and terrain
- [x] World tick
- [x] Dungeons
- [x] Ruins

## NPC
- [x] Personality engine
- [x] Memory engine
- [x] Shared memory
- [x] Genealogy
- [x] DNA and traits
- [x] Dialogue
- [x] Quests

## Gesellschaft
- [x] Civilization engine
- [x] NPC politics
- [x] Player politics
- [x] Governments
- [x] Taxes
- [x] War

## Gameplay
- [x] Players
- [x] Skills
- [x] Inventory
- [x] Combat
- [x] Loot
- [x] Magic

## Spezial
- [x] Matrix energy
- [x] Dudenregister
- [x] Oracle
- [x] Server brain
- [x] GLB pipeline
- [x] GM editor
```

---

DATEI
MONSTER_SYSTEM.md

PFAD
/docs/MONSTER_SYSTEM.md

INHALT
```
# Monster System

Monsters are generated from:
- species
- dna
- mutation
- biome
- pack memory
- rarity

This allows regional monster lines such as frost wolves, swamp alphas or cave mutants.
```

---

DATEI
NPC_SYSTEM.md

PFAD
/docs/NPC_SYSTEM.md

INHALT
```
# NPC System

## Fünf Einflussfaktoren
- DNA / Traits
- Familie / Genealogie
- Kultur / Herkunft
- Religion / Weltbild
- Erfahrung / Memory

## Memory-Ebenen
- Local memory
- Social memory
- Faction memory
- Historical memory
- Oracle memory

## Verhalten
NPCs können:
- arbeiten
- handeln
- Gerüchte verbreiten
- Familien gründen
- Politik betreiben
- Kriege beginnen oder vermeiden
```

---

DATEI
PERSISTENCE_MODEL.md

PFAD
/docs/PERSISTENCE_MODEL.md

INHALT
```
# Persistence Model

Persistent storage is split by concern:
- world chunks
- players
- civilizations
- history / dudenregister
- snapshots
- asset metadata
```

---

DATEI
STRUCTURE_SYSTEM.md

PFAD
/docs/STRUCTURE_SYSTEM.md

INHALT
```
# Structure System

Structures connect GLB assets to persistent world entities.

## Types
- player_structure
- npc_structure
- civilization_structure
- ruin_structure
- wonder_structure
- matrix_protected_structure

## Examples
- house
- gate
- wall
- watch tower
- workshop
- temple
- shadow register portal
```

---

DATEI
WORLD_GENERATION.md

PFAD
/docs/WORLD_GENERATION.md

INHALT
```
# World Generation

Die Welt wird aus `seed + coordinates` erzeugt.

## Chunkstruktur
Jeder Chunk enthält:
- Terrain
- Biomtyp
- Ressourcen
- Objektliste
- Strukturen
- Ruinen oder Dungeon-Eingänge

## Simulationsebenen
1. Dormant
2. Background simulation
3. Active simulation
4. Full simulation

Nur beobachtete Regionen werden hochauflösend simuliert.
```

---

DATEI
DO_NOT_SIMPLIFY.md

PFAD
/final-lock/DO_NOT_SIMPLIFY.md

INHALT
```
# Do Not Simplify

Nicht reduzieren auf:
- Demo
- UI-Mockup
- Singleplayer-Sandbox
- nur Terrain-Viewer
- nur Client ohne Weltsimulation
```

---

DATEI
FINAL_TRUTH.md

PFAD
/final-lock/FINAL_TRUTH.md

INHALT
```
# Final Truth

Dieses Projekt ist ein persistentes MMORPG und darf nicht auf ein Mockup oder eine Einzelspieler-Demo reduziert werden.

Pflicht:
- 64x64 chunks
- observer simulation
- server-authoritative logic
- NPC memory + genealogy
- player and NPC politics
- matrix energy
- 13-node brain
- GM editor
- GLB pipeline
```

---

DATEI
REQUIRED_SYSTEMS_MATRIX.md

PFAD
/final-lock/REQUIRED_SYSTEMS_MATRIX.md

INHALT
```
# Required Systems Matrix

## Welt
observer, chunks, terrain, biomes, tick, dungeons, ruins

## NPC
personality, memory, shared memory, genealogy, dna, dialogue

## Gesellschaft
civilization, politics, government, tax, war, diplomacy

## Gameplay
player, skills, inventory, combat, loot, magic

## Spezial
oracle, dudenregister, matrix energy, brain, gm editor, glb pipeline
```

---

DATEI
biome-definitions.json

PFAD
/game-data/biomes/biome-definitions.json

INHALT
```
{
  "forest": {
    "temperature": "mild",
    "resources": [
      "wood",
      "berries",
      "animals"
    ]
  },
  "desert": {
    "temperature": "hot",
    "resources": [
      "sand",
      "salt",
      "crystals"
    ]
  },
  "mountain": {
    "temperature": "cold",
    "resources": [
      "stone",
      "iron",
      "gold"
    ]
  }
}
```

---

DATEI
cultures.json

PFAD
/game-data/cultures/cultures.json

INHALT
```
{
  "forest_tribes": {
    "style": "organic"
  },
  "mountain_clans": {
    "style": "stone"
  },
  "desert_nomads": {
    "style": "lightweight"
  }
}
```

---

DATEI
matrix-energy-rules.json

PFAD
/game-data/economy/matrix-energy-rules.json

INHALT
```
{
  "currency": "matrix_energy",
  "npcCannotDestroyProtectedStructures": true
}
```

---

DATEI
dudenregister-schema.json

PFAD
/game-data/history/dudenregister-schema.json

INHALT
```
{
  "events": [
    "war",
    "collapse",
    "ruin",
    "wonder",
    "dynasty",
    "oracle"
  ]
}
```

---

DATEI
loot-tables.json

PFAD
/game-data/items/loot-tables.json

INHALT
```
{
  "wolf": [
    "wolf_pelt",
    "fang",
    "alpha_claw"
  ],
  "skeleton": [
    "bone_fragment",
    "rusted_blade",
    "grave_ring"
  ],
  "ruin_cache": [
    "ancient_coin",
    "relic_fragment",
    "forgotten_sigil"
  ]
}
```

---

DATEI
spell-schools.json

PFAD
/game-data/magic/spell-schools.json

INHALT
```
{
  "nature": [
    "root_bind",
    "healing_moss"
  ],
  "shadow": [
    "dark_bolt",
    "fear_whisper"
  ],
  "resonance": [
    "echo_wave",
    "field_tone"
  ],
  "protection": [
    "ward_shield",
    "holy_barrier"
  ],
  "ritual": [
    "ancestral_call",
    "portal_trace"
  ]
}
```

---

DATEI
npc-archetypes.json

PFAD
/game-data/npc/npc-archetypes.json

INHALT
```
{
  "merchant": {},
  "guard": {},
  "oracle": {},
  "gossip": {
    "example": "Uschi die Geschminkte"
  }
}
```

---

DATEI
government-types.json

PFAD
/game-data/politics/government-types.json

INHALT
```
{
  "monarchy": {},
  "council": {},
  "theocracy": {},
  "trade_republic": {},
  "warband": {}
}
```

---

DATEI
quest-registry.json

PFAD
/game-data/quests/quest-registry.json

INHALT
```
{
  "ruin_hunter": {
    "giver": "uschi_gossip",
    "objective": "find_ruins"
  },
  "watchtower_supply": {
    "giver": "city_guard",
    "objective": "deliver_supplies"
  }
}
```

---

DATEI
religions.json

PFAD
/game-data/religions/religions.json

INHALT
```
{
  "sun_order": {
    "ethos": "honor"
  },
  "shadow_cult": {
    "ethos": "secrecy"
  },
  "ancestor_faith": {
    "ethos": "lineage"
  }
}
```

---

DATEI
skills.json

PFAD
/game-data/skills/skills.json

INHALT
```
{
  "combat": {},
  "woodcutting": {},
  "mining": {},
  "smithing": {},
  "magic": {},
  "fishing": {}
}
```

---

DATEI
README_INTEGRATIONS.md

PFAD
/integrations/README_INTEGRATIONS.md

INHALT
```
# Integrations

Hier werden produktive Integrationen abgelegt:
- Firebase
- AWS
- WebSocket Gateway
- Datenbankadapter

Wichtig: Keine Secrets hart in Dateien schreiben.
```

---

DATEI
elasticacheAdapter.ts

PFAD
/integrations/aws/elasticacheAdapter.ts

INHALT
```
export function initElastiCache() {
  return {
    status: "elasticache-adapter-placeholder"
  };
}
```

---

DATEI
postgresAdapter.ts

PFAD
/integrations/aws/postgresAdapter.ts

INHALT
```
export function initPostgres() {
  return {
    status: "postgres-adapter-placeholder"
  };
}
```

---

DATEI
firebase-config.ts

PFAD
/integrations/firebase/firebase-config.ts

INHALT
```
export const firebaseConfig = {
  note: "Fill with real Firebase credentials during deployment"
};
```

---

DATEI
firestorePersistence.ts

PFAD
/integrations/firebase/firestorePersistence.ts

INHALT
```
export function initFirestorePersistence() {
  return {
    status: "firestore-persistence-placeholder"
  };
}
```

---

DATEI
awsGatewayBridge.ts

PFAD
/integrations/websocket-gateway/awsGatewayBridge.ts

INHALT
```
export function initAwsGatewayBridge() {
  return {
    status: "aws-websocket-gateway-placeholder"
  };
}
```

---

DATEI
package.json

PFAD
/server/package.json

INHALT
```
{
  "name": "areloria-server",
  "version": "0.2.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "@types/ws": "^8.5.12",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

---

DATEI
ServerBootstrap.ts

PFAD
/server/src/core/ServerBootstrap.ts

INHALT
```
import express from "express";
import { createServer } from "node:http";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { WorldTick } from "./WorldTick.js";

export class ServerBootstrap {
  start() {
    const app = express();
    const httpServer = createServer(app);

    app.get("/health", (_req, res) => {
      res.json({
        ok: true,
        project: "ARELORIAN MMORPG",
        version: "0.2.0"
      });
    });

    const ws = new GameWebSocketServer(httpServer);
    ws.start();

    const tick = new WorldTick();
    const port = Number(process.env.PORT || 3000);

    httpServer.listen(port, () => {
      console.log(`Arelorian server listening on ${port}`);
      tick.start();
    });
  }
}
```

---

DATEI
WorldTick.ts

PFAD
/server/src/core/WorldTick.ts

INHALT
```
export class WorldTick {
  private timer: NodeJS.Timeout | null = null;
  private tickCount = 0;

  start() {
    this.timer = setInterval(() => this.tick(), 100);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  tick() {
    this.tickCount += 1;
    if (this.tickCount % 10 === 0) {
      console.log("World Tick", this.tickCount);
    }
  }
}
```

---

DATEI
index.ts

PFAD
/server/src/index.ts

INHALT
```
import { ServerBootstrap } from "./core/ServerBootstrap.js";

new ServerBootstrap().start();
```

---

DATEI
BehaviorTree.ts

PFAD
/server/src/modules/ai/BehaviorTree.ts

INHALT
```
export class BehaviorTree {
  run(npc: any) {
    if (npc.needs?.sleep) return "sleep";
    if (npc.needs?.hunger) return "eat";
    if (npc.job) return "work";
    return "wander";
  }
}
```

---

DATEI
NPCBrain.ts

PFAD
/server/src/modules/ai/NPCBrain.ts

INHALT
```
import { BehaviorTree } from "./BehaviorTree.js";

export class NPCBrain {
  private tree = new BehaviorTree();

  update(npc: any) {
    const action = this.tree.run(npc);
    npc.currentAction = action;
    return action;
  }
}
```

---

DATEI
TaskSystem.ts

PFAD
/server/src/modules/ai/TaskSystem.ts

INHALT
```
export class TaskSystem {
  execute(npc: any, action: string) {
    switch (action) {
      case "wander":
        return { action, destination: "random_nearby" };
      case "work":
        return { action, destination: npc.jobLocation ?? "workplace" };
      case "eat":
        return { action, destination: "tavern" };
      case "sleep":
        return { action, destination: "home" };
      default:
        return { action: "idle" };
    }
  }
}
```

---

DATEI
AssetRegistry.ts

PFAD
/server/src/modules/asset-registry/AssetRegistry.ts

INHALT
```
export class AssetRegistry {
  private assets = new Map<string, any>();

  register(id: string, data: any) {
    this.assets.set(id, data);
  }

  get(id: string) {
    return this.assets.get(id) ?? null;
  }

  list() {
    return Array.from(this.assets.entries()).map(([id, data]) => ({ id, ...data }));
  }
}
```

---

DATEI
NPCAssets.ts

PFAD
/server/src/modules/asset-registry/NPCAssets.ts

INHALT
```
export const NPCAssets = {
  uschi_gossip: {
    assetId: "uschi_gossip",
    model: "/assets/models/characters/uschi_gossip.glb",
    category: "npc",
    animations: ["idle", "talk", "laugh", "cough"]
  },
  warrior_male: {
    assetId: "warrior_male",
    model: "/assets/models/characters/warrior_male.glb",
    category: "player_or_npc",
    animations: ["idle", "walk", "attack"]
  },
  warrior_female: {
    assetId: "warrior_female",
    model: "/assets/models/characters/warrior_female.glb",
    category: "player_or_npc",
    animations: ["idle", "walk", "attack"]
  }
};
```

---

DATEI
StructureAssets.ts

PFAD
/server/src/modules/asset-registry/StructureAssets.ts

INHALT
```
export const StructureAssets = {
  castle_wall: {
    assetId: "castle_wall",
    type: "structure",
    model: "/assets/models/buildings/castle_wall.glb",
    collision: true
  },
  castle_gate: {
    assetId: "castle_gate",
    type: "interactive_structure",
    model: "/assets/models/buildings/castle_gate.glb",
    collision: true,
    states: ["open", "closed", "locked", "damaged", "destroyed"]
  },
  castle_watch_tower: {
    assetId: "castle_watch_tower",
    type: "defense_structure",
    model: "/assets/models/buildings/castle_watch_tower.glb",
    collision: true
  }
};
```

---

DATEI
VegetationAssets.ts

PFAD
/server/src/modules/asset-registry/VegetationAssets.ts

INHALT
```
export const VegetationAssets = {
  tree_oak_young: { model: "/assets/models/vegetation/tree_oak_young.glb", category: "vegetation", growthStage: 0 },
  tree_oak_spring: { model: "/assets/models/vegetation/tree_oak_spring.glb", category: "vegetation", growthStage: 1 },
  tree_oak_summer: { model: "/assets/models/vegetation/tree_oak_summer.glb", category: "vegetation", growthStage: 2 },
  tree_oak_autumn: { model: "/assets/models/vegetation/tree_oak_autumn.glb", category: "vegetation", growthStage: 3 }
};
```

---

DATEI
BrainFieldAnalyzer.ts

PFAD
/server/src/modules/brain/BrainFieldAnalyzer.ts

INHALT
```
export class BrainFieldAnalyzer {
  analyzeField(values: unknown[]) {
    return {
      activeNodes: values.length,
      result: "field-analysis-placeholder"
    };
  }
}
```

---

DATEI
HeuristicWorldBrain.ts

PFAD
/server/src/modules/brain/HeuristicWorldBrain.ts

INHALT
```
export class HeuristicWorldBrain {
  private readonly nodes = new Array(13).fill(null);

  analyze(input: unknown) {
    return {
      nodes: this.nodes.length,
      summary: "analysis-placeholder",
      input
    };
  }
}
```

---

DATEI
CivilizationEngine.ts

PFAD
/server/src/modules/civilization/CivilizationEngine.ts

INHALT
```
export class CivilizationEngine {
  createVillage(guildMembers: number) {
    if (guildMembers < 50) return null;
    return {
      type: "village",
      population: guildMembers,
      createdAt: Date.now()
    };
  }
}
```

---

DATEI
SettlementSystem.ts

PFAD
/server/src/modules/civilization/SettlementSystem.ts

INHALT
```
export class SettlementSystem {
  createSettlement(type: "village" | "city" | "kingdom" | "nation", ownerId: string) {
    return {
      type,
      ownerId,
      createdAt: Date.now()
    };
  }
}
```

---

DATEI
CombatSystem.ts

PFAD
/server/src/modules/combat/CombatSystem.ts

INHALT
```
export class CombatSystem {
  attack(attacker: any, defender: any) {
    if (attacker.stamina <= 0) return { success: false, reason: "no_stamina" };

    attacker.stamina -= 10;

    const hitChance = this.hitChance(attacker, defender);
    if (Math.random() > hitChance) {
      return { success: true, hit: false, damage: 0 };
    }

    const damage = this.calculateDamage(attacker, defender);
    defender.health = Math.max(0, defender.health - damage);

    return {
      success: true,
      hit: true,
      damage,
      defenderHealth: defender.health
    };
  }

  hitChance(attacker: any, defender: any) {
    const atk = attacker.skills?.combat?.level ?? 1;
    const def = defender.skills?.combat?.level ?? 1;
    return Math.min(0.95, Math.max(0.1, atk / (atk + def)));
  }

  calculateDamage(attacker: any, defender: any) {
    const atk = attacker.skills?.combat?.level ?? 1;
    const def = defender.skills?.combat?.level ?? 1;
    const base = 5 + atk;
    const mitigation = Math.floor(def * 0.3);
    return Math.max(1, base - mitigation + Math.floor(Math.random() * 4));
  }
}
```

---

DATEI
DialogueContext.ts

PFAD
/server/src/modules/dialogue/DialogueContext.ts

INHALT
```
export function buildDialogueContext(npc: any, player: any, world: any) {
  return {
    npcId: npc.id,
    playerId: player?.id ?? null,
    traits: npc.traits ?? {},
    lineage: npc.lineage ?? null,
    culture: npc.culture ?? null,
    religion: npc.religion ?? null,
    memory: npc.memory ?? [],
    worldEvents: world?.events ?? [],
    oracleSignals: world?.oracleSignals ?? []
  };
}
```

---

DATEI
DialogueEngine.ts

PFAD
/server/src/modules/dialogue/DialogueEngine.ts

INHALT
```
import { buildDialogueContext } from "./DialogueContext.js";
import { DialogueGenerator } from "./DialogueGenerator.js";

export class DialogueEngine {
  private generator = new DialogueGenerator();

  talk(npc: any, player: any, world: any) {
    const context = buildDialogueContext(npc, player, world);
    return this.generator.generate(context);
  }
}
```

---

DATEI
DialogueGenerator.ts

PFAD
/server/src/modules/dialogue/DialogueGenerator.ts

INHALT
```
import { DialogueTemplates } from "./DialogueTemplates.js";

export class DialogueGenerator {
  generate(context: any) {
    const mood = context.traits?.aggression > 0.7 ? "warning" : "greeting";
    const pool = DialogueTemplates[mood] ?? ["..."];
    return {
      line: pool[Math.floor(Math.random() * pool.length)],
      contextSummary: {
        culture: context.culture,
        religion: context.religion
      }
    };
  }
}
```

---

DATEI
DialogueTemplates.ts

PFAD
/server/src/modules/dialogue/DialogueTemplates.ts

INHALT
```
export const DialogueTemplates = {
  greeting: [
    "Na Süßer, suchst du Abenteuer?",
    "Du siehst aus, als hättest du Ärger im Gepäck.",
    "Setz dich, ich erzähl dir was Interessantes."
  ],
  rumor: [
    "Im Nordwald wurden alte Mauern gesehen.",
    "Die Händler reden von seltsamen Kreaturen im Moor.",
    "Ein Königreich im Osten ist nervös."
  ],
  warning: [
    "Geh da nicht unvorbereitet hinein.",
    "Manche Wege fressen ganze Blutlinien.",
    "Nicht jede Ruine will entdeckt werden."
  ]
};
```

---

DATEI
DungeonGenerator.ts

PFAD
/server/src/modules/dungeon/DungeonGenerator.ts

INHALT
```
export class DungeonGenerator {
  generate(seed: number) {
    const rooms = [];
    const roomCount = 4 + Math.floor(Math.abs(Math.sin(seed)) * 6);
    for (let i = 0; i < roomCount; i++) {
      rooms.push({
        id: i,
        type: this.randomRoom(seed + i),
        danger: 1 + (i % 5)
      });
    }
    return { seed, rooms };
  }

  randomRoom(seed: number) {
    const types = [
      "hall",
      "treasure_room",
      "monster_lair",
      "collapsed_passage",
      "ancient_shrine"
    ];
    return types[Math.abs(Math.floor(seed)) % types.length];
  }
}
```

---

DATEI
EconomyEngine.ts

PFAD
/server/src/modules/economy/EconomyEngine.ts

INHALT
```
export class EconomyEngine {
  private markets = new Map<string, { goods: Record<string, number> }>();

  registerMarket(id: string) {
    this.markets.set(id, { goods: {} });
  }

  trade(marketId: string, item: string, amount: number) {
    const market = this.markets.get(marketId);
    if (!market) return null;
    if (!market.goods[item]) market.goods[item] = 0;
    market.goods[item] += amount;
    return market.goods[item];
  }
}
```

---

DATEI
MatrixEnergySystem.ts

PFAD
/server/src/modules/economy/MatrixEnergySystem.ts

INHALT
```
export class MatrixEnergySystem {
  private balances = new Map<string, number>();

  add(playerId: string, amount: number) {
    const current = this.balances.get(playerId) || 0;
    this.balances.set(playerId, current + amount);
  }

  consume(playerId: string, amount: number) {
    const current = this.balances.get(playerId) || 0;
    if (current < amount) return false;
    this.balances.set(playerId, current - amount);
    return true;
  }

  getBalance(playerId: string) {
    return this.balances.get(playerId) || 0;
  }
}
```

---

DATEI
TradeRoutes.ts

PFAD
/server/src/modules/economy/TradeRoutes.ts

INHALT
```
export class TradeRoutes {
  createRoute(a: string, b: string) {
    return {
      from: a,
      to: b,
      active: true
    };
  }
}
```

---

DATEI
DudenregisterHistory.ts

PFAD
/server/src/modules/history/DudenregisterHistory.ts

INHALT
```
export class DudenregisterHistory {
  private history: any[] = [];

  record(event: any) {
    this.history.push(event);
  }

  getHistory() {
    return this.history;
  }
}
```

---

DATEI
WorldSnapshotSystem.ts

PFAD
/server/src/modules/history/WorldSnapshotSystem.ts

INHALT
```
export class WorldSnapshotSystem {
  private snapshots: any[] = [];

  save(worldState: any) {
    this.snapshots.push({
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(worldState))
    });
  }

  latest() {
    return this.snapshots[this.snapshots.length - 1] ?? null;
  }
}
```

---

DATEI
InventorySystem.ts

PFAD
/server/src/modules/inventory/InventorySystem.ts

INHALT
```
export class InventorySystem {
  addItem(player: any, item: any) {
    player.inventory.push(item);
    return player.inventory;
  }

  removeItem(player: any, itemId: string) {
    player.inventory = player.inventory.filter((item: any) => item.id !== itemId);
    return player.inventory;
  }
}
```

---

DATEI
LootTables.ts

PFAD
/server/src/modules/loot/LootTables.ts

INHALT
```
export const LootTables = {
  wolf: [
    { id: "wolf_pelt", chance: 0.65, rarity: "common" },
    { id: "fang", chance: 0.3, rarity: "common" },
    { id: "alpha_claw", chance: 0.05, rarity: "rare" }
  ],
  skeleton: [
    { id: "bone_fragment", chance: 0.7, rarity: "common" },
    { id: "rusted_blade", chance: 0.2, rarity: "uncommon" },
    { id: "grave_ring", chance: 0.03, rarity: "rare" }
  ],
  ruin_cache: [
    { id: "ancient_coin", chance: 0.5, rarity: "uncommon" },
    { id: "relic_fragment", chance: 0.2, rarity: "rare" },
    { id: "forgotten_sigil", chance: 0.02, rarity: "legendary" }
  ]
};
```

---

DATEI
MagicSystem.ts

PFAD
/server/src/modules/magic/MagicSystem.ts

INHALT
```
export class MagicSystem {
  cast(caster: any, spell: any, target: any) {
    if ((caster.mana ?? 0) < spell.cost) {
      return { success: false, reason: "not_enough_mana" };
    }

    caster.mana -= spell.cost;

    return {
      success: true,
      spell: spell.id,
      target: target?.id ?? null,
      effect: spell.effect ?? "generic_magic_effect"
    };
  }
}
```

---

DATEI
MonsterDNA.ts

PFAD
/server/src/modules/monster/MonsterDNA.ts

INHALT
```
export function generateMonsterDNA(species: string) {
  return {
    species,
    strength: Math.random(),
    speed: Math.random(),
    aggression: Math.random(),
    intelligence: Math.random(),
    resilience: Math.random()
  };
}
```

---

DATEI
MonsterMutation.ts

PFAD
/server/src/modules/monster/MonsterMutation.ts

INHALT
```
export function mutateMonster(dna: any, biome: string) {
  const clone = { ...dna, mutations: [] as string[] };

  if (biome === "snow") {
    clone.resilience += 0.2;
    clone.mutations.push("frost_resistance");
  }

  if (biome === "swamp") {
    clone.aggression += 0.15;
    clone.mutations.push("swamp_hunger");
  }

  if (Math.random() < 0.08) {
    clone.mutations.push("rare_variant");
  }

  return clone;
}
```

---

DATEI
MonsterSpawner.ts

PFAD
/server/src/modules/monster/MonsterSpawner.ts

INHALT
```
import { generateMonsterDNA } from "./MonsterDNA.js";
import { mutateMonster } from "./MonsterMutation.js";

export class MonsterSpawner {
  spawn(species: string, biome: string) {
    const dna = generateMonsterDNA(species);
    return mutateMonster(dna, biome);
  }
}
```

---

DATEI
NPCDialogueSystem.ts

PFAD
/server/src/modules/npc/NPCDialogueSystem.ts

INHALT
```
export class NPCDialogueSystem {
  talk(npc: any, worldSignals: any = {}) {
    const lines = npc.dialogueLines || [
      "Die Welt flüstert merkwürdige Dinge.",
      "Ich habe da ein Gerücht gehört."
    ];

    return {
      line: lines[Math.floor(Math.random() * lines.length)],
      signals: worldSignals
    };
  }
}
```

---

DATEI
NPCGenealogyEngine.ts

PFAD
/server/src/modules/npc/NPCGenealogyEngine.ts

INHALT
```
export class NPCGenealogyEngine {
  createLineage(id: string, house: string, parents: string[] = []) {
    return {
      id,
      house,
      parents,
      children: [] as string[]
    };
  }

  addChild(lineage: any, childId: string) {
    lineage.children.push(childId);
    return lineage;
  }
}
```

---

DATEI
NPCMemoryEngine.ts

PFAD
/server/src/modules/npc/NPCMemoryEngine.ts

INHALT
```
export class NPCMemoryEngine {
  private memory = new Map<string, any[]>();

  remember(npcId: string, event: any) {
    if (!this.memory.has(npcId)) this.memory.set(npcId, []);
    this.memory.get(npcId)!.push({
      timestamp: Date.now(),
      event
    });
  }

  recall(npcId: string) {
    return this.memory.get(npcId) || [];
  }
}
```

---

DATEI
NPCPersonalityEngine.ts

PFAD
/server/src/modules/npc/NPCPersonalityEngine.ts

INHALT
```
export class NPCPersonalityEngine {
  generateTraits() {
    return {
      courage: Math.random(),
      curiosity: Math.random(),
      greed: Math.random(),
      faith: Math.random(),
      aggression: Math.random()
    };
  }
}
```

---

DATEI
ObserverEngine.ts

PFAD
/server/src/modules/observer/ObserverEngine.ts

INHALT
```
export class ObserverEngine {
  private observers = new Map<string, { x: number; y: number }>();

  register(playerId: string, position: { x: number; y: number }) {
    this.observers.set(playerId, position);
  }

  unregister(playerId: string) {
    this.observers.delete(playerId);
  }

  getObservedChunks() {
    const result = [] as { chunkX: number; chunkY: number }[];
    for (const [, pos] of this.observers) {
      result.push({
        chunkX: Math.floor(pos.x / 64),
        chunkY: Math.floor(pos.y / 64)
      });
    }
    return result;
  }
}
```

---

DATEI
OracleEngine.ts

PFAD
/server/src/modules/oracle/OracleEngine.ts

INHALT
```
export class OracleEngine {
  generateVision() {
    const visions = [
      "Ich sehe Feuer im Norden.",
      "Unter alten Mauern liegt ein Geheimnis.",
      "Ein Königreich wird fallen."
    ];
    return visions[Math.floor(Math.random() * visions.length)];
  }
}
```

---

DATEI
CivilizationDatabase.ts

PFAD
/server/src/modules/persistence/CivilizationDatabase.ts

INHALT
```
export class CivilizationDatabase {
  private civilizations = new Map<string, any>();

  saveCivilization(civ: any) {
    this.civilizations.set(civ.id, civ);
  }

  loadCivilization(id: string) {
    return this.civilizations.get(id) ?? null;
  }
}
```

---

DATEI
PlayerDatabase.ts

PFAD
/server/src/modules/persistence/PlayerDatabase.ts

INHALT
```
export class PlayerDatabase {
  private players = new Map<string, any>();

  savePlayer(player: any) {
    this.players.set(player.id, player);
  }

  loadPlayer(id: string) {
    return this.players.get(id) ?? null;
  }
}
```

---

DATEI
WorldDatabase.ts

PFAD
/server/src/modules/persistence/WorldDatabase.ts

INHALT
```
export class WorldDatabase {
  private chunks = new Map<string, any>();

  saveChunk(chunk: any) {
    this.chunks.set(chunk.id, chunk);
  }

  loadChunk(id: string) {
    return this.chunks.get(id) ?? null;
  }
}
```

---

DATEI
PlayerSystem.ts

PFAD
/server/src/modules/player/PlayerSystem.ts

INHALT
```
export class PlayerSystem {
  createPlayer(id: string, name: string) {
    return {
      id,
      name,
      position: { x: 0, y: 0, z: 0 },
      health: 100,
      stamina: 100,
      mana: 25,
      skills: {},
      inventory: [],
      faction: null,
      civilization: null,
      matrixEnergy: 0
    };
  }
}
```

---

DATEI
GovernmentTypes.ts

PFAD
/server/src/modules/politics/GovernmentTypes.ts

INHALT
```
export const GovernmentTypes = {
  monarchy: { id: "monarchy", succession: "inheritance", stabilityBase: 0.7 },
  council: { id: "council", succession: "vote", stabilityBase: 0.6 },
  theocracy: { id: "theocracy", succession: "religious_selection", stabilityBase: 0.65 },
  trade_republic: { id: "trade_republic", succession: "merchant_vote", stabilityBase: 0.55 },
  warband: { id: "warband", succession: "strength", stabilityBase: 0.4 }
};
```

---

DATEI
WarEngine.ts

PFAD
/server/src/modules/politics/WarEngine.ts

INHALT
```
export class WarEngine {
  declareWar(attacker: any, defender: any) {
    return {
      type: "war_declared",
      attacker: attacker.id,
      defender: defender.id,
      timestamp: Date.now()
    };
  }
}
```

---

DATEI
QuestEngine.ts

PFAD
/server/src/modules/quest/QuestEngine.ts

INHALT
```
import { QuestRegistry } from "./QuestRegistry.js";

export class QuestEngine {
  private active = new Map<string, any[]>();

  startQuest(playerId: string, questId: keyof typeof QuestRegistry) {
    const quest = QuestRegistry[questId];
    if (!quest) return null;
    if (!this.active.has(playerId)) this.active.set(playerId, []);
    this.active.get(playerId)!.push({ ...quest, startedAt: Date.now(), completed: false });
    return quest;
  }

  listQuests(playerId: string) {
    return this.active.get(playerId) || [];
  }

  completeQuest(playerId: string, questId: string) {
    const quests = this.active.get(playerId) || [];
    const q = quests.find((x) => x.id === questId);
    if (!q) return null;
    q.completed = true;
    q.completedAt = Date.now();
    return q.reward;
  }
}
```

---

DATEI
QuestRegistry.ts

PFAD
/server/src/modules/quest/QuestRegistry.ts

INHALT
```
export const QuestRegistry = {
  ruin_hunter: {
    id: "ruin_hunter",
    name: "Die alten Mauern",
    giver: "uschi_gossip",
    objective: "find_ruins",
    reward: { gold: 100, item: "ancient_relic" }
  },
  watchtower_supply: {
    id: "watchtower_supply",
    name: "Die hungernden Wächter",
    giver: "city_guard",
    objective: "deliver_supplies",
    reward: { xp: 50, item: "guard_token" }
  }
};
```

---

DATEI
ReligionSystem.ts

PFAD
/server/src/modules/religion/ReligionSystem.ts

INHALT
```
export class ReligionSystem {
  private religions = new Map<string, any>();

  registerReligion(id: string, data: any) {
    this.religions.set(id, data);
  }

  getReligion(id: string) {
    return this.religions.get(id);
  }
}
```

---

DATEI
SkillSystem.ts

PFAD
/server/src/modules/skill/SkillSystem.ts

INHALT
```
export class SkillSystem {
  ensureSkill(player: any, skillName: string) {
    if (!player.skills[skillName]) {
      player.skills[skillName] = { level: 1, xp: 0 };
    }
  }

  addXP(player: any, skillName: string, amount: number) {
    this.ensureSkill(player, skillName);
    const skill = player.skills[skillName];
    skill.xp += amount;
    while (skill.xp >= this.nextLevelXP(skill.level)) {
      skill.level += 1;
    }
    return skill;
  }

  nextLevelXP(level: number) {
    return Math.floor(50 * Math.pow(level, 1.4));
  }
}
```

---

DATEI
GateController.ts

PFAD
/server/src/modules/structure/GateController.ts

INHALT
```
export class GateController {
  setState(gate: any, state: string) {
    const allowed = ["open", "closed", "locked", "damaged", "destroyed"];
    if (!allowed.includes(state)) throw new Error("Invalid gate state");
    gate.state = state;
    return gate;
  }

  canOpen(actor: any, gate: any) {
    if (gate.state === "destroyed") return false;
    if (gate.state === "locked" && !actor.permissions?.includes("gate_access")) return false;
    return true;
  }
}
```

---

DATEI
StructureEngine.ts

PFAD
/server/src/modules/structure/StructureEngine.ts

INHALT
```
export class StructureEngine {
  private structures = new Map<string, any>();

  createStructure(structure: any) {
    this.structures.set(structure.structureId, structure);
    return structure;
  }

  getStructure(id: string) {
    return this.structures.get(id) ?? null;
  }

  damageStructure(id: string, amount: number) {
    const structure = this.structures.get(id);
    if (!structure) return null;
    structure.hitpoints = Math.max(0, structure.hitpoints - amount);
    if (structure.hitpoints === 0) structure.destroyed = true;
    return structure;
  }
}
```

---

DATEI
BiomeGenerator.ts

PFAD
/server/src/modules/world/BiomeGenerator.ts

INHALT
```
export class BiomeGenerator {
  getBiome(_x: number, _y: number, height: number) {
    if (height > 0.7) return "mountain";
    if (height > 0.45) return "forest";
    if (height > 0.2) return "grassland";
    return "desert";
  }
}
```

---

DATEI
ChunkSystem.ts

PFAD
/server/src/modules/world/ChunkSystem.ts

INHALT
```
export class ChunkSystem {
  constructor(public readonly size: number = 64) {}

  getChunk(x: number, y: number) {
    return {
      id: `${x}:${y}`,
      x,
      y,
      size: this.size
    };
  }
}
```

---

DATEI
TerrainGenerator.ts

PFAD
/server/src/modules/world/TerrainGenerator.ts

INHALT
```
export class TerrainGenerator {
  getHeight(x: number, y: number) {
    return Math.sin(x * 0.1) + Math.cos(y * 0.1);
  }
}
```

---

DATEI
WorldEditorServer.ts

PFAD
/server/src/modules/world-editor/WorldEditorServer.ts

INHALT
```
export class WorldEditorServer {
  spawnEntity(type: string, position: { x: number; y: number; z: number }) {
    return { action: "spawn", type, position };
  }

  moveEntity(entityId: string, position: { x: number; y: number; z: number }) {
    return { action: "move", entityId, position };
  }

  deleteEntity(entityId: string) {
    return { action: "delete", entityId };
  }
}
```

---

DATEI
PacketRouter.ts

PFAD
/server/src/networking/PacketRouter.ts

INHALT
```
export class PacketRouter {
  route(packet: any) {
    return {
      handled: true,
      type: packet?.type ?? "unknown"
    };
  }
}
```

---

DATEI
PlayerSession.ts

PFAD
/server/src/networking/PlayerSession.ts

INHALT
```
export type PlayerSession = {
  id: string;
  name: string;
  connectedAt: number;
  position: { x: number; y: number; z: number };
};
```

---

DATEI
WebSocketServer.ts

PFAD
/server/src/networking/WebSocketServer.ts

INHALT
```
import type { Server as HttpServer } from "node:http";
import { WebSocketServer } from "ws";

export class GameWebSocketServer {
  private wss: WebSocketServer | null = null;

  constructor(private readonly httpServer: HttpServer) {}

  start() {
    this.wss = new WebSocketServer({ server: this.httpServer });

    this.wss.on("connection", (socket) => {
      socket.send(JSON.stringify({
        type: "welcome",
        message: "Arelorian connection established"
      }));

      socket.on("message", (msg) => {
        console.log("WS message:", msg.toString());
      });
    });
  }
}
```

---

DATEI
tsconfig.json

PFAD
/server/tsconfig.json

INHALT
```
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": [
    "src/**/*"
  ]
}
```

---

DATEI
README_ASSETS.md

PFAD
/world-assets/README_ASSETS.md

INHALT
```
# World Assets

Lege hier GLB-Assets ab:
- characters/
- monsters/
- buildings/
- props/
- vegetation/
- admin/

Beispiele:
- uschi_gossip.glb
- warrior_male.glb
- warrior_female.glb
- castle_gate.glb
- castle_watch_tower.glb
- tree_oak_spring.glb
- gm_giraffe.glb
```
```

---

DATEI
areloria_reconstruction_pack_fuller.txt

PFAD
/areloria_reconstruction_pack_fuller.txt

INHALT
```
# ARELORIA RECONSTRUCTION PACK FULLER

DATEI / PFAD / INHALT für Agent-Rekonstruktion

---

DATEI
CHECKED_CONTENT_REPORT.md

PFAD
/CHECKED_CONTENT_REPORT.md

INHALT
```
# Checked Content Report

Dieses Paket wurde **neu** aufgebaut, damit es nicht wieder nur aus fast leeren Ordnern besteht.

## Enthalten
- Root-Dateien
- 9 Hauptdokumente
- 3 final-lock-Dateien
- 3 agent-Dateien
- Server core + networking
- 21 Server-Moduldateien
- Client package + renderer + websocket + HUD
- Game-data-Dateien
- Integrationsplatzhalter
- Admin-/Asset-Readmes

## Dateianzahl
79
```

---

DATEI
MASTER_INDEX.md

PFAD
/MASTER_INDEX.md

INHALT
```
# Master Index

## Root
- README_START_HERE.md
- PROJECT_LOCK_RULES.md
- MASTER_INDEX.md

## Core Docs
- docs/MASTER_DESIGN_BIBLE.md
- docs/MASTER_SYSTEM_CHECKLIST.md
- docs/BUILD_SEQUENCE_MASTER.md
- docs/WORLD_GENERATION.md
- docs/NPC_SYSTEM.md
- docs/ECONOMY_MODEL.md
- docs/BRAIN_SYSTEM.md
- docs/ASSET_PIPELINE.md
- docs/GM_EDITOR.md

## Final Lock
- final-lock/FINAL_TRUTH.md
- final-lock/DO_NOT_SIMPLIFY.md
- final-lock/REQUIRED_SYSTEMS_MATRIX.md

## Agent
- agent/AGENT_BUILD_INSTRUCTIONS.md
- agent/ARELORIAN_SUPER_PROMPT.md
- agent/AI_AGENT_FAILSAFE_RULES.md

## Code
- server/
- client/

## Data
- game-data/
- world-assets/

## Ops
- integrations/
- admin-tools/
```

---

DATEI
PACK_BUILD_STATUS.md

PFAD
/PACK_BUILD_STATUS.md

INHALT
```
# Pack Build Status

## Bereits aufgebaut
- Root rules/docs
- Final lock files
- Agent files
- Server core
- Networking
- World + observer
- NPC systems
- Dialogue + quest
- Dungeon + monster
- Structure + gate + asset registry
- AI behavior
- Persistence
- Client core + renderer + websocket + HUD + editor UI
- Game data basics
- Integrations placeholders

## Nächste vertiefbare Blöcke
- vollständiger GM command layer
- richer item generator + affix logic
- crafting system
- farming / tree growth logic
- city market simulation expansion
- real auth / persistence adapters
```

---

DATEI
PROJECT_LOCK_RULES.md

PFAD
/PROJECT_LOCK_RULES.md

INHALT
```
# Project Lock Rules

Diese Regeln dürfen nicht gebrochen werden.

1. Kein Umbau zu einer simplen Demo-App.
2. Chunkgröße bleibt 64x64.
3. Observer-Axiom bleibt Pflicht.
4. Server bleibt autoritativ.
5. NPC-Personality, NPC-Memory und Genealogie bleiben Pflichtsysteme.
6. Spieler- und NPC-Politik bleiben Pflichtsysteme.
7. Matrix-Energie bleibt Infrastrukturwährung.
8. Server-Brain mit 13 Punkten bleibt Pflicht.
9. GM-World-Editor bleibt Pflicht.
10. GLB-Asset-Pipeline bleibt Pflicht.
```

---

DATEI
README_START_HERE.md

PFAD
/README_START_HERE.md

INHALT
```
# Arelorian Master Project

Dieses Paket ist ein **voller Entwicklungs-Scaffold** für das Arelorian/Ouroboros Browser-MMORPG.
Es ist **kein leeres Ordnerpaket** und **keine Demo-App**, sondern eine strukturierte Grundlage mit:
- Architektur- und Regeldokumenten
- Server-Modulen als TypeScript-Skeletons
- Client-Grundgerüst mit Three.js
- Game-Data-Dateien
- Integrationsplatzhaltern für Firebase/AWS
- Admin-/GM-Editor-Grunddateien
- Asset-Import-Hinweisen für GLB-Dateien

## Sofort lesen
1. `PROJECT_LOCK_RULES.md`
2. `final-lock/FINAL_TRUTH.md`
3. `docs/MASTER_DESIGN_BIBLE.md`
4. `docs/BUILD_SEQUENCE_MASTER.md`
5. `agent/AGENT_BUILD_INSTRUCTIONS.md`

## Projektstatus
Dieses Paket liefert ein **ausgebautes Fundament**. Es ist nicht das komplett fertige MMO,
aber es ist eine **brauchbare, nicht-leere Arbeitsbasis**, die weiter implementiert werden kann.
```

---

DATEI
README_ADMIN.md

PFAD
/admin-tools/README_ADMIN.md

INHALT
```
# Admin Tools

Hier liegen GM- und World-Editor-Hinweise.

## Geplant
- WorldEditor.ts
- TerrainBrush.ts
- ObjectPlacement.ts
- GMControlPanel.ts
- LiveWorldControl.ts

Das Mount `gm_giraffe` kann später den Admin-Modus markieren.
```

---

DATEI
AGENT_BUILD_INSTRUCTIONS.md

PFAD
/agent/AGENT_BUILD_INSTRUCTIONS.md

INHALT
```
# Agent Build Instructions

1. Lies zuerst alle Lock-Dateien.
2. Verändere keine Kernregeln.
3. Baue in der vorgegebenen Reihenfolge.
4. Halte Serverlogik serverseitig.
5. Nutze das Clientgerüst nur für Darstellung.

## Wichtige Reihenfolge
server core -> world -> observer -> npc -> civilization -> economy -> gameplay -> brain -> assets -> gm editor -> client -> integrations
```

---

DATEI
AI_AGENT_FAILSAFE_RULES.md

PFAD
/agent/AI_AGENT_FAILSAFE_RULES.md

INHALT
```
# AI Agent Failsafe Rules

- Do not remove observer simulation
- Do not remove chunk size 64x64
- Do not remove NPC memory/genealogy
- Do not remove politics
- Do not remove matrix energy
- Do not remove brain
- Do not remove GM editor
- Do not remove GLB pipeline
```

---

DATEI
ARELORIAN_SUPER_PROMPT.md

PFAD
/agent/ARELORIAN_SUPER_PROMPT.md

INHALT
```
# Arelorian Super Prompt

Build a persistent browser MMORPG with:
- procedural world
- 64x64 chunks
- observer-driven simulation
- NPC personality, memory, genealogy, politics
- player civilization and NPC civilization
- matrix energy economy
- 13-node server brain
- GLB asset pipeline
- GM world editor

Do not simplify it into a prototype app.
```

---

DATEI
package.json

PFAD
/client/package.json

INHALT
```
{
  "name": "areloria-client",
  "version": "0.2.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "three": "^0.169.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^5.4.0"
  }
}
```

---

DATEI
index.html

PFAD
/client/public/index.html

INHALT
```
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
    <title>Arelorian Client</title>
  </head>
  <body>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

---

DATEI
AssetLoader.ts

PFAD
/client/src/assets/AssetLoader.ts

INHALT
```
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class AssetLoader {
  private loader = new GLTFLoader();

  load(path: string) {
    return new Promise((resolve, reject) => {
      this.loader.load(path, (gltf) => resolve(gltf.scene), undefined, reject);
    });
  }
}
```

---

DATEI
ModelRegistry.ts

PFAD
/client/src/assets/ModelRegistry.ts

INHALT
```
export const ModelRegistry = {
  uschi: { path: "/assets/models/characters/uschi_gossip.glb", scale: 1 },
  castle_wall: { path: "/assets/models/buildings/castle_wall.glb", scale: 1 },
  watch_tower: { path: "/assets/models/buildings/castle_watch_tower.glb", scale: 1 },
  tree_spring: { path: "/assets/models/vegetation/tree_oak_spring.glb", scale: 1 },
  gm_giraffe: { path: "/assets/models/admin/gm_giraffe.glb", scale: 1 }
};
```

---

DATEI
PlacementTool.ts

PFAD
/client/src/editor/PlacementTool.ts

INHALT
```
export class PlacementTool {
  place(type: string, position: { x: number; y: number; z: number }) {
    return { action: "place", type, position };
  }
}
```

---

DATEI
SelectionTool.ts

PFAD
/client/src/editor/SelectionTool.ts

INHALT
```
export class SelectionTool {
  select(entityId: string) {
    return { selected: entityId };
  }
}
```

---

DATEI
WorldEditorUI.ts

PFAD
/client/src/editor/WorldEditorUI.ts

INHALT
```
export function openWorldEditorUI() {
  const el = document.createElement("div");
  el.textContent = "GM World Editor";
  el.style.position = "fixed";
  el.style.right = "12px";
  el.style.bottom = "12px";
  el.style.padding = "10px 14px";
  el.style.background = "#2b2b2b";
  el.style.color = "#fff";
  document.body.appendChild(el);
}
```

---

DATEI
renderer.ts

PFAD
/client/src/engine/renderer.ts

INHALT
```
import * as THREE from "three";

export function initRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshBasicMaterial({ color: 0x44aa88 })
  );

  scene.add(cube);

  function animate() {
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();
}
```

---

DATEI
worldLoader.ts

PFAD
/client/src/engine/worldLoader.ts

INHALT
```
export function loadWorldChunk(chunkX: number, chunkY: number) {
  return {
    chunkX,
    chunkY,
    status: "requested"
  };
}
```

---

DATEI
playerController.ts

PFAD
/client/src/gameplay/playerController.ts

INHALT
```
export class PlayerController {
  move(direction: string) {
    return {
      type: "move",
      direction
    };
  }
}
```

---

DATEI
main.ts

PFAD
/client/src/main.ts

INHALT
```
import { initRenderer } from "./engine/renderer";
import { connectSocket } from "./networking/websocketClient";
import { renderHUD } from "./ui/hud";

const canvas = document.createElement("canvas");
document.body.style.margin = "0";
document.body.appendChild(canvas);

initRenderer(canvas);
connectSocket();
renderHUD();
```

---

DATEI
websocketClient.ts

PFAD
/client/src/networking/websocketClient.ts

INHALT
```
export function connectSocket() {
  const ws = new WebSocket(`ws://${location.hostname}:3000`);

  ws.onopen = () => console.log("Connected to Arelorian server");
  ws.onmessage = (msg) => console.log("Server:", msg.data);

  return ws;
}
```

---

DATEI
chat.ts

PFAD
/client/src/ui/chat.ts

INHALT
```
export function renderChat() {
  const el = document.createElement("div");
  el.textContent = "Chat placeholder";
  el.style.position = "fixed";
  el.style.left = "12px";
  el.style.bottom = "12px";
  el.style.padding = "8px 12px";
  el.style.background = "rgba(0,0,0,0.55)";
  el.style.color = "#fff";
  document.body.appendChild(el);
}
```

---

DATEI
hud.ts

PFAD
/client/src/ui/hud.ts

INHALT
```
export function renderHUD() {
  const hud = document.createElement("div");
  hud.textContent = "Arelorian HUD online";
  hud.style.position = "fixed";
  hud.style.top = "12px";
  hud.style.left = "12px";
  hud.style.padding = "8px 12px";
  hud.style.background = "rgba(0,0,0,0.55)";
  hud.style.color = "#fff";
  hud.style.fontFamily = "sans-serif";
  document.body.appendChild(hud);
}
```

---

DATEI
inventory.ts

PFAD
/client/src/ui/inventory.ts

INHALT
```
export function renderInventory() {
  const el = document.createElement("div");
  el.textContent = "Inventory placeholder";
  el.style.position = "fixed";
  el.style.right = "12px";
  el.style.top = "12px";
  el.style.padding = "8px 12px";
  el.style.background = "rgba(0,0,0,0.55)";
  el.style.color = "#fff";
  document.body.appendChild(el);
}
```

---

DATEI
tsconfig.json

PFAD
/client/tsconfig.json

INHALT
```
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true
  },
  "include": [
    "src/**/*"
  ]
}
```

---

DATEI
ASSET_PIPELINE.md

PFAD
/docs/ASSET_PIPELINE.md

INHALT
```
# Asset Pipeline

## GLB-Regeln
Terrain ist kein GLB-Bodenteppich. GLB wird für NPCs, Monster, Gebäude, Bäume, Props und Reittiere verwendet.

## Struktur
- characters/
- monsters/
- buildings/
- props/
- vegetation/
- admin/

## Validierung
Jedes Asset sollte idealerweise besitzen:
- sauberen Ursprungspunkt
- sinnvolle Skalierung
- optionales Rig/Skeleton
- optional Animationen
```

---

DATEI
BRAIN_SYSTEM.md

PFAD
/docs/BRAIN_SYSTEM.md

INHALT
```
# Brain System

Das Server Brain ist eine heuristische Meta-Schicht.

## Aufgaben
- Spannungen erkennen
- Politiksignale lesen
- Marktanomalien erkennen
- Orakelvisionen speisen
- Ereignisse anstoßen

## 13-Punkte-Modell
- 4 Weltpunkte
- 4 Interpretationspunkte
- 4 Dynamikpunkte
- 1 Zentrum

Das Zentrum aggregiert Weltzustand, NPC-Memory, Ökonomie, Politik und Geschichte.
```

---

DATEI
BUILD_SEQUENCE_MASTER.md

PFAD
/docs/BUILD_SEQUENCE_MASTER.md

INHALT
```
# Build Sequence Master

1. Server core und bootstrap
2. World tick
3. Chunk- und Observer-System
4. Persistence
5. NPC personality + memory + genealogy
6. Civilization + politics
7. Economy + Matrix energy
8. Player, skills, combat, loot
9. Dungeons, ruins, oracle, history
10. Brain + field analyzer
11. Asset registry + GLB loading
12. GM editor
13. Client renderer + websocket sync
14. Firebase/AWS integration
```

---

DATEI
DIALOGUE_SYSTEM.md

PFAD
/docs/DIALOGUE_SYSTEM.md

INHALT
```
# Dialogue System

The dialogue system combines:
- personality traits
- family and lineage
- culture
- religion
- memory
- world events
- oracle/world history signals

## Pipeline
1. build context
2. choose tone
3. choose dialogue pool
4. inject dynamic references
5. return line + optional quest/world hint
```

---

DATEI
DUNGEON_SYSTEM.md

PFAD
/docs/DUNGEON_SYSTEM.md

INHALT
```
# Dungeon System

Dungeons are generated from seeds, ruins and regional history.

## Room types
- hall
- shrine
- monster_lair
- collapsed_passage
- treasure_room
- prison
- relic_chamber

## Inputs
- biome
- ruin class
- ancient civilization markers
- oracle hints
- current danger rating
```

---

DATEI
ECONOMY_MODEL.md

PFAD
/docs/ECONOMY_MODEL.md

INHALT
```
# Economy Model

Die Wirtschaft verbindet Ressourcen, Spieler, NPCs, Märkte und Städte.

## Kernelemente
- Stadtmärkte
- Handelsrouten
- NPC-Händler
- Spielerhandel
- Matrix-Energie
- politische und kriegerische Markteinflüsse

## Preisfaktoren
- Angebot
- Nachfrage
- Krieg
- Knappheit
- Transport
- Stadtsteuern
```

---

DATEI
GM_EDITOR.md

PFAD
/docs/GM_EDITOR.md

INHALT
```
# GM Editor

Der GM-Editor erlaubt Live-Eingriffe in die Welt.

## Fähigkeiten
- Objekte setzen
- NPCs spawnen
- Strukturen verschieben
- Terrainmarker bearbeiten
- Events starten
- Weltzustände prüfen

## Regel
Der Editor ist serverautoritativ. Der Client darf nur Befehle senden.
```

---

DATEI
MASTER_DESIGN_BIBLE.md

PFAD
/docs/MASTER_DESIGN_BIBLE.md

INHALT
```
# Master Design Bible

## Vision
Arelorian ist ein persistentes Browser-MMORPG mit emergenter Weltlogik. Die Welt ist theoretisch unendlich,
wird prozedural erzeugt und über Beobachterzonen simuliert.

## Fünf Axiome
1. Informationsfeld
2. Emergenz
3. Persistenz
4. Ouroboros-Zyklus
5. Beobachter

## Welt
- Prozedurale Welt
- Chunks 64x64
- Biome als natürliche Grenzen
- Ruinen, Dungeons und historische Schichten

## Zivilisationen
- Guild -> Village -> City -> Kingdom -> Nation
- Spieler und NPCs besitzen dieselben zivilisatorischen Rechte

## NPCs
- Personality
- DNA/Traits
- Genealogie und Häuser
- Memory und Shared Memory
- Kultur und Religion
- Politik und Familiengeschichte

## Gameplay
- klassenloses Skill-System
- Skills durch Nutzung
- Stamina als Kernressource
- Diablo-artiges Loot
- Magie als Skillzweig
- Crafting, Handel und Weltwirtschaft

## Systeme
- Server Brain mit 13-Punkte-Modell
- Dudenregister und Orakel
- Matrix-Energie
- Weltwunder und Schattenregisterportal
- GM-Editor
- GLB-Asset-Pipeline
```

---

DATEI
MASTER_SYSTEM_CHECKLIST.md

PFAD
/docs/MASTER_SYSTEM_CHECKLIST.md

INHALT
```
# Master System Checklist

## Welt
- [x] World generator
- [x] 64x64 chunk system
- [x] Observer simulation
- [x] Biome and terrain
- [x] World tick
- [x] Dungeons
- [x] Ruins

## NPC
- [x] Personality engine
- [x] Memory engine
- [x] Shared memory
- [x] Genealogy
- [x] DNA and traits
- [x] Dialogue
- [x] Quests

## Gesellschaft
- [x] Civilization engine
- [x] NPC politics
- [x] Player politics
- [x] Governments
- [x] Taxes
- [x] War

## Gameplay
- [x] Players
- [x] Skills
- [x] Inventory
- [x] Combat
- [x] Loot
- [x] Magic

## Spezial
- [x] Matrix energy
- [x] Dudenregister
- [x] Oracle
- [x] Server brain
- [x] GLB pipeline
- [x] GM editor
```

---

DATEI
MONSTER_SYSTEM.md

PFAD
/docs/MONSTER_SYSTEM.md

INHALT
```
# Monster System

Monsters are generated from:
- species
- dna
- mutation
- biome
- pack memory
- rarity

This allows regional monster lines such as frost wolves, swamp alphas or cave mutants.
```

---

DATEI
NPC_SYSTEM.md

PFAD
/docs/NPC_SYSTEM.md

INHALT
```
# NPC System

## Fünf Einflussfaktoren
- DNA / Traits
- Familie / Genealogie
- Kultur / Herkunft
- Religion / Weltbild
- Erfahrung / Memory

## Memory-Ebenen
- Local memory
- Social memory
- Faction memory
- Historical memory
- Oracle memory

## Verhalten
NPCs können:
- arbeiten
- handeln
- Gerüchte verbreiten
- Familien gründen
- Politik betreiben
- Kriege beginnen oder vermeiden
```

---

DATEI
PERSISTENCE_MODEL.md

PFAD
/docs/PERSISTENCE_MODEL.md

INHALT
```
# Persistence Model

Persistent storage is split by concern:
- world chunks
- players
- civilizations
- history / dudenregister
- snapshots
- asset metadata
```

---

DATEI
STRUCTURE_SYSTEM.md

PFAD
/docs/STRUCTURE_SYSTEM.md

INHALT
```
# Structure System

Structures connect GLB assets to persistent world entities.

## Types
- player_structure
- npc_structure
- civilization_structure
- ruin_structure
- wonder_structure
- matrix_protected_structure

## Examples
- house
- gate
- wall
- watch tower
- workshop
- temple
- shadow register portal
```

---

DATEI
WORLD_GENERATION.md

PFAD
/docs/WORLD_GENERATION.md

INHALT
```
# World Generation

Die Welt wird aus `seed + coordinates` erzeugt.

## Chunkstruktur
Jeder Chunk enthält:
- Terrain
- Biomtyp
- Ressourcen
- Objektliste
- Strukturen
- Ruinen oder Dungeon-Eingänge

## Simulationsebenen
1. Dormant
2. Background simulation
3. Active simulation
4. Full simulation

Nur beobachtete Regionen werden hochauflösend simuliert.
```

---

DATEI
DO_NOT_SIMPLIFY.md

PFAD
/final-lock/DO_NOT_SIMPLIFY.md

INHALT
```
# Do Not Simplify

Nicht reduzieren auf:
- Demo
- UI-Mockup
- Singleplayer-Sandbox
- nur Terrain-Viewer
- nur Client ohne Weltsimulation
```

---

DATEI
FINAL_TRUTH.md

PFAD
/final-lock/FINAL_TRUTH.md

INHALT
```
# Final Truth

Dieses Projekt ist ein persistentes MMORPG und darf nicht auf ein Mockup oder eine Einzelspieler-Demo reduziert werden.

Pflicht:
- 64x64 chunks
- observer simulation
- server-authoritative logic
- NPC memory + genealogy
- player and NPC politics
- matrix energy
- 13-node brain
- GM editor
- GLB pipeline
```

---

DATEI
REQUIRED_SYSTEMS_MATRIX.md

PFAD
/final-lock/REQUIRED_SYSTEMS_MATRIX.md

INHALT
```
# Required Systems Matrix

## Welt
observer, chunks, terrain, biomes, tick, dungeons, ruins

## NPC
personality, memory, shared memory, genealogy, dna, dialogue

## Gesellschaft
civilization, politics, government, tax, war, diplomacy

## Gameplay
player, skills, inventory, combat, loot, magic

## Spezial
oracle, dudenregister, matrix energy, brain, gm editor, glb pipeline
```

---

DATEI
biome-definitions.json

PFAD
/game-data/biomes/biome-definitions.json

INHALT
```
{
  "forest": {
    "temperature": "mild",
    "resources": [
      "wood",
      "berries",
      "animals"
    ]
  },
  "desert": {
    "temperature": "hot",
    "resources": [
      "sand",
      "salt",
      "crystals"
    ]
  },
  "mountain": {
    "temperature": "cold",
    "resources": [
      "stone",
      "iron",
      "gold"
    ]
  }
}
```

---

DATEI
cultures.json

PFAD
/game-data/cultures/cultures.json

INHALT
```
{
  "forest_tribes": {
    "style": "organic"
  },
  "mountain_clans": {
    "style": "stone"
  },
  "desert_nomads": {
    "style": "lightweight"
  }
}
```

---

DATEI
matrix-energy-rules.json

PFAD
/game-data/economy/matrix-energy-rules.json

INHALT
```
{
  "currency": "matrix_energy",
  "npcCannotDestroyProtectedStructures": true
}
```

---

DATEI
dudenregister-schema.json

PFAD
/game-data/history/dudenregister-schema.json

INHALT
```
{
  "events": [
    "war",
    "collapse",
    "ruin",
    "wonder",
    "dynasty",
    "oracle"
  ]
}
```

---

DATEI
loot-tables.json

PFAD
/game-data/items/loot-tables.json

INHALT
```
{
  "wolf": [
    "wolf_pelt",
    "fang",
    "alpha_claw"
  ],
  "skeleton": [
    "bone_fragment",
    "rusted_blade",
    "grave_ring"
  ],
  "ruin_cache": [
    "ancient_coin",
    "relic_fragment",
    "forgotten_sigil"
  ]
}
```

---

DATEI
spell-schools.json

PFAD
/game-data/magic/spell-schools.json

INHALT
```
{
  "nature": [
    "root_bind",
    "healing_moss"
  ],
  "shadow": [
    "dark_bolt",
    "fear_whisper"
  ],
  "resonance": [
    "echo_wave",
    "field_tone"
  ],
  "protection": [
    "ward_shield",
    "holy_barrier"
  ],
  "ritual": [
    "ancestral_call",
    "portal_trace"
  ]
}
```

---

DATEI
npc-archetypes.json

PFAD
/game-data/npc/npc-archetypes.json

INHALT
```
{
  "merchant": {},
  "guard": {},
  "oracle": {},
  "gossip": {
    "example": "Uschi die Geschminkte"
  }
}
```

---

DATEI
government-types.json

PFAD
/game-data/politics/government-types.json

INHALT
```
{
  "monarchy": {},
  "council": {},
  "theocracy": {},
  "trade_republic": {},
  "warband": {}
}
```

---

DATEI
quest-registry.json

PFAD
/game-data/quests/quest-registry.json

INHALT
```
{
  "ruin_hunter": {
    "giver": "uschi_gossip",
    "objective": "find_ruins"
  },
  "watchtower_supply": {
    "giver": "city_guard",
    "objective": "deliver_supplies"
  }
}
```

---

DATEI
religions.json

PFAD
/game-data/religions/religions.json

INHALT
```
{
  "sun_order": {
    "ethos": "honor"
  },
  "shadow_cult": {
    "ethos": "secrecy"
  },
  "ancestor_faith": {
    "ethos": "lineage"
  }
}
```

---

DATEI
skills.json

PFAD
/game-data/skills/skills.json

INHALT
```
{
  "combat": {},
  "woodcutting": {},
  "mining": {},
  "smithing": {},
  "magic": {},
  "fishing": {}
}
```

---

DATEI
README_INTEGRATIONS.md

PFAD
/integrations/README_INTEGRATIONS.md

INHALT
```
# Integrations

Hier werden produktive Integrationen abgelegt:
- Firebase
- AWS
- WebSocket Gateway
- Datenbankadapter

Wichtig: Keine Secrets hart in Dateien schreiben.
```

---

DATEI
elasticacheAdapter.ts

PFAD
/integrations/aws/elasticacheAdapter.ts

INHALT
```
export function initElastiCache() {
  return {
    status: "elasticache-adapter-placeholder"
  };
}
```

---

DATEI
postgresAdapter.ts

PFAD
/integrations/aws/postgresAdapter.ts

INHALT
```
export function initPostgres() {
  return {
    status: "postgres-adapter-placeholder"
  };
}
```

---

DATEI
firebase-config.ts

PFAD
/integrations/firebase/firebase-config.ts

INHALT
```
export const firebaseConfig = {
  note: "Fill with real Firebase credentials during deployment"
};
```

---

DATEI
firestorePersistence.ts

PFAD
/integrations/firebase/firestorePersistence.ts

INHALT
```
export function initFirestorePersistence() {
  return {
    status: "firestore-persistence-placeholder"
  };
}
```

---

DATEI
awsGatewayBridge.ts

PFAD
/integrations/websocket-gateway/awsGatewayBridge.ts

INHALT
```
export function initAwsGatewayBridge() {
  return {
    status: "aws-websocket-gateway-placeholder"
  };
}
```

---

DATEI
package.json

PFAD
/server/package.json

INHALT
```
{
  "name": "areloria-server",
  "version": "0.2.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "@types/ws": "^8.5.12",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

---

DATEI
ServerBootstrap.ts

PFAD
/server/src/core/ServerBootstrap.ts

INHALT
```
import express from "express";
import { createServer } from "node:http";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { WorldTick } from "./WorldTick.js";

export class ServerBootstrap {
  start() {
    const app = express();
    const httpServer = createServer(app);

    app.get("/health", (_req, res) => {
      res.json({
        ok: true,
        project: "ARELORIAN MMORPG",
        version: "0.2.0"
      });
    });

    const ws = new GameWebSocketServer(httpServer);
    ws.start();

    const tick = new WorldTick();
    const port = Number(process.env.PORT || 3000);

    httpServer.listen(port, () => {
      console.log(`Arelorian server listening on ${port}`);
      tick.start();
    });
  }
}
```

---

DATEI
WorldTick.ts

PFAD
/server/src/core/WorldTick.ts

INHALT
```
export class WorldTick {
  private timer: NodeJS.Timeout | null = null;
  private tickCount = 0;

  start() {
    this.timer = setInterval(() => this.tick(), 100);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  tick() {
    this.tickCount += 1;
    if (this.tickCount % 10 === 0) {
      console.log("World Tick", this.tickCount);
    }
  }
}
```

---

DATEI
index.ts

PFAD
/server/src/index.ts

INHALT
```
import { ServerBootstrap } from "./core/ServerBootstrap.js";

new ServerBootstrap().start();
```

---

DATEI
BehaviorTree.ts

PFAD
/server/src/modules/ai/BehaviorTree.ts

INHALT
```
export class BehaviorTree {
  run(npc: any) {
    if (npc.needs?.sleep) return "sleep";
    if (npc.needs?.hunger) return "eat";
    if (npc.job) return "work";
    return "wander";
  }
}
```

---

DATEI
NPCBrain.ts

PFAD
/server/src/modules/ai/NPCBrain.ts

INHALT
```
import { BehaviorTree } from "./BehaviorTree.js";

export class NPCBrain {
  private tree = new BehaviorTree();

  update(npc: any) {
    const action = this.tree.run(npc);
    npc.currentAction = action;
    return action;
  }
}
```

---

DATEI
TaskSystem.ts

PFAD
/server/src/modules/ai/TaskSystem.ts

INHALT
```
export class TaskSystem {
  execute(npc: any, action: string) {
    switch (action) {
      case "wander":
        return { action, destination: "random_nearby" };
      case "work":
        return { action, destination: npc.jobLocation ?? "workplace" };
      case "eat":
        return { action, destination: "tavern" };
      case "sleep":
        return { action, destination: "home" };
      default:
        return { action: "idle" };
    }
  }
}
```

---

DATEI
AssetRegistry.ts

PFAD
/server/src/modules/asset-registry/AssetRegistry.ts

INHALT
```
export class AssetRegistry {
  private assets = new Map<string, any>();

  register(id: string, data: any) {
    this.assets.set(id, data);
  }

  get(id: string) {
    return this.assets.get(id) ?? null;
  }

  list() {
    return Array.from(this.assets.entries()).map(([id, data]) => ({ id, ...data }));
  }
}
```

---

DATEI
NPCAssets.ts

PFAD
/server/src/modules/asset-registry/NPCAssets.ts

INHALT
```
export const NPCAssets = {
  uschi_gossip: {
    assetId: "uschi_gossip",
    model: "/assets/models/characters/uschi_gossip.glb",
    category: "npc",
    animations: ["idle", "talk", "laugh", "cough"]
  },
  warrior_male: {
    assetId: "warrior_male",
    model: "/assets/models/characters/warrior_male.glb",
    category: "player_or_npc",
    animations: ["idle", "walk", "attack"]
  },
  warrior_female: {
    assetId: "warrior_female",
    model: "/assets/models/characters/warrior_female.glb",
    category: "player_or_npc",
    animations: ["idle", "walk", "attack"]
  }
};
```

---

DATEI
StructureAssets.ts

PFAD
/server/src/modules/asset-registry/StructureAssets.ts

INHALT
```
export const StructureAssets = {
  castle_wall: {
    assetId: "castle_wall",
    type: "structure",
    model: "/assets/models/buildings/castle_wall.glb",
    collision: true
  },
  castle_gate: {
    assetId: "castle_gate",
    type: "interactive_structure",
    model: "/assets/models/buildings/castle_gate.glb",
    collision: true,
    states: ["open", "closed", "locked", "damaged", "destroyed"]
  },
  castle_watch_tower: {
    assetId: "castle_watch_tower",
    type: "defense_structure",
    model: "/assets/models/buildings/castle_watch_tower.glb",
    collision: true
  }
};
```

---

DATEI
VegetationAssets.ts

PFAD
/server/src/modules/asset-registry/VegetationAssets.ts

INHALT
```
export const VegetationAssets = {
  tree_oak_young: { model: "/assets/models/vegetation/tree_oak_young.glb", category: "vegetation", growthStage: 0 },
  tree_oak_spring: { model: "/assets/models/vegetation/tree_oak_spring.glb", category: "vegetation", growthStage: 1 },
  tree_oak_summer: { model: "/assets/models/vegetation/tree_oak_summer.glb", category: "vegetation", growthStage: 2 },
  tree_oak_autumn: { model: "/assets/models/vegetation/tree_oak_autumn.glb", category: "vegetation", growthStage: 3 }
};
```

---

DATEI
BrainFieldAnalyzer.ts

PFAD
/server/src/modules/brain/BrainFieldAnalyzer.ts

INHALT
```
export class BrainFieldAnalyzer {
  analyzeField(values: unknown[]) {
    return {
      activeNodes: values.length,
      result: "field-analysis-placeholder"
    };
  }
}
```

---

DATEI
HeuristicWorldBrain.ts

PFAD
/server/src/modules/brain/HeuristicWorldBrain.ts

INHALT
```
export class HeuristicWorldBrain {
  private readonly nodes = new Array(13).fill(null);

  analyze(input: unknown) {
    return {
      nodes: this.nodes.length,
      summary: "analysis-placeholder",
      input
    };
  }
}
```

---

DATEI
CivilizationEngine.ts

PFAD
/server/src/modules/civilization/CivilizationEngine.ts

INHALT
```
export class CivilizationEngine {
  createVillage(guildMembers: number) {
    if (guildMembers < 50) return null;
    return {
      type: "village",
      population: guildMembers,
      createdAt: Date.now()
    };
  }
}
```

---

DATEI
SettlementSystem.ts

PFAD
/server/src/modules/civilization/SettlementSystem.ts

INHALT
```
export class SettlementSystem {
  createSettlement(type: "village" | "city" | "kingdom" | "nation", ownerId: string) {
    return {
      type,
      ownerId,
      createdAt: Date.now()
    };
  }
}
```

---

DATEI
CombatSystem.ts

PFAD
/server/src/modules/combat/CombatSystem.ts

INHALT
```
export class CombatSystem {
  attack(attacker: any, defender: any) {
    if (attacker.stamina <= 0) return { success: false, reason: "no_stamina" };

    attacker.stamina -= 10;

    const hitChance = this.hitChance(attacker, defender);
    if (Math.random() > hitChance) {
      return { success: true, hit: false, damage: 0 };
    }

    const damage = this.calculateDamage(attacker, defender);
    defender.health = Math.max(0, defender.health - damage);

    return {
      success: true,
      hit: true,
      damage,
      defenderHealth: defender.health
    };
  }

  hitChance(attacker: any, defender: any) {
    const atk = attacker.skills?.combat?.level ?? 1;
    const def = defender.skills?.combat?.level ?? 1;
    return Math.min(0.95, Math.max(0.1, atk / (atk + def)));
  }

  calculateDamage(attacker: any, defender: any) {
    const atk = attacker.skills?.combat?.level ?? 1;
    const def = defender.skills?.combat?.level ?? 1;
    const base = 5 + atk;
    const mitigation = Math.floor(def * 0.3);
    return Math.max(1, base - mitigation + Math.floor(Math.random() * 4));
  }
}
```

---

DATEI
DialogueContext.ts

PFAD
/server/src/modules/dialogue/DialogueContext.ts

INHALT
```
export function buildDialogueContext(npc: any, player: any, world: any) {
  return {
    npcId: npc.id,
    playerId: player?.id ?? null,
    traits: npc.traits ?? {},
    lineage: npc.lineage ?? null,
    culture: npc.culture ?? null,
    religion: npc.religion ?? null,
    memory: npc.memory ?? [],
    worldEvents: world?.events ?? [],
    oracleSignals: world?.oracleSignals ?? []
  };
}
```

---

DATEI
DialogueEngine.ts

PFAD
/server/src/modules/dialogue/DialogueEngine.ts

INHALT
```
import { buildDialogueContext } from "./DialogueContext.js";
import { DialogueGenerator } from "./DialogueGenerator.js";

export class DialogueEngine {
  private generator = new DialogueGenerator();

  talk(npc: any, player: any, world: any) {
    const context = buildDialogueContext(npc, player, world);
    return this.generator.generate(context);
  }
}
```

---

DATEI
DialogueGenerator.ts

PFAD
/server/src/modules/dialogue/DialogueGenerator.ts

INHALT
```
import { DialogueTemplates } from "./DialogueTemplates.js";

export class DialogueGenerator {
  generate(context: any) {
    const mood = context.traits?.aggression > 0.7 ? "warning" : "greeting";
    const pool = DialogueTemplates[mood] ?? ["..."];
    return {
      line: pool[Math.floor(Math.random() * pool.length)],
      contextSummary: {
        culture: context.culture,
        religion: context.religion
      }
    };
  }
}
```

---

DATEI
DialogueTemplates.ts

PFAD
/server/src/modules/dialogue/DialogueTemplates.ts

INHALT
```
export const DialogueTemplates = {
  greeting: [
    "Na Süßer, suchst du Abenteuer?",
    "Du siehst aus, als hättest du Ärger im Gepäck.",
    "Setz dich, ich erzähl dir was Interessantes."
  ],
  rumor: [
    "Im Nordwald wurden alte Mauern gesehen.",
    "Die Händler reden von seltsamen Kreaturen im Moor.",
    "Ein Königreich im Osten ist nervös."
  ],
  warning: [
    "Geh da nicht unvorbereitet hinein.",
    "Manche Wege fressen ganze Blutlinien.",
    "Nicht jede Ruine will entdeckt werden."
  ]
};
```

---

DATEI
DungeonGenerator.ts

PFAD
/server/src/modules/dungeon/DungeonGenerator.ts

INHALT
```
export class DungeonGenerator {
  generate(seed: number) {
    const rooms = [];
    const roomCount = 4 + Math.floor(Math.abs(Math.sin(seed)) * 6);
    for (let i = 0; i < roomCount; i++) {
      rooms.push({
        id: i,
        type: this.randomRoom(seed + i),
        danger: 1 + (i % 5)
      });
    }
    return { seed, rooms };
  }

  randomRoom(seed: number) {
    const types = [
      "hall",
      "treasure_room",
      "monster_lair",
      "collapsed_passage",
      "ancient_shrine"
    ];
    return types[Math.abs(Math.floor(seed)) % types.length];
  }
}
```

---

DATEI
EconomyEngine.ts

PFAD
/server/src/modules/economy/EconomyEngine.ts

INHALT
```
export class EconomyEngine {
  private markets = new Map<string, { goods: Record<string, number> }>();

  registerMarket(id: string) {
    this.markets.set(id, { goods: {} });
  }

  trade(marketId: string, item: string, amount: number) {
    const market = this.markets.get(marketId);
    if (!market) return null;
    if (!market.goods[item]) market.goods[item] = 0;
    market.goods[item] += amount;
    return market.goods[item];
  }
}
```

---

DATEI
MatrixEnergySystem.ts

PFAD
/server/src/modules/economy/MatrixEnergySystem.ts

INHALT
```
export class MatrixEnergySystem {
  private balances = new Map<string, number>();

  add(playerId: string, amount: number) {
    const current = this.balances.get(playerId) || 0;
    this.balances.set(playerId, current + amount);
  }

  consume(playerId: string, amount: number) {
    const current = this.balances.get(playerId) || 0;
    if (current < amount) return false;
    this.balances.set(playerId, current - amount);
    return true;
  }

  getBalance(playerId: string) {
    return this.balances.get(playerId) || 0;
  }
}
```

---

DATEI
TradeRoutes.ts

PFAD
/server/src/modules/economy/TradeRoutes.ts

INHALT
```
export class TradeRoutes {
  createRoute(a: string, b: string) {
    return {
      from: a,
      to: b,
      active: true
    };
  }
}
```

---

DATEI
DudenregisterHistory.ts

PFAD
/server/src/modules/history/DudenregisterHistory.ts

INHALT
```
export class DudenregisterHistory {
  private history: any[] = [];

  record(event: any) {
    this.history.push(event);
  }

  getHistory() {
    return this.history;
  }
}
```

---

DATEI
WorldSnapshotSystem.ts

PFAD
/server/src/modules/history/WorldSnapshotSystem.ts

INHALT
```
export class WorldSnapshotSystem {
  private snapshots: any[] = [];

  save(worldState: any) {
    this.snapshots.push({
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(worldState))
    });
  }

  latest() {
    return this.snapshots[this.snapshots.length - 1] ?? null;
  }
}
```

---

DATEI
InventorySystem.ts

PFAD
/server/src/modules/inventory/InventorySystem.ts

INHALT
```
export class InventorySystem {
  addItem(player: any, item: any) {
    player.inventory.push(item);
    return player.inventory;
  }

  removeItem(player: any, itemId: string) {
    player.inventory = player.inventory.filter((item: any) => item.id !== itemId);
    return player.inventory;
  }
}
```

---

DATEI
LootTables.ts

PFAD
/server/src/modules/loot/LootTables.ts

INHALT
```
export const LootTables = {
  wolf: [
    { id: "wolf_pelt", chance: 0.65, rarity: "common" },
    { id: "fang", chance: 0.3, rarity: "common" },
    { id: "alpha_claw", chance: 0.05, rarity: "rare" }
  ],
  skeleton: [
    { id: "bone_fragment", chance: 0.7, rarity: "common" },
    { id: "rusted_blade", chance: 0.2, rarity: "uncommon" },
    { id: "grave_ring", chance: 0.03, rarity: "rare" }
  ],
  ruin_cache: [
    { id: "ancient_coin", chance: 0.5, rarity: "uncommon" },
    { id: "relic_fragment", chance: 0.2, rarity: "rare" },
    { id: "forgotten_sigil", chance: 0.02, rarity: "legendary" }
  ]
};
```

---

DATEI
MagicSystem.ts

PFAD
/server/src/modules/magic/MagicSystem.ts

INHALT
```
export class MagicSystem {
  cast(caster: any, spell: any, target: any) {
    if ((caster.mana ?? 0) < spell.cost) {
      return { success: false, reason: "not_enough_mana" };
    }

    caster.mana -= spell.cost;

    return {
      success: true,
      spell: spell.id,
      target: target?.id ?? null,
      effect: spell.effect ?? "generic_magic_effect"
    };
  }
}
```

---

DATEI
MonsterDNA.ts

PFAD
/server/src/modules/monster/MonsterDNA.ts

INHALT
```
export function generateMonsterDNA(species: string) {
  return {
    species,
    strength: Math.random(),
    speed: Math.random(),
    aggression: Math.random(),
    intelligence: Math.random(),
    resilience: Math.random()
  };
}
```

---

DATEI
MonsterMutation.ts

PFAD
/server/src/modules/monster/MonsterMutation.ts

INHALT
```
export function mutateMonster(dna: any, biome: string) {
  const clone = { ...dna, mutations: [] as string[] };

  if (biome === "snow") {
    clone.resilience += 0.2;
    clone.mutations.push("frost_resistance");
  }

  if (biome === "swamp") {
    clone.aggression += 0.15;
    clone.mutations.push("swamp_hunger");
  }

  if (Math.random() < 0.08) {
    clone.mutations.push("rare_variant");
  }

  return clone;
}
```

---

DATEI
MonsterSpawner.ts

PFAD
/server/src/modules/monster/MonsterSpawner.ts

INHALT
```
import { generateMonsterDNA } from "./MonsterDNA.js";
import { mutateMonster } from "./MonsterMutation.js";

export class MonsterSpawner {
  spawn(species: string, biome: string) {
    const dna = generateMonsterDNA(species);
    return mutateMonster(dna, biome);
  }
}
```

---

DATEI
NPCDialogueSystem.ts

PFAD
/server/src/modules/npc/NPCDialogueSystem.ts

INHALT
```
export class NPCDialogueSystem {
  talk(npc: any, worldSignals: any = {}) {
    const lines = npc.dialogueLines || [
      "Die Welt flüstert merkwürdige Dinge.",
      "Ich habe da ein Gerücht gehört."
    ];

    return {
      line: lines[Math.floor(Math.random() * lines.length)],
      signals: worldSignals
    };
  }
}
```

---

DATEI
NPCGenealogyEngine.ts

PFAD
/server/src/modules/npc/NPCGenealogyEngine.ts

INHALT
```
export class NPCGenealogyEngine {
  createLineage(id: string, house: string, parents: string[] = []) {
    return {
      id,
      house,
      parents,
      children: [] as string[]
    };
  }

  addChild(lineage: any, childId: string) {
    lineage.children.push(childId);
    return lineage;
  }
}
```

---

DATEI
NPCMemoryEngine.ts

PFAD
/server/src/modules/npc/NPCMemoryEngine.ts

INHALT
```
export class NPCMemoryEngine {
  private memory = new Map<string, any[]>();

  remember(npcId: string, event: any) {
    if (!this.memory.has(npcId)) this.memory.set(npcId, []);
    this.memory.get(npcId)!.push({
      timestamp: Date.now(),
      event
    });
  }

  recall(npcId: string) {
    return this.memory.get(npcId) || [];
  }
}
```

---

DATEI
NPCPersonalityEngine.ts

PFAD
/server/src/modules/npc/NPCPersonalityEngine.ts

INHALT
```
export class NPCPersonalityEngine {
  generateTraits() {
    return {
      courage: Math.random(),
      curiosity: Math.random(),
      greed: Math.random(),
      faith: Math.random(),
      aggression: Math.random()
    };
  }
}
```

---

DATEI
ObserverEngine.ts

PFAD
/server/src/modules/observer/ObserverEngine.ts

INHALT
```
export class ObserverEngine {
  private observers = new Map<string, { x: number; y: number }>();

  register(playerId: string, position: { x: number; y: number }) {
    this.observers.set(playerId, position);
  }

  unregister(playerId: string) {
    this.observers.delete(playerId);
  }

  getObservedChunks() {
    const result = [] as { chunkX: number; chunkY: number }[];
    for (const [, pos] of this.observers) {
      result.push({
        chunkX: Math.floor(pos.x / 64),
        chunkY: Math.floor(pos.y / 64)
      });
    }
    return result;
  }
}
```

---

DATEI
OracleEngine.ts

PFAD
/server/src/modules/oracle/OracleEngine.ts

INHALT
```
export class OracleEngine {
  generateVision() {
    const visions = [
      "Ich sehe Feuer im Norden.",
      "Unter alten Mauern liegt ein Geheimnis.",
      "Ein Königreich wird fallen."
    ];
    return visions[Math.floor(Math.random() * visions.length)];
  }
}
```

---

DATEI
CivilizationDatabase.ts

PFAD
/server/src/modules/persistence/CivilizationDatabase.ts

INHALT
```
export class CivilizationDatabase {
  private civilizations = new Map<string, any>();

  saveCivilization(civ: any) {
    this.civilizations.set(civ.id, civ);
  }

  loadCivilization(id: string) {
    return this.civilizations.get(id) ?? null;
  }
}
```

---

DATEI
PlayerDatabase.ts

PFAD
/server/src/modules/persistence/PlayerDatabase.ts

INHALT
```
export class PlayerDatabase {
  private players = new Map<string, any>();

  savePlayer(player: any) {
    this.players.set(player.id, player);
  }

  loadPlayer(id: string) {
    return this.players.get(id) ?? null;
  }
}
```

---

DATEI
WorldDatabase.ts

PFAD
/server/src/modules/persistence/WorldDatabase.ts

INHALT
```
export class WorldDatabase {
  private chunks = new Map<string, any>();

  saveChunk(chunk: any) {
    this.chunks.set(chunk.id, chunk);
  }

  loadChunk(id: string) {
    return this.chunks.get(id) ?? null;
  }
}
```

---

DATEI
PlayerSystem.ts

PFAD
/server/src/modules/player/PlayerSystem.ts

INHALT
```
export class PlayerSystem {
  createPlayer(id: string, name: string) {
    return {
      id,
      name,
      position: { x: 0, y: 0, z: 0 },
      health: 100,
      stamina: 100,
      mana: 25,
      skills: {},
      inventory: [],
      faction: null,
      civilization: null,
      matrixEnergy: 0
    };
  }
}
```

---

DATEI
GovernmentTypes.ts

PFAD
/server/src/modules/politics/GovernmentTypes.ts

INHALT
```
export const GovernmentTypes = {
  monarchy: { id: "monarchy", succession: "inheritance", stabilityBase: 0.7 },
  council: { id: "council", succession: "vote", stabilityBase: 0.6 },
  theocracy: { id: "theocracy", succession: "religious_selection", stabilityBase: 0.65 },
  trade_republic: { id: "trade_republic", succession: "merchant_vote", stabilityBase: 0.55 },
  warband: { id: "warband", succession: "strength", stabilityBase: 0.4 }
};
```

---

DATEI
WarEngine.ts

PFAD
/server/src/modules/politics/WarEngine.ts

INHALT
```
export class WarEngine {
  declareWar(attacker: any, defender: any) {
    return {
      type: "war_declared",
      attacker: attacker.id,
      defender: defender.id,
      timestamp: Date.now()
    };
  }
}
```

---

DATEI
QuestEngine.ts

PFAD
/server/src/modules/quest/QuestEngine.ts

INHALT
```
import { QuestRegistry } from "./QuestRegistry.js";

export class QuestEngine {
  private active = new Map<string, any[]>();

  startQuest(playerId: string, questId: keyof typeof QuestRegistry) {
    const quest = QuestRegistry[questId];
    if (!quest) return null;
    if (!this.active.has(playerId)) this.active.set(playerId, []);
    this.active.get(playerId)!.push({ ...quest, startedAt: Date.now(), completed: false });
    return quest;
  }

  listQuests(playerId: string) {
    return this.active.get(playerId) || [];
  }

  completeQuest(playerId: string, questId: string) {
    const quests = this.active.get(playerId) || [];
    const q = quests.find((x) => x.id === questId);
    if (!q) return null;
    q.completed = true;
    q.completedAt = Date.now();
    return q.reward;
  }
}
```

---

DATEI
QuestRegistry.ts

PFAD
/server/src/modules/quest/QuestRegistry.ts

INHALT
```
export const QuestRegistry = {
  ruin_hunter: {
    id: "ruin_hunter",
    name: "Die alten Mauern",
    giver: "uschi_gossip",
    objective: "find_ruins",
    reward: { gold: 100, item: "ancient_relic" }
  },
  watchtower_supply: {
    id: "watchtower_supply",
    name: "Die hungernden Wächter",
    giver: "city_guard",
    objective: "deliver_supplies",
    reward: { xp: 50, item: "guard_token" }
  }
};
```

---

DATEI
ReligionSystem.ts

PFAD
/server/src/modules/religion/ReligionSystem.ts

INHALT
```
export class ReligionSystem {
  private religions = new Map<string, any>();

  registerReligion(id: string, data: any) {
    this.religions.set(id, data);
  }

  getReligion(id: string) {
    return this.religions.get(id);
  }
}
```

---

DATEI
SkillSystem.ts

PFAD
/server/src/modules/skill/SkillSystem.ts

INHALT
```
export class SkillSystem {
  ensureSkill(player: any, skillName: string) {
    if (!player.skills[skillName]) {
      player.skills[skillName] = { level: 1, xp: 0 };
    }
  }

  addXP(player: any, skillName: string, amount: number) {
    this.ensureSkill(player, skillName);
    const skill = player.skills[skillName];
    skill.xp += amount;
    while (skill.xp >= this.nextLevelXP(skill.level)) {
      skill.level += 1;
    }
    return skill;
  }

  nextLevelXP(level: number) {
    return Math.floor(50 * Math.pow(level, 1.4));
  }
}
```

---

DATEI
GateController.ts

PFAD
/server/src/modules/structure/GateController.ts

INHALT
```
export class GateController {
  setState(gate: any, state: string) {
    const allowed = ["open", "closed", "locked", "damaged", "destroyed"];
    if (!allowed.includes(state)) throw new Error("Invalid gate state");
    gate.state = state;
    return gate;
  }

  canOpen(actor: any, gate: any) {
    if (gate.state === "destroyed") return false;
    if (gate.state === "locked" && !actor.permissions?.includes("gate_access")) return false;
    return true;
  }
}
```

---

DATEI
StructureEngine.ts

PFAD
/server/src/modules/structure/StructureEngine.ts

INHALT
```
export class StructureEngine {
  private structures = new Map<string, any>();

  createStructure(structure: any) {
    this.structures.set(structure.structureId, structure);
    return structure;
  }

  getStructure(id: string) {
    return this.structures.get(id) ?? null;
  }

  damageStructure(id: string, amount: number) {
    const structure = this.structures.get(id);
    if (!structure) return null;
    structure.hitpoints = Math.max(0, structure.hitpoints - amount);
    if (structure.hitpoints === 0) structure.destroyed = true;
    return structure;
  }
}
```

---

DATEI
BiomeGenerator.ts

PFAD
/server/src/modules/world/BiomeGenerator.ts

INHALT
```
export class BiomeGenerator {
  getBiome(_x: number, _y: number, height: number) {
    if (height > 0.7) return "mountain";
    if (height > 0.45) return "forest";
    if (height > 0.2) return "grassland";
    return "desert";
  }
}
```

---

DATEI
ChunkSystem.ts

PFAD
/server/src/modules/world/ChunkSystem.ts

INHALT
```
export class ChunkSystem {
  constructor(public readonly size: number = 64) {}

  getChunk(x: number, y: number) {
    return {
      id: `${x}:${y}`,
      x,
      y,
      size: this.size
    };
  }
}
```

---

DATEI
TerrainGenerator.ts

PFAD
/server/src/modules/world/TerrainGenerator.ts

INHALT
```
export class TerrainGenerator {
  getHeight(x: number, y: number) {
    return Math.sin(x * 0.1) + Math.cos(y * 0.1);
  }
}
```

---

DATEI
WorldEditorServer.ts

PFAD
/server/src/modules/world-editor/WorldEditorServer.ts

INHALT
```
export class WorldEditorServer {
  spawnEntity(type: string, position: { x: number; y: number; z: number }) {
    return { action: "spawn", type, position };
  }

  moveEntity(entityId: string, position: { x: number; y: number; z: number }) {
    return { action: "move", entityId, position };
  }

  deleteEntity(entityId: string) {
    return { action: "delete", entityId };
  }
}
```

---

DATEI
PacketRouter.ts

PFAD
/server/src/networking/PacketRouter.ts

INHALT
```
export class PacketRouter {
  route(packet: any) {
    return {
      handled: true,
      type: packet?.type ?? "unknown"
    };
  }
}
```

---

DATEI
PlayerSession.ts

PFAD
/server/src/networking/PlayerSession.ts

INHALT
```
export type PlayerSession = {
  id: string;
  name: string;
  connectedAt: number;
  position: { x: number; y: number; z: number };
};
```

---

DATEI
WebSocketServer.ts

PFAD
/server/src/networking/WebSocketServer.ts

INHALT
```
import type { Server as HttpServer } from "node:http";
import { WebSocketServer } from "ws";

export class GameWebSocketServer {
  private wss: WebSocketServer | null = null;

  constructor(private readonly httpServer: HttpServer) {}

  start() {
    this.wss = new WebSocketServer({ server: this.httpServer });

    this.wss.on("connection", (socket) => {
      socket.send(JSON.stringify({
        type: "welcome",
        message: "Arelorian connection established"
      }));

      socket.on("message", (msg) => {
        console.log("WS message:", msg.toString());
      });
    });
  }
}
```

---

DATEI
tsconfig.json

PFAD
/server/tsconfig.json

INHALT
```
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": [
    "src/**/*"
  ]
}
```

---

DATEI
README_ASSETS.md

PFAD
/world-assets/README_ASSETS.md

INHALT
```
# World Assets

Lege hier GLB-Assets ab:
- characters/
- monsters/
- buildings/
- props/
- vegetation/
- admin/

Beispiele:
- uschi_gossip.glb
- warrior_male.glb
- warrior_female.glb
- castle_gate.glb
- castle_watch_tower.glb
- tree_oak_spring.glb
- gm_giraffe.glb
```
```

---

DATEI
package.json

PFAD
/client/package.json

INHALT
```
{
  "name": "areloria-client",
  "version": "0.2.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "three": "^0.169.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^5.4.0"
  }
}
```

---

DATEI
index.html

PFAD
/client/public/index.html

INHALT
```
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
    <title>Arelorian Client</title>
  </head>
  <body>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

---

DATEI
AssetLoader.ts

PFAD
/client/src/assets/AssetLoader.ts

INHALT
```
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class AssetLoader {
  private loader = new GLTFLoader();

  load(path: string) {
    return new Promise((resolve, reject) => {
      this.loader.load(path, (gltf) => resolve(gltf.scene), undefined, reject);
    });
  }
}
```

---

DATEI
ModelRegistry.ts

PFAD
/client/src/assets/ModelRegistry.ts

INHALT
```
export const ModelRegistry = {
  uschi: { path: "/assets/models/characters/uschi_gossip.glb", scale: 1 },
  castle_wall: { path: "/assets/models/buildings/castle_wall.glb", scale: 1 },
  watch_tower: { path: "/assets/models/buildings/castle_watch_tower.glb", scale: 1 },
  tree_spring: { path: "/assets/models/vegetation/tree_oak_spring.glb", scale: 1 },
  gm_giraffe: { path: "/assets/models/admin/gm_giraffe.glb", scale: 1 }
};
```

---

DATEI
GMCommandConsole.ts

PFAD
/client/src/editor/GMCommandConsole.ts

INHALT
```
export class GMCommandConsole {
  run(command: string) {
    return {
      command,
      status: "queued"
    };
  }
}
```

---

DATEI
PlacementTool.ts

PFAD
/client/src/editor/PlacementTool.ts

INHALT
```
export class PlacementTool {
  place(type: string, position: { x: number; y: number; z: number }) {
    return { action: "place", type, position };
  }
}
```

---

DATEI
SelectionTool.ts

PFAD
/client/src/editor/SelectionTool.ts

INHALT
```
export class SelectionTool {
  select(entityId: string) {
    return { selected: entityId };
  }
}
```

---

DATEI
WorldEditorUI.ts

PFAD
/client/src/editor/WorldEditorUI.ts

INHALT
```
export function openWorldEditorUI() {
  const el = document.createElement("div");
  el.textContent = "GM World Editor";
  el.style.position = "fixed";
  el.style.right = "12px";
  el.style.bottom = "12px";
  el.style.padding = "10px 14px";
  el.style.background = "#2b2b2b";
  el.style.color = "#fff";
  document.body.appendChild(el);
}
```

---

DATEI
renderer.ts

PFAD
/client/src/engine/renderer.ts

INHALT
```
import * as THREE from "three";

export function initRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshBasicMaterial({ color: 0x44aa88 })
  );

  scene.add(cube);

  function animate() {
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();
}
```

---

DATEI
worldLoader.ts

PFAD
/client/src/engine/worldLoader.ts

INHALT
```
export function loadWorldChunk(chunkX: number, chunkY: number) {
  return {
    chunkX,
    chunkY,
    status: "requested"
  };
}
```

---

DATEI
farmingSystem.ts

PFAD
/client/src/gameplay/farmingSystem.ts

INHALT
```
export function plantSeed(seedId: string) {
  return {
    seedId,
    planted: true
  };
}
```

---

DATEI
playerController.ts

PFAD
/client/src/gameplay/playerController.ts

INHALT
```
export class PlayerController {
  move(direction: string) {
    return {
      type: "move",
      direction
    };
  }
}
```

---

DATEI
main.ts

PFAD
/client/src/main.ts

INHALT
```
import { initRenderer } from "./engine/renderer";
import { connectSocket } from "./networking/websocketClient";
import { renderHUD } from "./ui/hud";

const canvas = document.createElement("canvas");
document.body.style.margin = "0";
document.body.appendChild(canvas);

initRenderer(canvas);
connectSocket();
renderHUD();
```

---

DATEI
websocketClient.ts

PFAD
/client/src/networking/websocketClient.ts

INHALT
```
export function connectSocket() {
  const ws = new WebSocket(`ws://${location.hostname}:3000`);

  ws.onopen = () => console.log("Connected to Arelorian server");
  ws.onmessage = (msg) => console.log("Server:", msg.data);

  return ws;
}
```

---

DATEI
chat.ts

PFAD
/client/src/ui/chat.ts

INHALT
```
export function renderChat() {
  const el = document.createElement("div");
  el.textContent = "Chat placeholder";
  el.style.position = "fixed";
  el.style.left = "12px";
  el.style.bottom = "12px";
  el.style.padding = "8px 12px";
  el.style.background = "rgba(0,0,0,0.55)";
  el.style.color = "#fff";
  document.body.appendChild(el);
}
```

---

DATEI
crafting.ts

PFAD
/client/src/ui/crafting.ts

INHALT
```
export function renderCraftingUI() {
  const panel = document.createElement("div");
  panel.textContent = "Crafting UI placeholder";
  return panel;
}
```

---

DATEI
hud.ts

PFAD
/client/src/ui/hud.ts

INHALT
```
export function renderHUD() {
  const hud = document.createElement("div");
  hud.textContent = "Arelorian HUD online";
  hud.style.position = "fixed";
  hud.style.top = "12px";
  hud.style.left = "12px";
  hud.style.padding = "8px 12px";
  hud.style.background = "rgba(0,0,0,0.55)";
  hud.style.color = "#fff";
  hud.style.fontFamily = "sans-serif";
  document.body.appendChild(hud);
}
```

---

DATEI
inventory.ts

PFAD
/client/src/ui/inventory.ts

INHALT
```
export function renderInventory() {
  const el = document.createElement("div");
  el.textContent = "Inventory placeholder";
  el.style.position = "fixed";
  el.style.right = "12px";
  el.style.top = "12px";
  el.style.padding = "8px 12px";
  el.style.background = "rgba(0,0,0,0.55)";
  el.style.color = "#fff";
  document.body.appendChild(el);
}
```

---

DATEI
market.ts

PFAD
/client/src/ui/market.ts

INHALT
```
export function renderMarketUI() {
  const panel = document.createElement("div");
  panel.textContent = "Market UI placeholder";
  return panel;
}
```

---

DATEI
tsconfig.json

PFAD
/client/tsconfig.json

INHALT
```
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true
  },
  "include": [
    "src/**/*"
  ]
}
```

---

DATEI
ADMIN_MOUNT_SYSTEM.md

PFAD
/docs/ADMIN_MOUNT_SYSTEM.md

INHALT
```
# Admin Mount System

Admins und GMs können besondere Mounts erhalten, z.B. die gaffende Giraffe.

## Zweck
- sichtbare GM-Präsenz
- World-Editor-Kontext
- humorvolles Prestige-Element

## Geplante Fähigkeiten
- teleport
- fly
- world_edit_mode
- spawn_shortcuts
```

---

DATEI
AFFIX_AND_ITEM_GENERATION.md

PFAD
/docs/AFFIX_AND_ITEM_GENERATION.md

INHALT
```
# Affix and Item Generation

Items bestehen aus:
- Base Item
- Rarity
- Affix Set
- Item Power

## Rarity
common, uncommon, rare, epic, legendary, mythic

## Beispiel-Affixe
- +Strength
- +Attack Speed
- +Health
- +Mining Skill
- +Fire Resistance
```

---

DATEI
ASSET_PIPELINE.md

PFAD
/docs/ASSET_PIPELINE.md

INHALT
```
# Asset Pipeline

## GLB-Regeln
Terrain ist kein GLB-Bodenteppich. GLB wird für NPCs, Monster, Gebäude, Bäume, Props und Reittiere verwendet.

## Struktur
- characters/
- monsters/
- buildings/
- props/
- vegetation/
- admin/

## Validierung
Jedes Asset sollte idealerweise besitzen:
- sauberen Ursprungspunkt
- sinnvolle Skalierung
- optionales Rig/Skeleton
- optional Animationen
```

---

DATEI
BRAIN_SYSTEM.md

PFAD
/docs/BRAIN_SYSTEM.md

INHALT
```
# Brain System

Das Server Brain ist eine heuristische Meta-Schicht.

## Aufgaben
- Spannungen erkennen
- Politiksignale lesen
- Marktanomalien erkennen
- Orakelvisionen speisen
- Ereignisse anstoßen

## 13-Punkte-Modell
- 4 Weltpunkte
- 4 Interpretationspunkte
- 4 Dynamikpunkte
- 1 Zentrum

Das Zentrum aggregiert Weltzustand, NPC-Memory, Ökonomie, Politik und Geschichte.
```

---

DATEI
BUILD_SEQUENCE_MASTER.md

PFAD
/docs/BUILD_SEQUENCE_MASTER.md

INHALT
```
# Build Sequence Master

1. Server core und bootstrap
2. World tick
3. Chunk- und Observer-System
4. Persistence
5. NPC personality + memory + genealogy
6. Civilization + politics
7. Economy + Matrix energy
8. Player, skills, combat, loot
9. Dungeons, ruins, oracle, history
10. Brain + field analyzer
11. Asset registry + GLB loading
12. GM editor
13. Client renderer + websocket sync
14. Firebase/AWS integration
```

---

DATEI
CRAFTING_SYSTEM.md

PFAD
/docs/CRAFTING_SYSTEM.md

INHALT
```
# Crafting System

Crafting verbindet Skills, Ressourcen, Wirtschaft und Städtebau.

## Grundprinzip
- Spieler sammeln Rohstoffe
- Rezepte definieren Inputs und Outputs
- Crafting gibt Skill-XP
- Qualität und Affixe können das Ergebnis beeinflussen

## Kernbereiche
- Smithing
- Woodworking
- Tailoring
- Alchemy
- Construction
- Cooking

## Serverregeln
Alle Crafting-Ergebnisse werden serverseitig berechnet.
```

---

DATEI
DIALOGUE_SYSTEM.md

PFAD
/docs/DIALOGUE_SYSTEM.md

INHALT
```
# Dialogue System

The dialogue system combines:
- personality traits
- family and lineage
- culture
- religion
- memory
- world events
- oracle/world history signals

## Pipeline
1. build context
2. choose tone
3. choose dialogue pool
4. inject dynamic references
5. return line + optional quest/world hint
```

---

DATEI
DUNGEON_SYSTEM.md

PFAD
/docs/DUNGEON_SYSTEM.md

INHALT
```
# Dungeon System

Dungeons are generated from seeds, ruins and regional history.

## Room types
- hall
- shrine
- monster_lair
- collapsed_passage
- treasure_room
- prison
- relic_chamber

## Inputs
- biome
- ruin class
- ancient civilization markers
- oracle hints
- current danger rating
```

---

DATEI
ECONOMY_MODEL.md

PFAD
/docs/ECONOMY_MODEL.md

INHALT
```
# Economy Model

Die Wirtschaft verbindet Ressourcen, Spieler, NPCs, Märkte und Städte.

## Kernelemente
- Stadtmärkte
- Handelsrouten
- NPC-Händler
- Spielerhandel
- Matrix-Energie
- politische und kriegerische Markteinflüsse

## Preisfaktoren
- Angebot
- Nachfrage
- Krieg
- Knappheit
- Transport
- Stadtsteuern
```

---

DATEI
FARMING_AND_GROWTH_SYSTEM.md

PFAD
/docs/FARMING_AND_GROWTH_SYSTEM.md

INHALT
```
# Farming and Growth System

Die Welt besitzt Wachstum über Zeit und Ticks.

## Baumwachstum
- young
- spring
- summer
- autumn
- optional winter/dead

## Farming
- Saat setzen
- Wachstum prüfen
- Ernte
- Boden- und Biomabhängigkeit

## Weltintegration
TreeGrowth und Farming laufen über den World Tick.
```

---

DATEI
GM_COMMAND_LAYER.md

PFAD
/docs/GM_COMMAND_LAYER.md

INHALT
```
# GM Command Layer

Der GM Command Layer kapselt administrative Eingriffe.

## Beispiele
- /spawn npc merchant
- /spawn structure castle_gate
- /event drought start
- /teleport x y z
- /set season autumn
- /set biome desert

Alle Befehle werden serverseitig validiert.
```

---

DATEI
GM_EDITOR.md

PFAD
/docs/GM_EDITOR.md

INHALT
```
# GM Editor

Der GM-Editor erlaubt Live-Eingriffe in die Welt.

## Fähigkeiten
- Objekte setzen
- NPCs spawnen
- Strukturen verschieben
- Terrainmarker bearbeiten
- Events starten
- Weltzustände prüfen

## Regel
Der Editor ist serverautoritativ. Der Client darf nur Befehle senden.
```

---

DATEI
MARKET_EXPANSION.md

PFAD
/docs/MARKET_EXPANSION.md

INHALT
```
# Market Expansion

Zusätzlich zum Basismarkt gibt es:
- regionale Preisprofile
- Handelsroutenboni
- Kriegsaufschläge
- Seltenheitsaufschläge
- NPC-Händlerverhalten

## Marktflüsse
Rohstoff -> Verarbeitung -> Weiterverkauf -> Steuer -> Wohlstand
```

---

DATEI
MASTER_DESIGN_BIBLE.md

PFAD
/docs/MASTER_DESIGN_BIBLE.md

INHALT
```
# Master Design Bible

## Vision
Arelorian ist ein persistentes Browser-MMORPG mit emergenter Weltlogik. Die Welt ist theoretisch unendlich,
wird prozedural erzeugt und über Beobachterzonen simuliert.

## Fünf Axiome
1. Informationsfeld
2. Emergenz
3. Persistenz
4. Ouroboros-Zyklus
5. Beobachter

## Welt
- Prozedurale Welt
- Chunks 64x64
- Biome als natürliche Grenzen
- Ruinen, Dungeons und historische Schichten

## Zivilisationen
- Guild -> Village -> City -> Kingdom -> Nation
- Spieler und NPCs besitzen dieselben zivilisatorischen Rechte

## NPCs
- Personality
- DNA/Traits
- Genealogie und Häuser
- Memory und Shared Memory
- Kultur und Religion
- Politik und Familiengeschichte

## Gameplay
- klassenloses Skill-System
- Skills durch Nutzung
- Stamina als Kernressource
- Diablo-artiges Loot
- Magie als Skillzweig
- Crafting, Handel und Weltwirtschaft

## Systeme
- Server Brain mit 13-Punkte-Modell
- Dudenregister und Orakel
- Matrix-Energie
- Weltwunder und Schattenregisterportal
- GM-Editor
- GLB-Asset-Pipeline
```

---

DATEI
MASTER_SYSTEM_CHECKLIST.md

PFAD
/docs/MASTER_SYSTEM_CHECKLIST.md

INHALT
```
# Master System Checklist

## Welt
- [x] World generator
- [x] 64x64 chunk system
- [x] Observer simulation
- [x] Biome and terrain
- [x] World tick
- [x] Dungeons
- [x] Ruins

## NPC
- [x] Personality engine
- [x] Memory engine
- [x] Shared memory
- [x] Genealogy
- [x] DNA and traits
- [x] Dialogue
- [x] Quests

## Gesellschaft
- [x] Civilization engine
- [x] NPC politics
- [x] Player politics
- [x] Governments
- [x] Taxes
- [x] War

## Gameplay
- [x] Players
- [x] Skills
- [x] Inventory
- [x] Combat
- [x] Loot
- [x] Magic

## Spezial
- [x] Matrix energy
- [x] Dudenregister
- [x] Oracle
- [x] Server brain
- [x] GLB pipeline
- [x] GM editor
```

---

DATEI
MONSTER_SYSTEM.md

PFAD
/docs/MONSTER_SYSTEM.md

INHALT
```
# Monster System

Monsters are generated from:
- species
- dna
- mutation
- biome
- pack memory
- rarity

This allows regional monster lines such as frost wolves, swamp alphas or cave mutants.
```

---

DATEI
NPC_SCHEDULES.md

PFAD
/docs/NPC_SCHEDULES.md

INHALT
```
# NPC Schedules

NPCs haben Tages- und Rollenpläne.

## Beispiele
Merchant:
- wake
- open shop
- trade
- tavern
- sleep

Guard:
- patrol
- gate duty
- tavern
- sleep
```

---

DATEI
NPC_SYSTEM.md

PFAD
/docs/NPC_SYSTEM.md

INHALT
```
# NPC System

## Fünf Einflussfaktoren
- DNA / Traits
- Familie / Genealogie
- Kultur / Herkunft
- Religion / Weltbild
- Erfahrung / Memory

## Memory-Ebenen
- Local memory
- Social memory
- Faction memory
- Historical memory
- Oracle memory

## Verhalten
NPCs können:
- arbeiten
- handeln
- Gerüchte verbreiten
- Familien gründen
- Politik betreiben
- Kriege beginnen oder vermeiden
```

---

DATEI
PERSISTENCE_MODEL.md

PFAD
/docs/PERSISTENCE_MODEL.md

INHALT
```
# Persistence Model

Persistent storage is split by concern:
- world chunks
- players
- civilizations
- history / dudenregister
- snapshots
- asset metadata
```

---

DATEI
STRUCTURE_SYSTEM.md

PFAD
/docs/STRUCTURE_SYSTEM.md

INHALT
```
# Structure System

Structures connect GLB assets to persistent world entities.

## Types
- player_structure
- npc_structure
- civilization_structure
- ruin_structure
- wonder_structure
- matrix_protected_structure

## Examples
- house
- gate
- wall
- watch tower
- workshop
- temple
- shadow register portal
```

---

DATEI
WORLD_EVENT_LAYER.md

PFAD
/docs/WORLD_EVENT_LAYER.md

INHALT
```
# World Event Layer

Die Welt besitzt geplante und emergente Ereignisse.

## Beispiele
- Dürre
- Monstermigration
- Kriegsausbruch
- Ernteboom
- Ruinenfund
- religiöse Wallfahrt

Events greifen auf Brain, Economy, Politics und History zu.
```

---

DATEI
WORLD_GENERATION.md

PFAD
/docs/WORLD_GENERATION.md

INHALT
```
# World Generation

Die Welt wird aus `seed + coordinates` erzeugt.

## Chunkstruktur
Jeder Chunk enthält:
- Terrain
- Biomtyp
- Ressourcen
- Objektliste
- Strukturen
- Ruinen oder Dungeon-Eingänge

## Simulationsebenen
1. Dormant
2. Background simulation
3. Active simulation
4. Full simulation

Nur beobachtete Regionen werden hochauflösend simuliert.
```

---

DATEI
DO_NOT_SIMPLIFY.md

PFAD
/final-lock/DO_NOT_SIMPLIFY.md

INHALT
```
# Do Not Simplify

Nicht reduzieren auf:
- Demo
- UI-Mockup
- Singleplayer-Sandbox
- nur Terrain-Viewer
- nur Client ohne Weltsimulation
```

---

DATEI
FINAL_TRUTH.md

PFAD
/final-lock/FINAL_TRUTH.md

INHALT
```
# Final Truth

Dieses Projekt ist ein persistentes MMORPG und darf nicht auf ein Mockup oder eine Einzelspieler-Demo reduziert werden.

Pflicht:
- 64x64 chunks
- observer simulation
- server-authoritative logic
- NPC memory + genealogy
- player and NPC politics
- matrix energy
- 13-node brain
- GM editor
- GLB pipeline
```

---

DATEI
REQUIRED_SYSTEMS_MATRIX.md

PFAD
/final-lock/REQUIRED_SYSTEMS_MATRIX.md

INHALT
```
# Required Systems Matrix

## Welt
observer, chunks, terrain, biomes, tick, dungeons, ruins

## NPC
personality, memory, shared memory, genealogy, dna, dialogue

## Gesellschaft
civilization, politics, government, tax, war, diplomacy

## Gameplay
player, skills, inventory, combat, loot, magic

## Spezial
oracle, dudenregister, matrix energy, brain, gm editor, glb pipeline
```

---

DATEI
biome-definitions.json

PFAD
/game-data/biomes/biome-definitions.json

INHALT
```
{
  "forest": {
    "temperature": "mild",
    "resources": [
      "wood",
      "berries",
      "animals"
    ]
  },
  "desert": {
    "temperature": "hot",
    "resources": [
      "sand",
      "salt",
      "crystals"
    ]
  },
  "mountain": {
    "temperature": "cold",
    "resources": [
      "stone",
      "iron",
      "gold"
    ]
  }
}
```

---

DATEI
recipes.json

PFAD
/game-data/crafting/recipes.json

INHALT
```
{
  "iron_sword": {
    "inputs": [
      {
        "id": "iron_ingot",
        "amount": 2
      },
      {
        "id": "wood_handle",
        "amount": 1
      }
    ],
    "output": {
      "id": "iron_sword",
      "amount": 1
    },
    "skill": "smithing"
  }
}
```

---

DATEI
cultures.json

PFAD
/game-data/cultures/cultures.json

INHALT
```
{
  "forest_tribes": {
    "style": "organic"
  },
  "mountain_clans": {
    "style": "stone"
  },
  "desert_nomads": {
    "style": "lightweight"
  }
}
```

---

DATEI
matrix-energy-rules.json

PFAD
/game-data/economy/matrix-energy-rules.json

INHALT
```
{
  "currency": "matrix_energy",
  "npcCannotDestroyProtectedStructures": true
}
```

---

DATEI
world-events.json

PFAD
/game-data/events/world-events.json

INHALT
```
{
  "drought": {
    "category": "climate"
  },
  "war_outbreak": {
    "category": "politics"
  },
  "ruin_discovery": {
    "category": "exploration"
  },
  "migration_wave": {
    "category": "population"
  }
}
```

---

DATEI
dudenregister-schema.json

PFAD
/game-data/history/dudenregister-schema.json

INHALT
```
{
  "events": [
    "war",
    "collapse",
    "ruin",
    "wonder",
    "dynasty",
    "oracle"
  ]
}
```

---

DATEI
loot-tables.json

PFAD
/game-data/items/loot-tables.json

INHALT
```
{
  "wolf": [
    "wolf_pelt",
    "fang",
    "alpha_claw"
  ],
  "skeleton": [
    "bone_fragment",
    "rusted_blade",
    "grave_ring"
  ],
  "ruin_cache": [
    "ancient_coin",
    "relic_fragment",
    "forgotten_sigil"
  ]
}
```

---

DATEI
spell-schools.json

PFAD
/game-data/magic/spell-schools.json

INHALT
```
{
  "nature": [
    "root_bind",
    "healing_moss"
  ],
  "shadow": [
    "dark_bolt",
    "fear_whisper"
  ],
  "resonance": [
    "echo_wave",
    "field_tone"
  ],
  "protection": [
    "ward_shield",
    "holy_barrier"
  ],
  "ritual": [
    "ancestral_call",
    "portal_trace"
  ]
}
```

---

DATEI
npc-archetypes.json

PFAD
/game-data/npc/npc-archetypes.json

INHALT
```
{
  "merchant": {},
  "guard": {},
  "oracle": {},
  "gossip": {
    "example": "Uschi die Geschminkte"
  }
}
```

---

DATEI
government-types.json

PFAD
/game-data/politics/government-types.json

INHALT
```
{
  "monarchy": {},
  "council": {},
  "theocracy": {},
  "trade_republic": {},
  "warband": {}
}
```

---

DATEI
quest-registry.json

PFAD
/game-data/quests/quest-registry.json

INHALT
```
{
  "ruin_hunter": {
    "giver": "uschi_gossip",
    "objective": "find_ruins"
  },
  "watchtower_supply": {
    "giver": "city_guard",
    "objective": "deliver_supplies"
  }
}
```

---

DATEI
religions.json

PFAD
/game-data/religions/religions.json

INHALT
```
{
  "sun_order": {
    "ethos": "honor"
  },
  "shadow_cult": {
    "ethos": "secrecy"
  },
  "ancestor_faith": {
    "ethos": "lineage"
  }
}
```

---

DATEI
skills.json

PFAD
/game-data/skills/skills.json

INHALT
```
{
  "combat": {},
  "woodcutting": {},
  "mining": {},
  "smithing": {},
  "magic": {},
  "fishing": {}
}
```

---

DATEI
tree-growth-rules.json

PFAD
/game-data/vegetation/tree-growth-rules.json

INHALT
```
{
  "oak": [
    "young",
    "spring",
    "summer",
    "autumn"
  ],
  "pine": [
    "young",
    "summer",
    "winter"
  ]
}
```

---

DATEI
README_INTEGRATIONS.md

PFAD
/integrations/README_INTEGRATIONS.md

INHALT
```
# Integrations

Hier werden produktive Integrationen abgelegt:
- Firebase
- AWS
- WebSocket Gateway
- Datenbankadapter

Wichtig: Keine Secrets hart in Dateien schreiben.
```

---

DATEI
elasticacheAdapter.ts

PFAD
/integrations/aws/elasticacheAdapter.ts

INHALT
```
export function initElastiCache() {
  return {
    status: "elasticache-adapter-placeholder"
  };
}
```

---

DATEI
postgresAdapter.ts

PFAD
/integrations/aws/postgresAdapter.ts

INHALT
```
export function initPostgres() {
  return {
    status: "postgres-adapter-placeholder"
  };
}
```

---

DATEI
firebase-config.ts

PFAD
/integrations/firebase/firebase-config.ts

INHALT
```
export const firebaseConfig = {
  note: "Fill with real Firebase credentials during deployment"
};
```

---

DATEI
firestorePersistence.ts

PFAD
/integrations/firebase/firestorePersistence.ts

INHALT
```
export function initFirestorePersistence() {
  return {
    status: "firestore-persistence-placeholder"
  };
}
```

---

DATEI
awsGatewayBridge.ts

PFAD
/integrations/websocket-gateway/awsGatewayBridge.ts

INHALT
```
export function initAwsGatewayBridge() {
  return {
    status: "aws-websocket-gateway-placeholder"
  };
}
```

---

DATEI
package.json

PFAD
/server/package.json

INHALT
```
{
  "name": "areloria-server",
  "version": "0.2.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "@types/ws": "^8.5.12",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

---

DATEI
ServerBootstrap.ts

PFAD
/server/src/core/ServerBootstrap.ts

INHALT
```
import express from "express";
import { createServer } from "node:http";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { WorldTick } from "./WorldTick.js";

export class ServerBootstrap {
  start() {
    const app = express();
    const httpServer = createServer(app);

    app.get("/health", (_req, res) => {
      res.json({
        ok: true,
        project: "ARELORIAN MMORPG",
        version: "0.2.0"
      });
    });

    const ws = new GameWebSocketServer(httpServer);
    ws.start();

    const tick = new WorldTick();
    const port = Number(process.env.PORT || 3000);

    httpServer.listen(port, () => {
      console.log(`Arelorian server listening on ${port}`);
      tick.start();
    });
  }
}
```

---

DATEI
WorldTick.ts

PFAD
/server/src/core/WorldTick.ts

INHALT
```
export class WorldTick {
  private timer: NodeJS.Timeout | null = null;
  private tickCount = 0;

  start() {
    this.timer = setInterval(() => this.tick(), 100);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  tick() {
    this.tickCount += 1;
    if (this.tickCount % 10 === 0) {
      console.log("World Tick", this.tickCount);
    }
  }
}
```

---

DATEI
index.ts

PFAD
/server/src/index.ts

INHALT
```
import { ServerBootstrap } from "./core/ServerBootstrap.js";

new ServerBootstrap().start();
```

---

DATEI
AdminMountRegistry.ts

PFAD
/server/src/modules/admin/AdminMountRegistry.ts

INHALT
```
export const AdminMountRegistry = {
  gm_giraffe: {
    id: "gm_giraffe",
    title: "Gaffende Giraffe",
    abilities: ["fly", "teleport", "world_edit_mode"]
  }
};
```

---

DATEI
GiraffeAdminMount.ts

PFAD
/server/src/modules/admin/GiraffeAdminMount.ts

INHALT
```
export class GiraffeAdminMount {
  activateEditorMode() {
    return {
      mount: "gm_giraffe",
      mode: "world_edit_mode",
      active: true
    };
  }
}
```

---

DATEI
BehaviorTree.ts

PFAD
/server/src/modules/ai/BehaviorTree.ts

INHALT
```
export class BehaviorTree {
  run(npc: any) {
    if (npc.needs?.sleep) return "sleep";
    if (npc.needs?.hunger) return "eat";
    if (npc.job) return "work";
    return "wander";
  }
}
```

---

DATEI
NPCBrain.ts

PFAD
/server/src/modules/ai/NPCBrain.ts

INHALT
```
import { BehaviorTree } from "./BehaviorTree.js";

export class NPCBrain {
  private tree = new BehaviorTree();

  update(npc: any) {
    const action = this.tree.run(npc);
    npc.currentAction = action;
    return action;
  }
}
```

---

DATEI
NPCSchedules.ts

PFAD
/server/src/modules/ai/NPCSchedules.ts

INHALT
```
export const NPCSchedules = {
  merchant: [
    { hour: 6, action: "wake" },
    { hour: 8, action: "open_shop" },
    { hour: 18, action: "close_shop" },
    { hour: 22, action: "sleep" }
  ],
  guard: [
    { hour: 6, action: "patrol" },
    { hour: 12, action: "gate_duty" },
    { hour: 20, action: "tavern" },
    { hour: 23, action: "sleep" }
  ],
  uschi_gossip: [
    { hour: 10, action: "market_gossip" },
    { hour: 14, action: "rumor_trade" },
    { hour: 19, action: "tavern" },
    { hour: 23, action: "vanish_into_city" }
  ]
};
```

---

DATEI
TaskSystem.ts

PFAD
/server/src/modules/ai/TaskSystem.ts

INHALT
```
export class TaskSystem {
  execute(npc: any, action: string) {
    switch (action) {
      case "wander":
        return { action, destination: "random_nearby" };
      case "work":
        return { action, destination: npc.jobLocation ?? "workplace" };
      case "eat":
        return { action, destination: "tavern" };
      case "sleep":
        return { action, destination: "home" };
      default:
        return { action: "idle" };
    }
  }
}
```

---

DATEI
AssetRegistry.ts

PFAD
/server/src/modules/asset-registry/AssetRegistry.ts

INHALT
```
export class AssetRegistry {
  private assets = new Map<string, any>();

  register(id: string, data: any) {
    this.assets.set(id, data);
  }

  get(id: string) {
    return this.assets.get(id) ?? null;
  }

  list() {
    return Array.from(this.assets.entries()).map(([id, data]) => ({ id, ...data }));
  }
}
```

---

DATEI
NPCAssets.ts

PFAD
/server/src/modules/asset-registry/NPCAssets.ts

INHALT
```
export const NPCAssets = {
  uschi_gossip: {
    assetId: "uschi_gossip",
    model: "/assets/models/characters/uschi_gossip.glb",
    category: "npc",
    animations: ["idle", "talk", "laugh", "cough"]
  },
  warrior_male: {
    assetId: "warrior_male",
    model: "/assets/models/characters/warrior_male.glb",
    category: "player_or_npc",
    animations: ["idle", "walk", "attack"]
  },
  warrior_female: {
    assetId: "warrior_female",
    model: "/assets/models/characters/warrior_female.glb",
    category: "player_or_npc",
    animations: ["idle", "walk", "attack"]
  }
};
```

---

DATEI
StructureAssets.ts

PFAD
/server/src/modules/asset-registry/StructureAssets.ts

INHALT
```
export const StructureAssets = {
  castle_wall: {
    assetId: "castle_wall",
    type: "structure",
    model: "/assets/models/buildings/castle_wall.glb",
    collision: true
  },
  castle_gate: {
    assetId: "castle_gate",
    type: "interactive_structure",
    model: "/assets/models/buildings/castle_gate.glb",
    collision: true,
    states: ["open", "closed", "locked", "damaged", "destroyed"]
  },
  castle_watch_tower: {
    assetId: "castle_watch_tower",
    type: "defense_structure",
    model: "/assets/models/buildings/castle_watch_tower.glb",
    collision: true
  }
};
```

---

DATEI
VegetationAssets.ts

PFAD
/server/src/modules/asset-registry/VegetationAssets.ts

INHALT
```
export const VegetationAssets = {
  tree_oak_young: { model: "/assets/models/vegetation/tree_oak_young.glb", category: "vegetation", growthStage: 0 },
  tree_oak_spring: { model: "/assets/models/vegetation/tree_oak_spring.glb", category: "vegetation", growthStage: 1 },
  tree_oak_summer: { model: "/assets/models/vegetation/tree_oak_summer.glb", category: "vegetation", growthStage: 2 },
  tree_oak_autumn: { model: "/assets/models/vegetation/tree_oak_autumn.glb", category: "vegetation", growthStage: 3 }
};
```

---

DATEI
BrainFieldAnalyzer.ts

PFAD
/server/src/modules/brain/BrainFieldAnalyzer.ts

INHALT
```
export class BrainFieldAnalyzer {
  analyzeField(values: unknown[]) {
    return {
      activeNodes: values.length,
      result: "field-analysis-placeholder"
    };
  }
}
```

---

DATEI
HeuristicWorldBrain.ts

PFAD
/server/src/modules/brain/HeuristicWorldBrain.ts

INHALT
```
export class HeuristicWorldBrain {
  private readonly nodes = new Array(13).fill(null);

  analyze(input: unknown) {
    return {
      nodes: this.nodes.length,
      summary: "analysis-placeholder",
      input
    };
  }
}
```

---

DATEI
CivilizationEngine.ts

PFAD
/server/src/modules/civilization/CivilizationEngine.ts

INHALT
```
export class CivilizationEngine {
  createVillage(guildMembers: number) {
    if (guildMembers < 50) return null;
    return {
      type: "village",
      population: guildMembers,
      createdAt: Date.now()
    };
  }
}
```

---

DATEI
SettlementSystem.ts

PFAD
/server/src/modules/civilization/SettlementSystem.ts

INHALT
```
export class SettlementSystem {
  createSettlement(type: "village" | "city" | "kingdom" | "nation", ownerId: string) {
    return {
      type,
      ownerId,
      createdAt: Date.now()
    };
  }
}
```

---

DATEI
CombatSystem.ts

PFAD
/server/src/modules/combat/CombatSystem.ts

INHALT
```
export class CombatSystem {
  attack(attacker: any, defender: any) {
    if (attacker.stamina <= 0) return { success: false, reason: "no_stamina" };

    attacker.stamina -= 10;

    const hitChance = this.hitChance(attacker, defender);
    if (Math.random() > hitChance) {
      return { success: true, hit: false, damage: 0 };
    }

    const damage = this.calculateDamage(attacker, defender);
    defender.health = Math.max(0, defender.health - damage);

    return {
      success: true,
      hit: true,
      damage,
      defenderHealth: defender.health
    };
  }

  hitChance(attacker: any, defender: any) {
    const atk = attacker.skills?.combat?.level ?? 1;
    const def = defender.skills?.combat?.level ?? 1;
    return Math.min(0.95, Math.max(0.1, atk / (atk + def)));
  }

  calculateDamage(attacker: any, defender: any) {
    const atk = attacker.skills?.combat?.level ?? 1;
    const def = defender.skills?.combat?.level ?? 1;
    const base = 5 + atk;
    const mitigation = Math.floor(def * 0.3);
    return Math.max(1, base - mitigation + Math.floor(Math.random() * 4));
  }
}
```

---

DATEI
CraftingSystem.ts

PFAD
/server/src/modules/crafting/CraftingSystem.ts

INHALT
```
export class CraftingSystem {
  craft(player: any, recipe: any) {
    const inventory = player.inventory ?? [];
    const hasAll = (recipe.inputs ?? []).every((input: any) =>
      inventory.some((item: any) => item.id === input.id && (item.amount ?? 1) >= input.amount)
    );

    if (!hasAll) {
      return { success: false, reason: "missing_materials" };
    }

    return {
      success: true,
      item: {
        id: recipe.output.id,
        amount: recipe.output.amount ?? 1
      }
    };
  }
}
```

---

DATEI
RecipeRegistry.ts

PFAD
/server/src/modules/crafting/RecipeRegistry.ts

INHALT
```
export const RecipeRegistry = {
  iron_sword: {
    id: "iron_sword",
    inputs: [
      { id: "iron_ingot", amount: 2 },
      { id: "wood_handle", amount: 1 }
    ],
    output: { id: "iron_sword", amount: 1 },
    skill: "smithing"
  }
};
```

---

DATEI
DialogueContext.ts

PFAD
/server/src/modules/dialogue/DialogueContext.ts

INHALT
```
export function buildDialogueContext(npc: any, player: any, world: any) {
  return {
    npcId: npc.id,
    playerId: player?.id ?? null,
    traits: npc.traits ?? {},
    lineage: npc.lineage ?? null,
    culture: npc.culture ?? null,
    religion: npc.religion ?? null,
    memory: npc.memory ?? [],
    worldEvents: world?.events ?? [],
    oracleSignals: world?.oracleSignals ?? []
  };
}
```

---

DATEI
DialogueEngine.ts

PFAD
/server/src/modules/dialogue/DialogueEngine.ts

INHALT
```
import { buildDialogueContext } from "./DialogueContext.js";
import { DialogueGenerator } from "./DialogueGenerator.js";

export class DialogueEngine {
  private generator = new DialogueGenerator();

  talk(npc: any, player: any, world: any) {
    const context = buildDialogueContext(npc, player, world);
    return this.generator.generate(context);
  }
}
```

---

DATEI
DialogueGenerator.ts

PFAD
/server/src/modules/dialogue/DialogueGenerator.ts

INHALT
```
import { DialogueTemplates } from "./DialogueTemplates.js";

export class DialogueGenerator {
  generate(context: any) {
    const mood = context.traits?.aggression > 0.7 ? "warning" : "greeting";
    const pool = DialogueTemplates[mood] ?? ["..."];
    return {
      line: pool[Math.floor(Math.random() * pool.length)],
      contextSummary: {
        culture: context.culture,
        religion: context.religion
      }
    };
  }
}
```

---

DATEI
DialogueTemplates.ts

PFAD
/server/src/modules/dialogue/DialogueTemplates.ts

INHALT
```
export const DialogueTemplates = {
  greeting: [
    "Na Süßer, suchst du Abenteuer?",
    "Du siehst aus, als hättest du Ärger im Gepäck.",
    "Setz dich, ich erzähl dir was Interessantes."
  ],
  rumor: [
    "Im Nordwald wurden alte Mauern gesehen.",
    "Die Händler reden von seltsamen Kreaturen im Moor.",
    "Ein Königreich im Osten ist nervös."
  ],
  warning: [
    "Geh da nicht unvorbereitet hinein.",
    "Manche Wege fressen ganze Blutlinien.",
    "Nicht jede Ruine will entdeckt werden."
  ]
};
```

---

DATEI
DungeonGenerator.ts

PFAD
/server/src/modules/dungeon/DungeonGenerator.ts

INHALT
```
export class DungeonGenerator {
  generate(seed: number) {
    const rooms = [];
    const roomCount = 4 + Math.floor(Math.abs(Math.sin(seed)) * 6);
    for (let i = 0; i < roomCount; i++) {
      rooms.push({
        id: i,
        type: this.randomRoom(seed + i),
        danger: 1 + (i % 5)
      });
    }
    return { seed, rooms };
  }

  randomRoom(seed: number) {
    const types = [
      "hall",
      "treasure_room",
      "monster_lair",
      "collapsed_passage",
      "ancient_shrine"
    ];
    return types[Math.abs(Math.floor(seed)) % types.length];
  }
}
```

---

DATEI
EconomyEngine.ts

PFAD
/server/src/modules/economy/EconomyEngine.ts

INHALT
```
export class EconomyEngine {
  private markets = new Map<string, { goods: Record<string, number> }>();

  registerMarket(id: string) {
    this.markets.set(id, { goods: {} });
  }

  trade(marketId: string, item: string, amount: number) {
    const market = this.markets.get(marketId);
    if (!market) return null;
    if (!market.goods[item]) market.goods[item] = 0;
    market.goods[item] += amount;
    return market.goods[item];
  }
}
```

---

DATEI
MarketExpansion.ts

PFAD
/server/src/modules/economy/MarketExpansion.ts

INHALT
```
export class MarketExpansion {
  calculateRegionalModifier(region: string) {
    if (region === "warzone") return 1.5;
    if (region === "trade_hub") return 0.9;
    return 1.0;
  }

  applyModifier(basePrice: number, modifier: number) {
    return Math.max(1, Math.round(basePrice * modifier));
  }
}
```

---

DATEI
MatrixEnergySystem.ts

PFAD
/server/src/modules/economy/MatrixEnergySystem.ts

INHALT
```
export class MatrixEnergySystem {
  private balances = new Map<string, number>();

  add(playerId: string, amount: number) {
    const current = this.balances.get(playerId) || 0;
    this.balances.set(playerId, current + amount);
  }

  consume(playerId: string, amount: number) {
    const current = this.balances.get(playerId) || 0;
    if (current < amount) return false;
    this.balances.set(playerId, current - amount);
    return true;
  }

  getBalance(playerId: string) {
    return this.balances.get(playerId) || 0;
  }
}
```

---

DATEI
TradeRoutes.ts

PFAD
/server/src/modules/economy/TradeRoutes.ts

INHALT
```
export class TradeRoutes {
  createRoute(a: string, b: string) {
    return {
      from: a,
      to: b,
      active: true
    };
  }
}
```

---

DATEI
WorldEventLayer.ts

PFAD
/server/src/modules/events/WorldEventLayer.ts

INHALT
```
export class WorldEventLayer {
  createEvent(type: string, region: string) {
    return {
      type,
      region,
      createdAt: Date.now(),
      active: true
    };
  }
}
```

---

DATEI
GMCommandLayer.ts

PFAD
/server/src/modules/gm/GMCommandLayer.ts

INHALT
```
export class GMCommandLayer {
  execute(command: string, args: string[] = []) {
    return {
      command,
      args,
      executedAt: Date.now(),
      status: "accepted"
    };
  }
}
```

---

DATEI
FarmingSystem.ts

PFAD
/server/src/modules/growth/FarmingSystem.ts

INHALT
```
export class FarmingSystem {
  plant(seedId: string, biome: string) {
    return {
      seedId,
      biome,
      plantedAt: Date.now(),
      growth: 0
    };
  }

  tick(crop: any) {
    crop.growth += 1;
    return crop;
  }
}
```

---

DATEI
TreeGrowthSystem.ts

PFAD
/server/src/modules/growth/TreeGrowthSystem.ts

INHALT
```
export class TreeGrowthSystem {
  grow(tree: any) {
    const stages = ["young", "spring", "summer", "autumn"];
    const index = stages.indexOf(tree.stage ?? "young");
    if (index < 0 || index >= stages.length - 1) return tree;
    tree.stage = stages[index + 1];
    return tree;
  }
}
```

---

DATEI
DudenregisterHistory.ts

PFAD
/server/src/modules/history/DudenregisterHistory.ts

INHALT
```
export class DudenregisterHistory {
  private history: any[] = [];

  record(event: any) {
    this.history.push(event);
  }

  getHistory() {
    return this.history;
  }
}
```

---

DATEI
WorldSnapshotSystem.ts

PFAD
/server/src/modules/history/WorldSnapshotSystem.ts

INHALT
```
export class WorldSnapshotSystem {
  private snapshots: any[] = [];

  save(worldState: any) {
    this.snapshots.push({
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(worldState))
    });
  }

  latest() {
    return this.snapshots[this.snapshots.length - 1] ?? null;
  }
}
```

---

DATEI
InventorySystem.ts

PFAD
/server/src/modules/inventory/InventorySystem.ts

INHALT
```
export class InventorySystem {
  addItem(player: any, item: any) {
    player.inventory.push(item);
    return player.inventory;
  }

  removeItem(player: any, itemId: string) {
    player.inventory = player.inventory.filter((item: any) => item.id !== itemId);
    return player.inventory;
  }
}
```

---

DATEI
AffixSystem.ts

PFAD
/server/src/modules/loot/AffixSystem.ts

INHALT
```
export class AffixSystem {
  rollAffixes(rarity: string) {
    const pool = [
      "plus_strength",
      "plus_health",
      "plus_attack_speed",
      "plus_mining",
      "plus_fire_resistance"
    ];

    const countMap: Record<string, number> = {
      common: 0,
      uncommon: 1,
      rare: 2,
      epic: 3,
      legendary: 4,
      mythic: 5
    };

    const count = countMap[rarity] ?? 0;
    return pool.slice(0, count);
  }
}
```

---

DATEI
ItemGenerator.ts

PFAD
/server/src/modules/loot/ItemGenerator.ts

INHALT
```
export class ItemGenerator {
  generate(baseId: string, rarity: string, affixes: string[] = []) {
    return {
      id: baseId,
      rarity,
      affixes,
      generatedAt: Date.now()
    };
  }
}
```

---

DATEI
LootTables.ts

PFAD
/server/src/modules/loot/LootTables.ts

INHALT
```
export const LootTables = {
  wolf: [
    { id: "wolf_pelt", chance: 0.65, rarity: "common" },
    { id: "fang", chance: 0.3, rarity: "common" },
    { id: "alpha_claw", chance: 0.05, rarity: "rare" }
  ],
  skeleton: [
    { id: "bone_fragment", chance: 0.7, rarity: "common" },
    { id: "rusted_blade", chance: 0.2, rarity: "uncommon" },
    { id: "grave_ring", chance: 0.03, rarity: "rare" }
  ],
  ruin_cache: [
    { id: "ancient_coin", chance: 0.5, rarity: "uncommon" },
    { id: "relic_fragment", chance: 0.2, rarity: "rare" },
    { id: "forgotten_sigil", chance: 0.02, rarity: "legendary" }
  ]
};
```

---

DATEI
MagicSystem.ts

PFAD
/server/src/modules/magic/MagicSystem.ts

INHALT
```
export class MagicSystem {
  cast(caster: any, spell: any, target: any) {
    if ((caster.mana ?? 0) < spell.cost) {
      return { success: false, reason: "not_enough_mana" };
    }

    caster.mana -= spell.cost;

    return {
      success: true,
      spell: spell.id,
      target: target?.id ?? null,
      effect: spell.effect ?? "generic_magic_effect"
    };
  }
}
```

---

DATEI
MonsterDNA.ts

PFAD
/server/src/modules/monster/MonsterDNA.ts

INHALT
```
export function generateMonsterDNA(species: string) {
  return {
    species,
    strength: Math.random(),
    speed: Math.random(),
    aggression: Math.random(),
    intelligence: Math.random(),
    resilience: Math.random()
  };
}
```

---

DATEI
MonsterMutation.ts

PFAD
/server/src/modules/monster/MonsterMutation.ts

INHALT
```
export function mutateMonster(dna: any, biome: string) {
  const clone = { ...dna, mutations: [] as string[] };

  if (biome === "snow") {
    clone.resilience += 0.2;
    clone.mutations.push("frost_resistance");
  }

  if (biome === "swamp") {
    clone.aggression += 0.15;
    clone.mutations.push("swamp_hunger");
  }

  if (Math.random() < 0.08) {
    clone.mutations.push("rare_variant");
  }

  return clone;
}
```

---

DATEI
MonsterSpawner.ts

PFAD
/server/src/modules/monster/MonsterSpawner.ts

INHALT
```
import { generateMonsterDNA } from "./MonsterDNA.js";
import { mutateMonster } from "./MonsterMutation.js";

export class MonsterSpawner {
  spawn(species: string, biome: string) {
    const dna = generateMonsterDNA(species);
    return mutateMonster(dna, biome);
  }
}
```

---

DATEI
NPCDialogueSystem.ts

PFAD
/server/src/modules/npc/NPCDialogueSystem.ts

INHALT
```
export class NPCDialogueSystem {
  talk(npc: any, worldSignals: any = {}) {
    const lines = npc.dialogueLines || [
      "Die Welt flüstert merkwürdige Dinge.",
      "Ich habe da ein Gerücht gehört."
    ];

    return {
      line: lines[Math.floor(Math.random() * lines.length)],
      signals: worldSignals
    };
  }
}
```

---

DATEI
NPCGenealogyEngine.ts

PFAD
/server/src/modules/npc/NPCGenealogyEngine.ts

INHALT
```
export class NPCGenealogyEngine {
  createLineage(id: string, house: string, parents: string[] = []) {
    return {
      id,
      house,
      parents,
      children: [] as string[]
    };
  }

  addChild(lineage: any, childId: string) {
    lineage.children.push(childId);
    return lineage;
  }
}
```

---

DATEI
NPCMemoryEngine.ts

PFAD
/server/src/modules/npc/NPCMemoryEngine.ts

INHALT
```
export class NPCMemoryEngine {
  private memory = new Map<string, any[]>();

  remember(npcId: string, event: any) {
    if (!this.memory.has(npcId)) this.memory.set(npcId, []);
    this.memory.get(npcId)!.push({
      timestamp: Date.now(),
      event
    });
  }

  recall(npcId: string) {
    return this.memory.get(npcId) || [];
  }
}
```

---

DATEI
NPCPersonalityEngine.ts

PFAD
/server/src/modules/npc/NPCPersonalityEngine.ts

INHALT
```
export class NPCPersonalityEngine {
  generateTraits() {
    return {
      courage: Math.random(),
      curiosity: Math.random(),
      greed: Math.random(),
      faith: Math.random(),
      aggression: Math.random()
    };
  }
}
```

---

DATEI
ObserverEngine.ts

PFAD
/server/src/modules/observer/ObserverEngine.ts

INHALT
```
export class ObserverEngine {
  private observers = new Map<string, { x: number; y: number }>();

  register(playerId: string, position: { x: number; y: number }) {
    this.observers.set(playerId, position);
  }

  unregister(playerId: string) {
    this.observers.delete(playerId);
  }

  getObservedChunks() {
    const result = [] as { chunkX: number; chunkY: number }[];
    for (const [, pos] of this.observers) {
      result.push({
        chunkX: Math.floor(pos.x / 64),
        chunkY: Math.floor(pos.y / 64)
      });
    }
    return result;
  }
}
```

---

DATEI
OracleEngine.ts

PFAD
/server/src/modules/oracle/OracleEngine.ts

INHALT
```
export class OracleEngine {
  generateVision() {
    const visions = [
      "Ich sehe Feuer im Norden.",
      "Unter alten Mauern liegt ein Geheimnis.",
      "Ein Königreich wird fallen."
    ];
    return visions[Math.floor(Math.random() * visions.length)];
  }
}
```

---

DATEI
CivilizationDatabase.ts

PFAD
/server/src/modules/persistence/CivilizationDatabase.ts

INHALT
```
export class CivilizationDatabase {
  private civilizations = new Map<string, any>();

  saveCivilization(civ: any) {
    this.civilizations.set(civ.id, civ);
  }

  loadCivilization(id: string) {
    return this.civilizations.get(id) ?? null;
  }
}
```

---

DATEI
PlayerDatabase.ts

PFAD
/server/src/modules/persistence/PlayerDatabase.ts

INHALT
```
export class PlayerDatabase {
  private players = new Map<string, any>();

  savePlayer(player: any) {
    this.players.set(player.id, player);
  }

  loadPlayer(id: string) {
    return this.players.get(id) ?? null;
  }
}
```

---

DATEI
WorldDatabase.ts

PFAD
/server/src/modules/persistence/WorldDatabase.ts

INHALT
```
export class WorldDatabase {
  private chunks = new Map<string, any>();

  saveChunk(chunk: any) {
    this.chunks.set(chunk.id, chunk);
  }

  loadChunk(id: string) {
    return this.chunks.get(id) ?? null;
  }
}
```

---

DATEI
PlayerSystem.ts

PFAD
/server/src/modules/player/PlayerSystem.ts

INHALT
```
export class PlayerSystem {
  createPlayer(id: string, name: string) {
    return {
      id,
      name,
      position: { x: 0, y: 0, z: 0 },
      health: 100,
      stamina: 100,
      mana: 25,
      skills: {},
      inventory: [],
      faction: null,
      civilization: null,
      matrixEnergy: 0
    };
  }
}
```

---

DATEI
GovernmentTypes.ts

PFAD
/server/src/modules/politics/GovernmentTypes.ts

INHALT
```
export const GovernmentTypes = {
  monarchy: { id: "monarchy", succession: "inheritance", stabilityBase: 0.7 },
  council: { id: "council", succession: "vote", stabilityBase: 0.6 },
  theocracy: { id: "theocracy", succession: "religious_selection", stabilityBase: 0.65 },
  trade_republic: { id: "trade_republic", succession: "merchant_vote", stabilityBase: 0.55 },
  warband: { id: "warband", succession: "strength", stabilityBase: 0.4 }
};
```

---

DATEI
WarEngine.ts

PFAD
/server/src/modules/politics/WarEngine.ts

INHALT
```
export class WarEngine {
  declareWar(attacker: any, defender: any) {
    return {
      type: "war_declared",
      attacker: attacker.id,
      defender: defender.id,
      timestamp: Date.now()
    };
  }
}
```

---

DATEI
QuestEngine.ts

PFAD
/server/src/modules/quest/QuestEngine.ts

INHALT
```
import { QuestRegistry } from "./QuestRegistry.js";

export class QuestEngine {
  private active = new Map<string, any[]>();

  startQuest(playerId: string, questId: keyof typeof QuestRegistry) {
    const quest = QuestRegistry[questId];
    if (!quest) return null;
    if (!this.active.has(playerId)) this.active.set(playerId, []);
    this.active.get(playerId)!.push({ ...quest, startedAt: Date.now(), completed: false });
    return quest;
  }

  listQuests(playerId: string) {
    return this.active.get(playerId) || [];
  }

  completeQuest(playerId: string, questId: string) {
    const quests = this.active.get(playerId) || [];
    const q = quests.find((x) => x.id === questId);
    if (!q) return null;
    q.completed = true;
    q.completedAt = Date.now();
    return q.reward;
  }
}
```

---

DATEI
QuestRegistry.ts

PFAD
/server/src/modules/quest/QuestRegistry.ts

INHALT
```
export const QuestRegistry = {
  ruin_hunter: {
    id: "ruin_hunter",
    name: "Die alten Mauern",
    giver: "uschi_gossip",
    objective: "find_ruins",
    reward: { gold: 100, item: "ancient_relic" }
  },
  watchtower_supply: {
    id: "watchtower_supply",
    name: "Die hungernden Wächter",
    giver: "city_guard",
    objective: "deliver_supplies",
    reward: { xp: 50, item: "guard_token" }
  }
};
```

---

DATEI
ReligionSystem.ts

PFAD
/server/src/modules/religion/ReligionSystem.ts

INHALT
```
export class ReligionSystem {
  private religions = new Map<string, any>();

  registerReligion(id: string, data: any) {
    this.religions.set(id, data);
  }

  getReligion(id: string) {
    return this.religions.get(id);
  }
}
```

---

DATEI
SkillSystem.ts

PFAD
/server/src/modules/skill/SkillSystem.ts

INHALT
```
export class SkillSystem {
  ensureSkill(player: any, skillName: string) {
    if (!player.skills[skillName]) {
      player.skills[skillName] = { level: 1, xp: 0 };
    }
  }

  addXP(player: any, skillName: string, amount: number) {
    this.ensureSkill(player, skillName);
    const skill = player.skills[skillName];
    skill.xp += amount;
    while (skill.xp >= this.nextLevelXP(skill.level)) {
      skill.level += 1;
    }
    return skill;
  }

  nextLevelXP(level: number) {
    return Math.floor(50 * Math.pow(level, 1.4));
  }
}
```

---

DATEI
GateController.ts

PFAD
/server/src/modules/structure/GateController.ts

INHALT
```
export class GateController {
  setState(gate: any, state: string) {
    const allowed = ["open", "closed", "locked", "damaged", "destroyed"];
    if (!allowed.includes(state)) throw new Error("Invalid gate state");
    gate.state = state;
    return gate;
  }

  canOpen(actor: any, gate: any) {
    if (gate.state === "destroyed") return false;
    if (gate.state === "locked" && !actor.permissions?.includes("gate_access")) return false;
    return true;
  }
}
```

---

DATEI
StructureEngine.ts

PFAD
/server/src/modules/structure/StructureEngine.ts

INHALT
```
export class StructureEngine {
  private structures = new Map<string, any>();

  createStructure(structure: any) {
    this.structures.set(structure.structureId, structure);
    return structure;
  }

  getStructure(id: string) {
    return this.structures.get(id) ?? null;
  }

  damageStructure(id: string, amount: number) {
    const structure = this.structures.get(id);
    if (!structure) return null;
    structure.hitpoints = Math.max(0, structure.hitpoints - amount);
    if (structure.hitpoints === 0) structure.destroyed = true;
    return structure;
  }
}
```

---

DATEI
BiomeGenerator.ts

PFAD
/server/src/modules/world/BiomeGenerator.ts

INHALT
```
export class BiomeGenerator {
  getBiome(_x: number, _y: number, height: number) {
    if (height > 0.7) return "mountain";
    if (height > 0.45) return "forest";
    if (height > 0.2) return "grassland";
    return "desert";
  }
}
```

---

DATEI
ChunkSystem.ts

PFAD
/server/src/modules/world/ChunkSystem.ts

INHALT
```
export class ChunkSystem {
  constructor(public readonly size: number = 64) {}

  getChunk(x: number, y: number) {
    return {
      id: `${x}:${y}`,
      x,
      y,
      size: this.size
    };
  }
}
```

---

DATEI
TerrainGenerator.ts

PFAD
/server/src/modules/world/TerrainGenerator.ts

INHALT
```
export class TerrainGenerator {
  getHeight(x: number, y: number) {
    return Math.sin(x * 0.1) + Math.cos(y * 0.1);
  }
}
```

---

DATEI
WorldEditorServer.ts

PFAD
/server/src/modules/world-editor/WorldEditorServer.ts

INHALT
```
export class WorldEditorServer {
  spawnEntity(type: string, position: { x: number; y: number; z: number }) {
    return { action: "spawn", type, position };
  }

  moveEntity(entityId: string, position: { x: number; y: number; z: number }) {
    return { action: "move", entityId, position };
  }

  deleteEntity(entityId: string) {
    return { action: "delete", entityId };
  }
}
```

---

DATEI
PacketRouter.ts

PFAD
/server/src/networking/PacketRouter.ts

INHALT
```
export class PacketRouter {
  route(packet: any) {
    return {
      handled: true,
      type: packet?.type ?? "unknown"
    };
  }
}
```

---

DATEI
PlayerSession.ts

PFAD
/server/src/networking/PlayerSession.ts

INHALT
```
export type PlayerSession = {
  id: string;
  name: string;
  connectedAt: number;
  position: { x: number; y: number; z: number };
};
```

---

DATEI
WebSocketServer.ts

PFAD
/server/src/networking/WebSocketServer.ts

INHALT
```
import type { Server as HttpServer } from "node:http";
import { WebSocketServer } from "ws";

export class GameWebSocketServer {
  private wss: WebSocketServer | null = null;

  constructor(private readonly httpServer: HttpServer) {}

  start() {
    this.wss = new WebSocketServer({ server: this.httpServer });

    this.wss.on("connection", (socket) => {
      socket.send(JSON.stringify({
        type: "welcome",
        message: "Arelorian connection established"
      }));

      socket.on("message", (msg) => {
        console.log("WS message:", msg.toString());
      });
    });
  }
}
```

---

DATEI
tsconfig.json

PFAD
/server/tsconfig.json

INHALT
```
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": [
    "src/**/*"
  ]
}
```

---

DATEI
README_ASSETS.md

PFAD
/world-assets/README_ASSETS.md

INHALT
```
# World Assets

Lege hier GLB-Assets ab:
- characters/
- monsters/
- buildings/
- props/
- vegetation/
- admin/

Beispiele:
- uschi_gossip.glb
- warrior_male.glb
- warrior_female.glb
- castle_gate.glb
- castle_watch_tower.glb
- tree_oak_spring.glb
- gm_giraffe.glb
```
```

---

DATEI
package.json

PFAD
/client/package.json

INHALT
```
{
  "name": "areloria-client",
  "version": "0.2.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "three": "^0.169.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^5.4.0"
  }
}
```

---

DATEI
index.html

PFAD
/client/public/index.html

INHALT
```
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
    <title>Arelorian Client</title>
  </head>
  <body>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

---

DATEI
AssetLoader.ts

PFAD
/client/src/assets/AssetLoader.ts

INHALT
```
export class AssetLoader {
  async load(path:string){
    return { path, status:"loaded_placeholder" };
  }
}
```

---

DATEI
GLBValidation.ts

PFAD
/client/src/assets/GLBValidation.ts

INHALT
```
export function validateGLBMeta(meta:any){
  return {
    ok: Boolean(meta?.assetId && meta?.path),
    missing: [
      !meta?.assetId ? "assetId" : null,
      !meta?.path ? "path" : null
    ].filter(Boolean)
  };
}
```

---

DATEI
ModelRegistry.ts

PFAD
/client/src/assets/ModelRegistry.ts

INHALT
```
export const ModelRegistry = {
  uschi: { path: "/assets/models/characters/uschi.glb", scale: 1 },
  gm_giraffe: { path: "/assets/models/admin/gm_giraffe.glb", scale: 1 },
  castle_gate: { path: "/assets/models/buildings/castle_gate.glb", scale: 1 }
};
```

---

DATEI
AmbiencePlayer.ts

PFAD
/client/src/audio/AmbiencePlayer.ts

INHALT
```
export class AmbiencePlayer {
  setZone(zone: string) {
    console.log("ambience zone", zone);
  }
}
```

---

DATEI
AudioBus.ts

PFAD
/client/src/audio/AudioBus.ts

INHALT
```
export class AudioBus {
  play(name: string) {
    console.log("play audio", name);
  }
}
```

---

DATEI
EditorHotkeys.ts

PFAD
/client/src/editor/EditorHotkeys.ts

INHALT
```
export const EditorHotkeys = {
  place: "KeyP",
  delete: "Delete",
  rotate: "KeyR",
  select: "KeyS"
};
```

---

DATEI
GMCommandConsole.ts

PFAD
/client/src/editor/GMCommandConsole.ts

INHALT
```
export class GMCommandConsole {
  run(command: string) {
    return {
      command,
      status: "queued"
    };
  }
}
```

---

DATEI
GMCommandPalette.ts

PFAD
/client/src/editor/GMCommandPalette.ts

INHALT
```
export class GMCommandPalette {
  open() {
    return "GM command palette open";
  }
}
```

---

DATEI
PlacementTool.ts

PFAD
/client/src/editor/PlacementTool.ts

INHALT
```
export class PlacementTool {
  place(type:string, position:{x:number;y:number;z:number}){
    return { type, position };
  }
}
```

---

DATEI
SelectionTool.ts

PFAD
/client/src/editor/SelectionTool.ts

INHALT
```
export class SelectionTool {
  select(id:string){
    return { selected:id };
  }
}
```

---

DATEI
TerrainBrush.ts

PFAD
/client/src/editor/TerrainBrush.ts

INHALT
```
export class TerrainBrush {
  paint(position: {x:number;y:number;z:number}, radius: number) {
    return { position, radius, action: "paint_terrain" };
  }
}
```

---

DATEI
TerrainBrushTool.ts

PFAD
/client/src/editor/TerrainBrushTool.ts

INHALT
```
export class TerrainBrushTool {
  apply(mode: "raise" | "lower" | "flatten", radius: number) {
    return { mode, radius };
  }
}
```

---

DATEI
WorldEditorUI.ts

PFAD
/client/src/editor/WorldEditorUI.ts

INHALT
```
export function renderWorldEditorUI(){
  const n = document.createElement("div");
  n.textContent = "World Editor";
  n.style.position = "fixed";
  n.style.left = "50%";
  n.style.top = "12px";
  n.style.transform = "translateX(-50%)";
  n.style.background = "rgba(30,30,30,0.85)";
  n.style.color = "#fff";
  n.style.padding = "8px 12px";
  document.body.appendChild(n);
}
```

---

DATEI
renderer.ts

PFAD
/client/src/engine/renderer.ts

INHALT
```
import * as THREE from "three";

export function initRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshBasicMaterial({ color: 0x44aa88 })
  );

  scene.add(cube);

  function animate() {
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();
}
```

---

DATEI
worldLoader.ts

PFAD
/client/src/engine/worldLoader.ts

INHALT
```
export function loadWorldChunk(chunkX: number, chunkY: number) {
  return {
    chunkX,
    chunkY,
    status: "requested"
  };
}
```

---

DATEI
combatSystem.ts

PFAD
/client/src/gameplay/combatSystem.ts

INHALT
```
export function clientCombatAction(type:string){
  return { type: "combat_action", action: type };
}
```

---

DATEI
farmingSystem.ts

PFAD
/client/src/gameplay/farmingSystem.ts

INHALT
```
export function plantSeed(seedId: string) {
  return {
    seedId,
    planted: true
  };
}
```

---

DATEI
inventoryState.ts

PFAD
/client/src/gameplay/inventoryState.ts

INHALT
```
export class InventoryState {
  items: any[] = [];
  set(items: any[]) { this.items = items; }
}
```

---

DATEI
playerController.ts

PFAD
/client/src/gameplay/playerController.ts

INHALT
```
export class PlayerController {
  move(direction: string) {
    return {
      type: "move",
      direction
    };
  }
}
```

---

DATEI
skillSystem.ts

PFAD
/client/src/gameplay/skillSystem.ts

INHALT
```
export function clientSkillAction(skill:string){
  return { type: "skill_action", skill };
}
```

---

DATEI
locale.ts

PFAD
/client/src/localization/locale.ts

INHALT
```
export const locale = {
  current: "de"
};
```

---

DATEI
main.ts

PFAD
/client/src/main.ts

INHALT
```
import { initRenderer } from "./engine/renderer";
import { connectSocket } from "./networking/websocketClient";
import { renderHUD } from "./ui/hud";

const canvas = document.createElement("canvas");
document.body.style.margin = "0";
document.body.appendChild(canvas);

initRenderer(canvas);
connectSocket();
renderHUD();
```

---

DATEI
reconnect.ts

PFAD
/client/src/networking/reconnect.ts

INHALT
```
export function reconnectSocket(factory: () => WebSocket) {
  return factory();
}
```

---

DATEI
websocketClient.ts

PFAD
/client/src/networking/websocketClient.ts

INHALT
```
export function connectSocket() {
  const ws = new WebSocket(`ws://${location.hostname}:3000`);

  ws.onopen = () => console.log("Connected to Arelorian server");
  ws.onmessage = (msg) => console.log("Server:", msg.data);

  return ws;
}
```

---

DATEI
auctionState.ts

PFAD
/client/src/state/auctionState.ts

INHALT
```
export const auctionState = {
  listings: [] as any[]
};
```

---

DATEI
inventoryState.ts

PFAD
/client/src/state/inventoryState.ts

INHALT
```
export const inventoryState = {
  items: [] as any[]
};
```

---

DATEI
mailState.ts

PFAD
/client/src/state/mailState.ts

INHALT
```
export const mailState = {
  inbox: [] as any[],
  outbox: [] as any[]
};
```

---

DATEI
notificationState.ts

PFAD
/client/src/state/notificationState.ts

INHALT
```
export const notificationState = {
  items: [] as any[]
};
```

---

DATEI
questState.ts

PFAD
/client/src/state/questState.ts

INHALT
```
export const questState = {
  active: [] as any[],
  completed: [] as any[]
};
```

---

DATEI
sessionState.ts

PFAD
/client/src/state/sessionState.ts

INHALT
```
export const sessionState = {
  connected: false,
  sessionId: null as string | null,
  reconnecting: false
};
```

---

DATEI
settingsState.ts

PFAD
/client/src/state/settingsState.ts

INHALT
```
export const settingsState = {
  music: true,
  sfx: true,
  locale: "de"
};
```

---

DATEI
socialState.ts

PFAD
/client/src/state/socialState.ts

INHALT
```
export const socialState = {
  guild: null as any,
  party: null as any,
  friends: [] as string[]
};
```

---

DATEI
adminAudit.ts

PFAD
/client/src/ui/adminAudit.ts

INHALT
```
export function renderAdminAudit() {
  console.log("Admin audit UI ready");
}
```

---

DATEI
adminMountPanel.ts

PFAD
/client/src/ui/adminMountPanel.ts

INHALT
```
export function renderAdminMountPanel() {
  const node = document.createElement("div");
  node.textContent = "Admin Mount";
  node.style.position = "fixed";
  node.style.right = "12px";
  node.style.top = "376px";
  node.style.background = "rgba(0,0,0,0.55)";
  node.style.color = "#fff";
  node.style.padding = "8px";
  document.body.appendChild(node);
}
```

---

DATEI
auctionPanel.ts

PFAD
/client/src/ui/auctionPanel.ts

INHALT
```
export function renderAuctionPanel() {
  const node = document.createElement("div");
  node.textContent = "Auction";
  node.style.position = "fixed";
  node.style.right = "12px";
  node.style.top = "220px";
  node.style.background = "rgba(0,0,0,0.55)";
  node.style.color = "#fff";
  node.style.padding = "8px";
  document.body.appendChild(node);
}
```

---

DATEI
audioPanel.ts

PFAD
/client/src/ui/audioPanel.ts

INHALT
```
export function renderAudioPanel() {
  const node = document.createElement("div");
  node.textContent = "Audio";
  node.style.position = "fixed";
  node.style.right = "12px";
  node.style.top = "168px";
  node.style.background = "rgba(0,0,0,0.55)";
  node.style.color = "#fff";
  node.style.padding = "8px";
  document.body.appendChild(node);
}
```

---

DATEI
chat.ts

PFAD
/client/src/ui/chat.ts

INHALT
```
export function renderChat(){
  const n = document.createElement("div");
  n.textContent = "Chat";
  n.style.position = "fixed";
  n.style.left = "12px";
  n.style.top = "56px";
  n.style.background = "rgba(0,0,0,0.55)";
  n.style.color = "#fff";
  n.style.padding = "8px";
  document.body.appendChild(n);
}
```

---

DATEI
chatPanel.ts

PFAD
/client/src/ui/chatPanel.ts

INHALT
```
export function renderChatPanel() {
  const node = document.createElement("div");
  node.textContent = "Chat";
  node.style.position = "fixed";
  node.style.left = "12px";
  node.style.bottom = "64px";
  node.style.background = "rgba(0,0,0,0.55)";
  node.style.color = "#fff";
  node.style.padding = "8px";
  document.body.appendChild(node);
}
```

---

DATEI
combatPanel.ts

PFAD
/client/src/ui/combatPanel.ts

INHALT
```
export function renderCombatPanel(){
  const node = document.createElement("div");
  node.textContent = "Combat Panel";
  node.style.position = "fixed";
  node.style.left = "12px";
  node.style.bottom = "12px";
  node.style.background = "rgba(0,0,0,0.55)";
  node.style.color = "#fff";
  node.style.padding = "8px";
  document.body.appendChild(node);
}
```

---

DATEI
crafting.ts

PFAD
/client/src/ui/crafting.ts

INHALT
```
export function renderCraftingUI() {
  const panel = document.createElement("div");
  panel.textContent = "Crafting UI placeholder";
  return panel;
}
```

---

DATEI
debugPanel.ts

PFAD
/client/src/ui/debugPanel.ts

INHALT
```
export function renderDebugPanel() {
  const node = document.createElement("div");
  node.textContent = "Debug";
  node.style.position = "fixed";
  node.style.left = "12px";
  node.style.bottom = "116px";
  node.style.background = "rgba(0,0,0,0.55)";
  node.style.color = "#fff";
  node.style.padding = "8px";
  document.body.appendChild(node);
}
```

---

DATEI
diplomacy.ts

PFAD
/client/src/ui/diplomacy.ts

INHALT
```
export function renderDiplomacyPanel() {
  console.log("Diplomacy panel ready");
}
```

---

DATEI
equipmentPanel.ts

PFAD
/client/src/ui/equipmentPanel.ts

INHALT
```
export function renderEquipmentPanel() {
  const node = document.createElement("div");
  node.textContent = "Equipment";
  node.style.position = "fixed";
  node.style.right = "12px";
  node.style.top = "64px";
  node.style.background = "rgba(0,0,0,0.55)";
  node.style.color = "#fff";
  node.style.padding = "8px";
  document.body.appendChild(node);
}
```

---

DATEI
guildPanel.ts

PFAD
/client/src/ui/guildPanel.ts

INHALT
```
export function renderGuildPanel() {
  const node = document.createElement("div");
  node.textContent = "Guild Panel";
  node.style.position = "fixed";
  node.style.right = "12px";
  node.style.top = "116px";
  node.style.background = "rgba(0,0,0,0.55)";
  node.style.color = "#fff";
  node.style.padding = "8px";
  document.body.appendChild(node);
}
```

---

DATEI
hud.ts

PFAD
/client/src/ui/hud.ts

INHALT
```
export function renderHUD() {
  const hud = document.createElement("div");
  hud.textContent = "Arelorian HUD online";
  hud.style.position = "fixed";
  hud.style.top = "12px";
  hud.style.left = "12px";
  hud.style.padding = "8px 12px";
  hud.style.background = "rgba(0,0,0,0.55)";
  hud.style.color = "#fff";
  hud.style.fontFamily = "sans-serif";
  document.body.appendChild(hud);
}
```

---

DATEI
inventory.ts

PFAD
/client/src/ui/inventory.ts

INHALT
```
export function renderInventory(){
  const n = document.createElement("div");
  n.textContent = "Inventory";
  n.style.position = "fixed";
  n.style.right = "12px";
  n.style.top = "56px";
  n.style.background = "rgba(0,0,0,0.55)";
  n.style.color = "#fff";
  n.style.padding = "8px";
  document.body.appendChild(n);
}
```

---

DATEI
loginPanel.ts

PFAD
/client/src/ui/loginPanel.ts

INHALT
```
export function renderLoginPanel() {
  const node = document.createElement("div");
  node.textContent = "Login";
  node.style.position = "fixed";
  node.style.left = "12px";
  node.style.top = "324px";
  node.style.background = "rgba(0,0,0,0.55)";
  node.style.color = "#fff";
  node.style.padding = "8px";
  document.body.appendChild(node);
}
```

---

DATEI
mailPanel.ts

PFAD
/client/src/ui/mailPanel.ts

INHALT
```
export function renderMailPanel() {
  const node = document.createElement("div");
  node.textContent = "Mail";
  node.style.position = "fixed";
  node.style.left = "12px";
  node.style.top = "220px";
  node.style.background = "rgba(0,0,0,0.55)";
  node.style.color = "#fff";
  node.style.padding = "8px";
  document.body.appendChild(node);
}
```

---

DATEI
mapPanel.ts

PFAD
/client/src/ui/mapPanel.ts

INHALT
```
export function renderMapPanel() {
  const node = document.createElement("div");
  node.textContent = "Map panel placeholder";
  node.style.position = "fixed";
  node.style.right = "12px";
  node.style.bottom = "12px";
  node.style.padding = "8px";
  node.style.background = "rgba(0,0,0,0.5)";
  node.style.color = "#fff";
  document.body.appendChild(node);
}
```

---

DATEI
market.ts

PFAD
/client/src/ui/market.ts

INHALT
```
export function renderMarketUI() {
  const panel = document.createElement("div");
  panel.textContent = "Market UI placeholder";
  return panel;
}
```

---

DATEI
minimap.ts

PFAD
/client/src/ui/minimap.ts

INHALT
```
export function renderMinimap(){
  const node = document.createElement("div");
  node.textContent = "Minimap";
  node.style.position = "fixed";
  node.style.right = "12px";
  node.style.top = "12px";
  node.style.background = "rgba(0,0,0,0.55)";
  node.style.color = "#fff";
  node.style.padding = "8px";
  document.body.appendChild(node);
}
```

---

DATEI
mountPanel.ts

PFAD
/client/src/ui/mountPanel.ts

INHALT
```
export function renderMountPanel() {
  const node = document.createElement("div");
  node.textContent = "Mount Panel";
  node.style.position = "fixed";
  node.style.right = "12px";
  node.style.bottom = "64px";
  node.style.background = "rgba(0,0,0,0.55)";
  node.style.color = "#fff";
  node.style.padding = "8px";
  document.body.appendChild(node);
}
```

---

DATEI
notifications.ts

PFAD
/client/src/ui/notifications.ts

INHALT
```
export function renderNotifications() {
  const node = document.createElement("div");
  node.textContent = "Notifications";
  node.style.position = "fixed";
  node.style.right = "12px";
  node.style.top = "272px";
  node.style.background = "rgba(0,0,0,0.55)";
  node.style.color = "#fff";
  node.style.padding = "8px";
  document.body.appendChild(node);
}
```

---

DATEI
oraclePanel.ts

PFAD
/client/src/ui/oraclePanel.ts

INHALT
```
export function renderOraclePanel() {
  const node = document.createElement("div");
  node.textContent = "Oracle";
  node.style.position = "fixed";
  node.style.left = "12px";
  node.style.top = "376px";
  node.style.background = "rgba(0,0,0,0.55)";
  node.style.color = "#fff";
  node.style.padding = "8px";
  document.body.appendChild(node);
}
```

---

DATEI
partyPanel.ts

PFAD
/client/src/ui/partyPanel.ts

INHALT
```
export function renderPartyPanel() {
  const node = document.createElement("div");
  node.textContent = "Party Panel";
  node.style.position = "fixed";
  node.style.left = "12px";
  node.style.top = "116px";
  node.style.background = "rgba(0,0,0,0.55)";
  node.style.color = "#fff";
  node.style.padding = "8px";
  document.body.appendChild(node);
}
```

---

DATEI
questLog.ts

PFAD
/client/src/ui/questLog.ts

INHALT
```
export function renderQuestLog() {
  const node = document.createElement("div");
  node.textContent = "Quest Log";
  node.style.position = "fixed";
  node.style.left = "12px";
  node.style.top = "64px";
  node.style.background = "rgba(0,0,0,0.55)";
  node.style.color = "#fff";
  node.style.padding = "8px";
  document.body.appendChild(node);
}
```

---

DATEI
releaseBanner.ts

PFAD
/client/src/ui/releaseBanner.ts

INHALT
```
export function renderReleaseBanner() {
  const node = document.createElement("div");
  node.textContent = "Areloria Working Build";
  node.style.position = "fixed";
  node.style.top = "0";
  node.style.left = "50%";
  node.style.transform = "translateX(-50%)";
  node.style.background = "#222";
  node.style.color = "#fff";
  node.style.padding = "6px 12px";
  document.body.appendChild(node);
}
```

---

DATEI
reputation.ts

PFAD
/client/src/ui/reputation.ts

INHALT
```
export function renderReputation(value: number) {
  console.log("Reputation:", value);
}
```

---

DATEI
reputationPanel.ts

PFAD
/client/src/ui/reputationPanel.ts

INHALT
```
export function renderReputationPanel() {
  const node = document.createElement("div");
  node.textContent = "Reputation";
  node.style.position = "fixed";
  node.style.left = "12px";
  node.style.top = "168px";
  node.style.background = "rgba(0,0,0,0.55)";
  node.style.color = "#fff";
  node.style.padding = "8px";
  document.body.appendChild(node);
}
```

---

DATEI
routeOverlay.ts

PFAD
/client/src/ui/routeOverlay.ts

INHALT
```
export function renderRouteOverlay() {
  const node = document.createElement("div");
  node.textContent = "Route Overlay";
  node.style.position = "fixed";
  node.style.right = "12px";
  node.style.bottom = "116px";
  node.style.background = "rgba(0,0,0,0.55)";
  node.style.color = "#fff";
  node.style.padding = "8px";
  document.body.appendChild(node);
}
```

---

DATEI
settingsPanel.ts

PFAD
/client/src/ui/settingsPanel.ts

INHALT
```
export function renderSettingsPanel() {
  const node = document.createElement("div");
  node.textContent = "Settings";
  node.style.position = "fixed";
  node.style.right = "12px";
  node.style.top = "324px";
  node.style.background = "rgba(0,0,0,0.55)";
  node.style.color = "#fff";
  node.style.padding = "8px";
  document.body.appendChild(node);
}
```

---

DATEI
skillsPanel.ts

PFAD
/client/src/ui/skillsPanel.ts

INHALT
```
export function renderSkillsPanel(){
  const node = document.createElement("div");
  node.textContent = "Skills Panel";
  node.style.position = "fixed";
  node.style.right = "12px";
  node.style.bottom = "12px";
  node.style.background = "rgba(0,0,0,0.55)";
  node.style.color = "#fff";
  node.style.padding = "8px";
  document.body.appendChild(node);
}
```

---

DATEI
titlePanel.ts

PFAD
/client/src/ui/titlePanel.ts

INHALT
```
export function renderTitlePanel() {
  const node = document.createElement("div");
  node.textContent = "Titles";
  node.style.position = "fixed";
  node.style.left = "12px";
  node.style.top = "272px";
  node.style.background = "rgba(0,0,0,0.55)";
  node.style.color = "#fff";
  node.style.padding = "8px";
  document.body.appendChild(node);
}
```

---

DATEI
weatherOverlay.ts

PFAD
/client/src/ui/weatherOverlay.ts

INHALT
```
export function renderWeatherOverlay(label = "Clear") {
  const node = document.createElement("div");
  node.textContent = `Weather: ${label}`;
  node.style.position = "fixed";
  node.style.top = "12px";
  node.style.left = "160px";
  node.style.background = "rgba(0,0,0,0.55)";
  node.style.color = "#fff";
  node.style.padding = "8px";
  document.body.appendChild(node);
}
```

---

DATEI
tsconfig.json

PFAD
/client/tsconfig.json

INHALT
```
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true
  },
  "include": [
    "src/**/*"
  ]
}
```

---

DATEI
ACHIEVEMENTS_AND_PROGRESSION.md

PFAD
/docs/ACHIEVEMENTS_AND_PROGRESSION.md

INHALT
```
# Achievements and Progression

Erfolge dienen als Langzeitmotivation und als sichtbare Spur der Geschichte eines Spielers.

## Kategorien
- Kampf
- Erkundung
- Handwerk
- Handel
- Politik
- Weltwunder
- Ruinen / Dungeons

## Eigenschaften
- accountweit oder charakterspezifisch
- optionale Titel
- optionale kosmetische Belohnungen
```

---

DATEI
ADMIN_AUDIT_AND_ROLLBACK.md

PFAD
/docs/ADMIN_AUDIT_AND_ROLLBACK.md

INHALT
```
# Admin Audit and Rollback

Der GM-Editor braucht Prüfpfade:
- Wer hat was gesetzt?
- Wann wurde etwas verschoben?
- Welche Region wurde geändert?
- Welcher Snapshot eignet sich für Rollback?
```

---

DATEI
ADMIN_MOUNT_AND_GM_MODE.md

PFAD
/docs/ADMIN_MOUNT_AND_GM_MODE.md

INHALT
```
# Admin Mount and GM Mode

The GM mount can mark administrative authority in-world.

## Example
- gaffende giraffe
- observer monkeys
- editor mode unlock

## Editor Features
- teleport
- spawn entities
- terrain marking
- audit logging
```

---

DATEI
ADMIN_MOUNT_SYSTEM.md

PFAD
/docs/ADMIN_MOUNT_SYSTEM.md

INHALT
```
# Admin Mount System

Admins und GMs können besondere Mounts erhalten, z.B. die gaffende Giraffe.

## Zweck
- sichtbare GM-Präsenz
- World-Editor-Kontext
- humorvolles Prestige-Element

## Geplante Fähigkeiten
- teleport
- fly
- world_edit_mode
- spawn_shortcuts
```

---

DATEI
AFFIX_AND_ITEM_GENERATION.md

PFAD
/docs/AFFIX_AND_ITEM_GENERATION.md

INHALT
```
# Affix and Item Generation

Items bestehen aus:
- Base Item
- Rarity
- Affix Set
- Item Power

## Rarity
common, uncommon, rare, epic, legendary, mythic

## Beispiel-Affixe
- +Strength
- +Attack Speed
- +Health
- +Mining Skill
- +Fire Resistance
```

---

DATEI
API_ADMIN_AND_CHAT.md

PFAD
/docs/API_ADMIN_AND_CHAT.md

INHALT
```
# API Admin and Chat

Diese Routen erweitern die Serveroberfläche um GM-Steuerung, Chat und Orakelzugriff.

## Bereiche
- chat
- admin
- oracle
- auth

## Grundregel
Alle privilegierten Routen prüfen Rollen und Berechtigungen serverseitig.
```

---

DATEI
API_SURFACE.md

PFAD
/docs/API_SURFACE.md

INHALT
```
# API Surface

Server-API dient als Verwaltungs- und Statusschicht.

## Basisrouten
- /health
- /api/player
- /api/world
- /api/editor
- /api/gm
- /api/history
- /api/oracle
```

---

DATEI
ASSET_IMPORT_GUIDE.md

PFAD
/docs/ASSET_IMPORT_GUIDE.md

INHALT
```
# Asset Import Guide

## Empfohlen
- GLB für NPCs, Monster, Props, Gebäude und Reittiere
- klare assetId
- sauberer Pivot
- sinnvolle Skalierung
- optionale Rigs/Animationen

## Nicht empfohlen
- Terrain als riesiger GLB-Teppich
```

---

DATEI
ASSET_PIPELINE.md

PFAD
/docs/ASSET_PIPELINE.md

INHALT
```
# Asset Pipeline

## GLB-Regeln
Terrain ist kein GLB-Bodenteppich. GLB wird für NPCs, Monster, Gebäude, Bäume, Props und Reittiere verwendet.

## Struktur
- characters/
- monsters/
- buildings/
- props/
- vegetation/
- admin/

## Validierung
Jedes Asset sollte idealerweise besitzen:
- sauberen Ursprungspunkt
- sinnvolle Skalierung
- optionales Rig/Skeleton
- optional Animationen
```

---

DATEI
AUDIO_AND_AMBIENCE.md

PFAD
/docs/AUDIO_AND_AMBIENCE.md

INHALT
```
# Audio and Ambience

Die Audiostruktur unterstützt:
- Musikzonen
- Umgebungsgeräusche
- Wettergeräusche
- UI-Sounds
- NPC-Sprachmarker

Audio ist clientseitig, Trigger kommen aus Weltzustand und UI.
```

---

DATEI
BRAIN_SYSTEM.md

PFAD
/docs/BRAIN_SYSTEM.md

INHALT
```
# Brain System

Das Server Brain ist eine heuristische Meta-Schicht.

## Aufgaben
- Spannungen erkennen
- Politiksignale lesen
- Marktanomalien erkennen
- Orakelvisionen speisen
- Ereignisse anstoßen

## 13-Punkte-Modell
- 4 Weltpunkte
- 4 Interpretationspunkte
- 4 Dynamikpunkte
- 1 Zentrum

Das Zentrum aggregiert Weltzustand, NPC-Memory, Ökonomie, Politik und Geschichte.
```

---

DATEI
BUILD_SEQUENCE_MASTER.md

PFAD
/docs/BUILD_SEQUENCE_MASTER.md

INHALT
```
# Build Sequence Master

1. Server core und bootstrap
2. World tick
3. Chunk- und Observer-System
4. Persistence
5. NPC personality + memory + genealogy
6. Civilization + politics
7. Economy + Matrix energy
8. Player, skills, combat, loot
9. Dungeons, ruins, oracle, history
10. Brain + field analyzer
11. Asset registry + GLB loading
12. GM editor
13. Client renderer + websocket sync
14. Firebase/AWS integration
```

---

DATEI
CLIENT_ARCHITECTURE.md

PFAD
/docs/CLIENT_ARCHITECTURE.md

INHALT
```
# Client Architecture

Der Client rendert die Welt, hält lokale UI-Zustände und synchronisiert sich über WebSocket mit dem Server.

## Schichten
- engine/
- gameplay/
- networking/
- ui/
- editor/
- assets/

## Regeln
- Keine autoritative Logik im Client
- Keine Persistenzentscheidungen im Client
- Asset- und Renderlogik bleiben getrennt von Simulation und Politik
```

---

DATEI
CLIENT_EDITOR_AND_PANELS.md

PFAD
/docs/CLIENT_EDITOR_AND_PANELS.md

INHALT
```
# Client Editor and Panels

Der Client enthält Spielpanels und Admin-/GM-Panels.

## Spielerpanels
- HUD
- Chat
- Inventory
- Skills
- Minimap
- Combat

## GM-Panels
- WorldEditor
- ObjectPlacement
- TerrainBrush
- AuditLogView
- AdminMountPanel
```

---

DATEI
CLIENT_MANIFEST.md

PFAD
/docs/CLIENT_MANIFEST.md

INHALT
```
# Client Manifest

- assets/AssetLoader.ts
- assets/GLBValidation.ts
- assets/ModelRegistry.ts
- audio/AmbiencePlayer.ts
- audio/AudioBus.ts
- editor/EditorHotkeys.ts
- editor/GMCommandConsole.ts
- editor/GMCommandPalette.ts
- editor/PlacementTool.ts
- editor/SelectionTool.ts
- editor/TerrainBrush.ts
- editor/TerrainBrushTool.ts
- editor/WorldEditorUI.ts
- engine/renderer.ts
- engine/worldLoader.ts
- gameplay/combatSystem.ts
- gameplay/farmingSystem.ts
- gameplay/inventoryState.ts
- gameplay/playerController.ts
- gameplay/skillSystem.ts
- localization/locale.ts
- main.ts
- networking/reconnect.ts
- networking/websocketClient.ts
- state/auctionState.ts
- state/inventoryState.ts
- state/mailState.ts
- state/notificationState.ts
- state/questState.ts
- state/sessionState.ts
- state/settingsState.ts
- state/socialState.ts
- ui/adminAudit.ts
- ui/adminMountPanel.ts
- ui/auctionPanel.ts
- ui/audioPanel.ts
- ui/chat.ts
- ui/chatPanel.ts
- ui/combatPanel.ts
- ui/crafting.ts
- ui/debugPanel.ts
- ui/diplomacy.ts
- ui/equipmentPanel.ts
- ui/guildPanel.ts
- ui/hud.ts
- ui/inventory.ts
- ui/loginPanel.ts
- ui/mailPanel.ts
- ui/mapPanel.ts
- ui/market.ts
- ui/minimap.ts
- ui/mountPanel.ts
- ui/notifications.ts
- ui/oraclePanel.ts
- ui/partyPanel.ts
- ui/questLog.ts
- ui/releaseBanner.ts
- ui/reputation.ts
- ui/reputationPanel.ts
- ui/routeOverlay.ts
- ui/settingsPanel.ts
- ui/skillsPanel.ts
- ui/titlePanel.ts
- ui/weatherOverlay.ts
```

---

DATEI
CLIENT_UI_SYSTEM.md

PFAD
/docs/CLIENT_UI_SYSTEM.md

INHALT
```
# Client UI System

Die UI besteht aus:
- HUD
- Chat
- Inventory
- Skills Panel
- Minimap
- GM Tools (nur Admin)

Die UI ist modular und getrennt von Render- und Network-Code.
```

---

DATEI
CONSISTENCY_NOTES.md

PFAD
/docs/CONSISTENCY_NOTES.md

INHALT
```
# Consistency Notes

Dieses Paket ist bewusst als weiter ausbaubares Fundament erstellt.

## Konsistenzprinzipien
- Serverautorität
- 64x64 Chunks
- Observer-Axiom
- NPC Memory + Genealogie
- Politik + Zivilisation
- Matrix-Energie
- Brain mit 13 Punkten
- Rekonstruktionsfähigkeit

## Hinweis
Einige Dateien sind Platzhalter/Skeletons mit bewusst einfacher Logik, damit ein No-Code-Agent
oder Entwicklerteam sie sicher weiter ausbauen kann.
```

---

DATEI
CONSTRUCTION_AND_UPGRADES.md

PFAD
/docs/CONSTRUCTION_AND_UPGRADES.md

INHALT
```
# Construction and Upgrades

Gebäude werden nicht instantan aus dem Nichts erschaffen, sondern über Bauaufträge, Materialien und Statusstufen.

## Kernideen
- build queue
- worker assignment
- upgrade levels
- repair jobs
- siege damage integration
```

---

DATEI
CRAFTING_DEEP_DIVE.md

PFAD
/docs/CRAFTING_DEEP_DIVE.md

INHALT
```
# Crafting Deep Dive

Crafting verbindet Skills, Rezepte, Ressourcen, Märkte und Städte.

## Grundfluss
1. Rezept prüfen
2. Materialien prüfen
3. Skillanforderung prüfen
4. Matrix-/Werkbankkosten prüfen
5. Gegenstand erzeugen
6. XP vergeben

## Spezialfälle
- Kulturboni auf Rezepte
- Religionsverbote
- Stadtwerkstätten
- seltene Affix-Ausprägung durch besondere Schmieden
```

---

DATEI
CRAFTING_SYSTEM.md

PFAD
/docs/CRAFTING_SYSTEM.md

INHALT
```
# Crafting System

Crafting converts gathered materials into equipment, structures and utility items.

## Core Loop
gather -> refine -> craft -> improve -> trade

## Skill Links
- smithing
- carpentry
- cooking
- tailoring
- alchemy
```

---

DATEI
DATA_MODEL_OVERVIEW.md

PFAD
/docs/DATA_MODEL_OVERVIEW.md

INHALT
```
# Data Model Overview

## Hauptbereiche
- player
- npc
- chunk
- settlement
- faction
- market
- quest
- snapshot
- world_event

## Ziel
Jede Kernentität soll klar serialisierbar und rekonstruktionsfähig bleiben.
```

---

DATEI
DEPLOYMENT_FIREBASE_AWS.md

PFAD
/docs/DEPLOYMENT_FIREBASE_AWS.md

INHALT
```
# Deployment Firebase + AWS

## Firebase
- Hosting/Studio für UI- und Rekonstruktionsworkflow
- Firestore optional für persistente Welt-/Spielerdaten

## AWS
- PostgreSQL / RDS Adapter
- ElastiCache / Valkey für schnelle Zustände
- optional WebSocket Gateway Bridge

## Grundregel
Keine Secrets im Repo. Immer über Umgebungsvariablen oder Secret Stores.
```

---

DATEI
DEPLOYMENT_PLAN.md

PFAD
/docs/DEPLOYMENT_PLAN.md

INHALT
```
# Deployment Plan

## Zielumgebungen
- Firebase App Hosting
- Cloud Run / Cloud Functions
- AWS PostgreSQL / ElastiCache / API Gateway WebSocket

## Prinzipien
- Keine Secrets im Repo
- Server autoritativ
- Client nur Darstellung
- Beobachterzonen bestimmen Last

## Reihenfolge
1. Datenbankadapter konfigurieren
2. Server health endpoint prüfen
3. WebSocket-Verbindung prüfen
4. World Tick unter kleiner Last testen
5. Asset-Pfade validieren
6. Admin/GM-Zugriff absichern
```

---

DATEI
DEPLOYMENT_SEQUENCE.md

PFAD
/docs/DEPLOYMENT_SEQUENCE.md

INHALT
```
# Deployment Sequence

1. Server dependencies installieren
2. Client dependencies installieren
3. `.env` / Secrets vorbereiten
4. DB/Cache-Adapter konfigurieren
5. Server bauen und starten
6. Client bauen und deployen
7. Health-Check prüfen
8. WebSocket prüfen
9. Persistenz prüfen
10. Admin- und GM-Rollen testen
```

---

DATEI
DIALOGUE_SYSTEM.md

PFAD
/docs/DIALOGUE_SYSTEM.md

INHALT
```
# Dialogue System

The dialogue system combines:
- personality traits
- family and lineage
- culture
- religion
- memory
- world events
- oracle/world history signals

## Pipeline
1. build context
2. choose tone
3. choose dialogue pool
4. inject dynamic references
5. return line + optional quest/world hint
```

---

DATEI
DIPLOMACY_AND_REPUTATION.md

PFAD
/docs/DIPLOMACY_AND_REPUTATION.md

INHALT
```
# Diplomacy and Reputation

Dieses Modul erweitert Politik um Beziehungen zwischen Spielern, NPC-Häusern, Städten und Königreichen.

## Kernelemente
- Fraktionsruf
- Hausruf
- Stadtstatus
- Verträge und Bündnisse
- Nichtangriffspakte
- Tribut und Sanktionen
```

---

DATEI
DIPLOMACY_SYSTEM.md

PFAD
/docs/DIPLOMACY_SYSTEM.md

INHALT
```
# Diplomacy System

Diplomacy governs treaties, pacts, rivalry and alliance transitions between civilizations.

## Treaty Types
- non-aggression pact
- trade treaty
- military alliance
- tribute pact
- open roads agreement
```

---

DATEI
DUNGEON_SYSTEM.md

PFAD
/docs/DUNGEON_SYSTEM.md

INHALT
```
# Dungeon System

Dungeons are generated from seeds, ruins and regional history.

## Room types
- hall
- shrine
- monster_lair
- collapsed_passage
- treasure_room
- prison
- relic_chamber

## Inputs
- biome
- ruin class
- ancient civilization markers
- oracle hints
- current danger rating
```

---

DATEI
ECONOMY_MODEL.md

PFAD
/docs/ECONOMY_MODEL.md

INHALT
```
# Economy Model

Die Wirtschaft verbindet Ressourcen, Spieler, NPCs, Märkte und Städte.

## Kernelemente
- Stadtmärkte
- Handelsrouten
- NPC-Händler
- Spielerhandel
- Matrix-Energie
- politische und kriegerische Markteinflüsse

## Preisfaktoren
- Angebot
- Nachfrage
- Krieg
- Knappheit
- Transport
- Stadtsteuern
```

---

DATEI
FACTION_SYSTEM.md

PFAD
/docs/FACTION_SYSTEM.md

INHALT
```
# Faction System

Factions bind NPCs, players, cities, religions and military structures into aligned groups.

## Examples
- Merchant League
- Sun Order
- Mountain Clans
- Shadow Register Cult

## Effects
- trade access
- diplomacy
- military aid
- rumor networks
```

---

DATEI
FARMING_AND_GROWTH_SYSTEM.md

PFAD
/docs/FARMING_AND_GROWTH_SYSTEM.md

INHALT
```
# Farming and Growth System

Die Welt besitzt Wachstum über Zeit und Ticks.

## Baumwachstum
- young
- spring
- summer
- autumn
- optional winter/dead

## Farming
- Saat setzen
- Wachstum prüfen
- Ernte
- Boden- und Biomabhängigkeit

## Weltintegration
TreeGrowth und Farming laufen über den World Tick.
```

---

DATEI
FARMING_AND_TREE_GROWTH.md

PFAD
/docs/FARMING_AND_TREE_GROWTH.md

INHALT
```
# Farming and Tree Growth

Vegetation and crops use staged growth.

## Growth examples
- sapling -> young tree -> mature tree -> autumn/winter state
- seed -> sprout -> crop -> harvest

Growth is processed by world tick and biome climate.
```

---

DATEI
FILE_MAP.md

PFAD
/docs/FILE_MAP.md

INHALT
```
# File Map

## Root
- README_START_HERE.md
- PROJECT_LOCK_RULES.md
- MASTER_INDEX.md

## Server
- core/
- networking/
- api/
- modules/
- config/
- tests/

## Client
- engine/
- networking/
- ui/
- editor/
- audio/
- state/

## Data
- game-data/
- world-assets/

## Operations
- integrations/
- admin-tools/
```

---

DATEI
FINALIZATION_CHECKLIST.md

PFAD
/docs/FINALIZATION_CHECKLIST.md

INHALT
```
# Finalization Checklist

## Struktur
- Server- und Client-Einstieg vorhanden
- zentrale Doku vorhanden
- Lock-Regeln vorhanden
- Agent-Dateien vorhanden

## Gameplay
- Player
- Skills
- Combat
- Loot
- Inventory
- Crafting
- Quests
- Mail / Auction
- Reputation / Titles

## Welt
- Chunk 64x64
- Observer
- Terrain / Biome
- Weather / Seasons
- Dungeons / Ruins
- Events / Prophecies

## Verwaltung
- GM Editor
- Permission Matrix
- Audit / Telemetry
- Reconstruction Pack
```

---

DATEI
FINAL_PACK_OVERVIEW.md

PFAD
/docs/FINAL_PACK_OVERVIEW.md

INHALT
```
# Final Pack Overview

## Enthaltene Schichten
- Root / Lock / Agent
- Server Core / Networking / API / Modules / Config / Tests
- Client Engine / UI / Audio / State / Editor
- Game-Data
- Integrations
- Admin-Tools
- Asset-/Import-Hinweise
- Finalisierungs- und Audit-Dateien

## Ziel
Ein robuster Baukasten für die weitere Umsetzung des MMORPGs.
```

---

DATEI
GAME_DATA_MANIFEST.md

PFAD
/docs/GAME_DATA_MANIFEST.md

INHALT
```
# Game Data Manifest

- achievements/achievements.json
- auction/fees.json
- audio/ambience.json
- audio/music-zones.json
- biomes/biome-definitions.json
- chat/channels.json
- crafting/recipes.json
- crafting/stations.json
- cultures/cultures.json
- economy/matrix-energy-rules.json
- economy/order-types.json
- economy/trade-goods.json
- events/disasters.json
- events/seasonal-events.json
- events/world-events.json
- factions/factions.json
- guild/ranks.json
- history/dudenregister-schema.json
- history/ruin-states.json
- housing/upgrade-levels.json
- items/affix-pool.json
- items/base-items.json
- items/loot-tables.json
- items/rarities.json
- localization/default-de.json
- localization/default-en.json
- localization/ui-keys.json
- magic/spell-schools.json
- mail/mail-rules.json
- monster/mutation-rules.json
- monsters/mutation-rules.json
- mounts/mounts.json
- notifications/channels.json
- npc/npc-archetypes.json
- politics/diplomacy-types.json
- politics/government-types.json
- quests/quest-registry.json
- religions/religions.json
- skills/skills.json
- spawns/monster-spawns.json
- spawns/npc-spawns.json
- structures/templates.json
- structures/upgrade-paths.json
- trade/order-types.json
- ui/ui-keys.json
- vegetation/tree-growth-rules.json
- weather/presets.json
- weather/weather-presets.json
- world/wonders.json
- world/world-events.json
```

---

DATEI
GENEALOGY_AND_DNA.md

PFAD
/docs/GENEALOGY_AND_DNA.md

INHALT
```
# Genealogy and DNA

NPCs und Monster besitzen Traitprofile. NPCs besitzen zusätzlich Familien- und Linienbezüge.

## NPC
- traits
- house
- parents
- children
- religious bias
- culture bias

## Monster
- base species
- mutations
- regional modifiers
- pack memory
```

---

DATEI
GM_COMMAND_LAYER.md

PFAD
/docs/GM_COMMAND_LAYER.md

INHALT
```
# GM Command Layer

Der GM Command Layer kapselt administrative Eingriffe.

## Beispiele
- /spawn npc merchant
- /spawn structure castle_gate
- /event drought start
- /teleport x y z
- /set season autumn
- /set biome desert

Alle Befehle werden serverseitig validiert.
```

---

DATEI
GM_EDITOR.md

PFAD
/docs/GM_EDITOR.md

INHALT
```
# GM Editor

Der GM-Editor erlaubt Live-Eingriffe in die Welt.

## Fähigkeiten
- Objekte setzen
- NPCs spawnen
- Strukturen verschieben
- Terrainmarker bearbeiten
- Events starten
- Weltzustände prüfen

## Regel
Der Editor ist serverautoritativ. Der Client darf nur Befehle senden.
```

---

DATEI
GUILD_AND_SOCIAL_SYSTEM.md

PFAD
/docs/GUILD_AND_SOCIAL_SYSTEM.md

INHALT
```
# Guild and Social System

Gilden bilden die erste organisierte Schicht zwischen Einzelspielern und Zivilisationen.

## Kernfunktionen
- Guild creation
- Membership and ranks
- Guild storage
- Guild chat
- Village founding threshold

## Sozialsystem
- Freundeslisten
- Kontaktlisten
- Gruppeneinladungen
- soziale Reputation
```

---

DATEI
HOUSING_AND_OWNERSHIP.md

PFAD
/docs/HOUSING_AND_OWNERSHIP.md

INHALT
```
# Housing and Ownership

Strukturen und Häuser besitzen klare Eigentumsregeln.

## Eigentümer
- Spieler
- Gilden
- NPC-Zivilisationen
- Städte / Königreiche

## Besitzdaten
- ownerType
- ownerId
- permissions
- protection state
- upgrade level
```

---

DATEI
KNOWN_GAPS.md

PFAD
/docs/KNOWN_GAPS.md

INHALT
```
# Known Gaps

Dieses Paket ist ein stark ausgebautes Fundament, aber noch kein vollständig live-balanciertes MMORPG.

## Noch offen
- echte Produktions-Datenbankverdrahtung
- vollständige Kampf-/Skill-Balance
- vollständige Produktions-UI
- echte Auth-Integration
- vollständiger Asset-Inhalt
- umfassende Integrationstests
```

---

DATEI
LOCALIZATION_AND_TEXT_KEYS.md

PFAD
/docs/LOCALIZATION_AND_TEXT_KEYS.md

INHALT
```
# Localization and Text Keys

UI- und Textsysteme können später lokalisiert werden.

## Beispiele
- ui.inventory.title
- ui.chat.title
- ui.skills.title
- npc.uschi.greeting.01
- quest.ruin_hunter.title
```

---

DATEI
LOGIN_AND_SESSION_MODEL.md

PFAD
/docs/LOGIN_AND_SESSION_MODEL.md

INHALT
```
# Login and Session Model

## Ziele
- sichere Session-Basis
- Spielerzustand laden
- WebSocket und HTTP logisch verbinden

## Elemente
- auth route
- session registry
- player restore
- reconnect handling
```

---

DATEI
MAIL_AND_AUCTION_SYSTEM.md

PFAD
/docs/MAIL_AND_AUCTION_SYSTEM.md

INHALT
```
# Mail and Auction System

## Mail
Spieler können Nachrichten und Gegenstände verschicken.

## Auktionen
Auktionshäuser verbinden Regionen, Städte oder globale Handelsräume.

## Regeln
- serverseitige Validierung
- Gebühren
- Fristen
- optionale Stadtsteuern
```

---

DATEI
MARKET_EXPANSION.md

PFAD
/docs/MARKET_EXPANSION.md

INHALT
```
# Market Expansion

Zusätzlich zum Basismarkt gibt es:
- regionale Preisprofile
- Handelsroutenboni
- Kriegsaufschläge
- Seltenheitsaufschläge
- NPC-Händlerverhalten

## Marktflüsse
Rohstoff -> Verarbeitung -> Weiterverkauf -> Steuer -> Wohlstand
```

---

DATEI
MARKET_ORDER_MODEL.md

PFAD
/docs/MARKET_ORDER_MODEL.md

INHALT
```
# Market Order Model

Neben einfachen Stadtmärkten unterstützt das System Order-Modelle.

## Order-Typen
- buy order
- sell order
- npc restock
- tax adjusted order

## Einflussfaktoren
- Ruf
- Fraktion
- Krieg
- Knappheit
- Stadtsteuern
```

---

DATEI
MASTER_DESIGN_BIBLE.md

PFAD
/docs/MASTER_DESIGN_BIBLE.md

INHALT
```
# Master Design Bible

## Vision
Arelorian ist ein persistentes Browser-MMORPG mit emergenter Weltlogik. Die Welt ist theoretisch unendlich,
wird prozedural erzeugt und über Beobachterzonen simuliert.

## Fünf Axiome
1. Informationsfeld
2. Emergenz
3. Persistenz
4. Ouroboros-Zyklus
5. Beobachter

## Welt
- Prozedurale Welt
- Chunks 64x64
- Biome als natürliche Grenzen
- Ruinen, Dungeons und historische Schichten

## Zivilisationen
- Guild -> Village -> City -> Kingdom -> Nation
- Spieler und NPCs besitzen dieselben zivilisatorischen Rechte

## NPCs
- Personality
- DNA/Traits
- Genealogie und Häuser
- Memory und Shared Memory
- Kultur und Religion
- Politik und Familiengeschichte

## Gameplay
- klassenloses Skill-System
- Skills durch Nutzung
- Stamina als Kernressource
- Diablo-artiges Loot
- Magie als Skillzweig
- Crafting, Handel und Weltwirtschaft

## Systeme
- Server Brain mit 13-Punkte-Modell
- Dudenregister und Orakel
- Matrix-Energie
- Weltwunder und Schattenregisterportal
- GM-Editor
- GLB-Asset-Pipeline
```

---

DATEI
MASTER_SYSTEM_CHECKLIST.md

PFAD
/docs/MASTER_SYSTEM_CHECKLIST.md

INHALT
```
# Master System Checklist

## Welt
- [x] World generator
- [x] 64x64 chunk system
- [x] Observer simulation
- [x] Biome and terrain
- [x] World tick
- [x] Dungeons
- [x] Ruins

## NPC
- [x] Personality engine
- [x] Memory engine
- [x] Shared memory
- [x] Genealogy
- [x] DNA and traits
- [x] Dialogue
- [x] Quests

## Gesellschaft
- [x] Civilization engine
- [x] NPC politics
- [x] Player politics
- [x] Governments
- [x] Taxes
- [x] War

## Gameplay
- [x] Players
- [x] Skills
- [x] Inventory
- [x] Combat
- [x] Loot
- [x] Magic

## Spezial
- [x] Matrix energy
- [x] Dudenregister
- [x] Oracle
- [x] Server brain
- [x] GLB pipeline
- [x] GM editor
```

---

DATEI
MATRIX_ENERGY_RULEBOOK.md

PFAD
/docs/MATRIX_ENERGY_RULEBOOK.md

INHALT
```
# Matrix Energy Rulebook

Matrix-Energie ist Infrastrukturwährung.

## Verwendungen
- Bauprojekte
- Struktur-Upgrades
- Spezialgebäude
- Schutzstatus

## Grundregel
NPCs dürfen matrixgeschützte Spielerstrukturen nicht zerstören.
```

---

DATEI
MODULE_MANIFEST.md

PFAD
/docs/MODULE_MANIFEST.md

INHALT
```
# Module Manifest

- achievements/AchievementRegistry.ts
- achievements/AchievementSystem.ts
- admin/AdminAuditLog.ts
- admin/AdminMountRegistry.ts
- admin/AdminRollback.ts
- admin/EditorActionLog.ts
- admin/GMCommandLayer.ts
- admin/GiraffeAdminMount.ts
- admin/PermissionMatrix.ts
- admin/RoleGuard.ts
- aging/AgingSystem.ts
- ai/AgingSystem.ts
- ai/BehaviorTree.ts
- ai/FamilyGenerationSystem.ts
- ai/NPCBrain.ts
- ai/NPCSchedules.ts
- ai/TaskSystem.ts
- analytics/PerformanceBudget.ts
- analytics/TelemetryCollector.ts
- api/editorRoutes.ts
- api/healthRoute.ts
- api/playerRoutes.ts
- api/worldRoutes.ts
- asset-registry/AssetRegistry.ts
- asset-registry/NPCAssets.ts
- asset-registry/StructureAssets.ts
- asset-registry/VegetationAssets.ts
- assets/AssetImportQueue.ts
- assets/AssetValidationReport.ts
- assets/ContentManifest.ts
- auction/AuctionFees.ts
- auction/AuctionHouse.ts
- auction/AuctionSettlement.ts
- audio/AmbienceRegistry.ts
- audio/MusicZones.ts
- auth/PlayerRestore.ts
- auth/SessionHeartbeat.ts
- auth/SessionReconnectHandler.ts
- auth/SessionRegistry.ts
- auth/WebSocketPresence.ts
- bootstrap/ModuleRegistry.ts
- bootstrap/SystemWiring.ts
- brain/BrainFieldAnalyzer.ts
- brain/HeuristicWorldBrain.ts
- chat/ChatChannels.ts
- chat/ChatModeration.ts
- chat/ChatService.ts
- civilization/CivilizationEngine.ts
- civilization/CivilizationRankings.ts
- civilization/KingdomLedger.ts
- civilization/SettlementSystem.ts
- combat/CombatSystem.ts
- construction/ConstructionQueue.ts
- construction/UpgradeSystem.ts
- crafting/CraftingStationRegistry.ts
- crafting/CraftingSystem.ts
- crafting/RecipeMatcher.ts
- crafting/RecipeRegistry.ts
- dialogue/DialogueContext.ts
- dialogue/DialogueEngine.ts
- dialogue/DialogueGenerator.ts
- dialogue/DialogueMemoryBridge.ts
- dialogue/DialogueTagRules.ts
- dialogue/DialogueTemplates.ts
- diplomacy/DiplomacyEngine.ts
- dungeon/DungeonGenerator.ts
- economy/BuyOrders.ts
- economy/EconomyEngine.ts
- economy/MarketExpansion.ts
- economy/MarketLedger.ts
- economy/MarketOrders.ts
- economy/MatrixEnergySystem.ts
- economy/NPCTradeAI.ts
- economy/PlayerMarket.ts
- economy/PriceBalancer.ts
- economy/SellOrders.ts
- economy/TaxLedger.ts
- economy/TradeRoutes.ts
- equipment/EquipmentSystem.ts
- events/DisasterEngine.ts
- events/EventScheduler.ts
- events/MigrationEngine.ts
- events/WarForecast.ts
- events/WorldEventLayer.ts
- faction/FactionMemory.ts
- faction/FactionSystem.ts
- farming/FarmingSystem.ts
- farming/TreeGrowthSystem.ts
- genealogy/FamilyGenerationSystem.ts
- gm/AdminAuditLog.ts
- gm/GMCommandLayer.ts
- growth/AgingSystem.ts
- growth/FamilyGenerationSystem.ts
- growth/FarmingSystem.ts
- growth/TreeGrowthSystem.ts
- guild/GuildStorage.ts
- guild/GuildSystem.ts
- history/DudenregisterHistory.ts
- history/HistoricalMapEngine.ts
- history/ProphecyArchive.ts
- history/RuinEvolutionEngine.ts
- history/WorldSnapshotSystem.ts
- housing/HousingSystem.ts
- housing/OwnershipRegistry.ts
- inventory/InventorySystem.ts
- items/AffixSystem.ts
- items/EquipmentSystem.ts
- items/ItemGenerator.ts
- localization/LocaleDictionary.ts
- localization/LocaleRegistry.ts
- localization/TextKeyResolver.ts
- loot/AffixSystem.ts
- loot/ItemGenerator.ts
- loot/LootTables.ts
- magic/MagicSystem.ts
- mail/MailAttachments.ts
- mail/MailService.ts
- market/MarketExpansion.ts
- market/NPCTradeAI.ts
- market/PriceBalancer.ts
- migration/MigrationEngine.ts
- monitoring/BackupManager.ts
- monitoring/CrashRecovery.ts
- monitoring/SystemHealthMonitor.ts
- monster/MonsterDNA.ts
- monster/MonsterMutation.ts
- monster/MonsterSpawnTable.ts
- monster/MonsterSpawner.ts
- mounts/MountRegistry.ts
- mounts/TravelSystem.ts
- notifications/NotificationService.ts
- npc/HeritageResolver.ts
- npc/NPCDialogueSystem.ts
- npc/NPCGenealogyEngine.ts
- npc/NPCMemoryEngine.ts
- npc/NPCPersonalityEngine.ts
- npc/NPCProfessions.ts
- npc/NPCRelationshipSystem.ts
- npc/NPCScheduleRegistry.ts
- npc/NPCSpawnTable.ts
- npc/SharedMemoryNetwork.ts
- observer/ObserverEngine.ts
- oracle/OracleEngine.ts
- oracle/OracleMemoryBridge.ts
- oracle/ProphecyArchive.ts
- oracle/ProphecyGenerator.ts
- oracle/WarForecast.ts
- persistence/CivilizationDatabase.ts
- persistence/DataSeeder.ts
- persistence/PlayerDatabase.ts
- persistence/SafeMigrationRunner.ts
- persistence/SaveFormats.ts
- persistence/SnapshotArchive.ts
- persistence/WorldDatabase.ts
- player/EquipmentSystem.ts
- player/PlayerSystem.ts
- player/ReputationTitleBridge.ts
- player/StaminaRegen.ts
- player/TitleSystem.ts
- politics/DiplomacyEngine.ts
- politics/GovernmentTypes.ts
- politics/ReputationSystem.ts
- politics/WarEngine.ts
- prophecy/ProphecyArchive.ts
- prophecy/ProphecyGenerator.ts
- prophecy/WarForecast.ts
- quest/QuestEngine.ts
- quest/QuestRegistry.ts
- quest/QuestRewards.ts
- quest/QuestStateStore.ts
- quests/QuestRewards.ts
- quests/QuestStateStore.ts
- relationships/NPCRelationshipSystem.ts
- relationships/SharedMemoryNetwork.ts
- release/BuildStamp.ts
- release/ReleaseChecklist.ts
- release/ReleaseProfile.ts
- religion/ReligionSystem.ts
- reputation/ReputationLedger.ts
- reputation/ReputationSystem.ts
- security/AntiCheatHooks.ts
- security/PayloadValidator.ts
- siege/SiegeEngine.ts
- skill/SkillSystem.ts
- social/FriendsSystem.ts
- social/GroupFinder.ts
- social/IgnoreSystem.ts
- social/PartySystem.ts
- structure/ConstructionQueue.ts
- structure/GateController.ts
- structure/SiegeEngine.ts
- structure/StructureEngine.ts
- structure/StructureTemplates.ts
- structure/UpgradeSystem.ts
- telemetry/PerformanceBudget.ts
- telemetry/TelemetryCollector.ts
- trade/BuyOrders.ts
- trade/PlayerMarket.ts
- trade/SellOrders.ts
- weather/ClimateModel.ts
- weather/SeasonalGrowthBridge.ts
- weather/WeatherEffects.ts
- weather/WeatherPresets.ts
- world-editor/AdminAuditLog.ts
- world-editor/ObjectPlacement.ts
- world-editor/TerrainBrush.ts
- world-editor/WorldEditorServer.ts
- world/BiomeGenerator.ts
- world/ChunkActivation.ts
- world/ChunkSystem.ts
- world/NavMeshNodes.ts
- world/Pathfinding.ts
- world/ResourceScatter.ts
- world/SeasonSystem.ts
- world/SeasonalEventBridge.ts
- world/ShadowRegisterPortal.ts
- world/TerrainGenerator.ts
- world/TravelHazards.ts
- world/WeatherSystem.ts
- world/WorldSeed.ts
- world/WorldState.ts
- world/WorldStateStore.ts
- world/WorldWonderRegistry.ts
```

---

DATEI
MONETIZATION_BOUNDARIES.md

PFAD
/docs/MONETIZATION_BOUNDARIES.md

INHALT
```
# Monetization Boundaries

Matrix-Energie ist Infrastrukturwährung, kein plumpes Pay-to-Win-System.

## Erlaubt
- Bau und Schutz
- Spezialprojekte
- Komfort

## Nicht Ziel
- direkte Kampfdominanz kaufen
- Sieg per Geld erzwingen
```

---

DATEI
MONSTER_SYSTEM.md

PFAD
/docs/MONSTER_SYSTEM.md

INHALT
```
# Monster System

Monsters are generated from:
- species
- dna
- mutation
- biome
- pack memory
- rarity

This allows regional monster lines such as frost wolves, swamp alphas or cave mutants.
```

---

DATEI
MOUNTS_AND_TRAVEL.md

PFAD
/docs/MOUNTS_AND_TRAVEL.md

INHALT
```
# Mounts and Travel

Reittiere und Reisewege erweitern Mobilität, Sicht und Kontrolle über Regionen.

## Reittiere
- normale Mounts
- seltene Mounts
- Admin-/GM-Mounts

## Reisen
- lokale Bewegung
- Straßenboni
- Gefahrenzonen
- Reiseereignisse
- Mount-spezifische Geschwindigkeiten
```

---

DATEI
NETWORKING_MODEL.md

PFAD
/docs/NETWORKING_MODEL.md

INHALT
```
# Networking Model

Der Server bleibt autoritativ.

## Flüsse
- Client -> Input Packets -> Server
- Server -> State Updates -> Client
- GM Editor -> Command Packets -> Server Validation -> Broadcast

## Synchronisierte Zustände
- Spielerpositionen
- NPC-Sichtzustände
- Chunkaktivierung
- Kampfergebnisse
- Eventsignale
```

---

DATEI
NO_CODE_RECONSTRUCTION_GUIDE.md

PFAD
/docs/NO_CODE_RECONSTRUCTION_GUIDE.md

INHALT
```
# No-Code Reconstruction Guide

Dieses Projekt kann aus Rekonstruktionsdokumenten wiederhergestellt werden.

## Regel
Jede Datei wird durch:
- Dateiname
- Pfad
- Inhalt

definiert.

## Vorgehen
1. Pfad lesen
2. Ordner anlegen
3. Datei mit exakt diesem Inhalt schreiben
4. nächste Datei
```

---

DATEI
NPC_PROFESSIONS.md

PFAD
/docs/NPC_PROFESSIONS.md

INHALT
```
# NPC Professions

NPCs können Berufe haben:
- Händler
- Schmied
- Farmer
- Jäger
- Wächter
- Heiler
- Orakel
- Chronist

Berufe beeinflussen Tagesablauf, Dialoge, Marktverhalten und Fraktionswert.
```

---

DATEI
NPC_SCHEDULES.md

PFAD
/docs/NPC_SCHEDULES.md

INHALT
```
# NPC Schedules

NPCs haben Tages- und Rollenpläne.

## Beispiele
Merchant:
- wake
- open shop
- trade
- tavern
- sleep

Guard:
- patrol
- gate duty
- tavern
- sleep
```

---

DATEI
NPC_SCHEDULES_AND_AGING.md

PFAD
/docs/NPC_SCHEDULES_AND_AGING.md

INHALT
```
# NPC Schedules and Aging

NPCs folgen Tagesplänen und altern über große Welttakte.

## Tagesstruktur
- wake
- work
- trade
- rest
- sleep

## Langzeitstruktur
- kindheit
- jugend
- erwachsen
- alt
- tod / genealogischer Übergang
```

---

DATEI
NPC_SYSTEM.md

PFAD
/docs/NPC_SYSTEM.md

INHALT
```
# NPC System

## Fünf Einflussfaktoren
- DNA / Traits
- Familie / Genealogie
- Kultur / Herkunft
- Religion / Weltbild
- Erfahrung / Memory

## Memory-Ebenen
- Local memory
- Social memory
- Faction memory
- Historical memory
- Oracle memory

## Verhalten
NPCs können:
- arbeiten
- handeln
- Gerüchte verbreiten
- Familien gründen
- Politik betreiben
- Kriege beginnen oder vermeiden
```

---

DATEI
ORACLE_AND_PROPHECY.md

PFAD
/docs/ORACLE_AND_PROPHECY.md

INHALT
```
# Oracle and Prophecy

Das Orakelsystem generiert Visionen aus Brain-Signalen, Dudenregister-Einträgen und Weltspannungen.

## Quellen
- history
- active wars
- migration
- ruins
- relic activity

## Ausgaben
- rumor hints
- oracle lines
- prophecy archives
```

---

DATEI
PERSISTENCE_AND_SAVE_FORMATS.md

PFAD
/docs/PERSISTENCE_AND_SAVE_FORMATS.md

INHALT
```
# Persistence and Save Formats

Persistenz speichert:
- Spieler
- Weltzustände
- Zivilisationen
- Fraktionen
- Geschichte
- Snapshots

Formate:
- JSON-nahe Struktur für schnelle Iteration
- relationale Ablage für produktive Datenbanken
- Snapshot-Archive für historische Analyse
```

---

DATEI
PERSISTENCE_MODEL.md

PFAD
/docs/PERSISTENCE_MODEL.md

INHALT
```
# Persistence Model

Persistent storage is split by concern:
- world chunks
- players
- civilizations
- history / dudenregister
- snapshots
- asset metadata
```

---

DATEI
PLAYER_EXPERIENCE_FLOW.md

PFAD
/docs/PLAYER_EXPERIENCE_FLOW.md

INHALT
```
# Player Experience Flow

1. Login / Verbindung
2. Spawn in Stadt oder Startzone
3. Bewegung und Beobachteraktivierung
4. erste NPC-Dialoge
5. erste Quest
6. Sammeln, Kampf, Loot
7. Markt, Gilde, Dorfgründung
8. Politik, Krieg, Weltgeschichte
```

---

DATEI
PLAYER_TITLES_AND_REPUTATION.md

PFAD
/docs/PLAYER_TITLES_AND_REPUTATION.md

INHALT
```
# Player Titles and Reputation

Titel spiegeln Geschichte, Rang und soziale Wahrnehmung wider.

## Quellen
- Fraktionsruf
- Königshaus
- Kriegserfolge
- Handwerk
- Entdeckungen

Titel können Dialoge, Preise oder politische Optionen beeinflussen.
```

---

DATEI
RELEASE_READINESS.md

PFAD
/docs/RELEASE_READINESS.md

INHALT
```
# Release Readiness

## Vor Release prüfen
- Health endpoint antwortet
- WebSocket verbindet
- Client rendert
- kritische Panels öffnen
- Persistenzpfade gesetzt
- Secrets extern konfiguriert
- GM-Rechte geprüft
- Rekonstruktionspack aktuell

## Nicht vergessen
Dieses Paket ist eine starke Entwicklungsbasis, aber Balance, echter Content und Produktionsintegration müssen vor Livegang weiter vertieft werden.
```

---

DATEI
REPUTATION_AND_FACTIONS.md

PFAD
/docs/REPUTATION_AND_FACTIONS.md

INHALT
```
# Reputation and Factions

Spieler und NPCs besitzen Rufwerte gegenüber Fraktionen, Häusern und Städten.

## Rufquellen
- Handel
- Hilfe
- Verrat
- Diebstahl
- Krieg
- Diplomatie

## Fraktionseffekte
- Händlerpreise
- Wachfreundlichkeit
- Questzugang
- Bündnisoptionen
```

---

DATEI
REPUTATION_SYSTEM.md

PFAD
/docs/REPUTATION_SYSTEM.md

INHALT
```
# Reputation System

Reputation measures how factions, cities, houses, religions and specific NPCs evaluate a player.

## Dimensions
- civic reputation
- faction reputation
- house reputation
- religious favor
- fear / notoriety

## Sources
- quest completion
- theft
- murder
- trade fairness
- war participation
```

---

DATEI
ROLE_MODEL.md

PFAD
/docs/ROLE_MODEL.md

INHALT
```
# Role Model

## Rollen
- player
- guild founder
- city ruler
- kingdom ruler
- moderator
- gm
- superadmin

## Grundregel
Rechte werden serverseitig geprüft.
```

---

DATEI
ROUTE_MANIFEST.md

PFAD
/docs/ROUTE_MANIFEST.md

INHALT
```
# Route Manifest

- admin/editorRoutes.ts
- adminRoute.ts
- auctionRoute.ts
- authRoute.ts
- chatRoute.ts
- editorRoutes.ts
- health/healthRoute.ts
- healthRoute.ts
- index.ts
- mailRoute.ts
- oracleRoute.ts
- playerRoutes.ts
- rest/playerRoutes.ts
- rest/worldRoutes.ts
- worldRoutes.ts
```

---

DATEI
ROUTE_REFERENCE.md

PFAD
/docs/ROUTE_REFERENCE.md

INHALT
```
# Route Reference

## Beispiele
- /health
- /api/player/*
- /api/world/*
- /api/editor/*
- /api/chat/send
- /api/admin/command
- /api/oracle/vision
- /api/auth/login
- /api/mail/send
- /api/auction/list
```

---

DATEI
SEASONS_AND_WEATHER.md

PFAD
/docs/SEASONS_AND_WEATHER.md

INHALT
```
# Seasons and Weather

Das Weltsystem unterstützt Jahreszeiten und Wetter als eigenständige Simulationsschicht.

## Jahreszeiten
- spring
- summer
- autumn
- winter

## Wetterzustände
- clear
- rain
- storm
- fog
- snow
- heatwave

## Auswirkungen
- Terrain-Optik
- Sichtweite
- Pflanzenwachstum
- NPC-Routen
- Monster-Spawngewichtung
- Reise- und Handelsgeschwindigkeit
```

---

DATEI
SECURITY_AND_TRUST_MODEL.md

PFAD
/docs/SECURITY_AND_TRUST_MODEL.md

INHALT
```
# Security and Trust Model

## Kernregeln
- Serverautorität
- keine vertrauenswürdige Clientlogik für wichtige Entscheidungen
- Rollen- und Rechteprüfung
- keine Secrets im Repo
- validierte WebSocket- und API-Payloads
```

---

DATEI
SESSION_AND_RECONNECT_FLOW.md

PFAD
/docs/SESSION_AND_RECONNECT_FLOW.md

INHALT
```
# Session and Reconnect Flow

## Ablauf
1. Login
2. Session anlegen
3. Weltzustand laden
4. WebSocket verbinden
5. Reconnect bei Verbindungsabbruch

## Ziel
Spieler nicht unnötig verlieren, Session-Logik aber serverseitig sauber halten.
```

---

DATEI
SHARED_MEMORY_SYSTEM.md

PFAD
/docs/SHARED_MEMORY_SYSTEM.md

INHALT
```
# Shared Memory System

NPCs besitzen nicht nur Local Memory, sondern können Gedächtnisinhalte sozial weitergeben.

## Ebenen
- Local Memory
- Shared Memory
- Faction Memory
- Historical Memory
- Oracle Memory

Shared Memory verbreitet Gerüchte, Warnungen und Reputationssignale wellenförmig durch die Welt.
```

---

DATEI
SIEGE_AND_DEFENSE.md

PFAD
/docs/SIEGE_AND_DEFENSE.md

INHALT
```
# Siege and Defense

Belagerung verbindet Politik, Strukturen, Tore, Mauern und NPC-Armeen.

## Ziele
- Tore beschädigen
- Mauern brechen
- Türme besetzen
- Stadtkern bedrohen
- Verteidiger routen
```

---

DATEI
SIEGE_AND_FORTIFICATIONS.md

PFAD
/docs/SIEGE_AND_FORTIFICATIONS.md

INHALT
```
# Siege and Fortifications

Belagerungen verbinden Krieg, Mauern, Tore, Türme, Reparaturen und NPC-Armeen.

## Komponenten
- Gate
- Wall
- Watch Tower
- Keep
- Siege timer
- Repair loop

## Grundregel
NPCs dürfen keine matrixProtected Spielerstrukturen zerstören, außer Sonderregeln der Welt greifen.
```

---

DATEI
STRUCTURE_SYSTEM.md

PFAD
/docs/STRUCTURE_SYSTEM.md

INHALT
```
# Structure System

Structures connect GLB assets to persistent world entities.

## Types
- player_structure
- npc_structure
- civilization_structure
- ruin_structure
- wonder_structure
- matrix_protected_structure

## Examples
- house
- gate
- wall
- watch tower
- workshop
- temple
- shadow register portal
```

---

DATEI
TESTING_STRATEGY.md

PFAD
/docs/TESTING_STRATEGY.md

INHALT
```
# Testing Strategy

## Testarten
- Unit Tests für Kernmodule
- Integrationstests für World Tick + WebSocket
- Simulationsläufe für NPC/Ökonomie/Politik
- Asset-Validierung für GLB-Dateien
- Admin-Editor-Rechteprüfung

## Kritische Pfade
- Chunk Aktivierung
- Observer-Regionen
- NPC Memory
- Matrix Energy Verbrauch
- Kriegs-/Diplomatieereignisse
```

---

DATEI
TEST_PLAN.md

PFAD
/docs/TEST_PLAN.md

INHALT
```
# Test Plan

## Server
- health endpoint
- websocket welcome
- chunk generation
- observer activation
- combat damage flow
- skill xp flow

## Client
- renderer start
- websocket connect
- HUD render
- editor UI open

## Systems
- matrix energy consume/add
- loot table roll
- oracle vision generation
- world snapshot save/load
```

---

DATEI
TRADE_AND_PLAYER_MARKETS.md

PFAD
/docs/TRADE_AND_PLAYER_MARKETS.md

INHALT
```
# Trade and Player Markets

Spieler können über persönliche Angebote, Stadtmärkte und Gildenlager handeln.

## Typen
- Direktverkauf
- Buy Order
- Sell Order
- NPC-gestützter Markt
- steuerpflichtiger Stadtmarkt
```

---

DATEI
WORLD_EVENT_CATALOG.md

PFAD
/docs/WORLD_EVENT_CATALOG.md

INHALT
```
# World Event Catalog

Beispiele für Weltereignisse:
- war_declared
- ruin_found
- harvest_festival
- blight
- migration_wave
- shadow_portal_awakens
- market_crash
- royal_succession
```

---

DATEI
WORLD_EVENT_LAYER.md

PFAD
/docs/WORLD_EVENT_LAYER.md

INHALT
```
# World Event Layer

Die Welt besitzt geplante und emergente Ereignisse.

## Beispiele
- Dürre
- Monstermigration
- Kriegsausbruch
- Ernteboom
- Ruinenfund
- religiöse Wallfahrt

Events greifen auf Brain, Economy, Politics und History zu.
```

---

DATEI
WORLD_GENERATION.md

PFAD
/docs/WORLD_GENERATION.md

INHALT
```
# World Generation

Die Welt wird aus `seed + coordinates` erzeugt.

## Chunkstruktur
Jeder Chunk enthält:
- Terrain
- Biomtyp
- Ressourcen
- Objektliste
- Strukturen
- Ruinen oder Dungeon-Eingänge

## Simulationsebenen
1. Dormant
2. Background simulation
3. Active simulation
4. Full simulation

Nur beobachtete Regionen werden hochauflösend simuliert.
```

---

DATEI
DO_NOT_SIMPLIFY.md

PFAD
/final-lock/DO_NOT_SIMPLIFY.md

INHALT
```
# Do Not Simplify

Nicht reduzieren auf:
- Demo
- UI-Mockup
- Singleplayer-Sandbox
- nur Terrain-Viewer
- nur Client ohne Weltsimulation
```

---

DATEI
FINAL_TRUTH.md

PFAD
/final-lock/FINAL_TRUTH.md

INHALT
```
# Final Truth

Dieses Projekt ist ein persistentes MMORPG und darf nicht auf ein Mockup oder eine Einzelspieler-Demo reduziert werden.

Pflicht:
- 64x64 chunks
- observer simulation
- server-authoritative logic
- NPC memory + genealogy
- player and NPC politics
- matrix energy
- 13-node brain
- GM editor
- GLB pipeline
```

---

DATEI
REQUIRED_SYSTEMS_MATRIX.md

PFAD
/final-lock/REQUIRED_SYSTEMS_MATRIX.md

INHALT
```
# Required Systems Matrix

## Welt
observer, chunks, terrain, biomes, tick, dungeons, ruins

## NPC
personality, memory, shared memory, genealogy, dna, dialogue

## Gesellschaft
civilization, politics, government, tax, war, diplomacy

## Gameplay
player, skills, inventory, combat, loot, magic

## Spezial
oracle, dudenregister, matrix energy, brain, gm editor, glb pipeline
```

---

DATEI
achievements.json

PFAD
/game-data/achievements/achievements.json

INHALT
```
{
  "first_blood": {
    "category": "combat"
  },
  "ruin_discoverer": {
    "category": "exploration"
  },
  "master_smith": {
    "category": "crafting"
  }
}
```

---

DATEI
fees.json

PFAD
/game-data/auction/fees.json

INHALT
```
{
  "listingFeePercent": 0.02,
  "saleTaxPercent": 0.05
}
```

---

DATEI
ambience.json

PFAD
/game-data/audio/ambience.json

INHALT
```
{
  "forest": [
    "birds",
    "wind"
  ],
  "desert": [
    "wind",
    "sand"
  ],
  "town": [
    "market",
    "crowd"
  ]
}
```

---

DATEI
music-zones.json

PFAD
/game-data/audio/music-zones.json

INHALT
```
{
  "starter_town": "theme_town_01",
  "ruins": "theme_ruins_01",
  "kingdom_capital": "theme_capital_01"
}
```

---

DATEI
biome-definitions.json

PFAD
/game-data/biomes/biome-definitions.json

INHALT
```
{
  "forest": {
    "temperature": "mild",
    "resources": [
      "wood",
      "berries",
      "animals"
    ]
  },
  "desert": {
    "temperature": "hot",
    "resources": [
      "sand",
      "salt",
      "crystals"
    ]
  },
  "mountain": {
    "temperature": "cold",
    "resources": [
      "stone",
      "iron",
      "gold"
    ]
  }
}
```

---

DATEI
channels.json

PFAD
/game-data/chat/channels.json

INHALT
```
{
  "global": {
    "moderated": true
  },
  "trade": {
    "moderated": true
  },
  "local": {
    "moderated": false
  },
  "guild": {
    "moderated": false
  }
}
```

---

DATEI
recipes.json

PFAD
/game-data/crafting/recipes.json

INHALT
```
{
  "wooden_plank": {
    "inputs": {
      "wood_log": 2
    },
    "output": "wood_plank"
  },
  "iron_sword": {
    "inputs": {
      "iron_ingot": 3,
      "wood_plank": 1
    },
    "output": "iron_sword"
  }
}
```

---

DATEI
stations.json

PFAD
/game-data/crafting/stations.json

INHALT
```
{
  "forge": {
    "skills": [
      "smithing"
    ]
  },
  "alchemy_table": {
    "skills": [
      "magic",
      "crafting"
    ]
  },
  "workbench": {
    "skills": [
      "crafting",
      "woodcutting"
    ]
  }
}
```

---

DATEI
cultures.json

PFAD
/game-data/cultures/cultures.json

INHALT
```
{
  "forest_tribes": {
    "style": "organic"
  },
  "mountain_clans": {
    "style": "stone"
  },
  "desert_nomads": {
    "style": "lightweight"
  }
}
```

---

DATEI
matrix-energy-rules.json

PFAD
/game-data/economy/matrix-energy-rules.json

INHALT
```
{
  "currency": "matrix_energy",
  "npcCannotDestroyProtectedStructures": true
}
```

---

DATEI
order-types.json

PFAD
/game-data/economy/order-types.json

INHALT
```
{
  "buy": {},
  "sell": {},
  "npc_restock": {}
}
```

---

DATEI
trade-goods.json

PFAD
/game-data/economy/trade-goods.json

INHALT
```
{
  "wood": {
    "basePrice": 5
  },
  "iron_ore": {
    "basePrice": 9
  },
  "bread": {
    "basePrice": 3
  },
  "ancient_relic": {
    "basePrice": 120
  }
}
```

---

DATEI
disasters.json

PFAD
/game-data/events/disasters.json

INHALT
```
{
  "fire": {
    "severity": 2
  },
  "storm": {
    "severity": 3
  },
  "blight": {
    "severity": 2
  },
  "collapse": {
    "severity": 4
  }
}
```

---

DATEI
seasonal-events.json

PFAD
/game-data/events/seasonal-events.json

INHALT
```
{
  "spring": "harvest_bloom",
  "summer": "heatwave_fair",
  "autumn": "harvest_festival",
  "winter": "long_night"
}
```

---

DATEI
world-events.json

PFAD
/game-data/events/world-events.json

INHALT
```
{
  "events": [
    "war_declared",
    "ruin_found",
    "harvest_festival",
    "shadow_portal_awakens"
  ]
}
```

---

DATEI
factions.json

PFAD
/game-data/factions/factions.json

INHALT
```
{
  "merchant_league": {
    "alignment": "trade"
  },
  "shadow_register": {
    "alignment": "mystic"
  },
  "sun_order": {
    "alignment": "religious"
  }
}
```

---

DATEI
ranks.json

PFAD
/game-data/guild/ranks.json

INHALT
```
{
  "founder": {
    "power": 100
  },
  "officer": {
    "power": 70
  },
  "member": {
    "power": 10
  }
}
```

---

DATEI
dudenregister-schema.json

PFAD
/game-data/history/dudenregister-schema.json

INHALT
```
{
  "events": [
    "war",
    "collapse",
    "ruin",
    "wonder",
    "dynasty",
    "oracle"
  ]
}
```

---

DATEI
ruin-states.json

PFAD
/game-data/history/ruin-states.json

INHALT
```
{
  "fresh_ruin": {},
  "weathered_ruin": {},
  "buried_ruin": {}
}
```

---

DATEI
upgrade-levels.json

PFAD
/game-data/housing/upgrade-levels.json

INHALT
```
{
  "house": [
    1,
    2,
    3
  ],
  "forge": [
    1,
    2,
    3,
    4
  ],
  "warehouse": [
    1,
    2,
    3
  ]
}
```

---

DATEI
affix-pool.json

PFAD
/game-data/items/affix-pool.json

INHALT
```
{
  "weapon": [
    "+strength",
    "+attack_speed",
    "+crit_chance"
  ],
  "armor": [
    "+health",
    "+stamina",
    "+resistance"
  ]
}
```

---

DATEI
base-items.json

PFAD
/game-data/items/base-items.json

INHALT
```
{
  "wolf_pelt": {
    "slot": "material"
  },
  "fang": {
    "slot": "material"
  },
  "ancient_coin": {
    "slot": "currency"
  }
}
```

---

DATEI
loot-tables.json

PFAD
/game-data/items/loot-tables.json

INHALT
```
{
  "wolf": [
    "wolf_pelt",
    "fang",
    "alpha_claw"
  ],
  "skeleton": [
    "bone_fragment",
    "rusted_blade",
    "grave_ring"
  ],
  "ruin_cache": [
    "ancient_coin",
    "relic_fragment",
    "forgotten_sigil"
  ]
}
```

---

DATEI
rarities.json

PFAD
/game-data/items/rarities.json

INHALT
```
{
  "common": {
    "weight": 100
  },
  "uncommon": {
    "weight": 50
  },
  "rare": {
    "weight": 15
  },
  "legendary": {
    "weight": 2
  }
}
```

---

DATEI
default-de.json

PFAD
/game-data/localization/default-de.json

INHALT
```
{
  "ui.inventory.title": "Inventar",
  "ui.chat.title": "Chat",
  "ui.skills.title": "Fertigkeiten"
}
```

---

DATEI
default-en.json

PFAD
/game-data/localization/default-en.json

INHALT
```
{
  "ui.inventory.title": "Inventory",
  "ui.chat.title": "Chat",
  "ui.skills.title": "Skills"
}
```

---

DATEI
ui-keys.json

PFAD
/game-data/localization/ui-keys.json

INHALT
```
{
  "hud.health": "Health",
  "hud.stamina": "Stamina",
  "ui.inventory": "Inventory",
  "ui.chat": "Chat"
}
```

---

DATEI
spell-schools.json

PFAD
/game-data/magic/spell-schools.json

INHALT
```
{
  "nature": [
    "root_bind",
    "healing_moss"
  ],
  "shadow": [
    "dark_bolt",
    "fear_whisper"
  ],
  "resonance": [
    "echo_wave",
    "field_tone"
  ],
  "protection": [
    "ward_shield",
    "holy_barrier"
  ],
  "ritual": [
    "ancestral_call",
    "portal_trace"
  ]
}
```

---

DATEI
mail-rules.json

PFAD
/game-data/mail/mail-rules.json

INHALT
```
{
  "allowItemAttachments": true,
  "maxBodyLength": 2000
}
```

---

DATEI
mutation-rules.json

PFAD
/game-data/monster/mutation-rules.json

INHALT
```
{
  "snow": [
    "frost_hide",
    "ice_resistance"
  ],
  "swamp": [
    "acid_bite",
    "dark_fur"
  ]
}
```

---

DATEI
mutation-rules.json

PFAD
/game-data/monsters/mutation-rules.json

INHALT
```
{
  "snow": [
    "frost_resistance"
  ],
  "swamp": [
    "acid_bite"
  ],
  "cave": [
    "dark_vision"
  ]
}
```

---

DATEI
mounts.json

PFAD
/game-data/mounts/mounts.json

INHALT
```
{
  "horse_basic": {
    "speed": 1.2
  },
  "giraffe_admin": {
    "speed": 2.0,
    "tags": [
      "gm",
      "giraffe",
      "affe"
    ]
  }
}
```

---

DATEI
channels.json

PFAD
/game-data/notifications/channels.json

INHALT
```
{
  "system": {},
  "quest": {},
  "combat": {},
  "gm": {}
}
```

---

DATEI
npc-archetypes.json

PFAD
/game-data/npc/npc-archetypes.json

INHALT
```
{
  "merchant": {},
  "guard": {},
  "oracle": {},
  "gossip": {
    "example": "Uschi die Geschminkte"
  }
}
```

---

DATEI
diplomacy-types.json

PFAD
/game-data/politics/diplomacy-types.json

INHALT
```
{
  "alliance": {},
  "trade": {},
  "non_aggression": {},
  "tribute": {},
  "sanction": {}
}
```

---

DATEI
government-types.json

PFAD
/game-data/politics/government-types.json

INHALT
```
{
  "monarchy": {},
  "council": {},
  "theocracy": {},
  "trade_republic": {},
  "warband": {}
}
```

---

DATEI
quest-registry.json

PFAD
/game-data/quests/quest-registry.json

INHALT
```
{
  "ruin_hunter": {
    "giver": "uschi_gossip",
    "objective": "find_ruins",
    "reward": {
      "gold": 100,
      "item": "ancient_coin"
    }
  }
}
```

---

DATEI
religions.json

PFAD
/game-data/religions/religions.json

INHALT
```
{
  "sun_order": {
    "ethos": "honor"
  },
  "shadow_cult": {
    "ethos": "secrecy"
  },
  "ancestor_faith": {
    "ethos": "lineage"
  }
}
```

---

DATEI
skills.json

PFAD
/game-data/skills/skills.json

INHALT
```
{
  "combat": {},
  "woodcutting": {},
  "mining": {},
  "smithing": {},
  "magic": {},
  "fishing": {}
}
```

---

DATEI
monster-spawns.json

PFAD
/game-data/spawns/monster-spawns.json

INHALT
```
{
  "forest": [
    "wolf",
    "boar"
  ],
  "mountain": [
    "stone_beast",
    "frost_wolf"
  ]
}
```

---

DATEI
npc-spawns.json

PFAD
/game-data/spawns/npc-spawns.json

INHALT
```
{
  "starter_town": [
    "merchant",
    "guard",
    "gossip"
  ],
  "capital": [
    "merchant",
    "guard",
    "chronicler"
  ]
}
```

---

DATEI
templates.json

PFAD
/game-data/structures/templates.json

INHALT
```
{
  "small_house": {
    "slots": 1,
    "defense": 1
  },
  "forge": {
    "slots": 2,
    "defense": 1
  },
  "watch_tower": {
    "slots": 1,
    "defense": 4
  },
  "gate": {
    "slots": 1,
    "defense": 5
  }
}
```

---

DATEI
upgrade-paths.json

PFAD
/game-data/structures/upgrade-paths.json

INHALT
```
{
  "village_wall": [
    "reinforced_wall",
    "stone_wall"
  ],
  "watch_tower": [
    "fortified_tower",
    "signal_tower"
  ]
}
```

---

DATEI
order-types.json

PFAD
/game-data/trade/order-types.json

INHALT
```
{
  "buy_order": {},
  "sell_order": {},
  "npc_restock": {}
}
```

---

DATEI
ui-keys.json

PFAD
/game-data/ui/ui-keys.json

INHALT
```
{
  "ui.inventory.title": "Inventory",
  "ui.chat.title": "Chat",
  "ui.skills.title": "Skills"
}
```

---

DATEI
tree-growth-rules.json

PFAD
/game-data/vegetation/tree-growth-rules.json

INHALT
```
{
  "oak": [
    "young",
    "spring",
    "summer",
    "autumn"
  ],
  "pine": [
    "young",
    "summer",
    "winter"
  ]
}
```

---

DATEI
presets.json

PFAD
/game-data/weather/presets.json

INHALT
```
{
  "clear": {
    "visibility": 1,
    "movePenalty": 0
  },
  "storm": {
    "visibility": 0.7,
    "movePenalty": 0.2
  }
}
```

---

DATEI
weather-presets.json

PFAD
/game-data/weather/weather-presets.json

INHALT
```
{
  "clear": {},
  "rain": {},
  "storm": {},
  "fog": {},
  "snow": {}
}
```

---

DATEI
wonders.json

PFAD
/game-data/world/wonders.json

INHALT
```
{
  "shadow_register_portal": {
    "type": "world_wonder",
    "effects": [
      "npc_alignment_shift",
      "siege_exception_zone"
    ]
  }
}
```

---

DATEI
world-events.json

PFAD
/game-data/world/world-events.json

INHALT
```
{
  "events": ["famine", "war", "migration", "oracle_surge", "ruin_opening"]
}
```

---

DATEI
README_INTEGRATIONS.md

PFAD
/integrations/README_INTEGRATIONS.md

INHALT
```
# Integrations

Hier werden produktive Integrationen abgelegt:
- Firebase
- AWS
- WebSocket Gateway
- Datenbankadapter

Wichtig: Keine Secrets hart in Dateien schreiben.
```

---

DATEI
backup-notes.md

PFAD
/integrations/aws/backup-notes.md

INHALT
```
# AWS Backup Notes

Snapshots, Archive und Recovery-Läufe können an AWS-Backups oder S3-artige Speicher gekoppelt werden.
```

---

DATEI
cache-notes.md

PFAD
/integrations/aws/cache-notes.md

INHALT
```
# AWS Cache Notes

Valkey/ElastiCache kann für schnelle Zustände genutzt werden:
- observer regions
- chat buffers
- session maps
- market snapshots
```

---

DATEI
deploy-notes.md

PFAD
/integrations/aws/deploy-notes.md

INHALT
```
# AWS Deploy Notes

- PostgreSQL adapter vorbereiten
- ElastiCache/Valkey Adapter vorbereiten
- WebSocket Gateway Bridge optional aktivieren
- Keine Secrets committen
```

---

DATEI
elasticacheAdapter.ts

PFAD
/integrations/aws/elasticacheAdapter.ts

INHALT
```
export function initElastiCache() {
  return {
    status: "elasticache-adapter-placeholder"
  };
}
```

---

DATEI
postgresAdapter.ts

PFAD
/integrations/aws/postgresAdapter.ts

INHALT
```
export function initPostgres() {
  return {
    status: "postgres-adapter-placeholder"
  };
}
```

---

DATEI
rds-notes.md

PFAD
/integrations/aws/rds-notes.md

INHALT
```
# AWS RDS Notes

- PostgreSQL ist Primärziel für relationale Persistenz
- Snapshot- und History-Daten können separat archiviert werden
- Zugangsdaten nur über Secrets
```

---

DATEI
security-notes.md

PFAD
/integrations/aws/security-notes.md

INHALT
```
# AWS Security Notes

- Secrets in Secret Manager / Parameter Store
- keine festen Credentials im Repo
- Audit und Telemetrie für Adminaktionen bevorzugen
```

---

DATEI
telemetry-notes.md

PFAD
/integrations/aws/telemetry-notes.md

INHALT
```
# AWS Telemetry Notes

Metriken und Logs können an CloudWatch/ähnliche Telemetriekanäle angebunden werden.
```

---

DATEI
auth-notes.md

PFAD
/integrations/firebase/auth-notes.md

INHALT
```
# Firebase Auth Notes

Optional kann Firebase Auth als Login-Vorderkante dienen.
Die eigentliche Weltlogik und Berechtigung bleiben serverseitig kontrolliert.
```

---

DATEI
firebase-config.ts

PFAD
/integrations/firebase/firebase-config.ts

INHALT
```
export const firebaseConfig = {
  note: "Fill with real Firebase credentials during deployment"
};
```

---

DATEI
firebase.json

PFAD
/integrations/firebase/firebase.json

INHALT
```
{
  "hosting": {
    "public": "client/public"
  }
}
```

---

DATEI
firestore.rules

PFAD
/integrations/firebase/firestore.rules

INHALT
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

DATEI
firestorePersistence.ts

PFAD
/integrations/firebase/firestorePersistence.ts

INHALT
```
export function initFirestorePersistence() {
  return {
    status: "firestore-persistence-placeholder"
  };
}
```

---

DATEI
hosting-notes.md

PFAD
/integrations/firebase/hosting-notes.md

INHALT
```
# Firebase Hosting Notes

- Client kann über Firebase Hosting/Vite-Build ausgeliefert werden
- Firestore optional für Persistenz
- Rekonstruktionspacks helfen No-Code-Agents
```

---

DATEI
mail-notes.md

PFAD
/integrations/firebase/mail-notes.md

INHALT
```
# Firebase Mail Notes

Mail- oder Benachrichtigungs-Frontends können mit Firebase-Komponenten gekoppelt werden.
Die eigentliche Spiellogik und Item-Zustellung bleiben serverseitig.
```

---

DATEI
notification-notes.md

PFAD
/integrations/firebase/notification-notes.md

INHALT
```
# Firebase Notification Notes

Firebase kann für Push- oder Frontend-Benachrichtigungen helfen.
Die spielrelevante Wahrheit bleibt auf dem Server.
```

---

DATEI
session-notes.md

PFAD
/integrations/firebase/session-notes.md

INHALT
```
# Firebase Session Notes

Firebase kann eine Login-Vorderkante darstellen.
Die Session-Wahrheit bleibt aber auf der Spielserver-Seite.
```

---

DATEI
manual_publish_notes.md

PFAD
/integrations/github/manual_publish_notes.md

INHALT
```
# GitHub Manual Publish Notes

Wenn kein direkter Connector verfügbar ist:
1. ZIP entpacken
2. Dateien ins Repo kopieren
3. git add .
4. git commit -m "Update Areloria working build"
5. git push
```

---

DATEI
awsGatewayBridge.ts

PFAD
/integrations/websocket-gateway/awsGatewayBridge.ts

INHALT
```
export function initAwsGatewayBridge() {
  return {
    status: "aws-websocket-gateway-placeholder"
  };
}
```

---

DATEI
package.json

PFAD
/server/package.json

INHALT
```
{
  "name": "areloria-server",
  "version": "0.2.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "@types/ws": "^8.5.12",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

---

DATEI
editorRoutes.ts

PFAD
/server/src/api/admin/editorRoutes.ts

INHALT
```
export class EditorRoutes {
  exec(command:any){ return { accepted:true, command }; }
}
```

---

DATEI
adminRoute.ts

PFAD
/server/src/api/adminRoute.ts

INHALT
```
export function adminRoute() {
  return {
    method: "POST",
    path: "/api/admin/command"
  };
}
```

---

DATEI
auctionRoute.ts

PFAD
/server/src/api/auctionRoute.ts

INHALT
```
export function auctionRoute() {
  return {
    method: "POST",
    path: "/api/auction/list"
  };
}
```

---

DATEI
authRoute.ts

PFAD
/server/src/api/authRoute.ts

INHALT
```
export function authRoute() {
  return {
    method: "POST",
    path: "/api/auth/login"
  };
}
```

---

DATEI
chatRoute.ts

PFAD
/server/src/api/chatRoute.ts

INHALT
```
export function chatRoute() {
  return {
    method: "POST",
    path: "/api/chat/send"
  };
}
```

---

DATEI
editorRoutes.ts

PFAD
/server/src/api/editorRoutes.ts

INHALT
```
export class EditorRoutes {
  run(commandLayer: any, command: any) {
    return commandLayer.execute(command);
  }
}
```

---

DATEI
healthRoute.ts

PFAD
/server/src/api/health/healthRoute.ts

INHALT
```
export function healthRoute(){
  return { ok:true, service:"areloria-server", timestamp: Date.now() };
}
```

---

DATEI
healthRoute.ts

PFAD
/server/src/api/healthRoute.ts

INHALT
```
export function healthRoute() {
  return {
    ok: true,
    service: "areloria-server",
    timestamp: Date.now()
  };
}
```

---

DATEI
index.ts

PFAD
/server/src/api/index.ts

INHALT
```
import { healthRoute } from "./healthRoute.js";
import { playerRoutes } from "./playerRoutes.js";
import { worldRoutes } from "./worldRoutes.js";
import { editorRoutes } from "./editorRoutes.js";
import { chatRoute } from "./chatRoute.js";
import { adminRoute } from "./adminRoute.js";
import { oracleRoute } from "./oracleRoute.js";
import { authRoute } from "./authRoute.js";
import { mailRoute } from "./mailRoute.js";
import { auctionRoute } from "./auctionRoute.js";

export const ApiRoutes = [
  healthRoute(),
  playerRoutes(),
  worldRoutes(),
  editorRoutes(),
  chatRoute(),
  adminRoute(),
  oracleRoute(),
  authRoute(),
  mailRoute(),
  auctionRoute()
];
```

---

DATEI
mailRoute.ts

PFAD
/server/src/api/mailRoute.ts

INHALT
```
export function mailRoute() {
  return {
    method: "POST",
    path: "/api/mail/send"
  };
}
```

---

DATEI
oracleRoute.ts

PFAD
/server/src/api/oracleRoute.ts

INHALT
```
export function oracleRoute() {
  return {
    method: "GET",
    path: "/api/oracle/vision"
  };
}
```

---

DATEI
playerRoutes.ts

PFAD
/server/src/api/playerRoutes.ts

INHALT
```
export class PlayerRoutes {
  listPlayers(players: any[]) {
    return players.map((p) => ({ id: p.id, name: p.name }));
  }
}
```

---

DATEI
playerRoutes.ts

PFAD
/server/src/api/rest/playerRoutes.ts

INHALT
```
export class PlayerRoutes {
  list(players:any[]){ return players; }
  get(player:any){ return player; }
}
```

---

DATEI
worldRoutes.ts

PFAD
/server/src/api/rest/worldRoutes.ts

INHALT
```
export class WorldRoutes {
  chunk(chunk:any){ return chunk; }
  activeRegions(regions:any[]){ return regions; }
}
```

---

DATEI
worldRoutes.ts

PFAD
/server/src/api/worldRoutes.ts

INHALT
```
export class WorldRoutes {
  getChunk(chunkSystem: any, x: number, y: number) {
    return chunkSystem.getChunk(x, y);
  }
}
```

---

DATEI
EnvTemplate.ts

PFAD
/server/src/config/EnvTemplate.ts

INHALT
```
export const EnvTemplate = {
  PORT: "3000",
  NODE_ENV: "development",
  DATABASE_URL: "postgres://user:pass@host:5432/db",
  CACHE_URL: "redis://host:6379",
  FIREBASE_PROJECT_ID: "your-project-id"
};
```

---

DATEI
FeatureFlags.ts

PFAD
/server/src/config/FeatureFlags.ts

INHALT
```
export const FeatureFlags = {
  enableOracle: true,
  enableGMEditor: true,
  enableNPCPolitics: true,
  enableWorldSnapshots: true,
  enableWeather: true,
  enableSeasons: true
} as const;
```

---

DATEI
GameConfig.ts

PFAD
/server/src/config/GameConfig.ts

INHALT
```
export const GameConfig = {
  chunkSize: 64,
  tickRateMs: 100,
  defaultPort: 3000,
  maxObserverRadius: 6,
  matrixCurrency: "matrix_energy"
} as const;
```

---

DATEI
ServerBootstrap.ts

PFAD
/server/src/core/ServerBootstrap.ts

INHALT
```
import express from "express";
import { createServer } from "node:http";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { WorldTick } from "./WorldTick.js";

export class ServerBootstrap {
  start() {
    const app = express();
    const httpServer = createServer(app);

    app.get("/health", (_req, res) => {
      res.json({
        ok: true,
        project: "ARELORIAN MMORPG",
        version: "0.2.0"
      });
    });

    const ws = new GameWebSocketServer(httpServer);
    ws.start();

    const tick = new WorldTick();
    const port = Number(process.env.PORT || 3000);

    httpServer.listen(port, () => {
      console.log(`Arelorian server listening on ${port}`);
      tick.start();
    });
  }
}
```

---

DATEI
WorldTick.ts

PFAD
/server/src/core/WorldTick.ts

INHALT
```
export class WorldTick {
  private timer: NodeJS.Timeout | null = null;
  private tickCount = 0;

  start() {
    this.timer = setInterval(() => this.tick(), 100);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  tick() {
    this.tickCount += 1;
    if (this.tickCount % 10 === 0) {
      console.log("World Tick", this.tickCount);
    }
  }
}
```

---

DATEI
index.ts

PFAD
/server/src/index.ts

INHALT
```
import { ServerBootstrap } from "./core/ServerBootstrap.js";

new ServerBootstrap().start();
```

---

DATEI
AchievementRegistry.ts

PFAD
/server/src/modules/achievements/AchievementRegistry.ts

INHALT
```
export const AchievementRegistry = {
  first_blood: { id: "first_blood", category: "combat" },
  ruin_discoverer: { id: "ruin_discoverer", category: "exploration" },
  master_smith: { id: "master_smith", category: "crafting" }
};
```

---

DATEI
AchievementSystem.ts

PFAD
/server/src/modules/achievements/AchievementSystem.ts

INHALT
```
export class AchievementSystem {
  private unlocked = new Map<string, Set<string>>();

  unlock(playerId: string, achievementId: string) {
    if (!this.unlocked.has(playerId)) this.unlocked.set(playerId, new Set());
    this.unlocked.get(playerId)!.add(achievementId);
    return achievementId;
  }

  list(playerId: string) {
    return [...(this.unlocked.get(playerId) || new Set())];
  }
}
```

---

DATEI
AdminAuditLog.ts

PFAD
/server/src/modules/admin/AdminAuditLog.ts

INHALT
```
export class AdminAuditLog {
  private entries:any[] = [];
  write(entry:any) { this.entries.push({ ts: Date.now(), ...entry }); }
  all() { return this.entries; }
}
```

---

DATEI
AdminMountRegistry.ts

PFAD
/server/src/modules/admin/AdminMountRegistry.ts

INHALT
```
export const AdminMountRegistry = {
  gm_giraffe: {
    id: "gm_giraffe",
    title: "Gaffende Giraffe",
    abilities: ["fly", "teleport", "world_edit", "spawn_entity"]
  }
};
```

---

DATEI
AdminRollback.ts

PFAD
/server/src/modules/admin/AdminRollback.ts

INHALT
```
export class AdminRollback {
  revert(snapshot:any){
    return {
      reverted: true,
      snapshot
    };
  }
}
```

---

DATEI
EditorActionLog.ts

PFAD
/server/src/modules/admin/EditorActionLog.ts

INHALT
```
export class EditorActionLog {
  private actions:any[] = [];
  record(action:any){
    this.actions.push({ ...action, ts: Date.now() });
    return action;
  }
  all(){
    return this.actions;
  }
}
```

---

DATEI
GMCommandLayer.ts

PFAD
/server/src/modules/admin/GMCommandLayer.ts

INHALT
```
export class GMCommandLayer {
  execute(command:string, payload:any = {}) {
    return { command, payload, executedAt: Date.now() };
  }
}
```

---

DATEI
GiraffeAdminMount.ts

PFAD
/server/src/modules/admin/GiraffeAdminMount.ts

INHALT
```
export class GiraffeAdminMount {
  summon(ownerId:string) {
    return {
      ownerId,
      mountId: "gm_giraffe",
      summonedAt: Date.now()
    };
  }
}
```

---

DATEI
PermissionMatrix.ts

PFAD
/server/src/modules/admin/PermissionMatrix.ts

INHALT
```
export const PermissionMatrix = {
  superadmin: ["world_edit", "spawn_any", "teleport", "oracle_admin"],
  gm: ["world_edit", "spawn_any", "teleport"],
  moderator: ["chat_moderate", "player_review"],
  observer: ["spectate"]
};
```

---

DATEI
RoleGuard.ts

PFAD
/server/src/modules/admin/RoleGuard.ts

INHALT
```
export class RoleGuard {
  can(role: string, permission: string, matrix: Record<string, string[]>) {
    return (matrix[role] || []).includes(permission);
  }
}
```

---

DATEI
AgingSystem.ts

PFAD
/server/src/modules/aging/AgingSystem.ts

INHALT
```
export class AgingSystem {
  age(entity: any, years: number = 1) {
    entity.age = (entity.age || 0) + years;
    return entity.age;
  }
}
```

---

DATEI
AgingSystem.ts

PFAD
/server/src/modules/ai/AgingSystem.ts

INHALT
```
export class AgingSystem {
  age(entity:any, years:number = 1) {
    entity.age = (entity.age ?? 0) + years;
    return entity.age;
  }
}
```

---

DATEI
BehaviorTree.ts

PFAD
/server/src/modules/ai/BehaviorTree.ts

INHALT
```
export class BehaviorTree {
  run(npc: any) {
    if (npc.needs?.sleep) return "sleep";
    if (npc.needs?.hunger) return "eat";
    if (npc.job) return "work";
    return "wander";
  }
}
```

---

DATEI
FamilyGenerationSystem.ts

PFAD
/server/src/modules/ai/FamilyGenerationSystem.ts

INHALT
```
export class FamilyGenerationSystem {
  createChild(parentA:any, parentB:any, childId:string) {
    return {
      id: childId,
      parents: [parentA.id, parentB.id],
      house: parentA.house ?? parentB.house ?? "unknown_house"
    };
  }
}
```

---

DATEI
NPCBrain.ts

PFAD
/server/src/modules/ai/NPCBrain.ts

INHALT
```
import { BehaviorTree } from "./BehaviorTree.js";

export class NPCBrain {
  private tree = new BehaviorTree();

  update(npc: any) {
    const action = this.tree.run(npc);
    npc.currentAction = action;
    return action;
  }
}
```

---

DATEI
NPCSchedules.ts

PFAD
/server/src/modules/ai/NPCSchedules.ts

INHALT
```
export const NPCSchedules = {
  merchant: [
    { hour: 6, action: "wake" },
    { hour: 8, action: "open_shop" },
    { hour: 18, action: "close_shop" },
    { hour: 22, action: "sleep" }
  ],
  guard: [
    { hour: 6, action: "patrol" },
    { hour: 20, action: "rest" },
    { hour: 23, action: "sleep" }
  ]
};
```

---

DATEI
TaskSystem.ts

PFAD
/server/src/modules/ai/TaskSystem.ts

INHALT
```
export class TaskSystem {
  execute(npc: any, action: string) {
    switch (action) {
      case "wander":
        return { action, destination: "random_nearby" };
      case "work":
        return { action, destination: npc.jobLocation ?? "workplace" };
      case "eat":
        return { action, destination: "tavern" };
      case "sleep":
        return { action, destination: "home" };
      default:
        return { action: "idle" };
    }
  }
}
```

---

DATEI
PerformanceBudget.ts

PFAD
/server/src/modules/analytics/PerformanceBudget.ts

INHALT
```
export const PerformanceBudget = {
  activeChunksPerObserver: 9,
  maxNPCUpdatesPerTick: 200,
  maxEventsPerTick: 50
};
```

---

DATEI
TelemetryCollector.ts

PFAD
/server/src/modules/analytics/TelemetryCollector.ts

INHALT
```
export class TelemetryCollector {
  private events: any[] = [];

  record(type: string, payload: any = {}) {
    this.events.push({ type, payload, createdAt: Date.now() });
  }

  list() {
    return this.events;
  }
}
```

---

DATEI
editorRoutes.ts

PFAD
/server/src/modules/api/editorRoutes.ts

INHALT
```
export function editorRoutes() {
  return [
    { path: "/api/editor/place", method: "POST" },
    { path: "/api/editor/delete", method: "POST" }
  ];
}
```

---

DATEI
healthRoute.ts

PFAD
/server/src/modules/api/healthRoute.ts

INHALT
```
export function healthRoute() {
  return {
    path: "/health",
    method: "GET"
  };
}
```

---

DATEI
playerRoutes.ts

PFAD
/server/src/modules/api/playerRoutes.ts

INHALT
```
export function playerRoutes() {
  return [
    { path: "/api/player/profile", method: "GET" },
    { path: "/api/player/inventory", method: "GET" }
  ];
}
```

---

DATEI
worldRoutes.ts

PFAD
/server/src/modules/api/worldRoutes.ts

INHALT
```
export function worldRoutes() {
  return [
    { path: "/api/world/chunk", method: "GET" },
    { path: "/api/world/events", method: "GET" }
  ];
}
```

---

DATEI
AssetRegistry.ts

PFAD
/server/src/modules/asset-registry/AssetRegistry.ts

INHALT
```
export class AssetRegistry {
  private assets = new Map<string, any>();

  register(id: string, data: any) {
    this.assets.set(id, data);
  }

  get(id: string) {
    return this.assets.get(id) ?? null;
  }

  list() {
    return Array.from(this.assets.entries()).map(([id, data]) => ({ id, ...data }));
  }
}
```

---

DATEI
NPCAssets.ts

PFAD
/server/src/modules/asset-registry/NPCAssets.ts

INHALT
```
export const NPCAssets = {
  uschi_gossip: {
    assetId: "uschi_gossip",
    model: "/assets/models/characters/uschi_gossip.glb",
    category: "npc",
    animations: ["idle", "talk", "laugh", "cough"]
  },
  warrior_male: {
    assetId: "warrior_male",
    model: "/assets/models/characters/warrior_male.glb",
    category: "player_or_npc",
    animations: ["idle", "walk", "attack"]
  },
  warrior_female: {
    assetId: "warrior_female",
    model: "/assets/models/characters/warrior_female.glb",
    category: "player_or_npc",
    animations: ["idle", "walk", "attack"]
  }
};
```

---

DATEI
StructureAssets.ts

PFAD
/server/src/modules/asset-registry/StructureAssets.ts

INHALT
```
export const StructureAssets = {
  castle_wall: {
    assetId: "castle_wall",
    type: "structure",
    model: "/assets/models/buildings/castle_wall.glb",
    collision: true
  },
  castle_gate: {
    assetId: "castle_gate",
    type: "interactive_structure",
    model: "/assets/models/buildings/castle_gate.glb",
    collision: true,
    states: ["open", "closed", "locked", "damaged", "destroyed"]
  },
  castle_watch_tower: {
    assetId: "castle_watch_tower",
    type: "defense_structure",
    model: "/assets/models/buildings/castle_watch_tower.glb",
    collision: true
  }
};
```

---

DATEI
VegetationAssets.ts

PFAD
/server/src/modules/asset-registry/VegetationAssets.ts

INHALT
```
export const VegetationAssets = {
  tree_oak_young: { model: "/assets/models/vegetation/tree_oak_young.glb", category: "vegetation", growthStage: 0 },
  tree_oak_spring: { model: "/assets/models/vegetation/tree_oak_spring.glb", category: "vegetation", growthStage: 1 },
  tree_oak_summer: { model: "/assets/models/vegetation/tree_oak_summer.glb", category: "vegetation", growthStage: 2 },
  tree_oak_autumn: { model: "/assets/models/vegetation/tree_oak_autumn.glb", category: "vegetation", growthStage: 3 }
};
```

---

DATEI
AssetImportQueue.ts

PFAD
/server/src/modules/assets/AssetImportQueue.ts

INHALT
```
export class AssetImportQueue {
  private queue:any[] = [];
  add(asset:any){
    this.queue.push({ ...asset, queuedAt: Date.now() });
    return asset;
  }
  list(){
    return this.queue;
  }
}
```

---

DATEI
AssetValidationReport.ts

PFAD
/server/src/modules/assets/AssetValidationReport.ts

INHALT
```
export class AssetValidationReport {
  validate(meta:any){
    return {
      ok: Boolean(meta?.assetId && meta?.path),
      assetId: meta?.assetId ?? null
    };
  }
}
```

---

DATEI
ContentManifest.ts

PFAD
/server/src/modules/assets/ContentManifest.ts

INHALT
```
export class ContentManifest {
  private entries:any[] = [];
  add(entry:any){
    this.entries.push(entry);
    return entry;
  }
  all(){
    return this.entries;
  }
}
```

---

DATEI
AuctionFees.ts

PFAD
/server/src/modules/auction/AuctionFees.ts

INHALT
```
export const AuctionFees = {
  listingFeePercent: 0.02,
  saleTaxPercent: 0.05
};
```

---

DATEI
AuctionHouse.ts

PFAD
/server/src/modules/auction/AuctionHouse.ts

INHALT
```
export class AuctionHouse {
  private listings: any[] = [];

  list(item: any, sellerId: string, price: number) {
    const listing = { item, sellerId, price, createdAt: Date.now() };
    this.listings.push(listing);
    return listing;
  }

  all() {
    return this.listings;
  }
}
```

---

DATEI
AuctionSettlement.ts

PFAD
/server/src/modules/auction/AuctionSettlement.ts

INHALT
```
export class AuctionSettlement {
  settle(price: number, feePercent: number) {
    const fee = price * feePercent;
    return {
      gross: price,
      fee,
      net: price - fee
    };
  }
}
```

---

DATEI
AmbienceRegistry.ts

PFAD
/server/src/modules/audio/AmbienceRegistry.ts

INHALT
```
export const AmbienceRegistry = {
  forest: ["birds", "wind"],
  desert: ["wind", "sand"],
  mountain: ["wind", "stone_echo"],
  town: ["market", "crowd"]
};
```

---

DATEI
MusicZones.ts

PFAD
/server/src/modules/audio/MusicZones.ts

INHALT
```
export const MusicZones = {
  starter_town: "theme_town_01",
  ruins: "theme_ruins_01",
  kingdom_capital: "theme_capital_01",
  shadow_portal: "theme_shadow_01"
};
```

---

DATEI
PlayerRestore.ts

PFAD
/server/src/modules/auth/PlayerRestore.ts

INHALT
```
export class PlayerRestore {
  restore(saved: any) {
    return {
      ...saved,
      restoredAt: Date.now()
    };
  }
}
```

---

DATEI
SessionHeartbeat.ts

PFAD
/server/src/modules/auth/SessionHeartbeat.ts

INHALT
```
export class SessionHeartbeat {
  ping(sessionId:string){
    return {
      sessionId,
      heartbeatAt: Date.now()
    };
  }
}
```

---

DATEI
SessionReconnectHandler.ts

PFAD
/server/src/modules/auth/SessionReconnectHandler.ts

INHALT
```
export class SessionReconnectHandler {
  reconnect(sessionRegistry: any, sessionId: string) {
    return sessionRegistry.get(sessionId);
  }
}
```

---

DATEI
SessionRegistry.ts

PFAD
/server/src/modules/auth/SessionRegistry.ts

INHALT
```
export class SessionRegistry {
  private sessions = new Map<string, any>();

  set(sessionId: string, data: any) {
    this.sessions.set(sessionId, data);
  }

  get(sessionId: string) {
    return this.sessions.get(sessionId) || null;
  }

  remove(sessionId: string) {
    this.sessions.delete(sessionId);
  }
}
```

---

DATEI
WebSocketPresence.ts

PFAD
/server/src/modules/auth/WebSocketPresence.ts

INHALT
```
export class WebSocketPresence {
  setOnline(playerId:string){
    return { playerId, online: true, changedAt: Date.now() };
  }
}
```

---

DATEI
ModuleRegistry.ts

PFAD
/server/src/modules/bootstrap/ModuleRegistry.ts

INHALT
```
export class ModuleRegistry {
  private modules = new Map<string, any>();

  register(name: string, instance: any) {
    this.modules.set(name, instance);
    return instance;
  }

  get(name: string) {
    return this.modules.get(name) || null;
  }

  list() {
    return [...this.modules.keys()];
  }
}
```

---

DATEI
SystemWiring.ts

PFAD
/server/src/modules/bootstrap/SystemWiring.ts

INHALT
```
export class SystemWiring {
  wire(registry: any) {
    return {
      wired: true,
      modules: registry.list ? registry.list() : []
    };
  }
}
```

---

DATEI
BrainFieldAnalyzer.ts

PFAD
/server/src/modules/brain/BrainFieldAnalyzer.ts

INHALT
```
export class BrainFieldAnalyzer {
  analyzeField(values: unknown[]) {
    return {
      activeNodes: values.length,
      result: "field-analysis-placeholder"
    };
  }
}
```

---

DATEI
HeuristicWorldBrain.ts

PFAD
/server/src/modules/brain/HeuristicWorldBrain.ts

INHALT
```
export class HeuristicWorldBrain {
  private readonly nodes = new Array(13).fill(null);

  analyze(input: unknown) {
    return {
      nodes: this.nodes.length,
      summary: "analysis-placeholder",
      input
    };
  }
}
```

---

DATEI
ChatChannels.ts

PFAD
/server/src/modules/chat/ChatChannels.ts

INHALT
```
export const ChatChannels = {
  global: { moderated: true },
  trade: { moderated: true },
  local: { moderated: false },
  guild: { moderated: false }
};
```

---

DATEI
ChatModeration.ts

PFAD
/server/src/modules/chat/ChatModeration.ts

INHALT
```
export class ChatModeration {
  flagMessage(content: string) {
    const banned = ["spam"];
    return banned.some(word => content.toLowerCase().includes(word));
  }
}
```

---

DATEI
ChatService.ts

PFAD
/server/src/modules/chat/ChatService.ts

INHALT
```
export class ChatService {
  sendMessage(authorId: string, channel: string, content: string) {
    return {
      authorId,
      channel,
      content,
      createdAt: Date.now()
    };
  }
}
```

---

DATEI
CivilizationEngine.ts

PFAD
/server/src/modules/civilization/CivilizationEngine.ts

INHALT
```
export class CivilizationEngine {
  createVillage(guildMembers: number) {
    if (guildMembers < 50) return null;
    return {
      type: "village",
      population: guildMembers,
      createdAt: Date.now()
    };
  }
}
```

---

DATEI
CivilizationRankings.ts

PFAD
/server/src/modules/civilization/CivilizationRankings.ts

INHALT
```
export class CivilizationRankings {
  rank(civs: any[]) {
    return [...civs].sort((a, b) => (b.population || 0) - (a.population || 0));
  }
}
```

---

DATEI
KingdomLedger.ts

PFAD
/server/src/modules/civilization/KingdomLedger.ts

INHALT
```
export class KingdomLedger {
  private entries: any[] = [];
  record(entry: any) {
    this.entries.push({ ...entry, ts: Date.now() });
    return entry;
  }
  all() {
    return this.entries;
  }
}
```

---

DATEI
SettlementSystem.ts

PFAD
/server/src/modules/civilization/SettlementSystem.ts

INHALT
```
export class SettlementSystem {
  createSettlement(type: "village" | "city" | "kingdom" | "nation", ownerId: string) {
    return {
      type,
      ownerId,
      createdAt: Date.now()
    };
  }
}
```

---

DATEI
CombatSystem.ts

PFAD
/server/src/modules/combat/CombatSystem.ts

INHALT
```
export class CombatSystem {
  attack(attacker: any, defender: any) {
    if (attacker.stamina <= 0) return { success: false, reason: "no_stamina" };

    attacker.stamina -= 10;

    const hitChance = this.hitChance(attacker, defender);
    if (Math.random() > hitChance) {
      return { success: true, hit: false, damage: 0 };
    }

    const damage = this.calculateDamage(attacker, defender);
    defender.health = Math.max(0, defender.health - damage);

    return {
      success: true,
      hit: true,
      damage,
      defenderHealth: defender.health
    };
  }

  hitChance(attacker: any, defender: any) {
    const atk = attacker.skills?.combat?.level ?? 1;
    const def = defender.skills?.combat?.level ?? 1;
    return Math.min(0.95, Math.max(0.1, atk / (atk + def)));
  }

  calculateDamage(attacker: any, defender: any) {
    const atk = attacker.skills?.combat?.level ?? 1;
    const def = defender.skills?.combat?.level ?? 1;
    const base = 5 + atk;
    const mitigation = Math.floor(def * 0.3);
    return Math.max(1, base - mitigation + Math.floor(Math.random() * 4));
  }
}
```

---

DATEI
ConstructionQueue.ts

PFAD
/server/src/modules/construction/ConstructionQueue.ts

INHALT
```
export class ConstructionQueue {
  private queue:any[] = [];
  enqueue(task:any) { this.queue.push(task); return task; }
  next() { return this.queue.shift() ?? null; }
}
```

---

DATEI
UpgradeSystem.ts

PFAD
/server/src/modules/construction/UpgradeSystem.ts

INHALT
```
export class UpgradeSystem {
  upgrade(structure:any, targetLevel:number) {
    structure.level = Math.max(structure.level ?? 1, targetLevel);
    return structure;
  }
}
```

---

DATEI
CraftingStationRegistry.ts

PFAD
/server/src/modules/crafting/CraftingStationRegistry.ts

INHALT
```
export const CraftingStationRegistry = {
  forge: { skills: ["smithing"] },
  alchemy_table: { skills: ["magic", "crafting"] },
  workbench: { skills: ["crafting", "woodcutting"] }
};
```

---

DATEI
CraftingSystem.ts

PFAD
/server/src/modules/crafting/CraftingSystem.ts

INHALT
```
export class CraftingSystem {
  canCraft(player:any, recipe:any, inventory:any[]) {
    if ((player.skills?.[recipe.skill]?.level ?? 0) < (recipe.requiredLevel ?? 1)) return false;
    return recipe.ingredients.every((ing:any) => inventory.some((item:any) => item.id === ing.id && (item.amount ?? 1) >= ing.amount));
  }

  craft(player:any, recipe:any) {
    return {
      crafted: true,
      itemId: recipe.result.id,
      amount: recipe.result.amount ?? 1,
      xp: recipe.xp ?? 0
    };
  }
}
```

---

DATEI
RecipeMatcher.ts

PFAD
/server/src/modules/crafting/RecipeMatcher.ts

INHALT
```
export class RecipeMatcher {
  match(inputIds:string[], recipes:any[]){
    return recipes.find((r:any)=> JSON.stringify([...r.inputs].sort()) === JSON.stringify([...inputIds].sort())) || null;
  }
}
```

---

DATEI
RecipeRegistry.ts

PFAD
/server/src/modules/crafting/RecipeRegistry.ts

INHALT
```
export const RecipeRegistry = {
  iron_sword: {
    id: "iron_sword",
    skill: "smithing",
    requiredLevel: 5,
    ingredients: [
      { id: "iron_ingot", amount: 2 },
      { id: "wood_handle", amount: 1 }
    ],
    result: { id: "iron_sword", amount: 1 },
    xp: 20
  }
};
```

---

DATEI
DialogueContext.ts

PFAD
/server/src/modules/dialogue/DialogueContext.ts

INHALT
```
export function buildDialogueContext(npc: any, player: any, world: any) {
  return {
    npcId: npc.id,
    playerId: player?.id ?? null,
    traits: npc.traits ?? {},
    lineage: npc.lineage ?? null,
    culture: npc.culture ?? null,
    religion: npc.religion ?? null,
    memory: npc.memory ?? [],
    worldEvents: world?.events ?? [],
    oracleSignals: world?.oracleSignals ?? []
  };
}
```

---

DATEI
DialogueEngine.ts

PFAD
/server/src/modules/dialogue/DialogueEngine.ts

INHALT
```
import { buildDialogueContext } from "./DialogueContext.js";
import { DialogueGenerator } from "./DialogueGenerator.js";

export class DialogueEngine {
  private generator = new DialogueGenerator();

  talk(npc: any, player: any, world: any) {
    const context = buildDialogueContext(npc, player, world);
    return this.generator.generate(context);
  }
}
```

---

DATEI
DialogueGenerator.ts

PFAD
/server/src/modules/dialogue/DialogueGenerator.ts

INHALT
```
import { DialogueTemplates } from "./DialogueTemplates.js";

export class DialogueGenerator {
  generate(context: any) {
    const mood = context.traits?.aggression > 0.7 ? "warning" : "greeting";
    const pool = DialogueTemplates[mood] ?? ["..."];
    return {
      line: pool[Math.floor(Math.random() * pool.length)],
      contextSummary: {
        culture: context.culture,
        religion: context.religion
      }
    };
  }
}
```

---

DATEI
DialogueMemoryBridge.ts

PFAD
/server/src/modules/dialogue/DialogueMemoryBridge.ts

INHALT
```
export class DialogueMemoryBridge {
  blend(memory:any[], tags:string[]){
    return {
      memoryCount: memory.length,
      tags
    };
  }
}
```

---

DATEI
DialogueTagRules.ts

PFAD
/server/src/modules/dialogue/DialogueTagRules.ts

INHALT
```
export const DialogueTagRules = {
  memory_heavy: ["history", "fear", "warning"],
  oracle_style: ["prophecy", "vision", "omen"],
  gossip_style: ["rumor", "tavern", "street"]
};
```

---

DATEI
DialogueTemplates.ts

PFAD
/server/src/modules/dialogue/DialogueTemplates.ts

INHALT
```
export const DialogueTemplates = {
  greeting: [
    "Na Süßer, suchst du Abenteuer?",
    "Du siehst aus, als hättest du Ärger im Gepäck.",
    "Setz dich, ich erzähl dir was Interessantes."
  ],
  rumor: [
    "Im Nordwald wurden alte Mauern gesehen.",
    "Die Händler reden von seltsamen Kreaturen im Moor.",
    "Ein Königreich im Osten ist nervös."
  ],
  warning: [
    "Geh da nicht unvorbereitet hinein.",
    "Manche Wege fressen ganze Blutlinien.",
    "Nicht jede Ruine will entdeckt werden."
  ]
};
```

---

DATEI
DiplomacyEngine.ts

PFAD
/server/src/modules/diplomacy/DiplomacyEngine.ts

INHALT
```
export class DiplomacyEngine {
  makeTreaty(a: string, b: string, type: string) {
    return { from: a, to: b, type, signedAt: Date.now() };
  }
}
```

---

DATEI
DungeonGenerator.ts

PFAD
/server/src/modules/dungeon/DungeonGenerator.ts

INHALT
```
export class DungeonGenerator {
  generate(seed: number) {
    const rooms = [];
    const roomCount = 4 + Math.floor(Math.abs(Math.sin(seed)) * 6);
    for (let i = 0; i < roomCount; i++) {
      rooms.push({
        id: i,
        type: this.randomRoom(seed + i),
        danger: 1 + (i % 5)
      });
    }
    return { seed, rooms };
  }

  randomRoom(seed: number) {
    const types = [
      "hall",
      "treasure_room",
      "monster_lair",
      "collapsed_passage",
      "ancient_shrine"
    ];
    return types[Math.abs(Math.floor(seed)) % types.length];
  }
}
```

---

DATEI
BuyOrders.ts

PFAD
/server/src/modules/economy/BuyOrders.ts

INHALT
```
export class BuyOrders {
  private orders:any[] = [];
  place(order:any){
    this.orders.push({ ...order, type: "buy", createdAt: Date.now() });
    return order;
  }
}
```

---

DATEI
EconomyEngine.ts

PFAD
/server/src/modules/economy/EconomyEngine.ts

INHALT
```
export class EconomyEngine {
  private markets = new Map<string, { goods: Record<string, number> }>();

  registerMarket(id: string) {
    this.markets.set(id, { goods: {} });
  }

  trade(marketId: string, item: string, amount: number) {
    const market = this.markets.get(marketId);
    if (!market) return null;
    if (!market.goods[item]) market.goods[item] = 0;
    market.goods[item] += amount;
    return market.goods[item];
  }
}
```

---

DATEI
MarketExpansion.ts

PFAD
/server/src/modules/economy/MarketExpansion.ts

INHALT
```
export class MarketExpansion {
  calculateRegionalModifier(region: string) {
    if (region === "warzone") return 1.5;
    if (region === "trade_hub") return 0.9;
    return 1.0;
  }

  applyModifier(basePrice: number, modifier: number) {
    return Math.max(1, Math.round(basePrice * modifier));
  }
}
```

---

DATEI
MarketLedger.ts

PFAD
/server/src/modules/economy/MarketLedger.ts

INHALT
```
export class MarketLedger {
  private entries:any[] = [];
  record(entry:any){ this.entries.push({ timestamp:Date.now(), ...entry }); }
  all(){ return this.entries; }
}
```

---

DATEI
MarketOrders.ts

PFAD
/server/src/modules/economy/MarketOrders.ts

INHALT
```
export class MarketOrders {
  private orders: any[] = [];

  place(order: any) {
    this.orders.push({ ...order, createdAt: Date.now() });
    return order;
  }

  list() {
    return this.orders;
  }
}
```

---

DATEI
MatrixEnergySystem.ts

PFAD
/server/src/modules/economy/MatrixEnergySystem.ts

INHALT
```
export class MatrixEnergySystem {
  private balances = new Map<string, number>();

  add(playerId: string, amount: number) {
    const current = this.balances.get(playerId) || 0;
    this.balances.set(playerId, current + amount);
  }

  consume(playerId: string, amount: number) {
    const current = this.balances.get(playerId) || 0;
    if (current < amount) return false;
    this.balances.set(playerId, current - amount);
    return true;
  }

  getBalance(playerId: string) {
    return this.balances.get(playerId) || 0;
  }
}
```

---

DATEI
NPCTradeAI.ts

PFAD
/server/src/modules/economy/NPCTradeAI.ts

INHALT
```
export class NPCTradeAI {
  decideTrade(npc: any, market: any) {
    return {
      npcId: npc.id,
      chosenMarket: market.id ?? "unknown",
      action: "sell"
    };
  }
}
```

---

DATEI
PlayerMarket.ts

PFAD
/server/src/modules/economy/PlayerMarket.ts

INHALT
```
export class PlayerMarket {
  private listings:any[] = [];
  addListing(listing:any){
    this.listings.push({ ...listing, createdAt: Date.now() });
    return listing;
  }
  all(){
    return this.listings;
  }
}
```

---

DATEI
PriceBalancer.ts

PFAD
/server/src/modules/economy/PriceBalancer.ts

INHALT
```
export class PriceBalancer {
  rebalance(basePrice: number, supply: number, demand: number) {
    const ratio = demand / Math.max(1, supply);
    return Math.max(1, basePrice * ratio);
  }
}
```

---

DATEI
SellOrders.ts

PFAD
/server/src/modules/economy/SellOrders.ts

INHALT
```
export class SellOrders {
  private orders:any[] = [];
  place(order:any){
    this.orders.push({ ...order, type: "sell", createdAt: Date.now() });
    return order;
  }
}
```

---

DATEI
TaxLedger.ts

PFAD
/server/src/modules/economy/TaxLedger.ts

INHALT
```
export class TaxLedger {
  private entries: any[] = [];

  record(cityId: string, amount: number, source: string) {
    const entry = { cityId, amount, source, createdAt: Date.now() };
    this.entries.push(entry);
    return entry;
  }

  all() {
    return this.entries;
  }
}
```

---

DATEI
TradeRoutes.ts

PFAD
/server/src/modules/economy/TradeRoutes.ts

INHALT
```
export class TradeRoutes {
  createRoute(a: string, b: string) {
    return {
      from: a,
      to: b,
      active: true
    };
  }
}
```

---

DATEI
EquipmentSystem.ts

PFAD
/server/src/modules/equipment/EquipmentSystem.ts

INHALT
```
export class EquipmentSystem {
  equip(player:any, slot:string, item:any){
    if(!player.equipment) player.equipment = {};
    player.equipment[slot] = item;
    return player.equipment;
  }
}
```

---

DATEI
DisasterEngine.ts

PFAD
/server/src/modules/events/DisasterEngine.ts

INHALT
```
export class DisasterEngine {
  createDisaster(region:string){
    const list = ["fire","storm","blight","collapse"];
    return { region, type: list[Math.floor(Math.random()*list.length)] };
  }
}
```

---

DATEI
EventScheduler.ts

PFAD
/server/src/modules/events/EventScheduler.ts

INHALT
```
export class EventScheduler {
  private events:any[] = [];
  schedule(event:any){ this.events.push(event); return event; }
  due(){ return this.events; }
}
```

---

DATEI
MigrationEngine.ts

PFAD
/server/src/modules/events/MigrationEngine.ts

INHALT
```
export class MigrationEngine {
  migrate(groupId: string, from: string, to: string) {
    return {
      type: "migration",
      groupId,
      from,
      to,
      startedAt: Date.now()
    };
  }
}
```

---

DATEI
WarForecast.ts

PFAD
/server/src/modules/events/WarForecast.ts

INHALT
```
export class WarForecast {
  evaluate(tension:number){ return { warRisk: Math.min(1, Math.max(0, tension)) }; }
}
```

---

DATEI
WorldEventLayer.ts

PFAD
/server/src/modules/events/WorldEventLayer.ts

INHALT
```
export class WorldEventLayer {
  create(type:string, payload:any = {}){
    return { type, payload, createdAt: Date.now() };
  }
}
```

---

DATEI
FactionMemory.ts

PFAD
/server/src/modules/faction/FactionMemory.ts

INHALT
```
export class FactionMemory {
  private memory = new Map<string, any[]>();
  remember(factionId:string, event:any){
    if(!this.memory.has(factionId)) this.memory.set(factionId, []);
    this.memory.get(factionId)!.push({ ts: Date.now(), event });
  }
  recall(factionId:string){
    return this.memory.get(factionId) || [];
  }
}
```

---

DATEI
FactionSystem.ts

PFAD
/server/src/modules/faction/FactionSystem.ts

INHALT
```
export class FactionSystem {
  private factions = new Map<string, any>();
  create(id:string, data:any){
    this.factions.set(id, { id, ...data });
    return this.factions.get(id);
  }
  get(id:string){
    return this.factions.get(id);
  }
}
```

---

DATEI
FarmingSystem.ts

PFAD
/server/src/modules/farming/FarmingSystem.ts

INHALT
```
export class FarmingSystem {
  plant(seedId: string, plotId: string) {
    return { seedId, plotId, plantedAt: Date.now() };
  }
}
```

---

DATEI
TreeGrowthSystem.ts

PFAD
/server/src/modules/farming/TreeGrowthSystem.ts

INHALT
```
export class TreeGrowthSystem {
  grow(tree: any) {
    tree.stage = Math.min((tree.stage || 0) + 1, 4);
    tree.lastGrowthAt = Date.now();
    return tree;
  }
}
```

---

DATEI
FamilyGenerationSystem.ts

PFAD
/server/src/modules/genealogy/FamilyGenerationSystem.ts

INHALT
```
export class FamilyGenerationSystem {
  createChild(parents: string[], house: string) {
    return {
      id: `child:${house}:${Date.now()}`,
      parents,
      house,
      bornAt: Date.now()
    };
  }
}
```

---

DATEI
AdminAuditLog.ts

PFAD
/server/src/modules/gm/AdminAuditLog.ts

INHALT
```
export class AdminAuditLog {
  private entries: any[] = [];
  log(entry: any) { this.entries.push({ timestamp: Date.now(), ...entry }); }
  all() { return this.entries; }
}
```

---

DATEI
GMCommandLayer.ts

PFAD
/server/src/modules/gm/GMCommandLayer.ts

INHALT
```
export class GMCommandLayer {
  execute(command: any) {
    return { executed: true, command };
  }
}
```

---

DATEI
AgingSystem.ts

PFAD
/server/src/modules/growth/AgingSystem.ts

INHALT
```
export class AgingSystem {
  age(entity: any, years = 1) {
    entity.age = (entity.age || 0) + years;
    return entity;
  }
}
```

---

DATEI
FamilyGenerationSystem.ts

PFAD
/server/src/modules/growth/FamilyGenerationSystem.ts

INHALT
```
export class FamilyGenerationSystem {
  createChild(parentA: any, parentB: any, childId: string) {
    return {
      id: childId,
      parents: [parentA.id, parentB.id],
      house: parentA.house || parentB.house || null,
      generation: Math.max(parentA.generation || 0, parentB.generation || 0) + 1
    };
  }
}
```

---

DATEI
FarmingSystem.ts

PFAD
/server/src/modules/growth/FarmingSystem.ts

INHALT
```
export class FarmingSystem {
  plant(seedId: string, biome: string) {
    return {
      seedId,
      biome,
      plantedAt: Date.now(),
      growth: 0
    };
  }

  tick(crop: any) {
    crop.growth += 1;
    return crop;
  }
}
```

---

DATEI
TreeGrowthSystem.ts

PFAD
/server/src/modules/growth/TreeGrowthSystem.ts

INHALT
```
export class TreeGrowthSystem { advance(stage: number) { return Math.min(stage + 1, 4); } }
```

---

DATEI
GuildStorage.ts

PFAD
/server/src/modules/guild/GuildStorage.ts

INHALT
```
export class GuildStorage {
  private storage = new Map<string, any[]>();

  addItem(guildId: string, item: any) {
    if (!this.storage.has(guildId)) this.storage.set(guildId, []);
    this.storage.get(guildId)!.push(item);
    return this.storage.get(guildId)!;
  }

  getItems(guildId: string) {
    return this.storage.get(guildId) || [];
  }
}
```

---

DATEI
GuildSystem.ts

PFAD
/server/src/modules/guild/GuildSystem.ts

INHALT
```
export class GuildSystem {
  private guilds = new Map<string, any>();

  createGuild(id: string, name: string, founderId: string) {
    const guild = {
      id,
      name,
      founderId,
      members: [founderId],
      ranks: { [founderId]: "founder" }
    };
    this.guilds.set(id, guild);
    return guild;
  }

  addMember(guildId: string, playerId: string) {
    const guild = this.guilds.get(guildId);
    if (!guild) return null;
    guild.members.push(playerId);
    guild.ranks[playerId] = "member";
    return guild;
  }
}
```

---

DATEI
DudenregisterHistory.ts

PFAD
/server/src/modules/history/DudenregisterHistory.ts

INHALT
```
export class DudenregisterHistory {
  private history: any[] = [];

  record(event: any) {
    this.history.push(event);
  }

  getHistory() {
    return this.history;
  }
}
```

---

DATEI
HistoricalMapEngine.ts

PFAD
/server/src/modules/history/HistoricalMapEngine.ts

INHALT
```
export class HistoricalMapEngine {
  buildSnapshotMap(snapshot:any){
    return {
      timestamp: snapshot?.timestamp ?? Date.now(),
      regions: snapshot?.state?.regions ?? []
    };
  }
}
```

---

DATEI
ProphecyArchive.ts

PFAD
/server/src/modules/history/ProphecyArchive.ts

INHALT
```
export class ProphecyArchive {
  private entries:any[] = [];
  add(prophecy:any){ this.entries.push({ timestamp:Date.now(), prophecy }); }
  list(){ return this.entries; }
}
```

---

DATEI
RuinEvolutionEngine.ts

PFAD
/server/src/modules/history/RuinEvolutionEngine.ts

INHALT
```
export class RuinEvolutionEngine {
  evolve(structure:any){
    return {
      ...structure,
      state: "ruin",
      evolvedAt: Date.now()
    };
  }
}
```

---

DATEI
WorldSnapshotSystem.ts

PFAD
/server/src/modules/history/WorldSnapshotSystem.ts

INHALT
```
export class WorldSnapshotSystem {
  private snapshots: any[] = [];

  save(worldState: any) {
    this.snapshots.push({
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(worldState))
    });
  }

  latest() {
    return this.snapshots[this.snapshots.length - 1] ?? null;
  }
}
```

---

DATEI
HousingSystem.ts

PFAD
/server/src/modules/housing/HousingSystem.ts

INHALT
```
export class HousingSystem {
  createHouse(ownerId: string, plotId: string) {
    return {
      ownerId,
      plotId,
      createdAt: Date.now(),
      upgrades: 0
    };
  }
}
```

---

DATEI
OwnershipRegistry.ts

PFAD
/server/src/modules/housing/OwnershipRegistry.ts

INHALT
```
export class OwnershipRegistry {
  private registry = new Map<string, { ownerType: string; ownerId: string }>();

  register(objectId: string, ownerType: string, ownerId: string) {
    this.registry.set(objectId, { ownerType, ownerId });
  }

  get(objectId: string) {
    return this.registry.get(objectId) || null;
  }
}
```

---

DATEI
InventorySystem.ts

PFAD
/server/src/modules/inventory/InventorySystem.ts

INHALT
```
export class InventorySystem {
  addItem(player: any, item: any) {
    player.inventory.push(item);
    return player.inventory;
  }

  removeItem(player: any, itemId: string) {
    player.inventory = player.inventory.filter((item: any) => item.id !== itemId);
    return player.inventory;
  }
}
```

---

DATEI
AffixSystem.ts

PFAD
/server/src/modules/items/AffixSystem.ts

INHALT
```
export class AffixSystem {
  rollAffixes(pool:any[], count:number = 1) {
    return pool.slice(0, Math.max(0, count));
  }
}
```

---

DATEI
EquipmentSystem.ts

PFAD
/server/src/modules/items/EquipmentSystem.ts

INHALT
```
export class EquipmentSystem {
  equip(player:any, slot:string, item:any) {
    if (!player.equipment) player.equipment = {};
    player.equipment[slot] = item;
    return player.equipment;
  }
}
```

---

DATEI
ItemGenerator.ts

PFAD
/server/src/modules/items/ItemGenerator.ts

INHALT
```
export class ItemGenerator {
  generate(baseId:string, rarity:string, affixes:any[] = []) {
    return {
      id: `${baseId}_${rarity}_${Date.now()}`,
      baseId,
      rarity,
      affixes
    };
  }
}
```

---

DATEI
LocaleDictionary.ts

PFAD
/server/src/modules/localization/LocaleDictionary.ts

INHALT
```
export const LocaleDictionary = {
  de: {
    "ui.inventory.title": "Inventar",
    "ui.chat.title": "Chat"
  },
  en: {
    "ui.inventory.title": "Inventory",
    "ui.chat.title": "Chat"
  }
};
```

---

DATEI
LocaleRegistry.ts

PFAD
/server/src/modules/localization/LocaleRegistry.ts

INHALT
```
export const LocaleRegistry = {
  de: { name: "Deutsch" },
  en: { name: "English" }
};
```

---

DATEI
TextKeyResolver.ts

PFAD
/server/src/modules/localization/TextKeyResolver.ts

INHALT
```
export class TextKeyResolver {
  resolve(dict: Record<string, string>, key: string) {
    return dict[key] || key;
  }
}
```

---

DATEI
AffixSystem.ts

PFAD
/server/src/modules/loot/AffixSystem.ts

INHALT
```
export class AffixSystem {
  rollAffixes(rarity: string) {
    const pool = [
      "plus_strength",
      "plus_health",
      "plus_attack_speed",
      "plus_mining",
      "plus_fire_resistance"
    ];

    const countMap: Record<string, number> = {
      common: 0,
      uncommon: 1,
      rare: 2,
      epic: 3,
      legendary: 4,
      mythic: 5
    };

    const count = countMap[rarity] ?? 0;
    return pool.slice(0, count);
  }
}
```

---

DATEI
ItemGenerator.ts

PFAD
/server/src/modules/loot/ItemGenerator.ts

INHALT
```
export class ItemGenerator {
  generate(baseId: string, rarity: string, affixes: string[] = []) {
    return {
      id: baseId,
      rarity,
      affixes,
      generatedAt: Date.now()
    };
  }
}
```

---

DATEI
LootTables.ts

PFAD
/server/src/modules/loot/LootTables.ts

INHALT
```
export const LootTables = {
  wolf: [
    { id: "wolf_pelt", chance: 0.65, rarity: "common" },
    { id: "fang", chance: 0.3, rarity: "common" },
    { id: "alpha_claw", chance: 0.05, rarity: "rare" }
  ],
  skeleton: [
    { id: "bone_fragment", chance: 0.7, rarity: "common" },
    { id: "rusted_blade", chance: 0.2, rarity: "uncommon" },
    { id: "grave_ring", chance: 0.03, rarity: "rare" }
  ],
  ruin_cache: [
    { id: "ancient_coin", chance: 0.5, rarity: "uncommon" },
    { id: "relic_fragment", chance: 0.2, rarity: "rare" },
    { id: "forgotten_sigil", chance: 0.02, rarity: "legendary" }
  ]
};
```

---

DATEI
MagicSystem.ts

PFAD
/server/src/modules/magic/MagicSystem.ts

INHALT
```
export class MagicSystem {
  cast(caster: any, spell: any, target: any) {
    if ((caster.mana ?? 0) < spell.cost) {
      return { success: false, reason: "not_enough_mana" };
    }

    caster.mana -= spell.cost;

    return {
      success: true,
      spell: spell.id,
      target: target?.id ?? null,
      effect: spell.effect ?? "generic_magic_effect"
    };
  }
}
```

---

DATEI
MailAttachments.ts

PFAD
/server/src/modules/mail/MailAttachments.ts

INHALT
```
export class MailAttachments {
  validate(items: any[]) {
    return Array.isArray(items) && items.length <= 5;
  }
}
```

---

DATEI
MailService.ts

PFAD
/server/src/modules/mail/MailService.ts

INHALT
```
export class MailService {
  private mail: any[] = [];

  send(from: string, to: string, subject: string, body: string) {
    const item = { from, to, subject, body, createdAt: Date.now() };
    this.mail.push(item);
    return item;
  }

  inbox(playerId: string) {
    return this.mail.filter(m => m.to === playerId);
  }
}
```

---

DATEI
MarketExpansion.ts

PFAD
/server/src/modules/market/MarketExpansion.ts

INHALT
```
export class MarketExpansion {
  expand(city:any) {
    city.marketLevel = (city.marketLevel ?? 1) + 1;
    return city.marketLevel;
  }
}
```

---

DATEI
NPCTradeAI.ts

PFAD
/server/src/modules/market/NPCTradeAI.ts

INHALT
```
export class NPCTradeAI {
  chooseTrade(npc:any, goods:string[]) {
    return {
      npcId: npc.id,
      good: goods[0] ?? null
    };
  }
}
```

---

DATEI
PriceBalancer.ts

PFAD
/server/src/modules/market/PriceBalancer.ts

INHALT
```
export class PriceBalancer {
  balance(basePrice:number, supply:number, demand:number) {
    return Math.max(1, basePrice * (demand / Math.max(1, supply)));
  }
}
```

---

DATEI
MigrationEngine.ts

PFAD
/server/src/modules/migration/MigrationEngine.ts

INHALT
```
export class MigrationEngine {
  migrate(groupId: string, from: string, to: string) {
    return { groupId, from, to, departedAt: Date.now() };
  }
}
```

---

DATEI
BackupManager.ts

PFAD
/server/src/modules/monitoring/BackupManager.ts

INHALT
```
export class BackupManager {
  create(label: string) {
    return {
      label,
      createdAt: Date.now()
    };
  }
}
```

---

DATEI
CrashRecovery.ts

PFAD
/server/src/modules/monitoring/CrashRecovery.ts

INHALT
```
export class CrashRecovery {
  recover(snapshotArchive: any) {
    return snapshotArchive.latest ? snapshotArchive.latest() : null;
  }
}
```

---

DATEI
SystemHealthMonitor.ts

PFAD
/server/src/modules/monitoring/SystemHealthMonitor.ts

INHALT
```
export class SystemHealthMonitor {
  report() {
    return {
      status: "ok",
      checkedAt: Date.now()
    };
  }
}
```

---

DATEI
MonsterDNA.ts

PFAD
/server/src/modules/monster/MonsterDNA.ts

INHALT
```
export function generateMonsterDNA(species: string) {
  return {
    species,
    strength: Math.random(),
    speed: Math.random(),
    aggression: Math.random(),
    intelligence: Math.random(),
    resilience: Math.random()
  };
}
```

---

DATEI
MonsterMutation.ts

PFAD
/server/src/modules/monster/MonsterMutation.ts

INHALT
```
export function mutateMonster(dna: any, biome: string) {
  const clone = { ...dna, mutations: [] as string[] };

  if (biome === "snow") {
    clone.resilience += 0.2;
    clone.mutations.push("frost_resistance");
  }

  if (biome === "swamp") {
    clone.aggression += 0.15;
    clone.mutations.push("swamp_hunger");
  }

  if (Math.random() < 0.08) {
    clone.mutations.push("rare_variant");
  }

  return clone;
}
```

---

DATEI
MonsterSpawnTable.ts

PFAD
/server/src/modules/monster/MonsterSpawnTable.ts

INHALT
```
export const MonsterSpawnTable = {
  forest: ["wolf", "boar"],
  mountain: ["stone_beast", "frost_wolf"],
  desert: ["sand_stalker", "scorpion"]
};
```

---

DATEI
MonsterSpawner.ts

PFAD
/server/src/modules/monster/MonsterSpawner.ts

INHALT
```
import { generateMonsterDNA } from "./MonsterDNA.js";
import { mutateMonster } from "./MonsterMutation.js";

export class MonsterSpawner {
  spawn(species: string, biome: string) {
    const dna = generateMonsterDNA(species);
    return mutateMonster(dna, biome);
  }
}
```

---

DATEI
MountRegistry.ts

PFAD
/server/src/modules/mounts/MountRegistry.ts

INHALT
```
export const MountRegistry = {
  horse_basic: { speed: 1.2, type: "mount" },
  giraffe_admin: { speed: 2.0, type: "admin_mount", tags: ["gm", "giraffe", "affe"] }
};
```

---

DATEI
TravelSystem.ts

PFAD
/server/src/modules/mounts/TravelSystem.ts

INHALT
```
export class TravelSystem {
  moveWithMount(position:any, direction:any, speed:number){
    return {
      x: position.x + direction.x * speed,
      y: position.y + direction.y * speed,
      z: position.z + direction.z * speed
    };
  }
}
```

---

DATEI
NotificationService.ts

PFAD
/server/src/modules/notifications/NotificationService.ts

INHALT
```
export class NotificationService {
  notify(playerId: string, message: string) {
    return {
      playerId,
      message,
      createdAt: Date.now()
    };
  }
}
```

---

DATEI
HeritageResolver.ts

PFAD
/server/src/modules/npc/HeritageResolver.ts

INHALT
```
export class HeritageResolver {
  resolve(culture:string, religion:string, house:string){
    return {
      culture,
      religion,
      house,
      heritageKey: `${culture}:${religion}:${house}`
    };
  }
}
```

---

DATEI
NPCDialogueSystem.ts

PFAD
/server/src/modules/npc/NPCDialogueSystem.ts

INHALT
```
export class NPCDialogueSystem {
  talk(npc: any, worldSignals: any = {}) {
    const lines = npc.dialogueLines || [
      "Die Welt flüstert merkwürdige Dinge.",
      "Ich habe da ein Gerücht gehört."
    ];

    return {
      line: lines[Math.floor(Math.random() * lines.length)],
      signals: worldSignals
    };
  }
}
```

---

DATEI
NPCGenealogyEngine.ts

PFAD
/server/src/modules/npc/NPCGenealogyEngine.ts

INHALT
```
export class NPCGenealogyEngine {
  createLineage(id: string, house: string, parents: string[] = []) {
    return {
      id,
      house,
      parents,
      children: [] as string[]
    };
  }

  addChild(lineage: any, childId: string) {
    lineage.children.push(childId);
    return lineage;
  }
}
```

---

DATEI
NPCMemoryEngine.ts

PFAD
/server/src/modules/npc/NPCMemoryEngine.ts

INHALT
```
export class NPCMemoryEngine {
  private memory = new Map<string, any[]>();

  remember(npcId: string, event: any) {
    if (!this.memory.has(npcId)) this.memory.set(npcId, []);
    this.memory.get(npcId)!.push({
      timestamp: Date.now(),
      event
    });
  }

  recall(npcId: string) {
    return this.memory.get(npcId) || [];
  }
}
```

---

DATEI
NPCPersonalityEngine.ts

PFAD
/server/src/modules/npc/NPCPersonalityEngine.ts

INHALT
```
export class NPCPersonalityEngine {
  generateTraits() {
    return {
      courage: Math.random(),
      curiosity: Math.random(),
      greed: Math.random(),
      faith: Math.random(),
      aggression: Math.random()
    };
  }
}
```

---

DATEI
NPCProfessions.ts

PFAD
/server/src/modules/npc/NPCProfessions.ts

INHALT
```
export const NPCProfessions = {
  merchant: { scheduleKey: "merchant", marketRole: true },
  blacksmith: { station: "forge" },
  farmer: { station: "field" },
  guard: { scheduleKey: "guard" },
  oracle: { station: "shrine" }
};
```

---

DATEI
NPCRelationshipSystem.ts

PFAD
/server/src/modules/npc/NPCRelationshipSystem.ts

INHALT
```
export class NPCRelationshipSystem {
  private relations = new Map<string, Record<string, number>>();

  set(a: string, b: string, value: number) {
    if (!this.relations.has(a)) this.relations.set(a, {});
    this.relations.get(a)![b] = value;
    return value;
  }

  get(a: string, b: string) {
    return this.relations.get(a)?.[b] || 0;
  }
}
```

---

DATEI
NPCScheduleRegistry.ts

PFAD
/server/src/modules/npc/NPCScheduleRegistry.ts

INHALT
```
export const NPCScheduleRegistry = {
  merchant: ["wake", "open_shop", "trade", "close_shop", "sleep"],
  guard: ["wake", "patrol", "watch", "rest", "sleep"],
  gossip: ["market", "rumors", "tavern", "late_walk", "sleep"]
};
```

---

DATEI
NPCSpawnTable.ts

PFAD
/server/src/modules/npc/NPCSpawnTable.ts

INHALT
```
export const NPCSpawnTable = {
  starter_town: ["merchant", "guard", "gossip"],
  ruins: ["oracle", "wanderer"],
  capital: ["merchant", "guard", "chronicler"]
};
```

---

DATEI
SharedMemoryNetwork.ts

PFAD
/server/src/modules/npc/SharedMemoryNetwork.ts

INHALT
```
export class SharedMemoryNetwork {
  share(fromNpcId: string, toNpcId: string, memory: any) {
    return {
      fromNpcId,
      toNpcId,
      memory,
      sharedAt: Date.now()
    };
  }
}
```

---

DATEI
ObserverEngine.ts

PFAD
/server/src/modules/observer/ObserverEngine.ts

INHALT
```
export class ObserverEngine {
  private observers = new Map<string, { x: number; y: number }>();

  register(playerId: string, position: { x: number; y: number }) {
    this.observers.set(playerId, position);
  }

  unregister(playerId: string) {
    this.observers.delete(playerId);
  }

  getObservedChunks() {
    const result = [] as { chunkX: number; chunkY: number }[];
    for (const [, pos] of this.observers) {
      result.push({
        chunkX: Math.floor(pos.x / 64),
        chunkY: Math.floor(pos.y / 64)
      });
    }
    return result;
  }
}
```

---

DATEI
OracleEngine.ts

PFAD
/server/src/modules/oracle/OracleEngine.ts

INHALT
```
export class OracleEngine {
  generateVision() {
    const visions = [
      "Ich sehe Feuer im Norden.",
      "Unter alten Mauern liegt ein Geheimnis.",
      "Ein Königreich wird fallen."
    ];
    return visions[Math.floor(Math.random() * visions.length)];
  }
}
```

---

DATEI
OracleMemoryBridge.ts

PFAD
/server/src/modules/oracle/OracleMemoryBridge.ts

INHALT
```
export class OracleMemoryBridge {
  buildSignal(memory: any[], history: any[]) {
    return {
      memoryCount: memory.length,
      historyCount: history.length,
      strength: memory.length + history.length
    };
  }
}
```

---

DATEI
ProphecyArchive.ts

PFAD
/server/src/modules/oracle/ProphecyArchive.ts

INHALT
```
export class ProphecyArchive {
  private entries: any[] = [];
  add(entry: any) { this.entries.push({ timestamp: Date.now(), ...entry }); }
  all() { return this.entries; }
}
```

---

DATEI
ProphecyGenerator.ts

PFAD
/server/src/modules/oracle/ProphecyGenerator.ts

INHALT
```
export class ProphecyGenerator {
  generate(signal: string) {
    return { type: "prophecy", line: `Ich sehe ein Zeichen: ${signal}` };
  }
}
```

---

DATEI
WarForecast.ts

PFAD
/server/src/modules/oracle/WarForecast.ts

INHALT
```
export class WarForecast {
  evaluate(tension: number, resources: number) {
    return { risk: Math.min(1, (tension * 0.7) + (resources * 0.3)) };
  }
}
```

---

DATEI
CivilizationDatabase.ts

PFAD
/server/src/modules/persistence/CivilizationDatabase.ts

INHALT
```
export class CivilizationDatabase {
  private civilizations = new Map<string, any>();

  saveCivilization(civ: any) {
    this.civilizations.set(civ.id, civ);
  }

  loadCivilization(id: string) {
    return this.civilizations.get(id) ?? null;
  }
}
```

---

DATEI
DataSeeder.ts

PFAD
/server/src/modules/persistence/DataSeeder.ts

INHALT
```
export class DataSeeder {
  seed(items:any[]){
    return {
      inserted: items.length
    };
  }
}
```

---

DATEI
PlayerDatabase.ts

PFAD
/server/src/modules/persistence/PlayerDatabase.ts

INHALT
```
export class PlayerDatabase {
  private players = new Map<string, any>();

  savePlayer(player: any) {
    this.players.set(player.id, player);
  }

  loadPlayer(id: string) {
    return this.players.get(id) ?? null;
  }
}
```

---

DATEI
SafeMigrationRunner.ts

PFAD
/server/src/modules/persistence/SafeMigrationRunner.ts

INHALT
```
export class SafeMigrationRunner {
  run(migrations:any[]){
    return {
      count: migrations.length,
      ok: true
    };
  }
}
```

---

DATEI
SaveFormats.ts

PFAD
/server/src/modules/persistence/SaveFormats.ts

INHALT
```
export const SaveFormats = {
  player: ["stats", "skills", "inventory", "position", "questState"],
  world: ["chunks", "structures", "ruins", "weather", "events"],
  civilization: ["settlements", "politics", "taxes", "wars"]
};
```

---

DATEI
SnapshotArchive.ts

PFAD
/server/src/modules/persistence/SnapshotArchive.ts

INHALT
```
export class SnapshotArchive {
  private archive:any[] = [];
  push(snapshot:any){
    this.archive.push(snapshot);
    return snapshot;
  }
  latest(){
    return this.archive[this.archive.length - 1] || null;
  }
}
```

---

DATEI
WorldDatabase.ts

PFAD
/server/src/modules/persistence/WorldDatabase.ts

INHALT
```
export class WorldDatabase {
  private chunks = new Map<string, any>();

  saveChunk(chunk: any) {
    this.chunks.set(chunk.id, chunk);
  }

  loadChunk(id: string) {
    return this.chunks.get(id) ?? null;
  }
}
```

---

DATEI
EquipmentSystem.ts

PFAD
/server/src/modules/player/EquipmentSystem.ts

INHALT
```
export class EquipmentSystem {
  equip(player: any, slot: string, item: any) {
    if (!player.equipment) player.equipment = {};
    player.equipment[slot] = item;
    return player.equipment;
  }

  unequip(player: any, slot: string) {
    if (!player.equipment) player.equipment = {};
    const item = player.equipment[slot] || null;
    delete player.equipment[slot];
    return item;
  }
}
```

---

DATEI
PlayerSystem.ts

PFAD
/server/src/modules/player/PlayerSystem.ts

INHALT
```
export class PlayerSystem {
  createPlayer(id: string, name: string) {
    return {
      id,
      name,
      position: { x: 0, y: 0, z: 0 },
      health: 100,
      stamina: 100,
      mana: 25,
      skills: {},
      inventory: [],
      faction: null,
      civilization: null,
      matrixEnergy: 0
    };
  }
}
```

---

DATEI
ReputationTitleBridge.ts

PFAD
/server/src/modules/player/ReputationTitleBridge.ts

INHALT
```
export class ReputationTitleBridge {
  resolveTitle(score: number) {
    if (score >= 1000) return "Renowned";
    if (score >= 500) return "Honored";
    if (score >= 100) return "Known";
    return "Unknown";
  }
}
```

---

DATEI
StaminaRegen.ts

PFAD
/server/src/modules/player/StaminaRegen.ts

INHALT
```
export class StaminaRegen {
  tick(player:any){
    player.stamina = Math.min(100, (player.stamina ?? 0) + 1);
    return player.stamina;
  }
}
```

---

DATEI
TitleSystem.ts

PFAD
/server/src/modules/player/TitleSystem.ts

INHALT
```
export class TitleSystem {
  assign(player: any, title: string) {
    if (!player.titles) player.titles = [];
    player.titles.push(title);
    return title;
  }
}
```

---

DATEI
DiplomacyEngine.ts

PFAD
/server/src/modules/politics/DiplomacyEngine.ts

INHALT
```
export class DiplomacyEngine {
  treaty(a:string,b:string,type:string){
    return { a, b, type, signedAt: Date.now() };
  }
}
```

---

DATEI
GovernmentTypes.ts

PFAD
/server/src/modules/politics/GovernmentTypes.ts

INHALT
```
export const GovernmentTypes = {
  monarchy: { id: "monarchy", succession: "inheritance", stabilityBase: 0.7 },
  council: { id: "council", succession: "vote", stabilityBase: 0.6 },
  theocracy: { id: "theocracy", succession: "religious_selection", stabilityBase: 0.65 },
  trade_republic: { id: "trade_republic", succession: "merchant_vote", stabilityBase: 0.55 },
  warband: { id: "warband", succession: "strength", stabilityBase: 0.4 }
};
```

---

DATEI
ReputationSystem.ts

PFAD
/server/src/modules/politics/ReputationSystem.ts

INHALT
```
export class ReputationSystem {
  private reputations = new Map<string, Record<string, number>>();

  add(sourceId: string, targetId: string, delta: number) {
    if (!this.reputations.has(sourceId)) this.reputations.set(sourceId, {});
    const row = this.reputations.get(sourceId)!;
    row[targetId] = (row[targetId] || 0) + delta;
    return row[targetId];
  }

  get(sourceId: string, targetId: string) {
    return this.reputations.get(sourceId)?.[targetId] || 0;
  }
}
```

---

DATEI
WarEngine.ts

PFAD
/server/src/modules/politics/WarEngine.ts

INHALT
```
export class WarEngine {
  declareWar(attacker: any, defender: any) {
    return {
      type: "war_declared",
      attacker: attacker.id,
      defender: defender.id,
      timestamp: Date.now()
    };
  }
}
```

---

DATEI
ProphecyArchive.ts

PFAD
/server/src/modules/prophecy/ProphecyArchive.ts

INHALT
```
export class ProphecyArchive {
  private entries:any[] = [];
  add(entry:any){ this.entries.push(entry); }
  all(){ return this.entries; }
}
```

---

DATEI
ProphecyGenerator.ts

PFAD
/server/src/modules/prophecy/ProphecyGenerator.ts

INHALT
```
export class ProphecyGenerator {
  generate(seed:string){
    return `Ich sehe ${seed} im Nebel der kommenden Zeit.`;
  }
}
```

---

DATEI
WarForecast.ts

PFAD
/server/src/modules/prophecy/WarForecast.ts

INHALT
```
export class WarForecast {
  predict(tension:number){
    return tension > 0.7 ? "high_risk_of_war" : "stable_for_now";
  }
}
```

---

DATEI
QuestEngine.ts

PFAD
/server/src/modules/quest/QuestEngine.ts

INHALT
```
import { QuestRegistry } from "./QuestRegistry.js";

export class QuestEngine {
  private active = new Map<string, any[]>();

  startQuest(playerId: string, questId: keyof typeof QuestRegistry) {
    const quest = QuestRegistry[questId];
    if (!quest) return null;
    if (!this.active.has(playerId)) this.active.set(playerId, []);
    this.active.get(playerId)!.push({ ...quest, startedAt: Date.now(), completed: false });
    return quest;
  }

  listQuests(playerId: string) {
    return this.active.get(playerId) || [];
  }

  completeQuest(playerId: string, questId: string) {
    const quests = this.active.get(playerId) || [];
    const q = quests.find((x) => x.id === questId);
    if (!q) return null;
    q.completed = true;
    q.completedAt = Date.now();
    return q.reward;
  }
}
```

---

DATEI
QuestRegistry.ts

PFAD
/server/src/modules/quest/QuestRegistry.ts

INHALT
```
export const QuestRegistry = {
  ruin_hunter: {
    id: "ruin_hunter",
    name: "Die alten Mauern",
    giver: "uschi_gossip",
    objective: "find_ruins",
    reward: { gold: 100, item: "ancient_relic" }
  },
  watchtower_supply: {
    id: "watchtower_supply",
    name: "Die hungernden Wächter",
    giver: "city_guard",
    objective: "deliver_supplies",
    reward: { xp: 50, item: "guard_token" }
  }
};
```

---

DATEI
QuestRewards.ts

PFAD
/server/src/modules/quest/QuestRewards.ts

INHALT
```
export class QuestRewards {
  grant(player:any, reward:any){
    if(!player.rewards) player.rewards = [];
    player.rewards.push(reward);
    return reward;
  }
}
```

---

DATEI
QuestStateStore.ts

PFAD
/server/src/modules/quest/QuestStateStore.ts

INHALT
```
export class QuestStateStore {
  private states = new Map<string, any[]>();
  set(playerId:string, quests:any[]){
    this.states.set(playerId, quests);
  }
  get(playerId:string){
    return this.states.get(playerId) || [];
  }
}
```

---

DATEI
QuestRewards.ts

PFAD
/server/src/modules/quests/QuestRewards.ts

INHALT
```
export class QuestRewards {
  grant(player: any, reward: any) {
    if (!player.rewards) player.rewards = [];
    player.rewards.push(reward);
    return reward;
  }
}
```

---

DATEI
QuestStateStore.ts

PFAD
/server/src/modules/quests/QuestStateStore.ts

INHALT
```
export class QuestStateStore {
  private states = new Map<string, any[]>();

  add(playerId: string, quest: any) {
    if (!this.states.has(playerId)) this.states.set(playerId, []);
    this.states.get(playerId)!.push(quest);
  }

  list(playerId: string) {
    return this.states.get(playerId) || [];
  }
}
```

---

DATEI
NPCRelationshipSystem.ts

PFAD
/server/src/modules/relationships/NPCRelationshipSystem.ts

INHALT
```
export class NPCRelationshipSystem {
  private values = new Map<string, number>();
  key(a:string,b:string){ return `${a}:${b}`; }
  set(a:string,b:string,v:number){ this.values.set(this.key(a,b), v); }
  get(a:string,b:string){ return this.values.get(this.key(a,b)) ?? 0; }
}
```

---

DATEI
SharedMemoryNetwork.ts

PFAD
/server/src/modules/relationships/SharedMemoryNetwork.ts

INHALT
```
export class SharedMemoryNetwork {
  share(memories:any[]) {
    return {
      sharedCount: memories.length,
      propagatedAt: Date.now()
    };
  }
}
```

---

DATEI
BuildStamp.ts

PFAD
/server/src/modules/release/BuildStamp.ts

INHALT
```
export const BuildStamp = {
  buildName: "areloria-working-build",
  schemaVersion: "0.1",
  generatedAt: Date.now()
};
```

---

DATEI
ReleaseChecklist.ts

PFAD
/server/src/modules/release/ReleaseChecklist.ts

INHALT
```
export class ReleaseChecklist {
  status() {
    return {
      serverCore: true,
      clientCore: true,
      websocket: true,
      reconstructionPackRequired: true
    };
  }
}
```

---

DATEI
ReleaseProfile.ts

PFAD
/server/src/modules/release/ReleaseProfile.ts

INHALT
```
export const ReleaseProfile = {
  mode: "development_scaffold",
  target: "browser_mmorpg",
  authority: "server"
};
```

---

DATEI
ReligionSystem.ts

PFAD
/server/src/modules/religion/ReligionSystem.ts

INHALT
```
export class ReligionSystem {
  private religions = new Map<string, any>();

  registerReligion(id: string, data: any) {
    this.religions.set(id, data);
  }

  getReligion(id: string) {
    return this.religions.get(id);
  }
}
```

---

DATEI
ReputationLedger.ts

PFAD
/server/src/modules/reputation/ReputationLedger.ts

INHALT
```
export class ReputationLedger {
  private values = new Map<string, number>();
  add(key: string, amount: number) { this.values.set(key, (this.values.get(key) || 0) + amount); }
  get(key: string) { return this.values.get(key) || 0; }
}
```

---

DATEI
ReputationSystem.ts

PFAD
/server/src/modules/reputation/ReputationSystem.ts

INHALT
```
export class ReputationSystem {
  private ledger = new Map<string, Record<string, number>>();
  add(entityId:string, factionId:string, amount:number){
    if(!this.ledger.has(entityId)) this.ledger.set(entityId, {});
    const row = this.ledger.get(entityId)!;
    row[factionId] = (row[factionId] || 0) + amount;
    return row[factionId];
  }
  get(entityId:string, factionId:string){
    return this.ledger.get(entityId)?.[factionId] || 0;
  }
}
```

---

DATEI
AntiCheatHooks.ts

PFAD
/server/src/modules/security/AntiCheatHooks.ts

INHALT
```
export class AntiCheatHooks {
  inspectMovement(delta: any) {
    return {
      suspicious: Math.abs(delta?.x || 0) > 100 || Math.abs(delta?.y || 0) > 100
    };
  }
}
```

---

DATEI
PayloadValidator.ts

PFAD
/server/src/modules/security/PayloadValidator.ts

INHALT
```
export class PayloadValidator {
  validateObject(payload: any) {
    return payload !== null && typeof payload === "object";
  }
}
```

---

DATEI
SiegeEngine.ts

PFAD
/server/src/modules/siege/SiegeEngine.ts

INHALT
```
export class SiegeEngine {
  start(attacker:any, target:any) {
    return {
      type: "siege_started",
      attacker: attacker.id,
      target: target.id,
      startedAt: Date.now()
    };
  }
}
```

---

DATEI
SkillSystem.ts

PFAD
/server/src/modules/skill/SkillSystem.ts

INHALT
```
export class SkillSystem {
  ensureSkill(player: any, skillName: string) {
    if (!player.skills[skillName]) {
      player.skills[skillName] = { level: 1, xp: 0 };
    }
  }

  addXP(player: any, skillName: string, amount: number) {
    this.ensureSkill(player, skillName);
    const skill = player.skills[skillName];
    skill.xp += amount;
    while (skill.xp >= this.nextLevelXP(skill.level)) {
      skill.level += 1;
    }
    return skill;
  }

  nextLevelXP(level: number) {
    return Math.floor(50 * Math.pow(level, 1.4));
  }
}
```

---

DATEI
FriendsSystem.ts

PFAD
/server/src/modules/social/FriendsSystem.ts

INHALT
```
export class FriendsSystem {
  private friends = new Map<string, Set<string>>();

  addFriend(a: string, b: string) {
    if (!this.friends.has(a)) this.friends.set(a, new Set());
    if (!this.friends.has(b)) this.friends.set(b, new Set());
    this.friends.get(a)!.add(b);
    this.friends.get(b)!.add(a);
  }

  list(playerId: string) {
    return [...(this.friends.get(playerId) || new Set())];
  }
}
```

---

DATEI
GroupFinder.ts

PFAD
/server/src/modules/social/GroupFinder.ts

INHALT
```
export class GroupFinder {
  createListing(ownerId: string, activity: string) {
    return {
      ownerId,
      activity,
      createdAt: Date.now()
    };
  }
}
```

---

DATEI
IgnoreSystem.ts

PFAD
/server/src/modules/social/IgnoreSystem.ts

INHALT
```
export class IgnoreSystem {
  private ignores = new Map<string, Set<string>>();

  add(playerId: string, ignoredId: string) {
    if (!this.ignores.has(playerId)) this.ignores.set(playerId, new Set());
    this.ignores.get(playerId)!.add(ignoredId);
  }

  list(playerId: string) {
    return [...(this.ignores.get(playerId) || new Set())];
  }
}
```

---

DATEI
PartySystem.ts

PFAD
/server/src/modules/social/PartySystem.ts

INHALT
```
export class PartySystem {
  createParty(leaderId: string) {
    return {
      leaderId,
      members: [leaderId],
      createdAt: Date.now()
    };
  }
}
```

---

DATEI
ConstructionQueue.ts

PFAD
/server/src/modules/structure/ConstructionQueue.ts

INHALT
```
export class ConstructionQueue {
  private jobs: any[] = [];

  enqueue(job: any) {
    this.jobs.push({ ...job, createdAt: Date.now(), progress: 0 });
  }

  tick() {
    for (const job of this.jobs) {
      job.progress += job.workRate || 1;
      if (job.progress >= 100) job.completed = true;
    }
    this.jobs = this.jobs.filter(job => !job.completed);
  }

  all() {
    return this.jobs;
  }
}
```

---

DATEI
GateController.ts

PFAD
/server/src/modules/structure/GateController.ts

INHALT
```
export class GateController {
  setState(gate: any, state: string) {
    const allowed = ["open", "closed", "locked", "damaged", "destroyed"];
    if (!allowed.includes(state)) throw new Error("Invalid gate state");
    gate.state = state;
    return gate;
  }

  canOpen(actor: any, gate: any) {
    if (gate.state === "destroyed") return false;
    if (gate.state === "locked" && !actor.permissions?.includes("gate_access")) return false;
    return true;
  }
}
```

---

DATEI
SiegeEngine.ts

PFAD
/server/src/modules/structure/SiegeEngine.ts

INHALT
```
export class SiegeEngine {
  applySiegeDamage(structure: any, amount: number) {
    structure.hitpoints = Math.max(0, (structure.hitpoints || 100) - amount);
    if (structure.hitpoints === 0) structure.destroyed = true;
    return structure;
  }

  breachGate(gate: any) {
    gate.state = "destroyed";
    return gate;
  }
}
```

---

DATEI
StructureEngine.ts

PFAD
/server/src/modules/structure/StructureEngine.ts

INHALT
```
export class StructureEngine {
  private structures = new Map<string, any>();

  createStructure(structure: any) {
    this.structures.set(structure.structureId, structure);
    return structure;
  }

  getStructure(id: string) {
    return this.structures.get(id) ?? null;
  }

  damageStructure(id: string, amount: number) {
    const structure = this.structures.get(id);
    if (!structure) return null;
    structure.hitpoints = Math.max(0, structure.hitpoints - amount);
    if (structure.hitpoints === 0) structure.destroyed = true;
    return structure;
  }
}
```

---

DATEI
StructureTemplates.ts

PFAD
/server/src/modules/structure/StructureTemplates.ts

INHALT
```
export const StructureTemplates = {
  small_house: { slots: 1, defense: 1 },
  forge: { slots: 2, defense: 1 },
  watch_tower: { slots: 1, defense: 4 },
  gate: { slots: 1, defense: 5 }
};
```

---

DATEI
UpgradeSystem.ts

PFAD
/server/src/modules/structure/UpgradeSystem.ts

INHALT
```
export class UpgradeSystem {
  upgrade(structure: any) {
    structure.level = (structure.level || 1) + 1;
    structure.maxHitpoints = (structure.maxHitpoints || 100) + 50;
    structure.hitpoints = structure.maxHitpoints;
    return structure;
  }
}
```

---

DATEI
PerformanceBudget.ts

PFAD
/server/src/modules/telemetry/PerformanceBudget.ts

INHALT
```
export const PerformanceBudget = {
  maxActiveChunksPerObserver: 36,
  maxNpcTicksPerCycle: 500,
  maxMarketUpdatesPerTick: 100
};
```

---

DATEI
TelemetryCollector.ts

PFAD
/server/src/modules/telemetry/TelemetryCollector.ts

INHALT
```
export class TelemetryCollector {
  private entries:any[] = [];
  record(metric:string, value:any){
    const entry = { metric, value, ts: Date.now() };
    this.entries.push(entry);
    return entry;
  }
}
```

---

DATEI
BuyOrders.ts

PFAD
/server/src/modules/trade/BuyOrders.ts

INHALT
```
export class BuyOrders {
  private orders: any[] = [];

  place(buyerId: string, itemId: string, price: number, quantity: number) {
    const order = { buyerId, itemId, price, quantity, createdAt: Date.now() };
    this.orders.push(order);
    return order;
  }

  all() {
    return this.orders;
  }
}
```

---

DATEI
PlayerMarket.ts

PFAD
/server/src/modules/trade/PlayerMarket.ts

INHALT
```
export class PlayerMarket {
  private listings: any[] = [];

  listItem(sellerId: string, item: any, price: number) {
    const listing = { sellerId, item, price, createdAt: Date.now() };
    this.listings.push(listing);
    return listing;
  }

  all() {
    return this.listings;
  }
}
```

---

DATEI
SellOrders.ts

PFAD
/server/src/modules/trade/SellOrders.ts

INHALT
```
export class SellOrders {
  private orders: any[] = [];

  place(sellerId: string, itemId: string, price: number, quantity: number) {
    const order = { sellerId, itemId, price, quantity, createdAt: Date.now() };
    this.orders.push(order);
    return order;
  }

  all() {
    return this.orders;
  }
}
```

---

DATEI
ClimateModel.ts

PFAD
/server/src/modules/weather/ClimateModel.ts

INHALT
```
export class ClimateModel {
  getClimateForBiome(biome: string) {
    if (biome === "forest") return "temperate";
    if (biome === "desert") return "arid";
    if (biome === "mountain") return "cold";
    return "mixed";
  }
}
```

---

DATEI
SeasonalGrowthBridge.ts

PFAD
/server/src/modules/weather/SeasonalGrowthBridge.ts

INHALT
```
export class SeasonalGrowthBridge {
  affectGrowth(season: string, stage: number) {
    const modifier = season === "spring" ? 2 : season === "winter" ? -1 : 1;
    return Math.max(0, stage + modifier);
  }
}
```

---

DATEI
WeatherEffects.ts

PFAD
/server/src/modules/weather/WeatherEffects.ts

INHALT
```
export class WeatherEffects {
  apply(weather: string) {
    return {
      visibilityPenalty: weather === "fog" ? 0.3 : 0,
      movementPenalty: weather === "storm" ? 0.2 : 0
    };
  }
}
```

---

DATEI
WeatherPresets.ts

PFAD
/server/src/modules/weather/WeatherPresets.ts

INHALT
```
export const WeatherPresets = {
  clear: { visibility: 1, movePenalty: 0 },
  rain: { visibility: 0.9, movePenalty: 0.05 },
  storm: { visibility: 0.7, movePenalty: 0.2 },
  fog: { visibility: 0.6, movePenalty: 0.05 },
  snow: { visibility: 0.8, movePenalty: 0.1 }
};
```

---

DATEI
BiomeGenerator.ts

PFAD
/server/src/modules/world/BiomeGenerator.ts

INHALT
```
export class BiomeGenerator {
  getBiome(_x: number, _y: number, height: number) {
    if (height > 0.7) return "mountain";
    if (height > 0.45) return "forest";
    if (height > 0.2) return "grassland";
    return "desert";
  }
}
```

---

DATEI
ChunkActivation.ts

PFAD
/server/src/modules/world/ChunkActivation.ts

INHALT
```
export class ChunkActivation {
  activate(chunkId:string){
    return { chunkId, active: true };
  }
}
```

---

DATEI
ChunkSystem.ts

PFAD
/server/src/modules/world/ChunkSystem.ts

INHALT
```
export class ChunkSystem {
  constructor(public readonly size: number = 64) {}

  getChunk(x: number, y: number) {
    return {
      id: `${x}:${y}`,
      x,
      y,
      size: this.size
    };
  }
}
```

---

DATEI
NavMeshNodes.ts

PFAD
/server/src/modules/world/NavMeshNodes.ts

INHALT
```
export class NavMeshNodes {
  createNode(x:number, y:number){
    return { x, y, walkable: true };
  }
}
```

---

DATEI
Pathfinding.ts

PFAD
/server/src/modules/world/Pathfinding.ts

INHALT
```
export class Pathfinding {
  findPath(from:{x:number;y:number}, to:{x:number;y:number}){
    return [from, to];
  }
}
```

---

DATEI
ResourceScatter.ts

PFAD
/server/src/modules/world/ResourceScatter.ts

INHALT
```
export class ResourceScatter {
  generateForBiome(biome:string){
    if (biome === "forest") return ["wood","berries"];
    if (biome === "mountain") return ["stone","iron"];
    if (biome === "desert") return ["salt","crystals"];
    return [];
  }
}
```

---

DATEI
SeasonSystem.ts

PFAD
/server/src/modules/world/SeasonSystem.ts

INHALT
```
export class SeasonSystem {
  private seasons = ["spring", "summer", "autumn", "winter"] as const;
  getSeason(tick:number){
    return this.seasons[tick % this.seasons.length];
  }
}
```

---

DATEI
SeasonalEventBridge.ts

PFAD
/server/src/modules/world/SeasonalEventBridge.ts

INHALT
```
export class SeasonalEventBridge {
  eventForSeason(season: string) {
    const map: Record<string, string> = {
      spring: "harvest_bloom",
      summer: "heatwave_fair",
      autumn: "harvest_festival",
      winter: "long_night"
    };
    return map[season] || "unknown_season";
  }
}
```

---

DATEI
ShadowRegisterPortal.ts

PFAD
/server/src/modules/world/ShadowRegisterPortal.ts

INHALT
```
export class ShadowRegisterPortal {
  activate(regionId: string) {
    return {
      regionId,
      active: true,
      activatedAt: Date.now()
    };
  }
}
```

---

DATEI
TerrainGenerator.ts

PFAD
/server/src/modules/world/TerrainGenerator.ts

INHALT
```
export class TerrainGenerator {
  getHeight(x: number, y: number) {
    return Math.sin(x * 0.1) + Math.cos(y * 0.1);
  }
}
```

---

DATEI
TravelHazards.ts

PFAD
/server/src/modules/world/TravelHazards.ts

INHALT
```
export const TravelHazards = {
  swamp: ["slow", "poison_risk"],
  mountain: ["fall_risk", "cold"],
  desert: ["heat", "dehydration"]
};
```

---

DATEI
WeatherSystem.ts

PFAD
/server/src/modules/world/WeatherSystem.ts

INHALT
```
export class WeatherSystem {
  nextWeather(seed:number){
    const states = ["clear","rain","storm","fog","snow","heatwave"];
    return states[Math.abs(seed) % states.length];
  }
}
```

---

DATEI
WorldSeed.ts

PFAD
/server/src/modules/world/WorldSeed.ts

INHALT
```
export class WorldSeed {
  constructor(public readonly seed:number){}
}
```

---

DATEI
WorldState.ts

PFAD
/server/src/modules/world/WorldState.ts

INHALT
```
export class WorldState {
  snapshot(data:any){
    return {
      capturedAt: Date.now(),
      data
    };
  }
}
```

---

DATEI
WorldStateStore.ts

PFAD
/server/src/modules/world/WorldStateStore.ts

INHALT
```
export class WorldStateStore {
  private state: Record<string, any> = {};
  set(key: string, value: any) { this.state[key] = value; }
  get(key: string) { return this.state[key]; }
  dump() { return this.state; }
}
```

---

DATEI
WorldWonderRegistry.ts

PFAD
/server/src/modules/world/WorldWonderRegistry.ts

INHALT
```
export const WorldWonderRegistry = {
  shadow_register_portal: {
    id: "shadow_register_portal",
    type: "world_wonder",
    effects: ["npc_alignment_shift", "siege_exception_zone"]
  }
};
```

---

DATEI
AdminAuditLog.ts

PFAD
/server/src/modules/world-editor/AdminAuditLog.ts

INHALT
```
export class AdminAuditLog {
  private entries: any[] = [];

  log(actorId: string, action: string, payload: any) {
    this.entries.push({
      actorId,
      action,
      payload,
      timestamp: Date.now()
    });
  }

  all() {
    return this.entries;
  }
}
```

---

DATEI
ObjectPlacement.ts

PFAD
/server/src/modules/world-editor/ObjectPlacement.ts

INHALT
```
export class ObjectPlacement {
  place(assetId: string, position: {x:number;y:number;z:number}) {
    return { assetId, position, placedAt: Date.now() };
  }
}
```

---

DATEI
TerrainBrush.ts

PFAD
/server/src/modules/world-editor/TerrainBrush.ts

INHALT
```
export class TerrainBrush {
  apply(chunkId: string, brushType: string, strength: number) {
    return { chunkId, brushType, strength, appliedAt: Date.now() };
  }
}
```

---

DATEI
WorldEditorServer.ts

PFAD
/server/src/modules/world-editor/WorldEditorServer.ts

INHALT
```
export class WorldEditorServer {
  spawnEntity(type: string, position: { x: number; y: number; z: number }) {
    return { action: "spawn", type, position };
  }

  moveEntity(entityId: string, position: { x: number; y: number; z: number }) {
    return { action: "move", entityId, position };
  }

  deleteEntity(entityId: string) {
    return { action: "delete", entityId };
  }
}
```

---

DATEI
PacketRouter.ts

PFAD
/server/src/networking/PacketRouter.ts

INHALT
```
export class PacketRouter {
  route(packet: any) {
    return {
      handled: true,
      type: packet?.type ?? "unknown"
    };
  }
}
```

---

DATEI
PlayerSession.ts

PFAD
/server/src/networking/PlayerSession.ts

INHALT
```
export type PlayerSession = {
  id: string;
  name: string;
  connectedAt: number;
  position: { x: number; y: number; z: number };
};
```

---

DATEI
WebSocketServer.ts

PFAD
/server/src/networking/WebSocketServer.ts

INHALT
```
import type { Server as HttpServer } from "node:http";
import { WebSocketServer } from "ws";

export class GameWebSocketServer {
  private wss: WebSocketServer | null = null;

  constructor(private readonly httpServer: HttpServer) {}

  start() {
    this.wss = new WebSocketServer({ server: this.httpServer });

    this.wss.on("connection", (socket) => {
      socket.send(JSON.stringify({
        type: "welcome",
        message: "Arelorian connection established"
      }));

      socket.on("message", (msg) => {
        console.log("WS message:", msg.toString());
      });
    });
  }
}
```

---

DATEI
client-contract.test.md

PFAD
/server/src/tests/client-contract.test.md

INHALT
```
# Client Contract Test Outline

- route manifest shape
- websocket welcome packet shape
- ui text key availability
- panel bootstrap compatibility
```

---

DATEI
economy.test.md

PFAD
/server/src/tests/economy.test.md

INHALT
```
# Economy Test Outline

- market order placement
- matrix energy add/consume
- tax ledger records
- npc trade updates market
```

---

DATEI
final-audit.test.md

PFAD
/server/src/tests/final-audit.test.md

INHALT
```
# Final Audit Test Outline

- required docs exist
- required lock files exist
- server entry exists
- client entry exists
- route index exists
- reconstruction pack can be generated
```

---

DATEI
gameplay.test.md

PFAD
/server/src/tests/gameplay.test.md

INHALT
```
# Gameplay Test Outline

- player can gain skill xp
- combat reduces health
- loot tables produce expected id domain
- matrix energy can be consumed
```

---

DATEI
integration.test.md

PFAD
/server/src/tests/integration.test.md

INHALT
```
# Integration Test Outline

- server bootstrap + websocket
- session create + reconnect
- quest state save + load
- market order + settlement fee
- notification dispatch
```

---

DATEI
security.test.md

PFAD
/server/src/tests/security.test.md

INHALT
```
# Security Test Outline

- payload object validation
- suspicious movement detection
- role guard permission checks
```

---

DATEI
server.test.md

PFAD
/server/src/tests/server.test.md

INHALT
```
# Server Test Outline

- bootstrap starts
- websocket welcome packet is emitted
- world tick starts
- health route answers ok
```

---

DATEI
social.test.md

PFAD
/server/src/tests/social.test.md

INHALT
```
# Social Test Outline

- guild creation
- guild member add
- friend add/list
- party create
```

---

DATEI
tsconfig.json

PFAD
/server/tsconfig.json

INHALT
```
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": [
    "src/**/*"
  ]
}
```

---

DATEI
README_ASSETS.md

PFAD
/world-assets/README_ASSETS.md

INHALT
```
# World Assets

Lege hier GLB-Assets ab:
- characters/
- monsters/
- buildings/
- props/
- vegetation/
- admin/

Beispiele:
- uschi_gossip.glb
- warrior_male.glb
- warrior_female.glb
- castle_gate.glb
- castle_watch_tower.glb
- tree_oak_spring.glb
- gm_giraffe.glb
```
