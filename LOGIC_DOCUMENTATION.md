# WASD Logic Documentation - Areloria MMORPG

## 📋 Inhaltsverzeichnis

1. [System-Übersicht](#system-übersicht)
2. [Kern-Systeme](#kern-systeme)
3. [NPC & KI-Systeme](#npc--ki-systeme)
4. [Spieler-Systeme](#spieler-systeme)
5. [Welt-Systeme](#welt-systeme)
6. [Wirtschafts-Systeme](#wirtschafts-systeme)
7. [Soziale Systeme](#soziale-systeme)
8. [Neon-Axiom-Integrationen](#neon-axiom-integrationen)
9. [Datenfluss & Architektur](#datenfluss--architektur)
10. [Performance & Optimierungen](#performance--optimierungen)

---

## System-Übersicht

**Areloria** ist ein Browser-basiertes 3D-MMORPG mit komplexen NPC-Systemen, emergenten Sozialsystemen und einer dynamischen Welt. Das System ist in **70+ spezialisierte Module** aufgeteilt, die über einen zentralen **WorldTick**-Loop orchestriert werden.

### Technologie-Stack

| Komponente | Technologie |
| :--- | :--- |
| **Frontend** | Vite + TypeScript + **Babylon.js** (primary); optional PlayCanvas fallback in repo |
| **Backend** | Node.js + TypeScript + Express/Fastify |
| **Datenbank** | Firebase Firestore + Redis (Caching/Thinkinglogs) |
| **Authentifizierung** | OAuth + Session Management |
| **Real-time** | WebSocket (Networking Layer) |

---

## Kern-Systeme

### 1. WorldTick (Orchestration Loop)

**Datei:** `server/src/core/WorldTick.ts`

Der **WorldTick** ist das Herzstück des Servers. Er wird alle **100ms** ausgeführt und orchestriert alle Spielsysteme:

```typescript
// Pseudo-Code des WorldTick-Loops
while (gameRunning) {
  // 1. Spieler-Input verarbeiten (WASD-Movement, Attacken, Interaktionen)
  processPlayerInput();
  
  // 2. NPC-Systeme aktualisieren
  npcSystem.tick(players, worldTime);
  
  // 3. Welt-Systeme aktualisieren (Wetter, Ressourcen, etc.)
  worldSystem.tick();
  
  // 4. Kampf-Logik verarbeiten
  combatSystem.tick();
  
  // 5. Wirtschafts-Systeme aktualisieren
  economySystem.tick();
  
  // 6. Persistenz speichern
  persistenceSystem.save();
  
  // 7. Entity-Sync an Clients senden
  broadcastEntitySync();
  
  await sleep(100); // 10 Ticks pro Sekunde
}
```

**Wichtige Funktionen:**
- **Spieler-Positionen:** Aus WASD-Input aktualisiert (X, Y, Z).
- **NPC-Spawning:** Aus `game-data/spawns/npc-spawns.json` geladen.
- **Broadcast-Synchronisation:** Spieler, NPCs, Loot, World Objects an alle Clients.

---

### 2. WebSocket-Netzwerk

**Datei:** `server/src/networking/WebSocketServer.ts`

Verwaltet die Echtzeit-Kommunikation zwischen Client und Server:

- **Login/Logout:** Spieler-Session erstellen/zerstören.
- **Input-Events:** WASD-Bewegung, Attacken, Interaktionen.
- **Broadcast-Payloads:** Regelmäßige Synchronisation von Spielerzuständen.

```typescript
// Beispiel: WASD-Input-Verarbeitung
socket.on("input", (data) => {
  const { playerId, direction, boost } = data;
  playerSession.updateMovement(playerId, direction, boost);
  // Wird im nächsten WorldTick verarbeitet
});
```

---

## NPC & KI-Systeme

### 1. NPCSystem (Kern-NPC-Verwaltung)

**Datei:** `server/src/modules/npc/NPCSystem.ts`

Das zentrale NPC-Management-System mit Personality, Memory, Genealogy und Schedule-Support.

#### Datenstruktur eines NPCs

```typescript
interface NPC {
  id: string;
  name: string;
  role: string; // "Civilian", "Guard", "Trader", etc.
  position: { x: number; y: number; z: number };
  health: number;
  maxHealth: number;
  stamina: number;
  inventory: Item[];
  
  // Personality (von NPCPersonalityEngine)
  personality: {
    courage: number;      // 0-1
    curiosity: number;    // 0-1
    greed: number;        // 0-1
    faith: number;        // 0-1
    aggression: number;   // 0-1
  };
  
  // Memory (von NPCMemoryEngine)
  memory: MemoryEntry[];
  
  // Genealogy (von NPCGenealogyEngine)
  dna: Lineage;
  
  // Bedürfnisse (Neon Axiom Integration)
  needs: {
    hunger: number;       // 0-100
    energy: number;       // 0-100
  };
  
  // State Machine
  state: "idle" | "wandering" | "working" | "interacting" | "combat" | "sleeping";
  stateTimer: number;
  
  // Bewegung
  targetPosition: { x: number; y: number } | null;
  homePosition: { x: number; y: number };
  
  // Schedule
  currentScheduleAction: string | null;
}
```

#### NPC-Lifecycle

1. **Erstellung:** `createNPC(id, name, x, y)` - Erzeugt NPC mit Standardwerten.
2. **Tick-Verarbeitung:** Bedürfnisse, Bewegung, Interaktionen.
3. **Interaktion:** `handleInteraction(npcId, player)` - Dialogue-Trees und Quest-Hooks.
4. **Persistenz:** Speicherung in Firestore.

### 2. NPCPersonalityEngine

**Datei:** `server/src/modules/npc/NPCPersonalityEngine.ts`

Generiert zufällige Persönlichkeitsmerkmale für NPCs (0-1 Werte):
- **Courage:** Bereitschaft, Risiken einzugehen.
- **Curiosity:** Interesse an neuen Dingen.
- **Greed:** Verlangen nach Ressourcen.
- **Faith:** Religiöse Überzeugung.
- **Aggression:** Kampfbereitschaft.

Diese Werte beeinflussen NPC-Entscheidungen über die **LLM-Integration**.

### 3. NPCMemoryBridge (LLM-Integration)

**Datei:** `server/src/modules/npc/NPCMemoryBridge.ts`

Verbindet Redis-Thinkinglogs mit dem LLM für intelligente NPC-Entscheidungen:

```typescript
// Workflow:
1. Lese Thinkinglogs aus Redis (letzte 10 Gedanken)
2. Generiere Zusammenfassung via LLM (mit 60s Cache)
3. Baue Gedächtnis-Kontext auf (Personality + Memory + World State)
4. Generiere System-Prompt für LLM-Entscheidung
5. LLM gibt Aktion zurück: { action, thought, dialogText }
```

**Beispiel-Prompt:**
```
Du bist ein NPC in einem Fantasy-MMORPG namens Areloria.
Dein Name: Thorin
Deine Persönlichkeit: { courage: 0.8, greed: 0.3, ... }

Dein Gedächtnis:
Thorin war zuletzt damit beschäftigt, Erz abzubauen. 
Aktuell: Hunger ist niedrig (30%).

Weltzustand: Stabil

Antworte mit JSON: { "action": "wander|work|sleep|eat|interact", "thought": "...", "dialogText": "..." }
```

### 4. NPCMemoryEngine & NPCThinkingLogService

**Dateien:**
- `server/src/modules/npc/NPCMemoryEngine.ts` (In-Memory)
- `server/src/modules/npc/NPCThinkingLogService.ts` (Redis-Persistenz)

**NPCMemoryEngine:** Speichert episodische Erinnerungen im RAM.
```typescript
remember(npcId: string, event: string): void
recall(npcId: string): MemoryEntry[]
```

**NPCThinkingLogService:** Persistiert Gedanken in Redis mit TTL:
- **Max Log Entries:** 50 pro NPC
- **Current Thought TTL:** 30 Sekunden
- **History TTL:** 24 Stunden

### 5. NPCScheduleRegistry

**Datei:** `server/src/modules/npc/NPCScheduleRegistry.ts`

Definiert tagesbasierte Routinen für NPCs:

```typescript
const NPCScheduleRegistry = {
  npc_1: [
    { time: 6, action: "wake", target: { x: 100, y: 50 } },
    { time: 8, action: "work", target: { x: 150, y: 60 } },
    { time: 12, action: "eat", target: { x: 120, y: 55 } },
    { time: 14, action: "work", target: { x: 150, y: 60 } },
    { time: 22, action: "sleep", target: { x: 100, y: 50 } }
  ]
};
```

Der NPCSystem.tick() prüft die aktuelle Tageszeit und setzt den NPC-State entsprechend.

### 6. NPCRelationshipSystem (Neon Axiom Integration)

**Datei:** `server/src/modules/npc/NPCRelationshipSystem.ts`

Verwaltet soziale Beziehungen zwischen NPCs mit Affinity-Logik:

```typescript
class NPCRelationshipSystem {
  // Beziehungswerte zwischen -1 (feindlich) und 1 (freundlich)
  set(a: string, b: string, value: number): number
  get(a: string, b: string): number
  
  // Neon Axiom: Affinity-Anpassung
  adjustAffinity(a: string, b: string, delta: number): number
  
  // Neon Axiom: Affinity-Verfall über Zeit
  decay(rate: number = 0.01): void
  
  // Neon Axiom: Wissens-Sharing (10% Chance bei Affinity > 0.5)
  canShareKnowledge(a: string, b: string): boolean
}
```

**Affinity-Logik:**
- **Positive Interaktionen:** +0.05 Affinity
- **Negative Interaktionen:** -0.05 Affinity
- **Decay pro Tick:** -0.01 (wenn Affinity > 0)
- **Wissens-Sharing:** Wenn Affinity > 0.5 und Zufallswert < 0.1

### 7. NPCGenealogyEngine

**Datei:** `server/src/modules/npc/NPCGenealogyEngine.ts`

Verwaltet Familienstammbaum und Genealogie:

```typescript
interface Lineage {
  id: string;
  house: string;
  parents: string[];
  children: string[];
}
```

Ermöglicht Familien-Emergenz und Erbe-Mechaniken.

### 8. BehaviorTree (Einfache Bedürfnis-Logik)

**Datei:** `server/src/modules/ai/BehaviorTree.ts`

Minimale Bedürfnis-basierte Aktion-Auswahl:

```typescript
run(npc: NPC): string {
  if (npc.needs?.sleep) return "sleep";
  if (npc.needs?.hunger) return "eat";
  if (npc.job) return "work";
  return "wander";
}
```

---

## Spieler-Systeme

### 1. PlayerSession & Authentication

**Dateien:**
- `server/src/networking/PlayerSession.ts`
- `server/src/modules/auth/SessionRegistry.ts`

Verwaltet Spieler-Sessions und Authentifizierung:

```typescript
interface PlayerSession {
  playerId: string;
  username: string;
  position: { x: number; y: number; z: number };
  health: number;
  stamina: number;
  inventory: Item[];
  quests: Quest[];
  flags: Record<string, boolean>;
  reputation: Record<string, number>;
  usedChoices: string[];
}
```

### 2. Character System

**Datei:** `server/src/modules/character/CharacterSystem.ts`

Verwaltet Charakter-Erstellung und -Attribute.

### 3. Inventory System

**Datei:** `server/src/modules/inventory/InventorySystem.ts`

Verwaltet Gegenstände, Ausrüstung und Loot.

### 4. Equipment System

**Datei:** `server/src/modules/equipment/EquipmentSystem.ts`

Verwaltet Ausrüstung, Affixe und Itemstats.

---

## Welt-Systeme

### 1. WorldSystem & WorldTick

**Dateien:**
- `server/src/modules/world/WorldSystem.ts`
- `server/src/core/WorldTick.ts`

Verwaltet den globalen Weltzustand:
- **Chunk-System:** Räumliche Partitionierung für Performance.
- **Terrain-Generator:** Prozedurales Terrain.
- **Weather System:** Dynamisches Wetter mit Effekten.
- **Resource Scatter:** Zufällige Ressourcen-Verteilung.

### 2. ChunkSystem

**Datei:** `server/src/modules/world/ChunkSystem.ts`

Partitioniert die Welt in Chunks für effiziente Queries:

```typescript
// Chunk-Größe: 100x100 Einheiten
// Ermöglicht O(1) Abfragen für Entitäten in einer Region
getChunk(x: number, y: number): Chunk
getNearbyChunks(x: number, y: number, radius: number): Chunk[]
```

### 3. TerrainGenerator

**Datei:** `server/src/modules/world/TerrainGenerator.ts`

Generiert prozedurales Terrain mit Perlin-Noise.

### 4. WeatherSystem

**Datei:** `server/src/modules/world/WeatherSystem.ts`

Simuliert dynamisches Wetter:
- **Regen:** Beeinflusst Sichtweite und Bewegungsgeschwindigkeit.
- **Schnee:** Verringert Bewegungsgeschwindigkeit.
- **Sturm:** Kann NPCs und Spieler verletzen.

### 5. ResourceSystem

**Datei:** `server/src/modules/world/ResourceSystem.ts`

Verwaltet abbaubare Ressourcen (Erz, Holz, etc.):
- **Respawn-Logik:** Ressourcen respawnen nach Zeit.
- **Qualitäts-Variation:** Unterschiedliche Qualitäten basierend auf Region.

### 6. ObserverEngine

**Datei:** `server/src/modules/observer/ObserverEngine.ts`

Verwaltet Spieler-Sichtbereich und Entity-Synchronisation:
- **Sichtbereich:** Nur Entitäten im Sichtbereich werden synchronisiert.
- **Interest Management:** Reduziert Netzwerk-Bandbreite.

---

## Wirtschafts-Systeme

### 1. EconomySystem

**Datei:** `server/src/modules/economy/EconomySystem.ts`

Verwaltet globale Wirtschaft:
- **Preis-Balancierung:** Dynamische Preise basierend auf Angebot/Nachfrage.
- **Inflation/Deflation:** Geldmenge-Kontrolle.
- **Steuern:** Spieler-Steuern für Transaktionen.

### 2. MarketSystem

**Datei:** `server/src/modules/market/MarketSystem.ts`

Verwaltet Marktplatz und Auktionen:
- **Listing-System:** Spieler können Items auflisten.
- **Auktions-Logik:** Automatische Auktion mit Mindestgebot.
- **Price History:** Tracking von historischen Preisen.

### 3. AuctionSystem

**Datei:** `server/src/modules/auction/AuctionSystem.ts`

Spezialisierte Auktions-Engine mit:
- **Bidding:** Spieler können bieten.
- **Auto-Extend:** Auktion verlängert sich, wenn kurz vor Ende geboten wird.
- **Shill-Prevention:** Schutz vor Fake-Geboten.

### 4. LootSystem

**Datei:** `server/src/modules/loot/LootSystem.ts`

Generiert Loot basierend auf:
- **Monster-Level:** Höhere Level = bessere Items.
- **Affix-System:** Zufällige Affixe (Präfixe/Suffixe).
- **Rarity:** Common, Uncommon, Rare, Epic, Legendary.

### 5. ItemGenerator

**Datei:** `server/src/modules/items/ItemGenerator.ts`

Generiert Items mit Affixen:

```typescript
interface Item {
  id: string;
  name: string;
  type: "weapon" | "armor" | "consumable";
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  level: number;
  stats: {
    damage?: number;
    armor?: number;
    health?: number;
  };
  affixes: Affix[];
}
```

### 6. AffixSystem

**Datei:** `server/src/modules/items/AffixSystem.ts`

Verwaltet Item-Affixe:
- **Präfixe:** "+10% Schaden", "+5 Rüstung"
- **Suffixe:** "des Feuers", "der Kälte"
- **Unique Affixes:** Spezielle Affixe für Legendary Items.

---

## Soziale Systeme

### 1. GuildSystem

**Datei:** `server/src/modules/guild/GuildSystem.ts`

Verwaltet Gilden (Spieler-Organisationen):

```typescript
interface Guild {
  id: string;
  name: string;
  founderId: string;
  members: GuildMember[];
  ranks: GuildRank[];
  treasury: number;
  createdAt: number;
}
```

**Funktionen:**
- **Member Management:** Beitritte, Ausschlüsse.
- **Rank System:** Hierarchie mit Permissions.
- **Treasury:** Gemeinsame Geldkasse.

### 2. FactionSystem

**Datei:** `server/src/modules/faction/FactionSystem.ts`

Verwaltet Fraktionen (Spieler-Gruppen mit Reputation):
- **Reputation:** Spieler können Reputation bei Fraktionen verdienen.
- **Faction Quests:** Spezielle Quests für Fraktionen.
- **Faction Wars:** Konflikte zwischen Fraktionen.

### 3. ReputationSystem

**Datei:** `server/src/modules/reputation/ReputationSystem.ts`

Verwaltet Spieler-Reputation bei Fraktionen:

```typescript
// Reputation-Werte: -1000 bis +1000
// Negative Werte = Feindselig
// Positive Werte = Freundlich
```

### 4. SocialSystem

**Datei:** `server/src/modules/social/SocialSystem.ts`

Verwaltet Spieler-Beziehungen:
- **Friends:** Freundesliste.
- **Ignore List:** Blockierte Spieler.
- **Group System:** Gruppen-Verwaltung.

### 5. ChatSystem

**Datei:** `server/src/modules/chat/ChatSystem.ts`

Verwaltet Chat-Kanäle:
- **Local Chat:** Nur Spieler in der Nähe.
- **Guild Chat:** Nur Gildenmitglieder.
- **Global Chat:** Alle Spieler.
- **Whisper:** Private Nachrichten.

### 6. MailSystem

**Datei:** `server/src/modules/mail/MailService.ts`

Verwaltet Post zwischen Spielern:
- **Mail-Versand:** Spieler können sich Nachrichten schreiben.
- **Anhänge:** Items können mitgesendet werden.
- **Expiration:** Alte Mails werden gelöscht.

---

## Neon-Axiom-Integrationen

### 1. Dynamischer Drive-Decay (Activity-Based)

**Implementiert in:** `server/src/modules/npc/NPCSystem.ts`

Die Bedürfnisse (Hunger, Energie) verfallen nun basierend auf NPC-Aktivität:

```typescript
// Decay-Multiplikatoren pro State
const decayMultipliers = {
  "idle": 0.5,        // Langsamer Verfall im Leerlauf
  "sleeping": 0.5,    // Langsamer Verfall beim Schlafen
  "wandering": 1.5,   // Normaler Verfall beim Wandern
  "working": 1.5,     // Normaler Verfall bei der Arbeit
  "combat": 3.0       // Schneller Verfall im Kampf
};

// Anwendung:
npc.needs.hunger -= 0.01 * decayMultiplier;
npc.needs.energy -= 0.005 * decayMultiplier;
```

**Effekt:** NPCs müssen sich schneller ausruhen nach Kampf, können aber länger im Leerlauf bleiben.

### 2. Affinity-System mit Decay

**Implementiert in:** `server/src/modules/npc/NPCRelationshipSystem.ts`

Beziehungen zwischen NPCs entwickeln sich dynamisch:

```typescript
// Affinity-Werte: -1 (feindlich) bis +1 (freundlich)
adjustAffinity(npcA, npcB, +0.05);  // Positive Interaktion
decay(0.01);                         // Affinity verfällt langsam
```

**Effekt:** NPCs vergessen Freunde/Feinde langsam, wenn sie sich nicht sehen.

### 3. Wissens-Sharing

**Implementiert in:** `server/src/modules/npc/NPCRelationshipSystem.ts`

NPCs können Wissen teilen, wenn sie befreundet sind:

```typescript
if (npcRelationshipSystem.canShareKnowledge(npcA, npcB)) {
  // 10% Chance, wenn Affinity > 0.5
  const memory = npcMemoryEngine.recall(npcA);
  npcMemoryEngine.remember(npcB, memory);
}
```

**Effekt:** Befreundete NPCs lernen voneinander über Erfahrungen.

---

## Datenfluss & Architektur

### 1. Hauptarchitektur-Diagramm

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Browser)                         │
│  (Three.js/Babylon.js Rendering + Input Handling)          │
└──────────────────────┬──────────────────────────────────────┘
                       │ WebSocket
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              WebSocket Server (Networking)                   │
│  - Login/Logout                                              │
│  - Input Events (WASD, Attacken, Interaktionen)             │
│  - Broadcast Payloads (Entity Sync)                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   WorldTick Loop (100ms)                     │
│  1. Process Player Input                                     │
│  2. Update NPC Systems                                       │
│  3. Update World Systems                                     │
│  4. Process Combat                                           │
│  5. Update Economy                                           │
│  6. Save Persistence                                         │
│  7. Broadcast Entity Sync                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┬──────────────┐
        ▼              ▼              ▼              ▼
    ┌────────┐  ┌────────────┐  ┌────────┐  ┌──────────┐
    │  NPC   │  │   World    │  │ Combat │  │ Economy  │
    │ System │  │  System    │  │ System │  │ System   │
    └────────┘  └────────────┘  └────────┘  └──────────┘
        │              │              │              │
        └──────────────┼──────────────┴──────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │   Firestore (Persistenz)         │
        │   Redis (Cache/Thinkinglogs)     │
        └──────────────────────────────────┘
```

### 2. NPC-Entscheidungs-Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│              NPC Tick (alle 100ms)                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   ┌─────────┐  ┌──────────┐  ┌──────────────┐
   │ Process │  │ Schedule │  │ Check Player │
   │ Needs   │  │ Update   │  │ Interaction  │
   └────┬────┘  └────┬─────┘  └──────┬───────┘
        │             │               │
        └─────────────┼───────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │ State Machine (idle/wander) │
        └────────────┬────────────────┘
                     │
                     ▼
        ┌─────────────────────────────┐
        │ Movement Logic              │
        │ (Target Position Update)    │
        └────────────┬────────────────┘
                     │
                     ▼
        ┌─────────────────────────────┐
        │ LLM Decision (optional)     │
        │ via NPCMemoryBridge         │
        └────────────┬────────────────┘
                     │
                     ▼
        ┌─────────────────────────────┐
        │ Broadcast NPC State         │
        │ to Clients                  │
        └─────────────────────────────┘
```

### 3. Spieler-Input-Verarbeitung (WASD)

```
Client Input (WASD Key Press)
        │
        ▼
WebSocket Event: "input"
{ playerId, direction, boost }
        │
        ▼
PlayerSession.updateMovement()
        │
        ▼
WorldTick: processPlayerInput()
        │
        ▼
Update Player Position
        │
        ▼
Broadcast to Nearby Clients
```

---

## Performance & Optimierungen

### 1. Chunk-System

Die Welt wird in **100x100 Einheiten große Chunks** aufgeteilt:
- **Vorteil:** O(1) Abfragen für Entitäten in einer Region.
- **Nachteil:** Chunk-Grenzen können zu Synchronisationsproblemen führen.

### 2. Observer Engine (Interest Management)

Nur Entitäten im Sichtbereich werden synchronisiert:
- **Sichtbereich:** ~100-200 Einheiten (konfigurierbar).
- **Bandbreite-Reduktion:** ~80% weniger Netzwerk-Traffic.

### 3. Redis Caching

- **Thinkinglogs:** Gedanken von NPCs werden in Redis gecacht (30s TTL).
- **Summarization Cache:** LLM-Zusammenfassungen werden 60s gecacht.
- **Session Cache:** Spieler-Sessions werden in Redis gepuffert.

### 4. NPC-Tick-Optimierungen

- **Early Exit:** Distant Players werden ignoriert (> 500 Einheiten).
- **State-Based Processing:** Nur relevante State-Übergänge werden verarbeitet.
- **Batch Updates:** Mehrere NPCs werden in einem Batch aktualisiert.

### 5. Lazy Loading

- **Dialogue Trees:** Nur geladen, wenn Spieler mit NPC interagiert.
- **Quest Data:** Nur geladen, wenn Spieler Quest-Geber interagiert.
- **Asset Data:** 3D-Modelle werden on-demand geladen.

---

## Erweiterungspunkte für Zukunft

### 1. Emergente Gilden (Neon Axiom)

**Geplant:** Automatische Gildengründung, wenn 10 NPCs hohe Affinity haben.

```typescript
// Pseudo-Code
if (npcA.affinity[npcB] > 0.8 && /* 10 NPCs mit hoher Affinity */) {
  createGuild(npcList);
}
```

### 2. Siedlungen (Neon Axiom)

**Geplant:** Automatische Siedlungsgründung, wenn 5 NPCs persistente Aktivität zeigen.

### 3. Axiom-Strings & Connectors (Neon Axiom)

**Geplant:** Welt-Reaktivität durch String-Patterns im Boden, die NPCs beeinflussen.

### 4. Archivar/Bibliothekar NPC-Typ

**Geplant:** Spezialisierter NPC, der Wissen sammelt und in `knowledgeBooks` speichert.

---

## Debugging & Monitoring

### 1. Telemetry Collector

**Datei:** `server/src/modules/analytics/TelemetryCollector.ts`

Sammelt Metriken:
- **NPC-Dichte:** Anzahl NPCs pro Chunk.
- **Gilden-Bildung:** Neue Gilden pro Stunde.
- **Ressourcen-Fluss:** Wirtschaftliche Metriken.

### 2. Performance Budget

**Datei:** `server/src/modules/analytics/PerformanceBudget.ts`

Überwacht Performance-Budgets:
- **WorldTick-Zeit:** Sollte < 100ms sein.
- **NPC-Tick-Zeit:** Sollte < 50ms sein.
- **Memory Usage:** Sollte < 2GB sein.

### 3. Admin Audit Log

**Datei:** `server/src/modules/admin/AdminAuditLog.ts`

Protokolliert alle Admin-Aktionen für Debugging.

---

## Zusammenfassung

Das WASD-System ist eine komplexe, modular aufgebaute MMORPG-Engine mit:
- **70+ spezialisierte Module** für verschiedene Spielaspekte.
- **Intelligente NPC-Systeme** mit Personality, Memory und LLM-Integration.
- **Dynamische Wirtschaft** mit Preis-Balancierung und Auktionen.
- **Soziale Emergenz** mit Gilden, Fraktionen und Reputation.
- **Neon-Axiom-Integrationen** für emergente Verhaltensweisen und Affinity-Systeme.

Die Architektur ist optimiert für **Performance** (Chunk-System, Interest Management) und **Skalierbarkeit** (Redis Caching, Lazy Loading).

---

**Dokumentation Version:** 1.0  
**Letzte Aktualisierung:** 2026-03-31  
**Autoren:** Manus AI Agent + OuroborosCollective Team
