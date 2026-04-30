[![CI Workflow](https://github.com/<OWNER>/<REPOSITORY>/actions/workflows/ci.yml/badge.svg)](https://github.com/<OWNER>/<REPOSITORY>/actions/workflows/ci.yml)
[![CD Deployment](https://github.com/<OWNER>/<REPOSITORY>/actions/workflows/cd.yml/badge.svg)](https://github.com/<OWNER>/<REPOSITORY>/actions/workflows/cd.yml)
![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)

# Projekt-Dokumentation

## Projektübersicht
Diese Anwendung dient als robuste Grundlage für TypeScript-basierte Webservices mit einer vollautomatisierten CI/CD-Pipeline. Die Bereitstellung erfolgt containerisiert oder via SSH direkt auf die Zielumgebung.

## CI/CD Workflow & Deployment

Dieses Repository verwendet GitHub Actions für Continuous Integration (CI) und Continuous Deployment (CD). Jeder Push in den `main` Branch löst eine Validierung sowie ein anschließendes Deployment aus.

### Erforderliche Repository Secrets

Um das Deployment via SSH zu ermöglichen, müssen die folgenden Secrets unter `Settings > Secrets and variables > Actions` konfiguriert werden:

*   **SSH_HOST**: Die IP-Adresse oder der Hostname des Zielservers.
*   **SSH_USER**: Der Benutzername für die SSH-Verbindung (z.B. `root` oder ein dedizierter Deploy-User).
*   **SSH_PRIVATE_KEY**: Der private SSH-Schlüssel zur Authentifizierung auf dem Zielserver.
*   **DEPLOY_PATH**: Das Zielverzeichnis auf dem Server, in dem die Applikation installiert werden soll.

---

## Changelog

Alle wichtigen Änderungen an diesem Projekt werden in diesem Abschnitt dokumentiert.

### [1.2.0] - 2023-11-15
#### Hinzugefügt
- Einführung von Health-Checks nach dem Deployment.
- Unterstützung für Stage-spezifische Umgebungsvariablen.
#### Verbessert
- Reduzierung der Docker-Image-Größe um 30%.
- Beschleunigung der CI-Pipeline durch Caching von `node_modules`.

### [1.1.0] - 2023-10-20
#### Hinzugefügt
- Automatische Generierung von API-Dokumentationen.
- Slack-Benachrichtigungen bei Build-Fehlern integriert.
#### Behoben
- Race-Condition beim SSH-Transfer großer Dateien korrigiert.

### [1.0.0] - 2023-09-01
#### Hinzugefügt
- Initialer Release.
- Basis CI/CD Konfiguration (Test, Build, Deploy).
- SSH-Deployment Workflow.

---

## Entwicklung

### Voraussetzungen
- Node.js >= 18.x
- npm >= 9.x

### Lokale Installation
bash
npm install
npm run dev

### Tests ausführen
bash
npm test