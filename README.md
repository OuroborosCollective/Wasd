# Areloria: WASD – World Autonomous Simulation & Development

## Projektbeschreibung

Areloria: WASD ist eine hochperformante, webbasierte Simulations- und Spieleplattform, die auf einer synergetischen Architektur aus WebAssembly (WASM), modernsten KI-Agenten und Echtzeit-Backend-Systemen basiert. Das Projekt kombiniert eine immersive 3D-Welt mit einem tiefgreifenden autonomen Agenten-System (Projekt „Jules“), das dynamische Interaktionen und prozedurale Inhaltsgenerierung ermöglicht.

Dieses Repository enthält sowohl den hochoptimierten Client als auch die umfangreichen Administrations- und Editor-Tools, die für die Verwaltung und Erweiterung der Welt von Areloria erforderlich sind. Ein starker Fokus liegt auf der CI/CD-Automatisierung für die Bereitstellung in komplexen Umgebungen (VPS, Nginx, WASM-Optimierung).

## Kernfunktionen

- **Echtzeit-3D-Engine:** Unterstützung für WebAssembly-basierte Render-Pipelines für maximale Performance im Browser.
- **Autonome KI-Agenten:** Integration spezialisierter Agenten (Jules, Sentinel, Bolt), gesteuert durch LLM-Designs und Fail-Safe-Regelsysteme.
- **World Editor & GM Tools:** Umfangreiche Suite zur Echtzeit-Manipulation der Welt, einschließlich Terrain-Brushes, Objektplatzierung und Rollback-Mechanismen.
- **Skalierbares Backend:** Hybride Infrastruktur unter Nutzung von Supabase (PostgreSQL) und Redis für hochverfügbare Datenhaltung und Caching.
- **Enterprise DevOps:** Vollautomatisierte GitHub Workflows für Deployment, VPS-Diagnose, Nginx-Konfiguration und WASM-Fehlerbehebung.
- **Integrierte Dokumentation:** Umfassende Manuskripte, Manifeste und Logik-Dokumentationen für Entwickler und Gamemaster.

## Technische Architektur

Die Systemarchitektur ist modular aufgebaut und trennt strikt zwischen Rendering-Logik, Welt-Simulation und administrativer Kontrolle:

- **Frontend:** Next.js (App Router) kombiniert mit einer WASM-gesteuerten Client-Umgebung.
- **Datenhaltung:** Supabase für persistente Daten und Redis zur Orchestrierung von Echtzeit-Events.
- **Agenten-Layer:** Ein dediziertes System zur Definition von KI-Verhalten (`.jules` & `agent/`), das über standardisierte Prompts und Schnittstellen mit der Welt interagiert.
- **Automatisierung:** Ein robuster Satz an Python-Scripts und CI/CD-Pipelines zur Sicherstellung der Konsistenz über verschiedene Deployment-Stufen hinweg.

## Projektstruktur (Auszug)

text
.
├── .github/workflows/      # CI/CD-Pipelines (Deployment, Fixes, Diagnosen)
├── .jules/                 # Konfigurationsdateien für die KI-Agenten (Palette, Logik)
├── admin-tools/            # Gamemaster-Panel, World-Editor und Recovery-Tools
├── agent/                  # KI-Prompts, Failsafe-Regeln und Build-Instruktionen
├── app/                    # Next.js App-Router (Layout & Globale Styles)
├── client/                 # Client-Sourcecode, HTML-Entrypoints und Assets
├── backups/                # Automatisierte Sicherungen der Systemzustände
└── docs/                   # (In Form von MD-Dateien im Root) Architektur & Master-Indizes

## Installationshinweise

### Voraussetzungen

- Node.js (v18+)
- npm oder yarn
- Python 3.x (für Hilfsscripts)
- Zugriff auf eine Supabase-Instanz und einen Redis-Server

### Setup-Schritte

1. **Repository klonen:**
   bash
   git clone https://github.com/your-org/areloria-wasd.git
   cd areloria-wasd
   
2. **Abhängigkeiten installieren:**
   bash
   # Für den Haupt-Workspace
   npm install

   # Für den Client-Bereich
   cd client && npm install
   
3. **Umgebungsvariablen konfigurieren:**
   Kopieren Sie die `.env.example` Datei und passen Sie die Werte für Datenbank und API-Keys an:
   bash
   cp .env.example .env
   
4. **Entwicklungsserver starten:**
   bash
   npm run dev
   
## Deployment

Das Projekt ist für den Betrieb auf einem VPS optimiert. Nutzen Sie die bereitgestellten GitHub Workflows für automatisierte Deployments:

- **Standard Deployment:** Trigger durch Push auf `main`.
- **WASM Fixes:** Spezielle Workflows (`fix-wasm-deploy.yml`) beheben bekannte MIME-Type-Probleme in Nginx-Umgebungen automatisch.
- **Infrastruktur-Check:** `diagnose-vps.yml` führt Systemprüfungen auf der Zielmaschine durch.

## Entwicklung & Richtlinien

- **Projekt-Locking:** Beachten Sie die `PROJECT_LOCK_RULES.md` für Änderungen an kritischen Systemkomponenten.
- **KI-Integration:** Neue Agenten-Verhaltensweisen müssen in `LLM_AGENT_DESIGN.md` dokumentiert und gegen die `AI_AGENT_FAILSAFE_RULES.md` geprüft werden.
- **Code-Stil:** ESLint-Regeln sind in `.eslintrc.json` definiert und werden über die CI-Pipeline erzwungen.

---
*Erstellt vom Technischen Projektmanagement – Areloria WASD Phase 2.*