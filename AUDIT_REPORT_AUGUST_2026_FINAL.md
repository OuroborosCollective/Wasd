# Umfassender Repository-Audit-Bericht - August 2026

## Status Quo
Das Repository ist ein umfangreiches TypeScript-Monorepo, das `pnpm`-Workspaces nutzt. Es umfasst Anwendungen (`apps/`), geteilte Pakete (`packages/`) und verschiedene projektspezifische Module (`projects/`). Die Infrastruktur wird über GitHub Actions und Docker verwaltet.

## Audit-Ergebnisse

### 1. Package Management & PnP
- **Status Quo:** Das Repository verwendete `shamefully-hoist=true`, was zu "Ghost Dependencies" und nicht-deterministischen Builds führen kann.
- **Kritische Fehler:** Keine unmittelbaren Fehler, aber erhöhtes Risiko für Inkonsistenzen in der CI.
- **Optimierungspotenzial:** Umstellung auf den isolierten Node-Linker zur Durchsetzung sauberer Abhängigkeiten.
- **Action Plan:** `.npmrc` wurde aktualisiert, um `shamefully-hoist=true` zu entfernen.

### 2. Dependency Graph
- **Status Quo:** Erhebliche Versionsunterschiede bei Kernabhängigkeiten wie `@types/node`, React-Typen und `three`.
- **Kritische Fehler:** Mögliche Typ-Konflikte bei Paket-übergreifenden Importen.
- **Optimierungspotenzial:** Zentralisierung der Versionen über `pnpm.overrides`.
- **Action Plan:**
  - `pnpm.overrides` für `@types/node` (^22.19.18), `@types/react` (^19.0.0) und `@types/react-dom` (^19.0.0) im Root `package.json` hinzugefügt.
  - Harmonisierung der Versionen in `server`, `portal`, `client`, `web`, `api` und `shared`.

### 3. TypeScript & Types
- **Status Quo:** Die Root `tsconfig.json` war unvollständig (fehlende Projektreferenzen). Redundante Pfad-Mappings in Sub-Paketen umgingen den Build-Graph.
- **Kritische Fehler:** Fehlerhafte Inkremental-Builds durch unvollständigen Build-Graph.
- **Optimierungspotenzial:** Nutzung von TypeScript Project References zur Beschleunigung der Kompilierung.
- **Action Plan:**
  - Root `tsconfig.json` mit allen fehlenden Referenzen aktualisiert.
  - Pfad-Mappings in `apps/api` bereinigt und Referenzen korrigiert.
  - `tsconfig.base.json` auf `moduleResolution: "bundler"` standardisiert.

### 4. Workflows & CI/CD
- **Status Quo:** Redundante Workflow-Dateien (`MMORPG Smart CI v5`, `ci.yml`) und inkonsistente Node-Versionen (20 vs 22).
- **Kritische Fehler:** Redundante CI-Läufe verschwenden Ressourcen.
- **Optimierungspotenzial:** Konsolidierung in eine performante Pipeline.
- **Action Plan:**
  - Redundante Workflows gelöscht.
  - Alle Workflows und das `Dockerfile` auf Node.js 22 standardisiert.
  - `pnpm install --frozen-lockfile` in der CI erzwungen.

### 5. Deployment & Environments
- **Status Quo:** `Dockerfile` basierte auf einer älteren Node-Version. `deploy-vps.sh` war nicht robust genug gegenüber lokalen Dateiänderungen auf dem Zielsystem.
- **Kritische Fehler:** Keine.
- **Optimierungspotenzial:** Nutzung von Multi-Stage-Builds und Node 22.
- **Action Plan:**
  - `Dockerfile` auf `node:22-alpine` aktualisiert.
  - `scripts/deploy-vps.sh` durch `git reset --hard` und bessere Variablenbehandlung verbessert.

---
*Audit durchgeführt von Senior DevOps & Fullstack Architect Jules.*
