# Areloria / Wasd Agentenpaket Textversion

## Zweck
Diese Textversion ist für Agenten oder No-Code-Systeme gedacht, die keine PDF-Tools besitzen.
Sie bündelt die Kernaussagen aus:
- Manuskript I
- Manuskript II
- Agenten-Startblatt

Sie ist absichtlich klar, streng und maschinenfreundlich formuliert.

---

## 1. Projektidentität

Areloria / Ouroboros ist ein serverautoritativer Browser-MMORPG-Baukasten.
Das Projekt ist **kein** Mockup und **keine** reine Demo-App.
Es soll als datengetriebene, skalierbare MMORPG-Grundlage weiterentwickelt werden.

### Unverrückbare Kernregeln
- Serverautorität bleibt erhalten
- Chunk-System bleibt 64x64
- Observer-Simulation bleibt Pflicht
- Datengetriebene NPCs, Quests, Dialoge und Spawns bleiben Pflicht
- Item Registry bleibt Source of Truth
- Persistenz muss konsistent bleiben
- Runtime soll generisch bleiben, keine One-Off-Sonderlogik
- Content-Validation-Pipeline bleibt aktiv
- Aktueller Vertical Slice darf nicht zerstört werden

---

## 2. Was das Projekt bereits kann

Der aktuelle Stand ist ein **starker interner Vertical Slice** mit wachsender Content-Pipeline.

### Bereits umgesetzt
- Character-Login über stabilen Namen
- Serverautoritative Bewegung
- WebSocket-Weltzustand
- Queststart und Questabschluss
- Belohnungen
- Inventory
- Equip / Unequip
- Kleiner Combat-Hook
- Persistenz über Neustart
- Hydration über Item Registry
- Data-driven NPCs
- Data-driven Quests
- Data-driven Dialogues
- Data-driven Spawns
- Quest-Prerequisites
- Quest-Ketten
- Reputation-System
- Quest-UI mit Zuständen:
  - locked
  - available
  - active
  - completed
- Ground Loot Entity + Pickup
- Tooltips und Welt-Labels
- Content-Validator
- Content-Manifest
- Wiederholbare Tests / Prüfroutinen

### Bereits bewiesene Prinzipien
- Quest-, Drop- und Equip-Items laufen konsistent durch dieselbe Item-Kette
- currentStep bei Multi-Step-Quests wird persistiert
- Tooltip und Interaktion teilen dieselbe Zielauswahlregel
- Content kann ohne Runtime-Code-Erweiterung über Daten hinzugefügt werden

---

## 3. Was das Projekt noch nicht ist

Dies ist **nicht** öffentlich releasefertig.

### Noch offen für Produktionsreife
- Echte Authentifizierung
- Produktionsdatenbank statt nur leichter Persistenzbasis
- Tiefere Combat- und Enemy-Systeme
- Reifere Inventory-/Loot-/UI-Politur
- Umfangreicher Content
- Härtere Last-/Netzwerk-/Fehlertests
- Mehr Assets / GLB-Bestückung
- Größere Performance- und Security-Härtung

---

## 4. Repo- und Architektur-Denkweise

### Aktive Runtime
- Client: Vite / Browser / Three.js
- Server: Express / WebSocket / TypeScript
- Data Layer: JSON-Driven Content
- Persistenz: einfacher persistenter Kern
- Validation: Build-nahe Content-Prüfung

### Inaktive / Legacy-Struktur
Falls alte Next.js-/Root-Strukturen im Repo liegen:
- nicht blind löschen
- nur als Legacy / inaktiv behandeln
- Cleanup nur kontrolliert und später

---

## 5. Regeln für jeden Agenten

## Erst lesen, dann handeln
Lies in dieser Reihenfolge:
1. README_START_HERE.md
2. PROJECT_LOCK_RULES.md
3. final-lock/FINAL_TRUTH.md
4. docs/MASTER_DESIGN_BIBLE.md
5. docs/BUILD_SEQUENCE_MASTER.md
6. FINAL_MASTER_DELIVERY_INDEX.md
7. FINAL_CHECKLIST_AUDIT.md
8. docs/NO_CODE_RECONSTRUCTION_GUIDE.md
9. dieses Agentenpaket

