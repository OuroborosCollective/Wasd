# Architektur & DevOps Audit Bericht - August 2028

**Auditor:** Jules (Senior DevOps & Fullstack Architect)
**Datum:** August 2028
**Umfang:** Package Management, Dependency Graph, TypeScript Konfiguration, CI/CD Workflows, Deployment Infrastruktur.

---

## Status Quo

Das Repository ist ein umfangreiches TypeScript-Monorepo, das mit `pnpm` Workspaces verwaltet wird. Es weist eine verteilte Architektur mit mehreren Anwendungen (`apps/web`, `apps/api`, `client`, `server`, `portal`) und einer Vielzahl von geteilten Paketen auf.

Aktuelle Infrastruktur:
- **Package Management:** pnpm 11.1.1 ist als Standard definiert. Der Node-Linker ist auf `isolated` gesetzt.
- **TypeScript:** TypeScript 6.0.3 wird in den meisten Paketen verwendet. Die Basiskonfiguration ist in `tsconfig.base.json` definiert.
- **CI/CD:** Umfangreiche GitHub Actions Workflows für Tests, Linting und VPS-Deployment.
- **Deployment:** Primär Docker-basiert für VPS, mit angepassten Skripten für Asset-Synchronisierung und Generierung von Laufzeit-Entrypoints.

---

## Kritische Fehler

1.  **Fragmentierung der pnpm-Versionen:**
    - Die Root-`package.json` erfordert `pnpm@11.1.1`.
    - `Dockerfile.vps` bereitete explizit `pnpm@9.12.2` vor.
    - `monorepo-guard.yml` verwendete `pnpm/action-setup@v4` mit Version `9.12.2`.
    - *Auswirkung:* Inkonsistente Lockfile-Auflösung und potenzielle Build-Fehler aufgrund von `[ERR_PNPM_LOCKFILE_CONFIG_MISMATCH]`.

2.  **Abweichungen bei Dependency Overrides:**
    - Mehrere Pakete spezifizierten Abhängigkeitsversionen, die im Konflikt mit den Root-`pnpm.overrides` standen.
    - `@wasd/web` und `@wasd/client` verwendeten `@babylonjs/loaders@^9.8.0`, während das Root-Paket dies auf `^9.6.2` überschreibt.
    - Die Peer-Dependencies von `@wasd/database` (`pg`, `zod`) waren im Vergleich zum restlichen Workspace veraltet.
    - *Auswirkung:* Potenzielle Laufzeitfehler und inkonsistentes Verhalten über Pakete hinweg.

3.  **Probleme bei TSConfig Incremental/Composite Builds:**
    - `server/tsconfig.json` hatte `composite: false`. Als Kernbestandteil des Workspaces, der oft von anderen referenziert wird oder von geteilten Paketen abhängt, sollte dies auf `true` gesetzt sein, um die Integrität von inkrementellen Builds und Projektreferenzen zu gewährleisten.

---

## Optimierungspotenzial

1.  **Standardisierung der Workflows:**
    - Alle GitHub Actions wurden angeglichen, um die workspace-standardisierte pnpm-Version zu verwenden.
    - Konsolidierung von Deployment-Triggern zur Vermeidung redundanter Builds.

2.  **Typsicherheit & Peer Dependencies:**
    - Synchronisierung von Peer Dependencies in geteilten Paketen zur Vermeidung von "Multiple Versions"-Problemen in konsumierenden Apps.

---

## Action Plan (Umgesetzt)

### Schritt 1: Angleichung des Package Managers
- [x] `Dockerfile.vps` auf `pnpm@11.1.1` aktualisiert.
- [x] `.github/workflows/monorepo-guard.yml` auf `pnpm@11.1.1` aktualisiert.

### Schritt 2: Synchronisierung der Abhängigkeiten
- [x] `@babylonjs/loaders` in allen `package.json` Dateien auf `^9.6.2` angeglichen.
- [x] Peer-Dependencies von `@wasd/database` an Root-Overrides angepasst.
- [x] `socket.io-client` Versionen in `@wasd/core-network` korrigiert.

### Schritt 3: TypeScript Konfiguration
- [x] `composite: true` in `server/tsconfig.json` aktiviert.
- [x] Redundante Einstellungen in `apps/client-2d` und `packages/ui` entfernt und Vererbung von `tsconfig.base.json` sichergestellt.

### Schritt 4: Verifizierung
- [x] `pnpm install` und `pnpm guard:monorepo:frozen` ausgeführt, um den Zustand zu validieren.
- [x] Workspace-weite Tests erfolgreich durchgeführt.
