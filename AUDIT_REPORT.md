# Repository Audit & Remediation Report - 2025

## Status Quo
Das Repository ist als **pnpm Monorepo** strukturiert, weist jedoch erhebliche Inkonsistenzen in der Konfiguration und Dateistruktur auf. Es existieren parallele Konfigurationen für `npm` (package-lock.json), `yarn` (.yarnrc.yml, .pnp.cjs) und `pnpm`. Die TypeScript-Konfigurationen sind teilweise veraltet und nutzen keine modernen Monorepo-Features wie Project References konsequent über alle Packages hinweg. Ein kritischer Fehler war das Fehlen der `package.json` im `client/` Verzeichnis, obwohl der Source-Code und die Lock-Dateien vorhanden waren.

## Kritische Fehler
- **Fehlende `client/package.json`:** Das Frontend-Paket war im Workspace nicht registriert, was Build- und Dependency-Fehler verursachte.
- **Konfigurations-Wildwuchs:** Das gleichzeitige Vorhandensein von `.pnp.cjs`, `.yarnrc.yml` und mehreren `package-lock.json` Dateien führte zu unvorhersehbarem Verhalten beim Installieren von Abhängigkeiten.
- **Inkonsistente Docker-Konfiguration:** Das `Dockerfile` nutzte standardmäßig `npm` statt `pnpm` und war nicht optimal auf die Monorepo-Struktur (Workspace-Abhängigkeiten) abgestimmt.
- **Lückenhafte CI-Trigger:** Die GitHub Actions Workflows reagierten nicht auf Änderungen in Kernverzeichnissen wie `server/`, `client/` oder `shared/`.

## Optimierungspotenzial
- **TypeScript Project References:** Durch die konsequente Nutzung von `composite: true` und `references` in allen Paketen kann die Build-Performance und Type-Checking-Genauigkeit verbessert werden.
- **Docker Multi-Stage Builds:** Die Optimierung des `Dockerfile` zur Nutzung von `pnpm` mit Workspace-Support reduziert die Image-Größe und beschleunigt Build-Zyklen.
- **CI/CD Caching:** Die Vereinheitlichung auf `pnpm` ermöglicht effizienteres Caching des `node_modules` Store in GitHub Actions.

## Action Plan (Umgesetzte Maßnahmen)
1. **Bereinigung:** Entfernung aller legacy `npm` und `yarn` Konfigurationsdateien zur Erzwingung von `pnpm` als Single Source of Truth.
2. **Wiederherstellung:** Neuerstellung der `client/package.json` basierend auf Code-Analyse und vorhandenen Lock-Dateien.
3. **Standardisierung Docker:** Refactoring des `Dockerfile` auf Node 20 + pnpm 9.1.0 und Anpassung des Healthchecks in `docker-compose.yml`.
4. **TS-Synchronisation:** Update der `tsconfig.json` Hierarchie; Einführung von Project References für alle Workspace-Packages.
5. **Workflow-Fixes:** Erweiterung der Path-Trigger in `main-pipeline.yml` und Umstellung der Deployment-Skripte auf `pnpm`.

---
*Bericht erstellt von Jules, Senior DevOps & Fullstack Architect.*