## Niemals tun
- nichts vereinfachen
- keine Kernarchitektur entfernen
- keine funktionierende Runtime durch simplere Demo ersetzen
- keine One-Off-Logik pro NPC/Quest einbauen, wenn generisch möglich
- keine riskanten Umbauten direkt auf main
- keine Behauptung „release ready“, wenn es nicht bewiesen ist

## Immer tun
- zuerst prüfen
- dann genau einen kleinen Schritt auswählen
- dann nur diesen Schritt implementieren
- danach Build / Tests / Validatoren laufen lassen
- dann konkret berichten

---

## 6. Pflicht-Ausgabeformat für Agenten

Für jede Arbeitsrunde berichten in genau dieser Struktur:

A. Ziel dieses Schritts  
B. Dateien geändert  
C. Was genau geändert wurde  
D. Prüfungen ausgeführt  
E. Ergebnis  
F. Verbleibende Risiken  
G. Nächster kleinster sinnvoller Schritt

Keine langen Selbstgespräche.
Keine Planungsmonologe.
Keine vagen Aussagen wie „Made changes“.

---

## 7. Safe vs Unsafe Änderungen

### Safe / kleine saubere Schritte
- Content-Validation verbessern
- Manifeste erzeugen
- Datengetriebenen Content hinzufügen
- Kleine UI-/UX-Verbesserungen
- Tests ergänzen
- Build-/Workflow-Härtung
- Kleine Renderer-/Tooltip-/HUD-Verbesserungen
- Kleine Persistenz- oder Konsistenzfixes mit Beweis

### Unsafe / review-pflichtig
- WorldTick-Kern neu designen
- Chunk-/Observer-Modell ändern
- Combat-Kern groß umbauen
- Inventory-/Equip-/Persistence-Modell neu strukturieren
- WebSocket-Protokoll stark ändern
- Auth-System blind einziehen
- Architekturwechsel ohne klaren Plan

---

## 8. Content-Autorenmodus

Neue Inhalte sollen möglichst **nur über Daten** eingebracht werden.

### Typische Datenquellen
- game-data/npc/npcs.json
- game-data/quests/quests.json
- game-data/dialogue/dialogues.json
- game-data/spawns/npc-spawns.json
- game-data/items/items.json
- game-data/content-manifest.json

### Vor jedem Content-Merge prüfen
- IDs eindeutig
- Referenzen gültig
- prerequisiteQuestIds gültig
- objective targets gültig
- reward itemIds gültig
- dialogue nodes erreichbar
- Spawn-Referenzen gültig

---

## 9. Aktueller kleiner Gameplay-Kern

Ein funktionierender Mini-Loop existiert bereits:

1. Login mit Character-Name
2. Spawn / Bewegung
3. NPC-Interaktion
4. Queststart
5. Questfortschritt
6. Reward
7. Inventory
8. Equip
9. Combat gegen Testziel
10. Loot erscheint in der Welt
11. Pickup per Interaktion
12. Save / Load / Restore

Dieser Loop darf nicht beschädigt werden.

---

## 10. Quest-System-Stand

### Vorhanden
- Single-Step-Quests
- Multi-Step-Quests
- Quest-Prerequisites
- Quest-Ketten
- Lesbare Step-Beschreibungen
- Persistierter currentStep
- Quest-Status-UI

### Weiterhin wichtig
- Runtime bleibt generisch
- keine questId-spezifischen Sonderzweige
- Objectives datengetrieben

---

## 11. Reputation- und Dialogstand

### Vorhanden
- Reputation im Player-State
- Reputation-Gates für Quests
- Reputation-gesteuerte Dialogzweige
- Choice-/Flag-System
- Schutz gegen Reputation-Farming durch wiederholte Choices

### Achtung
- keine endlos farmbaren Dialogeffekte
- Flag- und Choice-Änderungen müssen serverseitig kontrolliert bleiben

---

## 12. Item- und Inventory-Wahrheit

### Source of Truth
ItemRegistry

