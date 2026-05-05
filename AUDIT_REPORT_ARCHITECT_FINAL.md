# Infrastruktur-Audit-Bericht - Areloria Monorepo

**Datum:** 5. Mai 2026
**Auditor:** Jules (Senior DevOps & Fullstack Architect)

## Status Quo
Das Repository ist ein TypeScript-basiertes Monorepo, das mit **pnpm (v9.1.0)** verwaltet wird. Die Struktur ist modular aufgebaut und umfasst die Bereiche `apps/`, `packages/` und `projects/`. Die Abhängigkeitsverwaltung erfolgt über pnpm-Workspaces. TypeScript-Projekt-Referenzen werden teilweise genutzt, um die Build-Abhängigkeiten abzubilden. Die CI/CD-Pipelines sind in GitHub Actions definiert.

## Kritische Fehler

1.  **Fehlerhafte Workspace-Protokolle (Fix appliziert):**
    In mehreren `package.json`-Dateien (`apps/api`, `apps/web`, `client`) wurden interne `@wasd/*`-Abhängigkeiten mit `"*"` statt `"workspace:*"` referenziert. Dies führte zu 404-Fehlern bei `pnpm install`, da pnpm versuchte, diese privaten Pakete in der öffentlichen npm-Registry zu finden.
    *Lösung:* Umstellung auf `workspace:*` in allen betroffenen Paketen.

2.  **Fehlende Abhängigkeit `@are-logic/logger` (Fix appliziert):**
    Das Paket `apps/api` war von einer nicht existenten Library `@are-logic/logger` abhängig, was die Installation blockierte.
    *Lösung:* Erstellung des Utility-Pakets `@wasd/utils` mit einer `Logger`-Klasse und Aktualisierung der Imports in `apps/api`.

3.  **Lückenhafte TypeScript-Projekt-Referenzen (Fix appliziert):**
    Die Root-`tsconfig.json` enthielt nur Referenzen auf etwa ein Drittel der tatsächlichen Workspace-Projekte. Dies verhinderte eine korrekte Typ-Auflösung über Paketgrenzen hinweg und blockierte inkrementelle Builds via `tsc -b`.
    *Lösung:* Synchronisierung der Root-`tsconfig.json` mit allen im Workspace definierten Paketen und Projekten.

4.  **Version-Drift und Fragmentierung:**
    Wichtige Bibliotheken werden in stark unterschiedlichen Versionen eingesetzt (z. B. Vitest ^1.2.2 bis ^4.1.0, BabylonJS ^6.44.0 bis ^9.0.0). Dies führt zu inkonsistentem Verhalten und unnötig großen `node_modules`.

## Optimierungspotenzial

1.  **Docker-Build-Effizienz:**
    Das aktuelle `Dockerfile` nutzt manuelle `COPY`-Befehle für `node_modules`. Durch den Einsatz von `pnpm deploy --filter` könnte ein spezialisiertes, minimales Production-Image für jedes Paket erstellt werden, was die Build-Zeit und Image-Größe reduziert.

2.  **CI/CD affected-Logik:**
    Die `main-pipeline.yml` führt derzeit bei jedem Commit alle Aufgaben für alle Pakete aus. Die Implementierung einer Filter-Logik (z. B. `pnpm --filter ...[origin/main]`) würde die Pipeline-Laufzeit signifikant verkürzen.

3.  **Bereinigung redundanter Verzeichnisse:**
    Skelett-Verzeichnisse wie `apps/client` und `packages/client` sollten gelöscht werden, um Namenskollisionen mit dem Haupt-`client/`-Verzeichnis zu vermeiden.

## Action Plan

1.  **Phase 1: Konsolidierung (Abgeschlossen):**
    *   Reparatur der Workspace-Protokolle.
    *   Behebung der fehlenden Logger-Abhängigkeit.
    *   Vervollständigung der TypeScript-Referenzen.
2.  **Phase 2: Harmonisierung:**
    *   Angleichung der Versionen von `vitest`, `zod` und `babylonjs` im gesamten Monorepo.
    *   Sicherstellung, dass alle Pakete die `tsconfig.base.json` korrekt erweitern.
3.  **Phase 3: CI/CD & Deployment Modernisierung:**
    *   Umstellung des `Dockerfile` auf das `pnpm deploy`-Muster.
    *   Integration von affected-Builds in GitHub Actions.
    *   Bereinigung der Skelett-Verzeichnisse (`apps/client`, etc.).
