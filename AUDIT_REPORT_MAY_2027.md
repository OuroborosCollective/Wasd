# Umfassender Architektur-Audit-Bericht - März 2027

## Status Quo
Das Repository ist ein umfangreiches Monorepo, das **pnpm (v9.12.2)** für das Paketmanagement nutzt. Es umfasst mehrere Anwendungsbereiche (`apps/`), gemeinsame Bibliotheken (`packages/`), spezialisierte Logikmodule (`projects/`) sowie die Kernkomponenten `server`, `client`, `engine` und `portal`. Die Architektur stützt sich auf **TypeScript Project References**, um die Integrität des Build-Graphen zu gewährleisten.

### Struktur-Übersicht:
- **Paketmanagement:** pnpm mit `node-linker=isolated` zur Vermeidung von Ghost-Dependencies.
- **Workspace:** Korrigiert auf `projects/*`, um alle Logik-Module einzuschließen.
- **CI/CD:** Multi-Workflow-Setup mit Fokus auf Docker-basierten VPS-Deployments.
- **Deployment:** Docker-basiert mit optimierten Multi-Stage-Builds.

---

## Durchgeführte Korrekturen

### 1. Workspace-Integrität (Kritisch)
In der `pnpm-workspace.yaml` wurde `projects/` zu `projects/*` korrigiert.
- **Problem:** Logik-Module in `projects/` wurden von pnpm ignoriert, was zu fehlenden Abhängigkeiten und Build-Fehlern in der CI führte.
- **Lösung:** Wildcard-Pfad hinzugefügt. Alle Module werden nun korrekt erkannt.

### 2. TypeScript Build-Graph
Fehlende Referenzen im Root-`tsconfig.json` wurden ergänzt.
- **Hinzugefügt:** `apps/client-2d`, `packages/core-network`.
- **Optimierung:** `composite: true` wurde für `packages/shared` aktiviert, um inkrementelle Builds über Projektgrenzen hinweg zu ermöglichen.

### 3. Docker Deployment (Performance & Stabilität)
`Dockerfile.prod` wurde grundlegend refaktorisiert.
- **Syntax-Fix:** Ein kritischer Fehler in der `RUN`-Instruktion (fehlende Verkettung) wurde behoben.
- **Teleport-Muster:** Manifest-Dateien (`package.json`, `pnpm-lock.yaml`) werden nun vor dem Quellcode kopiert. Dies maximiert die Nutzung des Docker-Layer-Caches und reduziert die Build-Zeit bei Code-Änderungen drastisch.
- **Standardisierung:** pnpm-Version auf 9.12.2 fixiert (passend zur Umgebung).

---

## Optimierungspotenzial

### 1. CI/CD Konsolidierung
Es besteht Redundanz zwischen `deploy.yml` (PM2) und `vps-deploy.yml` (Docker).
- **Empfehlung:** `deploy.yml` entfernen und ausschließlich auf die Docker-basierte Strategie setzen, um Inkonsistenzen in der Produktionsumgebung zu vermeiden.

### 2. TypeScript Strenge
Viele Pakete nutzen noch keine `composite: true` Einstellung oder haben `strict: false` in ihren lokalen Konfigurationen.
- **Empfehlung:** Schrittweise Aktivierung von `strict: true` in `server/tsconfig.json` und Aktivierung von `composite` in allen Leaf-Packages für optimale Build-Performance.

### 3. Healthcheck-Standardisierung
Die Healthchecks in der CI (`main-pipeline.yml`) sind sehr komplex.
- **Empfehlung:** Verlagerung der Produktions-Connectivity-Tests in den Deployment-Workflow, um die CI-Pipeline ("Build & Test") von externen Netzwerk-Latenzen zu entkoppeln.

---

## Action Plan (Nächste Schritte)
1. **Dependency Cleanup:** Unbenutzte Pakete wie `axios` (sofern durch `fetch` ersetzbar) in `server/package.json` evaluieren.
2. **Lockfile-Refresh:** Nach dem Workspace-Fix sollte ein frisches `pnpm install` in einer sauberen Umgebung durchgeführt werden, um die `pnpm-lock.yaml` final zu stabilisieren.
3. **CI-Refactoring:** Zusammenführung der Deployment-Logik in eine zentrale, wiederverwendbare Action oder Workflow-Datei.

**Bericht erstellt von Senior DevOps & Fullstack Architect (Jules)**
