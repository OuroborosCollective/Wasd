# Areloria WASD

Areloria WASD ist eine hochperformante 3D-RPG- und Metaverse-Plattform, die auf modernen Webtechnologien und KI-gesteuerten Agenten basiert. Das Projekt kombiniert eine immersive Spielwelt mit einem robusten World-Editor und administrativen Steuerungswerkzeugen.

## 🏗 Projektstruktur

Das Repository ist als Monorepo organisiert und umfasst folgende Hauptbereiche:

### 1. Core-Anwendungen (`apps/` & `client/`)
- **apps/api**: Node.js/TypeScript Backend-Services für die Logik-Optimierung.
- **apps/web / client**: Das Frontend der Anwendung. Nutzt Three.js/React für das Rendering der 3D-Welt.
- **backend**: Python-basierte Services für Scoring und Datenintegrität.

### 2. KI & Agenten-Systeme
- **.jules/**: Konfigurationen für das "Jules" KI-System (World Logic, Sentinel, Paletten).
- **agent/**: Enthält den "Arelorian Super Prompt" und Failsafe-Regeln für LLM-Agenten.
- **.agents_tmp/**: Temporäre Planungsdaten für Agenten-Workflows.

### 3. Administrative Werkzeuge (`admin-tools/`)
- **GM-Panel**: Live-Steuerung der Spielwelt und Berechtigungsmanagement.
- **World-Editor**: Werkzeuge für Terrain-Brushes, Objektplatzierung und Debugging von Mount-Punkten.
- **Rollback-Tools**: Recovery-Guides für Systemwiederherstellungen.

### 4. Assets (`client/public/assets/`)
Umfangreiche Bibliothek an 3D-Modellen im `.glb` und `.gltf` Format:
- **Buildings**: Schmieden, Tavernen, Häuser.
- **Characters**: NPCs (Krieger, Valkyrie) und Spielerklassen (Mage, Ranger, Warrior).
- **KayKit Integration**: Komplette Abenteurer- und Dungeon-Asset-Packs.
- **Environment**: Coniferous Forest Pack (Bäume, Felsen, Texturen).

## 🚀 Entwicklung & Deployment

### Voraussetzungen
- Node.js & npm/pnpm
- Python 3.x (für Backend-Services)
- Docker (für Containerisierung)

### Installation
bash
# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev


### CI/CD Pipeline
Das Projekt nutzt GitHub Actions für automatisierte Prozesse:
- `ci.yml`: Continuous Integration (Linting/Tests).
- `deploy.yml`: Automatisches Deployment.
- `frogbot-scan-and-fix.yml`: Sicherheitsscans und automatische Fixes.

## 📄 Dokumentation

Wichtige strategische Dokumente befinden sich im Root-Verzeichnis:
- `ARCHITECTURE_OVERVIEW.md`: Technischer Aufbau des Systems.
- `LLM_AGENT_DESIGN.md`: Design-Prinzipien der KI-Agenten.
- `MASTER_INDEX.md`: Zentrales Inhaltsverzeichnis aller Projektdokumente.
- `AUDIT_REPORT.md`: Berichte zur Systemintegrität und Konsistenzprüfungen.

## 🛠 Tech Stack
- **Frontend**: React, TypeScript, Three.js, Tailwind CSS.
- **Backend**: Node.js, Python, Supabase, Redis.
- **Infrastruktur**: Docker, Nginx, GitHub Actions.
- **KI**: Custom LLM Agent Logic (Jules Framework).

## ⚖️ Lizenz
Siehe `LICENSE` Datei für weitere Informationen.