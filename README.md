# Areloria: WASD – Das Ultimative Virtuelle Weltsystem

## Projektübersicht

Areloria: WASD ist eine hochperformante, hybride Plattform zur Erstellung und Verwaltung persistenter virtueller Welten. Das Projekt kombiniert modernste Webtechnologien mit leistungsstarker Systemprogrammierung und einer tiefgreifenden Integration von KI-Agenten. Durch den Einsatz von Rust (WASM) für die Kernlogik und Next.js für das Frontend bietet Areloria eine reibungslose, skalierbare Erfahrung sowohl für Administratoren als auch für Endnutzer.

Der Fokus liegt auf der Synergie zwischen prozeduraler Generierung, menschlicher Kuration über ein dediziertes World-Editor-Framework und einer autonomen Agenten-Infrastruktur, die die Spielwelt lebendig und dynamisch gestaltet.

---

## Hauptmerkmale

*   **KI-Agenten-Ökosystem:** Integration spezialisierter LLM-Agenten (z.B. Jules, Sentinel), die über definierte Regelwerke ("Arelorian Super Prompt") innerhalb der Welt agieren.
*   **Echtzeit-World-Editor:** Ein mächtiges Toolset für Game Master (GM) zur Manipulation von Terrain, Objektplatzierung und Live-Welt-Steuerung.
*   **WASM-gestützte Performance:** Rechenintensive Welt-Logik und 3D-Berechnungen werden mittels Rust in WebAssembly ausgeführt, um maximale Client-Performance zu garantieren.
*   **Multilayer-Backend:** Hybride Architektur bestehend aus einem Python-Backend (FastAPI), Redis für Echtzeit-Messaging und Supabase für die persistente Datenhaltung.
*   **Umfassende Admin-Suite:** Ein GM-Panel zur Überwachung von Mounts, Berechtigungen und zur Wiederherstellung von Systemzuständen im Krisenfall.
*   **Enterprise-Grade CI/CD:** Vollautomatisierte Workflows für Deployment, Diagnose und Selbstheilung der VPS-Infrastruktur und Nginx-Konfigurationen.

---

## Technologiestack

*   **Frontend:** Next.js, React, Tailwind CSS
*   **Core Logic:** Rust (WebAssembly / WASM)
*   **Backend:** Python (FastAPI), Redis
*   **Datenbank & Auth:** Supabase (PostgreSQL)
*   **Infrastructure:** Nginx, Docker, GitHub Actions
*   **KI-Integration:** Custom LLM-Agenten-Framework (Agent-Message Protokoll)

---

## Projektstruktur

Das Projekt ist in spezialisierte Verzeichnisse unterteilt, die klare Zuständigkeiten definieren:

*   **`.github/workflows/`**: Umfangreiche CI/CD-Pipelines für automatisiertes Testen, WASM-Debugging und Server-Wartung.
*   **`.jules/` & `agent/`**: Definitionen, Prompts und Logik für die autonomen KI-Einheiten des Systems.
*   **`admin-tools/`**: Enthält das GM-Panel, den World-Editor und Recovery-Tools für Systemadministratoren.
*   **`app/`**: Das Next.js-Frontend inklusive globaler Stile und Layout-Definitionen.
*   **`backend/`**: Die Python-basierte API-Logik.
*   **`Cargo.toml`**: Konfiguration der Rust-WASM-Module.
*   **Dokumentation (`*.md`)**: Ausführliche Architektur-Notizen, Audit-Reports und Master-Indizes zur Projektsteuerung.

---

## Installation & Einrichtung

### Voraussetzungen

*   Node.js (v18+) & Yarn/NPM
*   Rust & `wasm-pack`
*   Python 3.10+
*   Docker & Docker Compose (optional für lokales Redis/Postgres)

### Vorbereitung

1.  **Repository klonen:**
    bash
    git clone https://github.com/your-repo/areloria-wasd.git
    cd areloria-wasd
    
2.  **Umgebungsvariablen:**
    Kopieren Sie die `.env.example` nach `.env` und konfigurieren Sie Ihre API-Keys für Supabase, Redis und LLM-Provider.

### Frontend & WASM

1.  **Dependencies installieren:**
    bash
    yarn install
    2.  **WASM Module bauen:**
    bash
    # Beispiel für Rust-Build
    wasm-pack build --target web
    3.  **Entwicklungsserver starten:**
    bash
    yarn dev
    
### Backend

1.  **Virtual Environment erstellen:**
    bash
    cd backend
    python -m venv venv
    source venv/bin/activate # Windows: venv\Scripts\activate
    2.  **Abhängigkeiten installieren:**
    bash
    pip install -r requirements.txt
    3.  **API starten:**
    bash
    uvicorn app.main:app --reload
    
---

## Deployment & Wartung

Das Projekt nutzt GitHub Actions für ein "Check-and-Recover"-Modell. Bei Fehlern in der WASM-Integration oder Nginx-Konfiguration stehen spezialisierte Workflows zur Verfügung:

*   `fix-wasm-deploy.yml`: Behebt spezifische Probleme beim Laden der WebAssembly-Binaries.
*   `diagnose-vps.yml`: Führt Systemdiagnosen auf der Zielhardware durch.
*   `check-server.yml`: Überwacht die Verfügbarkeit der Backend-Dienste.

Weitere Informationen finden Sie in der `DEPLOYMENT.md` und dem `ARCHITECTURE_OVERVIEW.md`.

---

## Dokumentation & Support

Für tiefere Einblicke in die Systemlogik konsultieren Sie bitte:
*   `MASTER_INDEX.md` – Zentraler Einstiegspunkt für alle Dokumente.
*   `LOGIC_DOCUMENTATION.md` – Details zur Spielmechanik und WASM-Interaktion.
*   `AGENTS.md` – Handbuch für das Verhalten und Design der KI-Agenten.

---

**Status:** Phase 2 (Reconstruction & Scale-up) – Siehe `Entwickler_Manuskript_Manifest_Phase2.pdf` für die strategische Roadmap.