### Dauerhafter Zustand
Items werden minimal gespeichert, z. B.:
- { id: "starter_sword" }

### Laufzeit-Hydration
Beim Laden werden Itemdaten aus der Registry wieder ergänzt:
- name
- slot
- type
- damage
- rarity
- description

### Wichtig
Quest-Items, Drop-Items, Inventory-Items und Equip-Items müssen denselben konsistenten Pfad verwenden.

---

## 13. Renderer- und UX-Stand

### Vorhanden
- Entity-Reconciliation per stabiler ID
- Interaktionstooltip
- Welt-Labels für NPC/Loot
- Einfachere lesbare Target-Infos
- Loot-Visual
- Floating Combat Feedback
- Ground Loot

### Wichtig
Tooltip und Interaktion müssen dieselbe Prioritätslogik teilen.
Loot vor NPC ist aktuell eine definierte Priorität, wenn beides nah ist.

---

## 14. CI / Validation / Repo-Wächter

### Ziel
Jede Änderung soll durch einen strengen, aber vernünftigen Repo-Wächter laufen.

### Mindestprüfungen
- Content-Validation
- Server Build
- Client Build
- Smoke-Tests
- Vertical Slice Prüfung
- Item-/Persistenzkonsistenz
- Content-Manifest

### Safe-Autofix nur für
- Manifest neu erzeugen
- Reports
- Artefakt-Aufräumen
- harmlose Workflow-/Format-Sachen

### Nicht blind auto-fixen
- Runtime-Kern
- Chunk/Observer
- Combat-Kern
- Persistence-Modell
- Questfluss-Kern

---

## 15. Empfohlene Arbeitsweise für neue Agenten

### Schritt 1
Lies die Kernunterlagen.

### Schritt 2
Analysiere:
- was läuft
- was Skeleton ist
- was kritisch ist

### Schritt 3
Wähle nur **einen** kleinen nächsten Schritt.

### Schritt 4
Ändere nur die notwendigen Dateien.

### Schritt 5
Führe Build, Tests und Validatoren aus.

### Schritt 6
Berichte streng strukturiert.

---

## 16. Empfohlene nächsten sinnvollen Ausbaupfade

Nicht alles gleichzeitig.

### Gute kleine nächste Schritte
- echte Live-In-Game-Beweise für vorhandene Systeme
- kleine Quest-/Dialog-Politur
- weitere datengetriebene Content-Packs
- Build-/Validator-/Manifest-Härtung
- kleine UX-Politur, solange die Datenwahrheit intakt bleibt

### Schlechte nächste Schritte
- sofort großes Full-Auth-System
- massive Economy-/AI-Explosion
- Architekturumschreiben
- harte Sonderlogik für Einzelfälle
- blinder „make it release ready“-Rambo-Modus

---

## 17. Direkt einsetzbarer Kurzprompt für Agenten

Du arbeitest am Areloria/Ouroboros-Repo im vorsichtigen Gärtner-Modus.

Aufgabe:
1. Prüfe den aktuellen Stand.
2. Nenne den kleinsten sinnvollen nächsten Schritt.
3. Ändere nur, was für diesen einen Schritt nötig ist.
4. Führe danach Build, Validatoren und relevante Tests aus.
5. Berichte exakt:
- Ziel
- geänderte Dateien
- Ergebnis
- offene Risiken
- nächster Schritt

Wichtige Regeln:
- nichts vereinfachen
- keine Kernarchitektur verletzen
- keine One-Off-Sonderlogik
- server authority, 64x64 chunks, observer, persistence, item registry und data-driven content müssen intakt bleiben
- niemals direkt auf main pushen

---

## 18. Kurzfazit

Wenn du ein Agent bist:
- Dieses Projekt ist bereits weit mehr als ein leerer Scaffold.
- Es besitzt einen echten, kleinen, persistenten Gameplay-Kern.
- Deine Aufgabe ist nicht, es neu zu erfinden.
- Deine Aufgabe ist, es diszipliniert, datengetrieben und strukturschonend weiterzuentwickeln.

Arbeite präzise.
Arbeite klein.
Arbeite nachvollziehbar.
Beschädige nichts, was schon lebt.
