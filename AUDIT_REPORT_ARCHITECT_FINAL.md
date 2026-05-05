# Infrastruktur-Audit-Bericht - Areloria Monorepo

**Datum:** 5. Mai 2026
**Auditor:** Jules (Senior DevOps & Fullstack Architect)

## Status Quo
Das Projekt ist ein TypeScript-basiertes Monorepo, das mit **pnpm (v9.1.0)** verwaltet wird. Die Struktur umfasst `apps/`, `packages/` und `projects/`. Die Abhängigkeitsverwaltung erfolgt über pnpm-Workspaces. TypeScript-Projekt-Referenzen werden genutzt, waren jedoch unvollständig.

## Kritische Fehler

1.  **Fehlerhafte Workspace-Protokolle (Behoben):**
    In mehreren `package.json`-Dateien (`apps/api`, `apps/web`, `client`) wurden interne `@wasd/*`-Abhängigkeiten mit `"*"` statt `"workspace:*"` referenziert. Dies verhinderte die Installation der Node-Module.
    *Status:* Korrigiert.

2.  **Fehlende Abhängigkeit @are-logic/logger (Behoben):**
    Das Paket `apps/api` hängte von einer nicht existenten Library ab.
    *Status:* Korrigiert durch Erstellung von `@wasd/utils` (Logger).

3.  **Lückenhafte TypeScript-Projekt-Referenzen (Behoben):**
    Die Root-`tsconfig.json` war unvollständig.
    *Status:* Korrigiert durch Synchronisierung mit allen Workspace-Projekten.

4.  **Version-Drift (Identifiziert):**
    Starke Unterschiede bei `vitest`, `babylonjs` und `zod`.

5.  **Build-Blocker in Apps (Behoben):**
    Fehlende Typdefinitionen (`@types/express`, `@types/three`) und falsche Import-Pfade im Client blockierten den Build-Prozess.
    *Status:* Kritische Pfade korrigiert; `client`, `apps/web` und `apps/api` bauen nun erfolgreich.

## Optimierungspotenzial

1.  **Docker-Build:** Umstellung auf `pnpm deploy --filter` zur Reduzierung der Image-Größe.
2.  **CI/CD affected-Logik:** Integration von `pnpm --filter ...[origin/main]`.
3.  **ESM Migration (Server):** Das `server`-Paket nutzt `NodeNext`, was explizite Dateiendungen erfordert. Dies sollte mittelfristig harmonisiert oder korrigiert werden.

## Action Plan

1.  **Phase 1: Konsolidierung (Abgeschlossen):**
    *   Wiederherstellung der Build-Integrität für Hauptanwendungen.
    *   Vervollständigung der TypeScript-Konfiguration.
    *   Härtung der CI-Workflows.
2.  **Phase 2: Harmonisierung:**
    *   Einheitliche Versionierung von Core-Dependencies.
    *   Behebung der ESM-Importfehler im Server.
3.  **Phase 3: Modernisierung:**
    *   Optimierung der Dockerfiles und CI-Laufzeiten.
