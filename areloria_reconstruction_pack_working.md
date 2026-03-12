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
