# Architektur & DevOps Audit Bericht

## Status Quo
Das Repository ist ein hochmodernes Monorepo, das auf **pnpm** für das Package-Management und **TypeScript Project References** für die Build-Orchestrierung setzt. Die Architektur ist modular in `apps/` (Frontends/APIs), `packages/` (geteilte Bibliotheken) und `projects/` (Geschäftslogik) unterteilt. Das Deployment erfolgt über Docker in Kombination mit einer GitHub Actions Pipeline.

---

## Detaillierte Analyse

### 1. **Package Management & PnP**
*   **Audit:** Das Monorepo nutzt `node-linker=isolated` in der `.npmrc`. Dies ist Best Practice, da es "Ghost Dependencies" durch eine strikte Symlink-Struktur verhindert.
*   **Fehler gefunden:** Die `pnpm-workspace.yaml` enthielt ein fehlerhaftes Glob-Pattern für das `projects/` Verzeichnis (`"projects/"` statt `"projects/*"`), was dazu führte, dass Sub-Packages wie `@wasd/card-logic` nicht vom Workspace indiziert wurden.
*   **Behebung:** Das Pattern wurde korrigiert.

### 2. **Dependency Graph**
*   **Audit:** Root `pnpm.overrides` vereinheitlichen zentrale Versionen (React 19, TS 6, BabylonJS).
*   **Fehler gefunden:** `apps/client-2d` und `packages/core-network` wichen von diesen Standards ab und nutzten veraltete TypeScript- und React-Versionen.
*   **Behebung:** Die Versionen wurden synchronisiert. Alle Kernpakete nutzen nun einheitlich `typescript@6.0.3` und React 19 Typen.

### 3. **TypeScript & Types**
*   **Audit:** Das Projekt nutzt eine `tsconfig.base.json` für geteilte Regeln.
*   **Fehler gefunden:** Fragmentierte Vererbung. Mehrere Pakete definierten ihre eigenen Compiler-Regeln vollständig neu, was zu inkonsistentem Build-Verhalten führte.
*   **Behebung:** `apps/client-2d` und `packages/core-network` wurden in die `tsconfig`-Vererbungskette integriert.

### 4. **Workflows & CI/CD**
*   **Audit:** Die `main-pipeline.yml` ist umfassend, inklusive Python-Validierung und Prisma-Generierung.
*   **Fehler gefunden:** Fehlende Concurrency-Kontrollen. Überlappende Pushes auf denselben Branch konnten Race Conditions auslösen oder CI-Ressourcen verschwenden.
*   **Behebung:** Eine `concurrency` Gruppe mit `cancel-in-progress: true` wurde hinzugefügt.

### 5. **Deployment & Environments**
*   **Audit:** Die `Dockerfile.prod` nutzt einen Multi-Stage Build.
*   **Fehler gefunden:** Nicht-deterministische Installationen. Die Nutzung von `--no-frozen-lockfile` in der Produktion erlaubte unbemerkten Dependency-Drift. Zudem gab es einen Syntaxfehler bei verketteten `RUN`-Befehlen.
*   **Behebung:** Umstellung auf `--frozen-lockfile` und Korrektur der `RUN`-Syntax.

---

## Kritische Fehler
*   **Workspace-Indizierung:** Sub-Projekte in `projects/` wurden nicht korrekt verlinkt. **(BEHOBEN)**
*   **Instabile CI-Builds:** Risiko von Race Conditions bei schnellen Code-Iterationen. **(BEHOBEN)**
*   **Produktions-Inkonsistenz:** Fehlende Sperrung der Lockfile-Versionen im Docker-Build. **(BEHOBEN)**

---

## Optimierungspotenzial
*   **Build-Caching:** Zukünftige Iterationen könnten **Turborepo** implementieren, um die CI-Zeiten weiter zu senken.
*   **Bundle-Analyse:** Integration eines `vite-bundle-visualizer` in die CI, um die Auswirkungen geteilter Pakete auf die Frontend-Größe zu überwachen.

---

## Action Plan (Umgesetzt)
1.  **Workspace-Mapping korrigiert:** `pnpm-workspace.yaml` aktualisiert.
2.  **Versionen synchronisiert:** `package.json` von `client-2d` und `core-network` angepasst.
3.  **CI gehärtet:** Concurrency in GitHub Actions implementiert.
4.  **Lockfile erzwungen:** Produktion-Dockerfile für deterministische Builds aktualisiert.
5.  **TSConfigs angeglichen:** Vererbung von `tsconfig.base.json` standardisiert.
