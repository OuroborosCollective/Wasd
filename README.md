[![CI Workflow](https://github.com/<OWNER>/<REPOSITORY>/actions/workflows/ci.yml/badge.svg)](https://github.com/<OWNER>/<REPOSITORY>/actions/workflows/ci.yml)
[![CD Deployment](https://github.com/<OWNER>/<REPOSITORY>/actions/workflows/cd.yml/badge.svg)](https://github.com/<OWNER>/<REPOSITORY>/actions/workflows/cd.yml)

# Projekt-Dokumentation

## CI/CD Workflow & Deployment

Dieses Repository verwendet GitHub Actions für Continuous Integration (CI) und Continuous Deployment (CD).

### Erforderliche Repository Secrets

Um das Deployment via SSH zu ermöglichen, müssen die folgenden Secrets unter `Settings > Secrets and variables > Actions` konfiguriert werden:

*   **SSH_HOST**: Die IP-Adresse oder der Hostname des Zielservers.
*   **SSH_USER**: Der Benutzername für die SSH-Verbindung (z.B. `root` oder ein dedizierter Deploy-User).
*   **SSH_PRIVATE_KEY**: Der private SSH-Schlüssel zur Authentifizierung auf dem Zielserver.

---
// Neue Datei