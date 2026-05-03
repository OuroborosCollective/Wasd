# Onboarding & Technical Documentation

## Systemvoraussetzungen
- **Node.js**: Version 18.0.0 oder höher
- **Python**: Version 3.10 oder höher
- **Package Manager**: npm (integriert in Node.js) oder pip (Python)

## Architektur-Übersicht
Das Projekt ist als **Multi-Package Repository** ohne zentralen Orchestrator (wie Lerna oder Nx) strukturiert. Jedes Verzeichnis fungiert als eigenständige Einheit.

- **Frontend (`/client`)**: Basiert auf **Vite** und **Three.js** für performantes 3D-Rendering.
- **Backend (`/server`)**: Python-basierte Logikschicht.

## Repository-Struktur
text
.
├── client/             # Frontend (Vite + Three.js)
│   ├── src/            # App-Logik und 3D-Szenen
│   ├── public/         # Statische Assets
│   └── package.json    # Frontend-Abhängigkeiten
├── server/             # Backend (Python)
│   ├── main.py         # Einstiegspunkt
│   └── requirements.txt # Python-Abhängigkeiten
└── ONBOARDING.md       # Diese Dokumentation


## Setup-Anleitung

### 1. Frontend Setup
Navigieren Sie in das Client-Verzeichnis und installieren Sie die Node-Module:
bash
cd client
npm install


### 2. Backend Setup
Navigieren Sie in das Server-Verzeichnis. Es wird empfohlen, eine virtuelle Umgebung zu verwenden:
bash
cd server
python -m venv venv

# Aktivierung unter Windows:
venv\Scripts\activate
# Aktivierung unter macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt


## Quick-Start Guide (Development)

### Frontend starten
Startet den Vite-Development-Server mit Hot Module Replacement (HMR).
bash
cd client
npm run dev

Der Zugriff erfolgt standardmäßig über `http://localhost:5173`.

### Backend starten
Startet den Python-Server im Entwicklungsmodus.
bash
cd server
# Stellen Sie sicher, dass venv aktiviert ist
python main.py


## Verwendete Technologien
- **Three.js**: High-Level 3D-Library zur Darstellung der Szenen im Browser.
- **Vite**: Modernes Build-Tool für schnelle Frontend-Entwicklung.
- **Python**: Verarbeitung von Logik und Daten im Hintergrund.

## Wichtige Hinweise
- Da kein globaler Orchestrator verwendet wird, müssen Abhängigkeiten in den jeweiligen Unterverzeichnissen separat verwaltet werden.
- Achten Sie darauf, dass Ports für Client und Server nicht mit anderen lokalen Diensten kollidieren.