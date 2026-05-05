# Infrastruktur-Audit-Bericht - Areloria Monorepo

**Datum:** 5. Mai 2026
**Auditor:** Jules (Senior DevOps & Fullstack Architect)

## Status Quo
Das Projekt ist ein TypeScript-basiertes Monorepo, das mit **pnpm (v9.1.0)** verwaltet wird. Die Struktur ist in `apps/`, `packages/` und `projects/` unterteilt. Es wird ein Workspace-Ansatz verfolgt, wobei die Abhängigkeiten zwischen den Paketen über Symlinks aufgelöst werden. Die CI/CD-Pipeline ist in GitHub Actions definiert (`main-pipeline.yml`).

## Kritische Fehler

1.  **Fehlerhafte Workspace-Protokolle (Behoben):**
    Mehrere Pakete (`apps/api`, `apps/web`, `client`) referenzierten interne `@wasd/*`-Bibliotheken mit `"*"` statt `"workspace:*"`. Dies führte zu 404-Fehlern bei `pnpm install`.
    *Korrektur:* Alle betroffenen `package.json`-Dateien wurden auf `workspace:*` umgestellt.

2.  **Fehlende Abhängigkeit (@are-logic/logger) (Behoben):**
    `apps/api` hängte von `@are-logic/logger` ab, welches nicht existierte.
    *Korrektur:* Eine neue Utility-Library `@wasd/utils` wurde erstellt, die eine `Logger`-Klasse bereitstellt. Die Abhängigkeit in `apps/api` wurde ersetzt und die Imports wurden korrigiert.

3.  **Inkonsistente TypeScript-Projekt-Referenzen (Behoben):**
    Die Root-`tsconfig.json` enthielt nur einen Bruchteil der tatsächlichen Workspace-Pakete.
    *Korrektur:* Die Root-`tsconfig.json` wurde aktualisiert und enthält nun Referenzen auf alle aktiven Workspace-Projekte und Pakete.

4.  **Version-Drift:**
    Zentrale Abhängigkeiten weisen weiterhin starke Versionsunterschiede auf:
    *   **Vitest:** Fragmentiert zwischen `^1.2.2` und `^4.1.0`.
    *   **BabylonJS:** Diskrepanz zwischen `^6.44.0` (@wasd/web) und `^9.0.0` (client).
    *   **Zod:** Unterschiede zwischen `^3.22.4` und `^3.23.8`.

## Optimierungspotenzial

1.  **Docker-Build-Strategie:**
    Das aktuelle `Dockerfile` nutzt manuelle `COPY`-Befehle. Die Nutzung von `pnpm deploy --filter` würde die Image-Größe reduzieren und den Build-Prozess robuster machen.

2.  **CI/CD Effizienz:**
    Die `main-pipeline.yml` führt bei jeder Änderung alle Tests für alle Pakete aus. Durch den Einsatz von `pnpm --filter ...[origin/main]` könnten die CI-Laufzeiten drastisch verkürzt werden.

3.  **Struktur-Bereinigung:**
    Es existieren redundante Skelett-Verzeichnisse wie `apps/client` und `packages/client`, die gelöscht werden sollten.

## Action Plan

1.  **Konsolidierung der Tooling-Konfiguration:**
    *   `vitest`, `zod` und `babylonjs` auf einheitliche Versionen im gesamten Repo bringen.
2.  **Modernisierung des Deployments:**
    *   `Dockerfile` auf das `pnpm deploy`-Muster umstellen.
    *   Affected-Logik in die CI/CD-Pipeline integrieren.
3.  **Bereinigung:**
    *   Löschen der leeren `apps/client` und `packages/client` Verzeichnisse.
