# Infrastruktur-Audit-Bericht - Areloria Monorepo

**Datum:** 5. Mai 2026
**Auditor:** Jules (Senior DevOps & Fullstack Architect)

## Status Quo
Das Projekt ist ein TypeScript-basiertes Monorepo, das mit **pnpm (v9.1.0)** verwaltet wird. Die Struktur ist in `apps/`, `packages/` und `projects/` unterteilt. Es wird ein Workspace-Ansatz verfolgt, wobei die Abhängigkeiten zwischen den Paketen über Symlinks aufgelöst werden. Die CI/CD-Pipeline ist in GitHub Actions definiert (`main-pipeline.yml`).

## Kritische Fehler

1.  **Fehlerhafte Workspace-Protokolle (Installations-Blocker):**
    Mehrere Pakete (`apps/api`, `apps/web`, `client`) referenzierten interne `@wasd/*`-Bibliotheken mit `"*"` statt `"workspace:*"`. Dies führt dazu, dass pnpm versucht, diese Pakete aus der öffentlichen Registry abzurufen, was mit einem 404-Fehler fehlschlägt.
    *Status:* Teilweise behoben (Korrekturen in `package.json` eingeleitet).

2.  **Fehlende Abhängigkeit (@are-logic/logger):**
    `apps/api` hängt von `@are-logic/logger` ab, welches weder im Workspace vorhanden noch in der öffentlichen Registry verfügbar ist. Dies verhindert eine erfolgreiche Installation der Node-Module.

3.  **Inkonsistente TypeScript-Projekt-Referenzen:**
    Die Root-`tsconfig.json` enthält nur einen Bruchteil der tatsächlichen Workspace-Pakete. Dies bricht die inkrementelle Kompilierung mit `tsc -b` und führt zu Typ-Auflösungsfehlern in der IDE.

4.  **Version-Drift:**
    Zentrale Abhängigkeiten weisen starke Versionsunterschiede auf:
    *   **Vitest:** Fragmentiert zwischen `^1.2.2` und `^4.1.0`.
    *   **BabylonJS:** Diskrepanz zwischen `^6.44.0` (@wasd/web) und `^9.0.0` (client).
    *   **Zod:** Unterschiede zwischen `^3.22.4` und `^3.23.8`.

## Optimierungspotenzial

1.  **Docker-Build-Strategie:**
    Das aktuelle `Dockerfile` nutzt manuelle `COPY`-Befehle für `node_modules` und `dist`. Dies ist im Monorepo-Kontext fehleranfällig. Die Nutzung von `pnpm deploy --filter` würde die Image-Größe reduzieren und den Build-Prozess robuster machen.

2.  **CI/CD Effizienz:**
    Die `main-pipeline.yml` führt bei jeder Änderung alle Tests für alle Pakete aus. Durch den Einsatz von `pnpm --filter ...[origin/main]` könnten die CI-Laufzeiten drastisch verkürzt werden, indem nur betroffene Pakete gebaut und getestet werden.

3.  **Struktur-Bereinigung:**
    Es existieren redundante Skelett-Verzeichnisse wie `apps/client` und `packages/client`, die gelöscht werden sollten, um Verwirrung zu vermeiden.

## Action Plan

1.  **Wiederherstellung der Build-Integrität:**
    *   Alle internen Abhängigkeiten auf das `workspace:*`-Protokoll umstellen.
    *   Die fehlende Logger-Funktionalität in `@wasd/utils` implementieren und `apps/api` entsprechend umstellen.
2.  **Harmonisierung der Tooling-Konfiguration:**
    *   `vitest`, `zod` und `babylonjs` auf einheitliche Versionen im gesamten Repo bringen.
    *   Root `tsconfig.json` Referenzen vervollständigen.
3.  **Modernisierung des Deployments:**
    *   `Dockerfile` auf das `pnpm deploy`-Muster umstellen.
    *   Affected-Logik in die CI/CD-Pipeline integrieren.
