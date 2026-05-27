# Umfassender Architektur-Audit-Bericht - Mai 2027

## Status Quo
Das Repository ist ein umfangreiches TypeScript-Monorepo, das mit `pnpm` verwaltet wird. Es verwendet den `isolated` Node-Linker (unter Umgehung von PnP), um eine bessere Kompatibilität mit Tools wie Vite und BabylonJS zu gewährleisten. Die Architektur ist "Logic-First" ausgelegt, mit einem starken Fokus auf deterministische Simulationen (Level-A) für ein Android-MMORPG.

### Wichtige Beobachtungen:
- **Package Management:** pnpm-Workspace mit `isolated` Linker. Die root `package.json` nutzt `overrides`, um Versionen zu fixieren, jedoch gibt es Abweichungen (Drift) in den `package.json`-Dateien der einzelnen Workspaces.
- **TypeScript:** Projekt-Referenzen werden in der root `tsconfig.json` genutzt, aber viele Child-Packages sind nicht als `composite` konfiguriert, was eine optimale Build-Orchestrierung verhindert.
- **CI/CD:** Mehrere überlappende Workflows (`main-pipeline.yml`, `vps-docker-deploy.yml`). Das Deployment basiert auf `sshpass` und manuellen Git-Syncs auf dem VPS.
- **Determinismus:** Strikte Einhaltung der Level-A-Determinismus-Standards in Simulationspfaden, erzwungen durch `check-are-determinism.mjs`.

## Kritische Fehler
1. **Defekte TypeScript-Projektreferenzen:** Mehrere Pakete (z. B. `@wasd/server`, `@wasd/shared`, `@wasd/core-logic`) haben `composite: false` oder der Eintrag fehlt gänzlich in ihrer `tsconfig.json`, obwohl sie vom Root referenziert werden. Dies bricht den Abhängigkeitsgraphen für `tsc --build`.
2. **Fehlende Konfiguration:** `projects/health-tech` wird in der root `tsconfig.json` referenziert, verfügt aber über keine eigene `tsconfig.json`, was zu Fehlern bei der Typprüfung auf Root-Ebene führt.
3. **Nicht-deterministische VPS-Deploys:** `deploy/update.sh` verwendet `pnpm install --no-frozen-lockfile`. Dies ermöglicht Dependency-Drift auf dem Produktionsserver und ist anfällig für Out-Of-Memory (OOM) Fehler während der Resolutionsphase auf VPS-Instanzen mit wenig RAM.
4. **Vite-Versions-Fragmentierung:** Die Vite-Versionen reichen von `5.2.8` (Portal) über `6.4.2` (Web/Client) bis hin zu `8.0.13` (Server). Dies führt zu inkonsistentem Build-Verhalten und potenziellen Plugin-Inkompatibilitäten.

## Optimierungspotenzial
1. **Dependency-Harmonisierung:** Angleichung aller Pakete auf Vite 6.x und BabylonJS 9.9.1. Aktuelle Overrides fixieren BabylonJS auf 9.8.0, was im Widerspruch zu den Workspace-Deklarationen (9.9.1) steht.
2. **Bereinigung von Redundanzen:** Die `pnpm-workspace.yaml` enthält einen `allowBuilds`-Block, der redundant zu `pnpm.onlyBuiltDependencies` in der root `package.json` ist.
3. **Workflow-Sicherheit:** Ersetzen von `sshpass` durch SSH-Key-basierte Authentifizierung in GitHub Actions, um die Sicherheit und Zuverlässigkeit zu erhöhen.
4. **Build-Performance:** Die Asset-Assemblierung in `update.sh` (manuelles Kopieren von `dist`-Ordnern) kann durch ein robusteres Deployment-Skript oder durch das direkte Servieren mehrerer Statics über den Express-Server unter Verwendung definierter Workspace-Pfade ersetzt werden.

## Action Plan

### Phase 1: Härtung der Konfiguration (Teilweise abgeschlossen)
1. **Fix TypeScript References:**
   - [ ] Setze `composite: true` und `declaration: true` in allen `tsconfig.json`-Dateien der Core-Pakete.
   - [x] Erstelle die fehlende `projects/health-tech/tsconfig.json`. (Erledigt im aktuellen PR)
   - [ ] Aktualisiere `portal/tsconfig.json`, sodass sie von `tsconfig.base.json` erbt.
2. **Bereinigung der Monorepo-Manifeste:**
   - [ ] Entferne redundante `allowBuilds` aus der `pnpm-workspace.yaml`.
   - [ ] Aktualisiere die Root-`overrides`, um sie an die neuesten stabilen Versionen anzupassen, die im Codebase verwendet werden (z. B. BabylonJS 9.9.1).

### Phase 2: Anpassung des Deployments
1. **Synchronisation der VPS-Installationsstrategie:** Modifiziere `deploy/update.sh`, um `--frozen-lockfile` zu verwenden, nachdem das `sync-pnpm-lockfile-for-docker.py`-Skript (oder ein ähnlicher Pre-flight Sync) ausgeführt wurde. Dies stellt sicher, dass der VPS-Build mit der lokalen/CI-Umgebung übereinstimmt.
2. **Konsolidierung der Workflows:** Setze `main-pipeline.yml` zugunsten des robusteren `vps-docker-deploy.yml` oder eines vereinheitlichten "Areloria Universal Deploy"-Workflows außer Kraft.

### Phase 3: Dependency-Harmonisierung (Teilweise abgeschlossen)
1. **Standardisierung von Vite:**
   - [x] Upgrade `@wasd/portal` auf Vite 6.4.2 zur Behebung von Vitest-Inkompatibilitäten. (Erledigt im aktuellen PR)
   - [ ] Migriere verbleibende Pakete auf Vite 6.x, um den Footprint von `node_modules` zu reduzieren.
2. **Audit der Peer-Dependencies:** Behebe den `pg`-Versionskonflikt zwischen `@wasd/database` (erwartet 8.11.x) und dem Server (8.21.x).

---
*Bericht erstellt von Jules, Senior DevOps & Fullstack Architect.*
