# Umfassender Architektur-Audit-Bericht - März 2027

## Status Quo
Das Repository ist ein umfangreiches Monorepo, das **pnpm (v9.12.2)** für das Paketmanagement nutzt. Es umfasst mehrere Anwendungsbereiche (`apps/`), gemeinsame Bibliotheken (`packages/`) und spezialisierte Logikmodule (`projects/`). Die Architektur stützt sich auf **TypeScript Project References**, um die Integrität des Build-Graphen zu gewährleisten.

### Aktuelle Struktur:
- **Paketmanagement:** pnpm mit `node-linker=isolated`.
- **Workspace:** `pnpm-workspace.yaml` enthält derzeit nur `packages/*` und `apps/*`.
- **CI/CD:** Multi-Workflow-Setup, dominiert von `main-pipeline.yml` und `deploy.yml`.
- **Deployment:** Docker-basiert (`Dockerfile`, `Dockerfile.prod`) und VPS-basiert via SSH/PM2.

---

## Kritische Fehler

### 1. Unvollständige Workspace-Konfiguration
In der `pnpm-workspace.yaml` fehlen wichtige Verzeichnisse: `projects/*`, `server`, `client`, `engine` und `portal`.
- **Auswirkung:** Diese Pakete werden von pnpm als eigenständig oder extern behandelt, was Workspace-übergreifende Befehle wie `pnpm -r build` bricht und eine korrekte Abhängigkeitsoptimierung verhindert.
- **Risiko:** Inkonsistente `pnpm-lock.yaml` und potenzielle "Module not found"-Fehler in der CI.

### 2. Dependency Version Drift & Ghost Dependencies
Es gibt erhebliche Versionsunterschiede bei Kern-Typen und Bibliotheken:
- **`@types/node`:** Reicht von `^20.11.0` bis `^25.6.2` und ignoriert den Root-Override von `^22.19.18`.
- **BabylonJS/Three.js:** Peer-Dependency-Mismatches in `packages/rendering-bridge` (Babylon ^6.0.0 vs ^9.6.2 an anderer Stelle; Three 0.169.0 vs 0.184.0 an anderer Stelle).
- **Ghost Dependency:** `projects/social` importiert `eventemitter3`, deklariert es aber nicht in seiner `package.json`.

### 3. Redundante & Konfliktbehaftete Workflows
`deploy.yml` und `vps-deploy.yml` führen ähnliche Deployment-Aufgaben aus, nutzen aber unterschiedliche Strategien (Azure Asset-Sync vs. Docker Save/Load).
- **Auswirkung:** Erhöhter Wartungsaufwand und widersprüchliche Deployment-Logik.

---

## Optimierungspotenzial

### 1. Docker Build Performance
Sowohl `Dockerfile` als auch `Dockerfile.prod` kopieren vollständige Quellverzeichnisse vor `pnpm install`.
- **Verbesserung:** Implementierung eines "Teleport"-Musters: Zuerst nur `package.json`, `pnpm-lock.yaml` und `pnpm-workspace.yaml` kopieren, um das Docker-Layer-Caching für Abhängigkeiten optimal zu nutzen.

### 2. CI Caching-Effizienz
In der `main-pipeline.yml` fehlt ein explizites Caching für `pip`, und es könnte von einer aggressiveren `pnpm`-Store-Caching-Strategie profitiert werden.

### 3. TypeScript Build-Graph
Während die `tsconfig.json`-Referenzen korrekt sind, verhindert das Fehlen von `composite: true` in einigen Leaf-Packages effiziente inkrementelle Builds.

---

## Action Plan

### Schritt 1: Workspace-Integrität korrigieren
- [ ] Aktualisieren der `pnpm-workspace.yaml`, um alle aktiven Verzeichnisse einzuschließen:
  ```yaml
  packages:
    - "packages/*"
    - "apps/*"
    - "projects/*"
    - "server"
    - "client"
    - "engine"
    - "portal"
  ```
- [ ] `pnpm install` ausführen, um die Lockfile mit voller Workspace-Kenntnis neu zu generieren.

### Schritt 2: Abhängigkeiten harmonisieren
- [ ] `overrides` aus der `pnpm-lock.yaml` (wo sie vermutlich manuell injiziert wurden) in die Root-`package.json` verschieben.
- [ ] Fehlende Abhängigkeiten explizit hinzufügen (z. B. `eventemitter3` in `projects/social/package.json`).
- [ ] `@types/node` monorepo-weit auf `^22.19.18` ausrichten.

### Schritt 3: CI/CD konsolidieren
- [ ] Die Logik von `vps-deploy.yml` in `deploy.yml` zusammenführen oder eine einzige "Source of Truth" für VPS-Deployments wählen.
- [ ] Healthcheck-Endpunkte und -Methoden standardisieren (bevorzugt `curl` oder `node -e "fetch(...)"`).

### Schritt 4: Dockerfiles optimieren
- [ ] `Dockerfile.prod` auf Multi-Stage-Builds mit Manifest-Caching umstellen:
  ```dockerfile
  # Beispiel Teleport-Muster
  COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
  COPY packages/*/package.json packages/
  # ... usw.
  ```

### Schritt 5: Verifizierung
- [ ] `pnpm -r build` und `npx vitest run` im gesamten Monorepo ausführen, um sicherzustellen, dass die neue Workspace-Konfiguration stabil ist.
